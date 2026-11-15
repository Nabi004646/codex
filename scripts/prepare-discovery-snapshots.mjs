import fs from 'node:fs/promises';import crypto from 'node:crypto';
import {discoveryKey} from '../server/discovery-query-key.mjs';
const path='data/discovery-manifest.json',manifest=JSON.parse(await fs.readFile(path,'utf8'));
const runtimeBase={...manifest};delete runtimeBase.files;delete runtimeBase.source_manifest;delete runtimeBase.snapshots;
await fs.writeFile('data/discovery-runtime.json',JSON.stringify(runtimeBase));
const {queryDiscovery}=await import('../server/discovery-search.mjs');
const read=pathname=>fs.readFile('public'+pathname,'utf8').then(JSON.parse),queries=[new URLSearchParams()];
for(const c of manifest.categories){queries.push(new URLSearchParams({category:c.name}));for(const sub of c.subcategories)queries.push(new URLSearchParams({category:c.name,subcategory:sub.name}));}
for(const q of ['SEO','reels','earn money','make money','AI','automation','finance','fitness','video editing','Shotcut','free domain','business','python','javascript','react','design','free hosting','privacy','android','ios','apps','app','mobile apps'])queries.push(new URLSearchParams({q}));
for(const kind of ['GitHub repository','Website','Learning resource','Code example','Asset collection','Mobile app'])queries.push(new URLSearchParams({kind}));
for(const pricing of ['Free','Open source','Free plan','Check terms'])queries.push(new URLSearchParams({pricing}));
queries.push(new URLSearchParams({reviewed:'1'}));
const snapshots={};let bytes=0;manifest.files=manifest.files.filter(f=>!f.name.startsWith('snapshot-'));
for(const p of queries){const key=discoveryKey(p),value=await queryDiscovery(p,read),file='snapshot-'+crypto.createHash('sha256').update(key).digest('hex').slice(0,16)+'.json',text=JSON.stringify(value);await fs.writeFile('public'+manifest.root+'/'+file,text);snapshots[key]=file;bytes+=Buffer.byteLength(text);manifest.files.push({name:file,bytes:Buffer.byteLength(text),sha256:crypto.createHash('sha256').update(text).digest('hex')});}
manifest.snapshots=snapshots;await fs.writeFile(path,JSON.stringify(manifest));
const {files,source_manifest,...runtime}=manifest;delete runtime.snapshots;
await fs.writeFile('data/discovery-runtime.json',JSON.stringify(runtime));
await fs.writeFile('data/discovery-snapshots.json',JSON.stringify({root:manifest.root,total:manifest.total,version:manifest.version,categories:manifest.categories,snapshots}));
await fs.writeFile('data/discovery-credits.json',JSON.stringify({source_manifest}));
console.log(JSON.stringify({snapshots:Object.keys(snapshots).length,bytes,root:manifest.root}));
