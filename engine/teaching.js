'use strict';
// Identity-preserving instructional tokens; drawing and sounds consume shared events.
window.TeachingMotion=(()=>{
 const phase=(t,a,b)=>{if(![t,a,b].every(Number.isFinite)||b<=a)throw Error('Invalid teaching interval');return Math.max(0,Math.min(1,(t-a)/(b-a)));};
 const ease=u=>u*u*(3-2*u);
 function tokens(values){
  if(!Array.isArray(values)||!values.length||values.length>20||values.some(n=>!Number.isInteger(n)||n<0||n>100))throw Error('Token counts must be integers 0–100');
  return values.flatMap((n,group)=>Array.from({length:n},(_,slot)=>({id:`token-${group}-${slot}`,group,slot})));
 }
 function interpolate(items,t,{start,end,from,to,lift=0,stagger=0}){
  if(!Number.isFinite(stagger)||stagger<0||stagger>.8||!Number.isFinite(lift)||lift<0)throw Error('Invalid instructional motion');
  const span=end-start;
  if(!Number.isFinite(span)||span<=0)throw Error('Invalid instructional motion interval');
  return items.map((item,i)=>{
   const a=from(item,i),b=to(item,i);
   if(![a.x,a.y,b.x,b.y].every(Number.isFinite))throw Error('Invalid token position');
   const delay=items.length>1?stagger*span*i/(items.length-1):0,u=phase(t,start+delay,end-(stagger*span-delay)),q=ease(u);
   return {...item,x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q-lift*Math.sin(Math.PI*u),progress:u};
  });
 }
 function equalSlots(items,groups){
  if(!Number.isInteger(groups)||groups<1||items.length%groups)throw Error('Equal groups require a divisible token count');
  const per=items.length/groups;return items.map((item,i)=>({...item,targetGroup:Math.floor(i/per),targetSlot:i%per}));
 }
 return Object.freeze({tokens,interpolate,equalSlots});
})();
