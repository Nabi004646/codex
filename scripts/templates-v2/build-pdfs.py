from pathlib import Path
import json,sys,io,re,subprocess
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import letter,A4,landscape
from reportlab.lib.utils import simpleSplit
from pypdf import PdfReader,PdfWriter
from pypdf.generic import DictionaryObject,NameObject,ArrayObject,NumberObject,BooleanObject,TextStringObject

root=Path(sys.argv[1]);limit=int(sys.argv[2]) if len(sys.argv)>2 else 100
start=int(sys.argv[3]) if len(sys.argv)>3 else 1
base=root/'outputs/atlas-templates-20261116';items=json.loads((root/'data/template-authoring-v2.json').read_text())
font=subprocess.check_output(['fc-match','-f','%{file}','Arial'],text=True).strip()
bold=subprocess.check_output(['fc-match','-f','%{file}','Arial:style=Bold'],text=True).strip()
pdfmetrics.registerFont(TTFont('Atlas',font));pdfmetrics.registerFont(TTFont('AtlasBold',bold))

def wrap_lines(text,font,size,max_width):
 # simpleSplit wraps at spaces only. Break long URL/path tokens so text stays
 # inside its cell while retaining every character in the searchable PDF.
 words=[]
 for token in str(text).split():
  chunk=''
  for char in token:
   if chunk and pdfmetrics.stringWidth(chunk+char,font,size)>max_width:
    words.append(chunk);chunk=''
   chunk+=char
  if chunk:words.append(chunk)
 return simpleSplit(' '.join(words),font,size,max_width)

