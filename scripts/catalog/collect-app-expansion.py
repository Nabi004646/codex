"""Create a deduplicated 10k app expansion from pinned public catalog metadata.

Inputs are metadata only. Screenshots and icons remain links to their original
catalog/publisher; no APKs, installers, executables or game archives are fetched.
Each phase checkpoints so an interrupted import can be resumed from cached inputs.
"""
import gzip, hashlib, html, json, re, sys, tarfile, unicodedata, urllib.parse, zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
INPUT=Path(sys.argv[1]).resolve()
DATE='2026-11-15'
TARGET=10000
def normalized(value):
    value=unicodedata.normalize('NFKC',str(value)).casefold()
    return ''.join(c for c in value if c.isalnum())
def canonical(value):
    try:
        u=urllib.parse.urlsplit(value)
        if u.scheme!='https' or not u.hostname or '.' not in u.hostname:return ''
        host=u.hostname.lower().removeprefix('www.');path=u.path.rstrip('/')
        if host=='github.com':path=path.lower().removesuffix('.git')
        return urllib.parse.urlunsplit(('https',host,path,'',''))
    except:return ''
def clean(value):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',value or ''))).strip()
def classify(categories,text,mobile=False):
    c=' '.join(categories).lower();t=text.lower();alltext=c+' '+t
    if re.search(r'game|action|arcade|puzzle|boardgame|strategy|simulation|racing|role.play',c):
        return ('Games & Entertainment','Game Stores & Launchers') if re.search(r'\b(emulator|game engine|game launcher)\b',t) else ('Games & Entertainment','Mobile Games' if mobile else 'PC Games')
    security=r'pentest|penetration|vulnerability|forensic|ethical hack|cybersecurity|security scanner|security analys|security testing|security audit|security toolbox'
    network=r'packet analy|network secur|network analys|network analyz|network diagnos|network monitor|port scan|packet captur|packet sniff|dns lookup'
    matches=lambda pattern:bool(re.search(pattern,t) or any(re.search(pattern,x.lower()) for x in categories))
    if matches(security):return 'Cybersecurity','Digital Forensics' if re.search('forensic',t) else 'Penetration Testing' if re.search('pentest|penetration',t) else 'Security Utilities'
    if matches(network):return 'Cybersecurity','Network Analysis'
    if re.search(r'password|authenticat',alltext):return 'Privacy & Communication','Password Managers'
    if re.search(r'chat|messag|communication|email|internet|browser',c):return 'Privacy & Communication','Messaging' if re.search(r'chat|messag',t) else 'Other Communication Resources'
    if re.search(r'video|movie|film',alltext):return 'Video & Film','Video Editing' if re.search(r'edit',t) else 'Other Video Resources'
    if re.search(r'audio|music|sound|multimedia',alltext):return 'Audio & Music','Other Audio Resources'
    if re.search(r'graphic|design|drawing|draw|photograph',alltext):return 'Design & UI','Graphic Design'
    if re.search(r'math|science|education|learning',alltext):return 'Education & Teaching','Study Tools'
    if re.search(r'finance|budget|accounting',alltext):return 'Finance & Budgeting','Budgeting'
    if re.search(r'fitness|workout|sport|health',c):return 'Fitness & Wellbeing','Activity Tracking'
    if re.search(r'travel|navigation|map|gps',alltext):return 'Travel & Maps','Maps & Navigation'
    if re.search(r'programming|development|debug|code editor|compiler|ide\b',alltext):return 'Developer Tools','Other Developer Tools'
    if re.search(r'artificial intelligence|ai assistant|language model',alltext):return 'AI & Machine Learning','Chat & Assistants'
    return 'Productivity','Other Productivity Resources'

