#!/usr/bin/env python3
"""sky-film-studio · check.py —— 自查
  sheet  --project <dir> [--n 4]   checks/key_*.jpg 拼大图（960×540/格）
  audio  --project <dir>           mix.wav 分段 RMS / 峰值 / 淡出校验
  edges  --project <dir> [--thr 32] [--every 15]  低阈值四边扫描（抓弱透明元素被裁）"""
import argparse, glob, json, subprocess, sys


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
    ap.add_argument("cmd", choices=["sheet", "audio", "edges"])
    ap.add_argument("--project", default=".")
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--thr", type=int, default=32)
    ap.add_argument("--every", type=int, default=15)
    args = ap.parse_args()
    if args.cmd == "edges":
        import glob as _g, os as _os
        import numpy as _np
        from PIL import Image as _Im
        _os.chdir(args.project)
        frames = sorted(_g.glob("frames/f*.jpg"))
        if not frames:
            raise SystemExit("先 render.py --full")
        # 拍首转场窗豁免：wipe 是合法全屏覆盖，不算贴边
        skip = []
        try:
            film = json.load(open("film.json"))
            if film.get("wipe"):
                beats = sorted(film.get("beats", []), key=lambda b: b["start"])
                skip = [(b["start"], b["start"] + 0.6) for b in beats[1:]]
        except Exception:
            pass
        fps = 30
        bad = 0
        for f in frames[::args.every]:
            t = (int(f.split("f")[-1].split(".")[0])) / fps
            if any(a <= t <= b for a, b in skip):
                continue
            a = _np.asarray(_Im.open(f).convert("L"), _np.float32)
            h, w = a.shape
            hits = [nm for nm, band in [("上", a[:26, :]), ("下", a[h-26:, :]), ("左", a[:, :26]), ("右", a[:, w-26:])]
                    if float((band > args.thr).mean()) > 0.02]
            if hits:
                bad += 1
                if bad <= 6:
                    print(f"⚠ {f} {'/'.join(hits)}")
        print(f"✓ 低阈值({args.thr})四边扫描 {len(frames[::args.every])} 帧全清" if bad == 0 else f"✗ {bad} 帧弱元素贴边")
        raise SystemExit(0 if bad == 0 else 1)
    (cmd_sheet if args.cmd == "sheet" else cmd_audio)(args)
