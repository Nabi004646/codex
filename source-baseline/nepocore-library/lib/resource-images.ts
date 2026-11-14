import type {Resource} from './types';
import {illustrationUrl} from './illustrations';
const previews:Record<string,string>={'0522e8689e47e6d2':'comfyui','52c0fdeaeecb210e':'activepieces','a1047f5c1d3715cf':'actual','5b5aa7987133f8d4':'blender','ebb5f6d88c1072f7':'wger','07846c15f56ca9a3':'react-bits'};
export function resourceImage(r:Resource){
 if(r.image_url&&/^https:\/\//.test(r.image_url))return {src:r.image_url,alt:r.image_alt||'Preview of '+r.name,kind:'custom',label:'Image supplied by the curator'};
 if(previews[r.id])return {src:'/previews/'+previews[r.id]+'.webp',alt:r.name+' project preview',kind:previews[r.id],label:'Preview from the original project'};
 return {src:illustrationUrl(r),alt:'Original '+(r.subcategory||r.category).toLowerCase()+' illustration for '+r.name,kind:'illustrated',label:'Original resource illustration · not a provider screenshot'};
}
