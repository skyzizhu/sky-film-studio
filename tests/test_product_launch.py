import copy,json,pathlib,subprocess,sys,tempfile,unittest
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'engine'))
from direction import resolve,plan
import audio
class ProductLaunchTests(unittest.TestCase):
 def test_variants_change_real_defaults_and_preserve_overrides(self):
  rows=[]
  for variant in ['precision','flow','playful','studio']:
   f=resolve({'direction':{'style':'product','content':'product','task':'promotion','variant':variant}})
   self.assertEqual(f,resolve(f));self.assertEqual(f['direction']['variant'],variant);rows.append(f)
  self.assertEqual([x['bpm']for x in rows],[120,116,124,100]);self.assertEqual(rows[-1]['music']['instrumentTheme'],'product_clean')
  self.assertEqual(rows[0]['music']['instrumentTheme'],'product_pulse');self.assertEqual(len({x['product']['accent']for x in rows}),4)
  f=resolve({'bpm':91,'product':{'accent':'#123456'},'music':{'layers':{'lead':.01}},'direction':{'style':'product','variant':'playful','sound':'none'}})
  self.assertEqual(f['bpm'],91);self.assertEqual(f['product']['accent'],'#123456');self.assertEqual(f['music']['layers']['lead'],.01);self.assertEqual(f['direction']['sound'],'none')
 def test_plan_retains_or_changes_variant_without_mutation(self):
  f={'direction':{'style':'product','variant':'flow'}};original=copy.deepcopy(f)
  self.assertEqual(plan(f,'product','product',None,'promotion')['film']['direction']['variant'],'flow');self.assertEqual(f,original)
  self.assertEqual(plan(f,'product','product',None,'promotion','studio')['film']['direction']['variant'],'studio')
  self.assertNotIn('variant',plan(f,'science','blueprint',None)['film']['direction'])
  for d in [{'style':'product','variant':'oops'},{'style':'museum','variant':'precision'}]:
   with self.assertRaises(ValueError):resolve({'direction':d})
 def test_launch_sfx_are_deterministic_finite_and_distinct(self):
  rows=[]
  for name in ['launch_hit','air_sweep','ui_tick']:
   audio.rng=np.random.default_rng(12);a=audio.sfx_voice(name,.3);audio.rng=np.random.default_rng(12);b=audio.sfx_voice(name,.3)
   self.assertTrue(np.array_equal(a,b));self.assertTrue(np.isfinite(a).all());self.assertGreater(np.linalg.norm(a),.01);rows.append(a)
  for i,a in enumerate(rows):
   for b in rows[i+1:]:self.assertFalse(np.array_equal(a,b))
 def test_cli_variant_and_licensed_font_are_portable(self):
  with tempfile.TemporaryDirectory()as d:
   p=pathlib.Path(d)/'film';subprocess.run([sys.executable,str(ROOT/'engine/new.py'),str(p),'--style','product','--variant','flow','--content','product','--task','promotion'],check=True,capture_output=True)
   f=json.loads((p/'film.json').read_text());self.assertEqual(f['bpm'],116);self.assertTrue((p/'vendor/product-motion.js').is_file());self.assertTrue((p/'assets/fonts/NotoSansSC-VF.ttf').is_file());self.assertIn('SIL OPEN FONT LICENSE',(p/'assets/fonts/OFL-NotoSansSC.txt').read_text())
   result=subprocess.run([sys.executable,str(ROOT/'engine/new.py'),str(pathlib.Path(d)/'bad'),'--style','museum','--variant','flow'],capture_output=True)
   self.assertNotEqual(result.returncode,0);self.assertFalse((pathlib.Path(d)/'bad').exists())
if __name__=='__main__':unittest.main()
