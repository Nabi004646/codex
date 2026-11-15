import {alternativeGuides} from '../data/alternatives-guides.mjs';
import {audienceHubs} from '../data/audience-hubs.mjs';
const ORIGIN='https://freeresourceatlas.com',REVIEWED='2026-11-15T00:00:00.000Z';
const record=(path,title,description,evidence)=>({path,title,description,locale:'en',publication:'published',index_intent:'index',canonical_url:ORIGIN+path,last_meaningful_change:REVIEWED,reviewed_at:REVIEWED,review_type:'Original editorial content and source documentation reviewed; no hands-on benchmark claimed',evidence});
export const publicApprovals=[
 record('/','FreeResourceAtlas — useful apps, games and free resources','Find apps, games, software and learning resources. Check access labels, recorded platforms, original sources and practical workflow guides.',['server/catalog.mjs','data/discovery-manifest.json']),
 record('/about','About FreeResourceAtlas and its maintainer','Learn how FreeResourceAtlas separates discovered listings, documented facts and reviewed content while helping people choose useful resources.',['server/public-content.mjs']),
 record('/sources','Resource sources, access labels and review methods','Understand source attribution, free and paid access labels, platform evidence and the limits of documentation-based reviews.',['server/public-content.mjs','data/discovery-credits.json']),
 record('/authors/nabin-kunwar','Nabin Kunwar — FreeResourceAtlas maintainer','Meet the developer and cybersecurity student maintaining FreeResourceAtlas and read the basis and limits of its editorial reviews.',['src/PublicPages.tsx']),
 record('/alternatives','Free alternatives by product and workflow','Compare documented free alternatives to popular software, with specific use cases, migration trials and file compatibility limitations.',['data/alternatives-guides.mjs']),
 ...alternativeGuides.map(g=>record('/alternatives/'+g.slug,'Free alternatives to '+g.name,g.intro,['data/alternatives-guides.mjs',...g.alternatives.flatMap(a=>a.source_urls)])),
 ...audienceHubs.map(h=>record(h.path,h.title,h.description,['data/audience-hubs.mjs',...h.sources.map(s=>s.url)])),
 record('/games/gta-6','GTA 6 release date, platforms and official links','Follow the announced Grand Theft Auto VI console release, original Rockstar artwork, confirmed platforms and official game and purchase pages.',['data/gta6-release.json','https://www.rockstargames.com/VI'])
];
export function publicApproval(path,locale='en'){const u=new URL(path,ORIGIN);if(u.origin!==ORIGIN||u.search||locale!=='en')return null;return publicApprovals.find(r=>r.path===u.pathname)||null;}
export function publicInventory(){return {reviewed_at:REVIEWED,approved_urls:publicApprovals.length,google_indexed:null,google_status:'Not connected; sitemap inclusion does not confirm indexing',pages:publicApprovals.map(({path,canonical_url,last_meaningful_change,title})=>({path,canonical_url,last_meaningful_change,title}))};}
