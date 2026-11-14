export function scrollToResults(target,windowObject=window){
 if(!target)return;
 const reduced=windowObject.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
 target.focus({preventScroll:true});
}
