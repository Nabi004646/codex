import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {countryAvailability,filterCountryRows,COUNTRIES} from '../src/country-availability.mjs';
import {discoveryKey,CatalogInputError} from '../server/discovery-query-key.mjs';
import {queryDiscovery} from '../server/discovery-search.mjs';
import {publishedOverrides,matchesPublicFilters} from '../server/catalog-overrides.mjs';
import {saveAndReadResource,findAdminRecord,publicationIssues,discoveryDraft,confirmPublicResource} from '../src/admin-record-sync.mjs';
import {catalog} from '../server/catalog.mjs';
const read=p=>fs.readFile('public'+p,'utf8').then(JSON.parse);
const query=p=>queryDiscovery(new URLSearchParams(p),read);

test('country filters keep unknowns honest and use exact provider evidence',async()=>{
 assert.ok(COUNTRIES.some(([code])=>code==='NP'));assert.ok(COUNTRIES.some(([code])=>code==='IN'));
 const spotify=catalog.find(r=>r.name==='Spotify'),fire=catalog.find(r=>r.name==='Free Fire'),other={url:'https://github.com/someone/spotify'};
 assert.equal(countryAvailability(spotify,'CA').status,'available');assert.equal(countryAvailability(spotify,'CN').status,'unavailable');assert.equal(countryAvailability(fire,'IN').status,'unavailable');assert.equal(countryAvailability(fire,'CA').status,'unknown');assert.equal(countryAvailability(other,'CA').status,'unknown');
 assert.deepEqual(filterCountryRows([spotify,other],'CA','confirmed'),[spotify]);
 const ca=await query({country:'CA',availability:'confirmed'});assert.deepEqual(ca.resources.map(r=>r.name),['Spotify']);assert.equal(ca.total,1);assert.equal(ca.countrySummary.confirmed,1);assert.ok(ca.countrySummary.unchecked>200000);
 const india=await query({q:'freefire',country:'IN'}),world=await query({q:'freefire'});assert.ok(!india.resources.some(r=>r.name==='Free Fire'));assert.equal(india.countrySummary.excluded,1);assert.match(india.countrySummary.restrictions[0].source,/garena.com/);assert.equal(india.total,world.total-1);
 const worldwide=await query({q:'apps'}),canada=await query({q:'apps',country:'CA'});assert.equal(canada.total,worldwide.total);assert.equal(canada.countryAvailability,'filtered');
});
test('country and strict mode cannot reuse a worldwide snapshot',()=>{
 const key=p=>discoveryKey(new URLSearchParams(p));assert.equal(key({q:'apps',availability:'include-unknown'}),key({q:'apps'}));assert.notEqual(key({q:'apps',country:'CA'}),key({q:'apps'}));assert.notEqual(key({country:'CA',availability:'confirmed'}),key({country:'CA'}));assert.throws(()=>key({country:'invalid'}),CatalogInputError);assert.throws(()=>key({availability:'pretend'}),CatalogInputError);
});
test('saving reads back a newer database revision and detects false success',async()=>{
 let saved,calls=[];const value={name:'A useful app',url:'https://an-app.example/',description:'Useful application description with original details.',category:'Developer Tools'};
 const call=async(action,payload)=>{calls.push(action);if(action==='save'){saved={...payload.record,revision:2,publication:'draft'};return {saved:true};}return {items:[saved]};};
 const row=await saveAndReadResource(call,value,1);assert.equal(row.revision,2);assert.deepEqual(calls,['save','list']);
 await assert.rejects(saveAndReadResource(async(action,payload)=>action==='save'?{saved:true}:{items:[{...saved,short_summary:'stale value'}]},value,1),/could not be confirmed/);
 let attempts=0;await assert.rejects(saveAndReadResource(async()=>{attempts++;throw Error('connection failed');},value));assert.equal(attempts,1);
 const renamed=await findAdminRecord(async(action,payload)=>{assert.equal(payload.query,'');assert.equal(payload.after,row.id.slice(0,-1));return {items:[{...row,display_name:'Renamed'}]};},row);assert.equal(renamed.display_name,'Renamed');
});
test('publication feedback covers the service requirements and confirmation uses fresh public data',async()=>{
 const incomplete=discoveryDraft(catalog.find(r=>r.name==='Spotify'));assert.ok(publicationIssues(incomplete).length>0);
 const valid={...incomplete,pricing_model:'free_forever',short_summary:'s'.repeat(60),editorial_description:'d'.repeat(180),access_limits:'a'.repeat(30),source_verified_at:new Date().toISOString(),source_urls:['https://a.example/']};assert.deepEqual(publicationIssues(valid),[]);
 const resource={id:'r_test',status:'published'};const result=await confirmPublicResource(resource.id,async(url,options)=>{assert.equal(options.cache,'no-store');return Response.json({resource});});assert.deepEqual(result,resource);await assert.rejects(confirmPublicResource(resource.id,async()=>Response.json({resource:{...resource,record:{revision:2}}}),{revision:2}),/public revision/);
 await assert.rejects(confirmPublicResource('r_test',async()=>new Response('',{status:404})),/public visibility/);
});
test('public overrides read only published IDs, keep credentials private and respect filters',async()=>{
 let requested;const result=await publishedOverrides(new URLSearchParams({ids:'r_1,r_1,invalid%id'}),async(url,options)=>{requested=new URL(url);assert.equal(options.cache,'no-store');assert.ok(!options.headers.Authorization);return Response.json([{id:'r_1',display_name:'Updated app',canonical_url:'https://app.example/',category_id:'developer-tools',short_summary:'Current description',pricing_model:'free_forever'}]);});
 assert.equal(requested.searchParams.get('publication'),'eq.published');assert.equal(requested.searchParams.get('id'),'in.(r_1)');assert.equal(result.resources[0].name,'Updated app');assert.equal(matchesPublicFilters(result.resources[0],new URLSearchParams({pricing:'Paid'})),false);
 assert.equal(matchesPublicFilters(result.resources[0],new URLSearchParams({country:'CA',availability:'confirmed'})),false);assert.equal(matchesPublicFilters(result.resources[0],new URLSearchParams({country:'CA'})),true);
});
test('published edits take priority over packaged resource details on the public domain',async()=>{
 const {render}=await import('../.atlas-ssr/entry-server.js');const original=catalog[0],title='A confirmed published edit';
 const result=await render('/resource/'+original.id,{publicDiscovery:true,fetcher:async(url,options)=>{assert.match(String(url),/\/rest\/v1\/resources/);return Response.json([{id:original.id,display_name:title,canonical_url:original.url,short_summary:'Current public description',editorial_description:'Updated practical details',category_id:'ai-and-machine-learning',pricing_model:'open_source',source_urls:[original.url],platforms:['Linux']}]);}});
 assert.ok(result.html.includes(title));assert.equal(JSON.parse(result.state).liveResource.name,title);
});
