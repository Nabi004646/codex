import starterFacts from '../data/starter-facts.json';
import type {Resource} from './types';
import type {FreeDetails} from './feature-types';
export const PLATFORMS=['Web','Linux','Windows','macOS','Android','iOS','Self-hosted'];
export const EMPTY_FREE_DETAILS:FreeDetails={access_model:'Unknown',signup:'Unknown',credit_card:'Unknown',platforms:[],limits:'',requirements:'',cost_notes:'',reviewed_on:'',source_urls:[]};
export function resourceFacts(resource:Resource):FreeDetails{const candidate=(starterFacts as Record<string,FreeDetails & {url:string}>)[resource.id],curated=candidate?.url===resource.url?candidate:undefined,details=resource.free_details||curated;return {...EMPTY_FREE_DETAILS,...details,platforms:details?.platforms||[],source_urls:details?.source_urls||[]};}
export function accessFacts(resource:Resource){const f=resourceFacts(resource);return [f.access_model!=='Unknown'?f.access_model:resource.pricing,f.platforms.join(', ')||'Platforms not reviewed',f.signup==='Unknown'?'Account requirement not reviewed':f.signup==='Required'?'Account required':'No account required'];}
