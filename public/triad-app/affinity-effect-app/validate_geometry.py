"""Zero-dependency geometry preflight for SVG triangles (standard library)."""
from pathlib import Path
import math,sys,xml.etree.ElementTree as ET
folders=[Path(sys.argv[1])] if len(sys.argv)>1 else [Path(__file__).parent/'generated_triads',Path(__file__).parent/'geometry_examples']
total=0;checked=set()
for folder in folders:
 for file in folder.glob('*.svg'):
  if file.resolve() in checked:continue
  checked.add(file.resolve())
  for el in ET.parse(file).iter():
   if not el.tag.endswith('polygon'):continue
   try: points=[tuple(map(float,p.split(','))) for p in el.get('points','').split()]
   except:continue
   if len(points)!=3:continue
   a,b,c=points
   if abs(b[1]-c[1])>.01 or abs(a[0]-(b[0]+c[0])/2)>.1 or a[1]>=b[1] or abs(b[0]-c[0])<80:continue
   side=[math.dist(a,b),math.dist(a,c),math.dist(b,c)];total+=1
   assert max(side)-min(side)<.05,f'NOT equilateral: {file.name}: {side}'
print(f'PASS: {total} equilateral TRIAD drawings across {len(checked)} SVG files')
