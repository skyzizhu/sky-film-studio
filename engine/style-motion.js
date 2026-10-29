'use strict';
// Draw content annotations in local coordinates. No global post-processing.
window.StyleMotion=(()=>{
 const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>x*x*(3-2*x);
 function style(o){
  const key=o.style||(typeof FILM_META!=='undefined'?FILM_META?.direction?.style:window.FILM_META?.direction?.style)||'blueprint';
  if(!['blueprint','museum','whiteboard','archive','product'].includes(key))throw Error(`Unknown motion style: ${key}`);
  return key;
 }
 function phase(t,event){
  if(!Number.isFinite(t)||!Array.isArray(event)||event.length!==2||!event.every(Number.isFinite)||event[1]<=event[0])throw Error('Invalid annotation event');
  return clamp((t-event[0])/(event[1]-event[0]));
 }
 function geometry(points,key,seed){
  if(!Array.isArray(points)||points.length<2||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('Annotation requires finite points');
  return points.map((p,i)=>{
   const jitter=key==='whiteboard'&&i>0&&i<points.length-1;
   return {x:p.x+(jitter?Math.sin(i*13+seed)*1.1:0),y:p.y+(jitter?Math.cos(i*17+seed)*1.1:0)};
  });
 }
 function sample(points,u){
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  const total=lengths.reduce((a,b)=>a+b,0);
  if(total<=0)throw Error('Annotation path must have length');
  let left=u*total;const visible=[points[0]];
  for(let i=0;i<lengths.length;i++){
   const a=points[i],b=points[i+1],d=lengths[i];
   if(left>=d){visible.push(b);left-=d;continue;}
   const v=d?left/d:0;visible.push({x:a.x+(b.x-a.x)*v,y:a.y+(b.y-a.y)*v});break;
  }
  return {visible,tip:visible[visible.length-1]};
 }
 function trace(ctx,t,event,points,o={}){
  const key=style(o),raw=phase(t,event),u=key==='whiteboard'?raw:smooth(raw);
  const p=geometry(points,key,o.seed??1),result=sample(p,u);
  if(t<=event[0])return {...result,active:false,progress:0};
  ctx.save();ctx.globalAlpha*=o.opacity??1;ctx.strokeStyle=o.color||'#78d1df';
  ctx.lineWidth=o.width??(key==='whiteboard'?4:2);ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash([]);
  ctx.beginPath();result.visible.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  if(raw<1){
   const {x,y}=result.tip;
   if(key==='blueprint'){
    ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-9,y);ctx.lineTo(x+9,y);ctx.moveTo(x,y-9);ctx.lineTo(x,y+9);ctx.stroke();
   }else if(key==='whiteboard'){
    ctx.fillStyle=o.color||'#2870c8';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8,y-24);ctx.lineTo(x+17,y-19);ctx.closePath();ctx.fill();
   }else{
    ctx.fillStyle=o.color||'#c7a574';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
   }
  }
  ctx.restore();return {...result,active:raw>0&&raw<1,progress:u};
 }
 function focus(ctx,t,event,box,o={}){
  if(!box||![box.x,box.y,box.width,box.height].every(Number.isFinite)||box.width<=0||box.height<=0)throw Error('Invalid focus bounds');
  const key=style(o),u=phase(t,event);
  if(t<=event[0]||t>=event[1])return;
  const {x,y,width:w,height:h}=box;
  ctx.save();ctx.globalAlpha*=(o.opacity??.8)*Math.min(1,u*5,(1-u)*5);
  ctx.strokeStyle=o.color||'#78d1df';ctx.lineWidth=o.width??2;ctx.setLineDash([]);
  ctx.beginPath();
  if(key==='blueprint'){
   const d=Math.min(w,h)*.18;
   for(const [xx,yy,sx,sy] of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){
    ctx.moveTo(xx+sx*d,yy);ctx.lineTo(xx,yy);ctx.lineTo(xx,yy+sy*d);
   }
  }else if(key==='museum'||key==='archive'){
   ctx.moveTo(x+w*.5,y+h);ctx.lineTo(x+w*.5,y+h+15);ctx.lineTo(x+w*.85,y+h+15);
   ctx.moveTo(x+w*.5+3,y+h);ctx.arc(x+w*.5,y+h,3,0,Math.PI*2);
  }else if(key==='product'){
   ctx.moveTo(x+w*.15,y+h+10);ctx.lineTo(x+w*.85,y+h+10);
  }else{
   ctx.lineWidth=o.width??4;ctx.lineCap='round';ctx.moveTo(x,y+h+7);ctx.quadraticCurveTo(x+w*.45,y+h+11,x+w,y+h+5);
  }
  ctx.stroke();ctx.restore();
 }
 return Object.freeze({trace,focus});
})();
