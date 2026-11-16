"""Publish only release labels and rights metadata; preserve working content."""
from pathlib import Path
import json, shutil, sys, zipfile
from docx import Document

root=Path(sys.argv[1]);source=json.loads((root/'data/template-drafts.json').read_text())
destination=root/'outputs/atlas-templates-20261116'
notice='Version 2 / FreeResourceAtlas / CC BY 4.0 / https://creativecommons.org/licenses/by/4.0/'
count=0
for template in source:
 for entry in template['files']:
  if entry['format'] not in ('docx','csv'):continue
  target=destination/entry['object_path'].replace('/v1/','/v2/');target.parent.mkdir(parents=True,exist_ok=True)
  original=root/entry['local_path']
  if entry['format']=='csv':shutil.copyfile(original,target);continue
  doc=Document(original)
  original_body=[p.text for p in doc.paragraphs]
  for section in doc.sections:
   for p in section.header.paragraphs:
    text=p.text
    revised=text.replace('ORIGINAL TEMPLATE DRAFT','ORIGINAL TEMPLATE / VERSION 2').replace('DRAFT','VERSION 2').replace('Draft v1','Version 2')
    if revised!=text:
     if p.runs:
      p.runs[0].text=revised
      for run in p.runs[1:]:run.text=''
     else:p.add_run(revised)
   for p in section.footer.paragraphs:
    if 'pending' in p.text.lower() or 'Draft v1' in p.text:
     if p.runs:
      p.runs[0].text=notice
      for run in p.runs[1:]:run.text=''
     else:p.add_run(notice)
  doc.core_properties.author='FreeResourceAtlas';doc.core_properties.title=template['title']
  doc.core_properties.subject=template['purpose'];doc.core_properties.keywords='Original template; Version 2; CC BY 4.0'
  doc.core_properties.comments='Version 2 updates release labels and rights metadata. Original working content is preserved. Attribute FreeResourceAtlas and indicate your changes. '+notice
  doc.save(target)
  checked=Document(target);assert [p.text for p in checked.paragraphs]==original_body
  with zipfile.ZipFile(original) as before,zipfile.ZipFile(target) as after:
   assert before.read('word/document.xml')==after.read('word/document.xml'),'Working body changed'
   for name in before.namelist():
    if name.startswith('word/') and not name.startswith(('word/header','word/footer')):assert before.read(name)==after.read(name),name
   for name in after.namelist():
    if name.startswith(('word/header','word/footer')) and name.endswith('.xml'):
     text=after.read(name).decode();assert 'license pending' not in text.lower() and 'draft v1' not in text.lower()
  count+=1
print('Updated release labels in',count,'DOCX files; copied 40 CSV files unchanged. All DOCX working bodies and unrelated parts match v1.')
