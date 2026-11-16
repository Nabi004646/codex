"""Regenerate committed 1200x630 editorial Open Graph cards. Requires Pillow."""
import json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parent.parent
items=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {keywordGuides} from './data/keyword-guides.mjs';import {articles} from './server/public-content.mjs';console.log(JSON.stringify([...keywordGuides,...articles].map(({slug,title,category})=>({slug,title,category}))))"],cwd=root))
items.insert(0,{'slug':'default','title':'Useful resources. A real next step.','category':'Apps · Software · Games · Learning'})
out=root/'public'/'social';out.mkdir(parents=True,exist_ok=True)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def wrap(draw,text,font,width):
    lines=['']
    for word in text.split():
        line=(lines[-1]+' '+word).strip()
        if draw.textlength(line,font=font)>width:lines.append(word)
        else:lines[-1]=line
    return lines
for item in items:
    im=Image.new('RGB',(1200,630),'#f5f3e9');d=ImageDraw.Draw(im)
    d.rectangle((0,0,24,630),fill='#52705a');d.rectangle((62,65,112,115),fill='#f2ce53')
    d.text((135,69),'FreeResourceAtlas',font=ImageFont.truetype(bold,31),fill='#203c2c')
    d.text((65,163),item['category'].upper(),font=ImageFont.truetype(bold,18),fill='#536b59')
    size=52
    while True:
        f=ImageFont.truetype(bold,size);lines=wrap(d,item['title'],f,1050)
        if len(lines)<=3:break
        size-=2
    for n,line in enumerate(lines):d.text((62,215+n*(size+15)),line,font=f,fill='#203c2c')
    d.line((65,510,1135,510),fill='#cdd3c6',width=2)
    d.text((65,546),'Official sources. Clear conditions. Practical guides.',font=ImageFont.truetype(font,23),fill='#536b59')
    im.save(out/(item['slug']+'.png'),optimize=True)
print(f'Prepared {len(items)} social cards at 1200x630.')
