import {useEffect,useRef} from 'react';
export function useAdminDialog(onClose:()=>void,busy:boolean){
 const dialog=useRef<HTMLElement>(null),current=useRef({onClose,busy});current.current={onClose,busy};
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const controls=()=>[...dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')||[]].filter(element=>element.getClientRects().length>0);
  const frame=requestAnimationFrame(()=>controls()[0]?.focus({preventScroll:true}));
  function key(event:KeyboardEvent){if(event.key==='Escape'&&!current.current.busy){event.preventDefault();current.current.onClose();}if(event.key==='Tab'){const items=controls(),first=items[0],last=items[items.length-1];if(!first)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}
  document.addEventListener('keydown',key);
  return()=>{cancelAnimationFrame(frame);document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus({preventScroll:true});};
 },[]);
 return dialog;
}
