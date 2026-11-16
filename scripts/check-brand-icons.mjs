import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PUBLIC_ASSET_FILES,isPublicAsset} from '../server/public-assets.mjs';
import {createRuntime} from '../server/runtime.mjs';

test('favicon and installation icons are real images copied into the deployed output',async()=>{
 const html=await fs.readFile('index.html','utf8'),routes=JSON.parse(await fs.readFile('dist/pages/_routes.json','utf8'));
 for(const file of PUBLIC_ASSET_FILES){assert.ok(isPublicAsset('/'+file));assert.deepEqual(await fs.readFile('dist/pages/'+file),await fs.readFile('public/'+file));assert.ok(routes.exclude.includes('/'+file));}
 const ico=await fs.readFile('dist/pages/favicon.ico');assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);const count=ico.readUInt16LE(4);assert.equal(count,5);
 const sizes=[];for(let i=0;i<count;i++){const at=6+i*16,size=ico[at]||256;assert.equal(size,ico[at+1]||256);assert.ok(ico.readUInt32LE(at+12)+ico.readUInt32LE(at+8)<=ico.length);sizes.push(size);}
 assert.deepEqual(sizes,[16,32,48,64,96]);
 for(const size of [96,180,192]){const file=await fs.readFile('dist/pages/brand/favicon-'+size+'.png');assert.equal(file.subarray(1,4).toString(),'PNG');assert.equal(file.readUInt32BE(16),size);assert.equal(file.readUInt32BE(20),size);}
 assert.ok(html.includes('type="image/png" sizes="96x96" href="/brand/favicon-96.png"'));assert.ok(html.includes('rel="apple-touch-icon"'));assert.ok(html.includes('rel="manifest"'));
 const manifest=JSON.parse(await fs.readFile('dist/pages/site.webmanifest','utf8'));for(const icon of manifest.icons){assert.ok(icon.src.startsWith('/brand/'));assert.ok((await fs.stat('dist/pages'+icon.src)).size>0);}
});
test('HTTP and www aliases permanently redirect directly to the canonical HTTPS host',async()=>{
 const runtime=createRuntime({template:'',render:async()=>{throw Error('Alias must not render duplicate content');}});
 for(const from of ['http://freeresourceatlas.com/','http://www.freeresourceatlas.com/','https://www.freeresourceatlas.com/']){
  const url=new URL('/guides/mit-free-courses?q=example',from),r=await runtime(new Request(url),{ATLAS_MODE:'public-discovery'});
  assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'https://freeresourceatlas.com/guides/mit-free-courses?q=example');
 }
});
