import config from '../config/backend.public.json' with {type:'json'};
import taxonomy from '../data/taxonomy.json' with {type:'json'};
import {publishedSearch} from './published.mjs';
const slug=s=>s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-');
const names=new Map(taxonomy.map(t=>[slug(t.name),t.name]));
const prices={unknown:'Check terms',free_forever:'Free',open_source:'Open source',freemium:'Freemium',trial:'Free trial'};
export async function queryLive(params=new URLSearchParams(),fetcher=fetch) {
 const result=await publishedSearch(params,fetcher);
 return {connected:true,query:params.get('q')||'',resources:result.resources,has_more:result.hasMore,next_cursor:result.nextCursor?JSON.parse(result.nextCursor):null,ranking_scope:'all_matching_resources'};
}

export async function getLiveResource(id,fetcher=fetch){if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))return null;const endpoint=new URL('/rest/v1/resources',config.url);endpoint.searchParams.set('id','eq.'+id);endpoint.searchParams.set('select','*');endpoint.searchParams.set('limit','1');const response=await fetcher(endpoint,{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(15000),redirect:'error'});if(!response.ok)throw Error('Resource is temporarily unavailable');const [r]=await response.json();if(!r)return null;return {id:r.id,name:r.display_name,url:r.canonical_url,description:r.short_summary,category:names.get(r.category_id)||r.category_id,pricing:prices[r.pricing_model]||'Check terms',tags:r.tags||[],kind:r.resource_type==='github_repo'?'GitHub repository':r.resource_type==='mobile_app'?'Mobile app':'Website',image_url:r.image_url,image_alt:r.image_alt,record:r};}
