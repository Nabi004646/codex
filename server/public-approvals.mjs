import {alternativeGuides} from '../data/alternatives-guides.mjs';
import {audienceHubs} from '../data/audience-hubs.mjs';
import {articles,kits} from './public-content.mjs';
import {quickTemplates} from '../data/quick-templates.mjs';
import {workspaceHelp} from '../data/workspace-help.mjs';
const ORIGIN='https://freeresourceatlas.com',REVIEWED='2026-11-16T00:00:00.000Z';
const record=(path,title,description,evidence)=>({path,title,description,locale:'en',publication:'published',index_intent:'index',canonical_url:ORIGIN+path,last_meaningful_change:REVIEWED,reviewed_at:REVIEWED,review_type:'Original editorial content and source documentation reviewed; no hands-on benchmark claimed',evidence});
export const publicApprovals=[
 record('/','FreeResourceAtlas — useful apps, games and free resources','Find apps, games, software and learning resources. Check access labels, recorded platforms, original sources and practical workflow guides.',['server/catalog.mjs','data/discovery-manifest.json']),
 record('/about','About FreeResourceAtlas and its maintainer','Learn how FreeResourceAtlas separates discovered listings, documented facts and reviewed content while helping people choose useful resources.',['server/public-content.mjs']),
 record('/sources','Resource sources, access labels and review methods','Understand source attribution, free and paid access labels, platform evidence and the limits of documentation-based reviews.',['server/public-content.mjs','data/discovery-credits.json']),
 record('/authors/nabin-kunwar','Nabin Kunwar — FreeResourceAtlas maintainer','Meet the developer and cybersecurity student maintaining FreeResourceAtlas and read the basis and limits of its editorial reviews.',['src/PublicPages.tsx']),
 record('/alternatives','Free alternatives by product and workflow','Compare documented free alternatives to popular software, with specific use cases, migration trials and file compatibility limitations.',['data/alternatives-guides.mjs']),
 ...alternativeGuides.map(g=>record('/alternatives/'+g.slug,'Free alternatives to '+g.name,g.intro,['data/alternatives-guides.mjs',...g.alternatives.flatMap(a=>a.source_urls)])),
 ...audienceHubs.map(h=>record(h.path,h.title,h.description,['data/audience-hubs.mjs',...h.sources.map(s=>s.url)])),
 record('/games/gta-6','GTA 6 release date, platforms and official links','Follow the announced Grand Theft Auto VI console release, original Rockstar artwork, confirmed platforms and official game and purchase pages.',['data/gta6-release.json','https://www.rockstargames.com/VI']),
 record('/collections','Resource collections by topic','Browse useful collections for creating, developing, studying and everyday work. Follow original sources and check each resource’s access conditions.',['server/public-content.mjs','data/taxonomy.json']),
 record('/blog','Practical guides for apps, free tools and useful projects','Follow original, source-linked guides for safer app choices, accessible web projects, research, video, documents and choosing free software.',['server/public-content.mjs','data/additional-articles.mjs']),
 record('/guides','Start with one useful resource','Choose a useful guide, check its evidence, complete a small project and keep an editable result or reproducible record of your work.',['server/public-content.mjs','src/PublicPages.tsx']),
 ...articles.filter(a=>a.state==='published'&&a.source_checked_at&&a.sources.length>=3).map(a=>record('/blog/'+a.slug,a.title,a.description,['server/public-content.mjs','data/additional-articles.mjs',...a.sources])),
 record('/kits','Project starter kits for useful small projects','Choose a short project, inspect the suggested resources and work toward one deliverable with a concrete finish check.',['server/public-content.mjs','data/audience-hubs.mjs']),
 ...kits.map(k=>record('/kits/'+k.slug,k.title,k.description,['server/public-content.mjs',k.guide_path||'/blog/'+k.guide])),
 ...quickTemplates.map(t=>record('/templates/quick/'+t.slug,t.title,t.purpose,['data/quick-templates.mjs','src/TemplateWorkbench.tsx'])),
 ...Object.entries(workspaceHelp).map(([type,help])=>record('/'+type,({workflows:'Build a practical resource workflow',selector:'Choose resources by task and platform',finder:'Find resources for your task',widgets:'Embed a curated resource list'})[type],help.description,['data/workspace-help.mjs','src/'+({workflows:'WorkflowPage',selector:'SelectorPage',finder:'TaskFinder',widgets:'WidgetsPage'})[type]+'.tsx'])),
 record('/low-spec-tools','Choose tools for a basic laptop','Compare recorded platform and workload requirements, understand unknowns, and plan a small trial for your actual laptop rather than trusting vague performance badges.',['data/device-facts.json','src/PublicPages.tsx'])
];
export function publicApproval(path,locale='en'){const u=new URL(path,ORIGIN);if(u.origin!==ORIGIN||u.search||locale!=='en')return null;return publicApprovals.find(r=>r.path===u.pathname)||null;}
export function publicInventory(){return {reviewed_at:REVIEWED,approved_urls:publicApprovals.length,google_indexed:null,google_status:'Not connected; sitemap inclusion does not confirm indexing',pages:publicApprovals.map(({path,canonical_url,last_meaningful_change,title})=>({path,canonical_url,last_meaningful_change,title}))};}
