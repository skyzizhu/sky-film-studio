"""Exercise shipped browser helpers, clipping, lighting and renderer resizing."""
import pathlib, subprocess, sys, tempfile
r=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(r/'engine'))
import render
p=pathlib.Path(tempfile.mkdtemp(prefix='film-materials-'))/'case'
subprocess.run([sys.executable,str(r/'engine/new.py'),str(p),'--theme','museum'],check=True)
pw,browser,page,server,_=render.launch(p,True,True)
try:
 result=page.evaluate('''()=>{
  const c=document.createElement('canvas');c.width=400;c.height=300;
  const ctx=c.getContext('2d'),b={x:100,y:70,width:180,height:150};
  const path=new Path2D();path.rect(b.x,b.y,b.width,b.height);
  const snap=()=>c.toDataURL(),clear=()=>ctx.clearRect(0,0,400,300);
  const check=(yes,msg)=>{if(!yes)throw Error(msg)};
  const pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
  let n=0;
  for(const material of Object.keys(MaterialFX.profiles)){
   clear();ctx.globalAlpha=.4;ctx.setLineDash([3,8]);ctx.translate(2,3);
   const state=[ctx.globalAlpha,ctx.getLineDash().join(),ctx.getTransform().toString()];
   MaterialFX.surface(ctx,path,b,{material,seed:7});
   check(JSON.stringify(state)===JSON.stringify([ctx.globalAlpha,ctx.getLineDash().join(),ctx.getTransform().toString()]),'surface state');
   check(pixel(20,20)[3]===0,'surface clipping');ctx.resetTransform();ctx.globalAlpha=1;
   clear();MaterialFX.surface(ctx,path,b,{material,seed:7});const a=snap();
   clear();MaterialFX.surface(ctx,path,b,{material,seed:9});check(a!==snap(),'seed changes grain');
   clear();MaterialFX.surface(ctx,path,b,{material,seed:7});check(a===snap(),'stable grain');n++;
  }
  clear();MaterialFX.surface(ctx,path,b,{material:'clay',grain:0,light:{x:-1,y:0}});const a=pixel(110,140)[0],z=pixel(270,140)[0];
  check(a>z,'key direction');clear();MaterialFX.surface(ctx,path,b,{material:'clay',grain:0,light:{x:1,y:0}});
  check(pixel(110,140)[0]<pixel(270,140)[0],'key reversal');
  clear();MaterialFX.shadow(ctx,{x:100,y:100,width:100,height:40,elevation:0});const contact=pixel(150,120)[3],off=pixel(215,120)[3];
  clear();MaterialFX.shadow(ctx,{x:100,y:100,width:100,height:40,elevation:100});
  check(pixel(150,120)[3]<contact&&pixel(215,120)[3]>off,'lift softens and spreads shadow');
  clear();ctx.globalAlpha=.4;
  for(const t of [0,4,1,0,4]){
   clear();const blank=snap();MaterialFX.sweep(ctx,t,path,b,{start:1,end:3});
   check(blank===snap(),'sweep bounded');
  }
  clear();MaterialFX.sweep(ctx,2,path,b,{start:1,end:3});check(pixel(190,140)[3]>0,'active sweep');
  check(pixel(20,20)[3]===0&&ctx.globalAlpha===.4,'sweep clips and restores');
  MaterialFX.shadow(ctx,{...b,elevation:50});MaterialFX.guide(ctx,{x:0,y:0},{x:40,y:50});
  check(ctx.globalAlpha===.4,'shadow/guide inherited alpha');ctx.globalAlpha=1;
  for(const name of ['museum','blueprint','ink','whiteboard']){
   TH=THEMES[name];
   for(const [w,h] of [[960,540],[540,960],[600,600],[960,540]]){
    c.width=w;c.height=h;RENDERERS[name].bg(ctx,2,w,h);
    check(pixel(w-2,h-2)[3]===255,'renderer resize '+name);
    const a=snap();ctx.clearRect(0,0,w,h);RENDERERS[name].bg(ctx,2,w,h);check(a===snap(),'bg determinism '+name);
   }
  }
  ctx.globalAlpha=.4;ctx.strokeStyle='#123456';ctx.setLineDash([2,9]);
  const before=[ctx.globalAlpha,ctx.strokeStyle,ctx.getLineDash().join()];
  RENDERERS.whiteboard.components.roughStroke(ctx,[[20,20],[80,80]],{});
  check(JSON.stringify(before)===JSON.stringify([ctx.globalAlpha,ctx.strokeStyle,ctx.getLineDash().join()]),'whiteboard stroke restores state');
  let rejected=false;try{Renderer.init({renderer:'typo'});}catch(e){rejected=true;}check(rejected,'unknown renderer');
  return {materials:n,checks:'state, clipping, seeds, lighting, lift, timing, resize, renderer errors'};
 }''')
 print(result)
finally:
 browser.close();pw.stop();server.shutdown()
