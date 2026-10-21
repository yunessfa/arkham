from pathlib import Path
import hashlib,shutil,zipfile,json
root=Path('/data/arkham');dest=Path('/data/ARKHAM-delivery');preview=root/'qa/previews';preview.mkdir(exist_ok=True)
for old in preview.glob('*.png'):old.unlink()
for p in (root/'qa/v7').glob('*.png'):
 shutil.copy2(p,preview/('v7-'+p.name))
files=[root/f for f in ['README.fa.md','.env.example','.gitignore','.dockerignore','docker-compose.yml']]
for folder in ['backend','frontend','deploy','docs','scripts','qa']:
 for p in (root/folder).rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(root)
  if any(x in ['node_modules','__pycache__','media','staticfiles'] for x in rel.parts):continue
  if str(rel).startswith('frontend/public/docs/'):continue
  if folder=='qa' and p.suffix=='.png' and p.parent!=preview:continue
  if p.suffix in ['.log','.pyc','.sock','.pid','.sqlite3']:continue
  if str(rel).endswith('-package.json'):continue
  files.append(p)
files=sorted(set(files))
(root/'MANIFEST.sha256').write_text('\n'.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(root)) for p in files)+'\n')
files.append(root/'MANIFEST.sha256');archive=dest/'ARKHAM-refined-v7-source-and-reports.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files:z.write(p,Path('arkham')/p.relative_to(root))
secrets=[(root/n).read_bytes().strip() for n in ['.local-secret','.demo-secret'] if (root/n).exists()]
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 names=z.namelist();assert not any('/.env' in n and not n.endswith('.env.example') for n in names)
 assert not any(x in n for n in names for x in ['/node_modules/','/.venv/','/.pgdata/','.sqlite3'])
 assert not any(secret in z.read(n) for secret in secrets for n in names)
 for p in ['docs/REFINEMENT-V7.fa.md','qa/reports/v7-browser.json','qa/reports/v7-preview.json','frontend/src/story/StoryHome.tsx','frontend/src/design/Design.tsx','backend/store/design.py','backend/manage.py','frontend/dist/index.html']:
  assert 'arkham/'+p in names
report={'fileCount':len(files),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'integrity':'passed','localSecretScan':'passed'}
(dest/'v7-package-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
