#!/usr/bin/env python3
"""Offline browser + audio + encoded-video regression, isolated from user films."""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'engine'))
from project import write_json,build_current


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--keep',action='store_true')
    args=parser.parse_args()
    directory=pathlib.Path(tempfile.mkdtemp(prefix='sky-film-smoke-'))
    print(f'Artifacts: {directory}',flush=True)
    def run(*command):
        subprocess.run([sys.executable,*map(str,command)],check=True)
    try:
        project=directory/'film'
        run(ROOT/'engine/new.py',project,'--ratio','960x540','--theme','history')
        film=json.loads((project/'film.json').read_text())
        text='这是一段用于检查完整字幕分页的演示文字。'*12
        film.update(duration=30,fps=12,progress=False,decor=False,voice={},
                    beats=[{'id':'b0','scene':'s0','start':0,'end':10,'sentences':[]},
                           {'id':'b1','scene':'s1','start':10,'end':20,'sentences':[]},
                           {'id':'b2','scene':'s2','start':20,'end':30,'sentences':[]}],
                    subtitles=[[.1,28,text]],ending_fade=[29,29.8])
        write_json(project/'film.json',film)
        write_json(project/'claims.json',{'reviewed':True,'claims':[],
                  'note':'测试画面仅含物体与分页示例，无事实主张'})
        (project/'storyboard.js').write_text('''window.FILM={scenes:{
          s0(ctx,t,l){drawEntity(ctx,t,l,{id:'wheeledCart',x:300,y:210,s:2,at:.1,enter:'fadeIn',action:(t,l)=>({x:Math.min(l,5)*15}),exitAt:9.5});},
          s1(ctx,t,l){drawEntity(ctx,t,l,{id:'tree',x:480,y:210,s:2,at:.1,motion:'grow'});},
          s2(ctx,t,l){drawEntity(ctx,t,l,{paths:[_poly([[-80,0],[80,0]],false)],x:480,y:210,s:2,at:.1,dur:3,style:'line'});}
        }};''')
        run(ROOT/'engine/check.py','auto','--project',project,'--keys','.1,.3,.6,1.5,9,10.3,11,19,20.3,21,29')
        # Inspect actual measured subtitle pagination rather than implementation strings.
        import render
        pw,browser,page,server,_=render.launch(project,True,True)
        try:
            layout=page.evaluate('window.SUBTITLE_LAYOUT')
            recovered=''.join(''.join(p['lines']) for p in layout)
            assert recovered==text, 'subtitle text was lost'
            assert len(layout)>3, 'long subtitle did not paginate'
            assert all(p['end']>p['start'] and len(p['lines'])<=2 for p in layout)
            assert page.evaluate('window.__fontErrors.length')==0
        finally:
            browser.close();pw.stop();server.shutdown()
        output=project/'out/smoke.mp4'
        run(ROOT/'engine/encode.py','--project',project,'--output',output)
        run(ROOT/'engine/check.py','delivery','--project',project,'--video',output)
        assert build_current(project,'frames')
        # Relative clip output resolves from the invoking working directory.
        relative=directory/'motion.mp4'
        subprocess.run([sys.executable,str(ROOT/'engine/render.py'),'--project',str(project),
                        '--clip','0,1','--output','motion.mp4','--strict-fonts'],cwd=directory,check=True)
        assert relative.is_file() and not (project/'motion.mp4').exists()
        assert build_current(project,'frames') and build_current(project,'audio')

        # Exercise templates in vertical/square/wide formats with a non-30fps clock.
        for template,ratio in [('how-to','9:16'),('fact-card','1:1'),('daily-brief','2.35:1')]:
            target=directory/template
            run(ROOT/'engine/new.py',target,'--template',template,'--ratio',ratio)
            run(ROOT/'engine/render.py','--project',target,'--keys','1,4,10','--determinism','--strict-fonts')
        print('Browser, long subtitles, part poses, 3 template ratios, audio, MP4 delivery: passed',flush=True)
    finally:
        if not args.keep:shutil.rmtree(directory)
        else:print(f'Kept: {directory}',flush=True)


if __name__=='__main__':main()
