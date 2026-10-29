'use strict';
// Opt-in editorial blending. Shared objects and captions are rendered separately.
window.SceneTransition=(()=>{
 const buffers=[];
 function config(beat,global){
  const raw=beat.transition===undefined?global:beat.transition;
  if(raw===undefined||raw===null||raw===false)return {type:'cut',duration:0};
  if(!raw||typeof raw!=='object'||!['cut','fade','dissolve'].includes(raw.type))throw Error('Invalid scene transition');
  if(raw.type==='cut')return {type:'cut',duration:0};
  if(!Number.isFinite(raw.duration)||raw.duration<.1||raw.duration>2)throw Error('Transition duration must be .1–2 seconds');
  return raw;
 }
 function validate(beats,global){
  beats.forEach((b,i)=>{
   const c=config(b,global);
   if(i&&c.duration>Math.min(b.end-b.start,beats[i-1].end-beats[i-1].start))throw Error('Transition exceeds adjacent beat');
  });
 }
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function layer(index,ctx,fn,t,beat){
  let c=buffers[index];
  if(!c){c=document.createElement('canvas');buffers[index]=c;}
  if(c.width!==ctx.canvas.width||c.height!==ctx.canvas.height){c.width=ctx.canvas.width;c.height=ctx.canvas.height;}
  const g=c.getContext('2d');g.reset();g.clearRect(0,0,c.width,c.height);
  fn(g,t,t-beat.start,beat);return c;
 }
 function draw(ctx,t,beats,scenes,global,fps=30){
  let i=0;for(let k=0;k<beats.length;k++)if(t>=beats[k].start)i=k;
  const b=beats[i],current=config(b,global),next=i+1<beats.length?config(beats[i+1],global):{type:'cut',duration:0};
  const fn=scenes[b.scene];
  const exitOpacity=next.type==='fade'?smooth((b.end-t)/(next.duration/2)):1;
  if(i&&current.type==='dissolve'&&t<b.start+current.duration){
   const u=smooth((t-b.start)/current.duration),prev=beats[i-1];
   const oldTime=Math.max(prev.start,prev.end-1/fps);
   const a=layer(0,ctx,scenes[prev.scene],oldTime,prev),c=layer(1,ctx,fn,t,b);
   // Weighted premultiplied sum, then one source-over composite: no mid-fade dip.
   let mixed=buffers[2];if(!mixed){mixed=document.createElement('canvas');buffers[2]=mixed;}
   if(mixed.width!==ctx.canvas.width||mixed.height!==ctx.canvas.height){mixed.width=ctx.canvas.width;mixed.height=ctx.canvas.height;}
   const g=mixed.getContext('2d');g.reset();g.globalAlpha=1-u;g.drawImage(a,0,0);
   g.globalCompositeOperation='lighter';g.globalAlpha=u;g.drawImage(c,0,0);
   ctx.save();ctx.globalAlpha*=exitOpacity;ctx.drawImage(mixed,0,0);ctx.restore();return;
  }
  let opacity=exitOpacity;
  if(i&&current.type==='fade')opacity=Math.min(opacity,smooth((t-b.start)/(current.duration/2)));
  if(opacity>=1){fn(ctx,t,t-b.start,b);return;}
  const c=layer(0,ctx,fn,t,b);ctx.save();ctx.globalAlpha*=opacity;ctx.drawImage(c,0,0);ctx.restore();
 }
 return Object.freeze({draw,validate});
})();
