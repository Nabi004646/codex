"""Append source-traceable discoveries to an exact target without fake padding.

Existing identities, editorial overlaps and lookup aliases remain untouched.
Accepts previously collected whole-repository metadata; normal site builds do
not contact the registries or execute any code from linked repositories.
"""
import argparse
import collections
import copy
import gzip
import hashlib
import json
import subprocess
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

p = argparse.ArgumentParser()
p.add_argument('--seed', default='data/discovery-seed.json.gz')
p.add_argument('--base-total', type=int, default=122614)
p.add_argument('--target', type=int, default=200000)
p.add_argument('--models', action='append', required=True)
p.add_argument('--datasets', required=True)
p.add_argument('--demos', required=True)
p.add_argument('--mcp', required=True)
a = p.parse_args()
seed = json.load(gzip.open(a.seed, 'rt'))
base_count = len(seed['entries'])
original_ids = [row[0] for row in seed['entries']]
seen = {row[2].rstrip('/').lower() for row in seed['entries']}
ids = set(original_ids)
remaining = a.target - a.base_total
if remaining <= 0:
    raise ValueError('Target must exceed the existing catalog')
taxonomy = {c['name']: set(c['subcategories']) for c in json.loads(Path('data/taxonomy.json').read_text())}
report = []
added_rows = []


def append_group(incoming, limit=None):
    global remaining
    source = copy.deepcopy(incoming['source'])
    source_id = len(seed['sources'])
    added = 0
    for row in incoming['records']:
        if not remaining or (limit is not None and added == limit):
            break
        parsed = urlsplit(row['url'])
        if parsed.scheme != 'https' or parsed.username or parsed.password:
            raise ValueError('Only public HTTPS resource links are eligible')
        url = urlunsplit((parsed.scheme, parsed.netloc.lower(), parsed.path.rstrip('/'), parsed.query, parsed.fragment))
        key = url.lower()
        if key in seen:
            continue
        if row['id'] in ids:
            raise ValueError('Resource identity collision')
        if row['subcategory'] not in taxonomy.get(row['category'], set()):
            raise ValueError('Unknown taxonomy for ' + url)
        seen.add(key)
        ids.add(row['id'])
        compact = [row['id'], row['name'], url, row['category'], row['subcategory'], row['kind'], source_id, row['tags'][:8], row['facts']]
        seed['entries'].append(compact)
        added_rows.append(compact)
        added += 1
        remaining -= 1
    if added:
        source['selected_for_this_release'] = added
        source['changes'] += f' This release includes {added:,} qualified, deduplicated entries from this input.'
        seed['sources'].append(source)
        seed['source_manifest'].append(source)
        report.append({'source': source['name'], 'added': added})


for name in [a.mcp, a.demos, a.datasets]:
    append_group(json.loads(Path(name).read_text()))

model_inputs = [json.loads(Path(name).read_text()) for name in a.models]
model_pool = {}
for incoming in model_inputs:
    for row in incoming['records']:
        key = row['url'].rstrip('/').lower()
        if key not in model_pool:
            model_pool[key] = row
models = sorted(model_pool.values(), key=lambda row: (-row['facts'].get('downloads_snapshot', 0), -row['facts'].get('likes_snapshot', 0), row['url']))
source = copy.deepcopy(model_inputs[0]['source'])
source['registry_filters'] = [item['source'].get('registry_filter') for item in model_inputs]
source['api_page_digest_inputs'] = [item['source']['api_pages_sha256'] for item in model_inputs]
source['changes'] = ('Selected distinct whole AI model repositories from public Hub API popularity lists, including license-filtered lists. '
    'Required public, enabled, ungated repository metadata, a revision, a recognized open-license declaration, a recorded task and at least 10 snapshot downloads. '
    'Combined and deduplicated the input lists, ranked by recorded downloads, likes and URL. '
    'Names, URLs and small factual metadata retained; descriptions are original summaries. '
    'No weights, model cards or repository code redistributed. Recorded licenses and popularity are not independent rights, quality, security, hardware or current-availability reviews. Hosted compute can cost money.')
append_group({'source': source, 'records': models})
if remaining:
    raise ValueError(f'{remaining:,} additional qualified unique records are still needed; seed was not written')
assert [row[0] for row in seed['entries'][:base_count]] == original_ids
assert len(seed['entries']) - base_count == a.target - a.base_total
seed['expansion_report'] = report
raw = json.dumps(seed, ensure_ascii=False, separators=(',', ':')).encode()
compressed = gzip.compress(raw, compresslevel=9, mtime=0)
Path(a.seed).write_bytes(compressed)
subprocess.run(['node', 'scripts/catalog/pack-seed.mjs'], check=True)
release = {'previous_total': a.base_total, 'total': a.target, 'added': a.target - a.base_total,
    'previous_seed_entries': base_count, 'seed_entries': len(seed['entries']),
    'seed_sha256': hashlib.sha256(compressed).hexdigest(), 'seed_bytes': len(compressed),
    'added_types': dict(collections.Counter(row[5] for row in added_rows)),
    'added_categories': dict(collections.Counter(row[3] for row in added_rows)),
    'sources': report, 'publication': 'searchable discoveries; current terms require review'}
Path('data/catalog-release.json').write_text(json.dumps(release, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(release, ensure_ascii=False, indent=2))
