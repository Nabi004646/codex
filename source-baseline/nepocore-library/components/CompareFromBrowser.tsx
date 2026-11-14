'use client';
import {useEffect,useState} from 'react';
import {comparisonIds} from '../lib/browser-collections';
export default function CompareFromBrowser(){const [ready,setReady]=useState(false);useEffect(()=>{const ids=comparisonIds();if(ids.length>=2)location.replace('/compare?ids='+ids.join(','));else setReady(true);},[]);return ready?<div className="empty-state"><h2>Select at least two resources.</h2><a className="primary-button" href="/">Browse resources</a></div>:<p role="status">Opening your saved comparison…</p>}
