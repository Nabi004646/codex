"""Index whole project links from the attributed Awesome MCP Servers collection.

Retains repository identity and source provenance; source descriptions are not
copied, and the collection's MIT license is never applied to linked projects.
"""
import argparse
import gzip
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

p = argparse.ArgumentParser()
p.add_argument('--readme', required=True)
p.add_argument('--seed', default='data/discovery-seed.json.gz')
p.add_argument('--output', required=True)
p.add_argument('--snapshot', required=True)
a = p.parse_args()
raw = Path(a.readme).read_bytes()
seed = json.load(gzip.open(a.seed, 'rt'))
seen = {r[2].rstrip('/').lower() for r in seed['entries']}
records = []
for line in raw.decode().splitlines():
    match = re.match(r'^\s*[-*]\s+\[([^\]\n]+)\]\((https://github\.com/[^\s)]+)\)', line)
    if not match:
        continue
    _, value = match.groups()
    u = urlsplit(value)
    parts = u.path.strip('/').split('/')
    if len(parts) != 2 or u.query or u.fragment:
        continue
    owner, repo = parts
    if not re.fullmatch(r'[A-Za-z0-9_.-]+', owner) or not re.fullmatch(r'[A-Za-z0-9_.-]+', repo):
        continue
    if re.search(r'credential.?stealer|ransomware|phishing.?kit', value, re.I):
        continue
    url = 'https://github.com/' + owner.lower() + '/' + re.sub(r'\.git$', '', repo, flags=re.I).lower()
    if url in seen:
        continue
    seen.add(url)
    records.append({
        'id': hashlib.sha256(url.encode()).hexdigest()[:20],
        'name': owner + '/' + repo, 'url': url,
        'category': 'AI & Machine Learning', 'subcategory': 'AI Agents',
        'kind': 'GitHub repository',
        'tags': ['MCP', 'MCP servers', 'AI agents', 'agent development', 'integrations'],
        'facts': {'snapshot': a.snapshot,
            'reference': 'https://github.com/punkpeye/awesome-mcp-servers',
            'summary': 'MCP server, framework or integration project listed in Awesome MCP Servers. Read its repository for tools, permissions, setup and pricing. Current security, licensing and service access need review.'},
    })
source = {
    'name': 'Awesome MCP Servers — project discovery links',
    'url': 'https://github.com/punkpeye/awesome-mcp-servers',
    'license': 'MIT (collection only)',
    'license_url': 'https://github.com/punkpeye/awesome-mcp-servers/blob/main/LICENSE',
    'attribution': 'Awesome MCP Servers contributors; Copyright © 2024 Frank Fiegel (frank@glama.ai). Collection notice retained at /catalog-notices/MCP-COLLECTION-LICENSE.txt.',
    'snapshot': a.snapshot, 'readme_sha256': hashlib.sha256(raw).hexdigest(),
    'changes': f'Extracted {len(records):,} distinct whole GitHub project links absent from the existing seed. Names and URLs retained, descriptions replaced with an original scope summary. Source collection licensing does not license linked repositories. Current destination availability, project licenses, pricing, maintenance and security are unverified; entries remain Check terms discoveries.',
}
Path(a.output).write_text(json.dumps({'source': source, 'records': records, 'count': len(records)}, ensure_ascii=False, separators=(',', ':')))
print(json.dumps({'selected': len(records), 'output': a.output}))
