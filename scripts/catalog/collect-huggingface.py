"""Collect public registry metadata, never model weights, data or application code.

Only whole repositories with a recorded open license and public/non-disabled
metadata qualify. Popularity is a snapshot signal, not a quality or safety review.
Cached API pages make interrupted collection resumable and selection auditable.
"""
import argparse
import collections
import datetime as dt
import gzip
import hashlib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

OPEN_LICENSES = {
    'apache-2.0', 'mit', 'bsd', 'bsd-2-clause', 'bsd-3-clause', 'isc',
    'cc0-1.0', 'cc-by-2.0', 'cc-by-2.5', 'cc-by-3.0', 'cc-by-4.0',
    'cc-by-sa-3.0', 'cc-by-sa-4.0', 'unlicense', 'wtfpl', 'mpl-2.0',
    'gpl-2.0', 'gpl-3.0', 'lgpl-2.1', 'lgpl-3.0', 'agpl-3.0',
    'odc-by', 'odc-pddl', 'odc-odbl', 'pddl', 'artistic-2.0', 'zlib',
}
EXCLUDED = re.compile(
    r'nsfw|porn|hentai|deepnude|nudify|undress|deepfake|uncensored|jailbreak|'
    r'credential.?stealer|ransomware|phishing.?kit|password.?dump|data.?breach|'
    r'(?:^|[/_-])(?:dummy|test|testing|hello-world|my-first-model|tmp|temp)(?:$|[/_-])', re.I)


def canonical(value):
    u = urllib.parse.urlsplit(value)
    path = u.path.rstrip('/')
    if u.hostname == 'github.com':
        parts = path.strip('/').split('/')
        if len(parts) >= 2:
            parts[0] = parts[0].lower()
            parts[1] = re.sub(r'\.git$', '', parts[1], flags=re.I).lower()
            path = '/' + '/'.join(parts)
    return urllib.parse.urlunsplit((u.scheme.lower(), u.netloc.lower(), path, u.query, u.fragment))


def classify(kind, identifier, task, tags):
    evidence = ' '.join([identifier, task, *tags]).lower().replace('_', ' ').replace('-', ' ')
    if re.search(r'\b(robotics|robot learning|robot control|lerobot|embodied ai)\b', evidence):
        return 'Science & Engineering', 'Robotics'
    if re.search(r'\b(cybersecurity|intrusion detection|vulnerability detection|malware detection|security detection)\b', evidence):
        return 'Cybersecurity', 'Security Utilities'
    if kind == 'datasets':
        return 'AI & Machine Learning', 'Datasets & Benchmarks'
    if kind == 'spaces':
        return 'AI & Machine Learning', 'AI Demos'
    return 'AI & Machine Learning', 'AI Models & Weights'


