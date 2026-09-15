import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {DecodedCache} from '../src/client/decoded-cache.ts';
import {StaticAsset} from '../src/host/static-asset.ts';
import {VERSION} from '../src/protocol.ts';

test('decoded pixels are shared across scene leases, evicted by budget and never closed while in use',async()=>{
  let loads=0;const closed:string[]=[];
  const cache=new DecodedCache(async(file:string)=>{loads++;return file;},file=>closed.push(file),()=>4,8);
  const first=cache.acquire('player'),other=cache.acquire('player');await Promise.all([first.ready,other.ready]);assert.equal(loads,1);
  assert.equal(cache.peek('player'),'player');
  first.release();first.release();assert.deepEqual(closed,[]);other.release();
  const repeat=cache.acquire('player');assert.equal(repeat.cached,true);assert.equal(await repeat.ready,'player');assert.equal(loads,1);
  const b=cache.acquire('guest-a');await b.ready;b.release();const c=cache.acquire('guest-b');await c.ready;
  assert.deepEqual(closed,['guest-a']);assert.equal(cache.bytes,8);
  cache.clearIdle();assert.deepEqual(closed,['guest-a']);repeat.release();c.release();cache.clearIdle();assert.equal(cache.bytes,0);
  assert.deepEqual(closed.sort(),['guest-a','guest-b','player']);
});

test('closing during decode disposes late results; failed requests can retry',async()=>{
  let complete!:(value:string)=>void;const closed:string[]=[];
  const cache=new DecodedCache(async()=>new Promise<string>(resolve=>{complete=resolve;}),file=>closed.push(file),()=>4,8);
  const lease=cache.acquire('late');await Promise.resolve();lease.release();complete('late');await assert.rejects(lease.ready);assert.deepEqual(closed,['late']);
  let attempts=0;const retry=new DecodedCache(async()=>{if(++attempts===1)throw new Error('offline');return 'ready';},()=>{},()=>4,8);
  const failed=retry.acquire('file');await assert.rejects(failed.ready,/offline/);failed.release();
  const recovered=retry.acquire('file');assert.equal(await recovered.ready,'ready');recovered.release();retry.clearIdle();
});

test('idle decoded images expire without clearing active images',async()=>{
  const closed:string[]=[];const cache=new DecodedCache(async(file:string)=>file,file=>closed.push(file),()=>4,8,10);
  const idle=cache.acquire('idle'),active=cache.acquire('active');await Promise.all([idle.ready,active.ready]);idle.release();
  await new Promise(resolve=>setTimeout(resolve,30));assert.deepEqual(closed,['idle']);active.release();cache.clearIdle();assert.equal(cache.bytes,0);
});

test('static code uses gzip, negotiated caching and 304; WebP remains uncompressed',async()=>{
  const file=new URL('../README.md',import.meta.url),script=new StaticAsset(file,'text/javascript',true),picture=new StaticAsset(file,'image/webp');
  const server=createServer((request,response)=>{void (request.url?.startsWith('/image')?picture:script).send(request,response,()=>false);});server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
    const compressed=await fetch(`${base}/code?v=${VERSION}`,{headers:{'accept-encoding':'gzip'}});const text=await compressed.text();
    assert.equal(compressed.headers.get('content-encoding'),'gzip');assert.match(compressed.headers.get('cache-control')!,/immutable/);assert.equal(compressed.headers.get('vary'),'Accept-Encoding');
    const etag=compressed.headers.get('etag')!;assert.ok(Number(compressed.headers.get('content-length'))<Buffer.byteLength(text));
    const validated=await fetch(`${base}/code?v=${VERSION}`,{headers:{'if-none-match':etag}});assert.equal(validated.status,304);assert.equal(await validated.text(),'');
    const plain=await fetch(`${base}/code?v=old`,{headers:{'accept-encoding':'gzip;q=0, *;q=1'}});assert.equal(plain.headers.get('content-encoding'),null);assert.equal(plain.headers.get('cache-control'),'no-cache');assert.equal(await plain.text(),text);
    const image=await fetch(`${base}/image`,{headers:{'accept-encoding':'gzip'}});assert.equal(image.headers.get('content-encoding'),null);await image.arrayBuffer();
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
