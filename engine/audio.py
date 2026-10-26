#!/usr/bin/env python3
"""sky-film-studio · audio.py —— BGM/SFX 合成 + 口播混音
  build --project <dir>
读 film.json：BGM 小节网格编曲，鼓/琶音密度由每小节 energy 驱动
（>0.15 贝斯 >0.25 底鼓 >0.45 军鼓+镲 >0.55 琶音 >0.8 重击切分）；
SFX 事件 beats[].sfx；口播按 cues 精确放置并 duck；母带 tanh + -1dB。"""
import argparse, json, pathlib, subprocess

import numpy as np

SR = 44100
rng = np.random.default_rng(20260901)


def midi(n): return 440.0 * 2 ** ((n - 69) / 12)


def fftfilt(x, gain_fn):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * gain_fn(f), n=len(x))


def lowpass(x, fc, order=2): return fftfilt(x, lambda f: 1.0 / (1 + (f / fc) ** (2 * order)))
def highpass(x, fc, order=2): return fftfilt(x, lambda f: (f / fc) ** (2 * order) / (1 + (f / fc) ** (2 * order)))
def bandpass(x, lo, hi):
    return fftfilt(x, lambda f: np.exp(-0.5 * ((np.log(np.clip(f, 1, SR / 2)) - np.log(np.sqrt(lo * hi))) / (0.5 * np.log(hi / lo))) ** 2))


def env_ar(n, a, r):
    e = np.ones(n); na, nr = min(int(a * SR), n), min(int(r * SR), n)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i < 0 or i >= buf.shape[1]:
        return
    m = min(len(x), buf.shape[1] - i)
    buf[0, i:i + m] += x[:m] * gain * (1 - max(pan, 0) * 0.6)
    buf[1, i:i + m] += x[:m] * gain * (1 - max(-pan, 0) * 0.6)


def osc_mix(f, dur, partials=(1.0, 0.5, 0.25, 0.12)):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for k, a in enumerate(partials, 1):
        out += a * np.sin(2 * np.pi * f * k * t)
    return out / sum(partials)


def v_pad(f, dur):
    x = osc_mix(f * 0.996, dur) + osc_mix(f * 1.004, dur, (1.0, 0.5, 0.28, 0.1))
    return lowpass(x, 1350) * env_ar(len(x), 0.55, 0.85)


