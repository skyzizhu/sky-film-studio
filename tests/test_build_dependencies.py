import importlib.util,json,pathlib,shutil,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class DependencyGraphTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.p=pathlib.Path(self.temp.name)
  for d in ['engine','audio','frames','out','assets/fonts']: (self.p/d).mkdir(parents=True)
  shutil.copy2(ROOT/'engine/project.py',self.p/'engine/project.py')
  for n in ['render.py','audio.py','direction.py','encode.py','check.py','alignment.py','audio_metrics.py']:(self.p/'engine'/n).write_text('# builder\n')
  (self.p/'engine/direction-profiles.json').write_text('{}')
  spec=importlib.util.spec_from_file_location('fixture_project',self.p/'engine/project.py');self.m=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.m)
  self.f={'duration':30,'fps':30,'width':960,'height':540,'bpm':80,'theme':'archive','voice':{'cues':'audio/cues.json','duck_db':-15},'music':{'layers':{'lead':.3}},'beats':[{'id':'b','scene':'s','start':0,'end':30,'energy':.4,'sfx':[]}],'audio_master':{'integrated_lufs':-16}}
  self.c={'placed':True,'sentences':[{'text':'一七九四年','start':.4,'end':1.4,'file':'audio/source.wav'}]}
  self.write('film.json',self.f);self.write('audio/cues.json',self.c)
  for n in ['storyboard.js','index.html','data.js','claims.json','provenance.json','narration.txt','storyboard.md','assets/fonts/font.ttf','audio/source.wav','audio/mix.wav','frames/f00000.jpg','out/film.mp4']:(self.p/n).write_bytes(b'initial')
  for k in ['frames','audio']:self.m.mark_build(self.p,k,**({'count':1}if k=='frames'else{}))
  self.m.mark_build(self.p,'video',output=str(self.p/'out/film.mp4'),sha256=self.m.file_hash(self.p/'out/film.mp4'))
  (self.p/'checks').mkdir();self.write('checks/delivery.json',{'technical_passed':True});self.m.mark_build(self.p,'checks')
 def tearDown(self):self.temp.cleanup()
 def write(self,n,v):(self.p/n).write_text(json.dumps(v,ensure_ascii=False))
 def assert_invalid(self,*expected):
  actual={k for k in ['frames','audio','video','checks']if not self.m.build_current(self.p,k)}
  self.assertEqual(actual,set(expected))
 def test_visual_edit_preserves_audio(self):
  (self.p/'storyboard.js').write_text('changed');self.assert_invalid('frames','video','checks')
 def test_source_audio_edit_preserves_frames(self):
  (self.p/'audio/source.wav').write_bytes(b'new');self.assert_invalid('audio','video','checks')
 def test_subtitle_spelling_edit_preserves_mix(self):
  self.c['sentences'][0]['text']='1794年';self.write('audio/cues.json',self.c);self.assert_invalid('frames','video','checks')
 def test_cue_timing_changes_both(self):
  self.c['sentences'][0]['start']=.5;self.write('audio/cues.json',self.c);self.assert_invalid('frames','audio','video','checks')
 def test_music_edit_preserves_frames(self):
  self.f['music']['layers']['lead']=.7;self.write('film.json',self.f);self.assert_invalid('audio','video','checks')
 def test_mastering_change_only_reencodes(self):
  self.f['audio_master']['integrated_lufs']=-18;self.write('film.json',self.f);self.assert_invalid('video','checks')
 def test_check_and_alignment_scripts_do_not_rebuild_media(self):
  for n in ['check.py','alignment.py']:(self.p/'engine'/n).write_text('changed')
  self.assert_invalid('checks')
 def test_encoder_change_does_not_rebuild_frames_or_mix(self):
  (self.p/'engine/encode.py').write_text('changed');self.assert_invalid('video','checks')
 def test_claims_and_provenance_only_require_checks(self):
  (self.p/'claims.json').write_text('changed');(self.p/'provenance.json').write_text('changed');self.assert_invalid('checks')
 def test_asr_hints_only_require_checks(self):
  self.f['voice']['asr_vocabulary']=['test'];self.write('film.json',self.f);self.assert_invalid('checks')
 def test_documentation_does_not_rebuild(self):
  (self.p/'storyboard.md').write_text('changed');self.assert_invalid()
 def test_fonts_require_visual_rebuild(self):
  (self.p/'assets/fonts/font.ttf').write_bytes(b'new font');self.assert_invalid('frames','video','checks')
 def test_actual_artifact_tampering_is_detected(self):
  (self.p/'frames/f00000.jpg').write_bytes(b'altered');self.assert_invalid('frames','video','checks')
 def test_video_tampering_invalidates_delivery(self):
  (self.p/'out/film.mp4').write_bytes(b'altered');self.assert_invalid('video','checks')
 def test_explicit_custom_visual_music_dependency(self):
  self.f['build_dependencies']={'frames':{'film_fields':['music']}};self.write('film.json',self.f)
  self.m.mark_build(self.p,'frames',count=1);before=self.m.build_fingerprint(self.p,'frames')
  self.f['music']['layers']['lead']=.8;self.write('film.json',self.f);self.assertNotEqual(before,self.m.build_fingerprint(self.p,'frames'))
 def test_explicit_custom_visual_word_file(self):
  self.write('audio/words.json',{'words':[]});self.f['build_dependencies']={'frames':{'paths':['audio/words.json']}};self.write('film.json',self.f);before=self.m.build_fingerprint(self.p,'frames')
  self.write('audio/words.json',{'words':[1]});self.assertNotEqual(before,self.m.build_fingerprint(self.p,'frames'))
 def test_identical_saved_and_repository_builders_share_fingerprint(self):
  for n in self.m._STAGE_SCRIPTS:
   for filename in self.m._STAGE_SCRIPTS[n]:shutil.copy2(ROOT/'engine'/filename,self.p/'engine'/filename)
  shutil.copy2(ROOT/'themes/direction-profiles.json',self.p/'engine/direction-profiles.json')
  sys.path.insert(0,str(ROOT/'engine'));import project
  for kind in ['frames','audio','video','checks']:self.assertEqual(project.build_fingerprint(self.p,kind),self.m.build_fingerprint(self.p,kind),kind)
 def test_old_schema_not_silently_accepted(self):
  stamp=self.p/'build/frames.json';d=json.loads(stamp.read_text());d.pop('schema');stamp.write_text(json.dumps(d));self.assertFalse(self.m.build_current(self.p,'frames'))
 def test_invalid_custom_dependency_is_rejected(self):
  for value in [True,{'typo':{}},{'frames':{'paths':'oops'}},{'frames':{'paths':['../secret']}},{'frames':{'paths':['missing.json']}}]:
   self.f['build_dependencies']=value;self.write('film.json',self.f)
   with self.assertRaises(ValueError):self.m.build_fingerprint(self.p,'frames')
if __name__=='__main__':unittest.main()
