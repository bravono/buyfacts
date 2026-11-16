"""Render the 16 draft TRIADs from triad_instrument.json to editable SVG files.
Pure Python standard library. Edit the JSON to change labels, polarity or point maps.
Each SVG uses font-family Roboto,Arial,sans-serif; no font files are distributed.
Puck circles are tangent to BOTH inner edges at the lower-right corner.
"""
from pathlib import Path
import html, json, sys, math
base=Path(__file__).parent
ins=json.loads((base/'triad_instrument.json').read_text())
out=Path(sys.argv[1]) if len(sys.argv)>1 else base/'generated_triads'
out.mkdir(parents=True,exist_ok=True)
def text(x,y,s,size=25,weight=400,color='#17385E',anchor='start'):
 return f'<text x="{x}" y="{y}" fill="{color}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}">{html.escape(str(s))}</text>'
for n,t in enumerate(ins['triads'],1):
 pts=ins['point_maps'][t['polarity']];h=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 660" width="860" height="660"><rect width="860" height="660" fill="white"/><style>text{font-family:Roboto,Arial,sans-serif}</style>']
 h.append(text(38,58,f'{n:02d}. {t["area"]} / {t["kind"]}',25,700,'#1B679D'))
 h.append(text(38,112,t['driver'],39,700))
 apex_y=485-308*math.sqrt(3)/2
 h.append(f'<polygon points="280,{apex_y:.5f} 434,485 126,485" stroke="#17385E" stroke-width="6" fill="#FFF6E9"/>')
 # Exact tangency to the inner edges of the two sides meeting at the selected corner.
 # An equilateral corner has half-angle 30 degrees: distance from vertex along bisector = 2*r + triangle stroke width.
 puck_r=31.; tri_stroke=6.; offset=(2*puck_r+tri_stroke)*math.sqrt(3)/2
 h.append(f'<circle cx="{434-offset:.3f}" cy="{485-(2*puck_r+tri_stroke)/2:.3f}" r="{puck_r}" fill="#E88E1C"/>')
 h.append(text(280,apex_y-13,pts['apex'],26,700,'#1B679D','middle'));h.append(text(109,525,pts['ll'],26,700,'#1B679D'));h.append(text(430,525,pts['lr'],26,700,'#1B679D'))
 for k,(name,corner) in enumerate([('LOWER LEFT','ll'),('LOWER RIGHT','lr'),('APEX','apex')]):
  y=232+k*108;h.append(text(500,y,f'{name}: {pts[corner]}',23,700,'#007F83'))
  words=t['corners'][corner].split();line='';lines=[]
  for w in words:
   if len(line+' '+w)>22 and line:lines.append(line);line=w
   else:line=(line+' '+w).strip()
  if line:lines.append(line)
  for j,l in enumerate(lines[:2]):h.append(text(500,y+34+j*27,l,24))
 h.append(text(38,620,'Prototype terms. Current instrument records corners only.',22,400,'#6B7F93'));h.append('</svg>')
 (out/f'TRIAD_{n:02d}_{t["id"]}.svg').write_text(''.join(h))
print('Rendered',len(ins['triads']),'editable SVG files into',out)
