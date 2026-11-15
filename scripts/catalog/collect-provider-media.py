"""Resolve actual publisher-declared images; never synthesize resource artwork.

The snapshot stores URLs and attribution, not image copies or installers.
Output is checkpointed after each result so an interrupted refresh retains work.
"""
import concurrent.futures, gzip, html, json, sys, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
DATE='2026-11-15'
class Metadata(HTMLParser):
 def __init__(self):super().__init__();self.meta={};self.icons=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta':self.meta[a.get('property',a.get('name','')).lower()]=a.get('content','')
  if tag=='link' and 'icon' in a.get('rel','').lower() and a.get('href'):self.icons.append(a['href'])
def collect(row):
 url=row['url']; result={'name':row['name'],'source_url':url,'checked_on':DATE}
 try:
  request=urllib.request.Request(url,headers={'User-Agent':'FreeResourceAtlasPublisherPreview/1.0 (+https://freeresourceatlas.com)'})
  with urllib.request.urlopen(request,timeout=10) as response:raw=response.read(3000000).decode('utf8','replace');final=response.url
  parser=Metadata();parser.feed(raw)
  value=parser.meta.get('og:image') or parser.meta.get('twitter:image') or parser.meta.get('twitter:image:src');kind='publisher'
  if not value and parser.icons:value=parser.icons[-1];kind='logo'
  if value:
   image=urllib.parse.urljoin(final,html.unescape(value))
   if image.startswith('https://'):return url,{**result,'image_url':image,'image_kind':kind}
  return url,{**result,'status':'no_publisher_preview'}
 except Exception as error:return url,{**result,'status':type(error).__name__}
PINNED={
 'Free Fire':('https://play-lh.googleusercontent.com/hnnIRd5AAf7T2gWzwki00aA9aWMX9JUbr8N42WjGqSVEq36Ey5_T0GCvyekeBkn_rSknR3vXvF4zTkZh4j-KRw=s0-br30','https://play.google.com/store/apps/details?id=com.dts.freefireth'),
 'PUBG MOBILE':('https://www.pubgmobile.com/images/event/home/share.jpg','https://www.pubgmobile.com/en-US/home.shtml'),
 'Grand Theft Auto V':('https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3240220/header.jpg?t=1781187782','https://store.steampowered.com/app/3240220/Grand_Theft_Auto_V_Enhanced/'),
 'Grand Theft Auto VI':('https://www.rockstargames.com/VI/_next/static/media/meta.0t8ty~nlmxq2s.jpg?yvw8ZozOI7a7Kz1war9qe','https://www.rockstargames.com/VI')}
PINNED.update({'DaVinci Resolve': ('https://images.blackmagicdesign.com/images/products/davinciresolve/overview/onesolution/edit.jpg?_v=1774849327', 'https://www.blackmagicdesign.com/products/davinciresolve'), '7-Zip': ('https://www.7-zip.org/7ziplogo.png', 'https://www.7-zip.org/'), 'Khan Academy': ('https://is1-ssl.mzstatic.com/image/thumb/PurpleSource116/v4/6d/95/0a/6d950a24-dab9-cd4d-84d0-9bbb8f63fbd4/2202ea67-fa88-4a35-a215-26e47da28d94_0_APP_IPHONE_55_0.png/392x696bb.png', 'https://apps.apple.com/us/app/khan-academy/id469863705?uo=4')})
PIN_KINDS={'DaVinci Resolve':'screenshot','7-Zip':'logo','Khan Academy':'screenshot','VALORANT':'logo','Minecraft':'logo','Brawlhalla':'logo'}

def apply_flathub(output, rows, filename):
 """Match explicit app IDs, avoiding unrelated products with the same name."""
 ids={'Shotcut':'org.shotcut.Shotcut','Krita':'org.kde.krita','OpenShot':'org.openshot.OpenShot','Kdenlive':'org.kde.kdenlive.desktop','Joplin':'net.cozic.joplin_desktop','Obsidian':'md.obsidian.Obsidian','Audacity':'org.audacityteam.Audacity','KeePassXC':'org.keepassxc.KeePassXC.desktop','OBS Studio':'com.obsproject.Studio','GIMP':'org.gimp.GIMP','LibreOffice':'org.libreoffice.LibreOffice','GnuCash':'org.gnucash.GnuCash','Godot':'org.godotengine.Godot','Zotero':'org.zotero.Zotero','SuperTuxKart':'net.supertuxkart.SuperTuxKart','VLC media player':'org.videolan.VLC','Firefox':'org.mozilla.firefox','Google Chrome':'com.google.Chrome','Brave':'com.brave.Browser','Thunderbird':'org.mozilla.thunderbird','Signal':'org.signal.Signal','Telegram':'org.telegram.desktop','Discord':'com.discordapp.Discord','Zoom':'us.zoom.Zoom','Proton Mail':'me.proton.Mail','Bitwarden':'com.bitwarden.desktop','Todoist':'com.todoist.Todoist','Inkscape':'org.inkscape.Inkscape','Visual Studio Code':'com.visualstudio.code','Android Studio':'com.google.AndroidStudio','Anki':'net.ankiweb.Anki','Organic Maps':'app.organicmaps.desktop','Spotify':'com.spotify.Client','HandBrake':'fr.handbrake.ghb','calibre':'com.calibre_ebook.calibre','Steam':'com.valvesoftware.Steam'}
 raw=Path(filename).read_bytes();xml=ET.fromstring(gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw)
 apps={c.findtext('id'):c for c in xml.findall('component')}
 count=0
 for row in rows:
  app=apps.get(ids.get(row['name']))
  if app is None:continue
  image=next((i.text for i in app.findall('screenshots/screenshot/image') if i.get('type')=='source' and (i.text or '').startswith('https://')),None)
  if image:
   output[row['url']]={'name':row['name'],'source_url':'https://flathub.org/apps/'+app.findtext('id'),'image_url':image,'image_kind':'screenshot','checked_on':DATE};count+=1
 return count

if __name__=='__main__':
 rows=json.loads(Path(sys.argv[1]).read_text());dest=Path(sys.argv[2]);output=json.loads(dest.read_text()) if dest.exists() else {}
 with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
  for count,(url,result) in enumerate(pool.map(collect,rows),1):
   if result['name'] in PINNED:
    image,source=PINNED[result['name']];result={**result,'image_url':image,'image_kind':PIN_KINDS.get(result['name'],'publisher'),'source_url':source};result.pop('status',None)
   if result['name'] in PIN_KINDS and result.get('image_url'):result['image_kind']=PIN_KINDS[result['name']]
   output[url]=result;dest.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
   if count%20==0:print(json.dumps({'processed':count,'images':sum('image_url' in r for r in output.values())}),flush=True)
 if len(sys.argv)>3:
  screenshots=apply_flathub(output,rows,sys.argv[3]);dest.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'app_screenshots':screenshots}),flush=True)
 print(json.dumps({'processed':len(output),'images':sum('image_url' in r for r in output.values())}),flush=True)
