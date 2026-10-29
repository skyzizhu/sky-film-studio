"""Shared project I/O, timeline invariants and reproducible build fingerprints."""
import hashlib
import json
import math
import pathlib
import tempfile
import os


def write_json(path, value):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix='.' + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write('\n')
        os.replace(temp, path)
    finally:
        pathlib.Path(temp).unlink(missing_ok=True)


def cues_path(project, film=None):
    project = pathlib.Path(project)
    if film is None:
        path = project / 'film.json'
        film = json.loads(path.read_text()) if path.is_file() else {}
    return project / film.get('voice', {}).get('cues', 'audio/cues.json')


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def timeline_errors(film, cues=None, require_placed=True):
    errors = []
    duration = film.get('duration')
    if not number(duration) or not 30 <= duration <= 300:
        errors.append('duration 必须在 30–300 秒之间')
        duration = 0
    for field in ('fps', 'bpm', 'width', 'height'):
        value = film.get(field, {'fps':30, 'bpm':100, 'width':1920, 'height':1080}[field])
        if not number(value) or value <= 0 or (field in ('width', 'height') and (value % 2 or value < 320)):
            errors.append(f'{field} 非法（尺寸必须是 ≥320 的偶数）')
    beats = film.get('beats', [])
    if not isinstance(beats, list) or not beats:
        return errors + ['没有有效 beats']
    ids = set()
    last_end = 0
    coverage = {}
    valid_beats = []
    for i, beat in enumerate(beats):
        if not isinstance(beat, dict):
            errors.append(f'beat {i} 必须为对象'); continue
        start, end = beat.get('start'), beat.get('end')
        bid = beat.get('id')
        if not isinstance(bid, str) or not bid or bid in ids:
            errors.append(f'beat {i} 的 id 缺失或重复')
        ids.add(bid if isinstance(bid, str) else str(i))
        if not isinstance(beat.get('scene'), str) or not beat['scene']:
            errors.append(f'beat {i} 缺 scene')
        if not (number(start) and number(end) and 0 <= start < end <= duration + .002):
            errors.append(f'beat {i} 起止非法或超出片长'); continue
        if abs(start-last_end) > .002:
            errors.append(f'beat {i} 与上一拍有重叠/空档（需连续覆盖）')
        last_end = end
        valid_beats.append(beat)
        indices = beat.get('sentences', [])
        if not isinstance(indices, list):
            errors.append(f'beat {i} sentences 必须是列表'); continue
        for index in indices:
            if not isinstance(index, int) or isinstance(index, bool) or index < 0:
                errors.append(f'beat {i} 非法句索引 {index}'); continue
            if index in coverage:
                errors.append(f'句 {index} 重复绑定')
            coverage[index] = beat
    if abs(last_end-duration) > .002:
        errors.append('beats 没有覆盖至片尾')
    fade = film.get('ending_fade')
    if fade is not None and not (isinstance(fade, list) and len(fade) == 2 and all(number(x) for x in fade) and 0 <= fade[0] < fade[1] <= duration):
        errors.append('ending_fade 起止非法')
    if cues is None:
        if any(b.get('sentences') for b in valid_beats):
            errors.append('分镜绑定了句子但缺少 cues')
        return errors
    sentences = cues.get('sentences', [])
    if not isinstance(sentences, list) or not sentences:
        return errors + ['cues 没有句子']
    if require_placed and not cues.get('placed') and not cues.get('audio'):
        errors.append('TTS cues 未 place')
    previous = 0
    for i, sentence in enumerate(sentences):
        if not isinstance(sentence, dict):
            errors.append(f'句 {i} 必须为对象'); continue
        start, end = sentence.get('start'), sentence.get('end')
        if not (number(start) and number(end) and 0 <= start < end <= duration + .002):
            errors.append(f'句 {i} 起止非法或超出片长'); continue
        if start < previous - .002:
            errors.append(f'句 {i} 与前句重叠或乱序')
        previous = end
        beat = coverage.get(i)
        if beat is None:
            errors.append(f'句 {i} 未绑定分镜')
        elif start < beat['start'] - .002 or end > beat['end'] + .002:
            errors.append(f'句 {i} 超出所属拍')
        if cues.get('audio'):
            if start != sentence.get('source_start', start) or end != sentence.get('source_end', end):
                errors.append(f'录音句 {i} 源时间码被移动；须实际切片后再重排')
    for index in coverage:
        if index >= len(sentences):
            errors.append(f'分镜句索引 {index} 越界')
    return errors


