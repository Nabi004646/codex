import {CatalogInputError} from './discovery-query-key.mjs';
const countries=['','US','GB','CA','AU','IN','NP'];
export function taskQuery(statement,{country='',includeCommunity=false}={}){
 if(typeof statement!=='string'||statement.trim().length<3||statement.length>240)throw new CatalogInputError('Describe a task in 3–240 characters.');if(!countries.includes(country))throw new CatalogInputError('Choose a supported country preference.');
 const p=new URLSearchParams(),input=statement.normalize('NFKC').trim();if(country)p.set('country',country);
 if(/\b(no[- ]?sign[- ]?up|without (?:an? )?(?:account|signing up)|no account)\b/i.test(input))p.set('signup','Not required');
 let platform=['Android','iOS','Linux','Windows','macOS'].find(v=>new RegExp('\\b'+v+'\\b','i').test(input));if(!platform&&/\b(iphone|ipad)\b/i.test(input))platform='iOS';if(!platform&&/\bmac\b/i.test(input))platform='macOS';if(platform)p.set('platform',platform);
 if(/\boffline\b/i.test(input))p.set('offline','Yes');if(/\bopen[- ]source\b/i.test(input))p.set('pricing','Open source');else if(/\bfree\b/i.test(input)&&!includeCommunity)p.set('pricingGroup','free');
 let q=input.replace(/\b(?:i (?:need|want)|help me (?:find|with)|looking for|a tool (?:for|to)|no[- ]?sign[- ]?up|without (?:an? )?(?:account|signing up)|no account|on (?:my )?(?:android|ios|iphone|ipad|linux|windows|macos|mac)|offline|open[- ]source)\b/gi,' ').replace(/\b(android|ios|iphone|ipad|linux|windows|macos|mac)\b/gi,' ').replace(/\s+/g,' ').trim();
 q=q.replace(/^[,.:\s-]+|[,.:\s-]+$/g,'').slice(0,160);p.set('q',q);if(!includeCommunity)p.set('reviewed','1');return p;
}
export function taskResult(params,result,{source='catalog'}={}){
 const free=new Set(['Free','Open source','Free plan']),records=result.resources.filter(r=>params.get('pricingGroup')!=='free'||free.has(r.pricing));
 return {query:params.get('q'),filters:Object.fromEntries(params),matches:records.map(r=>({id:r.id,name:r.name,url:r.url,description:r.description,pricing:r.pricing,discovery:!!r.discovery,reviewed_on:r.editorial?.source_verified_at||null,why:[r.subcategory?'Listed for '+r.subcategory:'Listed under '+r.category,params.has('platform')?'Recorded platform: '+params.get('platform'):null,params.has('signup')?'Account recorded as not required':null].filter(Boolean),limits:r.free_details?.limits||'Check the original provider’s current conditions.'})),method:params.has('reviewed')?'Rules extract explicit constraints and retrieve source-reviewed entries. No external AI model is called.':'Rules match catalog metadata. Entries marked Check terms have not had their current access conditions reviewed.',availability:params.has('country')?'Country availability has not been reviewed for these matches; worldwide candidates are shown.':'Worldwide browsing; check the provider for availability.',source,search_url:'/?'+params.toString(),has_more:result.hasMore||result.pages>1};
}
export async function findTask(statement,search,options={}){const params=taskQuery(statement,options);return taskResult(params,await search(params));}
