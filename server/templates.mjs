import rows from '../data/template-drafts.json' with {type:'json'};
export const templateDrafts=rows;
export function templateSummary(r){return {id:r.id,slug:r.slug,title:r.title,purpose:r.purpose,category:r.category,countries:r.countries,preview_url:r.preview_url,formats:r.files.map(f=>f.format),review_state:r.review_state,published:r.published};}
export function templateListing(params=new URLSearchParams()){
 const q=(params.get('q')||'').slice(0,160).toLowerCase(),category=params.get('category')||'';
 const matches=rows.filter(r=>(!category||r.category===category)&&(!q||(r.title+' '+r.purpose+' '+r.category).toLowerCase().includes(q)));
 const total=matches.length,pages=Math.max(1,Math.ceil(total/24)),requested=Number(params.get('page')||1),page=Number.isInteger(requested)?Math.max(1,Math.min(requested,pages)):1;
 return {items:matches.slice((page-1)*24,page*24).map(templateSummary),total,page,pages,categories:[...new Set(rows.map(r=>r.category))]};
}
export function templateDraftFile(id,format){if(!/^\d{1,3}$/.test(String(id))||!['pdf','docx','xlsx','csv'].includes(format))return null;return rows.find(r=>r.id===Number(id))?.files.find(f=>f.format===format)||null;}
export const templatePaths=['/templates',...rows.map(r=>'/templates/'+r.slug)];
export function templateData(path,params={}){const slug=path.split('/')[2],template=slug?rows.find(r=>r.slug===slug):null;return {type:'templates',template,listing:template?null:templateListing(new URLSearchParams(params))};}
