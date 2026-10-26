#!/usr/bin/env python3
# =====================================================================
# audio.py —— 100 BPM / 4/4 配乐合成 + 音效合成 + 混音
#   每小节 2.4s，25 小节 = 60.0s；段落强弱跟分镜；结尾淡出、不拦腰截断
#   输出: audio/bgm.wav  audio/sfx.wav  audio/mix.wav
# =====================================================================
import numpy as np, os

SR = 44100
DUR = 60.0
N = int(SR * DUR)
BPM = 100
BEAT = 60.0 / BPM          # 0.6s
BAR = BEAT * 4             # 2.4s

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "audio")
os.makedirs(OUT, exist_ok=True)

rng = np.random.default_rng(20260901)   # 全部随机有种子（音效纹理）

# ---------------- 基础 ----------------
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def fftfilt(x, gain_fn):
    """FFT 域滤波：gain_fn(freqs)->gain"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * gain_fn(f), n=len(x))

def lowpass(x, fc, order=2):
    return fftfilt(x, lambda f: 1.0 / (1 + (f / fc) ** (2 * order)))

def highpass(x, fc, order=2):
    return fftfilt(x, lambda f: (f / fc) ** (2 * order) / (1 + (f / fc) ** (2 * order)))

def bandpass(x, lo, hi):
    return fftfilt(x, lambda f: np.exp(-0.5 * ((np.log(np.clip(f, 1, SR/2)) - np.log(np.sqrt(lo*hi))) / (0.5*np.log(hi/lo))) ** 2))

def env_ar(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    na, nr = min(na, n), min(nr, n)
    if na > 0: e[:na] = np.linspace(0, 1, na)
    if nr > 0: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def place2(buf, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    m = min(len(x), N - i)
    gl = gain * (1.0 - max(pan, 0.0) * 0.6)
    gr = gain * (1.0 - max(-pan, 0.0) * 0.6)
    buf[0, i:i+m] += x[:m] * gl
    buf[1, i:i+m] += x[:m] * gr

# ---------------- 乐器 ----------------
def osc_mix(f, dur, partials=(1.0, 0.5, 0.25, 0.12)):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for k, a in enumerate(partials, start=1):
        out += a * np.sin(2 * np.pi * f * k * t)
    return out / max(1.0, sum(partials))

def v_pad(f, dur):
    """暖 pad：双失谐 + 低通 + 慢起音"""
    d = 0.004
    a = osc_mix(f * (1 - d), dur, (1.0, 0.55, 0.3, 0.14))
    b = osc_mix(f * (1 + d), dur, (1.0, 0.5, 0.28, 0.1))
    x = a + b
    x = lowpass(x, 1350)
    return x * env_ar(len(x), 0.55, 0.85)

def v_pluck(f, dur=0.42, bright=1.0):
    t = np.arange(int(dur * SR)) / SR
    x = (np.sin(2*np.pi*f*t) * np.exp(-t*7)
         + 0.55*np.sin(2*np.pi*2*f*t) * np.exp(-t*11) * bright
         + 0.3*np.sin(2*np.pi*3*f*t) * np.exp(-t*16) * bright)
    at = int(0.004 * SR)
    x[:at] *= np.linspace(0, 1, at)
    return x * 0.9

def v_bass(f, dur):
    t = np.arange(int(dur * SR)) / SR
    x = np.sin(2*np.pi*f*t) + 0.42*np.sin(2*np.pi*2*f*t) + 0.12*np.sin(2*np.pi*3*f*t)
    x = np.tanh(x * 1.6) / 1.6
    e = env_ar(len(x), 0.012, min(0.22, dur * 0.5))
    return x * e

def v_kick(amp=1.0):
    dur = 0.30
    t = np.arange(int(dur * SR)) / SR
    finst = 150 * np.exp(-t / 0.05) + 44
    ph = np.cumsum(finst) / SR
    x = np.sin(2 * np.pi * ph) * np.exp(-t * 16)
    click = highpass(rng.normal(0, 1, len(t)), 3000) * np.exp(-t * 400) * 0.5
    return (x + click) * amp

def v_snare(amp=1.0):
    dur = 0.24
    t = np.arange(int(dur * SR)) / SR
    n = bandpass(rng.normal(0, 1, len(t)), 1200, 6500) * np.exp(-t * 20)
    tone = np.sin(2*np.pi*196*t) * np.exp(-t * 30) * 0.5
    return (n + tone) * amp

def v_hat(open_=False, amp=1.0):
    dur = 0.16 if open_ else 0.05
    t = np.arange(int(dur * SR)) / SR
    x = highpass(rng.normal(0, 1, len(t)), 7500)
    return x * np.exp(-t * (26 if open_ else 120)) * amp

def v_tom(f0=210, amp=1.0):
    dur = 0.3
    t = np.arange(int(dur * SR)) / SR
    finst = f0 * np.exp(-t / 0.09) + f0 * 0.45
    ph = np.cumsum(finst) / SR
    return np.sin(2*np.pi*ph) * np.exp(-t*11) * amp

def v_shimmer(amp=1.0, dur=1.4):
    t = np.arange(int(dur*SR)) / SR
    x = highpass(rng.normal(0, 1, len(t)), 5000) * np.exp(-t*3.2)
    for f0 in (5232, 6598, 7840):
        x += np.sin(2*np.pi*f0*t) * np.exp(-t*2.6) * 0.12
    return x * amp * 0.8

def v_lead(f, dur):
    t = np.arange(int(dur * SR)) / SR
    vib = 1 + 0.004 * np.sin(2*np.pi*5.2*t) * np.minimum(1, t/0.25)
    ph = np.cumsum(f * vib) / SR
    x = (np.sin(2*np.pi*ph) + 0.35*np.sin(2*np.pi*2*ph) + 0.12*np.sin(2*np.pi*3*ph))
    e = env_ar(len(x), 0.06, min(0.5, dur*0.45))
    return x / 1.47 * e

# ---------------- SFX ----------------
def sfx_boom():
    dur = 1.7
    t = np.arange(int(dur*SR)) / SR
    finst = 62 * np.exp(-t/0.32) + 26
    ph = np.cumsum(finst) / SR
    x = np.sin(2*np.pi*ph) * np.exp(-t*1.9)
    rum = lowpass(rng.normal(0, 1, len(t)), 120) * np.exp(-t*2.2) * 0.5
    return (x + rum) * 0.95

def sfx_ping(f0):
    dur = 0.5
    t = np.arange(int(dur*SR)) / SR
    x = np.sin(2*np.pi*f0*t)*np.exp(-t*7) + 0.32*np.sin(2*np.pi*f0*2*t)*np.exp(-t*10)
    return x

def sfx_whoosh(dur=0.5, down=True, amp=1.0):
    n = rng.normal(0, 1, int(dur*SR))
    x = bandpass(n, 500, 3200)
    e = np.sin(np.linspace(0, np.pi, len(x))) ** 1.6
    return x * e * amp

def sfx_tick(f0=2100, amp=1.0):
    dur = 0.05
    t = np.arange(int(dur*SR)) / SR
    return (np.sin(2*np.pi*f0*t)*np.exp(-t*90) + highpass(rng.normal(0,1,len(t)),4000)*np.exp(-t*220)*0.5) * amp

def sfx_key():
    dur = 0.035
    t = np.arange(int(dur*SR)) / SR
    return (np.sin(2*np.pi*1750*t)*np.exp(-t*160) + highpass(rng.normal(0,1,len(t)),3000)*np.exp(-t*300)*0.7) * 0.8

def sfx_ding(f0=988):
    dur = 0.6
    t = np.arange(int(dur*SR)) / SR
    return (np.sin(2*np.pi*f0*t)*np.exp(-t*5) + 0.4*np.sin(2*np.pi*f0*1.5*t)*np.exp(-t*7)) * 0.9

def sfx_chime():
    out = np.zeros(int(1.2*SR))
    for i, f0 in enumerate([1046.5, 1318.5, 1568.0]):
        t0 = i * 0.085
        t = np.arange(int(0.9*SR))/SR
        x = (np.sin(2*np.pi*f0*t)*np.exp(-t*3.4) + 0.3*np.sin(2*np.pi*f0*2*t)*np.exp(-t*5))
        j = int(t0*SR); m = min(len(x), len(out)-j)
        out[j:j+m] += x[:m]
    return out * 0.9

def sfx_stamp():
    dur = 0.6
    t = np.arange(int(dur*SR)) / SR
    finst = 130 * np.exp(-t/0.06) + 46
    ph = np.cumsum(finst) / SR
    body = np.sin(2*np.pi*ph) * np.exp(-t*9)
    slap = bandpass(rng.normal(0,1,len(t)), 350, 1400) * np.exp(-t*46) * 1.1
    rum = lowpass(rng.normal(0,1,len(t)), 150) * np.exp(-t*7) * 0.55
    return (body + slap + rum) * 1.0

def sfx_thock(f0=250):
    dur = 0.16
    t = np.arange(int(dur*SR)) / SR
    return (np.sin(2*np.pi*f0*t)*np.exp(-t*30) + highpass(rng.normal(0,1,len(t)),2000)*np.exp(-t*180)*0.5)

def sfx_clock(hi=True):
    dur = 0.045
    t = np.arange(int(dur*SR)) / SR
    f0 = 3150 if hi else 2450
    return (np.sin(2*np.pi*f0*t)*np.exp(-t*110) + highpass(rng.normal(0,1,len(t)),5000)*np.exp(-t*260)*0.4) * 0.9

def sfx_strike():
    dur = 0.22
    t = np.arange(int(dur*SR)) / SR
    n = bandpass(rng.normal(0,1,len(t)), 350, 2600)
    e = np.exp(-t*18)
    th = sfx_thock(180)
    if len(th) < len(t):
        th = np.pad(th, (0, len(t) - len(th)))
    return (n*e + th[:len(t)]*0.7)

def sfx_pageturn():
    dur = 0.32
    t = np.arange(int(dur*SR)) / SR
    n = bandpass(rng.normal(0,1,len(t)), 900, 3400)
    flut = 0.5 + 0.5*np.sin(2*np.pi*26*t)
    return n * flut * np.exp(-t*7) * 0.8

def sfx_blip(f0=1760):
    dur = 0.06
    t = np.arange(int(dur*SR)) / SR
    return np.sin(2*np.pi*f0*t)*np.exp(-t*70)

def sfx_swell(dur=0.8):
    t = np.arange(int(dur*SR)) / SR
    n = lowpass(rng.normal(0,1,len(t)), 1800)
    e = (t/dur)**2.2
    return n * e * 0.8

# =====================================================================
# 编曲
# =====================================================================
bgm = np.zeros((2, N))
sfx = np.zeros((2, N))

def bt(bar, beat=0.0): return bar * BAR + beat * BEAT

CHORDS = {
    "Am":  [57, 60, 64, 69], "F": [53, 57, 60, 65],
    "C":   [52, 55, 60, 64], "G": [55, 59, 62, 67],
    "Dm":  [50, 57, 62, 65], "E7": [52, 56, 59, 64],
    "Am9": [57, 60, 64, 71],
}
BASSROOT = {"Am": 45, "F": 41, "C": 48, "G": 43, "Dm": 50, "E7": 52, "Am9": 45}

bar_chord = (["Am"] +                                   # bar 0 钩子
             ["Am", "F", "C", "G"] +                    # bars 1-4 S1
             ["Am", "F"] +                              # bars 5-6 S2
             ["C", "G", "Am"] +                         # bars 7-9 S3
             ["F", "G", "Am"] +                         # bars 10-12 S4
             ["Dm", "Dm", "E7"] +                       # bars 13-15 S5
             ["Am", "Dm", "E7"] +                       # bars 16-18 S6
             ["F", "G", "Am"] +                         # bars 19-21 S7
             ["F", "G", "Am9"])                         # bars 22-24 S8
assert len(bar_chord) == 25

# ---------- 0. 起步重击 ----------
place2(bgm, sfx_boom(), 0.0, 0.95)
place2(bgm, v_shimmer(0.55), 0.02)
place2(sfx, sfx_whoosh(0.6, amp=0.5), 1.55)             # 标题入场气声

# ---------- 1. Pad 与低音（每小节） ----------
pad_gain = [0.0, 0.62, 0.62, 0.62, 0.62, 0.66, 0.66, 0.70, 0.70, 0.72,
            0.74, 0.74, 0.74, 0.62, 0.62, 0.68, 0.80, 0.80, 0.80, 0.82,
            0.82, 0.84, 0.85, 0.82, 0.80]
for b in range(25):
    ch = bar_chord[b]
    g = pad_gain[b]
    if g <= 0: continue
    for vi, note in enumerate(CHORDS[ch]):
        x = v_pad(midi(note), BAR + 0.5)
        place2(bgm, x, bt(b), g * 0.34, pan=(-0.35 if vi % 2 == 0 else 0.35))

# 低音
for b in range(1, 22):
    root = BASSROOT[bar_chord[b]]
    if b <= 12:   beats = [0, 2]
    elif b <= 15: beats = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]   # S5 紧凑八分
    elif b <= 18: beats = [0, 1.5, 2, 3.5]                    # S6 沉重切分
    else:         beats = [0, 1, 2, 3]
    g = 0.5 if b <= 12 else 0.56
    for k, bd in enumerate(beats):
        dur = 0.5 if (b <= 15 and bd % 1 != 0) else 0.55
        place2(bgm, v_bass(midi(root), dur), bt(b, bd), g * (0.85 if k == 0 else 0.7))
# 尾声长低音
place2(bgm, v_bass(midi(45), 2.4), bt(22), 0.4)
place2(bgm, v_bass(midi(45), 4.2), bt(23), 0.36)

# ---------- 2. 鼓组 ----------
for b in range(1, 22):
    if b <= 6:    kick_b = [0, 2]
    elif b <= 12: kick_b = [0, 2] + ([3.5] if b >= 9 and b % 2 == 1 else [])
    elif b <= 15: kick_b = [0, 1, 2, 3]
    elif b <= 18: kick_b = [0, 2, 3.5]
    else:         kick_b = [0, 1, 2, 3]
    g = 0.5 if b <= 6 else 0.6 if b <= 12 else 0.5 if b <= 15 else 0.72 if b <= 18 else 0.66
    for bd in kick_b:
        place2(bgm, v_kick(), bt(b, bd), g)
    # 军鼓
    sn = None
    if 9 <= b <= 12: sn = [1, 3]
    elif 16 <= b <= 18: sn = [1, 3]
    elif 19 <= b <= 21: sn = [1, 3]
    if sn:
        g = 0.5 if b >= 16 else 0.4
        for bd in sn: place2(bgm, v_snare(), bt(b, bd), g)
    # 镲
    if b <= 6:
        for bd in range(8): place2(bgm, v_hat(False), bt(b, bd*0.5), 0.10 if bd % 2 else 0.16)
    elif b <= 12:
        for bd in range(8): place2(bgm, v_hat(False), bt(b, bd*0.5), 0.12 if bd % 2 else 0.2)
    elif b <= 15:
        for bd in range(4): place2(bgm, v_hat(True), bt(b, bd+0.5), 0.16)
    elif b <= 18:
        for bd in range(8): place2(bgm, v_hat(False), bt(b, bd*0.5), 0.14 if bd % 2 else 0.22)
    else:
        for bd in range(8):
            place2(bgm, v_hat(bd % 2 == 1), bt(b, bd*0.5), (0.2 if bd % 2 else 0.13))
# 通鼓填充
for (b, pattern) in [(12, [3, 3.5, 3.75]), (15, [3, 3.25, 3.5, 3.75]), (18, [2.5, 3, 3.5])]:
    for i, bd in enumerate(pattern):
        place2(bgm, v_tom(210 - i*36), bt(b, bd), 0.5)
# 段落起始闪镲
for b, g in [(7, 0.3), (16, 0.42), (19, 0.4), (22, 0.5)]:
    place2(bgm, v_shimmer(g), bt(b))
# 38.4 与 40.8 的强调重击（备案段）
place2(bgm, v_kick(1.3), bt(16, 0)); place2(bgm, v_kick(1.25), bt(17, 0)); place2(bgm, v_kick(1.3), bt(18, 0))

# ---------- 3. 琶音（弹拨） ----------
for b in range(2, 22):
    ch = CHORDS[bar_chord[b]]
    pat = [0, 1, 2, 3, 2, 1]
    if 13 <= b <= 15: continue                      # S5 去琶音换紧凑
    if 16 <= b <= 18:                                # S6 稀疏
        for bd, pi in [(0, 0), (1.5, 2), (3, 1)]:
            place2(bgm, v_pluck(midi(ch[pi % len(ch)] + 12), 0.5, 0.8), bt(b, bd), 0.16)
        continue
    dens = 8 if b <= 12 else 16
    amp = 0.13 if b <= 6 else 0.16 if b <= 12 else 0.19
    for k in range(dens):
        pi = pat[k % len(pat)]
        note = ch[pi % len(ch)] + (12 if pi >= 2 else 0)
        place2(bgm, v_pluck(midi(note), 0.4, 1.0), bt(b, k * 4 / dens), amp * (1.0 if k % 4 == 0 else 0.72))

# ---------- 4. S5 紧凑段：顿音和弦 ----------
for b in range(13, 16):
    ch = CHORDS[bar_chord[b]]
    for bd in [0, 1, 2, 3]:
        for ni, note in enumerate(ch[:3]):
            place2(bgm, v_pluck(midi(note), 0.22, 0.55), bt(b, bd), 0.10 + ni*0.01)

# ---------- 5. 尾声主旋律（bars 22-24） ----------
lead_line = [
    (22, 0.0, 69, 1.4), (22, 1.5, 72, 0.7), (22, 2.0, 74, 1.6),
    (23, 0.0, 76, 1.8), (23, 2.0, 74, 0.8), (23, 2.5, 72, 1.2),
    (24, 0.0, 71, 1.0), (24, 1.0, 69, 3.2),
]
for b, bd, note, dur in lead_line:
    place2(bgm, v_lead(midi(note), dur * BEAT), bt(b, bd), 0.30)
place2(bgm, v_shimmer(0.35), bt(24, 0))

# ---------- 6. 上行 riser（接 50.4 与 接 36.0） ----------
def riser(dur, amp):
    t = np.arange(int(dur*SR))/SR
    n = highpass(rng.normal(0,1,len(t)), 800) * (t/dur)**2
    gl = np.sin(2*np.pi*(220*2**((t/dur)*2))*t) * (t/dur)**1.5 * 0.3
    return (n + gl) * amp
place2(bgm, riser(1.2, 0.30), 34.8)
place2(bgm, riser(1.6, 0.34), 48.8)
place2(bgm, riser(0.9, 0.22), 1.5)

# =====================================================================
# 音效（与画面动效逐帧对齐；时间来自分镜/代码内动画节点）
# =====================================================================
EV = [
    # S0
    (0.85, "ping", 1318.5, 0.20), (1.35, "ping", 1046.5, 0.22),
    # S1（2.4–9.6）
    (2.45, "pageturn", None, 0.30),
    (3.6, "tick", 1900, 0.16), (4.2, "tick", 1900, 0.16), (4.8, "tick", 1900, 0.16), (5.4, "tick", 2300, 0.18),
    (5.4, "thock", 300, 0.22), (5.62, "thock", 300, 0.18), (5.84, "thock", 300, 0.18),
    (6.0, "tick", 2600, 0.2), (6.7, "tick", 2600, 0.2), (7.4, "tick", 2600, 0.22),
    (8.0, "blip", 1568, 0.14),
    # S2（9.6–14.4）
    (10.1, "tick", 2100, 0.2), (10.6, "tick", 2100, 0.2), (11.1, "tick", 2100, 0.2),
    (11.6, "whoosh", None, 0.16),
    (12.75, "thock", 340, 0.3),
    (13.05, "tick", 1750, 0.18), (13.45, "tick", 1750, 0.18),
    # S3（14.4–21.6）
    (14.5, "whoosh", None, 0.2),
    (16.2, "ding", 880, 0.14), (17.6, "ding", 988, 0.15),
    (18.75, "tick", 2400, 0.24),
    # S4（21.6–28.8）
    (21.85, "ding", 660, 0.16),
    (23.5, "ding", 880, 0.16),
] + [(tt, "key", None, 0.14) for tt in
     [21.95, 22.03, 22.09, 22.25, 22.33, 22.6, 22.68, 22.74, 22.95, 23.03,
      23.3, 23.38, 23.6, 23.68, 23.74, 23.9, 24.2, 24.28, 24.5, 24.58]] + [
    (26.0, "blip", 1760, 0.13), (26.7, "blip", 1976, 0.13), (27.4, "blip", 1760, 0.13),
    (27.9, "blip", 2093, 0.12),
    # S5（28.8–36）
    (28.85, "blip", 1318, 0.18),
    (29.7, "tick", 2300, 0.13), (30.35, "tick", 2300, 0.13), (31.0, "tick", 2300, 0.13),
    (31.65, "tick", 2300, 0.13), (32.3, "tick", 2300, 0.13), (32.95, "tick", 2300, 0.13),
    (32.7, "strike", None, 0.26), (33.6, "strike", None, 0.26), (34.5, "strike", None, 0.26),
    # S6（36–43.2）
    (36.05, "stamp", None, 0.85),
    (36.8, "thock", 260, 0.22), (37.6, "thock", 260, 0.2),
] + [(36.5 + k*0.6, "clock", None, 0.10) for k in range(11)] + [
    (38.5, "ping", 1568, 0.13), (39.28, "ping", 1568, 0.13), (40.06, "ping", 1568, 0.13),
    (40.84, "ping", 1568, 0.13), (41.62, "ping", 2093, 0.16),
    (39.3, "whoosh", None, 0.12),
    # S7（43.2–50.4）
    (43.25, "whoosh", None, 0.22),
] + [(43.85 + k*0.42, "tick", 1900 + k*90, 0.10) for k in range(6)] + [
    (46.2, "tick", 2600, 0.14),
    (46.5, "chime", None, 0.30),
    (47.1, "blip", 1175, 0.10),
    (47.95, "thock", 420, 0.30), (48.15, "swell", None, 0.22),
    (49.35, "whoosh", None, 0.18),
    # S8
    (51.95, "whoosh", None, 0.12), (53.6, "whoosh", None, 0.12),
    (57.4, "thock", 120, 0.22),
]

for t0, kind, p, g in EV:
    if kind == "ping":    x = sfx_ping(p)
    elif kind == "tick":  x = sfx_tick(p)
    elif kind == "key":   x = sfx_key()
    elif kind == "ding":  x = sfx_ding(p)
    elif kind == "chime": x = sfx_chime()
    elif kind == "stamp": x = sfx_stamp()
    elif kind == "thock": x = sfx_thock(p)
    elif kind == "clock": x = sfx_clock(int(t0/0.6) % 2 == 0)
    elif kind == "strike": x = sfx_strike()
    elif kind == "pageturn": x = sfx_pageturn()
    elif kind == "blip":  x = sfx_blip(p)
    elif kind == "whoosh": x = sfx_whoosh(0.42)
    elif kind == "swell": x = sfx_swell(0.8)
    else: raise ValueError(kind)
    place2(sfx, x, t0, g)

# =====================================================================
# 混音：淡入淡出、总线软限幅、峰值 -1dB
# =====================================================================
def master(buf, fade_in=0.4, fade_out=(56.8, 59.6)):
    x = buf.copy()
    n_in = int(fade_in * SR)
    x[:, :n_in] *= np.linspace(0, 1, n_in)
    a, b = fade_out
    i0, i1 = int(a*SR), int(b*SR)
    x[:, i0:i1] *= np.linspace(1, 0, i1-i0) ** 1.4
    x[:, i1:] = 0
    return x

mix = bgm * 0.95 + sfx * 1.0
mix = master(mix)
# 软限幅 + 归一化到 -1dB
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
peak = np.max(np.abs(mix))
mix = mix / peak * (10 ** (-1.0 / 20))

def write_wav(path, data):
    import wave
    d = np.clip(data.T, -1, 1)
    pcm = (d * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

write_wav(os.path.join(OUT, "bgm.wav"), master(bgm * 0.95))
write_wav(os.path.join(OUT, "sfx.wav"), master(sfx))
write_wav(os.path.join(OUT, "mix.wav"), mix)
print(f"audio OK  peak={peak:.3f}  rms={np.sqrt((mix**2).mean()):.3f}  -> {OUT}/mix.wav")
