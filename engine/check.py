#!/usr/bin/env python3
"""Project checks: preflight / storyboard / sheet / audio / edges / auto / delivery.
Preflight is cheap. Auto validates audio then renders only stale frames. Delivery
also verifies the encoded MP4. Image-edge heuristics are advisory, never a proof
that text, facts or illustrations are correct.
"""
import argparse
import json
import math
import pathlib
import subprocess
import sys
import wave
from audio_metrics import measure, violations, policy
from project import (timeline_errors, cues_path, number, build_current, file_hash, sound_events)


def load(project):
    project = pathlib.Path(project).resolve()
    film = json.loads((project/'film.json').read_text(encoding='utf-8'))
    path = cues_path(project, film)
    cues = json.loads(path.read_text(encoding='utf-8')) if film.get('voice',{}).get('cues') and path.is_file() else None
    return project, film, cues


def probe(path):
    return json.loads(subprocess.run(['ffprobe','-v','error','-show_format','-show_streams',
                      '-of','json',str(path)],check=True,capture_output=True,text=True).stdout)


def preflight(project, strict=False):
    project, film, cues = load(project)
    from direction import resolve
    try:film=resolve(film)
    except (ValueError,TypeError) as error:
        print('✗',error);return False
    errors, warnings = timeline_errors(film,cues), []
    try: policy(film)
    except ValueError as error:errors.append(str(error))
    for beat in film.get('beats',[]):
        events=beat.get('events',{})
        if not isinstance(events,dict):errors.append('beat.events 必须为对象');continue
        for name,event in events.items():
            if not (isinstance(event,list) and len(event)==2 and all(number(t) for t in event) and
                    0<=event[0]<event[1]<=beat.get('end',0)-beat.get('start',0)+.001):
                errors.append(f"{beat.get('id')} 事件 {name} 必须为拍内局部时间 [start,end]")
    if errors:
        for error in errors: print('✗',error)
        return False
    if any(b.get('event_anchors') for b in film.get('beats',[])):
        try:
            from alignment import resolved_events
            words=json.loads((project/film['voice']['words']).read_text())
            resolved=resolved_events(project,film,cues,words)
            for b in film['beats']:
                if b.get('event_anchors') and resolved[b['id']]!=b.get('events',{}):errors.append(f"{b['id']} anchor events stale; run alignment.py apply")
        except (KeyError,OSError,ValueError,TypeError) as error:errors.append(f'词事件绑定无效: {error}')
    if film.get('voice',{}).get('cues') and cues is None:
        errors.append('配置了 voice.cues 但文件不存在')
    for beat in film.get('beats',[]):
        try:sound_events(beat,film)
        except (KeyError,ValueError,TypeError) as error:errors.append(str(error))
    for name in ('index.html','storyboard.js','data.js'):
        if not (project/name).is_file(): errors.append(f'缺 {name}')
    if cues:
        if cues.get('audio') and not cues.get('alignment',{}).get('reviewed'):
            (errors if strict else warnings).append('录音文字/时间码尚未人工或强制对齐校对（alignment.reviewed）')
        for i,sentence in enumerate(cues.get('sentences',[])):
            if not isinstance(sentence,dict): continue
            if not sentence.get('text'):
                errors.append(f'句 {i} 缺字幕文本；VAD 不会转录文字')
            text = sentence.get('text','')
            duration = sentence.get('end',0)-sentence.get('start',0)
            if duration > 0 and len(text.replace(' ',''))/duration > film.get('subtitles_max_cps',12):
                (errors if strict else warnings).append(f'句 {i} 字幕阅读速度过快；拆句/改稿或延长')
        files = {cues['audio']} if cues.get('audio') else {s.get('file','') for s in cues.get('sentences',[]) if isinstance(s,dict)}
        for name in files:
            path = project/name
            if not name or not path.is_file():
                errors.append(f'缺语音文件 {name}'); continue
            info = probe(path)
            actual = float(info['format']['duration'])
            if cues.get('audio'):
                if any(s.get('end',0)>actual+.03 for s in cues['sentences']):
                    errors.append('录音 cues 超出源音频')
            else:
                for i,sentence in enumerate(cues['sentences']):
                    if sentence.get('file') == name and abs(actual-(sentence['end']-sentence['start'])) > .06:
                        errors.append(f'句 {i} 音频时长与 cues 不符')
        fade = film.get('ending_fade',[film['duration']])[0]
        if any(s.get('end',0)>fade+.002 for s in cues.get('sentences',[]) if isinstance(s,dict)):
            errors.append('结尾淡出会截断口播或字幕')
    # Silent-mode subtitles use the same interval and readability invariants.
    previous = 0
    for i,row in enumerate(film.get('subtitles',[])):
        if not (isinstance(row,list) and len(row)==3 and number(row[0]) and number(row[1]) and
                previous <= row[0] < row[1] <= film['duration'] and isinstance(row[2],str)):
            errors.append(f'静默字幕 {i} 非法或重叠'); continue
        previous = row[1]
        if len(row[2])/(row[1]-row[0]) > film.get('subtitles_max_cps',12):
            (errors if strict else warnings).append(f'静默字幕 {i} 阅读速度过快')
    claims_file = project/'claims.json'
    if not claims_file.is_file():
        (errors if strict else warnings).append('缺 claims.json；需要记录事实/示例与审查状态')
    else:
        evidence = json.loads(claims_file.read_text(encoding='utf-8'))
        if not evidence.get('reviewed'):
            (errors if strict else warnings).append('事实覆盖尚未审查（claims.reviewed）')
        ids=set()
        for claim in evidence.get('claims',[]):
            cid=claim.get('id')
            if not cid or cid in ids: errors.append('claim id 缺失或重复')
            ids.add(cid)
            if claim.get('kind') == 'example':
                if not claim.get('display_label'): errors.append(f'{cid} 示例缺屏幕标识 display_label')
            else:
                required=('statement','source','accessed','data_key')
                if any(not claim.get(k) for k in required): errors.append(f'{cid} 缺主张/来源/访问日期/数据关联')
                if not claim.get('verified'): errors.append(f'{cid} 尚未核实')
    if film.get('duration',0) and film.get('beats') and film['beats'][0]['end']>5:
        warnings.append('首拍较长，请看片确认前三秒已建立信息焦点')
    for error in errors: print('✗',error)
    for warning in warnings: print('⚠',warning)
    if not errors: print('✓ 结构预检通过' + ('（交付严格模式）' if strict else '（不代表事实/视觉验收通过）'))
    return not errors


