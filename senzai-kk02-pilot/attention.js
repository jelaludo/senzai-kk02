// createAttention from senzai-kk02/effects.js, re-bound to the pilot fork's curve() so the
// emerald strands follow the steered attention target. Rendering is unchanged.
import * as T from 'three';
import { curve } from './runtime-pilot.js?v=5';

export function createAttention() {
  const group = new T.Group(); group.name = 'FX_LIVING_EMERALD';
  const steps = 64, p = new Float32Array(48 * steps * 6), c = new Float32Array(p.length), tips = new Float32Array(48 * 3), levels = new Float32Array(48);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(p, 3).setUsage(T.DynamicDrawUsage));
  g.setAttribute('color', new T.BufferAttribute(c, 3).setUsage(T.DynamicDrawUsage));
  const lines = new T.LineSegments(g, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .66, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
  lines.frustumCulled = false; group.add(lines);
  const pg = new T.BufferGeometry();
  pg.setAttribute('position', new T.BufferAttribute(tips, 3).setUsage(T.DynamicDrawUsage));
  pg.setAttribute('level', new T.BufferAttribute(levels, 1).setUsage(T.DynamicDrawUsage));
  const points = new T.Points(pg, new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: `attribute float level;varying float vLevel;void main(){vLevel=level;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=16.*min(1.5,60./max(20.,-p.z));gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying float vLevel;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.||vLevel<.001)discard;float a=exp(-r*r*7.)*(1.-smoothstep(.6,1.,r));gl_FragColor=vec4(vec3(.12,1.,.47)*vLevel,a*.25);}`,
  }));
  points.frustumCulled = false; group.add(points);
  return {
    group,
    update(state) {
      for (let i = 0; i < 48; i++) {
        const level = state.states[i].level;
        for (let j = 0; j < steps; j++) for (let k = 0; k < 2; k++) {
          const u = (j + k) / steps, idx = (i * steps * 2 + j * 2 + k) * 3, power = level * (.8 + Math.exp(-Math.pow((u - (state.time / 6 + i * .13) % 1) * 9, 2)));
          p.set(curve(i, u, state), idx); c.set([.13 * power, power, .46 * power], idx);
        }
        tips.set(curve(i, 1, state), i * 3); levels[i] = level;
      }
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = pg.attributes.position.needsUpdate = pg.attributes.level.needsUpdate = true;
    },
  };
}
