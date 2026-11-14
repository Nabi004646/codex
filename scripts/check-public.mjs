import fs from 'node:fs';import assert from 'node:assert/strict';
import {templateDraftFile} from '../server/templates.mjs';
import {catalog} from '../server/catalog.mjs';import {queryPreview,initial} from '../server/preview.mjs';import {routeState} from '../server/routes.mjs';import {topics,articles,publicPaths} from '../server/public-content.mjs';
assert.equal(catalog.length,42);assert.equal(new Set(catalog.map(r=>r.id)).size,42);assert.equal(new Set(catalog.map(r=>r.url.replace(/\/$/,''))).size,42);
const query=p=>queryPreview(new URLSearchParams(p));
assert.equal(query({q:'Shotcut'}).resources[0].name,'Shotcut');
assert.ok(query({q:'SEO'}).resources.some(r=>r.name==='Lighthouse'));
assert.ok(query({q:'reels'}).resources.some(r=>r.name==='Shotcut'));
assert.ok(query({q:'earn money'}).resources.some(r=>r.name==='ERPNext'));
assert.ok(query({q:'blendre'}).suggestions.includes('Blender'));
assert.equal(query({ids:'none'}).resources.length,0);
const id=catalog[0].id;assert.deepEqual(query({ids:id}).resources.map(r=>r.id),[id]);
assert.ok(query({category:'Video & Film',subcategory:'Screen Recording'}).resources.every(r=>r.subcategory==='Screen Recording'));
assert.ok(query({platform:'Linux',signup:'Not required'}).resources.every(r=>r.free_details.platforms.includes('Linux')&&r.free_details.signup==='Not required'));
assert.ok(query({ram:'4',workload:'4K'}).resources.every(r=>r.device_details.workload_ram_gb['4K']<=4));assert.ok(!query({ram:'4',workload:'4K'}).resources.some(r=>r.name==='Shotcut'));
assert.equal(query({country:'US'}).total,0);
assert.equal(query({mobile:'both'}).resources[0].name,'wger');assert.ok(query({mobile:'both'}).resources.every(r=>r.mobile_platforms.includes('android')&&r.mobile_platforms.includes('ios')));assert.ok(query({q:'Android'}).resources.some(r=>r.name==='wger'));assert.equal(query({view:'saved'}).total,0);
assert.deepEqual(query({sort:'az'}).resources.map(r=>r.name),catalog.map(r=>r.name).sort((a,b)=>a.localeCompare(b,'en')).slice(0,24));
assert.equal(query({page:'NaN'}).page,1);
assert.equal(initial('/?view=saved').params.section,'saved');assert.equal(initial('/collections').params.section,'collections');
assert.equal(routeState('/category/video-and-film/screen-recording').status,200);assert.equal(routeState('/category/video-and-film/not-a-subtopic').status,404);
for(const t of topics){const p=initial(t.path);assert.equal(p.query,t.query);assert.ok(p.result.total>0,'Topic needs genuine matches: '+t.path);}
for(const p of publicPaths)assert.equal(routeState(p).status,200,p);
for(const r of catalog){assert.ok(r.subcategory);assert.ok(r.editorial.example.length>=40);assert.ok(r.free_details.limits.length>=30);assert.ok(r.editorial.source_urls.every(u=>new URL(u).protocol==='https:'));assert.equal(r.status,'staging');}
const {render}=await import('../.atlas-ssr/entry-server.js');
const payload='</script><script>alert(1)</script>';
const hostile=await render('/?q='+encodeURIComponent(payload));
assert.equal(JSON.parse(hostile.state).params.q,payload,'State encoding must preserve the query after parsing');
assert.ok(!hostile.state.includes('<'),'State cannot break out of its script');
assert.equal((await render('/not-a-real-page')).status,404);
const inventory=JSON.parse(fs.readFileSync('reports/public-page-inventory.json'));assert.equal(inventory.approved_sitemap_urls,0);
for(const item of inventory.pages){const filename='dist'+(item.path==='/'?'':item.path.replace(/\/$/,''))+'/index.html',html=fs.readFileSync(filename,'utf8');assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,'One H1: '+item.path);assert.ok(html.includes('<meta name="robots" content="noindex,nofollow"'),'Noindex: '+item.path);assert.ok(!html.includes('<!--ATLAS_'),'Rendered page: '+item.path);assert.ok(html.includes('href="'+item.canonical+'"'),'Canonical: '+item.path);assert.ok(html.includes('application/ld+json'),'Structured page data: '+item.path);assert.ok(!html.includes('This section is awaiting integration'),'No dead placeholder: '+item.path);const json=html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);assert.doesNotThrow(()=>JSON.parse(json[1]));}
for(const item of inventory.pages){const html=fs.readFileSync('dist'+(item.path==='/'?'':item.path.replace(/\/$/,''))+'/index.html','utf8');for(const match of html.matchAll(/href="([^"#]+)"/g)){const href=match[1].replaceAll('&amp;','&');if(!href.startsWith('/')||href.startsWith('//'))continue;const u=new URL(href,'https://freeresourceatlas.com');if(u.pathname==='/api/template-draft-download'){const file=templateDraftFile(u.searchParams.get('id'),u.searchParams.get('format'));assert.ok(file&&fs.existsSync(file.local_path),'Missing registered draft download: '+href);}else if(/\.[a-z0-9]{2,6}$/i.test(u.pathname))assert.ok(fs.existsSync('dist'+u.pathname),'Missing asset: '+u.pathname);else assert.equal(routeState(u.pathname).status,200,'Broken internal link: '+u.pathname);}}
const xml=fs.readFileSync('dist/sitemap.xml','utf8');assert.equal((xml.match(/<url>/g)||[]).length,0,'No draft page may enter sitemap');
for(const a of articles){assert.ok(a.sections.length>=3);assert.ok(a.sources.length>=3);assert.ok(a.sections.every(s=>s.answer&&s.steps.length));for(const s of a.sections){const words=s.answer.trim().split(/\s+/).length;assert.ok(words>=40&&words<=50,'Direct answer length: '+a.slug+' / '+s.title);}}
fs.writeFileSync('reports/public-validation.json',JSON.stringify({checked_at:new Date().toISOString(),local_resources:catalog.length,guide_drafts:articles.length,rendered_pages:inventory.pages.length,approved_sitemap_urls:0,checks:['unique real resource destinations','exact-name and task-intent search','typo suggestions','saved-ID isolation','subcategory/platform/account/workload filters','category route validation','mapped topic prefill with genuine results','one H1, canonical, noindex and JSON-LD on rendered pages','no integration placeholder on public pages','draft exclusion from sitemap'],hosted_resource_import:'not performed',public_deployment:'not performed'},null,2)+'\n');
console.log('PASS: '+catalog.length+' staging resources, '+articles.length+' guide drafts, '+inventory.pages.length+' rendered pages; public navigation/search and metadata gates; zero draft sitemap URLs.');
