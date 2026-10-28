'use strict';
// Sampled involute flanks with simplified roots: an educational drawing, not CAD.
window.GearMotion=(()=>{
 const TAU=2*Math.PI;
 function geometry({teeth,module,pressureAngle=20,backlash=.01,samples=12}){
  if(!Number.isInteger(teeth)||teeth<18||teeth>200||!Number.isFinite(module)||module<=0||!Number.isFinite(pressureAngle)||pressureAngle<15||pressureAngle>30||!Number.isFinite(backlash)||backlash<0||backlash>.1||!Number.isInteger(samples)||samples<4||samples>48)throw Error('Invalid spur-gear geometry');
  const radius=teeth*module/2,outer=radius+module,root=radius-1.25*module,base=radius*Math.cos(pressureAngle*Math.PI/180),pitch=TAU/teeth;
  const inv=a=>Math.tan(a)-a,ip=inv(pressureAngle*Math.PI/180);
  const width=r=>Math.PI/(2*teeth)-backlash*pitch/2+ip-inv(Math.acos(Math.min(1,base/r)));
  const points=[],polar=(r,a)=>points.push({x:r*Math.cos(a),y:r*Math.sin(a)});
  for(let k=0;k<teeth;k++){
   const center=k*pitch,low=Math.max(base,root),wb=width(low),wa=width(outer);
   if(wa<=0)throw Error('Pointed tooth: unsupported configuration');
   polar(root,center-pitch/2);polar(root,center-wb);
   for(let j=0;j<=samples;j++){const r=low+(outer-low)*j/samples;polar(r,center-width(r));}
   for(let j=1;j<=4;j++)polar(outer,center-wa+2*wa*j/4);
   for(let j=samples;j>=0;j--){const r=low+(outer-low)*j/samples;polar(r,center+width(r));}
   polar(root,center+wb);polar(root,center+pitch/2);
  }
  return {teeth,module,pressureAngle,radius,outer,root,base,pitch,points};
 }
 function mesh(driver,driven,angle,lineAngle=0){
  if(!Number.isFinite(angle)||!Number.isFinite(lineAngle)||Math.abs(driver.module-driven.module)>1e-9||Math.abs(driver.pressureAngle-driven.pressureAngle)>1e-9)throw Error('Incompatible gear pair');
  const ratio=driver.teeth/driven.teeth;
  return {angle:(1+ratio)*lineAngle+Math.PI-Math.PI/driven.teeth-angle*ratio,ratio:-ratio,centerDistance:driver.radius+driven.radius};
 }
 function turns(t,segments){
  if(!Number.isFinite(t))throw Error('Invalid gear time');
  let total=0,previous=-Infinity;
  for(const s of segments){
   if(![s.start,s.end,s.turns].every(Number.isFinite)||s.end<=s.start||s.start<previous||!['smooth','linear'].includes(s.ease||'smooth'))throw Error('Invalid rotation schedule');
   previous=s.end;let u=Math.max(0,Math.min(1,(t-s.start)/(s.end-s.start)));
   if(s.ease!=='linear')u=u*u*(3-2*u);total+=s.turns*u;
  }
  return total;
 }
 return Object.freeze({geometry,mesh,turns});
})();