base=json.loads(gzip.decompress((ROOT/'data/discovery-seed.json.gz').read_bytes()))
editorial=json.loads((INPUT/'editorial.json').read_text())
urls={canonical(r[2]) for r in base['entries']}|{canonical(r['url']) for r in editorial}
names={normalized(r[1]) for r in base['entries']}|{normalized(r['name']) for r in editorial}
existing_urls=urls.copy()
sources=[];entries=[];media={};counts=Counter();skipped=Counter()
def source(name,url):
    sources.append({'name':name,'url':url,'snapshot':DATE,'license':'Metadata discovery; linked software and images retain provider terms','changes':'Application identities, compact factual metadata and matching original media references; no application files.'})
    return len(sources)-1
def add(name,url,category,sub,kind,origin,tags,facts,identities=()):
    key=canonical(url);identities={canonical(x) for x in [url,*identities] if canonical(x)}
    if not key or len(clean(name))<2 or not facts.get('image_url','').startswith('https://'):
        skipped['missing_identity_or_media']+=1;return False
    for identity in identities:
        u=urllib.parse.urlsplit(identity)
        # A matching source repository represents the same app; a generic company
        # homepage may represent many apps and must not acquire a random app image.
        if identity in existing_urls and (identity==key or u.hostname=='github.com' and len(u.path.strip('/').split('/'))==2):
            media[identity]={'image_url':facts['image_url'],'image_kind':facts.get('image_kind','publisher'),'source_url':facts.get('source_url',url)}
    n=normalized(name)
    if not n or n in names or identities&urls:skipped['existing_identity']+=1;return False
    if re.search(r'\b(casino|porn|xxx|cracked|warez)\b',name,re.I):skipped['excluded']+=1;return False
    if len(entries)>=TARGET:return False
    urls.update(identities);names.add(n)
    facts={'snapshot':DATE,'registry':sources[origin]['name'],**facts}
    entries.append(['app_'+hashlib.sha256(key.encode()).hexdigest()[:20],clean(name)[:160],url,category,sub,kind,origin,list(dict.fromkeys(tags))[:12],facts]);counts[sources[origin]['name']]+=1
    return True
def checkpoint(phase):
    (INPUT/'apps-expansion-checkpoint.json').write_text(json.dumps({'phase':phase,'sources':sources,'entries':entries,'media':media},ensure_ascii=False,separators=(',',':')))
    print(json.dumps({'phase':phase,'selected':len(entries),'counts':dict(counts)}),flush=True)

kali=source('Kali Linux tool documentation','https://gitlab.com/kalilinux/documentation/kali-tools')
fd=source('F-Droid application catalog','https://f-droid.org/repo/index-v1.jar')
flat=source('Flathub AppStream application catalog','https://dl.flathub.org/repo/appstream/x86_64/appstream.xml.gz')
apple=source('Apple App Store software catalog','https://performance-partners.apple.com/search-api')

with tarfile.open(INPUT/'kali-tools.tar.gz') as archive:
    members=set(archive.getnames())
    for path in sorted(members):
        if not re.fullmatch(r'kali-tools-main/[^/]+/index.md',path):continue
        slug=path.split('/')[1]
        if slug.startswith(('kali-','lib','python3-')):continue
        raw=archive.extractfile(path).read().decode('utf8','replace')
        fields=dict(re.findall(r'^(Title|Homepage|Metapackages|Icon):[ \t]*(.*)$',raw,re.M))
        icon=fields.get('Icon','')
        if not icon or 'kali-tools-main/'+slug+'/'+icon not in members:continue
        metas=[t.removeprefix('kali-tools-') for t in fields.get('Metapackages','').split() if t.startswith('kali-tools-')]
        if not metas:continue
        url='https://www.kali.org/tools/'+slug+'/'
        sub='Digital Forensics' if any(t in ' '.join(metas) for t in ['forensic','recover']) else 'Network Analysis' if any(t in metas for t in ['sniffing-spoofing','wireless','information-gathering']) else 'Penetration Testing' if any(t in metas for t in ['exploitation','vulnerability','web','passwords','post-exploitation']) else 'Incident Response' if any(t in metas for t in ['respond','detect']) else 'Security Utilities'
        add(fields.get('Title',slug),url,'Cybersecurity',sub,'Desktop software',kali,['cybersecurity','ethical hacking','pentesting',*metas],{'image_url':'https://gitlab.com/kalilinux/documentation/kali-tools/-/raw/main/'+slug+'/'+icon,'image_kind':'logo','source_url':url,'platforms':['Linux'],'summary':fields.get('Title',slug)+' is documented in the Kali tool catalog for '+(', '.join(metas[:3]).replace('-',' ') or 'authorized security assessment')+'. Read the original documentation and practice only in systems or labs you are authorized to test.'},[fields.get('Homepage','')])
