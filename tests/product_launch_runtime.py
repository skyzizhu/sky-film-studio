"""Five saved launch treatments: browser geometry/type, audio and deterministic output."""
import json,pathlib,subprocess,sys,tempfile,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'engine'))
import render,audio
from project import write_json
root=pathlib.Path(tempfile.mkdtemp(prefix='film-launch-variants-'));hashes=[];images=[]
for variant in ['impact','precision','flow','playful','studio']:
 p=root/variant
 subprocess.run([sys.executable,str(ROOT/'engine/new.py'),str(p),'--style','product','--variant',variant,'--content','product','--task','promotion','--ratio','960x540'],check=True,capture_output=True)
 f=json.loads((p/'film.json').read_text());f.update(duration=30,title='',voice={},progress=False,decor=False,echo=False,ending_fade=[29,29.8],beats=[{'id':'a','scene':'a','start':0,'end':30,'sentences':[],'intent':'resolve','energy':.65,'events':{'land':[2,2.2]},'sfx_events':[{'event':'land','role':'reveal'}]}]);write_json(p/'film.json',f)
 (p/'storyboard.js').write_text("window.FILM={scenes:{a(g,t){g.save();g.scale(W/1920,H/1080);const p=ProductMotion.track(t,[{at:0,x:800,y:550,scale:1.6},{at:1,x:1150,y:550,scale:1},{at:3,x:1150,y:550,scale:1}]);ProductMotion.trail(g,t,[0,1],(layer,at)=>{const q=ProductMotion.track(at,[{at:0,x:400,y:550},{at:1,x:1150,y:550}]);layer.fillStyle=FILM_META.product.accent;layer.fillRect(q.x-180,q.y-120,360,240);});ProductMotion.type(g,t,[.2,.8],'把想法，动起来。',{x:100,y:250,size:120,maxWidth:1600});g.restore()}}};")
 pw,browser,page,server,_=render.launch(p,True,True)
 try:
  result=page.evaluate('''()=>{const c=document.getElementById('c');draw(.6);const a=c.toDataURL();draw(5);draw(.6);if(a!==c.toDataURL())throw Error('Unsorted state');
   const g=c.getContext('2d');g.save();g.globalAlpha=.37;g.translate(5,7);const before=g.getTransform().toString();const r=ProductMotion.type(g,1,[0,1],'一段需要测宽而非截断的宣传标题',{size:100,maxWidth:300,x:20,y:300});if(r.width>300.01||g.globalAlpha!==.37||g.getTransform().toString()!==before)throw Error('Type fit/alpha/transform');g.restore();
   const beforeTrail=g.getTransform().toString(),alpha=g.globalAlpha,calls=[];g.save();g.globalAlpha=.4;
   ProductMotion.trail(g,1,[0,2],(layer,at)=>{calls.push({at,alpha:layer.globalAlpha});layer.translate(100,200);layer.globalAlpha=.1;},{samples:4,shutter:.06,opacity:.2});
   if(calls.length!==4||calls.at(-1).at!==1||calls.at(-1).alpha!==.4||calls.some(x=>x.at>1||x.at<0)||g.globalAlpha!==.4||g.getTransform().toString()!==beforeTrail)throw Error('Trail context/time');g.restore();
   const holds=[];ProductMotion.trail(g,3,[0,2],(layer,at)=>holds.push(at));if(holds.length!==1||holds[0]!==3||g.globalAlpha!==alpha)throw Error('Trail leaks beyond event');
   let failed=false;try{ProductMotion.trail(g,1,[0,2],()=>{g.translate(99,99);throw Error('expected')})}catch{failed=true}if(!failed||g.getTransform().toString()!==beforeTrail||g.globalAlpha!==alpha)throw Error('Trail exception state');
   for(const invalid of [{samples:99},{shutter:0},{opacity:NaN}]){let rejected=false;try{ProductMotion.trail(g,1,[0,2],()=>{},invalid)}catch{rejected=true}if(!rejected)throw Error('Trail invalid options');}
   const frames=[{at:0,x:0},{at:1,x:100},{at:3,x:100}];if(ProductMotion.track(2,frames).x!==100||ProductMotion.track(-1,frames).x!==0||ProductMotion.track(9,frames).x!==100)throw Error('Hold/clamp');draw(3);return{frame:c.toDataURL(),variant:FILM_META.direction.variant,fonts:window.__fontErrors}}''')
  assert result['variant']==variant and not result['fonts'];images.append(result.pop('frame'));print(variant,result,flush=True)
 finally:browser.close();pw.stop();server.shutdown()
 audio.build(p);first=(p/'audio/mix.wav').read_bytes();audio.build(p);assert first==(p/'audio/mix.wav').read_bytes();hashes.append(hashlib.sha256(first).hexdigest())
 log=json.loads((p/'checks/arrangement.json').read_text());assert log['instrument_theme']==('product_clean'if variant=='studio'else'product_pulse');assert len(log['sounds'])==(0 if variant=='studio'else 1)
assert len(set(hashes))==5 and len(set(images))==5
write_json(root/'result.json',{'variants':5,'distinctFrames':5,'distinctAudio':5,'repeatedAudioEqual':True,'typeFitAndCanvasState':True,'savedHelperAndFont':True})
print('FIVE PRODUCT TREATMENTS BROWSER + AUDIO PASSED',root,flush=True)
