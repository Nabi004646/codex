import {ArrowLeft,ArrowRight,LoaderCircle} from 'lucide-react';
import {useLocale} from './LocaleProvider';
export default function ResourcePagination({data,busy=false,onPage,compact=false}:any){
 const {t,n}=useLocale();
 const hasNext=data.cursorMode?data.hasMore:data.page<data.pages;
 if(!(hasNext||data.page>1))return null;
 return <nav className={'pagination resource-pagination'+(compact?' pagination-top':'')} aria-label={t(compact?'Resource pages above results':'Resource pages below results')}>
  <div className="pagination-summary"><strong>{t('Page')} {n(data.page)}{!data.cursorMode&&<> {t('of')} {n(data.pages)}</>}</strong>{!compact&&<span>{data.cursorMode?t('{count} resources on this page',{count:n(data.resources.length)}):t('{start}–{end} of {total} resources',{start:n((data.page-1)*24+1),end:n(Math.min(data.page*24,data.total)),total:n(data.total)})}</span>}</div>
  <div className="pagination-actions"><button className="pagination-previous" disabled={busy||data.page<=1} onClick={()=>onPage(data.page-1)} aria-label={t('Previous page')}><ArrowLeft size={17}/><span>{t('Previous')}</span></button><button className="pagination-next" disabled={busy||!hasNext} onClick={()=>onPage(data.page+1)} aria-label={t('Next page')}>{busy?<LoaderCircle size={17} className="spin"/>:null}<span>{t('Next page')}</span><ArrowRight size={18}/></button></div>
 </nav>;
}
