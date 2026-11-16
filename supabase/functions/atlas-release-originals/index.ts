import {unzipSync} from 'npm:fflate@0.8.2';
import {createReleaseHandler} from './core.mjs';
const key=(name:string,legacy:string)=>{try{return JSON.parse(Deno.env.get(name)||'{}').default||Deno.env.get(legacy)||'';}catch{return '';}};
// Filled from the verified v2 source archive before deployment.
const packSha='87a5e7140b03d8c4137792c710ca09b609bec68b8b92641ef828dc1a6048f818';
Deno.serve(createReleaseHandler({base:(Deno.env.get('SUPABASE_URL')||'').replace(/\/$/,''),secret:key('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY'),legacy:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',publishable:key('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),packSha,unzip:unzipSync}));