def normalize(row, kind, snapshot, minimum_downloads, minimum_likes):
    identifier = row.get('id', '')
    tags = [t for t in row.get('tags', []) if isinstance(t, str)]
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', identifier):
        return None, 'invalid_repository_identity'
    if row.get('private') is not False or row.get('disabled') is not False or not row.get('sha'):
        return None, 'not_explicitly_public_enabled_revision'
    if kind != 'spaces' and row.get('gated') is not False:
        return None, 'gated_or_unknown_access'
    if EXCLUDED.search(identifier + ' ' + ' '.join(tags)):
        return None, 'unsuitable_or_generic_metadata'
    reported = {t.split(':', 1)[1] for t in tags if t.startswith('license:')}
    card_license = (row.get('cardData') or {}).get('license')
    if isinstance(card_license, str):
        reported.add(card_license)
    elif isinstance(card_license, list):
        reported.update(value for value in card_license if isinstance(value, str))
    licenses = sorted(reported & OPEN_LICENSES)
    if not licenses:
        return None, 'no_recognized_open_license_record'
    downloads, likes = row.get('downloads', 0) or 0, row.get('likes', 0) or 0
    if kind != 'spaces' and downloads < minimum_downloads:
        return None, 'below_download_threshold'
    if kind == 'spaces' and likes < minimum_likes:
        return None, 'below_like_threshold'
    task = row.get('pipeline_tag') or next((t.split(':', 1)[1] for t in tags if t.startswith('task_categories:')), '')
    modality = next((t.split(':', 1)[1] for t in tags if t.startswith('modality:')), '')
    if kind == 'models' and not task:
        return None, 'no_task_metadata'
    if kind == 'datasets' and not task and not modality:
        return None, 'no_task_or_modality_metadata'
    if kind == 'spaces':
        stage = (row.get('runtime') or {}).get('stage', '')
        if stage not in {'RUNNING', 'SLEEPING'}:
            return None, 'demo_not_running_or_sleeping_in_snapshot'
    else:
        stage = None
    prefix = {'models': '', 'datasets': '/datasets', 'spaces': '/spaces'}[kind]
    url = 'https://huggingface.co' + prefix + '/' + identifier
    category, subcategory = classify(kind, identifier, task, tags)
    resource_kind = {'models': 'AI model', 'datasets': 'Dataset', 'spaces': 'AI demo'}[kind]
    topic_tags = [resource_kind.lower(), 'hugging face']
    if task:
        topic_tags.append(task.replace('-', ' '))
    elif modality:
        topic_tags.append(modality + ' data')
    if re.search(r'\b(agent|agents|agentic|tool calling|function calling|mcp)\b', identifier.replace('-', ' ').replace('_', ' ').lower() + ' ' + ' '.join(tags)):
        topic_tags.extend(['AI agents', 'agent development'])
    if re.search(r'\b(code|coding|coder|codegen|programming|text to code)\b', identifier.replace('-', ' ').replace('_', ' ').lower() + ' ' + ' '.join(tags)):
        topic_tags.extend(['coding', 'developer tools'])
    if category == 'Science & Engineering':
        topic_tags.extend(['robotics', 'embodied AI'])
    if category == 'Cybersecurity':
        topic_tags.extend(['cybersecurity', 'defensive security'])
    if 'video' in task:
        topic_tags.append('AI video')
    if any(t in task for t in ['speech', 'audio', 'voice', 'text-to-speech']):
        topic_tags.append('voice audio')
    if 'image' in task:
        topic_tags.append('computer vision' if task not in {'text-to-image', 'image-to-image'} else 'AI image generation')
    facts = {
        'snapshot': snapshot, 'registry': 'Hugging Face Hub', 'repo_type': kind,
        'revision': row['sha'], 'license_reported': ' / '.join(licenses),
        'updated_in_snapshot': (row.get('lastModified') or '')[:10],
        'metadata_fetched_at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'source_url': 'https://huggingface.co/api/' + kind + '/' + identifier,
        'task': task.replace('-', ' '), 'modality': modality, 'likes_snapshot': likes,
    }
    task_phrase = (' Recorded task: ' + task.replace('-', ' ') + '.') if task else ((' Recorded data modality: ' + modality + '.') if modality else '')
    if kind == 'models':
        facts['downloads_snapshot'] = downloads
        facts['summary'] = ('AI model repository on Hugging Face.' + task_phrase +
            ' Read the model card for intended use, evaluation, license and hardware needs. Hosted inference and compute may cost money.')
    elif kind == 'datasets':
        facts['downloads_snapshot'] = downloads
        facts['summary'] = ('Dataset repository on Hugging Face.' + task_phrase +
            ' Read the dataset card for provenance, splits, limitations and permissions. A listed license is not an independent rights review.')
    else:
        facts['runtime_in_snapshot'] = stage
        facts['sdk'] = row.get('sdk', '')
        facts['summary'] = ('Interactive AI demo repository on Hugging Face Spaces. Its recorded runtime was ' +
            stage.lower() + '. Availability, quotas and optional paid services can change; check the Space before use.')
    return {
        'id': hashlib.sha256(url.encode()).hexdigest()[:20], 'name': identifier,
        'url': url, 'category': category, 'subcategory': subcategory,
        'kind': resource_kind, 'tags': list(dict.fromkeys(topic_tags))[:8], 'facts': facts,
    }, None


