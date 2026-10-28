import sys,json,pathlib,subprocess,tempfile
r=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(r/'engine'));import render
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--out');args=parser.parse_args()
root=pathlib.Path(args.out) if args.out else pathlib.Path(tempfile.mkdtemp(prefix='film-theme-tests-'));root.mkdir(exist_ok=True)
for theme,ratio in [('ink','960x540'),('whiteboard','540x960'),('pixel','540x960'),('glitch','960x540'),('screencast','960x540'),('blueprint','540x960'),('museum','960x540')]:
 p=root/theme
 if p.exists(): raise SystemExit(f'Use an empty output directory: {p}')
 subprocess.run([sys.executable,str(r/'engine/new.py'),str(p),'--theme',theme,'--ratio',ratio],check=True)
 f=json.loads((p/'film.json').read_text());f.update(title='',duration=30,ending_fade=[29,29.8],progress=False,beats=[{'id':'test','scene':'s0','start':0,'end':30,'sentences':[],'energy':.65,'echoText':'证据'}],subtitles=[[.1,29,'字幕应该完整保留，并且在浅色背景上保持清晰。'*8]])
 (p/'film.json').write_text(json.dumps(f,ensure_ascii=False));(p/'storyboard.js').write_text('''window.FILM={scenes:{s0(ctx,t,l){
  typographyScale(ctx,t,l,{firstLine:'历史的线索',keyword:'一面墙后',label:'示意画面',y:H*.4,underline:true});
  drawEntity(ctx,t,l,{id:'landmark',x:W*.27,y:H*.57,s:1.6,color:'#8b4236',hi:'#fff',motion:'fadeIn'});
  drawEntity(ctx,t,l,{id:'rocket',x:W*.73,y:H*.57,s:1.6,color:'#207568',motion:'fadeIn'});
}}};''')
 pw,browser,page,server,d=render.launch(p,True,True)
 try:
  results=page.evaluate('''()=>{
   const ctx=document.getElementById('c').getContext('2d');
   const snap=()=>{ctx.reset();drawSVGIcon(ctx,2,2,{id:'award',x:100,y:100,s:3,color:'#12ab45'});return ctx.canvas.toDataURL()};
   const first=snap(),second=snap();
   return {same:first===second,layout:window.SUBTITLE_LAYOUT,theme:TH.key};
  }''')
  assert results['same'];assert results['theme']==theme
  # Two colours and sizes of one path must remain distinct on the first draw.
  assert page.evaluate('''()=>{
    const c=document.getElementById('c'),ctx=c.getContext('2d');
    ctx.reset();drawSVGIcon(ctx,2,2,{id:'award',x:100,y:100,s:3,color:'#ff0000'});
    const a=c.toDataURL();ctx.reset();
    drawSVGIcon(ctx,2,2,{id:'award',x:100,y:100,s:3,color:'#00ff00'});
    return a!==c.toDataURL();
  }''')
  assert ''.join(''.join(q['lines']) for q in results['layout'])==f['subtitles'][0][2]
  page.evaluate('draw(2)');page.screenshot(path=str(root/(theme+'.png')))
 finally:browser.close();pw.stop();server.shutdown()
 # Theme instruments actually build and repeat deterministically.
 import audio
 audio.build(p);first=(p/'audio/mix.wav').read_bytes();audio.build(p);assert first==(p/'audio/mix.wav').read_bytes()
 if theme=='ink':
  stamps={f.name:f.read_bytes() for f in (p/'build').glob('*.json')}
  subprocess.run([sys.executable,str(r/'engine/render.py'),'--project',str(p),'--clip','0,3',
     '--output',str(root/'ink-motion.mp4'),'--strict-fonts','--determinism'],check=True)
  assert stamps=={f.name:f.read_bytes() for f in (p/'build').glob('*.json')}
 print('PASSED',theme,flush=True)
print('ALL THEME RUNTIME CHECKS PASSED')
