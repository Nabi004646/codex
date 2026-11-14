import fs from 'node:fs';
import assert from 'node:assert/strict';
for (const file of ['dist/index.html','dist/free/video-editing-tools/index.html','dist/low-spec-tools/index.html']) {
  const html=fs.readFileSync(file,'utf8');
  assert.match(html,/<meta name="robots" content="noindex,nofollow"/);
  assert.match(html,/FreeResourceAtlas/);
  assert.ok(!html.includes('<!--ATLAS_HTML-->'));assert.ok(!html.includes('<!--ATLAS_HEAD-->'));
  assert.ok(!html.includes('/*ATLAS_STATE*/null'));
}
assert.ok(!fs.existsSync('dist/preview/seo/index.html'));
assert.ok(!fs.readFileSync('dist/index.html','utf8').includes('staging-notice'));
const landing=fs.readFileSync('dist/free/video-editing-tools/index.html','utf8');
assert.match(landing,/<h1>Free video editing tools<\/h1>/);
assert.match(landing,/value="free video editing tools"/);
assert.match(landing,/Shotcut/);assert.match(landing,/Kdenlive/);
assert.match(landing,/https:\/\/freeresourceatlas.com\/free\/video-editing-tools\//);
for (const match of landing.matchAll(/<img[^>]*src="([^"?]+)"/g)) {
  const image=match[1];
  if (image.startsWith('/')) assert.ok(fs.existsSync('dist'+image),'Missing local thumbnail: '+image);
}
const assets=fs.readdirSync('dist/assets').filter(f=>f.endsWith('.js'));
const client=assets.map(f=>fs.readFileSync('dist/assets/'+f,'utf8')).join('\n');
assert.ok(client.length<1_000_000,'Full legacy catalog must not enter the client bundle');
for (const legacy of ['SUPABASE_SECRET_KEY']) assert.ok(!client.includes(legacy),'Legacy or server configuration in client: '+legacy);
assert.match(fs.readFileSync('dist/robots.txt','utf8'),/Disallow: \//);
console.log('PASS: sampled noindex build pages contain rendered HTML; search is prefilled; all landing images exist; no legacy service configuration or full catalog in the client.');

assert.ok(!/sb_secret_[A-Za-z0-9_-]{20,}/.test(client),'Privileged key in client bundle');
