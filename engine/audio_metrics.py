"""FFmpeg loudness measurement and configurable delivery mastering."""
import json
import math
import subprocess


def policy(film):
    config=film.get('audio_master',{})
    values={'integrated_lufs':config.get('integrated_lufs',-16),
            'true_peak_dbtp':config.get('true_peak_dbtp',-1),
            'loudness_tolerance':config.get('loudness_tolerance',1)}
    for name,value in values.items():
        if not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value):
            raise ValueError(f'audio_master.{name} must be finite')
    if not -30<=values['integrated_lufs']<=-10 or not -6<=values['true_peak_dbtp']<=-.3 or not .1<=values['loudness_tolerance']<=3:
        raise ValueError('audio_master target out of supported range')
    return values


def measure(path,target=None):
    target=target or {'integrated_lufs':-16,'true_peak_dbtp':-1}
    result=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(path),'-vn','-af',
        f"loudnorm=I={target['integrated_lufs']}:TP={target['true_peak_dbtp']}:LRA=11:print_format=json",'-f','null','-'],
        capture_output=True,text=True,check=True)
    report=json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):].lstrip())[0]
    def finite(name):
        value=float(report[name]);return value if math.isfinite(value) else None
    return {'integrated_lufs':finite('input_i'),'true_peak_dbtp':finite('input_tp'),
            'loudness_range_lu':finite('input_lra'),'threshold_lufs':finite('input_thresh'),
            'offset':finite('target_offset')}


def mastering_filter(path,film):
    target=policy(film)
    stats=measure(path,{**target,'true_peak_dbtp':target['true_peak_dbtp']-1})
    if stats['integrated_lufs'] is None:return 'anull'
    # Leave an additional dB before AAC; delivery measures the decoded result.
    ceiling=target['true_peak_dbtp']-1
    return (f"loudnorm=I={target['integrated_lufs']}:TP={ceiling}:LRA=11:"
        f"measured_I={stats['integrated_lufs']}:measured_TP={stats['true_peak_dbtp']}:"
        f"measured_LRA={stats['loudness_range_lu']}:measured_thresh={stats['threshold_lufs']}:"
        f"offset={stats['offset'] or 0}:linear=true")


def violations(stats,film):
    target=policy(film);errors=[]
    if stats['integrated_lufs'] is None:
        if film.get('voice',{}).get('cues'):errors.append('最终音轨静音，但配置了口播')
        return errors
    if abs(stats['integrated_lufs']-target['integrated_lufs'])>target['loudness_tolerance']:
        errors.append(f"最终响度 {stats['integrated_lufs']} LUFS 超出目标 {target['integrated_lufs']}")
    if stats['true_peak_dbtp'] is None or stats['true_peak_dbtp']>target['true_peak_dbtp']+.05:
        errors.append(f"最终真峰值 {stats['true_peak_dbtp']} dBTP 超过 {target['true_peak_dbtp']}")
    return errors
