"""Cache public metadata inputs for collect-app-expansion.py, without installers.

Usage: python3 scripts/catalog/fetch-app-catalogs.py /absolute/cache-directory
Then: node scripts/prepare-seed.mjs
      python3 scripts/catalog/collect-app-expansion.py /absolute/cache-directory

Existing cache files are reused. Apple queries are spaced at least 3.2 seconds
apart; the App Store results are discovery metadata, not current-price review.
The F-Droid .jar URL is its signed JSON metadata index, never executed.
"""
import concurrent.futures, json, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(sys.argv[1]).resolve();OUT.mkdir(parents=True,exist_ok=True)
IOS=OUT/'ios';IOS.mkdir(exist_ok=True)
BULK={
 'kali-tools.tar.gz':'https://gitlab.com/kalilinux/documentation/kali-tools/-/archive/main/kali-tools-main.tar.gz',
 'fdroid-v1.jar':'https://f-droid.org/repo/index-v1.jar',
 'flathub-xml.gz':'https://dl.flathub.org/repo/appstream/x86_64/appstream.xml.gz',
 'flathub.json':'https://flathub.org/api/v2/appstream',
}
def get(path,url):
    if path.exists():return
    request=urllib.request.Request(url,headers={'User-Agent':'FreeResourceAtlasCatalog/1.0 (+https://freeresourceatlas.com)'})
    with urllib.request.urlopen(request,timeout=90) as response:raw=response.read()
    temp=path.with_suffix(path.suffix+'.part');temp.write_bytes(raw);temp.replace(path)
    print(path.name,len(raw),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for result in pool.map(lambda item:get(OUT/item[0],item[1]),BULK.items()):pass

terms=['games','puzzle','chess','racing','adventure','strategy','arcade','drawing','photo editor','video editor','music','audio recorder','notes','calendar','task manager','productivity','office','pdf','education','language learning','math','science','coding','security','network tools','password manager','authenticator','fitness','workout','nutrition','maps','travel','weather','budget','invoice','business','calculator','utilities','file manager','browser','messaging']
for term in terms:
    path=OUT/'ios-games.json' if term=='games' else IOS/(term.replace(' ','-')+'.json')
    if path.exists():continue
    url='https://itunes.apple.com/search?'+urllib.parse.urlencode({'term':term,'entity':'software','media':'software','country':'us','limit':200,'explicit':'No'})
    start=time.monotonic();get(path,url)
    time.sleep(max(0,3.2-(time.monotonic()-start)))

editorial=subprocess.check_output(['node','--input-type=module','-e',"import {catalog} from './server/catalog.mjs'; console.log(JSON.stringify(catalog.map(({name,url})=>({name,url}))));"],cwd=ROOT)
json.loads(editorial)
(OUT/'editorial.json').write_bytes(editorial)
