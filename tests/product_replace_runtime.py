"""Real Canvas check for saved non-overlapping product replacements; no TTS/film render."""
import json,pathlib,subprocess,sys,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'engine'))
import render
p=pathlib.Path(tempfile.mkdtemp(prefix='film-product-replace-'))/'fixture'
subprocess.run([sys.executable,str(ROOT/'engine/new.py'),str(p),'--style','product','--content','product','--task','promotion','--ratio','960x540'],check=True,capture_output=True)
f=json.loads((p/'film.json').read_text());f.update(title='',duration=30,ending_fade=[29,29.8],voice={},progress=False,decor=False,echo=False,beats=[{'id':'a','scene':'a','start':0,'end':30,'sentences':[]}]);(p/'film.json').write_text(json.dumps(f))
(p/'storyboard.js').write_text('''window.FILM={scenes:{a(g,t){g.fillStyle='#fff8ed';g.fillRect(0,0,W,H);g.fillStyle='#14272c';g.fillRect(50,120,860,240);ProductMotion.replace(g,t,[1,1.4,1.6,2],(q)=>{q.fillStyle='#ff0000';q.fillRect(90,155,780,160);q.fillStyle='#fff';q.font='45px "Noto Sans SC"';q.fillText('原文 / Original',120,260)},(q)=>{q.fillStyle='#00ff00';q.fillRect(90,155,780,160);q.fillStyle='#14272c';q.font='45px "Noto Sans SC"';q.fillText('译文 / Translation',120,260)});}}};''')
pw,browser,page,server,_=render.launch(p,True,True)
try:
 result=page.evaluate('''()=>{
 const c=document.getElementById('c'),g=c.getContext('2d'),seen={};
 const times=[0,1,1.2,1.4,1.5,1.6,1.8,2,3];
 for(const t of times){draw(t);seen[t]=c.toDataURL();}
 for(const t of [...times].reverse()){draw(t);if(c.toDataURL()!==seen[t])throw Error('History-dependent replacement');}
 for(const [t,want] of [[0,[255,0,0]],[1.5,[20,39,44]],[3,[0,255,0]]]){draw(t);const pixel=[...g.getImageData(110,170,1,1).data].slice(0,3);if(pixel.some((v,i)=>v!==want[i]))throw Error('Wrong content pixel at '+t+':'+pixel);}
 g.save();g.globalAlpha=.37;g.translate(5,7);const transform=g.getTransform().toString();
 for(const t of [0,1.2,1.5,1.8,3]){const calls=[];ProductMotion.replace(g,t,[1,1.4,1.6,2],(q,at)=>{calls.push('old');q.translate(100,200);q.globalAlpha=.9},(q,at)=>{calls.push('new');q.translate(100,200);q.globalAlpha=.9});if(calls.length>1||g.globalAlpha!==.37||g.getTransform().toString()!==transform)throw Error('Context/non-overlap');}
 let thrown=false;try{ProductMotion.replace(g,3,[1,1.4,1.6,2],()=>{},q=>{q.translate(10,10);throw Error('callback')})}catch{thrown=true}
 if(!thrown||g.globalAlpha!==.37||g.getTransform().toString()!==transform)throw Error('Exception context');g.restore();
 return {repeat_reverse_pixel_identity:true,before_gap_after_pixels:true,parent_context_preserved:true,exception_context_preserved:true,fonts:window.__fontErrors};
 }''')
 assert not result['fonts']
 for t in [0,1.2,1.5,1.8,3]:
  page.evaluate('(t)=>draw(t)',t);page.locator('canvas').screenshot(path=str(p/f'checks/replace-{t}.png'))
 (p/'checks/product-replace.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'project':str(p),**result}),flush=True)
finally:browser.close();pw.stop();server.shutdown()
