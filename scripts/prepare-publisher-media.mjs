import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import previews from '../data/publisher-previews.json' with {type:'json'};
const runtime={};let files=0,bytes=0;
for(const [url,preview]of Object.entries(previews)){
 if(preview.unavailable){runtime[url]={unavailable:true,source_url:preview.source_url,notice:preview.notice};continue;}
 for(const variant of preview.variants){if(!/^\/publisher-media\/[a-z0-9-]+\.webp$/.test(variant.path))throw Error('Invalid publisher media path');const buffer=await fs.readFile('public'+variant.path);if(buffer.length!==variant.bytes||createHash('sha256').update(buffer).digest('hex')!==variant.sha256)throw Error('Publisher preview integrity mismatch: '+variant.path);files++;bytes+=buffer.length;}
 runtime[url]={src:preview.src,srcset:preview.srcset,image_kind:preview.image_kind,source_url:preview.source_url};
}
await fs.writeFile('data/publisher-preview-runtime.json',JSON.stringify(runtime)+'\n');
console.log('Verified '+Object.keys(runtime).length+' publisher media records / '+files+' WebP files ('+bytes+' bytes); prepared a lean browser map.');
