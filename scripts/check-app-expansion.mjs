import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {catalog} from '../server/catalog.mjs';
import {resourceImage} from '../src/resource-images.ts';
import {queryDiscovery,discoveryByIds} from '../server/discovery-search.mjs';
import {downloadDraft,validDownloadLinks,storedDownloadLinks,downloadTitle,DOWNLOAD_TAG} from '../src/download-links.mjs';
import {queryDownloads} from '../server/downloads.mjs';
import {publicRows,publicRpc} from '../server/published.mjs';
import {CatalogInputError} from '../server/discovery-query-key.mjs';
const read=path=>fs.readFile('public'+path,'utf8').then(JSON.parse),search=(q,params={})=>queryDiscovery(new URLSearchParams({q,...params}),read);
test('10,000 additional application identities have related media and supported taxonomy',async()=>{
 const bytes=await fs.readFile('data/apps-expansion.json.gz'),extra=JSON.parse(gunzipSync(bytes)),base=JSON.parse(gunzipSync(await fs.readFile('data/discovery-seed.json.gz'))),report=JSON.parse(await fs.readFile('data/apps-expansion-release.json')),taxonomy=JSON.parse(await fs.readFile('data/taxonomy.json'));
 assert.equal(extra.entries.length,10000);assert.equal(report.added,10000);assert.equal(report.sha256,createHash('sha256').update(bytes).digest('hex'));
 const ids=new Set(base.entries.map(r=>r[0])),urls=new Set(base.entries.map(r=>r[2]));assert.equal(new Set(extra.entries.map(r=>r[0])).size,10000);assert.equal(new Set(extra.entries.map(r=>r[2])).size,10000);
 for(const row of extra.entries){assert.ok(!ids.has(row[0])&&!urls.has(row[2]));assert.ok(taxonomy.some(c=>c.name===row[3]&&c.subcategories.includes(row[4])),row[1]);assert.match(row[8].image_url,/^https:\/\//);assert.match(row[8].source_url,/^https:\/\//);assert.ok(row[8].platforms.length);assert.ok(extra.sources[row[6]]);assert.ok(!/illustrations|unsplash|picsum/.test(row[8].image_url));}
 assert.ok(extra.entries.filter(r=>r[5]==='Game').length>100);assert.ok(extra.entries.filter(r=>r[3]==='Cybersecurity').length>=200);
 for(const platform of ['Android','Linux','iOS']){const entry=extra.entries.find(r=>r[8].platforms.includes(platform));if(!entry)continue;const result=await search('',{ids:entry[0],platform});assert.equal(result.resources[0]?.id,entry[0]);assert.equal(result.resources[0]?.image_url,entry[8].image_url);}
 const selected=await discoveryByIds(extra.entries.slice(0,24).map(r=>r[0]),read);assert.equal(selected.length,24);assert.ok(selected.every(r=>r.pricing==='Check terms'&&!r.editorial.source_verified_at));
});
test('actual publisher media replaces game illustrations and unknown images have an honest fallback',()=>{
 for(const name of ['Free Fire','PUBG MOBILE','Grand Theft Auto V','Grand Theft Auto VI']){const image=resourceImage(catalog.find(r=>r.name===name));assert.match(image.src,/^https:\/\//);assert.ok(!/illustration|picsum|unsplash/.test(image.src));assert.match(image.alt,new RegExp(name));}
 assert.match(resourceImage({name:'Whisper',url:'https://huggingface.co/openai/whisper-large-v3'}).src,/\/models\/openai\/whisper-large-v3\.png$/);
 assert.match(resourceImage({name:'Nmap',url:'https://github.com/nmap/nmap'}).src,/githubassets\.com\/1\/nmap\/nmap$/);
 assert.equal(resourceImage({name:'Unknown app',url:'https://a-provider.org/'}).src,null);
});
test('an approved published image overrides the packaged publisher preview',()=>{const row=catalog.find(r=>r.name==='ComfyUI');assert.equal(resourceImage({...row,status:'published',image_url:'https://images.example/app.webp',image_alt:'Updated application screenshot'}).src,'https://images.example/app.webp');});
test('security aliases and GTA VI searches find their intended resources',async()=>{for(const q of ['ethical hacking','pentesting','cyber security'])assert.ok((await search(q)).total>200,q);assert.equal((await search('gta6')).resources[0]?.name,'Grand Theft Auto VI');});
test('download drafts preserve mirrors, validation and existing saved-revision review fields',async()=>{
 const record=await downloadDraft({title:'Linux lab notes',description:'A collection of original Linux lab notes and practice worksheets.',links:['https://drive.google.com/file/d/notes/view','https://www.mediafire.com/file/notes/archive.zip/file','https://drive.google.com/file/d/notes/view'],platforms:['Linux'],source_verified_at:'2026-11-14'});
 assert.equal(record.publication,'draft');assert.ok(record.tags.includes(DOWNLOAD_TAG));assert.equal(downloadTitle(record),'Linux lab notes');assert.equal(record.source_urls.length,2);assert.ok(record.short_summary.length>=60);assert.ok(record.editorial_description.length>=180);assert.ok(record.access_limits.length>=30);assert.equal(record.source_verified_at,'2026-11-14T00:00:00.000Z');assert.deepEqual(validDownloadLinks(record.source_urls).map(x=>x.provider),['Google Drive','MediaFire']);
 for(const url of ['javascript:alert(1)','http://mediafire.com/file/x','https://127.0.0.1/file','https://user:pass@drive.google.com/x','https://192.168.0.1/file'])assert.throws(()=>validDownloadLinks([url]));
 assert.equal(storedDownloadLinks(['broken',record.source_urls[0],record.source_urls[0]]).length,1);await assert.rejects(downloadDraft({title:'x',description:'short',links:record.source_urls}));
});
test('public download queries select tagged published records and bound pagination',async()=>{
 let requested;const result=await queryDownloads(new URLSearchParams({q:'notes,*.()%','page':'2'}),async url=>{requested=new URL(url);return Response.json([{id:'r_notes',display_name:'Download: Linux notes',canonical_url:'https://drive.google.com/file/d/notes/view',source_urls:['https://www.mediafire.com/file/notes/file'],short_summary:'Original notes'}]);});
 assert.equal(requested.searchParams.get('publication'),'eq.published');assert.equal(requested.searchParams.get('tags'),'cs.{"atlas-download"}');assert.equal(requested.searchParams.get('offset'),'24');assert.equal(requested.searchParams.get('limit'),'25');assert.equal(requested.searchParams.get('or'),'(display_name.ilike.*notes*,short_summary.ilike.*notes*)');assert.equal(result.resources[0].title,'Linux notes');assert.equal(result.resources[0].download_links.length,2);assert.equal(result.hasMore,false);await assert.rejects(queryDownloads(new URLSearchParams({page:'-1'})),CatalogInputError);
});

test('public data adapters use Worker-supported redirect handling and never follow redirects',async()=>{
 for(const invoke of [f=>publicRows('resources',{select:'id'},f),f=>publicRpc('catalog_stats',{},f)]){let calls=0;await assert.rejects(invoke(async(url,options)=>{calls++;assert.equal(options.redirect,'manual');return new Response('',{status:302,headers:{Location:'https://another-host.org/'}});}));assert.equal(calls,1);}
});
