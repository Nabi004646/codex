import fs from 'node:fs';import path from 'node:path';
import {catalog} from '../server/catalog.mjs';
import {topics,publicPaths} from '../server/public-content.mjs';
const {render}=await import('../.atlas-ssr/entry-server.js'),template=fs.readFileSync('dist/index.html','utf8');
const slug=s=>s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const routes=[...new Set(['/','/collections','/search',...publicPaths,...topics.map(t=>t.path),...catalog.map(r=>'/resource/'+r.id),...catalog.flatMap(r=>['/category/'+slug(r.category),'/category/'+slug(r.category)+'/'+slug(r.subcategory)])])];
fs.mkdirSync('reports',{recursive:true});const inventory=[];
for(const route of routes){const page=await render(route);if(page.status!==200)throw Error('Unexpected route failure: '+route);const folder=route==='/'?'dist':path.join('dist',route);fs.mkdirSync(folder,{recursive:true});const html=template.replace('<!--ATLAS_HEAD-->',page.head).replace('<!--ATLAS_HTML-->',page.html).replace('/*ATLAS_STATE*/null',page.state);fs.writeFileSync(path.join(folder,'index.html'),html);inventory.push({path:route,status:200,title:page.metadata.title,canonical:page.metadata.canonical,robots:'noindex,nofollow',sitemap_approved:false});}
const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
fs.writeFileSync('dist/robots.txt','User-agent: *\nDisallow: /\n');
fs.writeFileSync('dist/sitemap.xml',xml);
fs.writeFileSync('public/sitemap.xml',xml);
fs.writeFileSync('dist/llms.txt','# FreeResourceAtlas staging\n\nThis staging catalog and editorial drafts are not public releases. English is the only reviewed UI locale. Public deployment and index approval are pending.\n');
fs.writeFileSync('reports/public-page-inventory.json',JSON.stringify({generated_at:new Date().toISOString(),scope:'local staging only; not a Google indexing report',local_resources:catalog.length,approved_sitemap_urls:0,pages:inventory},null,2)+'\n');
console.log('Rendered '+routes.length+' noindex staging pages. No URLs approved for the public sitemap.');
