import {safeMediaUrl} from '../src/media-policy.mjs';
const MAX_BYTES=2500000,TIMEOUT=3500;
const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; sandbox",'Cross-Origin-Resource-Policy':'cross-origin'};
const failure=(status=404)=>new Response(null,{status,headers:{...headers,'Cache-Control':'public, max-age=600'}});
function isImage(bytes,type){const head=new TextDecoder().decode(bytes.slice(0,200)).trimStart();return type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78:type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:type==='image/webp'?new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP':type==='image/gif'?head.startsWith('GIF8'):type==='image/avif'?head.slice(4,12)==='ftypavif'||head.slice(4,12)==='ftypavis':type==='image/svg+xml'?/^<svg\b|^<\?xml[\s\S]*?<svg\b/i.test(head):type==='image/x-icon'||type==='image/vnd.microsoft.icon'?bytes[0]===0&&bytes[1]===0&&bytes[2]===1:false;}
export async function mediaResponse(request,{fetcher=fetch,cache=null,waitUntil=()=>{}}={}){
 const url=new URL(request.url),source=safeMediaUrl(url.searchParams.get('src'));
 if(!source||url.searchParams.size!==1)return failure(400);
 const key=new Request(url.origin+'/_media?'+new URLSearchParams({src:source}));
 let cached=null;try{cached=cache&&await cache.match(key);}catch{}if(cached){if(request.method==='HEAD')return new Response(null,{status:cached.status,headers:cached.headers});return cached;}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT);let response;
 try{let target=source,remote;for(let redirects=0;redirects<=2;redirects++){remote=await fetcher(target,{redirect:'manual',signal:controller.signal,headers:{Accept:'image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8','User-Agent':'FreeResourceAtlas-PublisherMedia/1.0'}});if(remote.status<300||remote.status>=400)break;const location=remote.headers.get('Location');const next=location&&safeMediaUrl(new URL(location,target).href);await remote.body?.cancel();if(!next||redirects===2)throw Error('Unsupported media redirect');target=next;}
  if(!remote?.ok)throw Error('Publisher image unavailable');
  const type=(remote.headers.get('Content-Type')||'').split(';')[0].toLowerCase(),length=Number(remote.headers.get('Content-Length')||0);if(!type.startsWith('image/')||length>MAX_BYTES)throw Error('Unsupported image');
  const chunks=[];let bytes=0;const reader=remote.body?.getReader();if(!reader)throw Error('Empty image');for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BYTES){await reader.cancel();throw Error('Image too large');}chunks.push(value);}const image=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){image.set(chunk,offset);offset+=chunk.byteLength;}if(!bytes||!isImage(image,type))throw Error('Invalid image data');
  response=new Response(image,{headers:{...headers,'Content-Type':type,'Content-Length':String(bytes),'Cache-Control':'public, max-age=604800, stale-while-revalidate=86400','X-Robots-Tag':'max-image-preview:large'}});
 }catch{response=failure();}finally{clearTimeout(timer);controller.abort();}
 if(cache)waitUntil(cache.put(key,response.clone()).catch(()=>{}));return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
}
