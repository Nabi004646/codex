import fs from 'node:fs';
import path from 'node:path';
import {createLoader} from '../source-baseline/nepocore-library/scripts/test-support.mjs';
const load=createLoader();
const {resourceIllustration}=load(path.resolve('source-baseline/nepocore-library/lib/illustrations.ts'));
const previews=JSON.parse(fs.readFileSync('data/preview-resources.json'));
fs.mkdirSync('public/previews',{recursive:true});
for (const resource of previews) fs.writeFileSync('public/previews/atlas-'+resource.id+'.svg',resourceIllustration(resource));
console.log('Prepared '+previews.length+' source-derived staging illustrations. No hosted upload.');
