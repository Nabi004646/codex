import {build} from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const assets=await fs.readdir('dist/assets');
const js=assets.find(f=>/^index-.*\.js$/.test(f)),css=assets.find(f=>/^index-.*\.css$/.test(f));
if(!js||!css)throw Error('Build the frontend before preparing Pages.');
let html=await fs.readFile('index.html','utf8');
html=html.replace('/src/main.tsx','/assets/'+js).replace('</head>','<link rel="stylesheet" href="/assets/'+css+'"></head>');
let baselineModules=[];
await build({configFile:'vite.config.mjs',ssr:{noExternal:true,target:'webworker'},plugins:[
 {name:'atlas-pages-template',enforce:'pre',load(id){if(id.endsWith('/index.html?raw'))return 'export default '+JSON.stringify(html);}},
 {name:'atlas-source-inventory',generateBundle(){baselineModules=[...this.getModuleIds()].map(id=>id.split('?')[0]).filter(id=>id.includes('/source-baseline/')).map(id=>path.relative(process.cwd(),id));}}
],build:{outDir:'.atlas-pages-worker',emptyOutDir:true,copyPublicDir:false,ssr:'server/worker.ts',rollupOptions:{output:{format:'es',entryFileNames:'_worker.js',inlineDynamicImports:true}}}});
await fs.rm('dist/pages',{recursive:true,force:true});
await fs.mkdir('dist/pages',{recursive:true});
for(const directory of ['assets','brand','fonts','previews','logos','template-previews','catalog','catalog-notices']){
 try{await fs.cp('dist/'+directory,'dist/pages/'+directory,{recursive:true});}catch(error){if(error.code!=='ENOENT')throw error;}
}
await fs.copyFile('.atlas-pages-worker/_worker.js','dist/pages/_worker.js');
await fs.copyFile('public/llms.txt','dist/pages/llms.txt');
await fs.copyFile('public/_headers','dist/pages/_headers');
await fs.writeFile('dist/pages/_routes.json',JSON.stringify({version:1,include:['/*'],exclude:['/assets/*','/brand/*','/fonts/*','/previews/*','/logos/*','/template-previews/*','/catalog/*','/catalog-notices/*']},null,2)+'\n');
await fs.mkdir('reports',{recursive:true});
await fs.writeFile('reports/pages-build-source.json',JSON.stringify({baseline_modules:[...new Set(baselineModules)].sort(),output:'dist/pages',mode:'staging',built_at:new Date().toISOString()},null,2)+'\n');
console.log('Cloudflare Pages ready: dist/pages; server-rendered routes, live search, template filtering and static assets. Staging stays noindex.');
