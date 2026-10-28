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


def build_fingerprint(project, kind):
    project = pathlib.Path(project).resolve()
    # Conservative dependency set: fonts, assets, configuration and source audio.
    paths = []
    for path in project.rglob('*'):
        if not path.is_file(): continue
        rel = path.relative_to(project)
        if '__pycache__' in rel.parts or path.suffix in ('.pyc','.mp4','.zip'): continue
        if rel.parts[0] in ('frames', 'checks', 'out', '.git', '.cache', 'build'):
            continue
        if rel.parts[0] == 'audio' and path.name in ('mix.wav', 'voice.wav', 'bgm.wav', 'sfx.wav'):
            continue
        paths.append(path)
    digest = hashlib.sha256(kind.encode())
    for path in sorted(paths):
        digest.update(str(path.relative_to(project)).encode())
        digest.update(file_hash(path).encode())
    # Original-skill invocations also account for the helpers used to build.
    for path in sorted(pathlib.Path(__file__).parent.glob('*.py')):
        digest.update(path.name.encode()); digest.update(file_hash(path).encode())
    for path in (pathlib.Path(__file__).parent/"direction-profiles.json", pathlib.Path(__file__).parent.parent/"themes/direction-profiles.json"):
        if path.is_file():digest.update(file_hash(path).encode())
    return digest.hexdigest()


def mark_build(project, kind, **extra):
    write_json(pathlib.Path(project)/'build'/f'{kind}.json',
               {'fingerprint':build_fingerprint(project, kind), **extra})


def build_current(project, kind):
    path = pathlib.Path(project)/'build'/f'{kind}.json'
    try:
        stamp = json.loads(path.read_text())
        if stamp['fingerprint'] != build_fingerprint(project, kind): return False
        root = pathlib.Path(project)
        if kind == 'audio' and not (root/'audio/mix.wav').is_file(): return False
        if kind == 'frames':
            count = stamp.get('count',0)
            if count < 1 or any(not (root/'frames'/f'f{i:05d}.jpg').is_file() for i in range(count)): return False
        return True
    except (OSError, ValueError, KeyError):
        return False


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
