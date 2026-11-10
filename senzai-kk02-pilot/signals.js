// Quiet concepts drift on authored paths, then resist examination with a physical escape offset.
import * as T from 'three';
import { SWEEP, TUNING } from './pilot.js?v=3';

export const CONCEPTS = [
  { id: 'KIOKU', kanji: '記憶', gloss: 'memory', anchor: [42, 38, 18], orbit: .035, wobble: [8, 5, 8], rate: .5 },
  { id: 'KAGE', kanji: '影', gloss: 'shadow', anchor: [-48, 22, 26], orbit: -.05, wobble: [10, 4, 6], rate: .35 },
  { id: 'INORI', kanji: '祈り', gloss: 'prayer', anchor: [8, 62, -52], orbit: .02, wobble: [6, 10, 6], rate: .3 },
  { id: 'YUME', kanji: '夢', gloss: 'dream', anchor: [-70, 48, -30], orbit: .06, wobble: [12, 8, 12], rate: .6 },
  { id: 'EN', kanji: '縁', gloss: 'bond', anchor: [64, 26, -58], orbit: -.03, wobble: [5, 3, 5], rate: .45 },
  { id: 'ZANKYO', kanji: '残響', gloss: 'echo', anchor: [-20, 74, 62], orbit: .08, wobble: [14, 6, 14], rate: .8 },
  // The fugitive: fast, and its path skirts overfitting.
  { id: 'KYO', kanji: '虚', gloss: 'void', anchor: [88, 54, 40], orbit: -.11, wobble: [9, 12, 9], rate: 1.1 },
];

export function conceptPosition(c, i, t, out) {
  const a = c.orbit * t, cos = Math.cos(a), sin = Math.sin(a), p = i * 1.7, r = c.rate * t;
  return out.set(
    c.anchor[0] * cos - c.anchor[2] * sin + c.wobble[0] * Math.sin(r + p),
    c.anchor[1] + c.wobble[1] * Math.sin(r * 1.3 + p * 2),
    c.anchor[0] * sin + c.anchor[2] * cos + c.wobble[2] * Math.cos(r * .8 + p * 3));
}

const TRAIL = 56, LIVE = new T.Color(0x7dffb4), READ = new T.Color(0xcfe9e0);

