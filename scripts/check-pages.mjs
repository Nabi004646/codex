import manifest from '../data/discovery-manifest.json' with {type:'json'};
import fs from 'node:fs';
import assert from 'node:assert/strict';
import templates from '../data/template-drafts.json' with {type:'json'};
const originalFetch=globalThis.fetch;
const calls=[],assetReads=[];
globalThis.fetch=async(raw,options={})=>{
 const url=new URL(raw);calls.push(url.pathname);assert.notEqual(options.redirect,'error','Cloudflare does not implement the error redirect mode');
 if(url.pathname.endsWith('/rest/v1/resources')&&url.searchParams.get('tags')==='cs.{"atlas-download"}')return Response.json([]);
 if(url.pathname.endsWith('/rpc/catalog_stats'))return Response.json({total:0,categories:[],revision:'empty'});
 if(url.pathname.endsWith('/rpc/resource_search_v2'))return Response.json({items:[],has_more:false,next_cursor:null});
 throw Error('Unexpected provider request during isolated Pages check.');
};
try{
 const {default:worker}=await import('../dist/pages/_worker.js');
 const env={ATLAS_MODE:'staging',ASSETS:{fetch:async request=>{const pathname=new URL(request.url).pathname;assetReads.push(pathname);if(pathname.startsWith('/catalog/'))return new Response(fs.readFileSync('dist/pages'+pathname),{headers:{'Content-Type':'application/json'}});return new Response('asset fixture',{headers:{'Content-Type':'image/webp'}});}}};
 const request=(path,init)=>new Request('https://atlas-preview.pages.dev'+path,init);
 const home=await worker.fetch(request('/'),env);assert.equal(home.status,200);assert.match(home.headers.get('X-Robots-Tag'),/noindex/);const html=await home.text();assert.match(html,/Free Resources/);assert.match(html,/nonce="[a-f0-9]+"/);assert.ok(!html.includes('/src/main.tsx'));
 for(const kind of ['AI model','Dataset','AI demo','Game','Desktop software']){const response=await worker.fetch(request('/api/resources?'+new URLSearchParams({kind})),env);assert.equal(response.status,200);const result=await response.json();assert.ok(result.total>0);assert.ok(result.resources.every(r=>r.kind===kind));assert.ok(html.includes('value=\"'+kind+'\"'));}
 for(const [q,name,price]of [['freefire','Free Fire','Free'],['PUG','PUBG MOBILE','Free'],['GTA','Grand Theft Auto V','Paid']]){const response=await worker.fetch(request('/api/resources?'+new URLSearchParams({q})),env);assert.equal(response.status,200);const result=await response.json();assert.equal(result.resources[0].name,name);assert.equal(result.resources[0].pricing,price);}
 for(const [path,title]of [['/downloads','Downloads, with the details.'],['/games/gta-6','Grand Theft Auto VI']]){const response=await worker.fetch(request(path),env);assert.equal(response.status,200);const body=await response.text();assert.ok(body.includes(title));assert.ok(body.includes('<h1>'));if(path==='/games/gta-6'){assert.ok(body.includes('rockstargames.com/VI/'));assert.ok(body.includes('A PC release date is not listed'));assert.ok(!body.includes('GTA 6 PC download'));}}
 const downloads=await worker.fetch(request('/api/downloads'),env);assert.equal(downloads.status,200);assert.deepEqual((await downloads.json()).resources,[]);assert.equal((await worker.fetch(request('/api/downloads?page=-1'),env)).status,400);
 const freeGames=await(await worker.fetch(request('/api/resources?q=free+games'),env)).json();assert.ok(freeGames.total>0);assert.ok(freeGames.resources.every(r=>r.kind==='Game'&&r.pricing!=='Paid'));
 const search=await worker.fetch(request('/api/resources?q=Shotcut'),env);assert.equal(search.status,200);assert.equal((await search.json()).resources[0].name,'Shotcut');const seo=await worker.fetch(request('/api/resources?q=SEO'),env);assert.ok((await seo.json()).total>=20);const custom=await worker.fetch(request('/api/resources?q=changepoint'),env);assert.equal(custom.status,409);assert.equal((await custom.json()).clientRequired,true);const invalid=await worker.fetch(request('/api/resources?q='+ 'x'.repeat(161)),env);assert.equal(invalid.status,400);assert.ok(!assetReads.some(path=>/\/(terms-|records-|ids-|filters\.json)/.test(path)),'Cloudflare requests must use compact prepared snapshots, not the browser search index');
 const apps=await worker.fetch(request('/api/resources?q=apps&country=US'),env);assert.equal(apps.status,200);const appRows=await apps.json();assert.ok(appRows.total>0);assert.equal(appRows.countryAvailability,'unverified');
 const appsPage=await(await worker.fetch(request('/search?q=apps&country=US'),env)).text();assert.ok(!appsPage.includes('Published entries are temporarily unavailable'));assert.ok(appsPage.includes('Matching resources are shown worldwide.'));assert.ok(appsPage.includes('Results: '+appRows.total.toLocaleString('en')));assert.ok(!appsPage.includes('atlas-language-settings'));
 const quick=await worker.fetch(request('/templates/quick/weekly-study-plan'),env);assert.equal(quick.status,200);const quickHtml=await quick.text();assert.ok(quickHtml.includes('<h1>Weekly study plan</h1>'));assert.ok(quickHtml.includes('Download HTML'));assert.ok(quickHtml.includes('Live preview'));assert.ok(quickHtml.includes('sandbox="allow-same-origin allow-modals"'));assert.ok(quickHtml.includes('<title>Weekly study plan | FreeResourceAtlas</title>'));
 const templatesPage=await(await worker.fetch(request('/templates'),env)).text();assert.ok(templatesPage.includes('12 templates you can use right now.'));assert.ok(templatesPage.includes('/templates/quick/meeting-actions'));
 const listing=await worker.fetch(request('/api/templates?q=Inventory'),env);assert.equal(listing.status,200);assert.equal((await listing.json()).total,3);
 const detail=await worker.fetch(request('/templates/'+templates[0].slug),env);assert.equal(detail.status,200);const body=await detail.text();assert.ok(body.includes('Downloads will open after file review'));assert.ok(!body.includes('href="/api/template-draft-download'));
 const live=await worker.fetch(request('/api/live/resources?q=SEO'),env);assert.equal(live.status,200);assert.deepEqual((await live.json()).resources,[]);assert.ok(calls.includes('/rest/v1/rpc/resource_search_v2'));
 const state=JSON.parse(html.match(/window\.__ATLAS_PAGE__=(.*?);<\/script>/s)[1]);assert.ok(state.hosted);assert.equal(state.result.totalCatalog,manifest.total);assert.equal(state.catalogMode,'discovery');assert.ok(html.includes(manifest.total.toLocaleString('en')));assert.ok(html.includes('Library features'));
 const spanish=await worker.fetch(request('/',{headers:{Cookie:'atlas-ui=es'}}),env);const esHtml=await spanish.text();assert.match(esHtml,/<html lang="es" dir="ltr">/);assert.ok(esHtml.includes('Recursos gratuitos'));assert.ok(esHtml.includes('Las descripciones de los recursos'));assert.equal(spanish.headers.get('Cache-Control'),'private, no-store');
 const arabic=await(await worker.fetch(request('/?ui=ar'),env)).text();assert.match(arabic,/<html lang="ar" dir="rtl">/);assert.ok(arabic.includes('العربية'));
 const defaultEnglish=await(await worker.fetch(request('/',{headers:{'Accept-Language':'ar'}}),env)).text();assert.match(defaultEnglish,/<html lang="en" dir="ltr">/);
 const guide=await(await worker.fetch(request('/low-spec-tools',{headers:{Cookie:'atlas-ui=ne'}}),env)).text();assert.ok(guide.includes('तपाईंका टुलकिटहरू'));assert.ok(guide.includes('lang="en" dir="ltr"'));
 assert.ok(!html.includes('staging-notice'));assert.ok(!html.includes('Indexing report'));assert.ok(!html.includes('/preview/live'));assert.ok(!html.includes('/preview/seo'));
 for(const path of ['/preview/seo','/preview/live','/es/resources/untranslated'])assert.equal((await worker.fetch(request(path),env)).status,404);
 const admin=await worker.fetch(request('/admin'),env);assert.equal(admin.status,200);assert.equal(admin.headers.get('Cache-Control'),'private, no-store');assert.match(admin.headers.get('X-Robots-Tag'),/noindex/);const adminHtml=await admin.text();assert.ok(adminHtml.includes('Loading secure sign-in'));assert.ok(!adminHtml.includes('data-msg='));assert.ok(!adminHtml.includes('Switched to client rendering'));assert.ok(!adminHtml.includes('renderToString'));
 assert.equal((await worker.fetch(request('/brand/favicon.ico'),env)).status,200);
 assert.equal((await worker.fetch(request('/_worker.js'),env)).status,404);
 assert.equal((await worker.fetch(request('/api/resources',{method:'POST'}),env)).status,405);
 const sitemap=await(await worker.fetch(request('/sitemap.xml'),env)).text();assert.ok(!sitemap.includes('<url>'));
 const routes=JSON.parse(fs.readFileSync('dist/pages/_routes.json'));assert.deepEqual(routes.include,['/*']);assert.ok(routes.exclude.includes('/assets/*'));assert.ok(!routes.exclude.includes('/admin'));
 fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/pages-validation.json',JSON.stringify({checked_at:new Date().toISOString(),scope:'actual compiled standalone Pages module; isolated read-only provider',passed:['SSR homepage and built assets','dynamic resource search','dynamic template filtering','hosted draft download buttons withheld','new hosted search RPC adapter','private uncached admin route','no Worker source exposure','staging noindex and empty sitemap','write requests denied'],public_cloudflare_deployment:'verified separately through the exact GitHub commit deployment check'},null,2)+'\n');
 console.log('PASS: standalone Cloudflare Pages frontend, live search adapter, template filtering, review gates and private admin headers.');
}finally{globalThis.fetch=originalFetch;}
// The web-target React bundle owns a MessageChannel; all assertions above are awaited.
process.exit(0);
