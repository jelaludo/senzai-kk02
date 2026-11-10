// DOM heads-up display: ephemeral sweep labels, capture progress and overfitting warning.
import * as T from 'three';
import { TUNING, SWEEP } from './pilot.js?v=5';

const $ = id => document.getElementById(id);
const pad = (n, w = 2) => String(n).padStart(w, '0');

export function createHud({ stage, camera, signals, pilot }) {
  const hud = $('hud'), bracket = $('bracket'), arrow = $('edge-arrow'), toast = $('toast'), v = new T.Vector3();
  const aim = $('aim-reticle'), guide = $('lock-guide'), link = $('sight-link');
  const labels = signals.list.map(sig => {
    const el = document.createElement('button');
    el.className = 'signal'; el.type = 'button'; el.tabIndex = -1;
    el.hidden = true;
    el.innerHTML = `<i></i><b>${pad(sig.index + 1)} / ${sig.concept.id}</b><span lang="ja">${sig.concept.kanji}</span><small></small>`;
    el.addEventListener('click', () => { pilot.lock(sig.index); el.blur(); });
    hud.append(el);
    return { el, range: el.querySelector('small') };
  });
  let toastUntil = 0;
  function say(text, tone = '') { toast.textContent = text; toast.className = 'show ' + tone; toastUntil = performance.now() + 2200; }
  const name = i => { const c = signals.list[i].concept; return `${pad(i + 1)} / ${c.id} ${c.kanji}`; };

  return {
    say,
    event(type, data) {
      if (type === 'focus_acquired') say(`TRACKING  ${name(data)}`);
      else if (type === 'attention_released') say('ATTENTION RELEASED', 'dim');
      else if (type === 'examination_started') say('LOCK SEATED · HOLD ALIGNMENT', 'bright');
      else if (type === 'examination_broken') say('LOCK BROKEN · REALIGN', 'dim');
      else if (type === 'examination_completed') {
        const all = signals.list.every(sig => sig.resolved);
        say(all ? 'ALL 7 CONCEPTS CAPTURED' : `CAPTURED · ${signals.list[data].concept.gloss.toUpperCase()} · ${pilot.state.touchMode ? 'TAP NEXT' : 'TAB FOR NEXT'}`, 'bright');
      }
      else if (type === 'ping') say('SWEEP', 'dim');
      else if (type === 'legend') $('legend').classList.toggle('collapsed');
      else if (type === 'capture') { stage.classList.toggle('captured', data); if (data) $('helm').classList.add('gone'); }
      else if (type === 'input') $('helm').classList.add('gone');
    },
    update() {
      const s = pilot.state, w = stage.clientWidth, h = stage.clientHeight;
      const selected = s.lock >= 0, target = selected ? signals.list[s.lock] : null;
      const aligned = selected && s.aligned, inRange = selected && s.range <= (s.examIndex >= 0 ? TUNING.holdRange : TUNING.readRange);
      stage.classList.toggle('aiming', selected);
      stage.classList.toggle('sight-aligned', aligned && inRange);
      stage.classList.toggle('sight-captured', !!target?.resolved);
      aim.hidden = !selected || target.resolved;
      guide.hidden = !selected;
      if (selected) {
        const ax = (s.aim.x * .5 + .5) * w, ay = (-s.aim.y * .5 + .5) * h, r = s.aimRadius;
        aim.style.transform = `translate(${ax.toFixed(1)}px,${ay.toFixed(1)}px)`;
        $('aim-ring').setAttribute('r', r);
        $('aim-wings').setAttribute('d', `M${-r-13} 0H${-r-4} M${r+4} 0H${r+13} M0 ${-r-9}V${-r-4} M0 ${r+4}V${r+9}`);
        $('sight-tolerance').setAttribute('r', r);
        $('lock-instruction').textContent = target.resolved ? `CAPTURED · ${s.touchMode ? 'TAP NEXT' : 'TAB FOR NEXT'}` : !s.targetVisible ? 'BRING THE DIAMOND INTO VIEW' : !inRange ? 'DRIFTING CLOSER · ALIGN RING + DIAMOND' : s.examIndex >= 0 ? (s.aligned ? 'HOLD ALIGNMENT' : 'REALIGN · LOCK SLIPPING') : aligned ? 'STEADY · SEATING LOCK' : 'ALIGN RING + DIAMOND';
        guide.querySelector('small').textContent = s.touchMode ? 'Drag to aim · stick to fly' : 'MOUSE aim · W/S range · A/D strafe · X brake';
        $('lock-range').textContent = target.resolved ? '' : `${Math.round(s.range)} m / ${s.examIndex >= 0 ? TUNING.holdRange : TUNING.readRange} m reach`;
        guide.classList.toggle('in-range', inRange);
      }
      if (toastUntil && performance.now() > toastUntil) { toast.className = ''; toastUntil = 0; }
      let locked = null;
      for (const sig of signals.list) {
        const label = labels[sig.index], el = label.el;
        v.copy(sig.position).project(camera);
        const on = v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02, x = (v.x * .5 + .5) * w, y = (-v.y * .5 + .5) * h;
        const isLocked = sig.index === s.lock;
        const age = s.clock - sig.pinged, revealed = age >= 0 && age < SWEEP.revealTime;
        if (isLocked) locked = { sig, on, x, y, behind: v.z >= 1 };
        el.hidden = !on || !(isLocked || revealed);
        el.style.opacity = isLocked ? '1' : String(T.MathUtils.clamp((SWEEP.revealTime - age) / .65, 0, 1));
        if (on) el.style.transform = `translate(${(s.touchMode ? T.MathUtils.clamp(x, 14, w - 150) : x).toFixed(1)}px,${y.toFixed(1)}px)`;
        el.classList.toggle('locked', isLocked);
        el.classList.toggle('hover', sig.index === s.hover);
        el.classList.toggle('resolved', sig.resolved);
        el.classList.toggle('pinged', revealed);
        label.range.textContent = `${sig.position.distanceTo(s.pos).toFixed(0)} m`;
      }
      bracket.hidden = !(locked && locked.on);
      arrow.hidden = !(locked && !locked.on);
      link.hidden = !(locked?.on && !locked.sig.resolved && s.aimError > s.aimRadius);
      if (!link.hidden) {
        const ax = (s.aim.x * .5 + .5) * w, ay = (-s.aim.y * .5 + .5) * h;
        $('sight-vector').setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)}L${locked.x.toFixed(1)} ${locked.y.toFixed(1)}`);
      }
      if (locked?.on) {
        bracket.style.transform = `translate(${locked.x.toFixed(1)}px,${locked.y.toFixed(1)}px)`;
        const reading = s.examIndex === locked.sig.index;
        bracket.classList.toggle('reading', reading);
        $('bracket-state').textContent = locked.sig.resolved ? 'CAPTURED' : reading ? (s.holding ? `ULTRA FOCUS · ${s.heldTime.toFixed(1)} / 3 s` : s.aligned ? 'LOCKING IN' : 'REALIGN') : inRange ? 'ALIGN TO LOCK' : 'OUT OF REACH';
        bracket.classList.toggle('strained', reading && (!s.aligned || s.range > TUNING.readRange));
        $('bracket-bar').style.transform = `scaleX(${locked.sig.decode})`;
        $('sight-progress').style.strokeDashoffset = String(100 * (1 - locked.sig.decode));
      } else if (locked) {
        // Off-screen lock: pin an arrow to the frame edge, pointing at it.
        let dx = v.copy(locked.sig.position).project(camera).x, dy = v.y; if (locked.behind) { dx = -dx; dy = -dy; }
        const m = Math.max(Math.abs(dx), Math.abs(dy), 1e-3); dx /= m; dy /= m;
        arrow.style.transform = `translate(${((dx * .46 + .5) * w).toFixed(1)}px,${((-dy * .44 + .5) * h).toFixed(1)}px) rotate(${Math.atan2(dx, dy)}rad)`;
      }
      $('reticle').classList.toggle('hot', s.hover >= 0);
      $('reticle').hidden = selected;
      $('t-state').textContent = s.phase; $('t-state').dataset.phase = s.phase;
      $('t-mode').textContent = s.mode; $('t-mode').dataset.mode = s.mode;
      $('t-vel').textContent = s.speed.toFixed(1);
      $('t-bar').style.transform = `scaleX(${Math.min(1, s.speed / (TUNING.thrust * TUNING.boost / TUNING.drag))})`;
      $('t-alt').textContent = s.pos.y.toFixed(1);
      $('t-vsi').textContent = (s.vel.y >= 0 ? '+' : '−') + Math.abs(s.vel.y).toFixed(1);
      $('t-hdg').textContent = pad(Math.round(((s.yaw * 180 / Math.PI) % 360 + 360) % 360) % 360, 3);
      $('t-lock').textContent = s.lock >= 0 ? `${name(s.lock)}  ${s.range.toFixed(0)} m` : '—';
      $('t-read').textContent = `${signals.list.filter(x => x.resolved).length} / ${signals.list.length}`;
      $('wall').style.opacity = s.wall.toFixed(3);
      stage.style.setProperty('--noise-rgb', `255, ${Math.round(T.MathUtils.lerp(106, 18, T.MathUtils.smoothstep(s.wall, .2, .85)))}, 32`);
      stage.classList.toggle('walled', s.wall > .12);
      $('wall-text').setAttribute('aria-hidden', String(s.wall <= .12));
    },
  };
}
