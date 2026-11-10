import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),scope='https://example.test/senzai-kk02/',handlers={},stores=new Map();let online=true,fetches=0,activated=0,claimed=0;
async function network(request){if(!online)throw Error('offline');fetches++;const url=new URL(request.url||request);const path=url.pathname.slice(new URL(scope).pathname.length);return new Response(await readFile(new URL(path,root)),{status:200});}
const caches={
 async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {
  async addAll(requests){for(const r of requests)map.set(r.url,await network(r));},
  async match(key){return map.get(key.url||key)?.clone();},async put(key,res){map.set(key.url||key,res.clone());}
 };},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}
};
const self={registration:{scope},clients:{async claim(){claimed++;}},skipWaiting(){activated++;},addEventListener:(type,fn)=>handlers[type]=fn};
vm.runInNewContext(await readFile(new URL('sw.js',root),'utf8'),{self,caches,fetch:network,Request,Response,URL});
async function event(type,extras={}){let result,pending=[];handlers[type]({...extras,waitUntil:p=>pending.push(p),respondWith:p=>{result=p;}});const value=await result;await Promise.all(pending);return value;}
await event('install');assert.equal(activated,0,'updates must wait for user restart');const downloaded=fetches;assert(downloaded>=40);
await caches.open('senzai:/another-project/:old');await caches.open('senzai:/senzai-kk02/:old');await event('activate');assert.equal(claimed,1);assert(stores.has('senzai:/another-project/:old'));assert(!stores.has('senzai:/senzai-kk02/:old'));
online=false;
for(const path of ['','senzai-kk02-pilot/?source=pwa','senzai-kk02-pilot/main.js?v=4','senzai-kk02-pilot/mobile.js','vendor/three/build/three.module.js','vendor/three/build/three.core.js','assets/senzai-kk02/senzai_kk02_d0_lod1.glb','manifest.webmanifest']){
 const res=await event('fetch',{request:new Request(scope+path)});assert(res?.ok,`offline ${path}`);assert((await res.arrayBuffer()).byteLength>0);
}
assert.equal(fetches,downloaded,'offline boot requires no network');
assert.equal(await event('fetch',{request:new Request('https://example.test/another-project/')}),undefined);
await event('message',{data:{type:'ACTIVATE_UPDATE'}});assert.equal(activated,1);
const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'));assert.equal(manifest.display,'fullscreen');assert.equal(new URL(manifest.scope,scope).href,scope);
for(const icon of manifest.icons){const data=await readFile(new URL(icon.src,root));assert.equal(data.toString('hex',0,8),'89504e470d0a1a0a');const size=Number(icon.sizes.split('x')[0]);assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);}
console.log(`PWA checks passed: ${downloaded} cached files, offline startup, version queries, scoped cache cleanup, controlled updates and install icons.`);
