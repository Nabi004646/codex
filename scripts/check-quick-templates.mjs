import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {quickTemplates,buildTemplateHtml} from '../data/quick-templates.mjs';
import {templateData,templatePaths} from '../server/templates.mjs';
import {articles} from '../server/public-content.mjs';
assert.equal(quickTemplates.length,12);
assert.equal(new Set(quickTemplates.map(t=>t.slug)).size,12);
for(const t of quickTemplates){
 assert.ok(templatePaths.includes('/templates/quick/'+t.slug));
 assert.equal(templateData('/templates/quick/'+t.slug).quick.slug,t.slug);
 assert.ok(t.rows.length>0&&t.rows.every(row=>row.length===t.columns.length));
 await fs.access('public'+t.preview_url);
 const html=buildTemplateHtml(t),a4=buildTemplateHtml(t,t.fields,t.rows,'Notes','a4');
 assert.ok(html.includes('@page{size:Letter;'));
 assert.ok(a4.includes('@page{size:A4;'));
 assert.ok(a4.includes('<p>Notes</p>'));
 assert.ok(!/<script|<iframe|<link|<img|https?:\/\//i.test(html),'Export must be self-contained and script-free');
 const payload='</td><script>alert("sample")</script><img src=x onerror=alert(1)>',fields=t.fields.map(([label])=>[label,payload]),rows=[t.columns.map(()=>payload)];
 const escaped=buildTemplateHtml(t,fields,rows,payload);
 assert.ok(!escaped.includes('<script>')&&!escaped.includes('<img'));
 assert.ok(escaped.includes('&lt;script&gt;'));
}
for(const a of articles)await fs.access('public/article-covers/'+a.slug+'.svg');
console.log('PASS: 12 distinct working templates, registered routes, Letter/A4 exports, escaped user input, self-contained downloads and 16 related article illustrations.');
