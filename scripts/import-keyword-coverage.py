"""Build an explicit coverage audit; input impressions are not site traffic or search volume."""
import csv, hashlib, json, re, sys, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

root=Path(__file__).resolve().parent.parent
source=Path(sys.argv[1])
def norm(value):
    return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',value).replace('\u200b','').strip().lower())
def route(k):
    def yes(slug,reason='Intent addressed by a source-linked guide and practical next steps.'):
        return ('mapped','/guides/'+slug,reason)
    def omit(reason):return ('excluded','',reason)
    if any(x in k for x in ['porno','goojara','cineby','moviebox']):return omit('Outside this directory scope; no adult-content or unverified media-source landing page is published.')
    if re.search(r'\b(gta|gtavi|gta6|gt6|гта)\b',k) or 'grand theft auto' in k:
        if k=='gta 5':return ('mapped','/games/gta-6#related-games','GTA V is linked as a different game; it is not presented as GTA VI.')
        anchor='platforms' if re.search(r'\b(pc|ps4|xbox one|ps5|xbox|steam)\b',k) else 'price' if re.search(r'price|prix|precio|preço|preis|cena|cost|much|buy|pre.?order|précommande|vorbestellen|comprar|kaufen|ultimate|edition|physical|auchan|leclerc|amazon',k) else 'media' if re.search(r'map|mapa|trailer|gameplay|wallpaper|background|poster|logo|characters|lucia|radio|leaks|budget|merch|review|reddit|controller|fps',k) else 'download' if re.search(r'download|size|pre.?load',k) else 'release'
        return ('mapped','/games/gta-6#'+anchor,'Consolidated GTA hub. Unconfirmed facts and regional prices remain attributed or explicitly unknown; language variants do not create duplicate pages.')
    if 'free fire' in k or k=='garena free fire':return yes('free-fire-downloads')
    if re.search(r'chat\s*gpt|gpt chat|claude|gemini|dola ai',k) or k=='free ai':
        if 'dola' in k:return omit('Specific product identity and current free-plan evidence need a dedicated review.')
        return yes('free-ai-chat-tools')
    if 'humanizer' in k or 'ai detector' in k or 'ai checker' in k:return yes('ai-writing-and-detection')
    if any(x in k for x in ['british','learning english','english learning','learnenglish']) or k=='english':return yes('learn-english-free')
    if re.search(r'\bmit\b|mitocw|\bocw\b|opencourseware|open course|courseware',k):return yes('mit-free-courses')
    if any(x in k for x in ['findhelp','find help','aunt bertha']):return yes('find-community-resources')
    if any(x in k for x in ['sparklebox','sparkle box','white rose','elsa','oswaal']):return yes('teaching-resources')
    if any(x in k for x in ['fresources','freesources','fresources','fresources','free sources dtu','free resources dtu','fresources dtu','brayarn','colour semantics','elsa','sparx','sparkl','sparkbox','sparklebox','sparkle box','oswal','oswaal','solution tree','white rose']):return omit('Named provider or ambiguous abbreviation requires a distinct source review; no inferred affiliation or copied product page.')
    if any(x in k for x in ['teacher','classroom','homeschool','educational resources','education resources','school resources','learning material','tpt ','twinkl']):return yes('teaching-resources')
    if k in ['free courses','free course site','free resources for learning','lectures']:return yes('mit-free-courses','General course-discovery intent; MIT is a checked starting point, not a claim to represent every course provider.')
    if any(x in k for x in ['ebook','e book','elibrary','e library','books','book','open library','digital library']):return yes('free-books-and-libraries')
    if any(x in k for x in ['pixabay','picture','images']):return yes('free-images-and-assets')
    if k in ['help','get help','gethelp','i need help','hea','fdr','fres','sparkl','sparkle','que dice']:return omit('Ambiguous or unrelated query; a specific user intent is needed before creating a useful page.')
    if any(x in k for x in ['paid leave','paid family','paid medical','paid parental','paid fmla','is fmla','paid time off','paid holidays','paid holiday']):
        if any(x in k for x in ['maryland','delaware','dc paid','arizona']):return omit('Jurisdiction is outside the checked paid-leave routes; legal/benefit details must not be invented.')
        return yes('paid-leave-official-resources','Official navigation only. No eligibility, legal benefit calculation or employer-policy determination.')
    if k in ['paid meaning','paid vs payed','payed vs paid','paid or payed','payed or paid','payed','pay past tense','paid 意味','paidとは','ペイド','word paid','fully paid','paid out','paid off','paid attention','i paid that','not paid','paid in full','bills must be paid','amount paid','paid by the hours']:
        return yes('paid-or-payed','English usage and context. Unreviewed translations and actual financial or contract determinations are not supplied.')
    if any(x in k for x in ['paid search','paid social','paid media']):return yes('paid-search-and-social')
    if any(x in k for x in ['paid surveys','paidviewpoint','paid viewpoint','paid product testing','paid training jobs','paid internships','paid work']) or k=='get paid':return yes('paid-work-and-surveys')
    if any(x in k for x in ['paid stamp','receipt']):return yes('free-office-and-pdf','Related document preparation workflow; no tax receipt or official stamp is fabricated.')
    if any(x in k for x in ['paid proxy','paid http proxy','vpn free','free vpn','malwarebytes','webroot']):return yes('free-vpn-and-security','Product comparison and publisher route; the guide does not supply a paid account or certify a provider.')
    if any(x in k for x in ['free mail','webmail','zimbra','wetransfer']):return yes('email-and-file-sharing')
    if any(x in k for x in ['microsoft word','word online','pdf editor']):return yes('free-office-and-pdf')
    if any(x in k for x in ['treesize','free convert','download manager','chrome','password generator','qr code','calculator','whatsapp','canva','sketchup']):
        if any(x in k for x in ['canva','sketchup']):return yes('free-images-and-assets')
        return yes('free-utilities')
    if any(x in k for x in ['movies','tubi','pluto','free tv','youtube','music','radio','listen free','free anime']):return yes('free-streaming-and-music')
    if any(x in k for x in ['juegos','crossword','geoguessr','games','game','solitaire','sudoku','mahjong','jigsaw','spades','cribbage','poki','free cell','minecraft','robux','yahtzee','slots','poker']):return yes('free-online-games','Game discovery and access conditions. No currency generator, gambling payout or pirated game is offered.')
    if k in ['resources','links and resources','tool /website /resource','tool website resource','library','fresources','freesources']:return ('mapped','/guides','Broad directory-navigation intent; no separate doorway page.')
    return omit('Unrelated brand/login, news, entertainment, commercial or unclear intent; no misleading landing page is generated.')