def validate_font(path):
    """Validate the sfnt table directory, catching truncated OTF/TTF downloads."""
    import struct
    data = pathlib.Path(path).read_bytes()
    if len(data) < 12 or data[:4] not in (b'OTTO', b'\x00\x01\x00\x00', b'true'):
        raise ValueError(f'不是受支持的 sfnt 字体: {path}')
    count = struct.unpack_from('>H', data, 4)[0]
    if not count or 12+count*16 > len(data):
        raise ValueError(f'字体表目录截断: {path}')
    for i in range(count):
        _,_,offset,length = struct.unpack_from('>4sIII',data,12+i*16)
        if offset+length > len(data):
            raise ValueError(f'字体数据表截断: {path}')


def file_hash(path):
    digest = hashlib.sha256()
    with pathlib.Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


BUILD_SCHEMA = 2
_STAGE_SCRIPTS = {
    'frames': ('render.py','project.py'),
    'audio': ('audio.py','project.py','direction.py'),
    'video': ('encode.py','audio_metrics.py','project.py'),
    'checks': ('check.py','audio_metrics.py','alignment.py','direction.py','project.py'),
}
_AUDIO_ONLY = {'music','soundscape','audio_master','subtitles_max_cps'}
_BEAT_AUDIO = {'sfx','sfx_events','music','intent','energy','event_anchors','sentences','note'}


def _canonical(value):
    return json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode()


def _extra_dependencies(project,film,kind):
    config=film.get('build_dependencies',{})
    if not isinstance(config,dict):raise ValueError('build_dependencies must be an object')
    if set(config)-set(_STAGE_SCRIPTS):raise ValueError('Unknown build_dependencies stage')
    spec=config.get(kind,{})
    if not isinstance(spec,dict):raise ValueError('build_dependencies stage must be an object')
    paths=[]
    if not isinstance(spec.get('paths',[]),list) or not isinstance(spec.get('film_fields',[]),list):raise ValueError('paths/film_fields must be lists')
    for pattern in spec.get('paths',[]):
        if not isinstance(pattern,str) or pathlib.PurePosixPath(pattern).is_absolute() or '..' in pathlib.PurePosixPath(pattern).parts:
            raise ValueError('Build dependencies must be project-relative paths/globs')
        matches=sorted(p for p in project.glob(pattern) if p.is_file())
        if not matches:raise ValueError('Missing build dependency: '+pattern)
        paths.extend(matches)
    fields={}
    for key in spec.get('film_fields',[]):
        if not isinstance(key,str):raise ValueError('film_fields must contain dotted field names')
        value=film
        for part in key.split('.'):
            if not isinstance(value,dict) or part not in value:raise ValueError('Missing film dependency: '+key)
            value=value[part]
        fields[key]=value
    return paths,fields


def _film_inputs(film,kind):
    import copy
    f=copy.deepcopy(film);f.pop('build_dependencies',None)
    if kind=='frames':
        for key in _AUDIO_ONLY:f.pop(key,None)
        # BPM is still visual: beatKick, rhythm-driven custom scenes and punches may use it.
        voice=f.get('voice',{});f['voice']={k:voice[k]for k in ('cues',)if k in voice}
        if 'direction' in f:f['direction']={k:v for k,v in f['direction'].items()if k!='sound'}
        for beat in f.get('beats',[]):
            for key in _BEAT_AUDIO:beat.pop(key,None)
    elif kind=='audio':
        # audio.py consumes these fields; unknown custom fields are kept conservatively.
        for key in ('width','height','fps','title','renderer','chrome','progress','decor','echo','wipe','scene_transition','punches','beatKick','subtitleY','subtitles','subtitles_max_cps','audio_master'):
            f.pop(key,None)
        for key in ('words','asr_vocabulary'):f.get('voice',{}).pop(key,None)
        for beat in f.get('beats',[]):
            for key in ('event_anchors','scene','transition','subtitleY','echoText','echoSize','echoX','echoY','note'):
                beat.pop(key,None)
    return f


