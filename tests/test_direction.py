import copy,json,pathlib,subprocess,sys,tempfile,unittest
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'engine'))
from direction import resolve,plan,catalog,section_layers,evidence_errors
from project import sound_events

class DirectionTests(unittest.TestCase):
 def test_legacy_and_overrides_survive(self):
  old={'theme':'history','bpm':84,'music':{'layers':{'lead':.3}}}
  self.assertEqual(old,resolve(old))
  f={**old,'direction':{'content':'history','style':'blueprint','sound':'tactile'}};original=copy.deepcopy(f)
  result=resolve(f);self.assertEqual(f,original)
  self.assertEqual(result['bpm'],84);self.assertEqual(result['theme'],'history')
  self.assertEqual(result['renderer'],'blueprint');self.assertEqual(result['music']['layers']['lead'],.3)
  self.assertEqual(result['music']['layers']['hats'],0)
  self.assertEqual(result,resolve(result))
 def test_invalid_profiles_fail_before_apply(self):
  for d in [{'style':'typo'},{'style':'museum','sound':'typo'},{'style':'museum','content':'typo'}]:
   with self.assertRaises(ValueError):resolve({'direction':d})
 def test_content_sound_and_style_are_independent(self):
  d=plan({},'history','blueprint','tactile');self.assertIn('时间与来源',d['guidance']['content']['structure'])
  f=d['film'];self.assertEqual(f['theme'],'blueprint');self.assertEqual(f['direction']['sound'],'tactile')
  self.assertEqual(section_layers(f,{'intent':'inspect'})['percussion'],0)
 def test_task_is_independent_and_survives_replanning(self):
  original={'direction':{'content':'history','style':'blueprint','sound':'tactile','task':'mechanism'}}
  f=resolve(original)
  self.assertEqual(f['direction']['task'],'mechanism')
  baseline=resolve({'direction':{'content':'history','style':'blueprint','sound':'tactile'}})
  self.assertEqual(f['music'],baseline['music'])
  result=plan(f,'tutorial','museum',None)
  self.assertEqual(result['film']['direction']['task'],'mechanism')
  self.assertIn('task',result['guidance'])
  self.assertEqual(plan(f,'tutorial','museum',None,'procedure')['film']['direction']['task'],'procedure')
  with self.assertRaises(ValueError):resolve({'direction':{'style':'museum','task':'typo'}})
 def test_evidence_contract_references_real_local_events(self):
  beat={'id':'pack','events':{'place':[1,2]},'evidence':{'subject':'notebook','change':'move to bag','result':'one notebook in bag','event_ids':['place']}}
  self.assertEqual(evidence_errors({'beats':[beat]}),[])
  bad=copy.deepcopy(beat);bad['evidence']['event_ids']=['missing']
  self.assertTrue(evidence_errors({'beats':[bad]}))
  bad=copy.deepcopy(beat);bad['evidence']['result']=' '
  self.assertTrue(evidence_errors({'beats':[bad]}))
  self.assertEqual(evidence_errors({'beats':[{'id':'legacy'}]}),[])
 def test_same_contact_has_distinct_sound_and_same_anchor(self):
  b={'start':0,'end':10,'events':{'land':[2,3]},'sfx_events':[{'event':'land','role':'contact'}]}
  rows=[sound_events(b,resolve({'direction':{'style':s}}))[0] for s in ['blueprint','museum','whiteboard']]
  self.assertEqual([r[1] for r in rows],['metal_contact','felt_contact','felt_contact'])
  self.assertEqual([r[0] for r in rows],[2.96]*3)
  self.assertLess(rows[2][2],rows[1][2])
  b['events']['land']=[4,5];self.assertEqual(sound_events(b,{'direction':{'style':'blueprint'}})[0][0],4.96)
 def test_silence_and_material_overrides(self):
  b={'start':0,'end':5,'events':{'x':[1,2]},'sfx_events':[{'event':'x','role':'draw'}]}
  self.assertEqual(sound_events(b,{'direction':{'style':'museum'}}),[])
  b['sfx_events'][0]['sound_profile']='marker'
  self.assertEqual(sound_events(b,{'direction':{'style':'museum'}})[0][1],'marker_draw')
  b['sfx_events'][0].update(kind='clay',gain=.2,duration=.08)
  self.assertEqual(sound_events(b)[0],[1,'clay',.2,.08])
  b['sfx_events']=[{'event':'missing','role':'reveal'}]
  with self.assertRaises(ValueError):sound_events(b,{'direction':{'style':'museum'}})
 def test_synths_finite_distinct_and_repeatable(self):
  import audio
  arrays=[]
  for kind in ['servo','metal_contact','felt_contact','marker_draw','board_erase','trace_air']:
   audio.rng=np.random.default_rng(123);x=audio.sfx_voice(kind,.3)
   audio.rng=np.random.default_rng(123);self.assertTrue(np.array_equal(x,audio.sfx_voice(kind,.3)))
   self.assertTrue(np.isfinite(x).all());self.assertGreater(np.linalg.norm(x),.01)
   self.assertEqual(len(x),int(audio.SR*.3));arrays.append(x)
  for i,a in enumerate(arrays):
   for b in arrays[i+1:]:self.assertFalse(np.array_equal(a,b))
 def test_new_project_snapshots_resolve_without_repository(self):
  with tempfile.TemporaryDirectory() as directory:
   for style in ['blueprint','museum','whiteboard']:
    p=pathlib.Path(directory)/style
    subprocess.run([sys.executable,str(ROOT/'engine/new.py'),str(p),'--content','history','--style',style,'--task','mechanism'],check=True,capture_output=True)
    f=json.loads((p/'film.json').read_text());self.assertEqual(f['direction']['content'],'history')
    self.assertEqual(f['direction']['task'],'mechanism');self.assertEqual(f['renderer'],style);self.assertIn('sections',f['music'])
    # Invoke only the saved engine and catalog after changing cwd.
    text=subprocess.check_output([sys.executable,'-c','from direction import catalog; print(catalog()["version"])'],cwd=p/'engine',text=True)
    self.assertEqual(text.strip(),'1');self.assertTrue((p/'vendor/style-motion.js').is_file())

if __name__=='__main__':unittest.main()
