import {readPageBootstrap} from '../src/page-bootstrap.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boundedFetch,RequestTimeoutError,assertCurrentSession,safeAuthError,revokeProviderSession,leavesAdminDocument} from '../src/network.mjs';
import {observeSidebarPosition} from '../src/sidebar-position.mjs';

test('a stalled request times out once without repeating a submission',async()=>{
 let calls=0;
 await assert.rejects(boundedFetch('https://test.invalid',{method:'POST',body:'fictional'},{timeout:15,fetcher:(_input,{signal})=>{calls++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}}),RequestTimeoutError);
 assert.equal(calls,1);
});
test('locking the session cancels a pending request',async()=>{
 const owner=new AbortController();let signal;
 const pending=boundedFetch('https://test.invalid',{}, {signal:owner.signal,fetcher:(_input,options)=>{signal=options.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}});
 owner.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(signal.aborted,true);
});
test('an already locked session cannot send a new request',async()=>{
 const owner=new AbortController();owner.abort();let calls=0;
 await assert.rejects(boundedFetch('https://test.invalid',{}, {signal:owner.signal,fetcher:async()=>{calls++;return Response.json({});}}),{name:'AbortError'});
 assert.equal(calls,0);
});
test('provider logout survives cancellation of the protected SDK transport',async()=>{
 const owner=new AbortController();owner.abort();let sdkCalls=0,logoutCalls=0;
 await assert.rejects(boundedFetch('https://project.invalid/auth/v1/logout',{}, {signal:owner.signal,fetcher:async()=>{sdkCalls++;return new Response();}}),{name:'AbortError'});
 assert.equal(sdkCalls,0);
 const result=await revokeProviderSession('isolated-token',{url:'https://project.invalid',publishableKey:'isolated-public-key',fetcher:async(url,options)=>{
  logoutCalls++;assert.equal(url,'https://project.invalid/auth/v1/logout?scope=local');assert.equal(options.signal.aborted,false);assert.equal(options.keepalive,true);assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,'Bearer isolated-token');return new Response(null,{status:204});
 }});
 assert.equal(result,true);assert.equal(logoutCalls,1);
});
test('caller cancellation remains connected to the fetch',async()=>{
 const request=new AbortController();let fetched;
 const pending=boundedFetch('https://test.invalid',{signal:request.signal},{fetcher:(_input,{signal})=>{fetched=signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}});
 request.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(fetched.aborted,true);
});
test('successful JSON responses remain readable',async()=>{
 const response=await boundedFetch('https://test.invalid',{}, {fetcher:async()=>Response.json({ok:true})});
 assert.deepEqual(await response.json(),{ok:true});
});
test('receiving headers does not disable the deadline for a stalled response body',async()=>{
 await assert.rejects(boundedFetch('https://test.invalid',{}, {timeout:15,fetcher:async(_input,{signal})=>new Response(new ReadableStream({start(stream){signal.addEventListener('abort',()=>stream.error(signal.reason),{once:true});}}))}),RequestTimeoutError);
});
test('late authentication results cannot restore a locked or replaced client',()=>{
 const old={},next={};
 assert.doesNotThrow(()=>assertCurrentSession(old,old,1,1));
 assert.throws(()=>assertCurrentSession(old,null,1,2),{name:'AbortError'});
 assert.throws(()=>assertCurrentSession(old,next,1,1),{name:'AbortError'});
 assert.throws(()=>assertCurrentSession(old,old,1,2),{name:'AbortError'});
});
test('admin section links and their history preserve access, while leaving locks it',()=>{
 const initial='https://freeresourceatlas.com/admin#template-staging';
 for(const path of ['/admin','/admin#editable-resources','/admin#submission-queue'])assert.equal(leavesAdminDocument(initial,'https://freeresourceatlas.com'+path),false);
 for(const path of ['/','/admin?other=1','/admin/other'])assert.equal(leavesAdminDocument(initial,'https://freeresourceatlas.com'+path),true);
 assert.equal(leavesAdminDocument(initial,'https://other.example/admin'),true);
 assert.equal(leavesAdminDocument(initial,'invalid'),true);
});
test('a network failure is not mislabeled as a wrong password',()=>{
 assert.match(safeAuthError(new TypeError('Failed to fetch')),/connection/);
 assert.match(safeAuthError(new RequestTimeoutError()),/too long/);
 assert.doesNotMatch(safeAuthError(new TypeError('Failed to fetch')),/password/);
});

function viewport({resizeObserver=true}={}){
 const listeners=new Map(),frames=new Map(),writes=[];let id=0,bottom=150,reads=0,disconnected=false;
 const header={getBoundingClientRect(){reads++;return {bottom};}};
 const doc={querySelector:()=>header,querySelectorAll:()=>[header],documentElement:{style:{setProperty:(...args)=>writes.push(args)}}};
 const win={requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 if(resizeObserver)win.ResizeObserver=class{observe(){}disconnect(){disconnected=true;}};
 return {doc,win,writes,listeners,frames,scroll:()=>listeners.get('scroll')?.(),setBottom:value=>bottom=value,readCount:()=>reads,disconnected:()=>disconnected,flush:()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());}};
}
test('scroll bursts share a frame and unchanged geometry causes no extra style write',()=>{
 const v=viewport(),stop=observeSidebarPosition(v.win,v.doc);v.flush();
 assert.equal(v.writes.length,1);
 for(let i=0;i<200;i++)v.scroll();
 assert.equal(v.frames.size,1);v.flush();assert.equal(v.readCount(),2);assert.equal(v.writes.length,1);
 v.setBottom(89);v.scroll();v.flush();assert.deepEqual(v.writes[1],['--atlas-side-top','89px']);
 stop();assert.equal(v.listeners.size,0);assert.equal(v.disconnected(),true);
});
test('missing ResizeObserver does not crash the page and cleanup cancels pending work',()=>{
 const v=viewport({resizeObserver:false});const stop=observeSidebarPosition(v.win,v.doc);assert.equal(v.frames.size,1);
 stop();v.flush();assert.equal(v.readCount(),0);assert.equal(v.writes.length,0);
});
test('pages without directory headers do not register scroll work',()=>{
 const v=viewport();v.doc.querySelector=()=>null;const stop=observeSidebarPosition(v.win,v.doc);
 assert.equal(v.listeners.size,0);assert.equal(v.frames.size,0);stop();
});

test('browser startup reads inert page JSON without an inline window assignment',async()=>{
 const page={kind:'admin',path:'/admin',params:{q:"$' $& $` <script>fictional</script>"}},fixture={getElementById:id=>id==='atlas-page-data'?{getAttribute:name=>name==='type'?'application/json':null,textContent:JSON.stringify(page)}:null};
 assert.deepEqual(readPageBootstrap(fixture),page);
 assert.throws(()=>readPageBootstrap({getElementById:()=>null}),/unavailable/);
 assert.throws(()=>readPageBootstrap({getElementById:()=>({getAttribute:()=> 'application/json',textContent:'{}'})}),/incomplete/);
 const html=await fs.readFile('index.html','utf8');assert.match(html,/<script id="atlas-page-data" type="application\/json">/);assert.ok(!html.includes('window.__ATLAS_PAGE__='));
 const client=await fs.readFile('src/main.tsx','utf8');assert.ok(client.includes('readPageBootstrap(document)'));
});
