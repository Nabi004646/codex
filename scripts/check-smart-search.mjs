import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {queryDiscovery} from '../server/discovery-search.mjs';
import {autocomplete} from '../server/search-autocomplete.mjs';
import {catalog} from '../server/catalog.mjs';
const suggestions=JSON.parse(await fs.readFile('data/search-suggestions.json','utf8'));
const read=path=>fs.readFile('public'+path,'utf8').then(JSON.parse);
const search=(q,filters={})=>queryDiscovery(new URLSearchParams({q,...filters}),read);

test('autocomplete completes names before any results or network response',()=>{
 for(const [input,name]of [['freef','Free Fire'],['pub','PUBG MOBILE'],['gta','Grand Theft Auto V'],['shocut','Shotcut'],['photosh','Adobe Photoshop']])assert.ok(autocomplete(input,suggestions).some(x=>x.label===name),input);
 assert.ok(autocomplete('',suggestions).some(x=>x.label==='games'));
 assert.equal(autocomplete('x'.repeat(160),suggestions).length,0);
 assert.ok(autocomplete('खेल',suggestions).some(x=>x.label==='games'));
});

test('games searches include consumer games, not engines or repository matches',async()=>{
 const result=await search('games');
 assert.equal(result.total,24);
 assert.ok(result.resources.every(r=>r.kind==='Game'));
 for(const name of ['Free Fire','PUBG MOBILE','Grand Theft Auto V'])assert.ok(result.resources.some(r=>r.name===name));
});

test('free and paid offers stay separate in query intent and explicit filters',async()=>{
 const free=await search('free games'),paid=await search('paid games');
 assert.ok(free.total>10);assert.ok(free.resources.every(r=>['Free','Open source','Free plan'].includes(r.pricing)));
 assert.ok(paid.total>=4);assert.ok(paid.resources.every(r=>r.pricing==='Paid'));
 assert.equal((await search('GTA',{pricing:'Free'})).total,0);
 assert.equal((await search('free games',{pricing:'Paid'})).total,0);
});

test('PC and Android search phrases respect recorded platforms',async()=>{
 for(const [q,platform]of [['free games for pc','Windows'],['best free games for android','Android']]){
  const result=await search(q);assert.ok(result.total>0);
  assert.ok(result.resources.every(r=>r.free_details.platforms.includes(platform)));
  assert.ok(result.resources.every(r=>r.pricing!=='Paid'));
 }
 const result=await search('mobile apps');assert.ok(result.total>15);assert.ok(result.resources.every(r=>r.mobile_platforms?.length));
});

test('product aliases and confident spelling repairs return the intended product',async()=>{
 for(const [q,name]of [['freefire','Free Fire'],['PUG','PUBG MOBILE'],['gta5','Grand Theft Auto V'],['vscode','Visual Studio Code'],['shocut','Shotcut'],['photoshp','Adobe Photoshop']])assert.equal((await search(q)).resources[0]?.name,name,q);
 assert.equal((await search('shocut')).correctedQuery,'Shotcut');
 const unknown=await search('zzqxvnlnoexist');assert.equal(unknown.total,0);assert.equal(unknown.correctedQuery,undefined);
});

test('software, PDF, browser, messaging and editing searches have useful results',async()=>{
 for(const q of ['software','free software','pdf reader','browser','messaging apps','video editing','editing videos'])assert.ok((await search(q)).total>0,q);
 assert.ok((await search('free software')).resources.every(r=>r.pricing!=='Paid'&&r.pricing!=='Check terms'));
});

test('saved resource IDs, language intents and discovery terms remain available',async()=>{
 const gta=catalog.find(r=>r.name==='Grand Theft Auto V');
 assert.equal((await search('',{ids:gta.id})).resources[0]?.id,gta.id);
 assert.equal((await search('खेल')).total,24);
 assert.equal((await search('juegos')).total,24);
 assert.ok((await search('AI agents')).total>0);
 assert.ok((await search('computer vision')).total>0,'Computer vision must not become a desktop-platform filter');
 assert.ok((await search('SEO')).total>0);
});
