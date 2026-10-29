"""Saved product profile: real browser, independent palette, audio and optional MP4."""
import argparse,json,pathlib,subprocess,sys,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'engine'))
import render,audio
from project import write_json

def main():
 a=argparse.ArgumentParser();a.add_argument('--project');a.add_argument('--render',action='store_true');args=a.parse_args()
 p=pathlib.Path(args.project).resolve() if args.project else pathlib.Path(tempfile.mkdtemp(prefix='film-product-'))/'film'
 subprocess.run([sys.executable,str(ROOT/'engine/new.py'),str(p),'--style','product','--content','product','--task','promotion','--variant','studio'],check=True,capture_output=True)
 f=json.loads((p/'film.json').read_text());f.update(title='',duration=30,progress=False,decor=False,echo=False,voice={},ending_fade=[29,29.8],beats=[{'id':'a','scene':'a','start':0,'end':9,'sentences':[],'intent':'inspect','energy':.3},{'id':'b','scene':'b','start':9,'end':20,'sentences':[],'intent':'explain','energy':.3,'events':{'open':[1,3.5],'inspect':[4,6]},'sfx_events':[{'event':'open','role':'contact','phase':1,'gain':.045}],'music':{'focus_events':[{'event':'inspect','duck_db':-5}]}},{'id':'c','scene':'c','start':20,'end':30,'sentences':[],'intent':'resolve','energy':.35}])
 write_json(p/'film.json',f);write_json(p/'claims.json',{'reviewed':True,'claims':[{'id':'concept','kind':'example','display_label':'概念产品 · 非在售产品'}]})
 (p/'data.js').write_text('window.DATA={demo:{claimId:"concept",label:"概念产品 · 非在售产品"}};')
 (p/'narration.txt').write_text('# Silent profile verification, not a commissioned product advertisement.\n')
 (p/'storyboard.js').write_text('''"use strict";
 const productState=t=>{const u=Math.max(0,Math.min(1,(t-10)/2.5));return {open:u*u*(3-2*u)}};
 function label(g,s,x,y,size=36,c='#20303d'){g.font=`500 ${size}px "Noto Serif SC"`;g.fillStyle=c;g.textAlign='left';g.fillText(s,x,y);}
 function productShared(g,t){
  const q=productState(t);label(g,'PRODUCT / STUDIO',110,108,22,'#637b88');label(g,DATA.demo.label,110,912,23,'#677c88');
  g.save();g.translate(1190,565);const scale=1+.055*Math.sin(Math.PI*Math.max(0,Math.min(1,(t-7)/8)));g.scale(scale,scale);
  MaterialFX.shadow(g,{x:-365,y:172,width:730,height:70,elevation:0,opacity:.2});
  const body=new Path2D();body.roundRect(-310,-100,620,300,30);MaterialFX.surface(g,body,{x:-310,y:-100,width:620,height:300},{material:'metal',base:'#719c9d',dark:'#416b75',lightColor:'#c5e0df',roughness:.8,grain:0,seed:8});
  g.fillStyle='#416b75';g.beginPath();g.roundRect(-310,165,620,58,20);g.fill();
  for(let i=0;i<3;i++){g.fillStyle='#d5e3d9';g.beginPath();g.roundRect(-287+i*194,-77,178,245,16);g.fill();g.strokeStyle='#9ab8ae';g.lineWidth=3;g.stroke();}
  const h=300*Math.cos(q.open*Math.PI*.61),lid=new Path2D();lid.roundRect(-310,Math.min(-100,-100+h),620,Math.max(3,Math.abs(h)),22);
  MaterialFX.surface(g,lid,{x:-310,y:Math.min(-100,-100+h),width:620,height:Math.max(3,Math.abs(h))},{material:'metal',base:'#b4c7c5',dark:'#729392',lightColor:'#e3ede9',roughness:.75,grain:0,seed:7});
  if(t<9)MaterialFX.sweep(g,t,lid,{x:-310,y:-100,width:620,height:300},{start:2,end:4.2,opacity:.12});
  g.restore();
 }
 const productScenes={a(g){label(g,'让物件，',130,390,64);label(g,'各得其所。',130,480,64);label(g,'分区收纳盒 / 概念设计',135,560,25,'#68818a');},b(g,t,l){label(g,'打开，',130,390,60);label(g,'看见分区。',130,478,60);if(l>4)label(g,'结构与开合均为绘制示意',135,560,25,'#68818a');},c(g){label(g,'把日常，',130,390,64);label(g,'分门别类。',130,480,64);label(g,'产品展示风格预览',135,560,27,'#277b88');}};
 window.FILM={shared:productShared,scenes:productScenes};
 ''')
 pw,browser,page,server,_=render.launch(p,True,True)
 try:
  result=page.evaluate('''()=>{
   if(TH.key!=='product'||Renderer.current!==RENDERERS.product)throw Error('Wrong product renderer');
   Renderer.init({theme:'product'});if(Renderer.current!==RENDERERS.product)throw Error('Implicit product renderer missing');Renderer.init(FILM_META);
   const cv=document.getElementById('c'),g=cv.getContext('2d'),seen={};for(const t of [0,2,4,8.99,9.01,10,11,12.5,15,19.99,20.01,25,28]){draw(t);seen[t]=cv.toDataURL();}for(const t of Object.keys(seen).reverse()){draw(Number(t));if(seen[t]!==cv.toDataURL())throw Error('History dependence');}
   draw(5);const before=cv.toDataURL();drawDust(g,20);if(cv.toDataURL()!==before)throw Error('Disabled particles still draw');
   const c=document.createElement('canvas');c.width=400;c.height=300;const ctx=c.getContext('2d');ctx.globalAlpha=.6;const points=[{x:30,y:40},{x:200,y:160}];StyleMotion.trace(ctx,2,[1,3],points);const auto=c.toDataURL();ctx.clearRect(0,0,400,300);StyleMotion.trace(ctx,2,[1,3],points,{style:'product'});if(auto!==c.toDataURL()||ctx.globalAlpha!==.6)throw Error('Product annotation default/state');
   const original=TH;TH={...TH,palette:{...THEMES.blueprint.palette}};RENDERERS.product.bg(ctx,2,400,300);const dark=c.toDataURL();TH=original;RENDERERS.product.bg(ctx,2,400,300);if(c.toDataURL()===dark)throw Error('Palette locked into product renderer');
   return {renderer:'product',repeatAndReverse:true,particlesDisabled:true,annotationDefault:true,lightDarkPalette:true};
  }''');write_json(p/'checks/product-runtime.json',result);print(result,flush=True)
  for t in [3,11.2,16,25]:page.evaluate('(t)=>draw(t)',t);page.locator('canvas').screenshot(path=str(p/f'checks/review-{t}.png'))
 finally:browser.close();pw.stop();server.shutdown()
 audio.build(p);first=(p/'audio/mix.wav').read_bytes();audio.build(p);assert first==(p/'audio/mix.wav').read_bytes()
 log=json.loads((p/'checks/arrangement.json').read_text());assert log['instrument_theme']=='product_clean';assert len(log['sounds'])==1 and log['sounds'][0]['kind']=='felt_contact';assert len(log['music_focus'])==1
 if args.render:
  for command in [[ROOT/'engine/check.py','auto','--project',p],[ROOT/'engine/encode.py','--project',p,'--output',p/'out/product-preview.mp4'],[ROOT/'engine/check.py','delivery','--project',p,'--video',p/'out/product-preview.mp4']]:subprocess.run([sys.executable,*map(str,command)],check=True)
 print('PRODUCT PROFILE BROWSER + AUDIO PASSED',p,flush=True)
if __name__=='__main__':main()
