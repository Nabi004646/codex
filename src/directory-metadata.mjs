const ORIGIN='https://freeresourceatlas.com';
export function syncDirectoryMetadata(document,{path,params,title,description,indexablePaths=[],locale='en'}){
 const canonical=ORIGIN+path,indexable=locale==='en'&&!params.size&&indexablePaths.includes(path);
 const set=(selector,attribute,value)=>{const element=document.querySelector(selector);if(element)element.setAttribute(attribute,value);};
 document.title=title+' | FreeResourceAtlas';
 set('meta[name="robots"]','content',indexable?'index,follow':'noindex,nofollow');
 set('link[rel="canonical"]','href',canonical);
 set('meta[name="description"]','content',description);
 for(const property of ['og:title','twitter:title'])set('meta['+(property.startsWith('og:')?'property':'name')+'="'+property+'"]','content',title);
 for(const property of ['og:description','twitter:description'])set('meta['+(property.startsWith('og:')?'property':'name')+'="'+property+'"]','content',description);
 set('meta[property="og:url"]','content',canonical);
}
