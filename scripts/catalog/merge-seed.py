"""Merge pinned discovery inputs without replacing existing editorial identities."""
import argparse, gzip, hashlib, json
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--add',action='append',required=True);p.add_argument('--output',default='data/discovery-seed.json.gz');a=p.parse_args()
seed=json.loads(Path(a.base).read_text());taxonomy={c['name']:set(c['subcategories']) for c in json.loads(Path('data/taxonomy.json').read_text())}
def canonical(value):
 u=urlsplit(value);path=u.path
 if u.hostname=='github.com':
  parts=path.strip('/').split('/')
  if len(parts)>=2:
   parts[0]=parts[0].lower();parts[1]=parts[1].removesuffix('.git').lower();path='/'+('/'.join(parts))
 return urlunsplit((u.scheme.lower(),u.netloc.lower(),path,u.query,u.fragment))
seen={canonical(r[2]) for r in seed['entries']};ids={r[0] for r in seed['entries']};report=[]
for file in a.add:
 incoming=json.loads(Path(file).read_text());source=incoming['source'];source_id=len(seed['sources']);seed['sources'].append(source);seed['source_manifest'].append(source);added=0;duplicates=0
 for row in incoming['records']:
  url=canonical(row['url'])
  if url in seen:duplicates+=1;continue
  if row['category'] not in taxonomy or row['subcategory'] not in taxonomy[row['category']]:raise ValueError('Unknown taxonomy for '+url)
  rid=row.get('id') or hashlib.sha256(url.encode()).hexdigest()[:20]
  if rid in ids: raise ValueError('ID collision for '+url)
  seen.add(url);ids.add(rid)
  seed['entries'].append([rid,row['name'],url,row['category'],row['subcategory'],row['kind'],source_id,row.get('tags',[])[:8],row.get('facts',{})]);added+=1
 report.append({'source':source['name'],'provided':len(incoming['records']),'added':added,'duplicates':duplicates})
seed['schema_version']=1;seed['expansion_report']=report
raw=json.dumps(seed,ensure_ascii=False,separators=(',',':')).encode();compressed=gzip.compress(raw,compresslevel=9,mtime=0);Path(a.output).write_bytes(compressed)
Path('reports/catalog-expansion.json').write_text(json.dumps({'seed_entries':len(seed['entries']),'seed_bytes':len(compressed),'sha256':hashlib.sha256(compressed).hexdigest(),'sources':report},indent=2))
print(json.dumps({'seed_entries':len(seed['entries']),'seed_bytes':len(compressed),'sources':report}))
