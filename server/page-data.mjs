import {audienceHubs} from '../data/audience-hubs.mjs';
import {alternativeGuides} from '../data/alternatives-guides.mjs';
import {templateData} from './templates.mjs';
import {articles,kits,policies} from './public-content.mjs';
import {catalog} from './catalog.mjs';
const summaries=articles.map(({slug,title,description,category,resourceNames,created_at})=>({slug,title,description,category,resourceNames,created_at,cover_url:'/article-covers/'+slug+'.svg'}));
const resources=names=>names.map(n=>catalog.find(r=>r.name===n)).filter(Boolean);
export function publicData(path,params={}){
 if(path==='/selector')return {path,type:'selector',resources:catalog.filter(r=>['Free','Open source','Free plan'].includes(r.pricing))};if(path==='/widgets')return {path,type:'widgets'};
 const hub=audienceHubs.find(h=>h.path===path);if(hub)return {path,type:'audience-hub',hub,resources:hub.resourceNames.map(name=>catalog.find(r=>r.name===name)).filter(Boolean)};
 if(path==='/alternatives'||path.startsWith('/alternatives/')){const guide=alternativeGuides.find(g=>'/alternatives/'+g.slug===path);return {path,type:'alternative-guides',guides:alternativeGuides.map(({slug,name,aliases,intro})=>({slug,name,aliases,intro})),guide,resources:guide?guide.alternatives.map(a=>catalog.find(r=>r.name===a.name)).filter(Boolean):[]};}
 if(path==='/workflows'||path==='/planner')return {path,type:path.slice(1),resources:catalog.filter(r=>['Free','Open source','Free plan'].includes(r.pricing)).map(({id,name,url,pricing})=>({id,name,url,pricing}))};
 if(path==='/downloads')return {path,type:'downloads'};if(path==='/games/gta-6')return {path,type:'gta-release'};
 if(path==='/templates'||path.startsWith('/templates/'))return templateData(path,params);
 const p=path.replace(/\/$/,''),parts=p.split('/').filter(Boolean),page={path:p,articleCards:summaries};
 if(parts[0]==='blog'&&parts[1])return {...page,type:'article',article:articles.find(a=>a.slug===parts[1]),resources:resources(articles.find(a=>a.slug===parts[1])?.resourceNames||[])};
 if(p==='/blog')return {...page,type:'blog'};
 if(p==='/guides'||p==='/guides/free-tools-open-source-resources')return {...page,type:'guides'};
 if(parts[0]==='kits'){const kit=kits.find(k=>k.slug===parts[1]);return {...page,type:kit?'kit':'kits',kits,kit,resources:kit?resources(kit.names):[]};}
 if(p==='/finder')return {...page,type:'finder'};
 if(p==='/toolkits')return {...page,type:'toolkits'};
 if(p==='/compare'){const ids=[...new Set(String(params.ids||'').split(',').filter(x=>/^[A-Za-z0-9_-]{1,80}$/.test(x)))].slice(0,4);return {...page,type:'compare',resources:ids.map(id=>catalog.find(r=>r.id===id)).filter(Boolean),hasIds:!!ids.length};}
 if(p==='/alternatives')return {...page,type:'alternatives',resources:resources(['GIMP','Krita','Penpot','Shotcut','Kdenlive','LibreOffice','Node-RED','Activepieces'])};
 if(p==='/low-spec-tools')return {...page,type:'low-spec',resources:catalog.filter(r=>r.device_details?.minimum_ram_gb)};
 if(p==='/contact'||p==='/submit')return {...page,type:'draft-form',suggestion:p==='/submit'};
 if(p==='/authors/nabin-kunwar')return {...page,type:'author'};
 const policy=policies[parts[0]];return {...page,type:'policy',policy,storage:parts[0]==='cookies'||parts[0]==='privacy'};
}
export {summaries};
