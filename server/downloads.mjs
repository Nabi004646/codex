import {publicRows} from './published.mjs';
import {DOWNLOAD_TAG,downloadTitle,storedDownloadLinks} from '../src/download-links.mjs';
import {CatalogInputError} from './discovery-query-key.mjs';
export async function queryDownloads(params=new URLSearchParams(),fetcher=fetch){
 const query=params.get('q')||'',page=Number(params.get('page')||1);if(query.length>160||!Number.isInteger(page)||page<1||page>10000)throw new CatalogInputError('Use a shorter query or a valid page.');
 const filters={publication:'eq.published',tags:'cs.{"'+DOWNLOAD_TAG+'"}',select:'id,display_name,canonical_url,short_summary,editorial_description,source_urls,platforms,pricing_model,image_url,image_alt,access_limits,license,updated_at',order:'updated_at.desc,id.asc',limit:'25',offset:String((page-1)*24)},q=query.replace(/[^\p{L}\p{N} _-]/gu,' ').trim();if(q)filters.or='(display_name.ilike.*'+q+'*,short_summary.ilike.*'+q+'*)';
 const rows=await publicRows('resources',filters,fetcher),resources=rows.slice(0,24).map(row=>({...row,title:downloadTitle(row),download_links:storedDownloadLinks([row.canonical_url,...row.source_urls||[]])})).filter(r=>r.download_links.length);return {resources,page,hasMore:rows.length>24,query};
}
