import {localizedIntent} from './search-language-aliases.mjs';
export const normalize=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/c\+\+/g,' cpp ').replace(/c#/g,' csharp ').replace(/\.net\b/g,' dotnet ').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export const words=value=>normalize(value).split(' ').filter(Boolean);
export function bucket(value,count=32){let n=2166136261;for(let i=0;i<value.length;i++)n=Math.imul(n^value.charCodeAt(i),16777619);return(n>>>0)%count;}
export function packPostings(entries){const bytes=[];let before=0;for(const [id,score]of entries){let n=id-before;before=id;while(n>127){bytes.push((n&127)|128);n>>>=7;}bytes.push(n,Math.min(255,score));}return Buffer.from(bytes).toString('base64');}
export function unpackPostings(value){const bytes=Uint8Array.from(atob(value||''),c=>c.charCodeAt(0)),out=[];let id=0;for(let i=0;i<bytes.length;){let n=0,shift=0,b;do{b=bytes[i++];n|=(b&127)<<shift;shift+=7;}while(b&128);id+=n;out.push([id,bytes[i++]]);}return out;}
const stop=new Set(['the','a','an','for','to','with','and','of','best','free','tools','tool','resources','resource','i','need','want','find','me','please']);
const aliases={
 'ai':['ai','artificial','machine learning','llm','generative','local models'],
 'artificial intelligence':['ai','artificial','machine learning','llm'],
 'seo':['seo','search optimization','search console','pagespeed','lighthouse','keyword','sitemap'],
 'reels':['reels','short video','video editing','captions','subtitles','transcription','obs'],
 'earn money':['freelanc','invoic','ecommerce','entrepreneur','indie business'],
 'make money':['freelanc','invoic','ecommerce','entrepreneur','indie business'],
 'automation':['automat','workflow','rpa','task scheduling','data pipelines'],
 'finance':['financ','budget','expenses','accounting','portfolio'],
 'fitness':['fitness','workout','exercise','nutrition','activity tracking'],
 'video editing':['video edit','video editor','shotcut','kdenlive','openshot','captions']
};
export function searchTerms(query){const q=normalize(localizedIntent(query,normalize)),filtered=words(q).filter(x=>!stop.has(x)),intent=filtered.join(' ')==='reel'?'reels':filtered.join(' '),direct=aliases[q]||aliases[intent];if(direct)return{intent,related:intent==='earn money'||intent==='make money',groups:direct.map(value=>words(value).filter(x=>!stop.has(x)).map(x=>x.slice(0,10))).filter(x=>x.length)};const terms=filtered.slice(0,12).map(x=>x.slice(0,10));if(!terms.length&&q)return{intent,related:false,groups:[[q.slice(0,10)]]};return{intent,related:false,groups:terms.length?[terms]:[]};}
export function isPublicLink(value){try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||/[\s<>\x00-\x1f]/.test(value)||!u.hostname.includes('.')||/(?:^|\.)(?:localhost|local|internal|invalid|example|test)$/.test(u.hostname)||/^(?:127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(u.hostname)||/%(?:00|0a|0d)/i.test(value))return false;return true;}catch{return false;}}
