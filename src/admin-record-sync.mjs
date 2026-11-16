import {normalizeResource,categorySlug} from './admin-normalize.mjs';
import {boundedFetch} from './network.mjs';

export async function findAdminRecord(call,{id}){
 // Prefixes sort immediately before the ID. This also finds a renamed row.
 let after=id.slice(0,-1);
 for(let page=0;page<6;page++){
  const result=await call('list',{query:'',...(after?{after}:{})});
  if(!Array.isArray(result.items))throw Error('The database returned an incomplete resource list. Refresh and try again.');
  const found=result.items.find(row=>row.id===id);
  if(found)return found;
  if(result.items.length<=30||result.items.some(row=>row.id>id))return null;
  after=result.items[29].id;
 }
 throw Error('Too many matching names to confirm this record. Search with a more specific name.');
}

export async function saveAndReadResource(call,value,revision=null){
 const record=await normalizeResource(value);
 await call('save',{record,expected_revision:revision});
 const saved=await findAdminRecord(call,record);
 if(!saved||!Number.isInteger(saved.revision)||saved.revision<1||revision!==null&&saved.revision<=revision||saved.publication!=='draft'||['display_name','canonical_url','short_summary','editorial_description','access_limits','pricing_model','image_url'].some(key=>saved[key]!==record[key]))throw Error('The save was submitted, but its saved revision could not be confirmed. Refresh the resource before trying again.');
 return saved;
}

export async function confirmPublicResource(id,fetcher=globalThis.fetch,expected=null){
 const response=await boundedFetch('/api/published-resource?'+new URLSearchParams({id}),{cache:'no-store'},{fetcher});
 if(!response.ok)throw Error('Publication was submitted, but public visibility could not be confirmed. Refresh the library before publishing again.');
 const result=await response.json();
 if(result.resource?.id!==id||result.resource.status!=='published')throw Error('The public response does not contain the published resource.');
 if(expected&&(!Number.isInteger(result.resource.record?.revision)||result.resource.record.revision<=expected.revision||['display_name','canonical_url','short_summary','editorial_description','access_limits','pricing_model','image_url'].some(key=>result.resource.record[key]!==expected[key])))throw Error('Publication was saved, but the current public revision could not be confirmed. Refresh the library before publishing again.');
 return result.resource;
}

export function publicationIssues(row){
 const issues=[];
 if(!['free_forever','open_source','freemium','trial'].includes(row.pricing_model))issues.push('Choose a reviewed free access model. This publisher currently keeps paid and unknown offers as drafts.');
 if((row.short_summary||'').trim().length<60)issues.push('Write a summary of at least 60 characters.');
 if((row.editorial_description||'').trim().length<180)issues.push('Add at least 180 characters of practical details.');
 if((row.access_limits||'').trim().length<30)issues.push('Describe access limits in at least 30 characters.');
 const checked=new Date(row.source_verified_at||'').getTime();
 if(!Number.isFinite(checked)||checked>Date.now()+300000||checked<Date.now()-365*86400000)issues.push('Record an original-source check within the past year.');
 if(!row.source_urls?.length)issues.push('Add at least one original-source URL.');
 if(row.pricing_model==='open_source'&&(row.license||'').length<2)issues.push('Record the open-source license.');
 if(row.image_url&&!['official_permission','license_verified','original'].includes(row.media_rights))issues.push('Confirm permission for the image, or remove it.');
 return issues;
}

export function discoveryDraft(resource){
 const mobile=resource.kind==='Mobile app'&&resource.mobile;
 return {id:resource.id,display_name:resource.name,canonical_url:resource.url,category_id:categorySlug(resource.category),subcategory:resource.subcategory||'',resource_type:mobile?'mobile_app':resource.kind==='GitHub repository'?'github_repo':resource.kind==='Learning resource'?'learning':'website',pricing_model:({'Free':'free_forever','Open source':'open_source','Free plan':'freemium','Free trial':'trial','Paid':'paid'})[resource.pricing]||'unknown',short_summary:resource.description||'',editorial_description:resource.editorial?.details||'',access_limits:resource.free_details?.limits||'',platforms:resource.free_details?.platforms||[],source_urls:resource.editorial?.source_urls||resource.free_details?.source_urls||[resource.url],license:resource.editorial?.license||'',tags:resource.tags||[],source_verified_at:resource.editorial?.source_verified_at||null,...(mobile?{mobile:resource.mobile,mobile_platforms:resource.mobile_platforms}:{}),publication:'draft'};
}
