"""Check all generated and supplied corner-state TRIAD SVGs for true inner-edge tangency."""
from pathlib import Path
import math, xml.etree.ElementTree as ET
base=Path(__file__).parent
folders=[base/'assets_svg',base/'generated_triads',base/'geometry_examples']
def tag(e):return e.tag.rsplit('}',1)[-1]
def side(a,b):return math.dist(a,b)
def pos(node):return (float(node.get('cx')),float(node.get('cy')))
total=0; errors=[]; files=0
for folder in folders:
 for f in folder.glob('*.svg'):
  files+=1; nodes=list(ET.parse(f).iter())
  triangles=[]
  for e in nodes:
   if tag(e)!='polygon' or not e.get('stroke'):continue
   try: vv=[tuple(map(float,t.split(','))) for t in e.get('points','').split()]
   except:continue
   if len(vv)!=3:continue
   ss=[side(vv[i],vv[(i+1)%3]) for i in range(3)]
   if max(ss)-min(ss)>.05:continue
   top=min(vv,key=lambda p:p[1]);bottoms=sorted((v for v in vv if v!=top),key=lambda p:p[0]);left,right=bottoms
   triangles.append((e,{'ll':left,'lr':right,'apex':top,'center':tuple(sum(a)/3 for a in zip(*vv))},ss[0]))
  for poly,vs,width in triangles:
   puck=[e for e in nodes if tag(e)=='circle' and e.get('fill','').upper() in ('#E88E1C','#E98C20') and side(pos(e),vs['center'])<width*.8]
   if not puck:continue
   e=min(puck,key=lambda q:side(pos(q),vs['center']))
   if side(pos(e),vs['center'])<1.0:continue  # initial unscored puck
   key=min(('ll','lr','apex'),key=lambda key:side(pos(e),vs[key]))
   vertex=vs[key];cent=vs['center'];v=(cent[0]-vertex[0],cent[1]-vertex[1]);d=math.hypot(*v)
   r=float(e.get('r'));stroke=float(poly.get('stroke-width',0));puckstroke=float(e.get('stroke-width',0)) if e.get('stroke') else 0
   travel=2*(r+puckstroke/2)+stroke;expected=(vertex[0]+v[0]/d*travel,vertex[1]+v[1]/d*travel)
   err=side(pos(e),expected)
   if err>.017:errors.append((f.name,key,err))
   total+=1
if errors:raise SystemExit('FAIL: '+str(errors))
print('PASS: ',total,'tangent puck placements across',files,'SVG files')
