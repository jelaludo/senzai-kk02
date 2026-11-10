// Senzai models, animation, code and concepts by Jelaludo. Attribution required for reuse.
// Senzai-KK02 pilot: input, drone-style flight with momentum, chase camera and Z-lock.
// Writes the body pose and attention target into STEER, which the forked runtime reads.
import * as T from 'three';
import { STEER, attentionDirection, PRECISION_FOCUS } from './runtime-pilot.js';

// All feel lives here. Units: metres, seconds, radians.
export const TUNING = {
  thrust: 24,        // horizontal acceleration, m/s²
  lift: 22,          // vertical acceleration, m/s²
  drag: .62,         // water-like inertia: ~54% of speed remains after 1 s of coasting
  thrustResponse: 3.2, // gradual spool-up and release of thrust, 1/s
  brakeDrag: 5.5,    // 1/s while X is held
  boost: 2.1,        // Shift multiplier on thrust
  fine: .3,          // Alt multiplier on thrust
  mouseLook: .0022,  // rad per pixel
  keyLook: 1.7,      // rad/s for Q / E and arrows
  distance: [48, 96, 170], // camera min, default, max
  cameraLift: 20,    // look point above the body centre, keeps the reticle clear of the sphere
  lockBias: [.5, 1.2], // rad the camera swings aside so the locked signal is not hidden by the body: far, close
  lockCone: .5,      // rad around the reticle in which Z prefers a signal
  readRange: 42,     // m from body centre at which tendrils can read a locked signal
  holdRange: 47,     // a little slack after ultra-focus starts
  readTime: 3,       // uninterrupted seconds after the tendrils converge
  aimSeatTime: .3,   // align both reticles before the tendrils converge
  aimGrace: .18,     // a small aiming slip pauses the hold; longer slips break it
  aimResponse: 22,   // mouse pipper response, 1/s
  aimDrift: .0018,   // flight-relative slip in screen-height units per m/s
  standoff: 27,      // m; the body is pushed back so it never swallows a signal
  centre: [0, 30, 0],
  wallStart: 105, wallPush: 120, wallHard: 164, // overfitting: noise, restoring force, absolute limit
  floor: 15,
};

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const damp = T.MathUtils.damp;
const dampAngle = (a, b, k, dt) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * (1 - Math.exp(-k * dt));
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'KeyC', 'KeyF', 'KeyR', 'KeyH', 'Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7']);
const HISTORY = 40;
export const SWEEP = { speed: 110, startRadius: 16, duration: 2.4, revealTime: 1.65 };

