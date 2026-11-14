import {render} from '../src/entry-server';
import template from '../index.html?raw';
import {createRuntime} from './runtime.mjs';
const handler=createRuntime({render,template,cache:globalThis.caches?.default});
export default {fetch(request:Request,env:any,ctx:any){return handler(request,{ATLAS_CATALOG:'discovery',...env},ctx);}};
