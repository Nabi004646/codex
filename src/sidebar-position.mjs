export function observeSidebarPosition(win,doc) {
  const header=doc.querySelector('.site-header');
  if(!header) return ()=>{};
  let frame=0,previous=null,stopped=false;
  const measure=()=>{
    frame=0;
    if(stopped)return;
    const bottom=Math.max(0,Math.round(header.getBoundingClientRect().bottom));
    if(bottom!==previous){previous=bottom;doc.documentElement.style.setProperty('--atlas-side-top',bottom+'px');}
  };
  const schedule=()=>{if(!stopped&&!frame)frame=win.requestAnimationFrame(measure);};
  const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(schedule):null;
  for(const element of doc.querySelectorAll('.site-header,.atlas-preferences'))observer?.observe(element);
  win.addEventListener('scroll',schedule,{passive:true});
  win.addEventListener('resize',schedule);
  doc.fonts?.ready.then(schedule).catch(()=>{});
  schedule();
  return ()=>{stopped=true;observer?.disconnect();win.cancelAnimationFrame(frame);win.removeEventListener('scroll',schedule);win.removeEventListener('resize',schedule);};
}
