"""Select additional, source-attributed repository leads without inventing facts.

The OpenDORS dataset is CC BY 4.0; that does not license a linked project.
Missing project-license evidence remains unknown and all additions are discoveries.
"""
import argparse
import gzip
import hashlib
import json
import re
import tarfile
from pathlib import Path
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('--archive', required=True)
parser.add_argument('--seed', default='data/discovery-seed.json.gz')
parser.add_argument('--editorial', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--count', type=int, default=30000)
args = parser.parse_args()
archive_path = Path(args.archive)
with archive_path.open('rb') as handle:
    assert hashlib.file_digest(handle, 'md5').hexdigest() == 'e5f0875f880f8aabfd65f5b6910d70b5'
with tarfile.open(archive_path) as archive:
    projects = json.load(archive.extractfile('OpenDORS.v2025-11.json'))['research_software']
seed = json.load(gzip.open(args.seed, 'rt'))
existing = {entry[2].rstrip('/').lower() for entry in seed['entries']}
existing.update(url.rstrip('/').lower() for url in json.loads(Path(args.editorial).read_text()))
candidates = {}
generic = {'test', 'testing', 'sandbox', 'hello-world', 'my-first-repo',
           'my-first-project', 'temp', 'tmp', 'data', 'code', 'scripts'}
for project in projects:
    parsed = urlsplit(project['canonical_url'])
    parts = parsed.path.strip('/').split('/')
    if parsed.scheme != 'https' or parsed.netloc.lower() != 'github.com' or len(parts) != 2 or parsed.query or parsed.fragment:
        continue
    owner, name = parts
    if not re.fullmatch(r'[A-Za-z0-9_.-]{3,100}', name) or name.lower() in generic or name.lower().endswith('.github.io'):
        continue
    if re.search(r'ransomware|credential.?stealer|phishing.?kit', name, re.I):
        continue
    url = ('https://github.com/' + owner + '/' + re.sub(r'\.git$', '', name, flags=re.I)).lower()
    if url in existing:
        continue
    repository = next((r for r in project.get('repositories', []) if r.get('main_repo') and r.get('accessible')), None)
    latest = (repository or {}).get('latest') or {}
    if latest.get('date', '') < '2020-01-01' or not latest.get('languages') or not project.get('mentions'):
        continue
    languages = [r['language'] for r in sorted(latest['languages'], key=lambda r: -r['fraction']) if r['fraction'] >= .05][:4]
    licenses = sorted({r['license'] for r in latest.get('licenses', []) if r.get('license') and r.get('confidence', 0) >= 95})
    facts = {'snapshot': '2025-11', 'revision': latest.get('revision_id', ''),
             'languages': languages, 'updated_in_snapshot': latest['date'][:10],
             'summary': 'Research repository recorded by OpenDORS. Language metadata: ' + ', '.join(languages) + '. Check the project documentation, current license and maintenance before reuse.'}
    if licenses:
        facts['license_reported'] = ' / '.join(licenses)
    mention = next((m for m in project['mentions'] if m.get('id_type') in {'arxiv', 'pmc'}), None)
    if mention:
        facts['reference'] = ('https://arxiv.org/abs/' + mention['id']) if mention['id_type'] == 'arxiv' else ('https://pmc.ncbi.nlm.nih.gov/articles/PMC' + mention['id'] + '/')
    candidates[url] = {'id': hashlib.sha256(url.encode()).hexdigest()[:20],
                       'name': name + ' · ' + owner, 'url': url,
                       'category': 'Science & Engineering', 'subcategory': 'Other Science Resources',
                       'kind': 'GitHub repository', 'tags': ['research software', 'open research', *languages],
                       'facts': facts, 'mentions': len(project['mentions'])}
selected = sorted(candidates.values(), key=lambda r: (-r['mentions'], -int(r['facts']['updated_in_snapshot'].replace('-', '')), r['url']))[:args.count]
assert len(selected) == args.count, 'Not enough distinct eligible repositories; do not pad the count'
source = {'name': 'OpenDORS v2025-11 — additional research repository leads',
          'url': 'https://zenodo.org/records/17560612', 'license': 'CC BY4.0',
          'license_url': 'https://creativecommons.org/licenses/by/4.0/',
          'attribution': 'Stephan Druskat; Copyright (C)2025 German Aerospace Center(DLR). DOI10.5281/zenodo.17560612.',
          'snapshot': '2025-11', 'source_archive_md5': 'e5f0875f880f8aabfd65f5b6910d70b5',
          'changes': 'Selected 30,000 distinct whole GitHub repository leads absent from the previous catalog. The source recorded an accessible main repository, referencing publication, language metadata and an update since2020. Ranked by source-reference count, snapshot update and URL. Project-license evidence may be missing; dataset licensing does not license the linked projects. Current availability, free use, safety and maintenance are unverified. Names, URLs and small historical metadata retained; no project code redistributed.'}
output = {'source': source, 'records': selected, 'count': len(selected)}
Path(args.output).write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')))
print(json.dumps({'selected': len(selected), 'qualified_candidates': len(candidates),
                  'with_reported_license': sum(bool(r['facts'].get('license_reported')) for r in selected),
                  'without_license_evidence': sum(not r['facts'].get('license_reported') for r in selected)}))