def _cue_inputs(cues,kind):
    if kind=='frames':
        return {'sentences':[{k:q[k]for k in ('text','start','end')if k in q}for q in cues.get('sentences',[])]}
    if kind=='audio':
        return {k:v for k,v in cues.items()if k!='sentences'}|{'sentences':[{k:q[k]for k in ('file','start','end')if k in q}for q in cues.get('sentences',[])]}
    return cues


def _outputs_digest(project,kind,count=None):
    if kind=='frames':
        paths=sorted((project/'frames').glob('f*.jpg'))
        if count is not None and (len(paths)!=count or any(p.name!=f'f{i:05d}.jpg'for i,p in enumerate(paths))):return None
    elif kind=='audio':paths=[p for p in (project/'audio').glob('*.wav')if p.name in ('mix.wav','voice.wav','bgm.wav','sfx.wav')]
    elif kind=='checks':paths=[project/'checks/delivery.json']
    else:raise ValueError('Unsupported output group')
    result={str(p.relative_to(project)):file_hash(p)for p in sorted(paths)if p.is_file()}
    return result


def build_fingerprint(project,kind):
    project=pathlib.Path(project).resolve()
    if kind not in _STAGE_SCRIPTS:raise ValueError('Unknown build stage: '+kind)
    film_path=project/'film.json';film=json.loads(film_path.read_text())if film_path.is_file()else{}
    digest=hashlib.sha256(f'film-build-v{BUILD_SCHEMA}:{kind}'.encode());paths=[]
    def add(label,value):digest.update(label.encode()+b'\0'+_canonical(value)+b'\0')
    extras,fields=_extra_dependencies(project,film,kind);paths.extend(extras);add('explicit-film-fields',fields)
    if kind in ('frames','audio','checks'):
        add('film',_film_inputs(film,kind))
        cp=cues_path(project,film)
        if film.get('voice',{}).get('cues') or cp.is_file():
            add('cues',_cue_inputs(json.loads(cp.read_text()),kind)if cp.is_file()else None)
    if kind=='frames':
        paths.extend(p for p in project.rglob('*')if p.is_file()and p.suffix.lower()in ('.js','.html','.css','.svg','.png','.jpg','.jpeg','.webp','.gif','.otf','.ttf','.woff','.woff2','.mp4','.webm')and p.relative_to(project).parts[0]not in ('engine','frames','checks','out','build','.cache','.git'))
        # Other JSON data is conservatively visual unless explicitly a known audio/check file.
        paths.extend(p for p in project.rglob('*.json')if p.is_file()and p!=film_path and p!=cues_path(project,film)and p.relative_to(project).parts[0]not in ('audio','engine','checks','out','build','.cache','.git')and p.name not in ('claims.json','provenance.json'))
    elif kind=='audio':
        paths.extend(p for p in (project/'audio').rglob('*')if p.is_file()and p.name not in ('mix.wav','voice.wav','bgm.wav','sfx.wav','cues.json','words.json')and p.suffix.lower()in ('.wav','.mp3','.m4a','.aac','.flac','.ogg'))
        # Custom source paths named by cues need not live under audio/.
        cp=cues_path(project,film)
        if cp.is_file():
            c=json.loads(cp.read_text());names=[c['audio']]if c.get('audio')else[q.get('file')for q in c.get('sentences',[])]
            paths.extend(project/n for n in names if n and(project/n).is_file())
    elif kind in ('video','checks'):
        for dep in ('frames','audio'):
            add(dep+'-sources',build_fingerprint(project,dep))
            stamp_path=project/'build'/f'{dep}.json'
            stamp=json.loads(stamp_path.read_text())if stamp_path.is_file()else{}
            add(dep+'-outputs',_outputs_digest(project,dep,stamp.get('count')if dep=='frames'else None))
        add('mastering',{'duration':film.get('duration'),'fps':film.get('fps',30),'audio_master':film.get('audio_master',{})})
        if kind=='checks':
            add('video-sources',build_fingerprint(project,'video'))
            paths.extend(project/n for n in ('claims.json','narration.txt','provenance.json')if(project/n).is_file())
            stamp=project/'build/video.json';record=json.loads(stamp.read_text())if stamp.is_file()else{}
            vp=project/record['output_relative']if record.get('output_relative')else pathlib.Path(record.get('output',''))
            add('video-sha256',file_hash(vp)if vp.is_file()else None)
    # Hash only the Python builders actually used for this stage, including external invocations.
    engine=pathlib.Path(__file__).parent
    paths.extend(engine/n for n in _STAGE_SCRIPTS[kind]if(engine/n).is_file())
    catalog=None
    if kind in ('audio','checks'):
        catalog=engine/'direction-profiles.json'
        if not catalog.is_file():catalog=engine.parent/'themes/direction-profiles.json'
        if catalog.is_file():paths.append(catalog)
    if kind in ('frames','audio','checks')and(project/'requirements.txt').is_file():paths.append(project/'requirements.txt')
    if kind=='checks'and(project/'requirements-asr.txt').is_file():paths.append(project/'requirements-asr.txt')
    entries={}
    for path in set(paths):
        if path.parent==engine and path.name in _STAGE_SCRIPTS[kind]:label='@builder/'+path.name
        elif catalog is not None and path==catalog:label='@catalog/direction-profiles.json'
        else:label=str(path.relative_to(project))if path.is_relative_to(project)else'@builder/'+path.name
        entries[label]=file_hash(path)
    for label,value in sorted(entries.items()):add(label,value)
    return digest.hexdigest()


