import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {test} from 'node:test';
import {keywordGuides} from '../data/keyword-guides.mjs';
import intents from '../data/keyword-intents.json' with {type:'json'};
import summaries from '../data/keyword-guide-summaries.json' with {type:'json'};
import {matchingKeywordGuide,keywordSuggestions} from '../server/keyword-routing.mjs';
import {autocomplete} from '../server/search-autocomplete.mjs';
import {publicApproval,publicApprovals} from '../server/public-approvals.mjs';
import {routeState} from '../server/routes.mjs';
import {publicRobots} from '../server/robots.mjs';

test('all supplied keyword rows are accounted for without summing duplicate exports',async()=>{
 const audit=JSON.parse(await fs.readFile('docs/keyword-research/summary.json','utf8'));
 assert.equal(audit.input_files,5);assert.equal(audit.source_rows,696);assert.equal(audit.unique_keywords,555);
 assert.equal(audit.counts.mapped+audit.counts.excluded,555);
 assert.equal(intents.reduce((n,g)=>n+g.aliases.length,0),audit.counts.mapped);
 const seen=new Set();for(const group of intents){assert.ok(publicApproval(group.path));assert.equal(routeState(group.path).status,200);assert.ok(summaries.find(s=>s.path===group.path));for(const keyword of group.aliases){assert.ok(!seen.has(keyword));seen.add(keyword);assert.equal(matchingKeywordGuide(keyword).path,group.path);}}
 assert.equal(matchingKeywordGuide('an unrelated unreviewed product'),null);
});

test('guide autocomplete gives a navigable source page for exact aliases',()=>{
 for(const q of ['mit ocw','british council learn english','free ai detector','free fire india','gta 6 pc release date','ct paid leave login','teacher pays teacher free']){
  const selected=autocomplete(q,keywordSuggestions)[0];assert.ok(selected?.path,q);assert.equal(selected.path,matchingKeywordGuide(q).path,q);
 }
});

test('each approved guide serves answer text, official links, unique social cards and matching structured data',async()=>{
 const {render}=await import('../.atlas-ssr/entry-server.js');
 const rendered=new Map();
 for(const guide of keywordGuides){
  const result=await render(guide.path,{publicDiscovery:true,hosted:true,fetcher:async()=>Response.json([])});rendered.set(guide.path,result);
  assert.equal(result.status,200);assert.equal(result.metadata.robots,'index,follow');assert.equal((result.html.match(/<h1(?:\s|>)/g)||[]).length,1);
  assert.ok(result.html.includes(guide.summary));for(const section of guide.sections)assert.ok(result.html.includes('id="'+section.id+'"'));
  assert.ok(guide.sources.every(s=>s.startsWith('https://')));assert.ok(guide.sources.length>0);
  for(const other of guide.related)assert.ok(keywordGuides.find(g=>g.slug===other),other);
  const graph=result.metadata.schema['@graph'],article=graph.find(n=>n['@type']==='Article');assert.equal(article.url,'https://freeresourceatlas.com'+guide.path);assert.deepEqual(article.citation,guide.sources);assert.ok(article.author.url.endsWith('/authors/nabin-kunwar'));
  const faq=graph.find(n=>n['@type']==='FAQPage');if(faq)for(const q of faq.mainEntity)assert.ok(guide.sections.some(s=>s.title===q.name&&s.answer===q.acceptedAnswer.text));
  assert.ok(result.head.includes('og:image:width'));assert.ok(result.head.includes('twitter:image:alt'));assert.ok(result.head.includes('/social/'+guide.slug+'.png'));
  const png=await fs.readFile('dist/pages/social/'+guide.slug+'.png');assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 }
 const hub=await render('/games/gta-6',{publicDiscovery:true});rendered.set('/games/gta-6',hub);
 const index=await render('/guides',{publicDiscovery:true});rendered.set('/guides',index);for(const guide of keywordGuides)assert.ok(index.html.includes('href="'+guide.path+'"'));
 // Check every distinct fragment in the detailed audit, not just representative keywords.
 const coverage=await fs.readFile('docs/keyword-research/keyword-coverage-unique.csv','utf8');for(const match of coverage.matchAll(/(\/games\/gta-6#[a-z-]+)/g)){const [path,fragment]=match[1].split('#');assert.ok(rendered.get(path).html.includes('id="'+fragment+'"'),match[1]);}
 assert.ok(hub.head.includes('Official Grand Theft Auto VI artwork'));assert.ok(!hub.head.includes('aggregateRating'));
 const staging=await render(keywordGuides[0].path);assert.equal(staging.metadata.robots,'noindex,nofollow');
});

test('AI search crawling keeps private boundaries and does not block public guide text',()=>{
 const robots=publicRobots();assert.ok(robots.includes('User-agent: OAI-SearchBot'));
 for(const group of robots.split(/\n\n/).filter(g=>g.startsWith('User-agent:'))){assert.ok(group.includes('Disallow: /admin'));assert.ok(group.includes('Disallow: /api/'));assert.ok(!group.includes('Disallow: /guides'));}
 assert.equal(new Set(publicApprovals.map(p=>p.path)).size,publicApprovals.length);
});
