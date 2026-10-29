"""Optional local ASR word proposals, phrase event binding, and full-track review.
ASR timestamps are estimates. This tool never marks human listening complete.
"""
import argparse
import difflib
import json
import pathlib
import re
import unicodedata
from project import file_hash,write_json,number


def normalized(text):
    return ''.join(c for c in unicodedata.normalize('NFKC',text) if c.isalnum())


def model_at(path):
    path=pathlib.Path(path).expanduser().resolve()
    if not (path/'model.bin').is_file():raise ValueError('Provide an existing local faster-whisper model directory')
    try:from faster_whisper import WhisperModel
    except (ImportError,OSError) as error:raise ValueError('Optional faster-whisper runtime unavailable; use an isolated compatible environment or import word timestamps') from error
    return WhisperModel(str(path),device='cpu',compute_type='int8',cpu_threads=4,local_files_only=True)


def recognize(model,path,vocabulary=None,*,word_timestamps=True):
    segments,_=model.transcribe(str(path),language='zh',word_timestamps=word_timestamps,beam_size=5,
                               vad_filter=False,condition_on_previous_text=False,temperature=0,
                               initial_prompt=('简体中文。专有词：'+ '、'.join(vocabulary)) if vocabulary else None)
    rows=list(segments)
    return {'text':''.join(s.text for s in rows),'words':[{'text':w.word,'start':w.start,'end':w.end,'probability':w.probability}
            for s in rows for w in s.words or []]}


def transcribe(project,model_path):
    project=pathlib.Path(project).resolve();film=json.loads((project/'film.json').read_text())
    cues=json.loads((project/film['voice']['cues']).read_text())
    if cues.get('audio'):raise ValueError('This exporter handles sentence TTS; import calibrated local word times for recordings')
    model=model_at(model_path);rows=[]
    for i,cue in enumerate(cues['sentences']):
        result=recognize(model,project/cue['file'],film.get('voice',{}).get('asr_vocabulary'))
        rows.append({'sentence':i,'file':cue['file'],'sha256':file_hash(project/cue['file']),
                     'source_text':cue['text'],**result})
        print(i,result['text'],flush=True)
    output=project/film.get('voice',{}).get('words','audio/words.json')
    write_json(output,{'method':'faster-whisper-asr-word-estimates','model':pathlib.Path(model_path).name,
         'human_reviewed':False,'sentences':rows})
    return output


def phrase_span(words,phrase,occurrence=None,min_probability=.5):
    chars=[];owners=[];previous=0
    for i,word in enumerate(words):
        a,b=word.get('start'),word.get('end')
        if not (number(a) and number(b) and 0<=a<=b and a>=previous-.03):
            raise ValueError('Invalid/overlapping local word timestamps')
        previous=b
        for ch in normalized(word['text']):chars.append(ch);owners.append(i)
    text=''.join(chars);term=normalized(phrase)
    hits=[m.start() for m in re.finditer('(?='+re.escape(term)+')',text)] if term else []
    if not hits:raise ValueError(f'Phrase not recognized: {phrase}')
    if len(hits)>1 and occurrence is None:raise ValueError(f'Ambiguous phrase: {phrase}; specify occurrence')
    occurrence=0 if occurrence is None else occurrence
    if not isinstance(occurrence,int) or occurrence<0 or occurrence>=len(hits):raise ValueError('Invalid phrase occurrence')
    offset=hits[occurrence];first,last=owners[offset],owners[offset+len(term)-1]
    chosen=words[first:last+1]
    if any(not number(w.get('probability')) or w['probability']<min_probability for w in chosen):
        raise ValueError(f'Low-confidence phrase requires correction: {phrase}')
    return chosen[0]['start'],chosen[-1]['end']


def resolved_events(project,film,cues,words):
    project=pathlib.Path(project);rows={s['sentence']:s for s in words['sentences']};result={}
    for beat in film['beats']:
        events={**beat.get('events',{})}
        for name,anchor in beat.get('event_anchors',{}).items():
            index=anchor['sentence']
            if index not in beat.get('sentences',[]):raise ValueError(f'{beat["id"]}.{name} binds a sentence outside this beat')
            cue=cues['sentences'][index];row=rows[index]
            if normalized(row['source_text'])!=normalized(cue['text']) or row['file']!=cue['file'] or file_hash(project/cue['file'])!=row['sha256']:
                raise ValueError('Word proposals are stale; text/audio changed')
            a,b=phrase_span(row['words'],anchor['phrase'],anchor.get('occurrence'),anchor.get('min_probability',.5))
            edge=anchor.get('edge','start')
            if edge not in ('start','end'):raise ValueError('Anchor edge must be start/end')
            start=cue['start']-beat['start']+(a if edge=='start' else b)+anchor.get('offset',0)
            end=start+anchor['duration']
            if not (number(start) and number(end) and 0<=start<end<=beat['end']-beat['start']+.001):
                raise ValueError(f'{beat["id"]}.{name} exceeds beat; adjust editing or timing')
            events[name]=[round(start,4),round(end,4)]
        result[beat['id']]=events
    return result


