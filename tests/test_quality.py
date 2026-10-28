import contextlib
import io
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
import wave
from unittest import mock
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'engine'))
import audio
from audio_metrics import measure,mastering_filter,violations,policy

class QualityTests(unittest.TestCase):
    def test_low_energy_theme_can_play_lead_and_explicitly_disable_it(self):
        with tempfile.TemporaryDirectory() as directory:
            p=pathlib.Path(directory)
            film={'duration':30,'fps':30,'width':640,'height':360,'bpm':84,'theme':'ink',
                  'voice':{},'music':{'mode':'pentatonic','layers':{'lead':.5}},
                  'beats':[{'id':'b0','scene':'s0','start':0,'end':30,'energy':.2,'sentences':[]}],
                  'ending_fade':[29,29.8]}
            (p/'film.json').write_text(json.dumps(film))
            lead=mock.Mock(return_value=np.zeros(1000))
            instruments={**audio.THEME_INSTRUMENTS['ink'],'lead':lead}
            with mock.patch.dict(audio.THEME_INSTRUMENTS,{'ink':instruments}),contextlib.redirect_stdout(io.StringIO()):
                audio.build(p);self.assertGreater(lead.call_count,0)
                film['music']['layers']['lead']=0;(p/'film.json').write_text(json.dumps(film))
                lead.reset_mock();audio.build(p);self.assertEqual(lead.call_count,0)

    def test_final_aac_is_measured_after_mastering(self):
        with tempfile.TemporaryDirectory() as directory:
            p=pathlib.Path(directory);source=p/'source.wav';output=p/'final.m4a'
            sr=48000;t=np.arange(sr*5)/sr
            signal=(np.sin(2*np.pi*997*t)+.22*np.sin(2*np.pi*12000*t+.3))*.7
            with wave.open(str(source),'wb') as stream:
                stream.setnchannels(1);stream.setsampwidth(2);stream.setframerate(sr)
                stream.writeframes((signal*32767).astype(np.int16).tobytes())
            f={'voice':{}}
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-af',mastering_filter(source,f),
                            '-ar','48000','-c:a','aac','-b:a','192k',str(output)],check=True)
            stats=measure(output);self.assertEqual(violations(stats,f),[])
            self.assertLessEqual(stats['true_peak_dbtp'],-1)
            self.assertLess(abs(stats['integrated_lufs']+16),1)

    def test_silent_measurement_and_policy_validation(self):
        self.assertTrue(violations({'integrated_lufs':None},{'voice':{'cues':'audio/cues.json'}}))
        self.assertFalse(violations({'integrated_lufs':None},{'voice':{}}))
        with self.assertRaises(ValueError):policy({'audio_master':{'true_peak_dbtp':float('nan')}})
        self.assertTrue(violations({'integrated_lufs':-16,'true_peak_dbtp':0},{}))

if __name__=='__main__':unittest.main()
