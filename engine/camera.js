// Local content framing. Chrome/subtitles stay outside this clipped transform.
'use strict';
window.FrameCamera=(()=>{
 function sample(t,frames){
  if(!Array.isArray(frames)||!frames.length)throw new Error('Camera needs keyframes');
  let previous=-Infinity;
  for(const f of frames){if(![f.at,f.x,f.y,f.zoom].every(Number.isFinite)||f.zoom<=0||f.at<=previous)throw new Error('Invalid camera keyframe');previous=f.at;}
  let a=frames[0],b=a;
  for(const f of frames){if(t>=f.at)a=f;else{b=f;break;}b=a;}
  const u=a===b?0:Math.max(0,Math.min(1,(t-a.at)/(b.at-a.at))),q=u*u*(3-2*u);
  return {x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q,zoom:a.zoom+(b.zoom-a.zoom)*q};
 }
 function project(point,pose,viewport){return {x:viewport.x+viewport.width/2+(point.x-pose.x)*pose.zoom,y:viewport.y+viewport.height/2+(point.y-pose.y)*pose.zoom};}
 function draw(ctx,t,config,fn){
  const v=config.viewport,p=sample(t,config.frames);
  if(!v||![v.x,v.y,v.width,v.height].every(Number.isFinite)||v.width<=0||v.height<=0)throw new Error('Invalid camera viewport');
  ctx.save();ctx.beginPath();ctx.rect(v.x,v.y,v.width,v.height);ctx.clip();
  ctx.translate(v.x+v.width/2,v.y+v.height/2);ctx.scale(p.zoom,p.zoom);ctx.translate(-p.x,-p.y);
  try{fn(p);}finally{ctx.restore();}
 }
 return {sample,project,draw};
})();
