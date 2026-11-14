import {parseAdminImport} from './admin-import.mjs';
self.onmessage=async({data})=>{try{const result=await parseAdminImport(data.text,data.name,data.category,(done,total)=>self.postMessage({type:'progress',done,total}));self.postMessage({type:'ready',...result});}catch(e){self.postMessage({type:'error',message:e.message||'This file could not be parsed.'});}};
