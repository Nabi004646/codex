import evidence from '../data/country-availability.json' with {type:'json'};

export const COUNTRIES=[['','Worldwide browsing'],['US','United States'],['GB','United Kingdom'],['CA','Canada'],['AU','Australia'],['IN','India'],['NP','Nepal'],['DE','Germany'],['FR','France'],['BR','Brazil'],['JP','Japan'],['KR','South Korea'],['SG','Singapore'],['NZ','New Zealand'],['ZA','South Africa'],['CN','China'],['RU','Russia']];
export const validCountry=value=>COUNTRIES.some(([code])=>code===value);
export const countryName=code=>COUNTRIES.find(([value])=>value===code)?.[1]||code;
const key=value=>{try{const u=new URL(value);return u.origin+u.pathname.replace(/\/$/,'');}catch{return '';}};
const rules=new Map(evidence.rules.flatMap(rule=>rule.urls.map(url=>[key(url),rule])));

export function countryAvailability(resource,country){
 if(!country)return {status:'worldwide'};
 const rule=rules.get(key(resource.url||resource.canonical_url));
 if(!rule)return {status:'unknown'};
 const status=rule.available.includes(country)?'available':rule.unavailable.includes(country)?'unavailable':'unknown';
 return status==='unknown'?{status}:{status,source:rule.source,note:rule.note,checked_at:evidence.checked_at};
}

export function filterCountryRows(rows,country,mode='include-unknown'){
 if(!country)return rows;
 return rows.filter(resource=>{const {status}=countryAvailability(resource,country);return mode==='confirmed'?status==='available':status!=='unavailable';});
}
