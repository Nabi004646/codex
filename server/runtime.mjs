import {publicRobots} from './robots.mjs';
import {nativeTemplateDocument,nativeTemplateDownload,nativeTemplateApprovals} from './template-publication.mjs';
import {submissionResponse} from './submissions.mjs';
import {publishedOverrides,publishedResource} from './catalog-overrides.mjs';
import {widgetResponse} from './widgets.mjs';
import {isPublicAsset} from './public-assets.mjs';
import {mediaResponse} from './media.mjs';
import {canonicalPathname} from './routes.mjs';
import {publicApprovals,publicInventory} from './public-approvals.mjs';
import {queryDownloads} from './downloads.mjs';
import {preferredUiLocale} from '../src/locale-config.mjs';
import {discoverySnapshot} from './discovery-snapshots.mjs';
import {findTask} from './finder.mjs';
import {queryLive} from './live.mjs';
import {templateListing,templateStagingSource} from './templates.mjs';
import {queryPreview} from './preview.mjs';import {publishedSearch,publicRows,publicRpc} from './published.mjs';import {sitemapIndex,sitemapPage,sitemapRoute} from './sitemaps.mjs';
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...security,'Content-Type':'application/json','Cache-Control':'no-store'}});
export function createRuntime({render,template,fetcher=fetch,cache=null}){
 const htmlRevision=template.match(/src="\/assets\/([^"/]+)"/)?.[1]||'local';
 return async function handle(request,env={},ctx={waitUntil:()=>{}}){
  const url=new URL(request.url),production=env.ATLAS_MODE==='production',privatePath=/^\/admin(?:\/|$)/.test(url.pathname);
  if(['/api/submissions','/api/submissions/withdraw'].includes(url.pathname))return submissionResponse(request,{fetcher});
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...security,Allow:'GET, HEAD','Cache-Control':'no-store'}});
  const publicDiscovery=env.ATLAS_MODE==='public-discovery'&&url.hostname==='freeresourceatlas.com';
  if(env.ATLAS_MODE==='public-discovery'&&['freeresourceatlas.com','www.freeresourceatlas.com'].includes(url.hostname)&&(url.protocol!=='https:'||url.hostname.startsWith('www.')))return new Response(null,{status:308,headers:{Location:'https://freeresourceatlas.com'+url.pathname+url.search,'Cache-Control':'public, max-age=3600'}});
  if(publicDiscovery&&!privatePath){const canonical=canonicalPathname(url.pathname);if(canonical!==url.pathname)return new Response(null,{status:308,headers:{Location:canonical+url.search,'Cache-Control':'public, max-age=3600'}});}
  const discovery=!production&&env.ATLAS_CATALOG==='discovery';
  const readAsset=async path=>{if(!env.ASSETS)throw Error('Catalog assets unavailable');const response=await env.ASSETS.fetch(new Request(url.origin+path));if(!response.ok)throw Error('Catalog asset unavailable');return response.json();};
  const search=params=>production?publishedSearch(params,fetcher):discovery?discoverySnapshot(params,readAsset):queryPreview(params);
  if(/^\/preview(?:\/|$)/.test(url.pathname))return new Response('Not found',{status:404,headers:{...security,'X-Robots-Tag':'noindex','Cache-Control':'private, no-store'}});
  if(url.pathname==='/robots.txt')return new Response(production||publicDiscovery?publicRobots():'User-agent: *\nDisallow: /\n',{headers:{...security,'Content-Type':'text/plain','Cache-Control':'public, max-age=60'}});
  try{
   if(url.pathname==='/_media')return await mediaResponse(request,{fetcher,cache,waitUntil:promise=>ctx.waitUntil(promise)});
   if(url.pathname==='/sitemap.xml'||url.pathname.startsWith('/sitemaps/')){
    if(publicDiscovery){
     const requestedRoute=url.pathname==='/sitemap.xml'?null:sitemapRoute(url.pathname);
     if(url.pathname!=='/sitemap.xml'&&(!requestedRoute||requestedRoute.p_group!=='pages'||requestedRoute.p_locale!=='en'||requestedRoute.p_page>=Math.ceil((publicApprovals.length+100)/1000)))return new Response('Not found',{status:404,headers:security});
     let native=[];try{native=await nativeTemplateApprovals(fetcher);}catch{/* Close native indexing when publication cannot be checked. */}
     const approved=[...publicApprovals,...native];
     if(url.pathname==='/sitemap.xml')return new Response(sitemapIndex([{sitemap_group:'pages',locale:'en',count:approved.length}]),{headers:{...security,'Content-Type':'application/xml','Cache-Control':'public, max-age=60'}});
     const route=sitemapRoute(url.pathname);if(!route||route.p_group!=='pages'||route.p_locale!=='en'||route.p_page>=Math.ceil(approved.length/1000))return new Response('Not found',{status:404,headers:security});
     return new Response(sitemapPage(approved.slice(route.p_page*1000,(route.p_page+1)*1000)),{headers:{...security,'Content-Type':'application/xml','Cache-Control':'public, max-age=60'}});
    }
    if(!production)return new Response(sitemapPage([]),{headers:{...security,'Content-Type':'application/xml','X-Robots-Tag':'noindex','Cache-Control':'no-store'}});
    const route=sitemapRoute(url.pathname);if(url.pathname!=='/sitemap.xml'&&!route)return new Response('Not found',{status:404,headers:security});
    const data=await publicRpc('sitemap_snapshot',route||{},fetcher);
    return new Response(url.pathname==='/sitemap.xml'?sitemapIndex(data.groups):sitemapPage(data.urls),{headers:{...security,'Content-Type':'application/xml','Cache-Control':'public, max-age=60'}});
   }
   if(url.pathname.startsWith('/embed/'))return widgetResponse(url.pathname.slice(7));
   if(url.pathname==='/api/page-inventory'){const inventory=publicInventory();if(production||publicDiscovery)try{const native=await nativeTemplateApprovals(fetcher);return json({...inventory,approved_urls:inventory.approved_urls+native.length,native_template_urls:native.length,pages:[...inventory.pages,...native]});}catch{return json({...inventory,native_template_urls:null,native_check:'unavailable'});}return json(inventory);}
   if(url.pathname==='/api/finder')return json(await findTask(url.searchParams.get('task'),p=>publishedSearch(p,fetcher),{country:url.searchParams.get('country')||'',includeCommunity:url.searchParams.get('community')==='1'}));
   if(url.pathname==='/api/downloads')return json(await queryDownloads(url.searchParams,fetcher));
   if(url.pathname==='/api/catalog-overrides')return json(await publishedOverrides(url.searchParams,fetcher));
   if(url.pathname==='/api/published-resource'){const result=await publishedResource(url.searchParams,fetcher);return json(result,result.resource?200:404);}
   if(url.pathname==='/api/live/resources')return json(await queryLive(url.searchParams,fetcher));
   if(url.pathname==='/api/template-staging-source')return json(templateStagingSource());
   if(url.pathname==='/api/template-download')return nativeTemplateDownload(request,{fetcher});
   if(url.pathname==='/api/templates'){const listing=templateListing(url.searchParams);return json(production||publicDiscovery?(await nativeTemplateDocument({listing},fetcher)).listing:listing);}
   if(url.pathname==='/api/template-draft-download')return json({error:'Local draft files are available only in the local review environment. Published downloads require approved storage records.'},404);
   if(url.pathname==='/api/resources'){const result=await search(url.searchParams);return json(result,result.clientRequired?409:200);}
   if(url.pathname.startsWith('/api/'))return json({error:'Endpoint not found.'},404);
   const asset=isPublicAsset(url.pathname);
   if(asset)return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404,headers:security});
   if(production&&!privatePath){
    const [redirect]=await publicRows('site_redirects',{source_path:'eq.'+url.pathname,select:'target_path,status',limit:'1'},fetcher);
    if(redirect){if(redirect.status===410)return new Response('This page has been permanently removed.',{status:410,headers:{...security,'X-Robots-Tag':'noindex','Cache-Control':'public, max-age=60'}});return new Response(null,{status:redirect.status,headers:{...security,Location:redirect.target_path,'Cache-Control':'public, max-age=60'}});}
   }
   const countryCode=/^[A-Z]{2}$/.test(request.cf?.country||'')?request.cf.country:'XX';
   const cacheable=request.method==='GET'&&(production||publicDiscovery)&&!privatePath&&!url.pathname.startsWith('/resource/')&&!url.pathname.startsWith('/templates')&&!url.search&&!request.headers.has('Authorization')&&!request.headers.has('Cookie'),key=new Request(url.origin+url.pathname+'?'+new URLSearchParams({__atlas_revision:htmlRevision,...(publicDiscovery?{__atlas_country:countryCode}:{})}));
   if(cacheable&&cache){const hit=await cache.match(key);if(hit){if(!publicDiscovery)return hit;const headers=new Headers(hit.headers);headers.set('Cache-Control','private, no-store');return new Response(hit.body,{status:hit.status,headers});}}
   const page=await render(url.pathname+url.search,{production,publicDiscovery,fetcher,hosted:true,uiLocale:preferredUiLocale(request.headers.get('Cookie'),url.searchParams.get('ui')),countryHint:request.cf?.country||'',discoverySearch:discovery?params=>discoverySnapshot(params,readAsset):null});
   const nonce=crypto.randomUUID().replaceAll('-','');
   let html=template.replace('<!--ATLAS_HEAD-->',()=>page.head).replace('<!--ATLAS_HTML-->',()=>page.html).replace('/*ATLAS_STATE*/null',()=>page.state);
   if(production||publicDiscovery)html=html.replace('<meta name="robots" content="noindex,nofollow">','<meta name="robots" content="'+page.metadata.robots+'">');
   html=html.replace(/<html[^>]*>/,'<html lang="'+(page.uiLocale||'en')+'" dir="'+(page.uiLocale==='ar'?'rtl':'ltr')+'">');
   html=html.replace(/<script(?=\s|>)/g,'<script nonce="'+nonce+'"');
   const policy="default-src 'self'; script-src 'self' 'nonce-"+nonce+"'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://jawldxxtolppeccxcihh.supabase.co; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'";
   const response=new Response(request.method==='HEAD'?null:html,{status:page.status,headers:{...security,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':policy,'X-Robots-Tag':page.metadata.robots,'Cache-Control':cacheable&&page.status===200&&!publicDiscovery?'public, max-age=30, s-maxage=30':'private, no-store'}});
   if(cacheable&&cache&&page.status===200){const entry=response.clone();if(publicDiscovery)entry.headers.set('Cache-Control','public, max-age=30');ctx.waitUntil(cache.put(key,entry));}
   return response;
  }catch(error){if(error.name==='CatalogInputError')return json({error:error.message},400);return json({error:'The published catalog is temporarily unavailable. Please retry.'},503);}
 };
}
