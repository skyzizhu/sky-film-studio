import copy,pathlib,sys,unittest
import numpy as np
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'engine'))
from direction import music_focus,resolve,plan
from audio import focus_envelope

class FocusTests(unittest.TestCase):
 def film(self):
  return {'duration':30,'beats':[{'id':'a','start':4,'end':12,'events':{'land':[2,3]},'music':{'focus_events':[{'event':'land','duck_db':-6,'attack':.5,'hold':.4,'release':.8}]}}]}
 def test_event_window_moves_with_visual_event(self):
  f=self.film();rows=music_focus(f);self.assertEqual((rows[0]['start'],rows[0]['end']),(6,7.4));self.assertEqual(f,self.film())
  f['beats'][0]['events']['land']=[3,4];self.assertEqual(music_focus(f)[0]['start'],7)
 def test_deepest_overlap_and_smooth_time_edges(self):
  rows=music_focus(self.film());base=focus_envelope(3000,rows,100)
  both=focus_envelope(3000,rows+[dict(rows[0],duck_db=-12)],100)
  self.assertAlmostEqual(base[650],10**(-6/20));self.assertAlmostEqual(both[650],10**(-12/20))
  self.assertEqual(base[0],1);self.assertEqual(base[1000],1);self.assertLess(np.max(np.abs(np.diff(base))),.02)
  edge=[dict(rows[0],start=0,end=.5)];x=focus_envelope(100,edge,100);self.assertTrue(np.isfinite(x).all());self.assertTrue((x<=1).all());self.assertGreater(x[-1],x[0])
  self.assertTrue(np.array_equal(focus_envelope(10,[]),np.ones(10)))
 def test_invalid_focus_is_rejected(self):
  for change in [{'event':'missing'},{'duck_db':1},{'hold':-1},{'attack':0},{'release':float('nan')}]:
   f=self.film();f['beats'][0]['music']['focus_events'][0].update(change)
   with self.assertRaises(ValueError):music_focus(f)
  for events in [None,[],{'land':[3,2]},{'land':[0,10]}]:
   f=self.film();f['beats'][0]['events']=events
   with self.assertRaises(ValueError):music_focus(f)
 def test_promotion_is_independent_from_product_style(self):
  f=resolve({'direction':{'content':'product','style':'blueprint','task':'promotion','sound':'none'}})
  self.assertEqual(f['renderer'],'blueprint');self.assertEqual(f['direction']['task'],'promotion')
  p=plan({},'product','product',None,'promotion');self.assertEqual(p['film']['music']['instrumentTheme'],'product_pulse')
  self.assertEqual(p['film']['direction']['sound'],'product_launch')

if __name__=='__main__':unittest.main()
