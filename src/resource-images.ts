import type {Resource} from '../source-baseline/nepocore-library/lib/types';
const originalPreviews:Record<string,string>={'0522e8689e47e6d2':'comfyui','52c0fdeaeecb210e':'activepieces','a1047f5c1d3715cf':'actual','5b5aa7987133f8d4':'blender','ebb5f6d88c1072f7':'wger','07846c15f56ca9a3':'react-bits'};
export function resourceImage(r:Resource&{image_kind?:string;image_source_url?:string}){
 if(r.image_url&&/^https:\/\//.test(r.image_url))return {src:r.image_url,kind:r.image_kind||'publisher',alt:r.image_alt||r.name+' — publisher image',label:r.image_kind==='screenshot'?'Application screenshot':r.image_kind==='logo'?'Application or publisher logo':'Publisher preview',source:r.image_source_url||r.url};
 if(originalPreviews[r.id])return {src:'/previews/'+originalPreviews[r.id]+'.webp',kind:'screenshot',alt:r.name+' application screenshot',label:'Application screenshot',source:r.url};
 try{
  const url=new URL(r.url),parts=url.pathname.split('/').filter(Boolean);
  if(url.hostname==='github.com'&&parts.length>=2&&parts.slice(0,2).every(p=>/^[\w.-]+$/.test(p)))return {src:'https://opengraph.githubassets.com/1/'+parts.slice(0,2).map(encodeURIComponent).join('/'),kind:'repository',alt:r.name+' — repository preview from GitHub',label:'Repository preview from GitHub',source:r.url};
  if(url.hostname==='huggingface.co'){const type=['datasets','spaces'].includes(parts[0])?parts.shift()!:'models';if(parts.length>=2)return {src:'https://cdn-thumbnails.huggingface.co/social-thumbnails/'+type+'/'+parts.slice(0,2).map(encodeURIComponent).join('/')+'.png',kind:'repository',alt:r.name+' — publisher card from Hugging Face',label:'Publisher card from Hugging Face',source:r.url};}
  if(['youtube.com','www.youtube.com','youtu.be'].includes(url.hostname)){const id=url.hostname==='youtu.be'?parts[0]:url.searchParams.get('v');if(id&&/^[\w-]{11}$/.test(id))return {src:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',kind:'publisher',alt:r.name+' — original video thumbnail',label:'Original video thumbnail',source:r.url};}
 }catch{}
 return {src:null,kind:'unavailable',alt:'',label:'Publisher preview unavailable',source:r.url};
}
