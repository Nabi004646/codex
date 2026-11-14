import fs from 'node:fs';
import assert from 'node:assert/strict';
import templates from '../data/template-drafts.json' with {type:'json'};
const originalFetch=globalThis.fetch;
const calls=[],assetReads=[];
globalThis.fetch=async(raw,options={})=>{
 const url=new URL(raw);calls.push(url.pathname);
 if(url.pathname.endsWith('/rpc/catalog_stats'))return Response.json({total:0,categories:[],revision:'empty'});
 if(url.pathname.endsWith('/rpc/resource_search_v2'))return Response.json({items:[],has_more:false,next_cursor:null});
 throw Error('Unexpected provider request during isolated Pages check.');
};
try{
 const {default:worker}=await import('../dist/pages/_worker.js');
 const env={ATLAS_MODE:'staging',ASSETS:{fetch:async request=>{const pathname=new URL(request.url).pathname;assetReads.push(pathname);if(pathname.startsWith('/catalog/'))return new Response(fs.readFileSync('dist/pages'+pathname),{headers:{'Content-Type':'application/json'}});return new Response('asset fixture',{headers:{'Content-Type':'image/webp'}});}}};
 const request=(path,init)=>new Request('https://atlas-preview.pages.dev'+path,init);
 const home=await worker.fetch(request('/'),env);assert.equal(home.status,200);assert.match(home.headers.get('X-Robots-Tag'),/noindex/);const html=await home.text();assert.match(html,/Free Resources/);assert.match(html,/nonce="[a-f0-9]+"/);assert.ok(!html.includes('/src/main.tsx'));
 const search=await worker.fetch(request('/api/resources?q=Shotcut'),env);assert.equal(search.status,200);assert.equal((await search.json()).resources[0].name,'Shotcut');const seo=await worker.fetch(request('/api/resources?q=SEO'),env);assert.ok((await seo.json()).total>=20);const custom=await worker.fetch(request('/api/resources?q=changepoint'),env);assert.equal(custom.status,409);assert.equal((await custom.json()).clientRequired,true);const invalid=await worker.fetch(request('/api/resources?q='+ 'x'.repeat(161)),env);assert.equal(invalid.status,400);assert.ok(!assetReads.some(path=>/\/(terms-|records-|ids-|filters\.json)/.test(path)),'Cloudflare requests must use compact prepared snapshots, not the browser search index');
 const listing=await worker.fetch(request('/api/templates?q=Inventory'),env);assert.equal(listing.status,200);assert.equal((await listing.json()).total,3);
 const detail=await worker.fetch(request('/templates/'+templates[0].slug),env);assert.equal(detail.status,200);const body=await detail.text();assert.ok(body.includes('Downloads will open after file review'));assert.ok(!body.includes('href="/api/template-draft-download'));
 const live=await worker.fetch(request('/api/live/resources?q=SEO'),env);assert.equal(live.status,200);assert.deepEqual((await live.json()).resources,[]);assert.ok(calls.includes('/rest/v1/rpc/resource_search_v2'));
 const state=JSON.parse(html.match(/window\.__ATLAS_PAGE__=(.*?);<\/script>/s)[1]);assert.ok(state.hosted);assert.equal(state.result.totalCatalog,38237);assert.equal(state.catalogMode,'discovery');assert.ok(html.includes('38,237'));assert.ok(html.includes('Library features'));
 const admin=await worker.fetch(request('/admin'),env);assert.equal(admin.status,200);assert.equal(admin.headers.get('Cache-Control'),'private, no-store');assert.match(admin.headers.get('X-Robots-Tag'),/noindex/);const adminHtml=await admin.text();assert.ok(adminHtml.includes('Loading secure sign-in'));assert.ok(!adminHtml.includes('data-msg='));assert.ok(!adminHtml.includes('Switched to client rendering'));assert.ok(!adminHtml.includes('renderToString'));
 assert.equal((await worker.fetch(request('/brand/favicon.ico'),env)).status,200);
 assert.equal((await worker.fetch(request('/_worker.js'),env)).status,404);
 assert.equal((await worker.fetch(request('/api/resources',{method:'POST'}),env)).status,405);
 const sitemap=await(await worker.fetch(request('/sitemap.xml'),env)).text();assert.ok(!sitemap.includes('<url>'));
 const routes=JSON.parse(fs.readFileSync('dist/pages/_routes.json'));assert.deepEqual(routes.include,['/*']);assert.ok(routes.exclude.includes('/assets/*'));assert.ok(!routes.exclude.includes('/admin'));
 fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/pages-validation.json',JSON.stringify({checked_at:new Date().toISOString(),scope:'actual compiled standalone Pages module; isolated read-only provider',passed:['SSR homepage and built assets','dynamic resource search','dynamic template filtering','hosted draft download buttons withheld','new hosted search RPC adapter','private uncached admin route','no Worker source exposure','staging noindex and empty sitemap','write requests denied'],public_cloudflare_deployment:'pending authenticated dashboard access'},null,2)+'\n');
 console.log('PASS: standalone Cloudflare Pages frontend, live search adapter, template filtering, review gates and private admin headers.');
}finally{globalThis.fetch=originalFetch;}
// The web-target React bundle owns a MessageChannel; all assertions above are awaited.
process.exit(0);