def v_pluck(f, dur=0.42):
    t = np.arange(int(dur * SR)) / SR
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
         + 0.55 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 11)
         + 0.3 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 16))
    x[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return x * 0.9


def v_bass(f, dur):
    t = np.arange(int(dur * SR)) / SR
    x = np.sin(2 * np.pi * f * t) + 0.42 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    return np.tanh(x * 1.6) / 1.6 * env_ar(len(x), 0.012, min(0.22, dur * 0.5))


def v_kick(amp=1.0):
    t = np.arange(int(0.30 * SR)) / SR
    ph = np.cumsum(150 * np.exp(-t / 0.05) + 44) / SR
    return (np.sin(2 * np.pi * ph) * np.exp(-t * 16)
            + highpass(rng.normal(0, 1, len(t)), 3000) * np.exp(-t * 400) * 0.5) * amp


def v_snare(amp=1.0):
    t = np.arange(int(0.24 * SR)) / SR
    return (bandpass(rng.normal(0, 1, len(t)), 1200, 6500) * np.exp(-t * 20)
            + np.sin(2 * np.pi * 196 * t) * np.exp(-t * 30) * 0.5) * amp


def v_hat(open_=False, amp=1.0):
    dur = 0.16 if open_ else 0.05
    t = np.arange(int(dur * SR)) / SR
    return highpass(rng.normal(0, 1, len(t)), 7500) * np.exp(-t * (26 if open_ else 120)) * amp


def v_shimmer(amp=1.0):
    t = np.arange(int(1.4 * SR)) / SR
    x = highpass(rng.normal(0, 1, len(t)), 5000) * np.exp(-t * 3.2)
    for f0 in (5232, 6598, 7840):
        x += np.sin(2 * np.pi * f0 * t) * np.exp(-t * 2.6) * 0.12
    return x * amp * 0.8


def sfx_voice(kind, p=None):
    def tone(f0, dur, dec, h2=0.0):
        t = np.arange(int(dur * SR)) / SR
        return np.sin(2 * np.pi * f0 * t) * np.exp(-t * dec) + h2 * np.sin(2 * np.pi * 2 * f0 * t) * np.exp(-t * dec * 1.4)
    if kind == "boom":
        t = np.arange(int(1.7 * SR)) / SR
        ph = np.cumsum(62 * np.exp(-t / 0.32) + 26) / SR
        return (np.sin(2 * np.pi * ph) * np.exp(-t * 1.9)
                + lowpass(rng.normal(0, 1, len(t)), 120) * np.exp(-t * 2.2) * 0.5) * 0.95
    if kind == "ping": return tone(p or 1318, 0.5, 7, 0.32)
    if kind == "tick":
        t = np.arange(int(0.05 * SR)) / SR
        return (np.sin(2 * np.pi * (p or 2100) * t) * np.exp(-t * 90)
                + highpass(rng.normal(0, 1, len(t)), 4000) * np.exp(-t * 220) * 0.5)
    if kind == "key":
        t = np.arange(int(0.035 * SR)) / SR
        return (np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 160)
                + highpass(rng.normal(0, 1, len(t)), 3000) * np.exp(-t * 300) * 0.7) * 0.8
    if kind == "ding": return tone(p or 988, 0.6, 5, 0.4)
    if kind == "chime":
        out = np.zeros(int(1.2 * SR))
        for i, f0 in enumerate([1046.5, 1318.5, 1568.0]):
            t = np.arange(int(0.9 * SR)) / SR
            x = np.sin(2 * np.pi * f0 * t) * np.exp(-t * 3.4)
            j = int(i * 0.085 * SR); m = min(len(x), len(out) - j)
            out[j:j + m] += x[:m] * 1.3
        return out * 0.9
    if kind == "stamp":
        t = np.arange(int(0.6 * SR)) / SR
        ph = np.cumsum(130 * np.exp(-t / 0.06) + 46) / SR
        return (np.sin(2 * np.pi * ph) * np.exp(-t * 9)
                + bandpass(rng.normal(0, 1, len(t)), 350, 1400) * np.exp(-t * 46) * 1.1
                + lowpass(rng.normal(0, 1, len(t)), 150) * np.exp(-t * 7) * 0.55)
    if kind == "thock": return tone(p or 250, 0.16, 30)
    if kind == "clock": return tone(3150 if p else 2450, 0.045, 110)
    if kind == "strike":
        t = np.arange(int(0.22 * SR)) / SR
        th = tone(180, 0.16, 30)
        return bandpass(rng.normal(0, 1, len(t)), 350, 2600) * np.exp(-t * 18) + np.pad(th, (0, max(0, len(t) - len(th))))[:len(t)] * 0.7
    if kind == "pageturn":
        t = np.arange(int(0.32 * SR)) / SR
        return bandpass(rng.normal(0, 1, len(t)), 900, 3400) * (0.5 + 0.5 * np.sin(2 * np.pi * 26 * t)) * np.exp(-t * 7) * 0.8
    if kind == "blip": return tone(p or 1760, 0.06, 70)
    if kind == "whoosh":
        n = bandpass(rng.normal(0, 1, int(0.42 * SR)), 500, 3200)
        return n * np.sin(np.linspace(0, np.pi, len(n))) ** 1.6
    if kind == "swell":
        t = np.arange(int(0.8 * SR)) / SR
        return lowpass(rng.normal(0, 1, len(t)), 1800) * (t / 0.8) ** 2.2 * 0.8
    raise ValueError(kind)


PROG = {
    "minor": [["Am", [57, 60, 64, 69], 45], ["F", [53, 57, 60, 65], 41],
              ["C", [52, 55, 60, 64], 48], ["G", [55, 59, 62, 67], 43]],
    "major": [["C", [55, 60, 64, 67], 48], ["G", [55, 59, 62, 67], 43],
              ["Am", [57, 60, 64, 69], 45], ["F", [53, 57, 60, 65], 41]],
    "pentatonic": [["Am", [57, 60, 64, 67], 45], ["C", [55, 60, 64, 67], 48],
                   ["D", [57, 62, 66, 69], 50], ["G", [55, 59, 62, 67], 43]],
}


