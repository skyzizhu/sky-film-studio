import json,pathlib,sys,tempfile,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'engine'))
from alignment import phrase_span,resolved_events
from project import file_hash

class AlignmentTests(unittest.TestCase):
 def words(self):return [{'text':'字面','start':.1,'end':.4,'probability':.95},{'text':'上墨','start':.4,'end':.8,'probability':.9},{'text':'覆纸','start':1,'end':1.5,'probability':.9}]
 def test_preserves_whole_word_uncertainty_not_character_proportion(self):
  self.assertEqual(phrase_span(self.words(),'面'),(.1,.4))
  self.assertEqual(phrase_span(self.words(),'上墨覆纸'),(.4,1.5))
 def test_missing_ambiguous_and_uncertain_terms_fail(self):
  with self.assertRaises(ValueError):phrase_span(self.words(),'压齐')
  w=self.words()+[{'text':'上墨','start':2,'end':2.5,'probability':.9}]
  with self.assertRaises(ValueError):phrase_span(w,'上墨')
  self.assertEqual(phrase_span(w,'上墨',1),(2,2.5))
  w[1]['probability']=.1
  with self.assertRaises(ValueError):phrase_span(w,'上墨',0)
 def test_binding_tracks_retimed_cue_and_rejects_audio_change(self):
  with tempfile.TemporaryDirectory()as directory:
   p=pathlib.Path(directory);(p/'a.wav').write_bytes(b'audio')
   cue={'text':'字面上墨覆纸','file':'a.wav','start':6,'end':8}
   row={'sentence':0,'file':'a.wav','source_text':cue['text'],'sha256':file_hash(p/'a.wav'),'words':self.words()}
   f={'beats':[{'id':'b','start':5,'end':10,'sentences':[0],'event_anchors':{'ink':{'sentence':0,'phrase':'上墨','duration':.8}}}]}
   self.assertEqual(resolved_events(p,f,{'sentences':[cue]},{'sentences':[row]})['b']['ink'],[1.4,2.2])
   cue['start']=6.5
   self.assertEqual(resolved_events(p,f,{'sentences':[cue]},{'sentences':[row]})['b']['ink'],[1.9,2.7])
   (p/'a.wav').write_bytes(b'new')
   with self.assertRaises(ValueError):resolved_events(p,f,{'sentences':[cue]},{'sentences':[row]})

class SharedSoundTests(unittest.TestCase):
 def test_sounds_follow_event_windows_after_retiming(self):
  from project import sound_events
  b={'start':0,'end':10,'events':{'ink':[1,3]},'sfx_events':[{'event':'ink','kind':'brush','count':4,'duration':'step'}]}
  first=sound_events(b);self.assertEqual(first[0][0],1);self.assertEqual(first[-1][0],2.5)
  b['events']['ink']=[2,4]
  self.assertEqual(sound_events(b)[0][0],2)
  self.assertAlmostEqual(first[0][3],.47)
  b['sfx_events'][0]['event']='missing'
  with self.assertRaises(ValueError):sound_events(b)

class TrackCoverageTests(unittest.TestCase):
 def test_text_audit_skips_word_alignment_but_proposals_keep_it(self):
  from alignment import recognize
  from types import SimpleNamespace
  class Model:
   def __init__(self):self.requests=[]
   def transcribe(self,path,**kwargs):
    self.requests.append(kwargs['word_timestamps'])
    return iter([SimpleNamespace(text='信号',words=None)]),None
  m=Model()
  result=recognize(m,'film.mp4',word_timestamps=False)
  self.assertEqual(result['text'],'信号');self.assertEqual(result['words'],[]);self.assertEqual(result['segments'],[{'text':'信号'}])
  recognize(m,'sentence.wav')
  self.assertEqual(m.requests,[False,True])
 def test_full_source_audio_presence_and_delay(self):
  import numpy as np
  from alignment import source_match
  rng=np.random.default_rng(1);source=rng.normal(size=1000)
  segment=np.concatenate([np.zeros(160),source,np.zeros(200)])
  result=source_match(source,segment,.01)
  self.assertGreater(result['correlation'],.999)
  self.assertEqual(result['offset_seconds'],0)
  shifted=source_match(source,np.concatenate([np.zeros(320),source,np.zeros(100)]),.01)
  self.assertEqual(shifted['offset_seconds'],.01)

if __name__=='__main__':unittest.main()
