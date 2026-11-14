import {illustrationUrl} from './illustrations';
import type {BlogPost} from './blog-types';
export function postCover(p:Pick<BlogPost,'slug'|'title'|'category'|'resourceNames'|'intro'>){return illustrationUrl({id:'article-'+p.slug,name:p.resourceNames[0]||p.title,category:p.category,subcategory:p.title,description:p.intro});}
export function postSummary(p:BlogPost){return {slug:p.slug,title:p.title,description:p.description,category:p.category,published_at:p.published_at,updated_at:p.updated_at,resourceNames:p.resourceNames,intro:p.intro};}
export type PostSummary=ReturnType<typeof postSummary>;
