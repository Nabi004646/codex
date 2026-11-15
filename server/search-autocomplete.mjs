import {normalize} from './discovery-codec.mjs';
import {editDistance,productAliases,searchPlan} from './search-intents.mjs';
export function autocomplete(query,entries,limit=8){
 const q=normalize(query).slice(0,160),canonical=productAliases[q]||searchPlan(q,normalize).text;
 if(!q)return entries.filter(e=>e.popular).slice(0,6);
 const tokens=canonical.split(' '),ranked=[];
 for(const entry of entries){
  const label=normalize(entry.label),aliases=(entry.aliases||[]).map(normalize),text=[label,...aliases].join(' ');
  let score=0;
  if(label===canonical||aliases.includes(q))score=200;
  else if(label.startsWith(q))score=140;
  else if(aliases.some(a=>a.startsWith(q)))score=110;
  else if(tokens.every(t=>text.split(' ').some(w=>w.startsWith(t))))score=80;
  else if(q.length>=3&&tokens.length<=4){const d=Math.min(...[label,...aliases].filter(v=>Math.abs(v.length-canonical.length)<=2).map(v=>editDistance(canonical,v)));if(d<=(q.length>=6?2:1))score=45-d*5;}
  if(score)ranked.push({entry,score:score+(entry.curated?12:0)});
 }
 ranked.sort((a,b)=>b.score-a.score||a.entry.label.length-b.entry.label.length||a.entry.label.localeCompare(b.entry.label));
 const seen=new Set();return ranked.filter(({entry})=>{const key=normalize(entry.label);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,limit).map(x=>x.entry);
}
