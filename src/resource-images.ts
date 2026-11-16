import publisherPreviews from '../data/publisher-preview-runtime.json' with {type:'json'};
import templatePreviews from '../data/template-card-previews.json' with {type:'json'};
import {imageDeliveryUrl,compactImageUrl} from './media-policy.mjs';
import type {Resource} from '../source-baseline/nepocore-library/lib/types';
const originalPreviews:Record<string,string>={'0522e8689e47e6d2':'comfyui','52c0fdeaeecb210e':'activepieces','a1047f5c1d3715cf':'actual','5b5aa7987133f8d4':'blender','ebb5f6d88c1072f7':'wger','07846c15f56ca9a3':'react-bits'};
export function resourceImage(r:Resource&{image_kind?:string;image_source_url?:string}){
 if(r.status==='published'&&r.image_url&&/^https:\/\//.test(r.image_url))return {src:r.image_url,kind:r.image_kind||'publisher',alt:r.image_alt||r.name+' — publisher image',label:'Published resource image',source:r.image_source_url||r.url};
 const template=(templatePreviews as Record<string,any>)[r.id];if(template&&r.url===template.url)return {src:template.preview,kind:'template',alt:'First-page preview of '+r.name,label:'Original template preview',source:r.url};
 const preview=(publisherPreviews as Record<string,any>)[String(r.url||'').replace(/\/$/,'')];if(preview?.unavailable)return {src:null,kind:'unavailable',alt:'',label:'Publisher preview unavailable',source:preview.source_url,notice:preview.notice};if(preview?.src)return {src:preview.src,srcSet:preview.srcset,kind:preview.image_kind,alt:r.name+' — official publisher preview',label:preview.image_kind==='screenshot'?'Publisher application screenshot':'Official publisher preview',source:preview.source_url};
 if(originalPreviews[r.id])return {src:'/previews/'+originalPreviews[r.id]+'.webp',kind:'screenshot',alt:r.name+' application screenshot',label:'Application screenshot',source:r.url};
 if(r.image_url&&/^https:\/\//.test(r.image_url))return {src:r.image_url,kind:r.image_kind||'publisher',alt:r.image_alt||r.name+' — publisher image',label:r.image_kind==='screenshot'?'Application screenshot':r.image_kind==='logo'?'Application or publisher logo':'Publisher preview',source:r.image_source_url||r.url};
 try{
  const url=new URL(r.url),parts=url.pathname.split('/').filter(Boolean);
  if(url.hostname==='github.com'&&parts.length>=2&&parts.slice(0,2).every(p=>/^[\w.-]+$/.test(p)))return {src:'https://opengraph.githubassets.com/1/'+parts.slice(0,2).map(encodeURIComponent).join('/'),kind:'repository',alt:r.name+' — repository preview from GitHub',label:'Repository preview from GitHub',source:r.url};
  if(url.hostname==='huggingface.co'){const type=['datasets','spaces'].includes(parts[0])?parts.shift()!:'models';if(parts.length>=2)return {src:'https://cdn-thumbnails.huggingface.co/social-thumbnails/'+type+'/'+parts.slice(0,2).map(encodeURIComponent).join('/')+'.png',kind:'repository',alt:r.name+' — publisher card from Hugging Face',label:'Publisher card from Hugging Face',source:r.url};}
  if(['youtube.com','www.youtube.com','youtu.be'].includes(url.hostname)){const id=url.hostname==='youtu.be'?parts[0]:url.searchParams.get('v');if(id&&/^[\w-]{11}$/.test(id))return {src:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',kind:'publisher',alt:r.name+' — original video thumbnail',label:'Original video thumbnail',source:r.url};}
 }catch{}
 return {src:null,kind:'unavailable',alt:'',label:'Publisher preview unavailable',source:r.url};
}

export function resourceImageCandidates(r:any){
 const image=resourceImage(r),candidates:any[]=[];
 if((image as any).notice)return candidates;
 if(image.src){const source=compactImageUrl(image.src,640),delivery=imageDeliveryUrl(source);candidates.push({...image,src:delivery});if(delivery!==source)candidates.push({...image,src:source,srcSet:undefined});}
 // Favicons are small identity marks, not card artwork. A generic favicon
 // service can return the same blurry globe for unrelated resources.
 return candidates.filter((entry,index)=>candidates.findIndex(other=>other.src===entry.src)===index).slice(0,4);
}
