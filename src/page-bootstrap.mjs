// Read inert server-rendered JSON directly. Browser startup must not depend on
// an executable inline script assigning a window property before hydration.
export function readPageBootstrap(document){
 const element=document.getElementById('atlas-page-data');
 if(element?.getAttribute('type')!=='application/json')throw Error('The page data is unavailable. Reload to try again.');
 const page=JSON.parse(element.textContent||'null');
 if(!page||typeof page!=='object'||typeof page.kind!=='string'||typeof page.path!=='string'||!page.params||typeof page.params!=='object'||Array.isArray(page.params))throw Error('The page data is incomplete. Reload to try again.');
 return page;
}
