#!/usr/bin/env python3
"""Encode current frames and audio with the project's actual frame rate."""
import argparse
import json
import pathlib
import subprocess
from audio_metrics import mastering_filter, measure, violations
from project import build_current, mark_build, file_hash


def encode(project,output):
    project=pathlib.Path(project).resolve()
    for kind in ('frames','audio'):
        if not build_current(project,kind):
            raise SystemExit(f'{kind} 缺失或过期；先 check.py auto')
    film=json.loads((project/'film.json').read_text())
    output=pathlib.Path(output).resolve(); output.parent.mkdir(parents=True,exist_ok=True)
    mastering=mastering_filter(project/'audio/mix.wav',film)
    subprocess.run(['ffmpeg','-y','-v','error','-framerate',str(film.get('fps',30)),
        '-i',str(project/'frames/f%05d.jpg'),'-i',str(project/'audio/mix.wav'),
        '-t',str(film['duration']),'-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
        '-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:v','libx264','-crf','17','-pix_fmt','yuv420p',
        '-af',mastering,'-ar','48000','-c:a','aac','-b:a','192k','-movflags','+faststart',str(output)],check=True)
    stats=measure(output)
    errors=violations(stats,film)
    if errors: raise SystemExit('; '.join(errors))
    mark_build(project,'video',output=str(output),sha256=file_hash(output),audio_metrics=stats)
    print(output)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project',required=True)
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    encode(args.project,args.output)
