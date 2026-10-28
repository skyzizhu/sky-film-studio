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
    sound=d.get('sound',c['styles'][style]['sound'])
    if content not in c['contents']:raise ValueError(f'Unknown direction.content: {content}')
    if sound not in c['sounds']:raise ValueError(f'Unknown direction.sound: {sound}')
    return {'content':content,'style':style,'sound':sound}


def resolve(film):
    out=copy.deepcopy(film);d=selection(out)
    if d is None:return out
    style=catalog()['styles'][d['style']];music=copy.deepcopy(style['music']);bpm=music.pop('bpm')
    music['sections']=copy.deepcopy(style['intents'])
    out['direction']=d
    out.setdefault('theme',d['style']);out.setdefault('renderer',d['style']);out.setdefault('bpm',bpm)
    out['music']=merge(music,out.get('music',{}))
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


def plan(film,content,style,sound):
    d={'content':content,'style':style}
    if sound:d['sound']=sound
    proposed=resolve({**film,'direction':d})
    c=catalog();selected=selection(proposed)
    return {'film':proposed,'guidance':{'content':c['contents'][content],
            'style':c['styles'][style],'sound':c['sounds'][selected['sound']]},
            'note':'Defaults fill missing values; existing theme/renderer/BPM/music retained. No scenes or event times generated.'}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--project',required=True)
    p.add_argument('--content',default='concept');p.add_argument('--style',required=True);p.add_argument('--sound')
    p.add_argument('--apply',action='store_true');a=p.parse_args()
    root=pathlib.Path(a.project).resolve();film=json.loads((root/'film.json').read_text(encoding='utf-8'))
    result=plan(film,a.content,a.style,a.sound)
    from project import write_json
    write_json(root/'checks/direction-plan.json',result)
    if a.apply:write_json(root/'film.json',result['film'])
    print('Applied defaults; review existing overrides' if a.apply else 'Wrote checks/direction-plan.json; source unchanged')

if __name__=='__main__':main()
