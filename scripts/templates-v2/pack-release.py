"""Pin the reviewed release bytes; never upload or publish as a side effect."""
from pathlib import Path
import gzip, hashlib, io, json, tarfile, zipfile

root = Path(__file__).resolve().parents[2]
base = root / 'outputs/atlas-templates-20261116'
rows = json.loads((root / 'data/template-drafts.json').read_text())
sha = lambda value: hashlib.sha256(value).hexdigest()
license_text = ('FreeResourceAtlas original templates, version 2.\n'
    'Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).\n'
    'https://creativecommons.org/licenses/by/4.0/\n'
    'Credit FreeResourceAtlas, link to the license, and indicate changes.\n'
    'Source: https://freeresourceatlas.com/templates\n'
    'Version 2 updates release labels and license notices; fictional examples are retained.\n')
inventory = []
for row in rows:
    row.update(version=2, license='CC BY 4.0', license_url='https://creativecommons.org/licenses/by/4.0/',
        license_state='owner_approved_cc_by_4_0', review_state='native_bytes_text_and_render_checked',
        published=False, preview_url='/template-previews/v2/' + str(row['id']).zfill(3) + '.webp')
    for file in row['files']:
        name = file['object_path'].replace('/v1/', '/v2/')
        local = 'outputs/atlas-templates-20261116/' + name
        content = (root / local).read_bytes()
        file.update(object_path=name, local_path=local, bytes=len(content), sha256=sha(content),
            version=2, uploaded=False, public_url=None, license_approved=True, publication='draft')
        inventory.append(dict(path=name, bytes=len(content), sha256=sha(content)))
assert len(rows) == 100 and len(inventory) == 240
metadata = json.dumps(rows, ensure_ascii=False, indent=2) + '\n'
(root / 'data/template-release-v2.json').write_text(metadata)
pack = base / 'native-templates-20261116-v2.zip'
with zipfile.ZipFile(pack, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name, data in [('manifest.json', metadata.encode()), ('LICENSE.txt', license_text.encode())] + [
            (f['path'], (base / f['path']).read_bytes()) for f in sorted(inventory, key=lambda x:x['path'])]:
        info=zipfile.ZipInfo(name, (2026,11,16,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=0o100644 << 16;z.writestr(info,data)
archive=io.BytesIO()
with tarfile.open(fileobj=archive,mode='w',format=tarfile.USTAR_FORMAT) as tar:
    for file in sorted(inventory, key=lambda x:x['path']):
        content=(base / file['path']).read_bytes();info=tarfile.TarInfo(file['path'])
        info.size=len(content);info.mode=0o644;info.mtime=0;tar.addfile(info,io.BytesIO(content))
raw=archive.getvalue();compressed=gzip.compress(raw,compresslevel=9,mtime=0)
folder=root/'data/template-release-source-v2';folder.mkdir(exist_ok=True);parts=[]
for index,start in enumerate(range(0,len(compressed),1250000)):
    value=compressed[start:start+1250000];name='data/template-release-source-v2/part-'+str(index).zfill(3)+'.bin'
    (root/name).write_bytes(value);parts.append(dict(path=name,bytes=len(value),sha256=sha(value)))
inventory.sort(key=lambda x:x['path'])
manifest=dict(version=2,encoding='tar+gzip',format='ustar',metadata='data/template-release-v2.json',
    destination='outputs/atlas-templates-20261116',resources=100,files=240,
    asset_bytes=sum(x['bytes'] for x in inventory),tar_bytes=len(raw),bytes=len(compressed),sha256=sha(compressed),
    inventory_sha256=sha(json.dumps(inventory,separators=(',',':')).encode()),license='CC BY 4.0',
    release_archive=dict(path='review-packs/'+pack.name,bytes=pack.stat().st_size,sha256=sha(pack.read_bytes())),parts=parts)
(root/'data/template-release-source-v2.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'files':240,'asset_bytes':manifest['asset_bytes'],'release_archive':manifest['release_archive']}))
