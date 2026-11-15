import {publishedSearch,publishedDetail} from './published.mjs';
export async function queryLive(params=new URLSearchParams(),fetcher=fetch){const result=await publishedSearch(params,fetcher);return {connected:true,query:params.get('q')||'',resources:result.resources,has_more:result.hasMore,next_cursor:result.nextCursor?JSON.parse(result.nextCursor):null,ranking_scope:'all_matching_resources'};}
export async function getLiveResource(id,fetcher=fetch){return publishedDetail(id,fetcher);}
