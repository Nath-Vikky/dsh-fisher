import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { verifyContent } from '../src/game/content-check.ts';
import { SPECIES,SPRITES,VARIANTS } from '../src/game/content.ts';
import { GEAR_ART } from '../src/game/gear.ts';
import { BAIT_ART,DECOR_ART,GUEST_ART,PLAYER_ART,SCENE_ART,visualIllustrations } from '../src/game/visuals.ts';
import { thumbnailAsset } from '../src/game/art.ts';

const root=resolve(import.meta.dirname,'..'),directory=resolve(root,'assets/runtime');
verifyContent();
for(const entry of SPECIES) {
  for(const variant of entry.creature?VARIANTS:['original'] as const)assert.ok(SPRITES[entry.id][variant],`${entry.id}.${variant} is missing`);
  assert.equal(Object.keys(SPRITES[entry.id]).length,entry.creature?3:1);
}
assert.equal(Object.keys(GEAR_ART).length,14);assert.equal(Object.keys(BAIT_ART).length,8);assert.equal(Object.keys(DECOR_ART).length,24);
assert.equal(Object.keys(SCENE_ART).length,4);assert.equal(Object.keys(GUEST_ART).length,4);assert.equal(Object.keys(PLAYER_ART).length,5);
for(const outfits of Object.values(GUEST_ART))for(const outfit of ['base','alternate'] as const) {
  assert.ok(outfits[outfit].portrait&&outfits[outfit].chibi);assert.notEqual(outfits[outfit].portrait,outfits[outfit].chibi);
}
for(const frames of Object.values(PLAYER_ART))assert.equal(frames.length,2);
const illustrations=new Set([...Object.values(SPRITES).flatMap(Object.values),...Object.values(GEAR_ART),...visualIllustrations()]);
const files=new Set([...illustrations].flatMap(file=>[file,thumbnailAsset(file)]).concat(Object.values(SCENE_ART)));
const actual=await readdir(directory);assert.deepEqual(actual.sort(),[...files].sort(),'Runtime directory must contain exactly the referenced assets');
let total=0;
for(const file of files) {
  assert.match(file,/^[a-z0-9-]+\.webp$/);const bytes=await readFile(resolve(directory,file));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.length>100,`${file} is empty`);total+=bytes.length;
}
const entryGzip=gzipSync(await readFile(resolve(root,'lib/client.js'))).length;
const gameGzip=gzipSync(await readFile(resolve(root,'lib/game.js'))).length;
const coldFiles=[SCENE_ART.L01,...PLAYER_ART.idle];
const coldBytes=(await Promise.all(coldFiles.map(file=>readFile(resolve(directory,file))))).reduce((sum,bytes)=>sum+bytes.length,0);
assert.ok(entryGzip<=50*1024);assert.ok(gameGzip<=250*1024);assert.ok(coldBytes<=2*1024*1024);assert.ok(total<=24*1024*1024);
console.log(JSON.stringify({species:48,creatureLooks:108,guests:4,outfits:8,playerFrames:10,gear:14,baits:8,decor:24,scenes:4,runtimeFiles:files.size,runtimeBytes:total,entryGzip,gameGzip,coldSceneBytes:coldBytes},null,2));
