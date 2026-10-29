"""Measure real saved-builder rebuilds/reuse; isolated from user films."""
import pathlib,json,subprocess,sys,tempfile,time
r=pathlib.Path(__file__).resolve().parents[1];p=pathlib.Path(tempfile.mkdtemp(prefix='film-dependency-runtime-'))/'film'
subprocess.run([sys.executable,str(r/'engine/new.py'),str(p),'--style','archive','--ratio','640x360'],check=True,capture_output=True)
f=json.loads((p/'film.json').read_text());f.update(title='',fps=12,duration=30,progress=False,voice={},beats=[{'id':'a','scene':'s','start':0,'end':30,'sentences':[],'energy':.3}],ending_fade=[28.5,29.8],soundscape=[{'id':'air','kind':'wind','start':0,'end':29,'gain':.05,'fade_in':1,'fade_out':1,'seed':2}]);(p/'film.json').write_text(json.dumps(f));(p/'claims.json').write_text(json.dumps({'reviewed':True,'claims':[]}));(p/'storyboard.js').write_text("window.FILM={scenes:{s(c){c.fillStyle='#bc9972';c.fillRect(140,150,280,100)}}};")
def run(name,*args):return subprocess.check_output([sys.executable,str(p/'engine'/name),*args,'--project',str(p)],text=True,stderr=subprocess.STDOUT)
def snapshot():
 return{**{k:(p/v).stat().st_mtime_ns for k,v in [('frame','frames/f00000.jpg'),('audio','audio/mix.wav'),('video','out/film.mp4')]},'stamps':{k:json.loads((p/'build'/f'{k}.json').read_text())['fingerprint']for k in ['frames','audio','video']}}
def build():
 start=time.perf_counter();a=run('check.py','auto');b=run('encode.py','--output',str(p/'out/film.mp4'));run('check.py','delivery','--video',str(p/'out/film.mp4'))
 return{'seconds':round(time.perf_counter()-start,3),'full_render':'frames 30/'in a,'audio_rebuilt':'✓ audio/mix.wav'in a,'video_reused':'复用现有成片'in b}
results={'initial':build()};baseline=snapshot()
q=p/'engine/check.py';q.write_text(q.read_text()+'\n# validator-only edit\n');results['validator_edit']=build();after=snapshot();assert after==baseline,(after,baseline);assert results['validator_edit']['video_reused']
q=p/'storyboard.js';q.write_text(q.read_text().replace('#bc9972','#75a4a8'));results['visual_edit']=build();after=snapshot();assert after['frame']!=baseline['frame']and after['audio']==baseline['audio']and after['video']!=baseline['video'];assert results['visual_edit']['full_render']and not results['visual_edit']['audio_rebuilt'];baseline=after
f['soundscape'][0]['gain']=.15;(p/'film.json').write_text(json.dumps(f));results['sound_edit']=build();after=snapshot();assert after['frame']==baseline['frame']and after['audio']!=baseline['audio']and after['video']!=baseline['video'];assert not results['sound_edit']['full_render']and results['sound_edit']['audio_rebuilt'];baseline=after
f['audio_master']={'integrated_lufs':-18};(p/'film.json').write_text(json.dumps(f));results['mastering_edit']=build();after=snapshot();assert after['frame']==baseline['frame']and after['audio']==baseline['audio']and after['video']!=baseline['video'];assert not results['mastering_edit']['full_render']and not results['mastering_edit']['audio_rebuilt']
report={'kind':'isolated-actual-pipeline-regression','project':str(p),'results':results,'passed':True};(p/'checks/dependency-runtime.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
