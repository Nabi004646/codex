export const UI_LANGUAGES=[['en','English'],['es','Español'],['pt-br','Português (Brasil)'],['hi','हिन्दी'],['id','Bahasa Indonesia'],['fr','Français'],['de','Deutsch'],['ar','العربية'],['ja','日本語'],['vi','Tiếng Việt'],['ne','नेपाली']];
export const UI_LOCALES=UI_LANGUAGES.map(([code])=>code);
export function normalizeUiLocale(value){const s=String(value||'').toLowerCase().replaceAll('_','-');if(UI_LOCALES.includes(s))return s;const base=s.split('-')[0];return base==='pt'?'pt-br':UI_LOCALES.includes(base)?base:'en';}
export function preferredUiLocale(cookie='',explicit){if(explicit!==undefined&&explicit!==null)return normalizeUiLocale(explicit);const match=String(cookie).slice(0,8192).match(/(?:^|;\s*)atlas-ui=([a-zA-Z-]{2,12})(?:;|$)/);return match?normalizeUiLocale(match[1]):'en';}
export function suggestedUiLocale(languages=[],country=''){for(const lang of languages){const code=normalizeUiLocale(lang);if(code!=='en')return code;if(/^en(?:-|$)/i.test(lang))break;}const byCountry={NP:'ne',IN:'hi',ES:'es',MX:'es',AR:'es',BR:'pt-br',FR:'fr',DE:'de',AT:'de',ID:'id',SA:'ar',AE:'ar',EG:'ar',JP:'ja',VN:'vi'};return byCountry[String(country).toUpperCase()]||null;}
export function translate(messages,locale,key,variables={}){const text=locale==='en'?key:messages[key]?.[locale]||key;return String(text).replace(/\{(\w+)\}/g,(all,name)=>Object.hasOwn(variables,name)?String(variables[name]):all);}

export function initialUiPreference({explicit=null,saved=null,cookie='',initialLocale='en',dismissed=false,languages=[],country=''}={}){
 if(explicit!==null)return {locale:normalizeUiLocale(explicit),suggested:null};
 if(saved)return {locale:normalizeUiLocale(saved),suggested:null};
 if(/(?:^|;\s*)atlas-ui=/.test(cookie))return {locale:preferredUiLocale(cookie),suggested:null};
 const locale=normalizeUiLocale(initialLocale);return {locale,suggested:locale==='en'&&!dismissed?suggestedUiLocale(languages,country):null};
}
export const LOCALE_STORAGE_KEYS=['atlas-ui','atlas-ui-suggestion-dismissed','atlas-language'];

export const PLANNED_UI_LANGUAGES=[['bn','বাংলা'],['tr','Türkçe'],['ko','한국어'],['th','ไทย'],['it','Italiano']];
