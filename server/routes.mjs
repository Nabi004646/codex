import taxonomy from '../data/taxonomy.json' with {type:'json'};
import {publicPaths,topics} from './public-content.mjs';
const slug=s=>s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const documents=new Set(publicPaths),topicPaths=new Set(topics.map(t=>t.path));
export function routeState(pathname){
 if(/^\/admin\/?$/.test(pathname))return {status:200,kind:'admin'};
 if(/^\/resource\/[a-zA-Z0-9_-]{1,80}\/?$/.test(pathname))return {status:200,kind:'resource_lookup'};
 const normalized=pathname.replace(/\/$/,'')||'/';
 if(documents.has(normalized))return {status:200,kind:'public'};
 if(['/','/search','/collections','/preview/seo','/preview/live'].includes(normalized)||topicPaths.has(pathname))return {status:200,kind:'preview'};
 const parts=pathname.split('/').filter(Boolean);
 if(parts[0]==='category'&&parts.length<=3){const topic=taxonomy.find(t=>slug(t.name)===parts[1]);if(topic&&(parts.length===2||topic.subcategories.some(s=>slug(s)===parts[2])))return {status:200,kind:'preview'};}
 return {status:404,kind:'missing'};
}
