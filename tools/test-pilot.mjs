import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
// Run with Node 22.15+: node tools/test-pilot.mjs /path/to/three/build/three.module.js
// If three is installed locally, the argument can be omitted. The game itself needs no build.
const root = new URL('../', import.meta.url);
const threeURL = pathToFileURL(process.argv[2] ? resolve(process.argv[2]) : createRequire(import.meta.url).resolve('three')).href;
registerHooks({resolve(specifier, context, next) { if (specifier === 'three') return {url: threeURL, shortCircuit:true}; return next(specifier, context); }});
const {PerspectiveCamera} = await import('three');
const {createPilot, TUNING, SWEEP} = await import(new URL('senzai-kk02-pilot/pilot.js?v=3', root).href);
const {createSignals} = await import(new URL('senzai-kk02-pilot/signals.js?v=3', root).href);
const {fieldState, strandState, curve, STEER} = await import(new URL('senzai-kk02-pilot/runtime-pilot.js', root).href);
globalThis.addEventListener=()=>{};
globalThis.document={addEventListener(){},hidden:false};
function world() {
 const signals=createSignals(), events=[];
 const camera=new PerspectiveCamera(52,1.7,.1,800);
 const pilot=createPilot({camera,dom:{addEventListener(){}},signals,onEvent:(type,index)=>events.push({type,index,time:pilot.state.clock})});
 const tick=(seconds,moving=true,aiming=false)=>{
  for(let n=0;n<Math.round(seconds*60);n++){
   if(moving)signals.move(pilot.state.clock+1/60,1/60,pilot.state);
   if(aiming)pilot.aimAt(pilot.state.targetScreen.x-pilot.state.aimDrift.x,pilot.state.targetScreen.y-pilot.state.aimDrift.y);
   pilot.step(1/60);
  }
 };
 return {signals,pilot,events,tick,camera};
}
{
 const {pilot,tick}=world(); pilot.keys.add('KeyW');tick(1.5);const powered=pilot.state.speed;
 pilot.keys.clear();tick(1);const coast=pilot.state.speed;assert(coast/powered>.5);
 pilot.keys.add('KeyX');tick(.75);assert(pilot.state.speed<1);
 console.log('inertia', {powered,coast,braked:pilot.state.speed});
}
for(let i=0;i<7;i++) {
 const {pilot,tick,signals,events}=world();pilot.lock(i);pilot.keys.add('KeyW');
 let elapsed=0, checkedRing=false;
 while(!signals.list[i].resolved && elapsed<15){
  tick(.1,true,true);elapsed+=.1;
  if(pilot.state.heldTime>2 && !signals.list[i].resolved){
   const state=fieldState(pilot.state.clock);state.states=Array.from({length:48},(_,id)=>strandState(id,state));
   assert.equal(STEER.ranks.size,15);
   for(const id of STEER.ranks.keys()){
    const point=curve(id,1,state).map((v,j)=>v+state.center[j]);
    const target=signals.list[i].position.toArray();
    assert(point.every(Number.isFinite));
    assert(Math.hypot(...point.map((v,j)=>v-target[j]))<2.5,'all fifteen tips converge around the concept');
   }
   checkedRing=true;
  }
 }
 assert(checkedRing);
 console.log('Manual aim + W approach + fifteen-tip capture',i+1,elapsed.toFixed(1)+'s');
 assert(signals.list[i].resolved, `Tracked pursuit must capture concept ${i}`);
 assert(events.filter(e=>e.type==='examination_completed').length===1);
 const start=events.filter(e=>e.type==='examination_started').at(-1).time;
 assert(elapsed-start>=TUNING.readTime);
 pilot.cycle(1);assert.notEqual(pilot.state.lock,i);
}
{
 const {pilot,tick,signals,events}=world();const sig=signals.list[0];
 pilot.state.pos.copy(sig.position).add({x:-35,y:0,z:0});pilot.lock(0);tick(2.5,false,true);
 assert(pilot.state.heldTime>1 && pilot.state.heldTime<2);assert(!sig.resolved);
 sig.position.x+=80;tick(.1,false);assert.equal(sig.decode,0);assert.equal(pilot.state.heldTime,0);assert.equal(pilot.state.examIndex,-1);
 pilot.lock(1);assert.equal(signals.list[1].decode,0);assert.equal(pilot.state.heldTime,0);
 assert(events.some(e=>e.type==='examination_broken'));console.log('hold reset and target switch passed');
}
{
 const {pilot,tick,signals}=world();const sig=signals.list[0];
 pilot.state.pos.copy(sig.position).add({x:-37,y:0,z:0});pilot.lock(0);tick(6);
 assert(!sig.resolved);console.log('idle target escapes', {range:pilot.state.range,decode:sig.decode});
}
{
 const {pilot,tick,events,signals}=world();pilot.ping();tick(3);
 assert.equal(events.filter(e=>e.type==='signal_detected').length,7);
 assert(signals.list.every(s=>pilot.state.clock-s.pinged>SWEEP.revealTime));
 tick(2);assert.equal(events.filter(e=>e.type==='signal_detected').length,7);console.log('sweep crosses once and labels expire');
}
{
 const {pilot,tick}=world();pilot.state.pos.set(145,30,0);tick(.1);assert(pilot.state.wall>.9);assert(pilot.state.vel.x<0);
 tick(4);assert(pilot.state.pos.x<120);assert(pilot.state.wall<.3);console.log('overfitting restores inward', {x:pilot.state.pos.x,wall:pilot.state.wall});
}
{
 const {pilot,tick,signals}=world();pilot.lock(0);pilot.keys.add('KeyW');tick(12);
 assert(!signals.list[0].resolved);assert.equal(signals.list[0].decode,0);
 assert.equal(pilot.state.examIndex,-1);console.log('W alone cannot acquire or capture');
}
{
 const {pilot,tick,signals}=world();const sig=signals.list[0];
 pilot.state.pos.copy(sig.position).add({x:-35,y:0,z:0});pilot.lock(0);tick(2.5,false,true);
 const progress=sig.decode;assert(progress>0);
 pilot.aimAt(.9,.85);tick(.1,false);
 assert.equal(sig.decode,progress,'brief misalignment must pause progress');
 assert.equal(pilot.state.examIndex,0,'brief slip keeps the tendrils attached');
 tick(.3,false);assert.equal(sig.decode,0);assert.equal(pilot.state.examIndex,-1);
 tick(4.5,false,true);assert(sig.resolved,'re-alignment allows a new successful capture');
 console.log('aim slip pauses, breaks, resets and reacquires');
}
{
 const {pilot,tick,signals,camera}=world();pilot.resize(390,700);camera.aspect=390/700;camera.updateProjectionMatrix();
 pilot.lock(0);pilot.keys.add('KeyW');tick(12,true,true);
 assert(signals.list[0].resolved,'narrow view must keep the target reachable by the reticle');
 console.log('narrow viewport reticle + capture passed');
}
console.log('ALL PASSED');
