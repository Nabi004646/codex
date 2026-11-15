import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const manifest=JSON.parse(await fs.readFile('data/discovery-seed.parts.json','utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const parts=[];
for(const part of manifest.parts){
 if(!/^data\/catalog-seed\/seed-\d+\.part$/.test(part.path))throw Error('Unexpected catalog source path.');
 const bytes=await fs.readFile(part.path);
 if(bytes.length!==part.bytes||hash(bytes)!==part.sha256)throw Error('Catalog source part failed verification: '+part.path);
 parts.push(bytes);
}
const bytes=Buffer.concat(parts);
if(bytes.length!==manifest.bytes||hash(bytes)!==manifest.sha256)throw Error('Reassembled catalog source failed verification.');
await fs.writeFile('data/discovery-seed.json.gz',bytes);
console.log('Verified and assembled catalog source: '+bytes.length+' compressed bytes.');