files=sorted(source.glob('KeywordStats*.csv'))
assert len(files)==5,'Expected all five supplied files'
rows=[];by=defaultdict(list);fingerprints=defaultdict(list)
for f in files:
    fingerprints[hashlib.sha256(f.read_bytes()).hexdigest()].append(f.name)
    for i,r in enumerate(csv.DictReader(f.open(encoding='utf-8-sig',newline='')),start=2):
        k=norm(r['Keyword']);status,target,reason=route(k)
        entry={'source_file':f.name,'source_row':i,'keyword':r['Keyword'],'normalized_keyword':k,'input_impressions':int(r['Impressions']),'status':status,'target_path':target,'reason':reason}
        rows.append(entry);by[k].append(entry)
unique=[{'keyword':k,'source_occurrences':len(v),'source_files':' | '.join(sorted(set(r['source_file'] for r in v))),'input_impressions_max':max(r['input_impressions'] for r in v),**{field:v[0][field] for field in ['status','target_path','reason']}} for k,v in sorted(by.items())]
out=root/'docs'/'keyword-research';out.mkdir(exist_ok=True)
for name,entries in [('keyword-coverage-all-rows.csv',rows),('keyword-coverage-unique.csv',unique)]:
    with (out/name).open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(entries[0]));w.writeheader();w.writerows(entries)
groups=defaultdict(list)
for item in unique:
    if item['status']=='mapped':groups[item['target_path'].split('#')[0]].append(item['keyword'])
(root/'data'/'keyword-intents.json').write_text(json.dumps([{'path':p,'aliases':a} for p,a in sorted(groups.items())],ensure_ascii=False,indent=2)+'\n')
summary={'date':'2026-11-16','input_files':len(files),'source_rows':len(rows),'unique_keywords':len(unique),'duplicate_rows':len(rows)-len(unique),'duplicate_files':[v for v in fingerprints.values() if len(v)>1],'counts':dict(Counter(x['status'] for x in unique)),'mapped_pages':len(groups),'metric_note':'Impressions is the label in the supplied exports. It is not verified site traffic, monthly search volume, ranking or Search Console data. Duplicate exports are not summed.'}
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
