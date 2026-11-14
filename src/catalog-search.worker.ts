import {queryDiscovery} from '../server/discovery-search.mjs';
import {boundedFetch} from './network.mjs';
const read=async(path:string)=>{const response=await boundedFetch(path);if(!response.ok)throw Error('A catalog file could not load. Please try again.');return response.json();};
self.onmessage=async({data})=>{try{const result=await queryDiscovery(new URLSearchParams(data.params),read);self.postMessage({id:data.id,result});}catch(error:any){self.postMessage({id:data.id,error:error?.message||'The catalog could not load.'});}};
