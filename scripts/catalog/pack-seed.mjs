import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const bytes=await fs.readFile('data/discovery-seed.json.gz');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const size=7864320,parts=[];
await fs.mkdir('data/catalog-seed',{recursive:true});
for(let offset=0,index=1;offset<bytes.length;offset+=size,index++){
 const part=bytes.subarray(offset,offset+size),path='data/catalog-seed/seed-'+String(index).padStart(2,'0')+'.part';
 await fs.writeFile(path,part);parts.push({path,bytes:part.length,sha256:hash(part)});
}
await fs.writeFile('data/discovery-seed.parts.json',JSON.stringify({encoding:'gzip',bytes:bytes.length,sha256:hash(bytes),parts},null,2)+'\n');
console.log('Pinned '+parts.length+' source parts; full SHA-256 '+hash(bytes));
