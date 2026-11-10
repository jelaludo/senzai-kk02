// Senzai-KK02 PILOT FORK of assets/senzai-kk02/runtime.js (revision 3). The shipped runtime stays byte-identical.
// Only difference: when STEER.active, the body centre/velocity, the attention target and the fifteen-tip
// examination (target, axis, member strands) come from the player (pilot.js) instead of the authored
// 72 s loop. Lines marked PILOT; everything else is verbatim.
export const STEER={active:false,center:[-8,25,3],velocity:[0,0,0],swift:0,sample:null,target:[0,0,0],axis:[0,0,1],ranks:new Map()};
export const SPEC={radius_m:16,center_y_m:25,cycle_s:72,attention_strands:48,plot_m:[100,100]};
export const TIERS=[{lod:0,fibers:5000,segments:6,sides:3,attention_segments:40,attention_sides:5,visual_fibers:36000},{lod:1,fibers:650,segments:4,sides:3,attention_segments:20,attention_sides:3,visual_fibers:18000},{lod:2,fibers:108,segments:3,sides:3,attention_segments:2,attention_sides:3,visual_fibers:0}];
export const FOCI=[[35,36,22],[-38,24,20],[7,34,-42]];
export const hash=n=>{const a=Math.sin(n*127.1+311.7)*43758.5453;return a-Math.floor(a);};
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const norm=a=>mul(a,1/(Math.hypot(...a)||1));
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function direction(i,n){const y=1-2*(i+.5)/n,a=i*2.399963229728653+.41,r=Math.sqrt(1-y*y);return [r*Math.cos(a),y,r*Math.sin(a)];}
export const attentionDirection=i=>direction(i*19%48,48);
const HOME=[-8,25,3],STOPS=[[10,30,4],[-12,26,3],[2,31,-12]],LEGS=[{at:10,duration:1.5,from:HOME,to:STOPS[0]},{at:29,duration:1.6,from:STOPS[0],to:STOPS[1]},{at:49,duration:1.5,from:STOPS[1],to:STOPS[2]},{at:67,duration:2,from:STOPS[2],to:HOME}];
// Unevenly spaced detections interrupt otherwise independent foraging. Their envelope
// is analytic, so scrubbing, backwards time and the 72 s seam remain deterministic.
export const ATTENTION_EVENTS=[{at:8,to:0},{at:19,to:2},{at:27,to:1},{at:40,to:0},{at:47,to:2},{at:65,to:0}];
export const PRECISION_FOCUS={at_s:27,focus:1,strands:15,radius_m:1.1,standoff_m:1.4,acquire_s:.8,hold_until_s:31.1,release_end_s:33.5};
// Pick the same fifteen front-facing roots throughout the inspection; no membership
// changes as the body travels. Their target stays fixed in world space.
const precisionAxis=norm(sub(FOCI[1],STOPS[0]));
const precisionMembers=Array.from({length:48},(_,i)=>i).sort((a,b)=>dot(attentionDirection(b),precisionAxis)-dot(attentionDirection(a),precisionAxis)).slice(0,PRECISION_FOCUS.strands);
const precisionRanks=new Map(precisionMembers.map((id,rank)=>[id,rank]));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function attentionAt(time,delay=0){
 if(STEER.active)return STEER.sample(delay); // PILOT
 time=((time-delay)%72+72)%72;
 let from=FOCI[0],to=FOCI[0],index=0,age=100,at=-1;
 for(const event of ATTENTION_EVENTS){if(time<event.at)break;from=to;to=FOCI[event.to];index=event.to;age=time-event.at;at=event.at;}
 const focus=mix(from,to,ease(age/.48));
 const gather=smooth(age/.38)*(1-smooth((age-1.65)/3.1));
 const precision=at===PRECISION_FOCUS.at_s?smooth(age/PRECISION_FOCUS.acquire_s)*(1-smooth((time-PRECISION_FOCUS.hold_until_s)/(PRECISION_FOCUS.release_end_s-PRECISION_FOCUS.hold_until_s))):0;
 return {focus,index,age,gather,precision};
}
export function fieldState(seconds=0,awake=1){
 const time=((seconds%72)+72)%72,w=time*Math.PI*2/72;let center=[...HOME],velocity=[0,0,0],swift=0;
 for(const leg of LEGS){if(time>=leg.at){const u=clamp((time-leg.at)/leg.duration),e=ease(u),derivative=30*u*u*(u-1)*(u-1)/leg.duration;center=leg.from.map((v,i)=>v+(leg.to[i]-v)*e);velocity=mul(sub(leg.to,leg.from),derivative);swift=Math.max(swift,Math.sin(Math.PI*u));}}
 center=add(center,[.5*Math.sin(w),.55*Math.sin(w*2),.4*(Math.cos(w)-1)]);
 if(STEER.active){center=[...STEER.center];velocity=[...STEER.velocity];swift=STEER.swift;} // PILOT
 const attention=attentionAt(time),facing=norm(sub(attention.focus,center));
 // A common breeze supplies spatial coherence; individual filaments lag behind it.
 const breeze=[Math.sin(w*7)*.9+Math.sin(w*11+.8)*.32,Math.sin(w*5+1.1)*.24,Math.cos(w*6+.4)*.8+Math.sin(w*9)*.3];
 return {time,center,velocity,swift,...attention,facing,breeze,awake:clamp(awake),phase:attention.precision>.72?'EXAMINING':attention.gather>.72?'FOCUS LOCK':attention.gather>.12?'SENSING':swift>.02?'FOLLOWING':'FORAGING',cycle_s:72};
}
export function strandState(i,state){
 const d=attentionDirection(i),seed=hash(i+53),w=state.time*Math.PI*2/72;
 const notice=attentionAt(state.time,.025+hash(i+91)*.16),facing=norm(sub(notice.focus,state.center)),alignment=dot(d,facing);
 const precision=(STEER.active?STEER.ranks:precisionRanks).has(i)?notice.precision*state.awake:0; // PILOT
 const cohort=smooth((alignment+.28)/.85),commit=Math.max(notice.gather*cohort*(1-notice.precision*.9)*state.awake,precision);
 // Slow extension/hold/withdraw cycles, each strand with a different phase and pace.
 const cycle=(state.time/(72/(7+i%4))+hash(i+107))%1;
 const probe=smooth(cycle/.24)*(1-smooth((cycle-.48)/.42));
 const scout=smooth((Math.sin(w*(3+i%3)+i*2.4)+.35)/1.1);
 const level=state.awake*Math.max(probe*(.14+.38*scout),commit*(.82+.18*Math.sin(w*5+i)*Math.sin(w*5+i)));
 const extension=state.awake*((probe-.45)*(5.2+seed*2.4)+commit*(4.8+seed*2.3));
 return {level,extension,alignment,commit,probe,scout,facing,precision};
}
export function curve(i,u,state,active=true,count=48){
 const d=active?attentionDirection(i):direction(i,count),a=norm(cross(d,Math.abs(d[1])>.92?[1,0,0]:[0,1,0])),b=cross(d,a),seed=hash(i+7),w=state.time*Math.PI*2/72;
 const ss=active?(state.states?.[i]||strandState(i,state)):{extension:0,commit:0,probe:0};
 const uu=u*u,bend=u*u*(3-2*u),breeze=state.breeze||[0,0,0],sideWind=sub(breeze,mul(d,dot(d,breeze)));
 if(!active){
  const breathing=.42*Math.sin(w*4+dot(d,[2.1,1.3,-1.7]))+.26*Math.sin(w*9+seed*8);
  const ca=1.5*Math.sin(Math.PI*u)*(seed-.30)+Math.sin(w*7+seed*9-u*2.3)*.70*uu;
  const cb=Math.sin(Math.PI*u*1.6+seed*4)*Math.sin(Math.PI*u)*.9+Math.cos(w*5+seed*13-u*1.4)*.42*uu;
  const facing=state.facing,tangent=sub(facing,mul(d,dot(d,facing))),gather=state.gather*state.awake*smooth((dot(d,facing)+.2)/.9);
  return add(add(mul(d,3.2+12.8*u+breathing*bend+gather*.65*uu),add(mul(a,ca),mul(b,cb))),add(mul(sideWind,1.35*bend),add(mul(tangent,gather*1.6*uu),mul(state.velocity,-.05225*uu))));
 }
 // The tip notices first; the bend follows down the shaft. A cubic curve retains a
 // rooted first tangent while its far tangent points toward a shared sensed target.
 const delayed=attentionAt(state.time,.025+hash(i+91)*.16+(1-u)*.22);
 const aim=norm(sub(delayed.focus,state.center)),tangent=sub(aim,mul(d,dot(d,aim)));
 const reach=15.9+ss.extension;
 let tip=add(mul(d,reach),add(mul(tangent,ss.commit*6.8),mul(sideWind,1.5*(1-ss.commit*.65))));
 const localAim=norm(add(mul(d,.85),add(mul(a,Math.sin(w*(4+i%3)+seed*9)*.75),mul(b,Math.cos(w*5+seed*13)*.55))));
 let tipAim=norm(mix(localAim,norm(sub(sub(delayed.focus,state.center),tip)),ss.commit*.92));
 if(ss.precision>0){
  // An irregular, gently searching ring around one tiny volume in latent space.
  // Its world-space frame stays put even while FLOAT_FRAME approaches it.
  const target=sub(STEER.active?STEER.target:FOCI[PRECISION_FOCUS.focus],state.center),axis=STEER.active?STEER.axis:precisionAxis; // PILOT
  const pa=norm(cross(axis,[0,1,0])),pb=cross(axis,pa),rank=(STEER.active?STEER.ranks:precisionRanks).get(i); // PILOT
  const angle=rank/PRECISION_FOCUS.strands*Math.PI*2+.045*Math.sin(w*13+seed*8);
  const radius=PRECISION_FOCUS.radius_m*(.87+.09*Math.sin(w*11+seed*9));
  const ring=add(mul(pa,Math.cos(angle)*radius),mul(pb,Math.sin(angle)*radius));
  const inspecting=add(sub(target,mul(axis,PRECISION_FOCUS.standoff_m+.09*Math.sin(w*9+seed*7))),ring);
  tip=mix(tip,inspecting,ss.precision);
  tipAim=norm(mix(tipAim,norm(sub(target,inspecting)),ss.precision));
 }
 const p0=mul(d,8.2),p1=add(mul(d,10.7),mul(a,Math.sin(w*4+seed*8)*.7)),p3=tip,p2=sub(p3,mul(tipAim,3.0+ss.probe*1.8));
 const v=1-u;let p=add(add(mul(p0,v*v*v),mul(p1,3*v*v*u)),add(mul(p2,3*v*uu),mul(p3,uu*u)));
 // Broad S-bends and a curling distal section relax when a target is acquired.
 const curl=(1-ss.commit*.84)*(1.1+(1-ss.probe)*1.25);
 const ca=Math.sin(Math.PI*u)*(seed-.30)*2.6+Math.sin(u*Math.PI*2.3-w*(5+i%3)+seed*9)*Math.sin(Math.PI*u)*curl;
 const cb=Math.sin(u*Math.PI*1.8+w*4+seed*13)*Math.sin(Math.PI*u)*curl*.60;
 p=add(p,mul(add(mul(a,ca),mul(b,cb)),1-ss.precision));
 p=add(p,mul(sideWind,(.8*Math.sin(Math.PI*u)+.65*uu)*(1-ss.commit*.65)*(1-ss.precision)));
 return add(p,mul(state.velocity,-.075*uu*(1-ss.precision)));
}
export function curveFrame(i,u,state){const p=curve(i,u,state),t=norm(sub(curve(i,Math.min(1,u+.002),state),curve(i,Math.max(0,u-.002),state))),a=norm(cross(t,Math.abs(t[1])>.92?[1,0,0]:[0,1,0]));return {p,t,a,b:cross(t,a)};}
export function createRig(scene){
 const root=scene.getObjectByName('SENZAI_ROOT'),frame=scene.getObjectByName('FLOAT_FRAME'),mesh=scene.getObjectByName('LIVING_ATTENTION');if(!root||!frame)throw Error('Not Senzai-KK02');
 const tips=Array.from({length:48},(_,i)=>scene.getObjectByName('EYE_'+String(i+1).padStart(2,'0'))),geometry=mesh?.isMesh?mesh.geometry:null,attrs=geometry?.attributes;
 const attr=n=>attrs?.[n]||attrs?.['_'+n.toLowerCase()],ids=attr('fiberId'),along=attr('along'),offset=attr('offset'),localNormal=attr('localNormal'),glow=attr('glow');
 return {root,frame,tips,static:!!root.userData.static,pose(seconds,{awake=1,hdr=false}={}){
  const state=fieldState(this.static?0:seconds,this.static?1:awake),states=Array.from({length:48},(_,i)=>strandState(i,state));state.states=states;
  if(!this.static){frame.position.set(...state.center);for(let i=0;i<48;i++){const f=curveFrame(i,1,state);tips[i].position.set(...f.p);tips[i].quaternion.setFromUnitVectors(tips[i].up,tips[i].position.clone().set(...f.t));}
   if(ids){const cache=new Map();for(let j=0;j<ids.count;j++){const id=Math.round(ids.getX(j)),u=along.getX(j),key=id+':'+u;let f=cache.get(key);if(!f){f=curveFrame(id,u,state);cache.set(key,f);}const axes=[f.a,f.b,f.t],p=[...f.p],n=[0,0,0];for(let a=0;a<3;a++)for(let k=0;k<3;k++){p[k]+=axes[a][k]*offset.getComponent(j,a);n[k]+=axes[a][k]*localNormal.getComponent(j,a);}attrs.position.setXYZ(j,...p);attrs.normal.setXYZ(j,...n);const power=states[id].level*glow.getX(j)*(.72+.28*Math.exp(-Math.pow((u-(state.time/6+id*.13)%1)*7,2)))*(hdr?2.8:1);attrs.color.setXYZ(j,.003+power*.14,.006+power,.005+power*.47);}for(const n of ['position','normal','color'])attrs[n].needsUpdate=true;geometry.computeBoundingSphere();}
  }
  scene.updateMatrixWorld(true);return {...state,states,active:states.filter(s=>s.level>.03).length};
 }};
}