def request_page(url):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname != 'huggingface.co' or not parsed.path.startswith('/api/'):
        raise ValueError('Pagination must remain on the public registry API')
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'FreeResourceAtlas-metadata-catalog/1.0', 'Accept': 'application/json'})
            with urllib.request.urlopen(request, timeout=60) as response:
                raw = response.read()
                link = response.headers.get('Link', '')
                next_match = re.search(r'<([^>]+)>;\s*rel="next"', link)
                return {'url': url, 'sha256': hashlib.sha256(raw).hexdigest(),
                        'rows': json.loads(raw), 'next': next_match.group(1) if next_match else None}
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            if isinstance(error, urllib.error.HTTPError) and error.code not in {429, 500, 502, 503, 504}:
                raise
            if attempt == 3:
                raise
            delay = min(45, int(error.headers.get('Retry-After', 5 * (attempt + 1)))) if isinstance(error, urllib.error.HTTPError) else 5 * (attempt + 1)
            print(json.dumps({'retry': attempt + 1, 'delay_seconds': delay}), flush=True)
            time.sleep(delay)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--kind', choices=['models', 'datasets', 'spaces'], required=True)
    parser.add_argument('--count', type=int, required=True)
    parser.add_argument('--seed', default='data/discovery-seed.json.gz')
    parser.add_argument('--snapshot', required=True)
    parser.add_argument('--minimum-downloads', type=int, default=100)
    parser.add_argument('--minimum-likes', type=int, default=5)
    parser.add_argument('--filter', help='Optional registry tag, for example license:apache-2.0')
    parser.add_argument('--allow-partial', action='store_true', help='Write the actual qualified count when the source is exhausted')
    parser.add_argument('--offline', action='store_true', help='Use existing cached pages only')
    parser.add_argument('--cache', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)
    seed = json.load(gzip.open(args.seed, 'rt'))
    existing = {canonical(entry[2]) for entry in seed['entries']}
    fields = ['tags', 'likes', 'private', 'disabled', 'sha', 'lastModified']
    fields += ['downloads', 'gated'] if args.kind != 'spaces' else ['runtime', 'sdk', 'cardData']
    if args.kind == 'models':
        fields.append('pipeline_tag')
    params = [('sort', 'likes' if args.kind == 'spaces' else 'downloads'), ('direction', '-1'), ('limit', '1000')]
    if args.filter:
        params.append(('filter', args.filter))
    params += [('expand[]', value) for value in fields]
    url = 'https://huggingface.co/api/' + args.kind + '?' + urllib.parse.urlencode(params)
    selected, seen, excluded, hashes = [], set(), collections.Counter(), []
    page_number = 0
    while url and len(selected) < args.count and page_number < 300:
        page_number += 1
        path = cache / f'{args.kind}-{page_number:03d}.json.gz'
        if path.exists():
            page = json.load(gzip.open(path, 'rt'))
            if page['url'] != url:
                raise ValueError('Cached pagination differs; use a fresh cache directory')
        else:
            if args.offline:
                break
            page = request_page(url)
            path.write_bytes(gzip.compress(json.dumps(page, separators=(',', ':')).encode(), mtime=0))
            time.sleep(.25)
        hashes.append(page['sha256'])
        for row in page['rows']:
            resource, reason = normalize(row, args.kind, args.snapshot, args.minimum_downloads, args.minimum_likes)
            if reason:
                excluded[reason] += 1
                continue
            key = canonical(resource['url'])
            if key in existing or key in seen:
                excluded['duplicate_url'] += 1
                continue
            seen.add(key)
            selected.append(resource)
            if len(selected) == args.count:
                break
        print(json.dumps({'kind': args.kind, 'page': page_number, 'selected': len(selected), 'needed': args.count, 'excluded': dict(excluded)}), flush=True)
        # Sorted popularity below threshold cannot yield further qualifying rows.
        metric = 'likes' if args.kind == 'spaces' else 'downloads'
        threshold = args.minimum_likes if args.kind == 'spaces' else args.minimum_downloads
        if page['rows'] and (page['rows'][-1].get(metric) or 0) < threshold:
            break
        url = page['next']
    if len(selected) != args.count and not args.allow_partial:
        raise ValueError(f'Only {len(selected)} eligible {args.kind}; do not pad the requested count')
    label = {'models': 'public AI models', 'datasets': 'public datasets and benchmarks', 'spaces': 'public AI demos'}[args.kind]
    source = {
        'name': 'Hugging Face Hub — ' + label,
        'url': 'https://huggingface.co/' + args.kind, 'license': 'Per-repository reported licenses; check original terms',
        'attribution': 'Repository identities, task tags, popularity and declared license metadata from Hugging Face Hub and the respective repository owners. No model weights, dataset contents, model cards or application code redistributed.',
        'snapshot': args.snapshot, 'api_documentation': 'https://huggingface.co/docs/hub/api',
        'registry_filter': args.filter,
        'api_pages_sha256': hashlib.sha256(''.join(hashes).encode()).hexdigest(),
        'changes': f'Selected {len(selected):,} distinct whole repositories absent from the previous catalog. Required an explicitly public, enabled revision and a recognized open license tag. ' +
            (f'Excluded gated repositories; required at least {args.minimum_downloads} recorded downloads and task or dataset-modality metadata.' if args.kind != 'spaces' else f'Required at least {args.minimum_likes} recorded likes and a RUNNING or SLEEPING runtime snapshot.') +
            ' Names, URLs and small factual metadata retained; descriptions are original summaries. Categories are inferred from task tags and repository identities. Popularity is not an endorsement or current provider, rights, security or hardware verification. Hosted compute may cost money.',
    }
    result = {'source': source, 'records': selected, 'count': len(selected), 'excluded': dict(excluded), 'pages': page_number}
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')))
    print(json.dumps({'complete': args.kind, 'selected': len(selected), 'pages': page_number,
        'categories': dict(collections.Counter(r['category'] for r in selected)), 'output': args.output}), flush=True)


if __name__ == '__main__':
    main()
