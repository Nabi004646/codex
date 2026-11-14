import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const require=createRequire(import.meta.url);
export function sqliteD1(){
 const sqlite=new DatabaseSync(':memory:');let reads=0,writes=0;
 for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+name,'utf8'));
 function prepared(sql,values=[]){return {sql,values,bind(...next){return prepared(sql,next);},async all(){reads++;return {results:sqlite.prepare(sql).all(...values),success:true,meta:{changes:0}};},async first(column){reads++;const row=sqlite.prepare(sql).get(...values)||null;return column&&row?row[column]:row;},async run(){writes++;const r=sqlite.prepare(sql).run(...values);return {success:true,results:[],meta:{changes:Number(r.changes)}};}};}
 const db={prepare:prepared,async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 return {db,sqlite,get reads(){return reads;},get writes(){return writes;}};
}
export function createLoader({environment={},overrides={},globals={}}={}){
 const cache=new Map();
 function load(file){
  let absolute=path.resolve(file);if(!path.extname(absolute))absolute+='.ts';
  if(cache.has(absolute))return cache.get(absolute);if(absolute.endsWith('.json'))return JSON.parse(fs.readFileSync(absolute,'utf8'));
  const mod={exports:{}};cache.set(absolute,mod.exports);
  const req=name=>{if(Object.hasOwn(overrides,name))return overrides[name];if(name==='cloudflare:workers')return {env:environment};if(name==='next/server')return {NextResponse:{json:Response.json}};if(name.startsWith('.'))return load(path.resolve(path.dirname(absolute),name));return require(name);};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute,'utf8').replaceAll('import.meta.env.DEV','false'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module:mod,exports:mod.exports,require:req,URL,URLSearchParams,atob,btoa,Uint8Array,TextEncoder,TextDecoder,Response,Request,AbortSignal,Error,Date,crypto:webcrypto,console,setTimeout,clearTimeout,fetch,...globals},{filename:absolute});return mod.exports;
 }
 return load;
}
