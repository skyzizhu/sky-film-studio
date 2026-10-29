"""Composable content, visual treatment and semantic sound defaults.
Explicit film/beat settings win. Legacy projects without direction stay unchanged.
"""
import argparse
import copy
import json
import pathlib
from functools import lru_cache


@lru_cache(maxsize=1)
def catalog():
    here=pathlib.Path(__file__).resolve().parent
    path=here/'direction-profiles.json'
    if not path.is_file():path=here.parent/'themes/direction-profiles.json'
    return json.loads(path.read_text(encoding='utf-8'))


def merge(base,overrides):
    out=copy.deepcopy(base)
    for key,value in overrides.items():
        out[key]=merge(out[key],value) if isinstance(out.get(key),dict) and isinstance(value,dict) else copy.deepcopy(value)
    return out


def selection(film):
    d=film.get('direction')
    if d is None:return None
    if not isinstance(d,dict):raise ValueError('direction must be an object')
    c=catalog();style=d.get('style');content=d.get('content','concept')
    if style not in c['styles']:raise ValueError(f'Unknown direction.style: {style}')
    selected_variant=d.get('variant',c['styles'][style].get('default_variant'))
    if selected_variant is not None and selected_variant not in c['styles'][style].get('variants',{}):raise ValueError(f'Unknown direction.variant for {style}: {selected_variant}')
    selected_style=profile({'style':style,**({'variant':selected_variant} if selected_variant is not None else {})})
    sound=d.get('sound',selected_style['sound'])
    if content not in c['contents']:raise ValueError(f'Unknown direction.content: {content}')
    if sound not in c['sounds']:raise ValueError(f'Unknown direction.sound: {sound}')
    selected={'content':content,'style':style,'sound':sound}
    if selected_variant is not None:selected['variant']=selected_variant
    if 'task' in d:
        if d['task'] not in c['tasks']:raise ValueError(f"Unknown direction.task: {d['task']}")
        selected['task']=d['task']
    return selected


def profile(selected):
    style=copy.deepcopy(catalog()['styles'][selected['style']])
    variant=selected.get('variant',style.get('default_variant'))
    if variant is not None:
        if variant not in style.get('variants',{}):raise ValueError(f"Unknown direction.variant: {variant}")
        style=merge(style,style['variants'][variant]['overrides'])
    return style


def resolve(film):
    out=copy.deepcopy(film);d=selection(out)
    if d is None:return out
    style=profile(d);music=copy.deepcopy(style['music']);bpm=music.pop('bpm')
    music['sections']=copy.deepcopy(style['intents'])
    out['direction']=d
    out.setdefault('theme',d['style']);out.setdefault('renderer',d['style']);out.setdefault('bpm',bpm)
    out['music']=merge(music,out.get('music',{}))
    if 'product' in style:out['product']=merge(style['product'],out.get('product',{}))
    return out


def section_layers(film,beat):
    d=selection(film)
    return {} if d is None else film.get('music',{}).get('sections',{}).get(beat.get('intent'),{})


def sound_spec(film,spec):
    """Explicit kind wins; role selection never adds a cue without an event."""
    if 'kind' in spec:return dict(spec)
    d=selection(film)
    profile=spec.get('sound_profile',d['sound'] if d else None)
    c=catalog()
    if profile not in c['sounds']:raise ValueError('Semantic sound role requires a valid sound profile/direction')
    role=spec.get('role');roles=c['sounds'][profile]['roles']
    if role not in roles:raise ValueError(f'Unknown sound role: {role}')
    chosen=roles[role]
    return None if chosen is None else {**chosen,**spec}


def plan(film,content,style,sound,task=None,variant=None):
    d={'content':content,'style':style}
    previous=film.get('direction',{})
    variant=variant if variant is not None else (previous.get('variant') if previous.get('style')==style else None)
    if variant is not None:d['variant']=variant
    if sound:d['sound']=sound
    task=task if task is not None else film.get('direction',{}).get('task')
    if task is not None:d['task']=task
    proposed=resolve({**film,'direction':d})
    c=catalog();selected=selection(proposed)
    return {'film':proposed,'guidance':{'content':c['contents'][content],
            'style':profile(selected),'sound':c['sounds'][selected['sound']],
            **({'task':c['tasks'][selected['task']]} if 'task' in selected else {})},
            'note':'Defaults fill missing values; existing theme/renderer/BPM/music retained. No scenes or event times generated.'}


def evidence_errors(film):
    errors=[]
    for beat in film.get('beats',[]):
        evidence=beat.get('evidence')
        if evidence is None:continue
        prefix=f"{beat.get('id','beat')} evidence"
        if not isinstance(evidence,dict):
            errors.append(prefix+' must be an object');continue
        for key in ('subject','change','result'):
            if not isinstance(evidence.get(key),str) or not evidence[key].strip():
                errors.append(prefix+f'.{key} must describe visible evidence')
        refs=evidence.get('event_ids',[])
        events=beat.get('events',{})
        if not isinstance(events,dict):events={}
        if not isinstance(refs,list) or any(not isinstance(x,str) or x not in events for x in refs):
            errors.append(prefix+'.event_ids must reference events in the same beat')
    return errors


def music_focus(film):
    """Opt-in BGM attenuation linked to visible events; never alters voice/SFX."""
    import math
    def num(x):return isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x)
    rows=[]
    for beat in film.get('beats',[]):
        music=beat.get('music',{})
        if not isinstance(music,dict):raise ValueError('beat.music must be an object')
        controls=music.get('focus_events',[])
        if not isinstance(controls,list):raise ValueError('music.focus_events must be a list')
        for spec in controls:
            if not isinstance(spec,dict):raise ValueError('music focus must be an object')
            name=spec.get('event');events=beat.get('events',{})
            event=events.get(name) if isinstance(events,dict) and isinstance(name,str) else None
            if not isinstance(event,list) or len(event)!=2 or not all(num(x) for x in event) or not 0<=event[0]<event[1]<=beat['end']-beat['start']:
                raise ValueError('music focus must reference a valid local event')
            db=spec.get('duck_db',-5);attack=spec.get('attack',.25);release=spec.get('release',.65);hold=spec.get('hold',.3)
            if not all(num(x) for x in (db,attack,release,hold)) or not -24<=db<=0 or not .02<=attack<=3 or not .02<=release<=3 or not 0<=hold<=3:
                raise ValueError('music focus: duck_db -24..0, attack/release .02..3, hold 0..3')
            rows.append({'beat':beat['id'],'event':name,'start':beat['start']+event[0],'end':min(film['duration'],beat['start']+event[1]+hold),'duck_db':db,'attack':attack,'release':release})
    return rows


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--project',required=True)
    p.add_argument('--content',default='concept');p.add_argument('--style',required=True);p.add_argument('--sound')
    p.add_argument('--task',choices=list(catalog()['tasks']))
    p.add_argument('--variant',help='Product: precision, flow, playful, studio')
    p.add_argument('--apply',action='store_true');a=p.parse_args()
    root=pathlib.Path(a.project).resolve();film=json.loads((root/'film.json').read_text(encoding='utf-8'))
    result=plan(film,a.content,a.style,a.sound,a.task,a.variant)
    from project import write_json
    write_json(root/'checks/direction-plan.json',result)
    if a.apply:write_json(root/'film.json',result['film'])
    print('Applied defaults; review existing overrides' if a.apply else 'Wrote checks/direction-plan.json; source unchanged')

if __name__=='__main__':main()
