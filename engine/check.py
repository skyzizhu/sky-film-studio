#!/usr/bin/env python3
"""sky-film-studio · check.py —— 自查
  sheet  --project <dir> [--n 4]   checks/key_*.jpg 拼大图（960×540/格）
  audio  --project <dir>           mix.wav 分段 RMS / 峰值 / 淡出校验
  edges  --project <dir> [--thr 32] [--every 15]  低阈值四边扫描（抓弱透明元素被裁）
  auto   --project <dir> [--keys "auto"]          一键自检回路：静帧+拼图+edges+audio+报告（修复后重跑）
  storyboard --project <dir>                      教学逻辑 lint：钩子/落点/拍场景/数字来源/cues 落位"""
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



def cmd_auto(args):
    """一键自检回路（Borrowed from Manim agent 论文的 self-correction）：
    静帧(自动按拍采样) → 拼图 → 低阈值边缘扫描 → 音频校验 → 结构化报告。
    Agent 流程：auto → 看图+读报告 → 修复 → 再 auto，直到全绿再 --full。"""
    import json as _json, subprocess as _sp, sys as _sys
    import pathlib as _pl
    proj = _pl.Path(args.project).resolve()
    film = _json.loads((proj / "film.json").read_text(encoding="utf-8"))
    # 自动按拍采样关键帧（拍中点）+ 拍首（转场/入场检查）
    keys = args.keys
    if keys == "auto":
        ts = []
        for b in film.get("beats", []):
            ts.append(round(b["start"] + 0.12, 2))
            ts.append(round((b["start"] + b["end"]) / 2, 2))
        keys = ",".join(dict.fromkeys(str(t) for t in ts))
    print("── 0/5 全片渲染（字幕烧帧，一并生成）──")
    r = _sp.run([_sys.executable, str(_pl.Path(__file__).resolve().parent / "render.py"),
                 "--project", str(proj), "--full"])
    if r.returncode != 0:
        raise SystemExit("✗ 全片渲染失败")
    print(f"── 1/5 静帧采样（{keys}）──")
    r = _sp.run([_sys.executable, str(_pl.Path(__file__).resolve().parent / "render.py"),
                 "--project", str(proj), "--keys", keys])
    if r.returncode != 0:
        raise SystemExit("✗ 静帧渲染失败（先修 JS 错误）")
    print("── 2/5 拼图 ──")
    _sp.run([_sys.executable, __file__, "sheet", "--project", str(proj), "--n", "4"])
    print("── 3/5 低阈值边缘扫描 ──")
    r_edge = _sp.run([_sys.executable, __file__, "edges", "--project", str(proj)])
    print("── 4/5 音频校验 ──")
    r_audio = (proj / "audio" / "mix.wav").is_file() and \
        _sp.run([_sys.executable, __file__, "audio", "--project", str(proj)]).returncode == 0
    has_mix = (proj / "audio" / "mix.wav").is_file()
    print("── 5/5 storyboard lint ──")
    print("\n═══════ 自检报告 ═══════")
    print(f"  静帧采样: ✓ {keys}")
    print(f"  拼图:     → {proj}/checks/sheet_*.jpg（逐格看：遮挡/压盖/裁切/乱码/曝光）")
    print(f"  边缘扫描: {'✓ 全清' if r_edge.returncode == 0 else '✗ 有贴边（见上方帧号）'}")
    print(f"  音频:     {'✓' if (not has_mix or r_audio) else '✗ 峰值/淡出问题'}"
          + ("" if has_mix else "（尚未 build，跳过）"))
    lint = _sp.run([_sys.executable, __file__, "storyboard", "--project", str(proj)],
                   capture_output=True, text=True)
    print(lint.stdout)
    ok = r_edge.returncode == 0 and (not has_mix or r_audio) and lint.returncode == 0
    print("═══════ 结论:", "✅ 全绿，可以 render --full" if ok else "❌ 按上面修，修完重跑 auto", "═══════")
    raise SystemExit(0 if ok else 1)


