"""Optional local ASR word proposals, phrase event binding, and full-track review.
ASR timestamps are estimates. This tool never marks human listening complete.
"""
import argparse
import difflib
import json
import pathlib
import re
import unicodedata
import hashlib
from functools import lru_cache
from project import file_hash,write_json,number


def normalized(text):
    return ''.join(c for c in unicodedata.normalize('NFKC',text) if c.isalnum())


def model_at(path):
    path=pathlib.Path(path).expanduser().resolve()
    if not (path/'model.bin').is_file():raise ValueError('Provide an existing local faster-whisper model directory')
    try:from faster_whisper import WhisperModel
    except (ImportError,OSError) as error:raise ValueError('Optional faster-whisper runtime unavailable; use an isolated compatible environment or import word timestamps') from error
    return WhisperModel(str(path),device='cpu',compute_type='int8',cpu_threads=4,local_files_only=True)


def recognize(model,path,vocabulary=None,*,word_timestamps=True,vad_filter=False):
    segments,_=model.transcribe(str(path)if isinstance(path,(str,pathlib.Path))else path,language='zh',word_timestamps=word_timestamps,beam_size=5,
                               vad_filter=vad_filter,vad_parameters=VAD_OPTIONS if vad_filter else None,condition_on_previous_text=False,temperature=0,
                               initial_prompt=('简体中文。专有词：'+ '、'.join(vocabulary)) if vocabulary else None)
    rows=list(segments)
    return {'segments':[{k:getattr(s,k)for k in ('start','end','text','avg_logprob','no_speech_prob','compression_ratio')if hasattr(s,k)}for s in rows],
        'text':''.join(s.text for s in rows),'words':[{'text':w.word,'start':w.start,'end':w.end,'probability':w.probability}
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


VAD_OPTIONS={'min_silence_duration_ms':350,'speech_pad_ms':180,'min_speech_duration_ms':120}
_DIGITS=dict(zip('零〇一二两三四五六七八九',[0,0,1,2,2,3,4,5,6,7,8,9]))
_SMALL={'十':10,'百':100,'千':1000}


def chinese_number(text):
    integer,_,decimal=text.partition('点')
    if not any(c in integer for c in '十百千万亿'):
        value=''.join(str(_DIGITS[c])for c in integer)
    else:
        total=section=number=0
        for c in integer:
            if c in _DIGITS:number=_DIGITS[c]
            elif c in _SMALL:section+=(number or 1)*_SMALL[c];number=0
            elif c=='万':total+=(section+number)*10000;section=number=0
            elif c=='亿':total=(total+section+number)*100000000;section=number=0
        value=str(total+section+number)
    return value+('.'+''.join(str(_DIGITS[c])for c in decimal)if decimal else '')


@lru_cache(maxsize=1)
def review_converter():
    try:
        from opencc import OpenCC
        return OpenCC('t2s').convert
    except ImportError:return None


def review_normalized(text,converter=None):
    text=unicodedata.normalize('NFKC',text)
    convert=converter or review_converter()
    if convert:text=convert(text)
    text=re.sub(r'[零〇一二两三四五六七八九十百千万亿]+(?:点[零〇一二两三四五六七八九]+)?',lambda m:chinese_number(m.group()),text)
    return normalized(text)


def review_diff(expected,recognized,normalize=normalized):
    a,b=normalize(expected),normalize(recognized);matcher=difflib.SequenceMatcher(None,a,b,autojunk=False)
    return {'similarity':round(matcher.ratio(),4),'differences':[{'kind':tag,'expected':a[i:j],'recognized':b[k:l]}for tag,i,j,k,l in matcher.get_opcodes()if tag!='equal']}


def outside_intervals(detected,expected,padding=.3,min_duration=.4):
    """Activity outside planned cues is a review hint, not proof of extra words."""
    result=[]
    for a,b in detected:
        pieces=[(a,b)]
        for x,y in expected:
            x-=padding;y+=padding;updated=[]
            for u,v in pieces:
                if y<=u or x>=v:updated.append((u,v));continue
                if u<x:updated.append((u,min(v,x)))
                if y<v:updated.append((max(u,y),v))
            pieces=updated
        result.extend([round(u,3),round(v,3)]for u,v in pieces if v-u>=min_duration)
    return result


def asr_flags(segments,speech):
    flags=[]
    for i,s in enumerate(segments):
        reasons=[];text=normalized(s.get('text',''))
        if re.search(r'(.{2,12})\1{2,}',text):reasons.append('repetition_requires_review')
        if number(s.get('no_speech_prob'))and s['no_speech_prob']>.6:reasons.append('high_no_speech_probability')
        if number(s.get('avg_logprob'))and s['avg_logprob']<-1:reasons.append('low_average_log_probability')
        if number(s.get('compression_ratio'))and s['compression_ratio']>2.4:reasons.append('high_repetition_compression')
        a,b=s.get('start'),s.get('end')
        if number(a)and number(b)and b>a and not any(min(b,y)>max(a,x)for x,y in speech):reasons.append('outside_detected_speech')
        if reasons:flags.append({'segment':i,'start':a,'end':b,'text':s.get('text',''),'reasons':reasons})
    return flags


def decode_audio(path):
    import numpy as np,subprocess
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-vn','-ar','16000','-ac','1','-f','f32le','-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype='<f4').copy()


def _result_hash(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False,allow_nan=False).encode()).hexdigest()


