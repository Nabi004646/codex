'use client';
import {useEffect,useState} from 'react';
import {FolderPlus,Check} from 'lucide-react';
import {saveToolkits,toolkits} from '../lib/browser-collections';
export default function SaveKit({name,ids}:{name:string;ids:string[]}){const [ready,setReady]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');useEffect(()=>setReady(true),[]);return <><button className="primary-button" disabled={!ready||saved||!ids.length} onClick={()=>{try{const current=toolkits();saveToolkits([...current,{id:crypto.randomUUID(),name,resourceIds:ids,updatedAt:new Date().toISOString()}]);setSaved(true);}catch(e){setError((e as Error).message);}}}>{saved?<Check size={16}/>:<FolderPlus size={16}/>} {saved?'Saved in your toolkits':'Save this starter kit'}</button>{saved&&<a className="kit-saved-link" href="/toolkits">Open my toolkits →</a>}{error&&<p role="alert">{error}</p>}</>}
