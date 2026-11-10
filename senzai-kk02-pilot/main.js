// Senzai models, animation, code and concepts by Jelaludo. Attribution required for reuse.
// Senzai-KK02 / pilot study. Reuses the KK02 model, fibers, fog and foldspace untouched;
// only the body pose and attention target are steered (see runtime-pilot.js).
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createRig } from './runtime-pilot.js';
import { createFibers, createFog } from '../senzai-kk02/effects.js?v=5';
import { createSpace } from '../senzai-kk02/space.js';
import { createAttention } from './attention.js';
import { createSignals } from './signals.js?v=4';
import { createPilot, TUNING, SWEEP } from './pilot.js?v=4';
import { createHud } from './hud.js?v=4';
import { createMobile, touchLayout } from './mobile.js';
import { registerPwa } from './pwa.js';

const ASSETS = '../assets/senzai-kk02/', LOD = 1;
const stage = document.getElementById('stage'), loading = document.getElementById('loading');
const mobileRendering = touchLayout();
const renderer = new T.WebGLRenderer({ antialias: !mobileRendering, powerPreference: mobileRendering ? 'low-power' : 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobileRendering ? 1.25 : 1.5));
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
stage.prepend(renderer.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#020706');
const camera = new T.PerspectiveCamera(52, 1, .1, 800);
const key = new T.DirectionalLight(0xc5e5db, 3.7); key.position.set(28, 58, -20); key.target.position.set(0, 25, 0);
scene.add(key, key.target, new T.AmbientLight(0x6c9e92, .10));
const space = createSpace(); scene.add(space.group);
for (const item of space.targets) item.target.visible = false;   // the authored foci give way to moving signals
const fog = createFog(); scene.add(fog.mesh);
const signals = createSignals(); scene.add(signals.group);

// Overfitting: orange interference grows into red noise at the edge of latent space.
const wallUniforms = { uTime: { value: 0 }, uNear: { value: 0 }, uBody: { value: new T.Vector3() } };
const wall = new T.Mesh(new T.SphereGeometry(182, 96, 48), new T.ShaderMaterial({
  uniforms: wallUniforms, side: T.BackSide, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
  vertexShader: `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec3 vP;uniform float uTime;uniform float uNear;uniform vec3 uBody;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){float column=floor(atan(vP.z,vP.x)*72.),speed=.5+h(vec2(column,3.))*2.2,y=vP.y*.11+uTime*speed,cell=floor(y);
 float lit=step(.62,h(vec2(column,cell)))*(.25+.75*fract(y)),tear=step(.93,h(vec2(floor(vP.y*.35+uTime*3.),floor(uTime*7.))));
 float near=exp(-distance(vP,uBody)*.022);
 vec3 tint=mix(vec3(1.,.32,.025),vec3(1.,.025,.055),smoothstep(.2,.85,uNear));
 gl_FragColor=vec4(tint*(lit+tear*.5)*uNear*(.035+near*1.5),1.);}`,
}));
wall.position.set(...TUNING.centre); wall.frustumCulled = false; scene.add(wall);

// Sweep: an expanding lattice that flares every signal it crosses.
const sweep = new T.Mesh(new T.IcosahedronGeometry(1, 5), new T.MeshBasicMaterial({ color: 0x3dff9a, wireframe: true, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
sweep.frustumCulled = false; sweep.visible = false; scene.add(sweep);
// Tether: a faint thread from the body to the locked signal.
const tether = new T.Line(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3)), new T.LineBasicMaterial({ color: 0x4dffa6, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
tether.frustumCulled = false; scene.add(tether);

const composer = new EffectComposer(renderer), bloom = new UnrealBloomPass(new T.Vector2(1, 1), .85, .55, .50);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass());
const interference = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uNear: { value: 0 } },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime;uniform float uNear;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec4 scene=texture2D(tDiffuse,vUv);float tick=floor(uTime*18.);
 float grain=h(floor(vUv*vec2(1100.,700.))+tick),edge=smoothstep(.12,.7,length(vUv-.5));
 float streak=step(.96,h(vec2(floor(vUv.y*230.),tick)));
 float amount=uNear*(.35+.65*edge)*(.36*smoothstep(.25,.95,grain)+.15*streak);
 vec3 tint=mix(vec3(1.,.38,.045),vec3(1.,.035,.065),smoothstep(.2,.85,uNear));
 gl_FragColor=vec4(mix(scene.rgb,tint,amount),scene.a);}`,
});
composer.addPass(interference);
let hud, pilot;
function resize() { const w = stage.clientWidth, h = stage.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); composer.setSize(w, h); pilot?.resize(w, h); }
new ResizeObserver(resize).observe(stage); resize();

const LORE_EVENTS = new Set(['signal_detected', 'focus_acquired', 'examination_started', 'examination_broken', 'examination_completed', 'attention_released']);
pilot = createPilot({ camera, dom: renderer.domElement, signals, onEvent(type, data) {
  hud?.event(type, data);
  // LORE.md event vocabulary, re-broadcast for game code: addEventListener('senzai:focus_acquired', e => e.detail.concept)
  if (LORE_EVENTS.has(type)) dispatchEvent(new CustomEvent('senzai:' + type, { detail: { index: data, concept: signals.list[data]?.concept } }));
} });
hud = createHud({ stage, camera, signals, pilot });
const mobile = createMobile({ stage, canvas: renderer.domElement, pilot, signals });
registerPwa();

let rig, fibers, attention, last = performance.now();
function frame() {
  const now = performance.now();
  if (document.hidden) { last = now; return; }
  if (mobileRendering && now - last < 1000 / 30) return;
  const dt = Math.min((now - last) / 1000, .1); last = now;
  const s = pilot.state;
  // Small physics steps keep inertia, contact and the three-second hold stable at lower FPS.
  const steps = Math.max(1, Math.ceil(dt * 60)), step = dt / steps;
  if (!s.paused) for (let i = 0; i < steps; i++) { signals.move(s.clock + step, step, s); pilot.step(step); }
  signals.update(s.clock, dt, camera, s);
  const state = rig.pose(s.clock, { awake: 1, hdr: true });
  fibers.update(state); attention.update(state);
  space.update(state, camera);
  fog.update(camera, state.time, 1);

  wallUniforms.uTime.value = s.clock; wallUniforms.uNear.value = s.wall; wallUniforms.uBody.value.copy(s.pos).sub(wall.position);
  interference.uniforms.uTime.value = s.clock; interference.uniforms.uNear.value = s.wall;
  const age = s.clock - s.pingAt;
  sweep.visible = age >= 0 && age < SWEEP.duration;
  if (sweep.visible) { sweep.position.copy(s.pingOrigin); sweep.scale.setScalar(SWEEP.startRadius + age * SWEEP.speed); sweep.material.opacity = .18 * Math.pow(1 - age / SWEEP.duration, 2); }
  const line = tether.geometry.attributes.position;
  tether.material.opacity = T.MathUtils.damp(tether.material.opacity, s.lock >= 0 ? .12 * (1 - s.precision) : 0, 6, dt);
  if (s.lock >= 0) { line.setXYZ(0, ...state.center); line.setXYZ(1, ...signals.list[s.lock].position.toArray()); line.needsUpdate = true; }

  hud.update(); mobile.update();
  composer.render();
}

try {
  const manifest = await fetch(ASSETS + 'manifest.json').then(r => { if (!r.ok) throw Error(`manifest ${r.status}`); return r.json(); });
  const entry = manifest.assets.find(a => a.lod === LOD), gltf = await new GLTFLoader().loadAsync(ASSETS + entry.file);
  scene.add(gltf.scene);
  rig = createRig(gltf.scene);
  fibers = createFibers(LOD, mobileRendering ? { density: .4, detailSegments: 8 } : {}); rig.frame.add(fibers.group);
  attention = createAttention(); rig.frame.add(attention.group);
  gltf.scene.traverse(n => { if (n.isMesh) n.frustumCulled = false; });
  loading.hidden = true;
  mobile.ready();
  window.senzaiPilot = { pilot, signals, camera, scene, renderer, rig, TUNING, frame };
  renderer.setAnimationLoop(frame);
} catch (e) { loading.textContent = e.message; console.error(e); }
