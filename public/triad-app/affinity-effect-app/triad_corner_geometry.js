/* Equilateral TRIAD corner tangency. Coordinates are SVG user units. MIT-style integration example. */
(function(root) {
 "use strict";
 const names=['ll','lr','apex'];
 function calculate({vertices,corner, radius, borderWidth, puckOutlineWidth=0}) {
  if(!names.includes(corner)) throw new Error('Unknown TRIAD corner: '+corner);
  const A=vertices.ll,B=vertices.lr,C=vertices.apex;
  const len=(v,w)=>Math.hypot(v[0]-w[0],v[1]-w[1]);
  const sides=[len(A,B),len(B,C),len(C,A)];
  if(Math.max(...sides)-Math.min(...sides)>1e-4) throw new Error('TRIAD must be equilateral');
  if(radius<=0 || borderWidth<0 || puckOutlineWidth<0) throw new Error('Invalid puck or stroke geometry');
  const centroid=[(A[0]+B[0]+C[0])/3,(A[1]+B[1]+C[1])/3];
  const V=vertices[corner],dx=centroid[0]-V[0],dy=centroid[1]-V[1],d=Math.hypot(dx,dy);
  // The visible exterior radius includes half of any puck outline stroke.
  // At 60deg each side is 30deg to angle bisector; sin(30deg)=1/2.
  const physicalRadius=radius+puckOutlineWidth/2;
  const travel=2*physicalRadius+borderWidth;
  if(travel>=d) throw new Error('Puck too large for clear corner placement');
  return {x:V[0]+dx/d*travel,y:V[1]+dy/d*travel,
          radius, physicalRadius, corner, distanceFromVertex:travel,
          strokeInnerEdgeClearance:physicalRadius};
 }
 const api={calculate};
 if(typeof module!=='undefined' && module.exports)module.exports=api;
 else root.TRiADCornerGeometry=api;
})(typeof window!=='undefined'?window:this);
