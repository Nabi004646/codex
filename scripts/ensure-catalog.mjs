// Local dev can reuse a prepared index; production builds always regenerate it.
import fs from 'node:fs/promises';
const inputs=['server/catalog.mjs','data/editorial-catalog.mjs','data/consumer-catalog.mjs','data/preview-resources.json','data/starter-facts.json','data/device-facts.json','data/taxonomy.json','data/discovery-seed.parts.json','server/discovery-codec.mjs','server/discovery-search.mjs','server/search-intents.mjs','server/search-autocomplete.mjs','server/search-language-aliases.mjs','scripts/prepare-discovery.mjs','scripts/prepare-discovery-snapshots.mjs'];
let prepared=false;
try{
 const manifest=JSON.parse(await fs.readFile('data/discovery-manifest.json','utf8'));
 const generated=(await fs.stat('data/discovery-manifest.json')).mtimeMs;
 const parts=JSON.parse(await fs.readFile('data/discovery-seed.parts.json','utf8'));
 const files=[...inputs,...(parts.parts||[]).map(p=>p.path)];
 const timestamps=await Promise.all(files.map(p=>fs.stat(p).then(s=>s.mtimeMs)));
 await Promise.all(['public'+manifest.root+'/filters.json','data/search-suggestions.json','data/discovery-runtime.json','data/discovery-snapshots.json'].map(p=>fs.access(p)));
 prepared=timestamps.every(value=>value<=generated);
}catch{}
if(prepared)console.log('Reusing prepared catalog for local development.');
else{await import('./prepare-seed.mjs');await import('./prepare-catalog.mjs');}
