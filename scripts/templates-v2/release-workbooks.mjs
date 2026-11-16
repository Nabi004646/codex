import fs from 'node:fs/promises';
import path from 'node:path';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root=process.argv[2],base=path.join(root,'outputs/atlas-templates-20261116');
const originals=JSON.parse(await fs.readFile(path.join(root,'data/template-drafts.json'),'utf8'));
const jobs=originals.flatMap(t=>t.files.filter(f=>f.format==='xlsx').map(f=>({id:t.id,source:path.join(root,f.local_path),target:path.join(base,f.object_path.replace('/v1/','/v2/')),changes:[{sheetXml:'xl/worksheets/sheet1.xml',cell:'A28'}]})));
await fs.mkdir(path.join(base,'workbook-qa'),{recursive:true});
const notice='Original FreeResourceAtlas template. Version 2. Keep a blank copy. Copy an existing row with its formulas for another record. CC BY 4.0: credit FreeResourceAtlas and indicate your changes. https://creativecommons.org/licenses/by/4.0/';
for(const job of jobs){
 const workbook=await SpreadsheetFile.importXlsx(await FileBlob.load(job.source));
 const sheet=workbook.worksheets.getItemAt(0),name=sheet.name;
 const before=sheet.getRange('A1:Q30').formulas;
 const render=async suffix=>{const image=await workbook.render({sheetName:name,range:'A25:L31',scale:1,format:'png'});await fs.writeFile(path.join(base,'workbook-qa',String(job.id).padStart(3,'0')+'-'+suffix+'.png'),new Uint8Array(await image.arrayBuffer()));};
 await render('before');
 for(const change of job.changes){if(change.sheetXml!=='xl/worksheets/sheet1.xml')throw Error('Review additional sheet');sheet.getRange(change.cell).values=[[notice]];}
 workbook.recalculate();
 if(JSON.stringify(before)!==JSON.stringify(sheet.getRange('A1:Q30').formulas))throw Error('A formula changed: '+job.id);
 const errors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},maxChars:1500});
 if(/"kind":"match"/.test(errors.ndjson))throw Error('Check formula errors: '+job.id+' '+errors.ndjson);
 await render('after');
 await fs.mkdir(path.dirname(job.target),{recursive:true});const output=await SpreadsheetFile.exportXlsx(workbook);await output.save(job.target);
 console.log('XLSX '+job.id+' · release notice updated; formulas preserved');
}