export function createPilot({ camera, dom, signals, onEvent = () => { } }) {
  const keys = new Set(), down = (...codes) => codes.some(c => keys.has(c));
  const pos = new T.Vector3(-8, 25, 3), vel = new T.Vector3(), follow = pos.clone(), focus = new T.Vector3(), centre = new T.Vector3(...TUNING.centre);
  const fwd = new T.Vector3(), right = new T.Vector3(), view = new T.Vector3(), acc = new T.Vector3(), thrust = new T.Vector3(), to = new T.Vector3(), look = new T.Vector3(), tmp = new T.Vector3();
  const cameraRight = new T.Vector3(), cameraUp = new T.Vector3(), relativeVelocity = new T.Vector3();
  const s = {
    pos, vel, focus, yaw: -.35, pitch: -.14, distance: TUNING.distance[1], lock: -1, hover: -1, gather: 0, mode: 'HOVER', speed: 0, wall: 0,
    range: 0, precision: 0, phase: 'FORAGING', offYaw: 0, offPitch: 0, lockBlend: 0, captured: false, pingAt: -10, pingOrigin: new T.Vector3(), clock: 0, fov: 52, roll: 0, input: false,
    examIndex: -1, heldTime: 0, holding: false, captureUntil: 0,
    aimInput: new T.Vector2(), aim: new T.Vector2(), aimDrift: new T.Vector2(), targetScreen: new T.Vector3(),
    viewportWidth: dom.clientWidth || 1360, viewportHeight: dom.clientHeight || 800,
    aimRadius: 18, aimError: Infinity, aligned: false, targetVisible: false, aimSeated: 0, aimLost: 0,
  };

  // Short attention history: the runtime asks "what was the target `delay` seconds ago" so that
  // strand tips notice first and the bend travels down the shaft.
  const history = Array.from({ length: HISTORY }, () => ({ focus: [0, 0, 0], index: 0, age: 100, gather: 0, precision: 0 }));
  let head = 0, fps = 60, exam = false;
  const examAxis = new T.Vector3(), axis = new T.Vector3();
  STEER.sample = delay => history[(head - Math.min(HISTORY - 1, Math.round(delay * fps)) + HISTORY) % HISTORY];

  function setLock(index) {
    if (index === s.lock) return;
    const previous = s.lock;
    if (previous >= 0 && !signals.list[previous].resolved) signals.list[previous].decode = 0;
    exam = false; s.examIndex = -1; s.heldTime = 0; s.holding = false; s.captureUntil = 0;
    s.aimSeated = s.aimLost = 0; s.aligned = false; s.aimError = Infinity;
    s.aimInput.set(0, 0); s.aim.set(0, 0); s.aimDrift.set(0, 0);
    s.lock = index; s.offYaw = s.offPitch = 0;
    if (index < 0) onEvent('attention_released', previous); else onEvent('focus_acquired', index);
  }
  // Prefer the signal nearest the reticle; otherwise the one nearest the body.
  function pick(coneOnly = false) {
    let best = -1, score = Infinity, nearest = -1, near = Infinity;
    for (const sig of signals.list) {
      if (sig.resolved) continue;
      tmp.subVectors(sig.position, camera.position);
      const angle = tmp.angleTo(view), d = sig.position.distanceTo(pos);
      if (angle < TUNING.lockCone && angle + d * .0008 < score) { score = angle + d * .0008; best = sig.index; }
      if (d < near) { near = d; nearest = sig.index; }
    }
    return best >= 0 || coneOnly ? best : nearest;
  }
  const actions = {
    toggleLock() { setLock(s.lock >= 0 ? -1 : pick()); },
    release() { setLock(-1); },
    cycle(step) {
      const n = signals.list.length, start = s.lock < 0 ? (step > 0 ? -1 : 0) : s.lock;
      for (let j = 1; j <= n; j++) { const i = (start + step * j + n * 2) % n; if (!signals.list[i].resolved) { setLock(i); return; } }
      setLock(-1);
    },
    lock(index) { if (signals.list[index]) setLock(index); },
    // Coordinates are normalized screen space. Mouse and keyboard use the same aim path.
    aimAt(x, y) { s.aimInput.set(clamp(x, -.96, .96), clamp(y, -.94, .94)); },
    resize(w, h) { s.viewportWidth = Math.max(1, w); s.viewportHeight = Math.max(1, h); },
    ping() { if (s.clock - s.pingAt < SWEEP.duration) return; s.pingAt = s.clock; s.pingOrigin.copy(pos); onEvent('ping'); },
    recentre() { s.aimInput.set(0, 0); s.offYaw = s.offPitch = 0; s.pitch = -.14; s.distance = TUNING.distance[1]; if (s.lock < 0 && vel.lengthSq() > 9) s.yaw = Math.atan2(vel.x, -vel.z); },
  };

  function turn(dyaw, dpitch) {
    if (s.lock >= 0) actions.aimAt(s.aimInput.x + dyaw * .55 / camera.aspect, s.aimInput.y + dpitch * .55);
    else { s.yaw += dyaw; s.pitch = clamp(s.pitch + dpitch, -1.15, .9); }
  }

  // ---- keyboard ------------------------------------------------------------------------
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
  addEventListener('keydown', e => {
    if (e.metaKey) { keys.clear(); return; }           // macOS swallows keyups while ⌘ is held
    if (typing(e)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();     // Space scroll, Tab focus, Ctrl+S/D, Alt menus
    if (e.repeat) return;
    keys.add(e.code);
    const digit = /^Digit([1-7])$/.exec(e.code);
    if (digit) actions.lock(Number(digit[1]) - 1);
    else if (e.code === 'KeyZ') actions.toggleLock();
    else if (e.code === 'Tab') actions.cycle(e.shiftKey ? -1 : 1);
    else if (e.code === 'KeyF') actions.ping();
    else if (e.code === 'KeyR') actions.recentre();
    else if (e.code === 'KeyH') onEvent('legend');
    else if (e.code === 'Escape') actions.release();
    onEvent('input');
  });
  addEventListener('keyup', e => { keys.delete(e.code); if (e.code === 'Space') e.preventDefault(); });
  addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) keys.clear(); });

  // ---- mouse ---------------------------------------------------------------------------
  let dragging = false, dragged = 0;
  const captured = () => document.pointerLockElement === dom;
  dom.addEventListener('mousedown', e => {
    if (e.button === 2) { actions.release(); return; }
    if (e.button !== 0) return;
    if (s.lock >= 0) return; // selected: the mouse aims; clicking must not discard the target
    if (captured()) actions.toggleLock(); else { dragging = true; dragged = 0; }
  });
  addEventListener('mouseup', e => {
    if (e.button !== 0 || !dragging) return;
    dragging = false;
    if (dragged < 4) { try { dom.requestPointerLock()?.catch?.(() => { }); } catch { /* unavailable: drag-look still works */ } }
  });
  addEventListener('mousemove', e => {
    if (s.lock >= 0) {
      if (captured()) actions.aimAt(s.aimInput.x + e.movementX * 2 / s.viewportWidth, s.aimInput.y - e.movementY * 2 / s.viewportHeight);
      else {
        const rect = dom.getBoundingClientRect();
        actions.aimAt((e.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1, 1 - (e.clientY - rect.top) / Math.max(1, rect.height) * 2);
      }
      onEvent('input');
    } else if (captured()) turn(e.movementX * TUNING.mouseLook, -e.movementY * TUNING.mouseLook);
    else if (dragging) { dragged += Math.abs(e.movementX) + Math.abs(e.movementY); turn(-e.movementX * TUNING.mouseLook * 1.6, e.movementY * TUNING.mouseLook * 1.6); }
  });
  dom.addEventListener('wheel', e => { e.preventDefault(); s.distance = clamp(s.distance * Math.exp(e.deltaY * .0012), TUNING.distance[0], TUNING.distance[2]); }, { passive: false });
  dom.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerlockchange', () => { s.captured = captured(); onEvent('capture', s.captured); });

  function step(dt) {
    s.clock += dt; fps = damp(fps, 1 / Math.max(dt, 1e-3), 2, dt);
    turn(((down('KeyE', 'ArrowRight') ? 1 : 0) - (down('KeyQ', 'ArrowLeft') ? 1 : 0)) * TUNING.keyLook * dt,
      ((down('ArrowUp') ? 1 : 0) - (down('ArrowDown') ? 1 : 0)) * TUNING.keyLook * .6 * dt);

    // -- lock: the camera swings to keep body and signal framed together
    const target = s.lock >= 0 ? signals.list[s.lock] : null;
    let basisYaw = s.yaw;
    if (target) {
      to.subVectors(target.position, pos); s.range = to.length();
      const flat = Math.hypot(to.x, to.z), targetYaw = Math.atan2(to.x, -to.z);
      const bias = T.MathUtils.lerp(TUNING.lockBias[1], TUNING.lockBias[0], T.MathUtils.smoothstep(s.range, 30, 95));
      s.yaw = dampAngle(s.yaw, targetYaw + bias + s.offYaw, 4.5, dt);
      s.pitch = damp(s.pitch, clamp(Math.atan2(to.y, flat) * .55 - .1 + s.offPitch, -1.15, .9), 4.5, dt);
      if (flat > 4) basisYaw = targetYaw;          // W approaches, S retreats, A / D orbit
    }
    s.lockBlend = damp(s.lockBlend, target ? 1 : 0, 3, dt);

    // -- thrust in the horizontal frame of the view (or of the lock), lift on the world axis
    fwd.set(Math.sin(basisYaw), 0, -Math.cos(basisYaw)); right.set(Math.cos(basisYaw), 0, Math.sin(basisYaw));
    const ix = (down('KeyD') ? 1 : 0) - (down('KeyA') ? 1 : 0), iz = (down('KeyW') ? 1 : 0) - (down('KeyS') ? 1 : 0);
    const ctrl = down('ControlLeft', 'ControlRight');
    const iy = clamp((down('Space') ? (ctrl ? -1 : 1) : 0) - (down('KeyC') ? 1 : 0), -1, 1);
    const boost = down('ShiftLeft', 'ShiftRight'), fine = down('AltLeft', 'AltRight'), brake = down('KeyX');
    const gain = fine ? TUNING.fine : boost ? TUNING.boost : 1;
    acc.set(0, 0, 0).addScaledVector(right, ix);
    // W follows the full 3D line to the Z-lock; A/D remain tangential, including on diagonals.
    if (target && s.range > 1) acc.addScaledVector(to, iz / s.range);
    else acc.addScaledVector(fwd, iz);
    if (acc.lengthSq() > 1) acc.normalize();
    acc.multiplyScalar(TUNING.thrust * gain); acc.y += iy * TUNING.lift * gain;
    thrust.lerp(acc, 1 - Math.exp(-(brake ? 14 : TUNING.thrustResponse) * dt));
    if (brake) thrust.multiplyScalar(Math.exp(-14 * dt));
    acc.copy(thrust);
    // A held approach steers out sideways drift relative to the moving concept. Letting go
    // restores free coasting; W can follow a darting target without spiralling past it.
    if (target && iz > 0 && s.range > 1) {
      tmp.copy(vel).sub(target.velocity);
      tmp.addScaledVector(to, -tmp.dot(to) / (s.range * s.range));
      acc.addScaledVector(tmp, -2 * (1 - T.MathUtils.smoothstep(s.range, 50, 90)));
    }
    s.input = ix !== 0 || iz !== 0 || iy !== 0;

    // -- Overfitting and floor push back; signals keep the body at arm's length
    tmp.subVectors(pos, centre); const radius = tmp.length();
    s.wall = T.MathUtils.smoothstep(radius, TUNING.wallStart, 150);
    if (radius > TUNING.wallPush) acc.addScaledVector(tmp, -(radius - TUNING.wallPush) * 1.8 / radius);
    if (pos.y < TUNING.floor + 6) acc.y += (TUNING.floor + 6 - pos.y) * 9;
    for (const sig of signals.list) {
      tmp.subVectors(pos, sig.position); const d = tmp.length();
      if (d < TUNING.standoff && d > .01) {        // spring out, and bleed off any closing speed
        tmp.divideScalar(d); acc.addScaledVector(tmp, (TUNING.standoff - d) * 14);
        vel.addScaledVector(tmp, -Math.min(0, vel.dot(tmp)) * (1 - Math.exp(-8 * dt)));
      }
    }

    // -- integrate: thrust, exponential drag, position
    vel.addScaledVector(acc, dt).multiplyScalar(Math.exp(-(brake ? TUNING.brakeDrag : TUNING.drag) * dt));
    pos.addScaledVector(vel, dt);
    tmp.subVectors(pos, centre);
    if (tmp.length() > TUNING.wallHard) { pos.copy(centre).addScaledVector(tmp.normalize(), TUNING.wallHard); vel.addScaledVector(tmp, -Math.max(0, vel.dot(tmp))); }
    if (pos.y < TUNING.floor) { pos.y = TUNING.floor; vel.y = Math.max(0, vel.y); }
    s.wall = T.MathUtils.smoothstep(pos.distanceTo(centre), TUNING.wallStart, 150);
    if (target) { to.subVectors(target.position, pos); s.range = to.length(); }
    s.speed = vel.length();
    s.mode = brake ? 'BRAKE' : s.input ? (fine ? 'FINE' : boost ? 'SURGE' : 'CRUISE') : s.speed > 1.5 ? 'DRIFT' : 'HOVER';

    // -- camera: trails the body slightly, widens and banks with speed
    view.set(Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.yaw) * Math.cos(s.pitch));
    follow.x = damp(follow.x, pos.x, 7, dt); follow.y = damp(follow.y, pos.y, 5, dt); follow.z = damp(follow.z, pos.z, 7, dt);
    look.copy(follow); look.y += TUNING.cameraLift;
    if (s.lockBlend > .001) look.addScaledVector(to, s.lockBlend * Math.min(.5, 45 / Math.max(s.range, 1))); // `to` keeps its last value while blending out
    camera.position.copy(look).addScaledVector(view, -s.distance);
    camera.position.y = Math.max(1, camera.position.y);
    camera.lookAt(look);
    tmp.set(Math.cos(s.yaw), 0, Math.sin(s.yaw));
    s.roll = damp(s.roll, clamp(-vel.dot(tmp) * .0032, -.08, .08), 3, dt); camera.rotateZ(s.roll);
    s.fov = damp(s.fov, 52 + 10 * clamp(s.speed / 60, 0, 1), 3, dt);
    if (Math.abs(camera.fov - s.fov) > .01) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    camera.getWorldDirection(view);

    // Two independent sight elements: the concept diamond and the pilot's inertial pipper.
    // Camera framing follows the selected concept; it never moves the pilot's aim for them.
    s.aimRadius = clamp(s.viewportHeight * .023, 14, 24);
    if (target) {
      s.targetScreen.copy(target.position).project(camera);
      s.targetVisible = s.targetScreen.z >= -1 && s.targetScreen.z < 1 && Math.abs(s.targetScreen.x) < .97 && Math.abs(s.targetScreen.y) < .97;
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0); cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
      relativeVelocity.copy(vel).sub(target.velocity);
      s.aimDrift.x = damp(s.aimDrift.x, clamp(-relativeVelocity.dot(cameraRight) * TUNING.aimDrift / camera.aspect, -.065, .065), 4, dt);
      s.aimDrift.y = damp(s.aimDrift.y, clamp(-relativeVelocity.dot(cameraUp) * TUNING.aimDrift, -.065, .065), 4, dt);
      s.aim.x = damp(s.aim.x, clamp(s.aimInput.x + s.aimDrift.x, -.97, .97), TUNING.aimResponse, dt);
      s.aim.y = damp(s.aim.y, clamp(s.aimInput.y + s.aimDrift.y, -.95, .95), TUNING.aimResponse, dt);
      s.aimError = Math.hypot((s.aim.x - s.targetScreen.x) * s.viewportWidth / 2, (s.aim.y - s.targetScreen.y) * s.viewportHeight / 2);
      s.aligned = s.targetVisible && s.aimError <= s.aimRadius;
    } else { s.targetVisible = s.aligned = false; s.aimError = Infinity; }

    // -- attention: tendrils reach for the lock, or lean toward wherever the pilot is looking
    s.hover = target ? -1 : pick(true);
    if (target) tmp.copy(target.position); else tmp.copy(pos).addScaledVector(view, 60);
    focus.lerp(tmp, 1 - Math.exp(-9 * dt));
    s.gather = damp(s.gather, target ? 1 : s.hover >= 0 ? .22 : 0, 3.5, dt);
    head = (head + 1) % HISTORY; const entry = history[head];
    focus.toArray(entry.focus); entry.gather = s.gather; entry.index = Math.max(0, s.lock);

    // -- examining: within reach of a lock, fifteen tips ring the signal and study it. Membership is
    //    chosen once per examination (the strands facing the signal) and held; if the body swings so
    //    far round that those strands would cross it, the ring releases and re-forms.
    const reading = !!target && s.range <= (exam ? TUNING.holdRange : TUNING.readRange) && !target.resolved;
    const linedUp = reading && s.aligned;
    s.aimSeated = linedUp ? Math.min(TUNING.aimSeatTime, s.aimSeated + dt) : 0;
    s.aimLost = s.aligned ? 0 : s.aimLost + dt;
    if (target) { axis.copy(to).normalize(); axis.toArray(STEER.axis); target.position.toArray(STEER.target); }
    if (linedUp && s.aimSeated >= TUNING.aimSeatTime && !exam && s.precision < .02) {
      exam = true; s.examIndex = s.lock; s.heldTime = 0; examAxis.copy(axis);
      const a = STEER.axis, facing = i => { const d = attentionDirection(i); return d[0] * a[0] + d[1] * a[1] + d[2] * a[2]; };
      STEER.ranks = new Map(Array.from({ length: 48 }, (_, i) => i).sort((p, q) => facing(q) - facing(p)).slice(0, PRECISION_FOCUS.strands).map((id, rank) => [id, rank]));
      onEvent('examination_started', s.lock);
    }
    const contact = reading && exam && examAxis.dot(axis) > .6 && s.targetVisible && s.aimLost <= TUNING.aimGrace;
    const holding = contact && s.aligned;
    if (exam && !contact) {
      exam = false; s.examIndex = -1; s.heldTime = 0;
      if (target && !target.resolved) target.decode = 0;
      onEvent('examination_broken', s.lock);
    }
    s.precision = damp(s.precision, contact || s.clock < s.captureUntil ? 1 : 0, contact ? 6 : 7, dt);
    s.holding = holding && s.precision >= .94;
    entry.precision = s.precision;
    if (s.holding) {
      s.heldTime = Math.min(TUNING.readTime, s.heldTime + dt);
      target.decode = s.heldTime / TUNING.readTime;
      if (s.heldTime >= TUNING.readTime) {
        target.decode = 1; target.resolved = true; target.capturedAt = s.clock;
        exam = false; s.examIndex = -1; s.holding = false; s.captureUntil = s.clock + 1;
        onEvent('examination_completed', target.index);
      }
    }
    s.phase = target?.resolved ? 'CAPTURED' : exam ? (!s.aligned ? 'REALIGN' : s.holding ? 'ULTRA FOCUS' : 'LOCKING IN') : target ? (linedUp ? 'ACQUIRING' : 'TRACKING') : s.gather > .12 ? 'SENSING' : s.speed > 4 ? 'FOLLOWING' : 'FORAGING';
    for (const sig of signals.list) {   // the ping front flares each signal as it passes
      const age = s.clock - s.pingAt, front = SWEEP.startRadius + age * SWEEP.speed, d = sig.position.distanceTo(s.pingOrigin);
      if (age >= 0 && age <= SWEEP.duration && sig.lastSweep !== s.pingAt && d <= front) {
        sig.lastSweep = s.pingAt; sig.pinged = s.clock; onEvent('signal_detected', sig.index);
      }
    }

    STEER.active = true;
    STEER.center[0] = pos.x; STEER.center[1] = pos.y + .5 * Math.sin(s.clock * .8); STEER.center[2] = pos.z;
    vel.toArray(STEER.velocity); STEER.swift = clamp(s.speed / 26, 0, 1);
  }

  for (const entry of history) pos.toArray(entry.focus), entry.focus[2] -= 60;
  focus.set(pos.x, pos.y, pos.z - 60);
  return { state: s, keys, step, ...actions };
}
