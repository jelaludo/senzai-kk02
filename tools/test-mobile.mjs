import assert from 'node:assert/strict';
import {bindStick,bindHold,bindTouchAim} from '../senzai-kk02-pilot/mobile.js';
class Element {
 constructor(){this.listeners={};this.captures=new Set();this.style={};this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};this.thumb={style:{}};}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 querySelector(){return this.thumb;}
 getBoundingClientRect(){return {left:20,top:500,width:116,height:116};}
 setPointerCapture(id){this.captures.add(id);}
 hasPointerCapture(id){return this.captures.has(id);}
 releasePointerCapture(id){this.captures.delete(id);this.fire('lostpointercapture',{pointerId:id});}
 fire(type,data={}){for(const fn of this.listeners[type]||[])fn({button:0,pointerId:1,clientX:78,clientY:558,preventDefault(){},...data});}
}
const stick=new Element();let flight=[];const resetStick=bindStick(stick,(x,z)=>flight=[x,z]);
stick.fire('pointerdown',{clientY:510});assert.equal(flight[1],1);
stick.fire('pointermove',{pointerId:2,clientY:600});assert.equal(flight[1],1,'second finger cannot steal the stick');
stick.fire('pointermove',{clientX:300,clientY:300});assert(Math.hypot(...flight)<=1.00001);
stick.fire('pointercancel');assert.deepEqual(flight,[0,0]);assert(!stick.classes.has('active'));
stick.fire('pointerdown',{pointerId:3,clientX:110});resetStick();assert.deepEqual(flight,[0,0]);assert.equal(stick.captures.size,0);
const brake=new Element();let braking=false;const resetBrake=bindHold(brake,on=>braking=on);
brake.fire('pointerdown',{pointerId:4});brake.fire('pointerdown',{pointerId:5});brake.fire('pointerup',{pointerId:4});assert(braking);
brake.fire('pointercancel',{pointerId:5});assert(!braking);brake.fire('pointerdown');resetBrake();assert(!braking);
const canvas=new Element(),deltas=[];const pilot={state:{touchMode:true,paused:false},touchLook:(x,y)=>deltas.push([x,y])};
const resetAim=bindTouchAim(canvas,pilot);
canvas.fire('pointerdown',{clientX:210,clientY:300});assert.equal(deltas.length,0,'finger down never snaps the aiming ring');
canvas.fire('pointermove',{clientX:230,clientY:290});assert.deepEqual(deltas.at(-1),[20,-10]);
stick.fire('pointerdown',{pointerId:20,clientY:510});canvas.fire('pointermove',{pointerId:20,clientX:600});assert.equal(deltas.length,1,'flight finger does not move aim');
canvas.fire('pointerup');canvas.fire('pointerdown',{clientX:300,clientY:400});canvas.fire('pointermove',{clientX:310,clientY:410});assert.deepEqual(deltas.at(-1),[10,10],'lift and re-place finger without a jump');
resetAim();assert.equal(canvas.captures.size,0);pilot.state.paused=true;canvas.fire('pointerdown');assert.equal(canvas.captures.size,0);
console.log('Touch checks passed: analog limits, simultaneous fingers, relative aiming, pointer cancellation, held buttons and pause.');
