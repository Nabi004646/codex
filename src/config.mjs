import taxonomy from '../data/taxonomy.json';
export const SITE_URL='https://freeresourceatlas.com';export const TAXONOMY=taxonomy;export const CATEGORIES=taxonomy.map(t=>t.name);export const GROUPS=['Create','Build','Work','Learn','Life'];export function categorySlug(s){return s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
