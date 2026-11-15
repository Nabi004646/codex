// Restore the reviewed source checkpoint without Python, third-party archive
// packages, network calls, Storage uploads or changes to publication state.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'data/template-source.parts.json'),'utf8'));
const metadata=JSON.parse(await fs.readFile(path.join(root,'data/template-drafts.json'),'utf8'));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const fail=message=>{throw Error(message);};
if(manifest.version!==1||manifest.encoding!=='tar+gzip'||manifest.format!=='ustar'||manifest.metadata!=='data/template-drafts.json'||manifest.destination!=='outputs/atlas-templates-20261113')fail('Unsupported template source manifest.');
if(!Array.isArray(metadata)||metadata.length!==100||manifest.resources!==100||new Set(metadata.map(r=>r.id)).size!==100)fail('Expected 100 distinct template records.');
if(!Array.isArray(manifest.parts)||manifest.parts.length<1||manifest.parts.length>32||!Number.isSafeInteger(manifest.bytes)||manifest.bytes<1||manifest.bytes>32*1024*1024||!Number.isSafeInteger(manifest.tar_bytes)||manifest.tar_bytes<1||manifest.tar_bytes>64*1024*1024)fail('Template archive exceeds its source budget.');

const inventory=[];
for(const record of metadata){
 if(!Array.isArray(record.files)||!record.files.some(f=>f.format==='pdf')||!record.files.some(f=>['docx','xlsx'].includes(f.format)))fail('A template is missing its editable or PDF source.');
 for(const file of record.files){
  const name=file.object_path;
  if(typeof name!=='string'||!/^templates\/[a-z0-9/_-]+\.(?:docx|xlsx|pdf|csv)$/.test(name)||name.split('/').includes('..')||file.local_path!==manifest.destination+'/'+name||!Number.isSafeInteger(file.bytes)||file.bytes<1||! /^[a-f0-9]{64}$/.test(file.sha256))fail('Invalid registered template path or checksum.');
  inventory.push({path:name,bytes:file.bytes,sha256:file.sha256});
 }
}
inventory.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
if(inventory.length!==240||manifest.files!==240||new Set(inventory.map(f=>f.path)).size!==240||inventory.reduce((n,f)=>n+f.bytes,0)!==manifest.asset_bytes||hash(JSON.stringify(inventory))!==manifest.inventory_sha256)fail('Registered template inventory does not match the pinned source.');
const expected=new Map(inventory.map(f=>[f.path,f])),chunks=[];
for(const [index,part]of manifest.parts.entries()){
 if(part.path!=='data/template-source/part-'+String(index).padStart(3,'0')+'.bin'||!Number.isSafeInteger(part.bytes)||part.bytes<1||part.bytes>1_500_000)fail('Unexpected template source part.');
 const bytes=await fs.readFile(path.join(root,part.path));
 if(bytes.length!==part.bytes||hash(bytes)!==part.sha256)fail('Template source part failed verification: '+part.path);
 chunks.push(bytes);
}
const compressed=Buffer.concat(chunks);
if(compressed.length!==manifest.bytes||hash(compressed)!==manifest.sha256)fail('Reassembled template source failed verification.');
const archive=gunzipSync(compressed,{maxOutputLength:manifest.tar_bytes});
if(archive.length!==manifest.tar_bytes||archive.length%512)fail('Invalid template archive size.');
const text=(header,start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
const octal=value=>{const s=value.trim();if(!/^[0-7]+$/.test(s))fail('Invalid USTAR number.');const n=Number.parseInt(s,8);if(!Number.isSafeInteger(n)||n<0)fail('Invalid USTAR size.');return n;};
const assets=new Map();let offset=0,ended=false;
while(offset+512<=archive.length){
 const header=archive.subarray(offset,offset+512);
 if(header.every(b=>b===0)){if(archive.subarray(offset).some(b=>b!==0))fail('Unexpected data after archive terminator.');ended=true;break;}
 if(text(header,257,6)!=='ustar'||!['\0','0'].includes(String.fromCharCode(header[156])))fail('Only regular USTAR template files are allowed.');
 let checksum=0;for(let i=0;i<512;i++)checksum+=i>=148&&i<156?32:header[i];
 if(octal(text(header,148,8))!==checksum)fail('Template archive header checksum mismatch.');
 const prefix=text(header,345,155),name=(prefix?prefix+'/':'')+text(header,0,100),file=expected.get(name),size=octal(text(header,124,12));
 if(!file||assets.has(name)||size!==file.bytes||offset+512+size>archive.length)fail('Unexpected, duplicate or damaged template archive entry.');
 const bytes=archive.subarray(offset+512,offset+512+size);
 if(hash(bytes)!==file.sha256)fail('Template content checksum mismatch: '+name);
 if(name.endsWith('.pdf')&&bytes.subarray(0,5).toString()!=='%PDF-')fail('PDF signature mismatch.');
 if(/\.(?:docx|xlsx)$/.test(name)&&!bytes.subarray(0,4).equals(Buffer.from([80,75,3,4])))fail('Office file signature mismatch.');
 assets.set(name,bytes);offset+=512+Math.ceil(size/512)*512;
}
if(!ended||assets.size!==inventory.length)fail('Template archive is incomplete.');

// Resolve only registered destinations, refuse symlink traversal, and preserve
// edited files. A clean checkout restores all files; a rerun verifies them.
async function directory(relative){
 let current=root;
 for(const segment of relative.split('/')){
  if(!segment||segment==='.'||segment==='..')fail('Unsafe template output directory.');current=path.join(current,segment);
  let stat;try{stat=await fs.lstat(current);}catch(error){if(error.code!=='ENOENT')throw error;await fs.mkdir(current);stat=await fs.lstat(current);}
  if(stat.isSymbolicLink()||!stat.isDirectory())fail('Template output must use real directories.');
 }
 return current;
}
await directory(manifest.destination);
let restored=0;
for(const file of inventory){
 const relative=manifest.destination+'/'+file.path,target=path.join(root,relative);await directory(path.posix.dirname(relative));
 let stat;try{stat=await fs.lstat(target);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(stat){if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==file.bytes||hash(await fs.readFile(target))!==file.sha256)fail('Existing template differs from the pinned draft; preserve your edits before restoring: '+relative);continue;}
 const temporary=target+'.'+crypto.randomUUID()+'.tmp';
 try{await fs.writeFile(temporary,assets.get(file.path),{flag:'wx',mode:0o644});await fs.rename(temporary,target);restored++;}finally{await fs.rm(temporary,{force:true});}
}
for(const file of inventory){const bytes=await fs.readFile(path.join(root,manifest.destination,file.path));if(bytes.length!==file.bytes||hash(bytes)!==file.sha256)fail('Restored template verification failed: '+file.path);}
console.log('Verified 100 draft templates / 240 native files ('+manifest.asset_bytes+' bytes); restored '+restored+'. No Storage upload or publication performed.');
