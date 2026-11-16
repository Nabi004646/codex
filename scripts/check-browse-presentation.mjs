import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {resourceImageCandidates} from '../src/resource-images.ts';
import {publishedCard} from '../server/published.mjs';
import {shouldShowPublishedMatches,isTemplateResource,publishedCardHref} from '../src/browse-presentation.mjs';
import templates from '../data/template-release-v2.json' with {type:'json'};

test('ordinary browsing never injects a second published-template feed',()=>{
 for(const params of ['','page=2','page=3&sort=featured','country=IN&pricing=Free','platform=Windows','sort=newest'])assert.equal(shouldShowPublishedMatches(params),false,params);
 for(const params of ['q=weekly+study','category=Productivity','kind=Template'])assert.equal(shouldShowPublishedMatches(params),true,params);
});
test('all 100 original templates use their own first-page previews and canonical destinations',async()=>{
 for(const template of templates){
  const r=publishedCard({id:template.resource_id,resource_type:'template',display_name:template.title,canonical_url:'https://freeresourceatlas.com/templates/'+template.slug,short_summary:template.purpose,pricing_model:'free_forever'});
  assert.equal(r.kind,'Template');assert.equal(isTemplateResource(r),true);assert.equal(publishedCardHref(r),'/templates/'+template.slug);
  const images=resourceImageCandidates(r);assert.equal(images[0].src,template.preview_url);assert.equal(images[0].kind,'template');assert.ok((await fs.stat('public'+images[0].src)).size>0);
  assert.deepEqual(resourceImageCandidates({...r,url:'https://other.example/a-different-resource'}),[],'A mismatched URL must not inherit a template image');
 }
});
test('unknown websites never become magnified favicon-service images',()=>{
 for(const url of ['https://freeresourceatlas.com/other-page','https://provider.example/','https://docs.google.com/document/d/example'])assert.deepEqual(resourceImageCandidates({id:'unknown',name:'A resource',url}),[]);
 assert.equal(publishedCardHref({id:'r_123',url:'https://external.example/'}),'/resource/r_123');
 assert.equal(resourceImageCandidates({id:'app',name:'A named app',url:'https://provider.example/',image_url:'https://f-droid.org/repo/app/icon.png',image_kind:'logo'})[0].kind,'logo');
});
