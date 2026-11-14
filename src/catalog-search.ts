import manifest from '../data/discovery-snapshots.json';
import {discoveryKey} from '../server/discovery-query-key.mjs';
import {boundedFetch} from './network.mjs';
let worker:Worker|null=null,sequence=0;
const pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void;cleanup:()=>void}>();
function getWorker(){if(worker)return worker;worker=new Worker(new URL('./catalog-search.worker.ts',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const item=pending.get(data.id);if(!item)return;pending.delete(data.id);item.cleanup();data.error?item.reject(Error(data.error)):item.resolve(data.result);};worker.onerror=()=>{for(const item of pending.values()){item.cleanup();item.reject(Error('Catalog search could not start. Please try again.'));}pending.clear();worker?.terminate();worker=null;};return worker;}
export async function searchCatalog(params:URLSearchParams,{signal}:{signal?:AbortSignal}={}){
 if((window as any).__ATLAS_PAGE__?.catalogMode!=='discovery'&&(window as any).__ATLAS_PAGE__?.result?.catalogMode!=='discovery'){const response=await boundedFetch('/api/resources?'+params,{signal});const result=await response.json();if(!response.ok)throw Error(result.error||'Resources could not load.');return result;}
 const snapshot=(manifest.snapshots as Record<string,string>)[discoveryKey(params)];
 if(snapshot){const response=await boundedFetch(manifest.root+'/'+snapshot,{signal});if(!response.ok)throw Error('The catalog could not load. Please try again.');return response.json();}
 if(signal?.aborted)throw new DOMException('Search cancelled.','AbortError');
 const active=getWorker(),id=++sequence;
 return new Promise((resolve,reject)=>{const cancel=()=>{const entry=pending.get(id);if(!entry)return;pending.delete(id);entry.cleanup();reject(new DOMException('Search cancelled.','AbortError'));};const timer=setTimeout(()=>{pending.delete(id);signal?.removeEventListener('abort',cancel);reject(Error('Search took too long. Check your connection and try again.'));},20000);pending.set(id,{resolve,reject,cleanup:()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}});signal?.addEventListener('abort',cancel,{once:true});active.postMessage({id,params:params.toString()});});
}
