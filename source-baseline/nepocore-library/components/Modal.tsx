'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {createPortal} from 'react-dom';

type ModalProps={
 title:string;
 children:React.ReactNode;
 onClose:()=>void;
 wide?:boolean;
 footer?:React.ReactNode;
 closeDisabled?:boolean;
 closeOnBackdrop?:boolean;
};

export default function Modal({title,children,onClose,wide=false,footer,closeDisabled=false,closeOnBackdrop=true}:ModalProps){
 const ref=useRef<HTMLDivElement>(null);
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 const headingId=useId();
 const latest=useRef({onClose,closeDisabled});
 useEffect(()=>{latest.current={onClose,closeDisabled};},[onClose,closeDisabled]);
 useEffect(()=>{
  if(!mounted)return;
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const root=ref.current;
  const focusable=()=>Array.from(root?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')||[])
   .filter(element=>element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden'&&!element.closest('[hidden],[aria-hidden="true"]'));
  (focusable()[0]||root)?.focus({preventScroll:true});
  function key(event:KeyboardEvent){
   if(event.key==='Escape'){
    event.preventDefault();
    if(!latest.current.closeDisabled)latest.current.onClose();
   }
   if(event.key==='Tab'){
    const elements=focusable();
    if(!elements.length){event.preventDefault();root?.focus();return;}
    const first=elements[0],last=elements[elements.length-1];
    if(event.shiftKey&&(document.activeElement===first||!root?.contains(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!root?.contains(document.activeElement))){event.preventDefault();first.focus();}
   }
  }
  document.addEventListener('keydown',key);
  return()=>{
   document.body.style.overflow=overflow;
   document.removeEventListener('keydown',key);
   if(previous?.isConnected)previous.focus({preventScroll:true});
  };
 },[mounted]);
 if(!mounted)return null;
 return createPortal(<div className="modal-backdrop" onMouseDown={event=>{
  if(event.target===event.currentTarget&&closeOnBackdrop&&!closeDisabled)onClose();
 }}>
  <div className={'modal '+(wide?'wide':'')} role="dialog" aria-modal="true" aria-labelledby={headingId} tabIndex={-1} ref={ref}>
   <div className="modal-head"><h2 id={headingId}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={closeDisabled}><X size={20}/></button></div>
   <div className="modal-body">{children}</div>
   {footer&&<div className="modal-footer">{footer}</div>}
  </div>
 </div>,document.body);
}
