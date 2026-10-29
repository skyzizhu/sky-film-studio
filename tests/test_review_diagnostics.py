import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'engine'))
from alignment import chinese_number,review_normalized,review_diff,outside_intervals,asr_flags,normalized
class ReviewDiagnosticsTests(unittest.TestCase):
 def test_numeric_forms_compare_equal_but_binding_normalization_unchanged(self):
  cases={'一七九四':'1794','二〇二六':'2026','十八':'18','六':'6','一百零二':'102','三千四百五十六':'3456','一亿二万三千':'100023000','一万亿':'1000000000000','一百零二点〇五':'102.05'}
  for a,b in cases.items():self.assertEqual(chinese_number(a),b)
  self.assertEqual(review_normalized('一七九四年，十八块。'),review_normalized('1794年18块'))
  self.assertNotEqual(normalized('十八'),normalized('18'))
 def test_script_conversion_and_raw_differences_remain_separate(self):
  converter=lambda s:s.translate(str.maketrans({'機':'机','構':'构','臂':'臂','號':'号'}))
  self.assertEqual(review_normalized('機構與信號',converter),review_normalized('机构與信号',converter))
  self.assertTrue(review_diff('十八块','18块')['differences'])
  self.assertFalse(review_diff('十八块','18块',review_normalized)['differences'])
 def test_meaningful_numbers_and_names_are_not_silently_equated(self):
  self.assertTrue(review_diff('十八块','九块',review_normalized)['differences'])
  self.assertTrue(review_diff('里尔','黎尔',review_normalized)['differences'])
 def test_unknown_activity_not_masked_by_expected_cues(self):
  self.assertEqual(outside_intervals([[0,1],[5,7]],[[.2,.8]]),[[5,7]])
  self.assertEqual(outside_intervals([[0,2],[3,5]],[[0,2],[3,5]]),[])
 def test_repetition_and_no_speech_are_hints_not_text_deletion(self):
  segment={'text':'我爱你'*5,'start':58,'end':60,'no_speech_prob':.9,'avg_logprob':-1.5,'compression_ratio':3}
  result=asr_flags([segment],[[1,57]])
  self.assertIn('repetition_requires_review',result[0]['reasons']);self.assertIn('outside_detected_speech',result[0]['reasons']);self.assertEqual(segment['text'],'我爱你'*5)
  self.assertEqual(asr_flags([{'text':'清晰语音','start':1,'end':2}],[[1,2]]),[])
if __name__=='__main__':unittest.main()
