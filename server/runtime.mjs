import {findTask} from './finder.mjs';
import {queryLive} from './live.mjs';
import {templateListing} from './templates.mjs';
import {queryPreview} from './preview.mjs';import {publishedSearch,publicRows,publicRpc} from './published.mjs';import {sitemapIndex,sitemapPage,sitemapRoute} from './sitemaps.mjs';
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...security,'Content-Type':'application/json','Cache-Control':'no-store'}});
export function createRuntime({render,template,fetcher=fetch,cache=null}){
 return async function handle(request,env={},ctx={waitUntil:()=>{}}){
  const url=new URL(request.url),production=env.ATLAS_MODE==='production',privatePath=/^\/admin(?:\/|$)/.test(url.pathname);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...security,Allow:'GET, HEAD','Cache-Control':'no-store'}});
  if(url.pathname==='/robots.txt')return new Response(production?'User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /search\nDisallow: /preview/\nSitemap: https://freeresourceatlas.com/sitemap.xml\n':'User-agent: *\nDisallow: /\n',{headers:{...security,'Content-Type':'text/plain','Cache-Control':'public, max-age=60'}});
  try{
   if(url.pathname==='/sitemap.xml'||url.pathname.startsWith('/sitemaps/')){
    if(!production)return new Response(sitemapPage([]),{headers:{...security,'Content-Type':'application/xml','X-Robots-Tag':'noindex','Cache-Control':'no-store'}});
    const route=sitemapRoute(url.pathname);if(url.pathname!=='/sitemap.xml'&&!route)return new Response('Not found',{status:404,headers:security});
    const data=await publicRpc('sitemap_snapshot',route||{},fetcher);
    return new Response(url.pathname==='/sitemap.xml'?sitemapIndex(data.groups):sitemapPage(data.urls),{headers:{...security,'Content-Type':'application/xml','Cache-Control':'public, max-age=60'}});
   }
   if(url.pathname==='/api/finder')return json(await findTask(url.searchParams.get('task'),p=>production?publishedSearch(p,fetcher):queryPreview(p)));
   if(url.pathname==='/api/live/resources')return json(await queryLive(url.searchParams,fetcher));
   if(url.pathname==='/api/templates')return production?json({error:'Template publication is pending.'},404):json(templateListing(url.searchParams));
   if(url.pathname==='/api/template-draft-download')return json({error:'Local draft files are available only in the local review environment. Published downloads require approved storage records.'},404);
   if(url.pathname==='/api/resources')return json(production?await publishedSearch(url.searchParams,fetcher):queryPreview(url.searchParams));
   if(url.pathname.startsWith('/api/'))return json({error:'Endpoint not found.'},404);
   const asset=/^\/(?:assets|brand|fonts|previews|logos|template-previews)\//.test(url.pathname)||/\.(?:ico|png|jpg|webp|svg|woff2?|ttf)$/.test(url.pathname)||['/manifest.json','/site.webmanifest'].includes(url.pathname);
   if(asset)return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404,headers:security});
   if(production&&!privatePath){
    const [redirect]=await publicRows('site_redirects',{source_path:'eq.'+url.pathname,select:'target_path,status',limit:'1'},fetcher);
    if(redirect){if(redirect.status===410)return new Response('This page has been permanently removed.',{status:410,headers:{...security,'X-Robots-Tag':'noindex','Cache-Control':'public, max-age=60'}});return new Response(null,{status:redirect.status,headers:{...security,Location:redirect.target_path,'Cache-Control':'public, max-age=60'}});}
   }
   const cacheable=request.method==='GET'&&production&&!privatePath&&!url.search&&!request.headers.has('Authorization')&&!request.headers.has('Cookie'),key=new Request(url.origin+url.pathname);
   if(cacheable&&cache){const hit=await cache.match(key);if(hit)return hit;}
   const page=await render(url.pathname+url.search,{production,fetcher,hosted:true});
   const nonce=crypto.randomUUID().replaceAll('-','');
   let html=template.replace('<!--ATLAS_HEAD-->',page.head).replace('<!--ATLAS_HTML-->',page.html).replace('/*ATLAS_STATE*/null',page.state);
   if(production)html=html.replace('<meta name="robots" content="noindex,nofollow">','<meta name="robots" content="'+page.metadata.robots+'">');
   html=html.replace(/<script(?=\s|>)/g,'<script nonce="'+nonce+'"');
   const policy="default-src 'self'; script-src 'self' 'nonce-"+nonce+"'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://jawldxxtolppeccxcihh.supabase.co; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'";
   const response=new Response(request.method==='HEAD'?null:html,{status:page.status,headers:{...security,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':policy,'X-Robots-Tag':page.metadata.robots,'Cache-Control':cacheable&&page.status===200?'public, max-age=30, s-maxage=30':'private, no-store'}});
   if(cacheable&&cache&&page.status===200)ctx.waitUntil(cache.put(key,response.clone()));
   return response;
  }catch(error){return json({error:'The published catalog is temporarily unavailable. Please retry.'},503);}
 };
}
