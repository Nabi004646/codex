// A contextual supplement must never become an extra feed ahead of browsing.
export function shouldShowPublishedMatches(params){
 const p=typeof params==='string'?new URLSearchParams(params):params;
 return !!(p?.get('q')?.trim()||p?.get('category')||p?.get('subcategory')||p?.get('kind'));
}
export function isTemplateResource(resource){return resource.kind==='Template'||resource.record?.resource_type==='template'||/^fra_template_\d{3}$/.test(resource.id||'');}
export function publishedCardHref(resource){
 if(isTemplateResource(resource))try{const u=new URL(resource.url);if(u.origin==='https://freeresourceatlas.com'&&/^\/templates\/[a-z0-9-]+$/.test(u.pathname))return u.pathname;}catch{}
 return '/resource/'+encodeURIComponent(resource.id);
}
