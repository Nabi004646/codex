import {boundedFetch} from './network.mjs';
import {useEffect,useRef,useState} from 'react';
import {findAdminRecord} from './admin-record-sync.mjs';
const categories:any={'small-business-operations':'business-and-operations','freelancers-and-client-work':'business-and-operations','careers-and-job-search':'courses-and-learning','study-learning-and-education':'education-and-teaching','creators-and-video-production':'video-and-film','ai-automation-and-productivity':'productivity','cybersecurity-and-digital-privacy':'cybersecurity','software-web-projects-and-tech-workflows':'developer-tools','home-and-everyday-planning':'productivity','regional-relevance-us-uk-canada-australia':'productivity'};
export default function TemplateStaging({call,transfer}:any){
 const [templates,setTemplates]=useState<any[]>([]);
 const expected=templates.flatMap(t=>t.files.map((f:any)=>({...f,resource_id:t.resource_id,title:t.title})));
 const byName=new Map(expected.map(f=>[f.object_path.split('/').pop(),f]));
 const [files,setFiles]=useState<File[]>([]),[registered,setRegistered]=useState<any[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const confirmed=expected.filter(f=>registered.some(r=>r.object_key===f.object_path&&r.sha256===f.sha256&&Number(r.bytes)===f.bytes)).length;
 const active=useRef(true),pending=useRef(false),input=useRef<HTMLInputElement|null>(null);
 async function refresh(){if(!templates.length){const source=await boundedFetch('/api/template-staging-source',{cache:'no-store'});if(!source.ok)throw Error('Template source metadata could not load.');const data=await source.json();if(!Array.isArray(data.items)||data.items.length!==100)throw Error('Template source metadata is incomplete.');if(active.current)setTemplates(data.items);}const data=await call('ops_template_files');if(!Array.isArray(data.items))throw Error('File inventory could not be confirmed.');if(active.current)setRegistered(data.items);}
 useEffect(()=>{active.current=true;void refresh().catch(e=>setError(e.message));return()=>{active.current=false;if(input.current)input.current.value='';};},[]);
 async function run(fn:any){if(pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');try{await fn();}catch(e:any){if(active.current)setError(e.message||'Staging could not finish. Existing files remain saved; select the folder again to resume.');}finally{pending.current=false;if(active.current)setBusy(false);}}
 async function stagePack(){await run(async()=>{const known=new Set(registered.filter(r=>expected.some(f=>r.object_key===f.object_path&&r.sha256===f.sha256&&Number(r.bytes)===f.bytes)).map(f=>f.object_key));let offset=expected.findIndex(f=>!known.has(f.object_path));if(offset<0){setMessage('All original native files are already registered.');return;}while(offset<240){if(!active.current)return;setMessage('Staging the private original pack: '+offset+' of 240 files confirmed.');const result=await transfer('stage-pack',undefined,{offset});if(!Number.isInteger(result.next_offset)||result.next_offset<=offset||result.total!==240)throw Error('Staging progress could not be confirmed.');offset=result.next_offset;setMessage(offset+' of 240 native files verified and staged privately.');}await refresh();});}
 async function stage(){await run(async()=>{
  if(!files.length)throw Error('Choose native files from the original review pack.');
  const matches=files.map(file=>({file,meta:byName.get(file.name)}));
  if(matches.some(r=>!r.meta))throw Error('This selection contains an unexpected file. Choose only the original PDF, DOCX, XLSX and CSV files.');
  if(new Set(matches.map(r=>r.meta!.object_path)).size!==matches.length)throw Error('The selection contains duplicate filenames.');
  const parents=new Set<string>();let done=0;
  for(const {file,meta} of matches){if(!active.current)return;const t=templates.find(t=>t.resource_id===meta!.resource_id)!;
   if(!parents.has(t.resource_id)){
    const existing=await findAdminRecord(call,{id:t.resource_id,url:'https://freeresourceatlas.com/templates/'+t.slug});
    if(existing&&existing.resource_type!=='template')throw Error('A different resource already uses '+t.resource_id+'.');
    if(!existing)await call('save',{record:{id:t.resource_id,slug:t.slug,display_name:t.title,canonical_url:'https://freeresourceatlas.com/templates/'+t.slug,short_summary:t.purpose,editorial_description:t.description,category_id:categories[t.category_slug]||'productivity',resource_type:'template',pricing_model:'unknown',media_rights:'unreviewed',license:'Owner distribution review pending',access_limits:'Draft original template. Publication and reuse terms require a separate review.',source_urls:['https://freeresourceatlas.com/templates/'+t.slug],tags:['original-template','native-file']},expected_revision:null});
    parents.add(t.resource_id);
   }
   setMessage('Verifying and staging '+(done+1)+' of '+matches.length+': '+file.name);
   await transfer('upload',file,meta);done++;
   if(!active.current)return;
   setMessage(done+' of '+matches.length+' files verified, stored privately and registered as drafts.');
  }
  await refresh();setFiles([]);if(input.current)input.current.value='';
 });}
 return <section className="admin-section" id="template-staging"><div className="admin-heading"><h2>Version 1 private review files</h2><button disabled={busy} onClick={()=>void run(refresh)}>Refresh file inventory</button></div><p>{confirmed} of {expected.length} native files registered as private drafts. Uploads are checked against the original file sizes and SHA-256 checksums, then downloaded again to confirm storage contents. Existing files can be verified and resumed.</p><p>Stage the original pack directly from private Storage, or download it for local review and choose files below. Staging creates editable resource drafts. It does not approve distribution rights or publish downloads.</p><button className="primary-button" disabled={busy||templates.length!==100||confirmed>=240} onClick={()=>void stagePack()}>Stage original pack privately</button><button disabled={busy} onClick={()=>void run(async()=>{const blob=await transfer('download');const href=URL.createObjectURL(blob),link=document.createElement('a');link.href=href;link.download='FreeResourceAtlas-native-template-review.zip';link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);setMessage('Private review pack downloaded. Unzip it before choosing native files.');})}>Download private review pack</button><label>Original native files<input ref={input} type="file" multiple accept=".pdf,.docx,.xlsx,.csv" disabled={busy} onChange={e=>{setFiles(Array.from(e.target.files||[]));setError('');setMessage('');}}/></label><p>{files.length} files selected. You can upload smaller batches and continue later.</p><button className="primary-button" disabled={busy||!files.length||templates.length!==100} onClick={()=>void stage()}>{busy?'Staging…':'Verify and stage selected files'}</button>{message&&<p role="status" className="admin-message">{message}</p>}{error&&<p role="alert" className="admin-message">{error}</p>}<p>This section preserves the private version 1 review originals. Manage the licensed version 2 downloads in Original template release above.</p></section>;
}