def build(project):
    proj = pathlib.Path(project).resolve()
    film = json.loads((proj / "film.json").read_text(encoding="utf-8"))
    dur = film["duration"]
    N = int(dur * SR) + SR
    bpm = film.get("bpm", 100)
    beat_t, bar_t = 60 / bpm, 4 * 60 / bpm
    bars = int(round(dur / bar_t))
    music = film.get("music", {})
    prog = PROG[music.get("mode", "minor")]
    arp_dens = music.get("arpDensity", 1.0)
    beats = sorted(film.get("beats", []), key=lambda b: b["start"])
    ending = film.get("ending_fade", [dur - 3.2, dur - 0.35])

    def energy_at(tq):
        for b in beats:
            if b["start"] <= tq < b["end"]:
                return b.get("energy", 0.5)
            if b["start"] > tq:
                break
        return 0.5

    bgm = np.zeros((2, N)); sfx = np.zeros((2, N)); voice = np.zeros((2, N))

    for bi in range(bars):
        t0 = bi * bar_t
        en = energy_at(t0 + 0.01)
        name, notes, root = prog[bi % 4]
        for vi, nn in enumerate(notes):
            place(bgm, v_pad(midi(nn), bar_t + 0.5), t0, (0.30 + en * 0.35) * 0.34,
                  pan=-0.35 if vi % 2 == 0 else 0.35)
        if en > 0.15:
            bb = [0, 2] if en < 0.6 else ([0, 1.5, 2, 3.5] if en > 0.8 else [0, 1, 2, 3])
            for k, bd in enumerate(bb):
                place(bgm, v_bass(midi(root), beat_t * 0.92), t0 + bd * beat_t, 0.5 * (1 if k == 0 else 0.72))
        if en > 0.25:
            for bd in ([0, 2] if en < 0.6 else [0, 1, 2, 3]):
                place(bgm, v_kick(), t0 + bd * beat_t, 0.45 + en * 0.3)
        if en > 0.45:
            for bd in (1, 3):
                place(bgm, v_snare(), t0 + bd * beat_t, 0.28 + en * 0.25)
        if en > 0.2:
            for k in range(8):
                place(bgm, v_hat(en > 0.6 and k % 2 == 1), t0 + k * beat_t * 0.5,
                      (0.12 if k % 2 else 0.2) * (0.7 + en * 0.5))
        if en > 0.55 and bi > 0:
            pat = [0, 1, 2, 3, 2, 1]
            dens = max(4, int(8 * arp_dens))
            for k in range(dens):
                note = notes[pat[k % len(pat)] % len(notes)] + (12 if pat[k % len(pat)] >= 2 else 0)
                place(bgm, v_pluck(midi(note)), t0 + k * bar_t / dens,
                      (0.1 + en * 0.08) * (1 if k % 4 == 0 else 0.7))
        if bi > 0 and (bi % 8 == 0 or en > 0.85):
            place(bgm, v_shimmer(0.3 + en * 0.2), t0)

    for b in beats:
        for ev in b.get("sfx", []):
            tr, kind, g = ev[0], ev[1], ev[2] if len(ev) > 2 else 0.2
            p = ev[3] if len(ev) > 3 else None
            place(sfx, sfx_voice(kind, p), b["start"] + tr, g)

    speech = []
    cues_path = film.get("voice", {}).get("cues")
    if cues_path and (proj / cues_path).is_file():
        cues = json.loads((proj / cues_path).read_text(encoding="utf-8"))

        def load_wav(p):
            tmp = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar",
                                  str(SR), "-f", "s16le", "-"], capture_output=True).stdout
            return np.frombuffer(tmp, dtype=np.int16).astype(np.float32) / 32768

        if cues.get("audio"):
            x = load_wav(proj / cues["audio"])
            place(voice, x * 0.95, 0, 1.0)
            speech = [(s["start"], s["end"]) for s in cues["sentences"]]
        else:
            for s in cues["sentences"]:
                f = proj / s["file"]
                if not f.is_file():
                    continue
                place(voice, load_wav(f) * 0.95, s["start"], 1.0)
                speech.append((s["start"], s["end"]))
        vr = np.sqrt((np.clip(voice, -1, 1) ** 2).mean())
        if vr > 1e-5:
            voice *= min(2.5, max(0.5, 0.16 / vr))

    duck_db = film.get("voice", {}).get("duck_db", -8)
    if speech:
        duck_g = 10 ** (duck_db / 20)
        env = np.ones(N)
        for a, b in speech:
            i0, i1 = max(0, int((a - 0.15) * SR)), min(N, int((b + 0.15) * SR))
            env[i0:i1] = np.minimum(env[i0:i1], duck_g)
        env = np.convolve(env, np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same")
        bgm *= env
        sfx *= (1 + env) / 2

    def master(x):
        x = x[:, :int(dur * SR)].copy()
        n_in = int(0.4 * SR)
        x[:, :n_in] *= np.linspace(0, 1, n_in)
        a, b = ending
        i0, i1 = int(a * SR), min(int(b * SR), x.shape[1])
        if i1 > i0:
            x[:, i0:i1] *= np.linspace(1, 0, i1 - i0) ** 1.4
        if i1 < x.shape[1]:
            x[:, i1:] = 0
        return x

    mix = master(bgm * 0.95 + sfx + voice)
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix = mix / np.max(np.abs(mix)) * (10 ** (-1.0 / 20))

    def write_wav(path, data):
        import wave
        with wave.open(str(path), "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(data.T, -1, 1) * 32767).astype(np.int16).tobytes())

    (proj / "audio").mkdir(exist_ok=True)
    write_wav(proj / "audio" / "bgm.wav", master(bgm * 0.95))
    write_wav(proj / "audio" / "sfx.wav", master(sfx))
    write_wav(proj / "audio" / "voice.wav", master(voice))
    write_wav(proj / "audio" / "mix.wav", mix)
    print(f"✓ audio/mix.wav  {dur:.1f}s  bars={bars}@{bpm}BPM  speech={len(speech)}段 duck={duck_db}dB")
    print(f"  rms={np.sqrt((mix**2).mean()):.3f} peak={np.abs(mix).max():.3f}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["build"])
    ap.add_argument("--project", default=".")
    args = ap.parse_args()
    build(args.project)
