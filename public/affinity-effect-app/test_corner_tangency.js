const assert=require('node:assert/strict');
const g=require('./triad_corner_geometry.js');
const V={ll:[140,480],lr:[560,480],apex:[350,480-420*Math.sqrt(3)/2]};
function pointToLineDistance(P,A,B){return Math.abs((B[0]-A[0])*(A[1]-P.y)-(A[0]-P.x)*(B[1]-A[1]))/Math.hypot(B[0]-A[0],B[1]-A[1]);}
for(const corner of ['ll','lr','apex']) {
  const P=g.calculate({vertices:V,corner,radius:40,borderWidth:8});
  const sides={ll:[[V.ll,V.lr],[V.ll,V.apex]],lr:[[V.lr,V.ll],[V.lr,V.apex]],apex:[[V.apex,V.ll],[V.apex,V.lr]]}[corner];
  for(const [A,B] of sides) assert.ok(Math.abs(pointToLineDistance(P,A,B)-44)<1e-7,'not tangent: '+corner);
}
assert.throws(()=>g.calculate({vertices:{...V,apex:[351,116.269]},corner:'ll',radius:40,borderWidth:8}),/equilateral/);
console.log('PASS: 3 corners touch both inner edges; invalid geometry rejected');