def build(t):
 size=A4 if t['paper']=='A4' else letter
 if t['type']=='sheet':size=landscape(size)
 width,height=size;margin=38;usable=width-2*margin
 buffer=io.BytesIO();c=canvas.Canvas(buffer,pagesize=size)
 c.setTitle(t['title_plain']);c.setAuthor('FreeResourceAtlas')
 nodes=[{'role':'Document','kids':[]}];mcids=[]
 def node(role,parent=0):
  idx=len(nodes);nodes.append({'role':role,'kids':[],'parent':parent});nodes[parent]['kids'].append(('node',idx));return idx
 def draw(lines,x,y,size=10.5,font='Atlas',role='P',parent=0,color='#17231D',leading=None):
  if not isinstance(lines,list):lines=[lines]
  n=node(role,parent);mid=len(mcids);mcids.append(n);nodes[n]['kids'].append(('mcid',mid))
  c._code.append('/'+role+' <</MCID '+str(mid)+'>> BDC')
  c.setFillColor(color);c.setFont(font,size)
  for line in lines:c.drawString(x,y,str(line));y-=leading or size*1.35
  c._code.append('EMC');return y
 def paragraph(text,y,size=10.5,font='Atlas',role='P',indent=0):
  return draw(simpleSplit(text,font,size,usable-indent),margin+indent,y,size,font,role)
 def table(headers,rows,y,widths):
  tbl=node('Table')
  for row_no,values in enumerate([headers]+rows):
   tr=node('TR',tbl);formatted=[]
   for val,w in zip(values,widths):formatted.append(wrap_lines(str(val or ''),'AtlasBold' if row_no==0 else 'Atlas',9.2,w-12))
   assert all(pdfmetrics.stringWidth(line,'AtlasBold' if row_no==0 else 'Atlas',9.2)<=w-12+.01 for lines,w in zip(formatted,widths) for line in lines)
   h=max(24,max((len(x) for x in formatted),default=1)*12+11)
   x=margin
   for i,lines in enumerate(formatted):
    c.setStrokeColorRGB(.85,.85,.85);c.setLineWidth(.5)
    if row_no==0:c.setFillColorRGB(.961,.831,.42);c.rect(x,y-h,widths[i],h,stroke=1,fill=1)
    else:c.setFillColorRGB(1,1,1);c.rect(x,y-h,widths[i],h,stroke=1,fill=1)
    if lines:draw(lines,x+6,y-15,9.2,'AtlasBold' if row_no==0 else 'Atlas','TH' if row_no==0 else 'TD',tr,leading=12)
    else:
     # An empty editable cell still has a semantic position in the table.
     node('TD',tr)
    x+=widths[i]
   y-=h
  return y
 y=height-margin
 y=draw('FreeResourceAtlas  /  ORIGINAL TEMPLATE / VERSION 2  /  '+str(t['id']).zfill(2),margin,y,8,color='#545B56')-12
 y=paragraph(t['title_plain'],y,21,'AtlasBold','H1')-9
 y=paragraph(t['purpose'],y)-8
 if t['type']=='document':
  y=paragraph('Mark each check To do, Done or Not applicable. Keep evidence for your conclusions and keep secrets out of shared copies.',y,9.5)-10
  y=table(['Status','Check'],[['To do',s] for s in t['steps']],y,[58,usable-58])-18
  y=paragraph('Working notes',y,12,'AtlasBold','H2')-3
  if t.get('working_grid'):
   y=paragraph(t['fields'][0]+' __________________',y,10)-4
   g=t['working_grid'];rows=[[label]+['']*(len(g['headers'])-1) for label in g['rows']]
   y=table(g['headers'],rows,y,[usable/len(g['headers'])]*len(g['headers']))-14
  else:
   for field in t['fields']:
    y=paragraph(field,y,10,'AtlasBold')-4
    c.setStrokeColorRGB(.7,.73,.7);c.line(margin,y,margin+usable,y);y-=22
  y=paragraph('Illustrative example',y,12,'AtlasBold','H2')-2
  y=paragraph(t['example'],y,9.5)-6
  y=paragraph('Review date __________________   Next action __________________',y,9)
 else:
  y=paragraph('Fictional first row. Replace it with a verified record. The editable workbook contains live formulas; the CSV contains values only.',y,9)-9
  sample=[]
  for i,value in enumerate(t['sample']):
   col=chr(65+i)
   if col in t['formulas']:
    value=t['expected'][col]
    if col in t.get('percent',[]):value=str(round(value*100,1))+'%'
    elif isinstance(value,(float,int)):value=('{:,.2f}'.format(value) if isinstance(value,float) else str(value))
   sample.append('' if value is None else str(value))
  y=table(t['headers'],[sample]+[['']*len(sample) for _ in range(10)],y,[usable/len(sample)]*len(sample))-17
  y=paragraph('Record unknowns explicitly. Check the original source for consequential requirements. This worksheet does not establish legal, financial, educational or security suitability.',y,9)-3
  y=paragraph('Review date __________________   Next action __________________',y,9)
 if y<45:raise ValueError('Page overflow for template '+str(t['id'])+': '+str(y))
 c._code.append('/Artifact BMC')
 c.setFont('Atlas',7);c.setFillColorRGB(.34,.37,.35)
 c.drawString(margin,22,'Version 2 / FreeResourceAtlas / CC BY 4.0 / https://creativecommons.org/licenses/by/4.0/')
 c._code.append('EMC');c.showPage();c.save()
 reader=PdfReader(io.BytesIO(buffer.getvalue()));writer=PdfWriter();writer.clone_document_from_reader(reader)
 page=writer.pages[0];page_ref=page.indirect_reference
 tree=DictionaryObject({NameObject('/Type'):NameObject('/StructTreeRoot')});tree_ref=writer._add_object(tree)
 refs=[]
 for n in nodes:
  obj=DictionaryObject({NameObject('/Type'):NameObject('/StructElem'),NameObject('/S'):NameObject('/'+n['role']),NameObject('/Pg'):page_ref})
  refs.append(writer._add_object(obj))
 for i,n in enumerate(nodes):
  obj=refs[i].get_object();obj[NameObject('/P')]=tree_ref if i==0 else refs[n['parent']]
  obj[NameObject('/K')]=ArrayObject([refs[v] if typ=='node' else NumberObject(v) for typ,v in n['kids']])
 parent=DictionaryObject({NameObject('/Nums'):ArrayObject([NumberObject(0),ArrayObject([refs[i] for i in mcids])])})
 tree[NameObject('/K')]=ArrayObject([refs[0]]);tree[NameObject('/ParentTree')]=writer._add_object(parent);tree[NameObject('/ParentTreeNextKey')]=NumberObject(1)
 page[NameObject('/StructParents')]=NumberObject(0);page[NameObject('/Tabs')]=NameObject('/S')
 writer._root_object[NameObject('/StructTreeRoot')]=tree_ref
 writer._root_object[NameObject('/MarkInfo')]=DictionaryObject({NameObject('/Marked'):BooleanObject(True)})
 writer._root_object[NameObject('/Lang')]=TextStringObject('en')
 writer._root_object[NameObject('/ViewerPreferences')]=DictionaryObject({NameObject('/DisplayDocTitle'):BooleanObject(True)})
 writer.add_metadata({'/Title':t['title_plain'],'/Author':'FreeResourceAtlas','/Subject':t['purpose'],'/Keywords':'Original template; Version 2; CC BY 4.0','/Copyright':'2026 FreeResourceAtlas','/License':'Creative Commons Attribution 4.0 International','/LicenseURL':'https://creativecommons.org/licenses/by/4.0/','/Version':'2','/ModificationNotice':'Version 2 updates release labels and license. Working content is unchanged from version 1.'})
 folder=base/t['path'];folder.mkdir(parents=True,exist_ok=True)
 target=folder/(t['slug']+'.pdf')
 with target.open('wb') as f:writer.write(f)
 check=PdfReader(target)
 assert len(check.pages)==1 and check.trailer['/Root']['/MarkInfo']['/Marked']
 assert check.trailer['/Root'].get('/StructTreeRoot') is not None
 extracted=check.pages[0].extract_text()
 for word in t['title_plain'].split():assert word in extracted
 return {'id':t['id'],'pages':1,'paper':t['paper'],'orientation':'landscape' if t['type']=='sheet' else 'portrait','searchable_text':'passed','structure_tree':'present','pdf_ua_certification':'not claimed','visual_review':'pending'}

report=[]
for item in items:
 if start<=item['id']<=limit and (len(sys.argv)<=4 or str(item['id']) in sys.argv[4].split(',')):
  report.append(build(item));print('PDF '+str(item['id']),flush=True)
(base/('pdf-validation-'+str(limit)+'.json')).write_text(json.dumps(report,indent=2)+'\n')
