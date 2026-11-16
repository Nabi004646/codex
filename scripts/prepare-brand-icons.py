"""Export the existing brand artwork into browser icon sizes; requires Pillow."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
source=Image.open(root/'public/brand/FreeResourceAtlas-icon-512.png').convert('RGBA')
for size in [96,180,192]:
    source.resize((size,size),Image.Resampling.LANCZOS).save(root/f'public/brand/favicon-{size}.png',optimize=True)
source.save(root/'public/favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64),(96,96)])
print('Exported existing artwork as a multi-size root ICO and 96/180/192px PNGs.')
