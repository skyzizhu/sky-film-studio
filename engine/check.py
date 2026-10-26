#!/usr/bin/env python3
"""sky-film-studio · check.py —— 自查
  sheet  --project <dir> [--n 4]   checks/key_*.jpg 拼大图（960×540/格）
  audio  --project <dir>           mix.wav 分段 RMS / 峰值 / 淡出校验"""
import argparse, glob, subprocess, sys


def cmd_sheet(args):
    import os
    os.chdir(args.project)
    files = sorted(glob.glob("checks/key_*.jpg"))
    if not files:
        sys.exit("checks/ 没有 key_*.jpg；先 render.py --keys")
    n = args.n
    groups = [files[i:i + n] for i in range(0, len(files), n)]
    for gi, g in enumerate(groups):
        inputs = []
        for f in g:
            inputs += ["-i", f]
        flt = "".join(f"[{i}:v]scale=960:540[r{i}];" for i in range(len(g)))
        rows = [g[i:i + n] for i in range(0, len(g), n)]
        layout = []
        for r, row in enumerate(rows):
            for c in range(len(row)):
                layout.append(f"{c*960}_{r*540}")
        out = f"checks/sheet_{gi}.jpg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs,
                        "-filter_complex", flt + f"{len(g)}xstack=inputs={len(g)}:layout={'|'.join(layout)}",
                        "-frames:v", "1", out], check=True)
        print("→", out, f"({len(g)} 格)")


def cmd_audio(args):
    import os
    import wave
    import numpy as np
    os.chdir(args.project)
    w = wave.open("audio/mix.wav")
    d = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
    sr = w.getframerate()
    dur = d.shape[0] / sr
    peak = float(np.abs(d).max())
    ok = True
    for i in range(int(dur // 5) + 1):
        s = d[int(i * 5 * sr):int((i + 1) * 5 * sr)]
        if len(s):
            print(f"{int(i*5):>3}-{int(min((i+1)*5, dur)):<3}s rms={float(np.sqrt((s**2).mean())):.3f}")
    if peak > 0.892:
        print(f"✗ 峰值 {peak:.3f} 超 -1dB"); ok = False
    else:
        print(f"✓ 峰值 {peak:.3f} (≤ -1dB)")
    tail = d[-int(0.4 * sr):]
    if float(np.abs(tail).max()) > 0.01:
        print("✗ 结尾 0.4s 非静音（淡出未落底）"); ok = False
    else:
        print("✓ 结尾静音（完整淡出）")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["sheet", "audio"])
    ap.add_argument("--project", default=".")
    ap.add_argument("--n", type=int, default=4)
    args = ap.parse_args()
    (cmd_sheet if args.cmd == "sheet" else cmd_audio)(args)
