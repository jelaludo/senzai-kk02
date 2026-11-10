import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
// Run with Node 22.15+: node tools/test-pilot.mjs
// Optional argument overrides the bundled Three.js module for compatibility checks.
const root = new URL('../', import.meta.url);
const threeURL = process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : new URL('vendor/three/build/three.module.js',root).href;
registerHooks({resolve(specifier, context, next) { if (specifier === 'three') return {url: threeURL, shortCircuit:true}; return next(specifier, context); }});
const {PerspectiveCamera} = await import('three');
const {createPilot, TUNING, SWEEP} = await import(new URL('senzai-kk02-pilot/pilot.js?v=5', root).href);
const {createSignals} = await import(new URL('senzai-kk02-pilot/signals.js?v=5', root).href);
const {fieldState, strandState, curve, STEER} = await import(new URL('senzai-kk02-pilot/runtime-pilot.js?v=5', root).href);
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
 assert(!sig.resolved);assert.equal(sig.struggle,0,'selection alone does not start the escape motion');
 console.log('selected thought draws closer but still needs aim', {range:pilot.state.range,decode:sig.decode});
}
for(let i=0;i<7;i++) {
 const {pilot,tick,signals}=world();pilot.lock(i);
 if(i%2){pilot.state.touchMode=true;pilot.resize(390,700);}
 let elapsed=0;
 while(!signals.list[i].resolved && elapsed<22){tick(.1,true,true);elapsed+=.1;}
 assert(signals.list[i].resolved,`gentle pursuit plus manual aim should capture thought ${i} without constant thrust`);
 console.log('Natural pursuit + manual aim',i+1,elapsed.toFixed(1)+'s');
}
{
 const {pilot,tick,signals,events}=world(),sig=signals.list[0];
 pilot.state.pos.copy(sig.position).add({x:-60,y:0,z:0});pilot.lock(0);tick(1,false,true);
 assert(events.some(e=>e.type==='examination_started'),'longer tendrils can seat beyond the former 42 m range');
 assert(pilot.state.range>55,'the lock seats before the sphere needs to close in');
 tick(3.5,false,true);assert(sig.resolved,'long-distance focus still completes its full three-second hold');
 console.log('Extended-reach capture passed');
}
{
 const {pilot,tick,signals}=world(),sig=signals.list[0];
 for(const other of signals.list.slice(1))other.position.set(1000,1000,1000);
 pilot.state.pos.copy(sig.position).add({x:-85,y:0,z:0});pilot.lock(0);tick(2,false);
 assert(pilot.state.range<82,'selection produces a gradual pull without movement input');
 assert(pilot.state.speed<TUNING.attractionSpeed+2,'automatic approach remains gentle');
 pilot.setTouchFlight({brake:true});tick(1.5,false);assert(pilot.state.speed<.1,'braking overrides attraction');
 const before=pilot.state.range;pilot.setTouchFlight({brake:false,z:-1});tick(1.5,false);
 assert(pilot.state.range>before+8,'retreat wins over attraction');
 pilot.clearInput();pilot.release();pilot.state.vel.set(0,0,0);tick(2,false); // allow manual thrust to spool down
 pilot.state.vel.set(0,0,0);const released=pilot.state.pos.clone();tick(1,false);
 assert(pilot.state.pos.distanceTo(released)<.1,'release removes the pull');
 console.log('Attraction, brake, retreat and release passed');
}
{
 const {pilot,tick,signals}=world(),sig=signals.list[0];
 for(const other of signals.list.slice(1))other.position.set(1000,1000,1000);
 pilot.state.pos.copy(sig.position).add({x:-95,y:0,z:0});pilot.lock(0);pilot.setTouchFlight({brake:true});tick(2,false);
 const state=fieldState(pilot.state.clock);state.states=Array.from({length:48},(_,id)=>strandState(id,state));
 const tips=state.states.map((s,id)=>({commit:s.commit,length:Math.hypot(...curve(id,1,state))})).filter(s=>s.commit>.9);
 assert(tips.length>=4);assert(tips.every(t=>t.length>35),'front tendrils visibly reach out before ultra focus');
 sig.resolved=true;pilot.clearInput();pilot.state.vel.set(0,0,0);const captured=pilot.state.pos.clone();tick(1,false);
 assert(pilot.state.pos.distanceTo(captured)<.01,'captured thoughts no longer pull the sphere');
 console.log('Long scouting tendrils and capture release passed');
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
{
 const {pilot,tick,signals,camera}=world();pilot.state.touchMode=true;pilot.resize(390,700);camera.aspect=390/700;camera.updateProjectionMatrix();
 pilot.lock(0);pilot.setTouchFlight({z:1});tick(14,true,true);assert(signals.list[0].resolved);
 pilot.setTouchFlight({z:0,brake:true});tick(1);assert(pilot.state.speed<1);
 pilot.setTouchFlight({y:1,brake:false});tick(.6);assert(pilot.state.vel.y>0);
 pilot.clearInput();const position=pilot.state.pos.clone();pilot.state.paused=true;tick(1,false);
 assert.equal(pilot.state.pos.distanceTo(position),0);console.log('mobile analog pursuit, braking, lift and pause passed');
}
console.log('ALL PASSED');
