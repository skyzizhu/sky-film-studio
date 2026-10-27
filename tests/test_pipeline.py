import argparse
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

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'engine'))
import voice
import project
import check


def wav(path,seconds=2):
    with wave.open(str(path),'wb') as stream:
        stream.setnchannels(1);stream.setsampwidth(2);stream.setframerate(8000)
        stream.writeframes(b'\x00\x00'*int(seconds*8000))


def film():
    return {'duration':30,'fps':12,'bpm':100,'width':640,'height':360,
            'voice':{'cues':'audio/cues.json'},'ending_fade':[29,29.8],
            'beats':[{'id':'b0','scene':'s0','start':0,'end':30,'sentences':[0,1]}]}


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=pathlib.Path(self.temp.name)
        (self.root/'audio').mkdir()
        self.addCleanup(self.temp.cleanup)

    def write(self,path,value):
        project.write_json(self.root/path,value)

    def test_reuse_tracks_content_insertion_and_voice(self):
        self.write('film.json',film())
        (self.root/'narration.txt').write_text('第一句。\n第二句。')
        args=argparse.Namespace(project=str(self.root),config=None,mode='system',voice='Test',gap=.45,reuse=True,speech_rate=0)
        synth=[]
        def fake(text,path,voice=None): synth.append((text,voice));wav(path)
        with mock.patch.object(voice,'load_config',return_value=({},None)),mock.patch.object(voice,'system_say',side_effect=fake),mock.patch.object(voice,'trim_silence',return_value=2),contextlib.redirect_stdout(io.StringIO()):
            voice.cmd_say(args)
            (self.root/'narration.txt').write_text('插入句。\n第一句。\n第二句。')
            voice.cmd_say(args)
            self.assertEqual(len(synth),3)
            self.assertEqual(synth[-1][0],'插入句。')
            (self.root/'narration.txt').write_text('改写句。\n第一句。\n第二句。')
            voice.cmd_say(args)
            self.assertEqual(len(synth),4)
            args.voice='AnotherVoice';voice.cmd_say(args)
            self.assertEqual(len(synth),7)
        cues=json.loads((self.root/'audio/cues.json').read_text())
        self.assertEqual(cues['sentences'][0]['text'],'改写句。')
        self.assertFalse(cues['placed'])

    def test_plan_is_draft_then_applies_new_beats(self):
        old=film();old['beats'][0]['sentences']=[]
        self.write('film.json',old)
        cues={'gap':.45,'sentences':[{'idx':0,'text':'甲','start':0,'end':2}, {'idx':1,'text':'乙','start':2.45,'end':4.45}]}
        self.write('audio/cues.json',cues)
        args=argparse.Namespace(project=str(self.root),bpm=None,target=7.2,lead=.35,gap=.45,hook_bars=1,apply=False)
        with contextlib.redirect_stdout(io.StringIO()): voice.cmd_plan(args)
        self.assertEqual(json.loads((self.root/'film.json').read_text()),old)
        self.assertEqual(json.loads((self.root/'audio/cues.json').read_text()),cues)
        args.apply=True
        with contextlib.redirect_stdout(io.StringIO()): voice.cmd_plan(args)
        result=json.loads((self.root/'audio/cues.json').read_text())
        applied=json.loads((self.root/'film.json').read_text())
        self.assertEqual(result['sentences'][0]['start'],.35)
        self.assertFalse(project.timeline_errors(applied,result))

    def test_place_failure_does_not_change_cues(self):
        f=film();f['beats']=[{'id':'b0','scene':'s0','start':0,'end':1,'sentences':[0,1]},
                            {'id':'b1','scene':'s1','start':1,'end':30,'sentences':[]}]
        self.write('film.json',f)
        cues={'sentences':[{'start':0,'end':2},{'start':3,'end':5}]}
        self.write('audio/cues.json',cues)
        before=(self.root/'audio/cues.json').read_bytes()
        with self.assertRaises(SystemExit):voice._place_on_grid(self.root)
        self.assertEqual(before,(self.root/'audio/cues.json').read_bytes())

    def test_source_recording_cannot_be_placed(self):
        self.write('film.json',film())
        cues={'audio':'audio/narration_import.wav','total':8,
              'sentences':[{'text':'甲','start':2,'end':4,'source_start':2,'source_end':4},
                           {'text':'乙','start':6,'end':8,'source_start':6,'source_end':8}]}
        self.write('audio/cues.json',cues)
        with self.assertRaises(SystemExit):voice._place_on_grid(self.root)
        draft=voice.planned_film(cues,film(),100)
        self.assertFalse(project.timeline_errors(draft,cues))
        self.assertEqual(json.loads((self.root/'audio/cues.json').read_text()),cues)

    def test_overlapping_truncated_missing_and_duplicate_cues_fail(self):
        cues={'placed':True,'sentences':[{'start':20,'end':40},{'start':21,'end':42}]}
        self.assertTrue(project.timeline_errors(film(),cues))
        f=film();f['beats'][0]['sentences']=[0,0]
        errors=project.timeline_errors(f,{'placed':True,'sentences':[{'start':1,'end':2},{'start':3,'end':4}]})
        self.assertTrue(any('重复' in error for error in errors))
        self.assertTrue(any('未绑定' in error for error in errors))

    def test_new_refuses_overwrite_and_snapshots_builders(self):
        target=self.root/'film'
        cmd=[sys.executable,str(ROOT/'engine/new.py'),str(target),'--name','带"引号<测试>','--ratio','640x360']
        subprocess.run(cmd,check=True,capture_output=True)
        before=(target/'film.json').read_bytes()
        self.assertNotEqual(subprocess.run(cmd,capture_output=True).returncode,0)
        self.assertEqual(before,(target/'film.json').read_bytes())
        for name in ('render.py','audio.py','encode.py','check.py','project.py'):
            self.assertTrue((target/'engine'/name).is_file())
        json.loads((target/'film.json').read_text())

    def test_fingerprint_invalidates_changed_cues(self):
        self.write('film.json',film());self.write('audio/cues.json',{'sentences':[]})
        wav(self.root/'audio/mix.wav')
        project.mark_build(self.root,'audio')
        self.assertTrue(project.build_current(self.root,'audio'))
        self.write('audio/cues.json',{'sentences':[{'text':'changed'}]})
        self.assertFalse(project.build_current(self.root,'audio'))

    def test_import_mismatch_preserves_existing_audio_and_cues(self):
        wav(self.root/'input.wav')
        original=self.root/'audio/narration_import.wav'
        original.write_bytes(b'previous-source')
        self.write('audio/cues.json',{'previous':True})
        (self.root/'text.txt').write_text('甲。\n乙。')
        args=argparse.Namespace(project=str(self.root),audio=str(self.root/'input.wav'),
                                text=str(self.root/'text.txt'),aligned_cues=None)
        with self.assertRaises(SystemExit):voice.cmd_import(args)
        self.assertEqual(original.read_bytes(),b'previous-source')
        self.assertEqual(json.loads((self.root/'audio/cues.json').read_text()),{'previous':True})
        self.assertFalse(list((self.root/'audio').glob('.import-*')))

    def test_recording_head_not_faded_and_audio_build_repeats(self):
        import audio
        f=film();f['beats'][0]['sentences']=[0];f['beats'][0]['energy']=0
        self.write('film.json',f)
        source=self.root/'audio/narration_import.wav'
        with wave.open(str(source),'wb') as stream:
            stream.setnchannels(1);stream.setsampwidth(2);stream.setframerate(8000)
            stream.writeframes((3000).to_bytes(2,'little',signed=True)*16000)
        self.write('audio/cues.json',{'audio':'audio/narration_import.wav','timing':'source',
            'alignment':{'reviewed':True},'sentences':[{'text':'测试','start':0,'end':2,'source_start':0,'source_end':2}]})
        with contextlib.redirect_stdout(io.StringIO()):audio.build(self.root)
        first=project.file_hash(self.root/'audio/mix.wav')
        with wave.open(str(self.root/'audio/voice.wav')) as stream:
            self.assertNotEqual(stream.readframes(1),b'\x00\x00\x00\x00')
        with contextlib.redirect_stdout(io.StringIO()):audio.build(self.root)
        self.assertEqual(first,project.file_hash(self.root/'audio/mix.wav'))

    def test_strict_preflight_rejects_unreviewed_evidence(self):
        f=film();f['voice']={};f['beats'][0]['sentences']=[]
        self.write('film.json',f);self.write('claims.json',{'reviewed':False,'claims':[]})
        for name in ('index.html','storyboard.js','data.js'):(self.root/name).write_text('')
        with contextlib.redirect_stdout(io.StringIO()):self.assertFalse(check.preflight(self.root,True))


if __name__=='__main__':unittest.main()