export function createSignals() {
  const group = new T.Group(); group.name = 'FX_SIGNALS';
  const base = new T.Vector3(), previous = new T.Vector3(), away = new T.Vector3(), side = new T.Vector3(), desired = new T.Vector3();
  const centre = new T.Vector3(...TUNING.centre), up = new T.Vector3(0, 1, 0), radial = new T.Vector3();
  const list = CONCEPTS.map((concept, index) => {
    const node = new T.Group();
    const material = new T.MeshBasicMaterial({ color: LIVE.clone(), transparent: true, opacity: .1, depthWrite: false, toneMapped: false });
    const core = new T.Mesh(new T.OctahedronGeometry(.9), material);
    const ringMaterial = new T.MeshBasicMaterial({ color: LIVE.clone(), transparent: true, opacity: .35, depthWrite: false, toneMapped: false });
    const ring = new T.Mesh(new T.TorusGeometry(3, .035, 3, 64), ringMaterial);
    const halo = new T.Mesh(new T.TorusGeometry(4.3, .03, 3, 4), ringMaterial.clone()); // diamond, shown on lock
    halo.visible = false;
    node.add(core, ring, halo);
    const positions = new Float32Array(TRAIL * 3), colors = new Float32Array(TRAIL * 3);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage));
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    for (let j = 0; j < TRAIL; j++) { const f = Math.pow(1 - j / (TRAIL - 1), 2) * .32; colors.set([.13 * f, f, .46 * f], j * 3); }
    const trail = new T.Line(geometry, new T.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    trail.frustumCulled = false;
    group.add(node, trail);
    const position = conceptPosition(concept, index, 0, new T.Vector3());
    for (let j = 0; j < TRAIL; j++) position.toArray(positions, j * 3);
    node.position.copy(position);
    return { index, concept, position, velocity: new T.Vector3(), offset: new T.Vector3(), escapeVelocity: new T.Vector3(), struggle: 0, decode: 0, resolved: false, pinged: -10, lastSweep: null, capturedAt: -10, node, core, ring, halo, material, ringMaterial, trail, positions, sample: 0 };
  });
  return {
    group, list,
    move(t, dt, pilot) {
      for (const s of list) {
        previous.copy(s.position);
        conceptPosition(s.concept, s.index, t, base);
        const resisting = pilot.lock === s.index && pilot.range <= TUNING.holdRange + 3 && !s.resolved;
        if (resisting) {
          s.struggle += dt;
          away.subVectors(s.position, pilot.pos).normalize();
          side.crossVectors(away, up);
          if (side.lengthSq() < .001) side.set(1, 0, 0); else side.normalize();
          const pulse = Math.sin(s.struggle * 3.8 + s.index * .9);
          desired.copy(away).multiplyScalar(14 + s.decode * 5 + pulse * 3);
          desired.addScaledVector(side, Math.sin(s.struggle * 2.8 + s.index) * 15);
          desired.y += Math.sin(s.struggle * 4.1 + s.index) * 5;
          // Do not force a capture outside the playable volume.
          radial.subVectors(s.position, centre);
          if (radial.length() > 112) desired.addScaledVector(radial.normalize(), -22);
          s.escapeVelocity.lerp(desired, 1 - Math.exp(-4 * dt));
        } else {
          s.struggle = 0;
          desired.copy(s.offset).multiplyScalar(-1.1);
          s.escapeVelocity.lerp(desired, 1 - Math.exp(-3 * dt));
        }
        s.offset.addScaledVector(s.escapeVelocity, dt);
        s.position.copy(base).add(s.offset);
        radial.subVectors(s.position, centre);
        if (radial.length() > 129) s.position.copy(centre).addScaledVector(radial.normalize(), 129);
        s.position.y = Math.max(23, s.position.y);
        s.offset.subVectors(s.position, base);
        s.velocity.subVectors(s.position, previous).divideScalar(Math.max(dt, .001));
      }
    },
    update(t, dt, camera, pilot) {
      for (const s of list) {
        s.node.position.copy(s.position);
        s.sample -= dt;
        if (s.sample <= 0) { s.sample = .09; s.positions.copyWithin(3, 0, (TRAIL - 1) * 3); }
        s.position.toArray(s.positions, 0);
        s.trail.geometry.attributes.position.needsUpdate = true;
        const isLocked = s.index === pilot.lock, resisting = pilot.examIndex === s.index;
        const flare = Math.pow(Math.max(0, 1 - (t - s.pinged) / SWEEP.revealTime), 1.5);
        const capture = Math.max(0, 1 - (t - s.capturedAt) / .9);
        s.core.rotation.y = t * (isLocked ? 2.4 : .6); s.core.rotation.x = t * .37;
        s.core.scale.setScalar((isLocked ? 1.1 : .52) + flare * .7 + capture * 1.2 + (resisting ? .2 * Math.sin(t * 17) : 0));
        s.ring.quaternion.copy(camera.quaternion); s.halo.quaternion.copy(camera.quaternion);
        s.halo.visible = isLocked; s.halo.rotateZ(t * (resisting ? 2.7 : .9)); s.halo.scale.setScalar(1 + .06 * Math.sin(t * 5) + capture * 2);
        s.halo.material.opacity = (resisting ? .55 + .15 * Math.sin(t * 13) : .3) + capture * .3;
        s.ring.scale.setScalar(1 - s.decode * .45);
        s.ringMaterial.opacity = (s.resolved ? .009 : .018) + (isLocked ? .48 : 0) + flare * .55 + capture * .35;
        s.material.opacity = Math.min(1, .09 + (isLocked ? .85 : 0) + flare * .9 + capture);
        s.material.color.copy(s.resolved ? READ : LIVE).multiplyScalar(isLocked ? 1.25 + capture : .28 + flare * 1.5);
        s.ringMaterial.color.copy(s.resolved ? READ : LIVE);
        s.trail.material.opacity = .025 + (isLocked ? .8 : 0) + flare * .9;
      }
    },
  };
}