def mark_build(project,kind,**extra):
    project=pathlib.Path(project).resolve()
    if kind=='video' and extra.get('output'):
        output=pathlib.Path(extra['output']).resolve()
        if output.is_relative_to(project):extra['output_relative']=str(output.relative_to(project))
    if kind in ('frames','audio','checks'):
        extra['outputs']=_outputs_digest(project,kind,extra.get('count')if kind=='frames'else None)
    write_json(project/'build'/f'{kind}.json',{'schema':BUILD_SCHEMA,'fingerprint':build_fingerprint(project,kind),**extra})


def build_current(project,kind):
    project=pathlib.Path(project).resolve()
    try:
        stamp=json.loads((project/'build'/f'{kind}.json').read_text())
        if stamp.get('schema')!=BUILD_SCHEMA or stamp['fingerprint']!=build_fingerprint(project,kind):return False
        if kind in ('frames','audio','checks'):
            actual=_outputs_digest(project,kind,stamp.get('count')if kind=='frames'else None)
            if not actual or actual!=stamp.get('outputs'):return False
            if kind=='frames'and stamp.get('count',0)<1:return False
            if kind=='audio'and'audio/mix.wav'not in actual:return False
        if kind=='video':
            path=project/stamp['output_relative']if stamp.get('output_relative')else pathlib.Path(stamp['output'])
            if not path.is_file()or file_hash(path)!=stamp.get('sha256'):return False
        return True
    except (OSError,ValueError,KeyError,TypeError):return False