def audit(project,video,model_path,output=None):
    project=pathlib.Path(project).resolve();film=json.loads((project/'film.json').read_text())
    cues=json.loads((project/film['voice']['cues']).read_text());audio=decode_audio(video)
    model_path=pathlib.Path(model_path).expanduser().resolve()
    model_files={p.name:file_hash(p)for p in sorted(model_path.iterdir())if p.is_file()and p.suffix in ('.bin','.json','.txt')}
    params={'audio_sha256':hashlib.sha256(audio.tobytes()).hexdigest(),'model_files':model_files,'vad':VAD_OPTIONS,'implementation':file_hash(__file__),'vocabulary':film.get('voice',{}).get('asr_vocabulary')}
    key=_result_hash(params);cache=project/'checks/asr-cache.json';cached=None
    try:
        c=json.loads(cache.read_text())
        if c['fingerprint']==key and c['result_sha256']==_result_hash(c['result']):cached=c['result']
    except (OSError,KeyError,ValueError,TypeError):pass
    if cached is None:
        from faster_whisper.vad import get_speech_timestamps,VadOptions
        speech=[[r['start']/16000,r['end']/16000]for r in get_speech_timestamps(audio,VadOptions(**VAD_OPTIONS))]
        result=recognize(model_at(model_path),audio,params['vocabulary'],word_timestamps=False,vad_filter=True)
        cached={'recognition':result,'speech_intervals':speech}
        write_json(cache,{'fingerprint':key,'result':cached,'result_sha256':_result_hash(cached)})
        reused=False
    else:reused=True
    result=cached['recognition'];speech=cached['speech_intervals'];expected=''.join(s['text']for s in cues['sentences'])
    raw=review_diff(expected,result['text']);review=review_diff(expected,result['text'],review_normalized)
    report={'kind':'automated-full-track-asr-review','model':model_path.name,'video_sha256':file_hash(video),
        'human_listening':'pending','expected':expected,**result,'source_coverage':track_coverage(project,video,cues),
        'text_similarity':raw['similarity'],'differences':raw['differences'],'review_similarity':review['similarity'],'review_differences':review['differences'],
        'normalization':{'unicode':'NFKC','traditional_to_simplified':'OpenCC t2s'if review_converter()else'unavailable; preserved','chinese_numbers':'integer/digit/decimal forms; review heuristic'},
        'vad':{'enabled':True,'options':VAD_OPTIONS,'speech_intervals':speech,'cues_without_detected_activity':[i for i,c in enumerate(cues['sentences'])if not any(min(c['end'],b)>max(c['start'],a)for a,b in speech)],'activity_outside_cues':outside_intervals(speech,[(s['start'],s['end'])for s in cues['sentences']])},
        'suspicious_segments':asr_flags(result.get('segments',[]),speech),'asr_cache_reused':reused,'audio_sha256':params['audio_sha256'],
        'note':'原始识别文本和差异保留；规范化与VAD仅辅助定位问题，不证明发音、人名、额外语音或主观听感。全文语音检测独立于预期cues，不按稿件时间截掉未知语音。'}
    target=pathlib.Path(output)if output else pathlib.Path('checks/audio-review.json')
    if not target.is_absolute():target=project/target
    write_json(target,report)
    print(json.dumps({'raw_similarity':raw['similarity'],'review_similarity':review['similarity'],'suspicious_segments':report['suspicious_segments'],'activity_outside_cues':report['vad']['activity_outside_cues'],'asr_cache_reused':reused},ensure_ascii=False))
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('command',choices=['transcribe','apply','audit'])
    parser.add_argument('--project',required=True);parser.add_argument('--model');parser.add_argument('--video');parser.add_argument('--output',help='Audit JSON path, relative to project by default')
    args=parser.parse_args()
    if args.command=='apply':apply(args.project)
    elif args.command=='transcribe':
        if not args.model:parser.error('transcribe requires --model PATH')
        transcribe(args.project,args.model)
    else:
        if not args.model or not args.video:parser.error('audit requires --model PATH --video PATH')
        audit(args.project,str(pathlib.Path(args.video).resolve()),args.model,args.output)

if __name__=='__main__':main()
