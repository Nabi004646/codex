import intents from '../data/keyword-intents.json' with {type:'json'};
// Compact titles stay in the browser; guide prose remains server rendered per page.
import summaries from '../data/keyword-guide-summaries.json' with {type:'json'};
const clean=s=>String(s||'').normalize('NFKC').replace(/\u200b/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const entries=intents.map(i=>({...i,...summaries.find(g=>g.path===i.path),aliases:i.aliases.map(clean)}));
export function matchingKeywordGuide(query){const q=clean(query);if(q.length<2)return null;return entries.find(e=>e.aliases.includes(q))||null;}
export const keywordSuggestions=entries.map(e=>({label:e.title,path:e.path,kind:'Resource guide',aliases:e.aliases,curated:true}));