def cmd_storyboard(args):
    """教学逻辑 lint（Borrowed from pedagogy-aware planning）：钩子/场景/落点/数字来源/cues 落位/时长边界。"""
    import json as _json, re as _re
    import pathlib as _pl
    proj = _pl.Path(args.project).resolve()
    film = _json.loads((proj / "film.json").read_text(encoding="utf-8"))
    sb = (proj / "storyboard.js").read_text(encoding="utf-8") if (proj / "storyboard.js").is_file() else ""
    data = (proj / "data.js").read_text(encoding="utf-8") if (proj / "data.js").is_file() else ""
    cues = _json.loads((proj / "audio" / "cues.json").read_text(encoding="utf-8")) \
        if (proj / "audio" / "cues.json").is_file() else None
    warns, errs = [], []
    dur, beats = film.get("duration", 0), film.get("beats", [])
    if not beats: errs.append("没有 beats")
    if not (30 <= dur <= 300): errs.append(f"时长 {dur:.0f}s 超出 30–300 边界")
    # 1) 钩子：无口播片 ≤3.2s；有口播片看垫层（句末+0.6 后还空 >1.5s 就是虚胖）
    if beats:
        hl = beats[0]["end"] - beats[0]["start"]
        if cues and cues.get("sentences") and beats[0].get("sentences"):
            s0end = cues["sentences"][beats[0]["sentences"][-1]]["end"]
            if beats[0]["end"] - s0end - 0.6 > 1.5:
                warns.append(f"钩子拍垫层过长：句末 {s0end:.1f}s 拍末 {beats[0]['end']:.1f}s（砍 1 小节）")
        elif hl > 3.2:
            warns.append(f"钩子拍 {hl:.1f}s > 3.2s（前三秒必须完成冲击）")
    # 2) 每拍 scene 在 storyboard 里存在
    defined = set(_re.findall(r"(s\w+)\s*\(", sb))
    for b in beats:
        if b["scene"] not in defined:
            errs.append(f"{b['id']} 的 scene '{b['scene']}' 未在 storyboard.js 定义")
    # 3) 每拍有落点（sfx 或 punch 至少其一）
    punches = set(p[0] + b["start"] for b in beats for p in [(x, 0) for x in [0]] ) # placeholder
    for b in beats:
        has_sfx = bool(b.get("sfx"))
        punched = any(abs(film.get("punches", [[-9]])[i][0] - b["start"]) < 0.3
                      for i in range(len(film.get("punches", []))))
        if not has_sfx and not punched and (b["end"] - b["start"]) > 3:
            warns.append(f"{b['id']} 无 sfx 也无 punch：这一拍没有'落点'（动在事件上）")
    # 4) 口播句全覆盖且已 place
    if cues and cues.get("sentences"):
        if not cues.get("placed"): errs.append("cues 未 place（voice.py place）——音画会漂移")
        covered = {si for b in beats for si in b.get("sentences", [])}
        miss = [i for i in range(len(cues["sentences"])) if i not in covered]
        if miss: errs.append(f"句子 {miss} 不在任何拍里")
    # 5) 数字来源（data.js 中数字行应带 来源/来源备注 或 tag）
    for ln in data.splitlines():
        if _re.search(r"roll\s*:\s*[\d.]+", ln) and "来源" not in ln and "tag" not in ln \
                and "核实" not in ln and "经验" not in ln:
            warns.append(f"data.js 可能缺来源标注: {ln.strip()[:60]}")
    # 6) ending_fade 合法
    ef = film.get("ending_fade")
    if not ef or ef[1] > dur or ef[0] < dur - 6:
        warns.append(f"ending_fade {ef} 异常（应在 dur-6 ~ dur 之间）")
    # 7) 拍长节奏
    for b in beats:
        L = b["end"] - b["start"]
        if L > 12: warns.append(f"{b['id']} 拍长 {L:.1f}s > 12s（>12s 无画面事件会被读成 PPT）")
    for w in errs: print("✗", w)
    for w in warns: print("⚠", w)
    if not errs and not warns:
        print("✓ storyboard lint 全过（钩子/落点/场景/来源/cues/边界）")
    raise SystemExit(1 if errs else 0)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["sheet", "audio", "edges", "auto", "storyboard"])
    ap.add_argument("--project", default=".")
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--thr", type=int, default=32)
    ap.add_argument("--every", type=int, default=15)
    ap.add_argument("--keys", default="auto")
    args = ap.parse_args()
    if args.cmd == "auto":
        cmd_auto(args)
    elif args.cmd == "storyboard":
        cmd_storyboard(args)
    elif args.cmd == "edges":
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
            if t < 1.6:
                continue                                   # 钩子炸开（有意全屏冲击）
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
