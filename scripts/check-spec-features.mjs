import templateDrafts from '../data/template-drafts.json' with {type:'json'};
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {initialUiPreference,UI_LANGUAGES,PLANNED_UI_LANGUAGES} from '../src/locale-config.mjs';
import {toolkitData,mergeToolkits,toolkitLink,sharedToolkit} from '../source-baseline/nepocore-library/lib/browser-collections.ts';
import {toolkitCsv,parseToolkitCsv} from '../src/toolkit-portability.mjs';
import {normalizeWorkflow,saveWorkflow,workflowLink,sharedWorkflow,planningCsv} from '../src/workflow-data.mjs';
import {parseSearchConsoleCsv} from '../src/search-console-csv.mjs';
import {publicApprovals,publicApproval,publicInventory} from '../server/public-approvals.mjs';
import {widgetResponse} from '../server/widgets.mjs';
import {createRuntime} from '../server/runtime.mjs';
import {queryDiscovery} from '../server/discovery-search.mjs';
import {taskQuery,taskResult} from '../server/finder.mjs';
import {catalog} from '../server/catalog.mjs';
import {storeLink} from '../src/model.mjs';
import stores from '../data/mobile-store-links.json' with {type:'json'};
import manifest from '../data/discovery-manifest.json' with {type:'json'};
const read=p=>fs.readFile('public'+p,'utf8').then(JSON.parse);
test('India suggestions retain English until an explicit choice and respect saved choices',()=>{
 assert.deepEqual(initialUiPreference({country:'IN',languages:['en-IN']}),{locale:'en',suggested:'hi'});
 for(const selected of ['en','hi','fr'])assert.deepEqual(initialUiPreference({country:'IN',languages:['en-IN'],saved:selected}),{locale:selected,suggested:null});
 assert.deepEqual(initialUiPreference({country:'IN',languages:['hi-IN'],cookie:'atlas-ui=en'}),{locale:'en',suggested:null});
 assert.deepEqual(initialUiPreference({country:'IN',languages:['hi-IN'],dismissed:true}),{locale:'en',suggested:null});
 assert.equal(UI_LANGUAGES.length+PLANNED_UI_LANGUAGES.length,16);
});
test('toolkit notes and order survive exports without leaking notes into share links',()=>{
 const folders=toolkitData([{id:'my-kit',name:'Study, notes',resourceIds:['b','a'],note:'Folder note',resourceNotes:{b:'Line one\n"line two"',a:'private'},updatedAt:'2026-11-15'}]);
 const roundTrip=parseToolkitCsv(toolkitCsv(folders));assert.deepEqual(roundTrip[0].resourceIds,['b','a']);assert.equal(roundTrip[0].resourceNotes.b,'Line one\n"line two"');assert.equal(roundTrip[0].note,'Folder note');
 const merged=mergeToolkits(folders,toolkitData([{id:'my-kit',name:'Other',resourceIds:['a','c'],resourceNotes:{a:'incoming',c:'new'},updatedAt:'2026-11-15'}]));assert.equal(merged[0].resourceNotes.a,'private');assert.equal(merged[0].resourceNotes.c,'new');
 const shared=sharedToolkit(toolkitLink(folders[0],'https://freeresourceatlas.com').split('kit=')[1]);assert.equal(shared.name,'Study, notes');assert.equal(shared.note,undefined);assert.equal(shared.resourceNotes,undefined);
 const unsafe=toolkitCsv([{...folders[0],name:'=CMD()',resourceNotes:{a:' =SUM(1,2)'}}]);assert.ok(unsafe.includes('"\'=CMD()"'));assert.ok(unsafe.includes('"\' =SUM(1,2)"'));
 assert.throws(()=>parseToolkitCsv('folder_id,folder_name\nx,y'));assert.throws(()=>parseToolkitCsv('"unfinished'));
 assert.throws(()=>toolkitData([{...folders[0],resourceNotes:{a:'x'.repeat(1001)}}]));
});
test('saved ordering applies before pagination and free candidate groups never include paid or unknown offers',async()=>{
 const ids=catalog.slice(0,30).map(r=>r.id).reverse();const result=await queryDiscovery(new URLSearchParams({ids:ids.join(','),sort:'saved'}),read);assert.deepEqual(result.resources.map(r=>r.id),ids.slice(0,24));
 const second=await queryDiscovery(new URLSearchParams({ids:ids.join(','),sort:'saved',page:'2'}),read);assert.deepEqual(second.resources.map(r=>r.id),ids.slice(24));
 const free=await queryDiscovery(new URLSearchParams({pricingGroup:'free'}),read);assert.ok(free.resources.length);assert.ok(free.resources.every(r=>['Free','Open source','Free plan'].includes(r.pricing)));
});
test('workflow exports preserve private notes locally and exclude them from share links',()=>{
 const w={version:1,id:'plan-1',title:'नेपाली plan',goal:'A small result',steps:[{id:'step-1',title:'Prepare',resourceId:'r_example',output:'A draft',notes:'PRIVATE NOTE'}],updatedAt:'2026-11-15'};
 const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 saveWorkflow(w,storage);assert.ok(memory.get('atlas-workflows').includes('PRIVATE NOTE'));
 const shared=sharedWorkflow(workflowLink(w,'https://freeresourceatlas.com').split('plan=')[1]);assert.equal(shared.title,w.title);assert.equal(shared.steps[0].notes,'');
 assert.throws(()=>normalizeWorkflow({...w,id:undefined}));assert.throws(()=>normalizeWorkflow({...w,title:''}));assert.throws(()=>normalizeWorkflow({...w,steps:Array(11).fill(w.steps[0])}));
 assert.throws(()=>sharedWorkflow('not-base64!'));assert.ok(planningCsv({...w,steps:[{...w.steps[0],notes:'=SUM(A1)'}]}).includes('"\'=SUM(A1)"'));
});
test('Search Console import reports only valid supplied data with explicit manual-source provenance',()=>{
 const report=parseSearchConsoleCsv('Top queries,Clicks,Impressions,CTR,Position\n"free, tools",2,100,2%,8.5\nbad,50,2,2500%,1\n"<script>alert(1)</script>",1,10,10%,4\n');
 assert.equal(report.rows.length,2);assert.equal(report.invalidRows,1);assert.equal(report.clicks,3);assert.equal(report.impressions,110);assert.equal(report.rows[0].label,'free, tools');assert.match(report.source,/Manual/);
 assert.throws(()=>parseSearchConsoleCsv('foo,bar\n1,2'));assert.throws(()=>parseSearchConsoleCsv('Query,Clicks,Impressions\nbad,=formula,99'));
});
test('store buttons use 28 observed official stores and retain provider-dependent availability',()=>{
 assert.equal(Object.keys(stores).length,14);let count=0;for(const [name,entry]of Object.entries(stores)){const resource=catalog.find(r=>r.name===name);assert.ok(resource);for(const p of ['android','ios'])if(entry[p]){count++;assert.equal(storeLink(p,resource.mobile[p].url).url,storeLink(p,entry[p].url).url);assert.ok(entry[p].evidence_url.startsWith('https://'));assert.ok(resource.mobile[p].verified_at);}}assert.equal(count,28);
});
test('country-aware task parsing separates documented matches from community access claims',()=>{
 const params=taskQuery('I need free video editing on Linux without an account',{country:'IN'});assert.equal(params.get('country'),'IN');assert.equal(params.get('platform'),'Linux');assert.equal(params.get('reviewed'),'1');assert.equal(params.get('pricingGroup'),'free');
 const community=taskQuery('PDF reader for iPhone',{country:'US',includeCommunity:true});assert.equal(community.get('platform'),'iOS');assert.equal(community.has('reviewed'),false);
 assert.throws(()=>taskQuery('x'));assert.throws(()=>taskQuery('video editing',{country:'invalid'}));
 const result=taskResult(params,{resources:[{id:'x',name:'Paid',pricing:'Paid'}],pages:1});assert.equal(result.matches.length,0);assert.match(result.availability,/not been reviewed/);
});
test('widgets are lightweight, isolated public HTML and reject inherited names',async()=>{
 const response=widgetResponse('design');assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('FreeResourceAtlas'));assert.ok(html.includes('GIMP'));assert.ok(!html.includes('<script'));assert.ok(!html.includes('nepocore-saved'));assert.ok(html.length<15000);assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors \*/);
 for(const name of ['__proto__','constructor','not-a-topic'])assert.equal(widgetResponse(name).status,404);
});
test('public approval inventory is narrow, English-only and never equated with Google indexing',()=>{
 assert.equal(publicApprovals.length,61);assert.equal(publicInventory().google_indexed,null);
 assert.ok(publicApproval('/'));for(const path of ['/?q=games','/search','/templates','/admin','/resource/'+catalog[0].id,'/toolkits','/planner'])assert.equal(publicApproval(path),null);
 assert.equal(publicApproval('/','hi'),null);assert.equal(publicApproval('https://another-site.org/'),null);
 assert.ok(publicApprovals.every(p=>p.evidence.length&&p.publication==='published'));
});
test('canonical-domain launch preserves discovery and partitions cached language hints by country',async()=>{
 const {render}=await import('../.atlas-ssr/entry-server.js'),template=await fs.readFile('index.html','utf8'),memory=new Map(),waits=[];
 const cache={match:async k=>memory.get(k.url)?.clone(),put:async(k,r)=>{memory.set(k.url,r.clone());}};
 const runtime=createRuntime({render,template,cache,fetcher:async()=>Response.json([])});
 const env={ATLAS_MODE:'public-discovery',ATLAS_CATALOG:'discovery',ASSETS:{fetch:async request=>new Response(await fs.readFile('public'+new URL(request.url).pathname),{headers:{'Content-Type':'application/json'}})}},ctx={waitUntil:p=>waits.push(p)};
 const request=(path,country='US',headers={})=>{const r=new Request('https://freeresourceatlas.com'+path,{headers});Object.defineProperty(r,'cf',{value:{country}});return r;};
 for(const country of ['IN','US','IN']){const response=await runtime(request('/',country),env,ctx),html=await response.text();assert.equal(response.status,200);assert.equal(response.headers.get('X-Robots-Tag'),'index,follow');assert.match(html,/<html lang="en"/);assert.ok(html.includes('"countryHint":"'+country+'"'));assert.ok(html.includes(manifest.total.toLocaleString('en')));}
 await Promise.all(waits);assert.equal(memory.size,2);
 const hindi=await runtime(request('/','IN',{Cookie:'atlas-ui=hi'}),env,ctx);assert.match(hindi.headers.get('X-Robots-Tag'),/noindex/);assert.match(await hindi.text(),/<html lang="hi"/);
 const sitemap=await(await runtime(request('/sitemap.xml'),env,ctx)).text();assert.match(sitemap,/pages_en_0.xml/);
 const child=await(await runtime(request('/sitemaps/pages_en_0.xml'),env,ctx)).text();assert.equal((child.match(/<url>/g)||[]).length,61);assert.ok(!child.includes('/resource/'));assert.ok(child.includes('/templates/quick/'));assert.ok(templateDrafts.every(t=>!child.includes('/templates/'+t.slug+'</loc>')));
 const preview=await runtime(new Request('https://preview.pages.dev/'),env,ctx);assert.match(preview.headers.get('X-Robots-Tag'),/noindex/);
 const drafts=await runtime(request('/api/template-draft-download?id=1&format=pdf'),env,ctx);assert.equal(drafts.status,404);
});
