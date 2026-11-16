from pathlib import Path
import concurrent.futures, json, subprocess, sys
root=Path(sys.argv[1]);output=root/'outputs/atlas-templates-20261116/docx-qa';output.mkdir(exist_ok=True)
files=sorted((root/'outputs/atlas-templates-20261116/templates').rglob('*.docx'))
renderer='/home/agent/.codex/skills/builtins/documents/render_docx.py'
def render(p):
 target=output/p.stem
 result=subprocess.run([sys.executable,renderer,str(p),'--output_dir',str(target),'--dpi','96','--emit_pdf'],capture_output=True,text=True,timeout=180)
 (output/(p.stem+'.log')).write_text(result.stdout+'\n'+result.stderr)
 if result.returncode:raise RuntimeError(p.stem+': renderer failed; inspect its log')
 pages=sorted(target.glob('page-*.png'))
 if not pages:raise RuntimeError(p.stem+': renderer produced no pages')
 print('Rendered DOCX '+p.stem+' ('+str(len(pages))+' pages)',flush=True)
 return {'file':p.name,'pages':len(pages),'path':str(target)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(render,files))
(output/'render-report.json').write_text(json.dumps(results,indent=2)+'\n')
print('Rendered all '+str(len(results))+' DOCX files for release review.',flush=True)
