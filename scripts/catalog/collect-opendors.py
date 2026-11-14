"""Select whole, licensed research-software repositories from a pinned source.
Metadata is CC BY4.0 (DLR/Stephan Druskat). Provider licenses are snapshot reports,
not a claim of current terms, independent testing, or a current security audit.
Run with an already-downloaded official archive; no credentials are used.
"""
import argparse, collections, hashlib, json, re, tarfile
from pathlib import Path
from urllib.parse import urlparse

parser=argparse.ArgumentParser()
parser.add_argument('--archive',required=True)
parser.add_argument('--output',required=True)
parser.add_argument('--since',default='2020-01-01')
args=parser.parse_args()
p=Path(args.archive)
assert hashlib.md5(p.read_bytes()).hexdigest()=='e5f0875f880f8aabfd65f5b6910d70b5','Official OpenDORS archive checksum differs'
with tarfile.open(p) as archive:
 member=next(m for m in archive.getmembers() if m.name=='OpenDORS.v2025-11.json')
 rows=json.load(archive.extractfile(member))['research_software']
allowed={'MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','GPL-2.0','GPL-3.0','LGPL-2.1','LGPL-3.0','AGPL-3.0','MPL-2.0','ISC','Unlicense','CC0-1.0','EPL-1.0','EPL-2.0','Artistic-2.0','BSL-1.0','Zlib','MIT-0','GPL-2.0-or-later','GPL-3.0-or-later'}
excluded=collections.Counter();records=[]
for row in rows:
 repo=next((r for r in row.get('repositories',[]) if r.get('main_repo') and r.get('accessible')),None)
 if not repo: excluded['no_accessible_main_repository']+=1;continue
 latest=repo.get('latest') or {}
 if latest.get('date','')<args.since: excluded['older_snapshot_update']+=1;continue
 licenses=[l['license'] for l in latest.get('licenses',[]) if l.get('license') in allowed and l.get('confidence',0)>=95]
 if not licenses or not latest.get('languages'): excluded['no_qualified_license_or_languages']+=1;continue
 original=row['canonical_url'];u=urlparse(original);parts=u.path.strip('/').split('/')
 if u.scheme!='https' or u.netloc.lower()!='github.com' or len(parts)!=2 or u.query or u.fragment: excluded['not_whole_https_github_project']+=1;continue
 owner,name=parts
 if not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}',name) or name.lower().endswith('.github.io') or name.lower() in {'test','testing','sandbox','hello-world','my-first-repo','my-first-project','temp','tmp'} or re.search(r'ransomware|credential.?stealer|phishing.?kit',name,re.I): excluded['not_useful_directory_entry']+=1;continue
 url='https://github.com/'+owner.lower()+'/'+re.sub(r'\.git$','',name,flags=re.I).lower()
 languages=[r['language'] for r in sorted(latest['languages'],key=lambda r:-r['fraction']) if r['fraction']>=0.05][:4]
 # A research-software category is source-supported; language tags do not imply
 # product purpose, device requirements, a hosted free plan, or country access.
 category,subcategory='Science & Engineering','Other Science Resources'
 facts={'license_reported':' / '.join(sorted(set(licenses))),'snapshot':'2025-11','revision':latest.get('revision_id',''),'languages':languages,'updated_in_snapshot':latest['date'][:10]}
 mention=next((m for m in row['mentions'] if m.get('id_type') in {'arxiv','pmc'}),None)
 if mention:
  facts['reference']=('https://arxiv.org/abs/'+mention['id']) if mention['id_type']=='arxiv' else ('https://pmc.ncbi.nlm.nih.gov/articles/PMC'+mention['id']+'/')
 records.append({'id':hashlib.sha256(url.encode()).hexdigest()[:20],'name':name+' · '+owner,'url':url,'category':category,'subcategory':subcategory,'kind':'GitHub repository','tags':['research software','open research',*languages],'facts':facts,'mentions':len(row['mentions'])})
records.sort(key=lambda r:(-r['mentions'],r['facts']['updated_in_snapshot'],r['url']),reverse=False)
source={'name':'OpenDORS v2025-11 — research software metadata','url':'https://zenodo.org/records/17560612','license':'CC BY4.0','license_url':'https://creativecommons.org/licenses/by/4.0/','attribution':'Stephan Druskat; Copyright (C)2025 German Aerospace Center(DLR). DOI10.5281/zenodo.17560612.','snapshot':'2025-11','source_archive_md5':'e5f0875f880f8aabfd65f5b6910d70b5','changes':'Selected whole GitHub projects with recorded accessible main repositories, a recognized open-source license at confidence95+ and a recorded update since '+args.since+'. Names, canonical URLs, language tags and small historical provenance fields retained; no code redistributed. Current provider terms and security have not been independently checked.'}
output={'source':source,'records':records,'excluded':dict(excluded),'count':len(records)}
Path(args.output).write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'accepted':len(records),'excluded':dict(excluded),'output':args.output}))