checkpoint('kali')

with zipfile.ZipFile(INPUT/'fdroid-v1.jar') as archive:fdroid=json.loads(archive.read('index-v1.json'))
fdrows=[]
for app in fdroid['apps']:
    localized=app.get('localized',{});locale=next((v for v in ['en-US','en','en-GB'] if v in localized),next(iter(localized),''));local=localized.get(locale,{})
    name=local.get('name') or app.get('name');appid=app.get('packageName');cats=app.get('categories',[])
    anti=app.get('antiFeatures',[])
    if not name or not appid or 'KnownVuln' in anti:continue
    image='';imagekind='screenshot';prefix='https://f-droid.org/repo/'+appid+'/'+locale+'/'
    if local.get('featureGraphic'):image=prefix+urllib.parse.quote(local['featureGraphic']);imagekind='publisher'
    for device in ['phoneScreenshots','sevenInchScreenshots','tenInchScreenshots','tvScreenshots']:
        if not image and local.get(device):image=prefix+device+'/'+urllib.parse.quote(local[device][0])
    if not image and local.get('icon'):image=prefix+urllib.parse.quote(local['icon']);imagekind='logo'
    if not image and app.get('icon'):image='https://f-droid.org/repo/icons/'+urllib.parse.quote(app['icon']);imagekind='logo'
    if not image:continue
    summary=clean(local.get('summary') or app.get('summary') or '')
    cat,sub=classify(cats,summary,True);kind='Game' if cat=='Games & Entertainment' and sub!='Game Stores & Launchers' else 'Mobile app'
    fdrows.append((cat!='Games & Entertainment',-int(app.get('lastUpdated',0)),name,'https://f-droid.org/packages/'+appid+'/',cat,sub,kind,cats,{'image_url':image,'image_kind':imagekind,'source_url':'https://f-droid.org/packages/'+appid+'/','platforms':['Android'],'mobile_platforms':['android'],'license_reported':app.get('license',''),'summary':(summary[:150].rstrip('.')+'. ' if summary else '')+'Android application cataloged by F-Droid; check its listing for current compatibility and access terms.'},[app.get('webSite',''),app.get('sourceCode','')]))

def english_node(app,tag):
    values=app.findall(tag)
    node=next((v for v in values if not v.get('{http://www.w3.org/XML/1998/namespace}lang')),None)
    if node is None:node=next((v for v in values if v.get('{http://www.w3.org/XML/1998/namespace}lang') in ['en','en-US']),None)
    return node.text if node is not None else ''
xml=ET.fromstring(gzip.decompress((INPUT/'flathub-xml.gz').read_bytes()));active=set(json.loads((INPUT/'flathub.json').read_text()));flatrows=[]
for app in xml.findall('component'):
    appid=app.findtext('id') or ''
    if appid not in active or app.get('type') not in ['desktop-application','console-application']:continue
    name=english_node(app,'name');summary=english_node(app,'summary') or '';cats=[c.text for c in app.findall('categories/category') if c.text]
    shots=[i.text for i in app.findall('screenshots/screenshot/image') if i.get('type')=='source' and (i.text or '').startswith('https://')]
    icons=[i.text for i in app.findall('icon') if i.get('type')=='remote' and (i.text or '').startswith('https://')]
    if not name or not shots+icons:continue
    image=(shots+icons)[0];kind='screenshot' if shots else 'logo';cat,sub=classify(cats,summary);homepage=next((u.text for u in app.findall('url') if u.get('type')=='homepage'),'')
    flatrows.append((cat!='Games & Entertainment',name,'https://flathub.org/apps/'+appid,cat,sub,'Game' if cat=='Games & Entertainment' and sub!='Game Stores & Launchers' else 'Desktop software',cats,{'image_url':image,'image_kind':kind,'source_url':'https://flathub.org/apps/'+appid,'platforms':['Linux'],'license_reported':app.findtext('project_license') or '','summary':clean(summary)[:150]+'. Linux application listed on Flathub. Packaging may be maintained by its publisher or community; check current terms.'},[homepage]))
