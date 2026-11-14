import manifest from '../data/discovery-snapshots.json' with {type:'json'};
import {discoveryKey} from './discovery-query-key.mjs';
export async function discoverySnapshot(params,read){
 const file=manifest.snapshots?.[discoveryKey(params)];
 if(file)return read(manifest.root+'/'+file);
 return {resources:[],total:0,totalCatalog:manifest.total,page:1,pages:1,categories:manifest.categories,suggestions:[],catalogMode:'discovery',catalogLabel:'discovered listings',clientRequired:true,discoveryVersion:manifest.version};
}
