import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import previews from '../data/publisher-previews.json' with {type:'json'};
import drafts from '../data/template-drafts.json' with {type:'json'};
import {resourceImageCandidates} from '../src/resource-images.ts';
import {safeMediaUrl,iconSource,imageDeliveryUrl} from '../src/media-policy.mjs';
import {mediaResponse} from '../server/media.mjs';
import {PUBLIC_ASSET_DIRECTORIES} from '../server/public-assets.mjs';
import {publicApprovals,publicInventory} from '../server/public-approvals.mjs';
import {createRuntime} from '../server/runtime.mjs';
import {syncDirectoryMetadata} from '../src/directory-metadata.mjs';
const request=source=>new Request('https://freeresourceatlas.com'+imageDeliveryUrl(source));
const fixture=Object.values(previews).find(p=>p.variants)?.variants[0];
test('reported UI resources use real, pinned responsive previews and changed sources do not get unrelated artwork',async()=>{
 const entries=Object.entries(previews).filter(([,p])=>p.src);assert.equal(entries.length,29);let bytes=0;
 for(const [url,p]of entries){assert.match(p.source_url,/^https:\/\//);const candidates=resourceImageCandidates({name:'Publisher resource',url});assert.equal(candidates[0].src,p.src);assert.ok(candidates[0].srcSet.includes('480w'));
  for(const v of p.variants){const file=await fs.readFile('public'+v.path);assert.equal(file.length,v.bytes);assert.equal(createHash('sha256').update(file).digest('hex'),v.sha256);assert.ok(v.bytes<150000);bytes+=v.bytes;}
 }assert.ok(bytes<1500000);const {catalog}=await import('../server/catalog.mjs');assert.ok(catalog.slice(0,24).every(r=>/^\/(?:publisher-media|previews)\//.test(resourceImageCandidates(r)[0]?.src||'')),'Homepage previews must use packaged assets');assert.deepEqual(resourceImageCandidates({name:'Brumm',url:'https://brumm.af/shadows'}),[]);
 assert.ok(resourceImageCandidates({name:'Example',url:'https://provider.org/'}).every(p=>p.kind==='icon'));
 assert.equal(resourceImageCandidates({name:'File',url:'https://drive.google.com/file/d/example/view'}).length,0);
});
test('media fetches are restricted to public approved hosts and exact icon requests',()=>{
 for(const url of ['http://f-droid.org/icon.png','https://127.0.0.1/image','https://[::1]/x','https://user:pass@f-droid.org/x','https://f-droid.org:8443/x','https://unknown-domain.org/x','https://www.google.com/search?q=secret','https://www.google.com/s2/favicons?domain_url=http://127.0.0.1&sz=128'])assert.equal(safeMediaUrl(url),null,url);
 assert.equal(iconSource('https://127.0.0.1'),null);assert.equal(iconSource('https://private.internal'),null);assert.ok(safeMediaUrl(iconSource('https://www.krita.org/path?private=omitted')));
 assert.equal(safeMediaUrl('https://f-droid.org/icon.png#fragment'),'https://f-droid.org/icon.png');
});
test('typed media is cached without forwarding visitor credentials, and HEAD responses have no body',async()=>{
 const image=await fs.readFile('public'+fixture.path),memory=new Map(),waits=[];let calls=0;
 const cache={match:async k=>memory.get(k.url)?.clone(),put:async(k,r)=>{memory.set(k.url,r);}};
 const fetcher=async(url,options)=>{calls++;assert.equal(options.redirect,'manual');assert.equal(options.headers.Cookie,undefined);assert.equal(options.headers.Authorization,undefined);return new Response(image,{headers:{'Content-Type':'image/webp'}});};
 const input=new Request(request('https://f-droid.org/icon.webp'),{headers:{Cookie:'private=value',Authorization:'private'}});
 const first=await mediaResponse(input,{fetcher,cache,waitUntil:p=>waits.push(p)});assert.equal(first.status,200);assert.equal(first.headers.get('Content-Type'),'image/webp');assert.match(first.headers.get('Cache-Control'),/604800/);assert.match(first.headers.get('Content-Security-Policy'),/sandbox/);assert.deepEqual(Buffer.from(await first.arrayBuffer()),image);await Promise.all(waits);
 const second=await mediaResponse(input,{fetcher,cache});assert.equal(second.status,200);assert.equal(calls,1);
 const head=await mediaResponse(new Request(input,{method:'HEAD'}),{fetcher,cache});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
});
test('HTML, invalid image signatures, oversized bodies and redirects to private hosts are rejected',async()=>{
 const image=await fs.readFile('public'+fixture.path),input=request('https://f-droid.org/image.webp');
 for(const fetcher of [async()=>new Response('<html>not an image</html>',{headers:{'Content-Type':'text/html'}}),async()=>new Response('<html>not an image</html>',{headers:{'Content-Type':'image/webp'}}),async()=>new Response(image,{headers:{'Content-Type':'image/webp','Content-Length':'2500001'}}),async()=>new Response(new Uint8Array(2500001),{headers:{'Content-Type':'image/webp'}})])assert.equal((await mediaResponse(input,{fetcher})).status,404);
 let calls=0;const redirected=await mediaResponse(input,{fetcher:async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://127.0.0.1/internal'}});}});assert.equal(redirected.status,404);assert.equal(calls,1);
 assert.equal((await mediaResponse(request('https://unknown-domain.org/icon'),{fetcher:()=>{throw Error('Must not fetch');}})).status,400);
});
test('stalled publisher requests are aborted at the media deadline',async()=>{
 let aborted=false;const start=Date.now();const result=await mediaResponse(request('https://f-droid.org/stalled.webp'),{fetcher:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('Aborted'));},{once:true}))});
 assert.equal(result.status,404);assert.ok(aborted);assert.ok(Date.now()-start<5000);
});
test('blog covers and publisher variants are packaged and bypass the HTML worker',async()=>{
 const routes=JSON.parse(await fs.readFile('dist/pages/_routes.json','utf8'));for(const dir of ['article-covers','publisher-media']){assert.ok(PUBLIC_ASSET_DIRECTORIES.includes(dir));assert.ok(routes.exclude.includes('/'+dir+'/*'));}
 const {articles}=await import('../server/public-content.mjs');for(const article of articles){const path='/article-covers/'+article.slug+'.svg';assert.equal(await fs.readFile('dist/pages'+path,'utf8'),await fs.readFile('public'+path,'utf8'));}
 for(const p of Object.values(previews))for(const v of p.variants||[])assert.equal(createHash('sha256').update(await fs.readFile('dist/pages'+v.path)).digest('hex'),v.sha256);
 const headers=await fs.readFile('public/_headers','utf8');assert.ok(!/^\/\*\n\s+X-Robots-Tag: noindex/m.test(headers));
});
test('every source-approved URL renders useful HTML with correct metadata; drafts stay out',async()=>{
 const {render}=await import('../.atlas-ssr/entry-server.js');assert.equal(publicApprovals.length,62);assert.equal(new Set(publicApprovals.map(p=>p.path)).size,62);assert.equal(publicInventory().google_indexed,null);
 for(const p of publicApprovals){const result=await render(p.path,{publicDiscovery:true,hosted:true,fetcher:async()=>Response.json([])});assert.equal(result.status,200,p.path);assert.equal(result.metadata.robots,'index,follow',p.path);assert.equal(result.metadata.canonical,p.canonical_url,p.path);assert.equal((result.html.match(/<h1(?:\s|>)/g)||[]).length,1,p.path);assert.ok(result.metadata.description.length>=40&&result.metadata.description.length<=200,p.path);const graph=result.metadata.schema['@graph'];assert.ok(graph.some(n=>n['@type']==='WebSite'));assert.ok(graph.some(n=>n['@type']==='Organization'));if(p.path.startsWith('/blog/')){const article=graph.find(n=>n['@type']==='BlogPosting');assert.ok(article.datePublished&&article.dateModified);assert.ok(article.citation.length>=3);assert.ok(!result.html.includes('In this staging build'));}}
 for(const draft of drafts)assert.ok(!publicApprovals.some(p=>p.path==='/templates/'+draft.slug));
 for(const path of ['/planner','/toolkits','/compare','/search','/downloads'])assert.ok(!publicApprovals.some(p=>p.path===path));
});
test('canonical aliases redirect once, missing sitemap batches return 404, and previews stay excluded',async()=>{
 const {render}=await import('../.atlas-ssr/entry-server.js'),template=await fs.readFile('index.html','utf8'),runtime=createRuntime({render,template}),env={ATLAS_MODE:'public-discovery'};
 for(const [from,to]of [['/about/','/about'],['/guides/free-tools-open-source-resources','/guides'],['/free/seo-tools','/free/seo-tools/']]){const response=await runtime(new Request('https://freeresourceatlas.com'+from+'?country=US'),env);assert.equal(response.status,308);assert.equal(response.headers.get('Location'),to+'?country=US');}
 assert.equal((await runtime(new Request('https://freeresourceatlas.com/sitemaps/pages_en_1.xml'),env)).status,404);
 const preview=await runtime(new Request('https://atlas-preview.pages.dev/blog'),env);assert.match(preview.headers.get('X-Robots-Tag'),/noindex/);
 const robots=await(await runtime(new Request('https://freeresourceatlas.com/robots.txt'),env)).text();assert.ok(!robots.includes('Disallow: /search\n'),'Crawlers can read search noindex');assert.ok(robots.includes('Disallow: /admin'));
});
test('client search navigation updates canonical and noindex state instead of retaining homepage indexing',()=>{
 const attrs=new Map(),document={title:'',querySelector:selector=>({setAttribute:(key,value)=>attrs.set(selector+':'+key,value)})};
 syncDirectoryMetadata(document,{path:'/search',params:new URLSearchParams({q:'games'}),title:'Games',description:'Matching games',indexablePaths:['/','/collections']});assert.equal(attrs.get('meta[name="robots"]:content'),'noindex,nofollow');assert.equal(attrs.get('link[rel="canonical"]:href'),'https://freeresourceatlas.com/search');
 syncDirectoryMetadata(document,{path:'/',params:new URLSearchParams(),title:'Free Resources',description:'Useful resources',indexablePaths:['/','/collections']});assert.equal(attrs.get('meta[name="robots"]:content'),'index,follow');
});
test('a new frontend revision cannot reuse cached HTML pointing at old script assets',async()=>{
 const {render}=await import('../.atlas-ssr/entry-server.js'),raw=await fs.readFile('index.html','utf8'),memory=new Map(),waits=[],cache={match:async k=>memory.get(k.url)?.clone(),put:async(k,r)=>{memory.set(k.url,r);}},ctx={waitUntil:p=>waits.push(p)},env={ATLAS_MODE:'public-discovery'};
 const first=createRuntime({render,template:raw.replace('/src/main.tsx','/assets/index-first.js'),cache}),second=createRuntime({render,template:raw.replace('/src/main.tsx','/assets/index-second.js'),cache});
 await first(new Request('https://freeresourceatlas.com/'),env,ctx);await Promise.all(waits);const html=await(await second(new Request('https://freeresourceatlas.com/'),env,ctx)).text();assert.ok(html.includes('/assets/index-second.js'));assert.ok(!html.includes('/assets/index-first.js'));
});
