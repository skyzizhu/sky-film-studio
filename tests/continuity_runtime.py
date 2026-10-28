"""Validate actual compositing, shared motion, captions and gear tooth clearance."""
import json,pathlib,subprocess,sys,tempfile
r=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(r/'engine'));import render
p=pathlib.Path(tempfile.mkdtemp(prefix='film-continuity-'))/'film'
subprocess.run([sys.executable,str(r/'engine/new.py'),str(p),'--style','blueprint','--ratio','960x540'],check=True,capture_output=True)
f=json.loads((p/'film.json').read_text());f.update(title='',duration=30,ending_fade=[29,29.8],progress=False,scene_transition={'type':'fade','duration':.6},subtitles=[[0,30,'字幕在内容转场时保持独立。']],beats=[{'id':'a','scene':'a','start':0,'end':10,'sentences':[]},{'id':'b','scene':'b','start':10,'end':20,'sentences':[]},{'id':'c','scene':'a','start':20,'end':30,'sentences':[]}])
(p/'film.json').write_text(json.dumps(f));(p/'storyboard.js').write_text('''window.FILM={shared(ctx,t){ctx.fillStyle='#00ff00';ctx.fillRect(220+t,230,40,40);},scenes:{a(ctx){ctx.fillStyle='#ff0000';ctx.fillRect(40,40,100,80);},b(ctx){ctx.fillStyle='#0000ff';ctx.fillRect(40,40,100,80);}}};''')
pw,browser,page,server,_=render.launch(p,True,True)
try:
 print(page.evaluate('''()=>{
  const c=document.createElement('canvas');c.width=640;c.height=440;const ctx=c.getContext('2d');
  const beats=[{scene:'a',start:0,end:10},{scene:'b',start:10,end:20}],scenes={a(g){g.globalAlpha=1;g.fillStyle='#ff0000';g.fillRect(0,0,g.canvas.width,g.canvas.height);},b(g){g.fillStyle='#0000ff';g.fillRect(0,0,g.canvas.width,g.canvas.height);}};
  const snap=t=>{ctx.reset();SceneTransition.draw(ctx,t,beats,scenes,{type:'dissolve',duration:.8});return c.toDataURL()};
  const mid=snap(10.4),rgb=Array.from(ctx.getImageData(20,20,1,1).data);
  if(Math.abs(rgb[0]-128)>1||Math.abs(rgb[2]-128)>1||rgb[3]!==255)throw Error('Dissolve darkens midpoint '+rgb);
  snap(11);if(mid!==snap(10.4))throw Error('Stateful dissolve');
  ctx.reset();ctx.globalAlpha=.4;ctx.setLineDash([3,7]);SceneTransition.draw(ctx,10.4,beats,scenes,{type:'dissolve',duration:.8});
  if(ctx.globalAlpha!==.4||ctx.getLineDash().join()!=='3,7')throw Error('Compositor leaks state');
  ctx.reset();SceneTransition.draw(ctx,10,beats,scenes);const direct=c.toDataURL();ctx.reset();scenes.b(ctx);if(direct!==c.toDataURL())throw Error('Legacy cut changed');
  for(const t of [9.99,10,10.01,19.99,20,20.01]){
   draw(t);const g=document.getElementById('c').getContext('2d');const x=Math.floor(220+t)+15;
   const rgba=g.getImageData(x,245,1,1).data;if(rgba[1]<245)throw Error('Shared body faded at '+t);
  }
  if(SUBTITLE_LAYOUT.map(p=>p.lines.join('')).join('')!=='字幕在内容转场时保持独立。')throw Error('Lost subtitles');
  for(const [w,h] of [[540,960],[640,440]]){c.width=w;c.height=h;snap(10.4);if(ctx.getImageData(w-2,h-2,1,1).data[3]!==255)throw Error('Blend cache size');}
  // Compare opaque interiors only; antialiasing at a tangent is not interference.
  let maxOverlap=0;
  const a=GearMotion.geometry({teeth:18,module:10});
  const path=model=>{const p=new Path2D();model.points.forEach((q,i)=>i?p.lineTo(q.x,q.y):p.moveTo(q.x,q.y));p.closePath();return p;};
  for(const teeth of [18,36]){
   const b=GearMotion.geometry({teeth,module:10}),pa=path(a),pb=path(b);
   for(let k=0;k<48;k++){
    const theta=k/48*a.pitch,pose=GearMotion.mesh(a,b,theta);
    ctx.reset();ctx.translate(140,210);ctx.rotate(theta);ctx.fill(pa);const aa=ctx.getImageData(0,0,640,440).data;
    ctx.reset();ctx.translate(140+pose.centerDistance,210);ctx.rotate(pose.angle);ctx.fill(pb);const bb=ctx.getImageData(0,0,640,440).data;
    let overlap=0;for(let i=3;i<aa.length;i+=4)if(aa[i]>240&&bb[i]>240)overlap++;
    maxOverlap=Math.max(maxOverlap,overlap);
   }
  }
  if(maxOverlap>4)throw Error('Gear tooth interiors overlap: '+maxOverlap);
  return {dissolve_midpoint:rgb,shared_motion:'continuous',captions:'retained',max_gear_overlap_pixels:maxOverlap};
 }'''))
finally:browser.close();pw.stop();server.shutdown()
