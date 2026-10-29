"""Actual saved archive renderer and absolute-time ambience across a cut."""
import json,pathlib,sys,subprocess,tempfile,wave
import numpy as np
r=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(r/'engine'));import render,audio
p=pathlib.Path(tempfile.mkdtemp(prefix='film-archive-'))/'film'
subprocess.run([sys.executable,str(r/'engine/new.py'),str(p),'--style','archive','--content','history','--ratio','960x540'],check=True,capture_output=True)
f=json.loads((p/'film.json').read_text());f.update(title='',duration=30,progress=False,ending_fade=[29,29.8],beats=[{'id':'a','scene':'a','start':0,'end':10,'sentences':[],'energy':0},{'id':'b','scene':'b','start':10,'end':30,'sentences':[],'energy':0}],soundscape=[{'id':'air','kind':'wind','start':1,'end':29,'fade_in':1,'fade_out':2,'gain':.1,'seed':4}]);f['music']['layers']={k:0 for k in ['lead','pad','bass','percussion','snare','hats','shimmer']}
(p/'film.json').write_text(json.dumps(f));(p/'storyboard.js').write_text("window.FILM={scenes:{a(c){c.fillStyle='#dfc498';c.fillRect(300,220,60,60)},b(c){c.fillStyle='#aa9471';c.fillRect(300,220,60,60)}}};")
pw,browser,page,server,_=render.launch(p,True,True)
try:
 assert page.evaluate("TH.key==='archive'&&Renderer.current===RENDERERS.archive")
 assert page.evaluate('''()=>{const c=document.createElement('canvas');c.width=400;c.height=300;const g=c.getContext('2d'),pts=[{x:30,y:60},{x:240,y:60}];StyleMotion.trace(g,2,[1,3],pts,{});const a=c.toDataURL();g.clearRect(0,0,400,300);StyleMotion.trace(g,2,[1,3],pts,{style:'archive'});return a===c.toDataURL();}'''), 'Default annotation ignores scaffold direction'
 result=page.evaluate("""()=>{const c=document.getElementById('c');draw(10.1);const a=c.toDataURL();draw(5);draw(10.1);if(a!==c.toDataURL())throw Error('Archive history dependence');const g=c.getContext('2d'),before=g.globalAlpha;StyleMotion.focus(g,2,[1,3],{x:80,y:200,width:160,height:120},{style:'archive'});if(before!==g.globalAlpha)throw Error('Leaked style state');return {renderer:'archive',repeatAndUnsorted:true};}""");print(result)
finally:browser.close();pw.stop();server.shutdown()
audio.build(p);first=(p/'audio/mix.wav').read_bytes();audio.build(p);assert first==(p/'audio/mix.wav').read_bytes()
with wave.open(str(p/'audio/sfx.wav'))as w:x=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,2)[:,0]/32767
raw=audio.ambience(f['soundscape'][0]);a=10*audio.SR;b=a+1000;expected=raw[9*audio.SR:9*audio.SR+1000]*.1
assert np.max(np.abs(x[a:b]-expected))<1/32767+1e-8
log=json.loads((p/'checks/arrangement.json').read_text());assert len(log['soundscape'])==1;assert log['instrument_theme']=='archive'
print('ARCHIVE RENDERER + NO-RESTART AMBIENCE + REPEATED AUDIO PASSED',p)
