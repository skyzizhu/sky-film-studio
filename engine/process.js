// Deterministic process animation: contact coverage, identity-preserving layouts,
// and pick/carry/place. No frame history or physics simulation is required.
'use strict';
window.ProcessMotion = (() => {
  const phase=(t,a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
  const ease=u=>u*u*(3-2*u);
  function intersection(a,b) {
    const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);
    const right=Math.min(a.x+a.width,b.x+b.width),bottom=Math.min(a.y+a.height,b.y+b.height);
    return right>x && bottom>y?{x,y,width:right-x,height:bottom-y}:null;
  }
  function unionArea(rects) {
    const xs=[...new Set(rects.flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b);
    let area=0;
    for(let i=1;i<xs.length;i++) {
      const lo=xs[i-1],hi=xs[i];
      const ys=rects.filter(r=>r.x<hi && r.x+r.width>lo)
        .map(r=>[r.y,r.y+r.height]).sort((a,b)=>a[0]-b[0]);
      let end=-Infinity,height=0;
      for(const [a,b] of ys){height+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}
      area+=(hi-lo)*height;
    }
    return area;
  }
  function sweptRegions(sweeps,t) {
    return sweeps.filter(s=>t>=s.start).map(s=>{
      const x=s.x0+(s.x1-s.x0)*phase(t,s.start,s.end);
      return {x:Math.min(s.x0,x)-s.width/2,y:s.y-s.height/2,
        width:Math.abs(x-s.x0)+s.width,height:s.height};
    });
  }
  function coverage(rect,sweeps,t) {
    if(!(rect.width>0 && rect.height>0)) throw new Error('Invalid contact surface');
    const regions=sweptRegions(sweeps,t).map(r=>intersection(rect,r)).filter(Boolean);
    return Math.min(1,unionArea(regions)/(rect.width*rect.height));
  }
  function sampleSweep(sweeps,t) {
    const s=sweeps.find(s=>t>=s.start && t<s.end);
    if(!s)return null;
    return {x:s.x0+(s.x1-s.x0)*phase(t,s.start,s.end),y:s.y,width:s.width,height:s.height};
  }
  function reorder(items,destinations) {
    if(destinations.length!==items.length || new Set(destinations).size!==items.length ||
       destinations.some(i=>!Number.isInteger(i)||i<0||i>=items.length)) throw new Error('Layout must be a permutation');
    const result=Array(items.length);items.forEach((item,i)=>result[destinations[i]]=item);return result;
  }
  function imprint(items,columns) {
    if(!Number.isInteger(columns)||columns<1||items.length%columns)throw new Error('Invalid imprint grid');
    return items.map((_,i)=>items[Math.floor(i/columns)*columns+columns-1-i%columns]);
  }
  function carry(t,{start,end,from,to,lift=60}) {
    if(!(end>start))throw new Error('Invalid carry interval');
    const u=phase(t,start,end),travel=ease(phase(u,.22,.78));
    const z=lift*(u<.22?ease(u/.22):u>.78?1-ease((u-.78)/.22):1);
    return {x:from.x+(to.x-from.x)*travel,y:from.y+(to.y-from.y)*travel,z,done:u>=1};
  }
  return {phase,regions:sweptRegions,coverage,sampleSweep,reorder,imprint,carry};
})();
