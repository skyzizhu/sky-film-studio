import pathlib,sys,unittest
import numpy as np
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'engine'))
from audio import layer_curve,validate_motif
from direction import catalog
class MusicPhrasingTests(unittest.TestCase):
 def test_continuous_gain_at_bar_boundary_and_ramp_end(self):
  schedule=[{'lead':1},{'lead':0},{'lead':.5}]
  points=np.array([2.5-1e-6,2.5,2.5+1e-6,2.8,3.1,5,5.3,5.6])
  v=layer_curve(schedule,'lead',2.5,.6,points)
  self.assertLess(abs(v[0]-v[2]),1e-5);self.assertAlmostEqual(v[3],.5);self.assertAlmostEqual(v[4],0);self.assertAlmostEqual(v[-1],.5)
 def test_profile_phrases_distinct_and_include_silence(self):
  motifs=[catalog()['styles'][s]['music']['motif']for s in ['blueprint','museum','whiteboard']]
  for m in motifs:validate_motif(m)
  self.assertEqual(len({str(m)for m in motifs}),3)
  self.assertTrue(any(not bar for bar in motifs[1]))
 def test_rejects_bad_phrase_data(self):
  for value in [[],[[[4,0,.5]]],[[[1,True,.5]]],[[[2,0,.5],[1,1,.5]]],[[[0,0,0]]]]:
   with self.assertRaises(ValueError):validate_motif(value)
if __name__=='__main__':unittest.main()
