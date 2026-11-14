import assert from 'node:assert/strict';import fs from 'node:fs/promises';import crypto from 'node:crypto';import zlib from 'node:zlib';
import manifest from '../data/discovery-manifest.json' with {type:'json'};
import {queryDiscovery,discoveryByIds} from '../server/discovery-search.mjs';
import {discoverySnapshot} from '../server/discovery-snapshots.mjs';
import {isPublicLink,packPostings,unpackPostings} from '../server/discovery-codec.mjs';
import {normalizeOfficialUrl,normalizeResource} from '../src/admin-normalize.mjs';
import {discoveryKey,CatalogInputError} from '../server/discovery-query-key.mjs';
const read=path=>fs.readFile('public'+path,'utf8').then(JSON.parse),all=[];let totalBytes=0;
for(const f of manifest.files){const bytes=await fs.readFile('public'+manifest.root+'/'+f.name);assert.equal(bytes.length,f.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256);totalBytes+=bytes.length;}
for(let n=0;n<Math.ceil(manifest.total/manifest.record_size);n++)all.push(...await read(manifest.root+'/records-'+n+'.json'));
assert.equal(all.length,38237);assert.equal(new Set(all.map(r=>Array.isArray(r)?r[0]:r.id)).size,38237);assert.equal(all.filter(Array.isArray).length,38195);
for(const row of all)assert.ok(isPublicLink(Array.isArray(row)?row[2]:row.url));
assert.equal(all.some(row=>(Array.isArray(row)?row[0]:row.id)==='f054e3962c966564'),false);
assert.deepEqual(unpackPostings(packPostings([[0,12],[17,5],[38000,3]])),[[0,12],[17,5],[38000,3]]);
const report=[];
for(const q of ['','SEO','reels','earn money','AI','automation','finance','fitness','Shotcut']){const r=await queryDiscovery(new URLSearchParams({q}),read),snapshot=await discoverySnapshot(new URLSearchParams({q}),read);assert.ok(r.total>0);assert.equal(snapshot.total,r.total);assert.equal(snapshot.discoveryVersion,manifest.version);assert.equal(r.totalCatalog,38237);assert.equal(r.resources.length,Math.min(24,r.total));report.push({query:q,matches:r.total,first:r.resources[0].name});}
const page1=await queryDiscovery(new URLSearchParams(),read),page2=await queryDiscovery(new URLSearchParams({page:'2'}),read);assert.ok(page1.resources.every(a=>page2.resources.every(b=>a.id!==b.id)));
const reviewed=await queryDiscovery(new URLSearchParams({reviewed:'1'}),read);assert.equal(reviewed.total,20);assert.ok(reviewed.resources.every(r=>r.editorial.source_verified_at));
const unknown=await queryDiscovery(new URLSearchParams({pricing:'Check terms'}),read);assert.ok(unknown.resources.some(r=>r.discovery));assert.ok(unknown.resources.filter(r=>r.discovery).every(r=>r.pricing==='Check terms'&&!r.editorial.source_verified_at));
const found=await queryDiscovery(new URLSearchParams({q:'fastapi'}),read);assert.ok(found.total>0);assert.equal((await discoverySnapshot(new URLSearchParams({q:'fastapi'}),read)).clientRequired,true);
const typed=await queryDiscovery(new URLSearchParams({q:'shocut'}),read);assert.ok(typed.suggestions.includes('Shotcut'));
const subset=await discoveryByIds([page2.resources[0].id,page2.resources[1].id],read);assert.equal(subset.length,2);
const row=page2.resources.find(r=>r.discovery);assert.ok(row);const normalized=await normalizeResource({name:row.name,url:row.url,description:row.description,category:row.category,subcategory:row.subcategory,kind:row.kind,tags:row.tags,pricing_model:'unknown'});assert.equal(normalized.publication,'draft');assert.equal(normalized.pricing_model,'unknown');
const categoryRows=[];for(let page=1;page<=5;page++)categoryRows.push(...(await queryDiscovery(new URLSearchParams({category:'Developer Tools',page:String(page)}),read)).resources);
for(const r of categoryRows.slice(0,100)){const draft=await normalizeResource({name:r.name,url:r.url,description:r.description,category:r.category,subcategory:r.subcategory,kind:r.kind,tags:r.tags,pricing_model:'unknown'});assert.equal(draft.publication,'draft');assert.equal(draft.pricing_model,'unknown');}
assert.equal(new Set(categoryRows.slice(0,100).map(r=>r.url)).size,100);
assert.throws(()=>discoveryKey(new URLSearchParams({q:'x'.repeat(161)})),CatalogInputError);
assert.throws(()=>discoveryKey(new URLSearchParams('q=one&q=two')),CatalogInputError);
assert.equal(normalizeOfficialUrl('https://github.com/Owner/Repo/blob/main/MyGuide.md'),'https://github.com/owner/repo/blob/main/MyGuide.md');
assert.equal(normalizeOfficialUrl('https://books.example.org/#Chapter-2'),'https://books.example.org/#Chapter-2');
assert.equal(normalizeOfficialUrl('https://github.com/Owner/Repo.git'),'https://github.com/owner/repo');
const zero=await queryDiscovery(new URLSearchParams({country:'US'}),read);assert.equal(zero.total,0);
assert.equal((await read(manifest.root+'/'+manifest.snapshots['[]'])).total,38237);
await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/discovery-validation.json',JSON.stringify({count:38237,discovery_only:38195,editorial:42,source_checked:20,excluded:manifest.excluded,files:manifest.files.length,asset_bytes:totalBytes,example_queries:report,arbitrary_query:{query:'fastapi',matches:found.total},scope:'Actual catalog and generated snapshots; arbitrary queries execute in a browser worker, not in the Cloudflare request CPU budget. No hosted database import/publication or 90k verification claimed.'},null,2)+'\n');
console.log('PASS: 38,237 unique searchable listings; source/review labels, snapshots, arbitrary search, pagination, bookmarks/compare lookup, import URL preservation and draft-only normalization.');console.log(JSON.stringify(report));