def apply(project):
    project=pathlib.Path(project).resolve();path=project/'film.json';film=json.loads(path.read_text())
    cues=json.loads((project/film['voice']['cues']).read_text());words=json.loads((project/film['voice']['words']).read_text())
    events=resolved_events(project,film,cues,words)
    for beat in film['beats']:
        if beat.get('event_anchors'):beat['events']=events[beat['id']]
    write_json(path,film)
    print('Applied ASR phrase proposals. Inspect action order and review uncertain timings.')


def source_match(source,segment,expected_offset,rate=16000):
    """Measure source-waveform presence and delay; not a pronunciation judgment."""
    import numpy as np
    a=np.asarray(source,dtype=float);b=np.asarray(segment,dtype=float)
    if len(b)<len(a) or not len(a) or np.linalg.norm(a)<1e-8:return {'correlation':0,'offset_seconds':None}
    n=1<<int((len(a)+len(b)-1).bit_length())
    dots=np.fft.irfft(np.fft.rfft(b,n)*np.fft.rfft(a[::-1],n),n)[len(a)-1:len(b)]
    sums=np.concatenate(([0.],np.cumsum(b*b)))
    norms=np.sqrt(np.maximum(sums[len(a):]-sums[:-len(a)],1e-20))*np.linalg.norm(a)
    scores=dots/norms;i=int(np.argmax(scores))
    return {'correlation':round(float(scores[i]),5),'offset_seconds':round(i/rate-expected_offset,5)}


def track_coverage(project,video,cues):
    import numpy as np
    import subprocess
    def decode(path):
        raw=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-vn','-ar','16000','-ac','1','-f','f32le','-'],capture_output=True,check=True).stdout
        return np.frombuffer(raw,dtype='<f4')
    final=decode(video);rows=[]
    if cues.get('audio'):return {'status':'source-recording; whole-file verification required','sentences':[]}
    for i,cue in enumerate(cues['sentences']):
        a=max(0,cue['start']-.12);b=min(len(final)/16000,cue['end']+.12)
        match=source_match(decode(project/cue['file']),final[round(a*16000):round(b*16000)],cue['start']-a)
        rows.append({'sentence':i,**match})
    return {'sentences':rows,'all_source_sentences_present':all(r['correlation']>=.75 and r['offset_seconds'] is not None and abs(r['offset_seconds'])<=.08 for r in rows),
            'note':'全句源波形匹配检验漏句/偏移，不证明发音、人名或主观听感正确。'}


def audit(project,video,model_path):
    project=pathlib.Path(project).resolve();film=json.loads((project/'film.json').read_text())
    cues=json.loads((project/film['voice']['cues']).read_text())
    # Full-track text review does not need the fragile per-word alignment pass.
    # Sentence proposals retain word timestamps for semantic event binding.
    result=recognize(model_at(model_path),video,film.get('voice',{}).get('asr_vocabulary'),word_timestamps=False)
    expected=''.join(s['text'] for s in cues['sentences']);a,b=normalized(expected),normalized(result['text'])
    matcher=difflib.SequenceMatcher(None,a,b,autojunk=False)
    edits=[{'kind':tag,'expected':a[i:j],'recognized':b[k:l]}for tag,i,j,k,l in matcher.get_opcodes()if tag!='equal']
    report={'kind':'automated-full-track-asr-review','model':pathlib.Path(model_path).name,'video_sha256':file_hash(video),
        'human_listening':'pending','expected':expected,**result,
        'source_coverage':track_coverage(project,video,cues),
        'text_similarity':round(matcher.ratio(),4),'differences':edits,
        'note':'全长自动转录不等于真人试听；同音字、人名、词时码及听感需要复核。'}
    write_json(project/'checks/audio-review.json',report)
    print(json.dumps({'similarity':report['text_similarity'],'differences':edits},ensure_ascii=False))


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('command',choices=['transcribe','apply','audit'])
    parser.add_argument('--project',required=True);parser.add_argument('--model');parser.add_argument('--video')
    args=parser.parse_args()
    if args.command=='apply':apply(args.project)
    elif args.command=='transcribe':
        if not args.model:parser.error('transcribe requires --model PATH')
        transcribe(args.project,args.model)
    else:
        if not args.model or not args.video:parser.error('audit requires --model PATH --video PATH')
        audit(args.project,str(pathlib.Path(args.video).resolve()),args.model)

if __name__=='__main__':main()
