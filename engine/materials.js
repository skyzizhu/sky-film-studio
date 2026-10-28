'use strict';
// Local 2.5D illustration helpers, not a physical lighting simulation.
(() => {
 const profiles=Object.freeze({
  clay:{base:'#b97c55',dark:'#704632',light:'#efbb86',roughness:.9,grain:50},
  paper:{base:'#ede2c6',dark:'#c5b58e',light:'#fff7df',roughness:1,grain:36},
  metal:{base:'#83938d',dark:'#334942',light:'#e4ece2',roughness:.24,grain:12},
  wood:{base:'#967147',dark:'#533c26',light:'#d7b783',roughness:.8,grain:44}
 });
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function bounds(o){
  if(!o||![o.x,o.y,o.width,o.height].every(Number.isFinite)||o.width<=0||o.height<=0)
   throw new Error('MaterialFX requires finite positive bounds');
  return o;
 }
 function random(seed){let a=seed|0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
 function surface(ctx,path,box,o={}){
  const b=bounds(box),p=profiles[o.material||'clay'];
  if(!p)throw new Error(`Unknown material: ${o.material}`);
  const roughness=clamp(o.roughness??p.roughness,0,1),lx=o.light?.x??-.7,ly=o.light?.y??-1;
  if(![roughness,lx,ly].every(Number.isFinite))throw new Error('Invalid material light/roughness');
  const n=Math.hypot(lx,ly)||1,cx=b.x+b.width/2,cy=b.y+b.height/2;
  ctx.save();ctx.clip(path);
  const g=ctx.createLinearGradient(cx+lx/n*b.width/2,cy+ly/n*b.height/2,cx-lx/n*b.width/2,cy-ly/n*b.height/2);
  g.addColorStop(0,o.lightColor||p.light);g.addColorStop(.35,o.base||p.base);g.addColorStop(1,o.dark||p.dark);
  ctx.fillStyle=g;ctx.fillRect(b.x,b.y,b.width,b.height);
  const rng=random(o.seed??1),count=clamp(Math.floor(o.grain??p.grain),0,300);
  for(let i=0;i<count;i++){
   const x=b.x+rng()*b.width,y=b.y+rng()*b.height;
   ctx.fillStyle=i%2?'rgba(24,18,10,.10)':'rgba(255,252,233,.18)';
   if(o.material==='wood'){ctx.fillRect(x,b.y,.5+rng(),b.height);}
   else if(o.material==='paper'){ctx.fillRect(x,y,2+rng()*6,.5);}
   else {ctx.beginPath();ctx.arc(x,y,.35+rng()*1.15,0,Math.PI*2);ctx.fill();}
  }
  if(roughness<.75){
   const s=ctx.createLinearGradient(b.x,b.y,b.x+b.width,b.y+b.height);
   s.addColorStop(0,'rgba(255,255,255,0)');s.addColorStop(.38,'rgba(255,255,255,0)');
   s.addColorStop(.47,`rgba(255,255,255,${(1-roughness)*.52})`);
   s.addColorStop(.57,'rgba(255,255,255,0)');s.addColorStop(1,'rgba(255,255,255,0)');
   ctx.fillStyle=s;ctx.fillRect(b.x,b.y,b.width,b.height);
  }
  ctx.restore();
 }
 function shadow(ctx,o){
  const {x,y,width,height}=bounds(o),z=Math.max(0,o.elevation??0),opacity=clamp(o.opacity??.25,0,1);
  if(![z,opacity].every(Number.isFinite))throw new Error('Invalid shadow elevation/opacity');
  ctx.save();ctx.translate(x+width/2+z*.22,y+height/2+z*.16);
  ctx.scale(width/2+z*.22,height/2+z*.10);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,`rgba(0,0,0,${opacity/(1+z/90)})`);g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 // An explicitly timed inspection highlight; no ambient looping or subtitle pass.
 function sweep(ctx,t,path,box,o){
  const b=bounds(box);
  if(![t,o.start,o.end].every(Number.isFinite)||o.end<=o.start)throw new Error('Invalid sweep interval');
  if(t<=o.start||t>=o.end)return;
  const u=(t-o.start)/(o.end-o.start),w=b.width*.22,x=b.x-w+(b.width+2*w)*u;
  ctx.save();ctx.clip(path);ctx.globalAlpha*=Math.sin(Math.PI*u)*(o.opacity??.18);
  const g=ctx.createLinearGradient(x-w,0,x+w,0);g.addColorStop(0,'rgba(255,255,255,0)');
  g.addColorStop(.5,'rgba(255,255,245,1)');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(x-w,b.y,w*2,b.height);ctx.restore();
 }
 // Alignment guides belong in a cutaway/exploded-view content callback.
 function guide(ctx,from,to,o={}){
  if(![from.x,from.y,to.x,to.y].every(Number.isFinite))throw new Error('Invalid guide points');
  ctx.save();ctx.globalAlpha*=clamp(o.opacity??.4,0,1);ctx.strokeStyle=o.color||'#b6d5da';
  ctx.lineWidth=o.width??1.5;ctx.setLineDash(o.dash||[5,7]);ctx.beginPath();
  ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();ctx.restore();
 }
 window.MaterialFX=Object.freeze({profiles,surface,shadow,sweep,guide});
})();
