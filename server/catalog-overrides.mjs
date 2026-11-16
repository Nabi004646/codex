import {publicRows,publishedCard,publishedDetail} from './published.mjs';
import {countryAvailability} from '../src/country-availability.mjs';
export async function publishedOverrides(params,fetcher=fetch){
 const ids=[...new Set((params.get('ids')||'').split(',').filter(id=>/^[A-Za-z0-9_-]{1,80}$/.test(id)))].slice(0,24);
 if(!ids.length)return {resources:[]};
 const rows=await publicRows('resources',{publication:'eq.published',id:'in.('+ids.join(',')+')',select:'*',limit:'24'},fetcher);
 return {resources:rows.map(publishedCard)};
}
export async function publishedResource(params,fetcher=fetch){return {resource:await publishedDetail(params.get('id')||'',fetcher)};}
export function matchesPublicFilters(resource,params){
 const signup=resource.free_details?.signup,platforms=resource.free_details?.platforms||[],device=resource.device_details;
 for(const field of ['category','subcategory','pricing','kind'])if(params.get(field)&&resource[field]!==params.get(field))return false;
 if(params.get('platform')&&!platforms.includes(params.get('platform')))return false;
 if(params.get('signup')&&signup!==params.get('signup'))return false;
 if(params.get('reviewed')&&!resource.editorial?.source_verified_at)return false;
 if(params.get('offline')&&device?.offline!==params.get('offline'))return false;
 if(params.get('gpu')&&device?.dedicated_gpu!==params.get('gpu'))return false;
 if(params.get('ram')){const minimum=params.get('workload')?device?.workload_ram_gb?.[params.get('workload')]:device?.minimum_ram_gb;if(!Number.isFinite(minimum)||minimum>Number(params.get('ram')))return false;}
 if(params.get('mobile')){const required=params.get('mobile')==='both'?['android','ios']:[params.get('mobile')];if(!required.every(value=>resource.mobile_platforms?.includes(value)))return false;}
 const region=countryAvailability(resource,params.get('country')).status;
 return region!=='unavailable'&&(!params.get('country')||params.get('availability')!=='confirmed'||region==='available');
}
