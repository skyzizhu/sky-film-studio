import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'engine'))
from project import transition_errors,transition_keys
class TransitionTests(unittest.TestCase):
 def film(self):return {'beats':[{'start':0,'end':5},{'start':5,'end':10}]}
 def test_legacy_and_valid_transitions(self):
  f=self.film();self.assertEqual(transition_errors(f),[])
  f['scene_transition']={'type':'fade','duration':.6};self.assertEqual(transition_errors(f),[])
  f['beats'][1]['transition']={'type':'dissolve','duration':1.2};self.assertEqual(transition_errors(f),[])
  f['beats'][1]['transition']=False;self.assertEqual(transition_errors(f),[])
 def test_invalid_config_and_excessive_duration_rejected(self):
  for config in [True,{'type':'typo'},{'type':'fade','duration':True},{'type':'fade','duration':0},{'type':'dissolve','duration':float('nan')},{'type':'fade','duration':2.1}]:
   f=self.film();f['scene_transition']=config;self.assertTrue(transition_errors(f))
  f=self.film();f['beats'][1]['end']=5.4;f['scene_transition']={'type':'dissolve','duration':.6};self.assertTrue(transition_errors(f))
 def test_editorial_boundary_samples_cover_fade_middle(self):
  f=self.film();f['duration']=10;f['fps']=30;self.assertEqual(transition_keys(f),[])
  f['scene_transition']={'type':'fade','duration':.6}
  keys=transition_keys(f);self.assertIn(4.85,keys);self.assertIn(5,keys);self.assertIn(5.15,keys)
  f['beats'][1]['transition']=False;self.assertEqual(transition_keys(f),[])
if __name__=='__main__':unittest.main()