def sheet(project,n=4):
    from PIL import Image,ImageOps,ImageDraw
    project=pathlib.Path(project)
    files=sorted((project/'checks').glob('key_*.jpg'))
    if not files: raise SystemExit('先渲染关键帧')
    columns=math.ceil(math.sqrt(n)); rows=math.ceil(n/columns)
    for group in range(0,len(files),n):
        output=Image.new('RGB',(columns*640,rows*390),(25,25,25))
        draw=ImageDraw.Draw(output)
        for i,path in enumerate(files[group:group+n]):
            with Image.open(path) as frame:
                thumb=ImageOps.contain(frame.convert('RGB'),(640,360))
                x,y=(i%columns)*640,(i//columns)*390
                output.paste(thumb,(x+(640-thumb.width)//2,y+(360-thumb.height)//2))
                draw.text((x+12,y+365),path.name,fill='white')
        output.save(project/'checks'/f'sheet_{group//n}.jpg',quality=92)
    print(f'✓ {len(files)} 帧等比拼图（每页最多 {n} 格）；需逐格看图')


def audio(project):
    import numpy as np
    project,film,_=load(project)
    path=project/'audio/mix.wav'
    if not path.is_file(): print('✗ 缺 audio/mix.wav'); return False
    with wave.open(str(path)) as stream:
        if stream.getsampwidth()!=2: print('✗ 混音必须为 PCM16'); return False
        samples=np.frombuffer(stream.readframes(stream.getnframes()),dtype=np.int16).astype(float)/32768
        channels,rate=stream.getnchannels(),stream.getframerate()
    if not len(samples): print('✗ 混音为空'); return False
    duration=len(samples)/channels/rate
    peak=float(np.abs(samples).max())
    ok=abs(duration-film['duration']) <= 1/rate+.001 and peak<=10**(-1/20)+.0001
    if float(np.abs(samples[-max(1,int(.05*rate*channels)):]).max())>.01:
        print('✗ 混音结尾未淡出'); ok=False
    print(f"{'✓' if ok else '✗'} 音频 {duration:.3f}s / peak={peak:.4f} / rms={np.sqrt((samples**2).mean()):.4f}")
    return ok


def edges(project,every=15,threshold=32):
    import numpy as np
    from PIL import Image
    project,film,_=load(project)
    files=sorted((project/'frames').glob('f*.jpg'))
    if not files: raise SystemExit('缺帧；先最终渲染')
    count=0
    for path in files[::max(1,every)]:
        time=int(path.stem[1:])/film.get('fps',30)
        if time<1.6: continue
        with Image.open(path) as frame: pixels=np.array(frame.convert('L'))
        band=max(2,round(min(pixels.shape)*.024))
        if any(float((area>threshold).mean())>.02 for area in (pixels[:band],pixels[-band:],pixels[:,:band],pixels[:,-band:])):
            count+=1
    print(f'⚠ 边缘亮度提示：{count} 个采样帧；背景/合法出血也会命中，需看图判断。未作为硬门禁')
    return True


def delivery(project,video):
    project,film,_=load(project)
    ok=preflight(project,True) and audio(project)
    for kind in ('audio','frames','video'):
        if not build_current(project,kind): print(f'✗ {kind} 已过期或缺构建记录'); ok=False
    if not video: print('✗ delivery 必须指定 --video'); return False
    path=pathlib.Path(video).resolve()
    info=probe(path)
    streams=info.get('streams',[])
    v=next((s for s in streams if s['codec_type']=='video'),{})
    a=next((s for s in streams if s['codec_type']=='audio'),{})
    fps=film.get('fps',30)
    if v.get('codec_name')!='h264' or a.get('codec_name')!='aac' or v.get('pix_fmt')!='yuv420p':
        print('✗ 成片编码不是 H.264/yuv420p + AAC'); ok=False
    if v.get('width')!=film.get('width',1920) or v.get('height')!=film.get('height',1080):
        print('✗ 成片尺寸不符'); ok=False
    rate=v.get('avg_frame_rate','0/1').split('/')
    actual_fps=float(rate[0])/float(rate[1]) if float(rate[1]) else 0
    if abs(actual_fps-fps)>.01 or abs(float(info['format']['duration'])-film['duration'])>max(2/fps,.06):
        print('✗ 成片帧率或时长不符'); ok=False
    stamp=project/'build/video.json'
    if not stamp.is_file() or json.loads(stamp.read_text()).get('sha256')!=file_hash(path):
        print('✗ 成片与编码记录不一致'); ok=False
    stats=measure(path)
    for error in violations(stats,film):print('✗',error);ok=False
    print(f'最终音轨: {stats["integrated_lufs"]} LUFS / {stats["true_peak_dbtp"]} dBTP')
    result={'audio_metrics':stats,'technical_passed':ok,'manual_review_required':['画面辨识度/结构与遮挡','首句/数字句/末句试听','字幕完整性与事实来源']}
    from project import write_json
    write_json(project/'checks/delivery.json',result)
    print('✓ 编码与技术检查通过；仍需完成观看/试听验收' if ok else '✗ 交付检查未通过')
    return ok


def auto(args):
    project,film,_=load(args.project)
    if not preflight(project,True): return False
    engine=pathlib.Path(__file__).parent
    def run(name,*options):
        subprocess.run([sys.executable,str(engine/name),'--project',str(project),*options],check=True)
    keys=args.keys
    if keys=='auto':
        times=[]
        for beat in film['beats']:
            for offset in (.05,.2,.5,.9):
                times.append(round(beat['start']+(beat['end']-beat['start'])*offset,3))
        keys=','.join(map(str,sorted(set(times))))
    run('render.py','--keys',keys,'--determinism','--strict-fonts')
    sheet(project,args.n)
    if not build_current(project,'audio'):
        subprocess.run([sys.executable,str(engine/'audio.py'),'build','--project',str(project)],check=True)
    if not audio(project): return False
    if not build_current(project,'frames'):
        run('render.py','--full','--determinism','--strict-fonts')
    edges(project,args.every,args.thr)
    print('✓ 自动技术检查通过；关键帧与短片段需人工观看，编码后另跑 delivery')
    return True


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('cmd',choices=['preflight','storyboard','sheet','audio','edges','auto','delivery'])
    parser.add_argument('--project',default='.')
    parser.add_argument('--strict',action='store_true')
    parser.add_argument('--video')
    parser.add_argument('--n',type=int,default=4)
    parser.add_argument('--every',type=int,default=15)
    parser.add_argument('--thr',type=int,default=32)
    parser.add_argument('--keys',default='auto')
    args=parser.parse_args()
    if args.n<1: parser.error('--n 须为正整数')
    if args.cmd in ('preflight','storyboard'): ok=preflight(args.project,args.strict)
    elif args.cmd=='sheet': sheet(args.project,args.n); ok=True
    elif args.cmd=='audio': ok=audio(args.project)
    elif args.cmd=='edges': ok=edges(args.project,args.every,args.thr)
    elif args.cmd=='auto': ok=auto(args)
    else: ok=delivery(args.project,args.video)
    raise SystemExit(0 if ok else 1)


if __name__=='__main__': main()