fdrows.sort(key=lambda r:(r[0],r[1],r[2]));flatrows.sort(key=lambda r:(r[0],r[1]))
for n in range(max(len(fdrows),len(flatrows))):
    if n<len(fdrows):
        _,_,name,url,cat,sub,kind,tags,facts,identity=fdrows[n];add(name,url,cat,sub,kind,fd,tags,facts,identity)
    if n<len(flatrows):
        _,name,url,cat,sub,kind,tags,facts,identity=flatrows[n];add(name,url,cat,sub,kind,flat,tags,facts,identity)
checkpoint('android-linux')

iosfiles=[INPUT/'ios-games.json',*sorted((INPUT/'ios').glob('*.json'))]
for p in iosfiles:
    for app in json.loads(p.read_text()).get('results',[]):
        name=app.get('trackName');url=canonical(app.get('trackViewUrl',''));cats=app.get('genres',[])
        if not name or not url or app.get('kind')!='software':continue
        screenshots=app.get('screenshotUrls') or app.get('ipadScreenshotUrls') or []
        image=next((s for s in screenshots if s.startswith('https://')),None) or app.get('artworkUrl512') or app.get('artworkUrl100')
        cat,sub=classify(cats,name+' '+clean(app.get('description',''))[:300],True);kind='Game' if cat=='Games & Entertainment' else 'Mobile app'
        purpose=clean(app.get('description','')).split('. ')[0][:110].rstrip('. ')
        add(name,url,cat,sub,kind,apple,cats,{'image_url':image or '', 'image_kind':'screenshot' if screenshots else 'logo','source_url':url,'platforms':['iOS'],'mobile_platforms':['ios'],'summary':(purpose+'. ' if purpose else '')+'iOS application listed by Apple in '+str(app.get('primaryGenreName','Software'))+'. Check its App Store page for current price, subscriptions and compatibility.'},[app.get('sellerUrl','')])
checkpoint('ios')
if len(entries)!=TARGET:raise SystemExit('Need more distinct primary catalog records: '+str(len(entries)))

payload={'snapshot':DATE,'sources':sources,'entries':entries};encoded=json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode()
destination=ROOT/'data/apps-expansion.json.gz';destination.write_bytes(gzip.compress(encoded,mtime=0))
media_bytes=json.dumps(media,ensure_ascii=False,separators=(',',':')).encode()
media_path=ROOT/'data/source-media-overrides.json.gz';media_path.write_bytes(gzip.compress(media_bytes,mtime=0))
(ROOT/'data/source-media-overrides.json').unlink(missing_ok=True)
report={'added':len(entries),'sources':dict(counts),'types':dict(Counter(r[5] for r in entries)),'categories':dict(Counter(r[3] for r in entries)),'media_references':len(media),'skipped':dict(skipped),'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'compressed_bytes':destination.stat().st_size,'snapshot':DATE,'media_sha256':hashlib.sha256(media_path.read_bytes()).hexdigest(),'media_compressed_bytes':media_path.stat().st_size,'input_snapshots':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [INPUT/'kali-tools.tar.gz',INPUT/'fdroid-v1.jar',INPUT/'flathub-xml.gz',INPUT/'flathub.json',*iosfiles]}}
(ROOT/'data/apps-expansion-release.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
