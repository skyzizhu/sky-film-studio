import copy,pathlib,sys,unittest
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'engine'))
import audio
from project import soundscape_errors,sound_events
from direction import resolve
class HistoricalSoundTests(unittest.TestCase):
 def setUp(self):self.row={'id':'hills','kind':'wind','start':1,'end':4,'fade_in':.3,'fade_out':.4,'gain':.08,'seed':11}
 def test_bed_is_seeded_continuous_and_independent_of_music_rng(self):
  a=audio.ambience(self.row);audio.rng.normal(size=1000);b=audio.ambience(self.row)
  self.assertTrue(np.array_equal(a,b));self.assertEqual(len(a),3*audio.SR);self.assertEqual(a[0],0);self.assertEqual(a[-1],0)
  self.assertGreater(np.sqrt(np.mean(a*a)),.001);self.assertTrue(np.isfinite(a).all())
  # A would-be beat boundary must not introduce a restart/silence into this bed.
  self.assertGreater(np.linalg.norm(a[audio.SR-200:audio.SR+200]),.001)
  other={**self.row,'seed':12};self.assertFalse(np.array_equal(a,audio.ambience(other)))
 def test_invalid_ranges_and_unknown_kinds_rejected(self):
  self.assertEqual(soundscape_errors({'duration':30,'soundscape':[self.row]}),[])
  for change in [{'kind':'fake'},{'start':-1},{'end':31},{'gain':True},{'gain':.31},{'seed':-1},{'fade_in':0},{'fade_out':4}]:
   self.assertTrue(soundscape_errors({'duration':30,'soundscape':[{**self.row,**change}]}),change)
  self.assertTrue(soundscape_errors({'duration':30,'soundscape':[self.row,self.row]}))
  self.assertTrue(soundscape_errors({'duration':30,'soundscape':{}}))
 def test_historical_sounds_follow_shared_event_window(self):
  f=resolve({'direction':{'content':'history','style':'archive'}})
  b={'start':0,'end':8,'events':{'move':[2,3]},'sfx_events':[{'event':'move','role':'move'},{'event':'move','role':'contact'}]}
  sounds=sound_events(b,f);self.assertEqual(sounds[0],[2,'wood_turn',.085,.94]);self.assertEqual(sounds[1],[2.96,'wood_stop',.1])
  for kind in ['wood_turn','wood_stop']:
   audio.rng=np.random.default_rng(3);a=audio.sfx_voice(kind,.4);audio.rng=np.random.default_rng(3)
   self.assertTrue(np.array_equal(a,audio.sfx_voice(kind,.4)));self.assertTrue(np.isfinite(a).all());self.assertEqual(len(a),int(audio.SR*.4))
if __name__=='__main__':unittest.main()
