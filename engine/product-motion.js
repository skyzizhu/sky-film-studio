'use strict';
// Deterministic launch-film motion: timed poses and masked, measured type.
window.ProductMotion=(()=>{
 const clamp=x=>Math.max(0,Math.min(1,x));
 const defaults={x:0,y:0,scale:1,rx:0,ry:0,rz:0,opacity:1};
 const curves={linear:u=>u,smooth:u=>u*u*u*(10+u*(-15+6*u)),arrive:u=>1-(1-u)**4};
 function meta(){return typeof FILM_META!=='undefined'?FILM_META:window.FILM_META;}
 function easing(u,key){if(!curves[key])throw Error('Unknown product easing: '+key);return curves[key](clamp(u));}
 function track(t,frames){
  if(!Number.isFinite(t)||!Array.isArray(frames)||!frames.length)throw Error('Product track requires finite time and keyframes');
  let last=-Infinity,previous={...defaults};
  const poses=frames.map(f=>{
   if(!Number.isFinite(f.at)||f.at<=last)throw Error('Product keyframes must be strictly ordered');last=f.at;
   const p={...previous,...f,ease:f.ease};for(const k of Object.keys(defaults))if(!Number.isFinite(p[k]))throw Error('Invalid product pose: '+k);
   if(p.scale<=0||p.opacity<0||p.opacity>1)throw Error('Invalid product scale/opacity');
   if(p.ease&&!curves[p.ease])throw Error('Unknown product easing');previous=p;return p;
  });
  if(t<=poses[0].at)return {...poses[0]};
  if(t>=poses.at(-1).at)return {...poses.at(-1)};
  let a=poses[0],b=poses[1];for(let i=1;i<poses.length;i++)if(t<poses[i].at){a=poses[i-1];b=poses[i];break;}
  const u=easing((t-a.at)/(b.at-a.at),b.ease||meta()?.product?.easing||'arrive'),out={at:t};
  for(const k of Object.keys(defaults))out[k]=a[k]+(b[k]-a[k])*u;
  return out;
 }
 function type(ctx,t,event,text,o={}){
  if(!Number.isFinite(t)||!Array.isArray(event)||event.length!==2||!event.every(Number.isFinite)||event[0]>=event[1]||typeof text!=='string')throw Error('Invalid product type event');
  const x=o.x??0,y=o.y??0,size=o.size??100,width=o.maxWidth??(typeof W==='number'?W*.85:1000),dy=o.dy??size*.7;
  if(![x,y,size,width,dy].every(Number.isFinite)||size<=0||width<=0)throw Error('Invalid product type geometry');
  const u=easing((t-event[0])/(event[1]-event[0]),o.ease||meta()?.product?.easing||'arrive');
  const weight=o.weight??meta()?.product?.type_weight??700,font=o.font||'Noto Sans SC';
  ctx.save();
  try{
   ctx.font=`${weight} ${size}px "${font}"`;let fit=size*Math.min(1,width/Math.max(1,ctx.measureText(text).width));
   ctx.font=`${weight} ${fit}px "${font}"`;const measured=ctx.measureText(text).width;
   if(u<=0)return {progress:0,size:fit,width:measured};
   ctx.beginPath();ctx.rect(x-width*.02,y-fit*1.25,width*1.04,fit*1.58);ctx.clip();
   ctx.globalAlpha*=u;ctx.fillStyle=o.color||meta()?.product?.ink||'#172a2d';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText(text,x,y+(1-u)*dy);
   return {progress:u,size:fit,width:measured};
  }finally{ctx.restore();}
 }
 // Replace conflicting content in one reading region, with no crossfade overlap.
 // Keep the surrounding card/product state outside these callbacks.
 function replace(ctx,t,event,drawBefore,drawAfter){
  if(!Number.isFinite(t)||!Array.isArray(event)||event.length!==4||!event.every(Number.isFinite)||
    !(event[0]<event[1]&&event[1]<=event[2]&&event[2]<event[3])||
    typeof drawBefore!=='function'||typeof drawAfter!=='function')throw Error('Invalid product replace event');
  const [start,clear,show,end]=event;
  let phase='clear',opacity=0,draw;
  if(t<clear){phase='before';opacity=1-easing((t-start)/(clear-start),'smooth');draw=drawBefore;}
  else if(t>show){phase='after';opacity=easing((t-show)/(end-show),'smooth');draw=drawAfter;}
  if(opacity>0){ctx.save();try{ctx.globalAlpha*=opacity;draw(ctx,t);}finally{ctx.restore();}}
  return {phase,opacity};
 }
 // A short temporal trail on the moving subject, not a physical shutter model.
 function trail(ctx,t,event,drawSubject,o={}){
  const samples=o.samples??4,shutter=o.shutter??.06,opacity=o.opacity??.16;
  if(!Number.isFinite(t)||!Array.isArray(event)||event.length!==2||!event.every(Number.isFinite)||event[0]>=event[1]||typeof drawSubject!=='function'||!Number.isInteger(samples)||samples<2||samples>8||!Number.isFinite(shutter)||shutter<=0||shutter>.12||!Number.isFinite(opacity)||opacity<0||opacity>.45)throw Error('Invalid product trail');
  const draw=(at,alpha)=>{ctx.save();try{ctx.globalAlpha*=alpha;drawSubject(ctx,at);}finally{ctx.restore();}};
  if(t>event[0]&&t<event[1]){
   const edge=Math.min(1,(t-event[0])/shutter,(event[1]-t)/shutter);
   for(let i=samples-1;i>=1;i--){const at=t-shutter*i/(samples-1);if(at>=event[0])draw(at,opacity*edge*(1-i/samples)/(samples-1));}
  }
  draw(t,1);
 }
 return Object.freeze({track,type,replace,easing,trail});
})();