def sound_events(beat, film=None):
    """Resolve optional sound cues from the same semantic windows as animation."""
    result=list(beat.get('sfx',[]))
    from direction import sound_spec
    for raw_spec in beat.get('sfx_events',[]):
        window=beat.get('events',{}).get(raw_spec.get('event'))
        if not (isinstance(window,list) and len(window)==2 and all(number(x)for x in window) and window[0]<window[1]):
            raise ValueError(f"Missing valid sound event: {raw_spec.get('event')}")
        spec=sound_spec(film or {},raw_spec)
        if spec is None:continue
        count=spec.get('count',1);phase=spec.get('phase',0);gain=spec.get('gain',.2)
        if not isinstance(count,int) or isinstance(count,bool) or not 1<=count<=64:
            raise ValueError('Sound event count must be 1–64')
        if not number(phase) or not 0<=phase<=1 or not number(gain) or not 0<=gain<=2:
            raise ValueError('Invalid sound event phase/gain')
        step=(window[1]-window[0])/count
        for i in range(count):
            time=window[0]+(i+phase)*step
            if not 0<=time<beat['end']-beat['start']:raise ValueError('Sound event exceeds beat')
            row=[round(time,5),spec['kind'],gain]
            duration=spec.get('duration')
            if duration is not None:
                duration=step*spec.get('duty',.94) if duration=='step' else duration
                if not number(duration) or not .02<=duration<=5:raise ValueError('Invalid sound duration')
                row.append(duration)
            if 'pan' in spec:
                pan=spec['pan']
                if not number(pan)or not -1<=pan<=1:raise ValueError('Sound pan must be -1 to 1')
                if len(row)==3:row.append(None)
                row.append(pan)
            result.append(row)
    return result


def transition_errors(film):
    errors=[];beats=film.get('beats',[])
    if not isinstance(beats,list):return ['Transition beats must be a list']
    for i,beat in enumerate(beats):
        if not isinstance(beat,dict):
            errors.append(f'beat {i}: transition needs a beat object');continue
        raw=beat.get('transition',film.get('scene_transition'))
        if raw is None or raw is False:continue
        if not isinstance(raw,dict) or raw.get('type') not in ('cut','fade','dissolve'):
            errors.append(f'beat {i}: invalid transition');continue
        if raw['type']=='cut':continue
        duration=raw.get('duration')
        if not number(duration) or not .1<=duration<=2:
            errors.append(f'beat {i}: transition duration must be .1–2 seconds');continue
        if i and isinstance(beats[i-1],dict) and all(number(b.get(k)) for b in (beat,beats[i-1]) for k in ('start','end')):
            if duration>min(beat['end']-beat['start'],beats[i-1]['end']-beats[i-1]['start']):
                errors.append(f'beat {i}: transition exceeds adjacent beat')
    return errors


def transition_keys(film):
    """Sample both sides of opt-in editorial boundaries, including fade middles."""
    errors=transition_errors(film)
    if errors:raise ValueError('; '.join(errors))
    result=set();fps=film.get('fps',30)
    for i,beat in enumerate(film.get('beats',[])):
        if not i:continue
        cfg=beat.get('transition',film.get('scene_transition'))
        if not cfg or cfg.get('type')=='cut':continue
        at,duration=beat['start'],cfg['duration']
        offsets=(-duration/2,-duration/4,-1/fps,0,duration/4,duration/2) if cfg['type']=='fade' else (-1/fps,0,duration/2,duration)
        result.update(round(at+d,5) for d in offsets if 0<=at+d<film['duration'])
    return sorted(result)


def soundscape_errors(film):
    """Validate optional absolute-time ambience, independent of beat boundaries."""
    rows=film.get('soundscape',[])
    if not isinstance(rows,list):return ['soundscape must be a list']
    errors=[];ids=set();duration=film.get('duration',0)
    for row in rows:
        if not isinstance(row,dict):errors.append('soundscape entry must be an object');continue
        bid=row.get('id');a=row.get('start');b=row.get('end')
        if not isinstance(bid,str) or not bid or bid in ids:errors.append('soundscape id missing/duplicate')
        else:ids.add(bid)
        if row.get('kind')!='wind':errors.append('Unsupported soundscape kind')
        if not (number(a)and number(b)and number(duration)and 0<=a<b<=duration):
            errors.append('soundscape must remain inside film');continue
        gain=row.get('gain',.05)
        if not number(gain)or not 0<=gain<=.3:errors.append('soundscape gain must be 0–0.3')
        for key in ['fade_in','fade_out']:
            value=row.get(key,1)
            if not number(value)or not .02<=value<=b-a:errors.append('soundscape fades must be .02–bed duration')
        seed=row.get('seed',1)
        if not isinstance(seed,int)or isinstance(seed,bool)or not 0<=seed<2**32:errors.append('Invalid soundscape seed')
    return errors
