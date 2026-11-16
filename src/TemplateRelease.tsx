import {useEffect,useRef,useState} from 'react';
import {boundedFetch} from './network.mjs';

export default function TemplateRelease({transfer,onChange}:any){
 const [published,setPublished]=useState<number|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const mounted=useRef(true),pending=useRef(false);
 async function refresh(){const response=await boundedFetch('/api/templates',{cache:'no-store'});if(!response.ok)throw Error('Published template availability could not be checked.');const data=await response.json();if(!Number.isInteger(data.publishedCount))throw Error('Published counts are unavailable.');if(mounted.current)setPublished(data.publishedCount);}
 useEffect(()=>{mounted.current=true;void refresh().catch(e=>setError(e.message));return()=>{mounted.current=false;};},[]);
 async function release(){
  if(pending.current)return;pending.current=true;setBusy(true);setError('');
  try{
   let offset=0;
   while(offset<100){
    if(!mounted.current)return;
    setMessage('Checking and releasing originals: '+offset+' of 100 templates. Keep this admin page open.');
    const result=await transfer('release-v2',undefined,{offset});
    if(!Number.isInteger(result.next_offset)||result.next_offset<=offset||result.next_offset>100||result.total!==100||result.license!=='CC BY 4.0'||result.version!==2)throw Error('Release progress could not be verified. Existing published templates remain available.');
    offset=result.next_offset;
   }
   await refresh();await onChange();if(mounted.current)setMessage('All 100 originals released. Their 240 native files and public availability were verified.');
  }catch(e:any){if(mounted.current)setError(e.message||'Release paused. Refresh availability, then resume.');}
  finally{pending.current=false;if(mounted.current)setBusy(false);}
 }
 return <section className="admin-section" id="original-release"><div className="admin-heading"><h2>Original template release</h2><button disabled={busy} onClick={()=>void refresh().catch(e=>setError(e.message))}>Check public availability</button></div><p>{published===null?'Checking published downloads…':published+' of 100 version 2 templates currently available.'} The reviewed originals include 100 PDFs, 60 Word documents, 40 spreadsheets and 40 CSV files.</p><p>Release under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> permits sharing, adaptation and commercial reuse with attribution. Those granted rights cannot be revoked for compliant recipients. Version 1 review files stay private.</p><button className="primary-button" disabled={busy||published===null||published===100} onClick={()=>void release()}>{busy?'Releasing reviewed originals…':'Release or resume the approved CC BY 4.0 originals'}</button>{message&&<p role="status" className="admin-message">{message}</p>}{error&&<p role="alert" className="admin-message">{error}</p>}</section>;
}
