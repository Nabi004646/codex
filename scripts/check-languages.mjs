import assert from 'node:assert/strict';
import messages from '../data/ui-messages.json' with {type:'json'};
import {normalizeUiLocale,preferredUiLocale,suggestedUiLocale,translate,UI_LOCALES} from '../src/locale-config.mjs';
import {scrollToResults} from '../src/result-scroll.mjs';
import {searchTerms} from '../server/discovery-codec.mjs';
const placeholders=value=>[...String(value).matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
assert.equal(UI_LOCALES.length,11);
for(const [key,translations]of Object.entries(messages))for(const locale of UI_LOCALES.filter(code=>code!=='en')){assert.ok(translations[locale]?.trim(),'Missing '+locale+': '+key);assert.deepEqual(placeholders(translations[locale]),placeholders(key),'Changed placeholders: '+key);}
assert.equal(normalizeUiLocale('pt-PT'),'pt-br');assert.equal(normalizeUiLocale('ne-NP'),'ne');assert.equal(normalizeUiLocale('zh-CN'),'en');
assert.equal(preferredUiLocale('atlas-ui=ar; other=1'),'ar');assert.equal(preferredUiLocale('atlas-ui=arXYZ'),'en');assert.equal(preferredUiLocale('atlas-ui=es','de'),'de');assert.equal(preferredUiLocale('other=1'),'en');
assert.equal(suggestedUiLocale(['en-US','es'],'NP'),null);assert.equal(suggestedUiLocale(['es-MX'],'NP'),'es');assert.equal(suggestedUiLocale(['zh-CN'],'NP'),'ne');
assert.equal(translate(messages,'en','Free Resources'),'Free Resources');assert.equal(translate(messages,'es','Free Resources'),'Recursos gratuitos');assert.equal(translate(messages,'ne','A name without a translation'),'A name without a translation');
assert.ok(translate(messages,'ar','Results for {query}',{query:'Shotcut'}).includes('Shotcut'));
for(const [local,english]of [['edición de vídeo','video editing'],['montage vidéo','video editing'],['automação','automation'],['الذكاء الاصطناعي','ai'],['人工知能','ai'],['भिडियो सम्पादन','video editing']])assert.deepEqual(searchTerms(local),searchTerms(english));
for(const reduced of [false,true]){const calls=[],target={scrollIntoView:options=>calls.push(['scroll',options]),focus:options=>calls.push(['focus',options])};scrollToResults(target,{matchMedia:()=>({matches:reduced})});assert.deepEqual(calls,[['scroll',{behavior:reduced?'auto':'smooth',block:'start'}],['focus',{preventScroll:true}]]);}
console.log('PASS: 11 interface languages, complete message placeholders, explicit English fallback, saved preference parsing, language suggestions without redirects, multilingual search intents, reduced-motion result scrolling and focus.');
