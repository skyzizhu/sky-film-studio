#!/usr/bin/env python3
"""sky-film-studio · voice.py —— 口播四路（火山平台音色 / 火山复刻 / macOS 系统声 / 导入录音）
  status                                  配置链/凭证存在性/音色解析（不显示凭证值）
  say --project <dir> [--mode volc|system] [--voice 名|speaker_id] [--gap 0.45] [--reuse]
      逐句合成 narration.txt → audio/sent_XXX.wav + audio/cues.json
  import --project <dir> --audio 录音 --text 文稿.txt
      能量 VAD 切句（给文稿按字数比例对齐）→ cues.json
  plan --project <dir> [--bpm 100] [--target 7.2] [--lead 0.35]
      cues → 小节线量化 beats 草案 + 口播自动贴到网格（重写 cues.json）
  place --project <dir> [--lead 0.35] [--gap 0.45]
      film.json 的 beats 手工编辑后重跑：口播重新贴网格，消除音画漂移"""
import argparse, base64, json, os, pathlib, subprocess, sys, uuid

HOST = "https://openspeech.bytedance.com"
RES_ICL = "seed-icl-2.0"
RES_BIG = "seed-tts-2.0"
CFG_PATHS = [
    pathlib.Path(os.environ.get("XDG_CONFIG_HOME", pathlib.Path.home() / ".config")) / "sky-film-studio" / "media.json",
    pathlib.Path(os.environ.get("XDG_CONFIG_HOME", pathlib.Path.home() / ".config")) / "huashu" / "media.json",
]
REGISTRY = pathlib.Path.home() / ".koubo" / "voices.json"


def load_config(explicit=None):
    for p in ([pathlib.Path(explicit).expanduser()] if explicit else []) + CFG_PATHS:
        if p.is_file():
            return json.loads(p.read_text(encoding="utf-8")), str(p)
    return None, None


def credentials(config):
    if not config:
        return None, None
    b = config.get("bindings", {}).get("volcengine", {})
    names = (b.get("appid_env", "VOLC_SPEECH_APPID"), b.get("token_env", "VOLC_SPEECH_TOKEN"))
    vals = {n: os.environ.get(n) for n in names}
    env_path = os.environ.get("KOUBO_ENV") or b.get("env_file")
    if env_path and not all(vals.values()):
        p = pathlib.Path(env_path).expanduser()
        if p.is_file():
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("export "):
                    line = line[7:]
                k, sep, v = line.partition("=")
                if sep and k.strip() in names and not vals.get(k.strip()):
                    vals[k.strip()] = v.strip().strip("\"'")
    return tuple(vals.get(n) for n in names)


def resolve_speaker(config, explicit=None):
    if not config:
        return (explicit, "字面值（无配置）") if explicit else (None, "未配置")
    ref = explicit or config.get("preferences", {}).get("voice", {}).get("voice_ref")
    if not ref:
        return None, "配置里没有 voice_ref"
    v = config.get("bindings", {}).get("voices", {}).get(ref)
    if v and v.get("speaker_id"):
        return v["speaker_id"], f"bindings.voices[{ref}]"
    entry = (v or {}).get("entry", ref)
    if REGISTRY.is_file():
        reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
        found = reg.get("voices", {}).get(entry)
        if found and found.get("speaker_id"):
            return found["speaker_id"], f"注册表 ~/.koubo/voices.json[{entry}]"
    if isinstance(entry, str) and (entry.startswith("S_") or entry.startswith("zh_")):
        return entry, "字面 speaker_id"
    return None, f"音色 {ref} 解析不到 speaker_id（bindings/注册表都没有）"


def cloud_allowed(config):
    pol = (config or {}).get("policy", {})
    return pol.get("cloud") == "allow" and pol.get("paid_api") == "allow"


def volc_synthesize(text, speaker, out, speech_rate=0):
    import requests
    config, _ = load_config()
    appid, token = credentials(config)
    if not appid or not token:
        raise SystemExit("✗ 缺火山凭证：设 VOLC_SPEECH_APPID/VOLC_SPEECH_TOKEN 或配置 env_file")
    req = {"text": text, "speaker": speaker,
           "audio_params": {"format": "wav", "sample_rate": 48000},
           "model": "seed-tts-2.0-expressive", "tone_fidelity": True}
    if speech_rate:
        req["audio_params"]["speech_rate"] = int(speech_rate)
    resource = RES_ICL if str(speaker).startswith("S_") else RES_BIG
    headers = {"X-Api-App-Id": appid, "X-Api-Access-Key": token,
               "X-Api-Resource-Id": resource, "X-Api-Request-Id": str(uuid.uuid4()),
               "Content-Type": "application/json"}
    try:
        r = requests.post(HOST + "/api/v3/tts/unidirectional", headers=headers, timeout=300,
                          stream=True, json={"user": {"uid": "sky-film"}, "req_params": req})
    except requests.exceptions.RequestException:
        raise SystemExit("outcome_unknown：网络请求未确认完成（可能已计费）；核对后再决定是否重试")
    if r.status_code != 200:
        raise SystemExit(f"✗ HTTP {r.status_code} {r.text[:300]}")
    chunks, errs, complete = [], [], False
    for line in r.iter_lines():
        if not line:
            continue
        s = line.decode("utf-8", "ignore")
        if s.startswith("data:"):
            s = s[5:].strip()
        try:
            obj = json.loads(s)
        except ValueError:
            continue
        if obj.get("code") == 20000000:
            complete = True
        if obj.get("data"):
            chunks.append(base64.b64decode(obj["data"]))
        if obj.get("code") not in (None, 0, 20000000):
            errs.append(obj)
    if errs or not chunks or not complete:
        raise SystemExit(f"✗ 合成失败/不完整 errs={str(errs)[:200]}")
    pathlib.Path(out).write_bytes(b"".join(chunks))


def pick_system_voice():
    out = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
    zh = [l.split()[0] for l in out.splitlines() if "zh_" in l or "zh-" in l]
    for prefer in ("Tingting", "Meijia", "Sinji"):
        if prefer in zh:
            return prefer
    return zh[0] if zh else None


def system_say(text, out):
    v = pick_system_voice()
    if not v:
        raise SystemExit("✗ macOS 无中文系统音色；改 --mode volc 或导入录音")
    subprocess.run(["say", "-v", v, "-o", str(out), "--data-format=LEI16@44100", text], check=True)


def ffprobe_duration(p):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout.strip()
    return float(out) if out else 0.0


def parse_narration(path):
    sents = []
    for ln in pathlib.Path(path).read_text(encoding="utf-8").splitlines():
        ln = ln.strip()
        if not ln or ln.startswith("#"):
            continue
        role = "narrator"
        if ln.startswith("[") and "]" in ln:
            role, ln = ln[1:].split("]", 1)
            ln = ln.strip()
        if ln:
            sents.append({"text": ln, "role": role})
    return sents




def trim_silence(path, thr=0.008, keep=0.05):
    """裁掉 TTS 首尾静音，让 cue 起点=真实开口点（幂等）。
    火山 TTS 每句自带 0.1~0.3s 前置静音，不裁则句级 lead 有 ±0.2s 抖动。"""
    import numpy as np, subprocess, tempfile, pathlib as _pl
    path = _pl.Path(path)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000",
                          "-f", "s16le", "-"], capture_output=True).stdout
    if not raw:
        return ffprobe_duration(path)
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    sr = 16000
    win = int(sr * 0.02)
    if len(x) < win * 3:
        return ffprobe_duration(path)
    rms = np.sqrt((x[:len(x) // win * win].reshape(-1, win) ** 2).mean(axis=1))
    dur = len(x) / sr
    i0 = next((i for i, r in enumerate(rms) if r > thr), None)
    i1 = next((i for i in range(len(rms) - 1, -1, -1) if rms[i] > thr), None)
    if i0 is None or i1 is None or (i1 - i0 + 1) * 0.02 < 0.3:
        return dur   # 整段近静音或太短：不动
    a = max(0.0, i0 * 0.02 - keep)
    b = min(dur, (i1 + 1) * 0.02 + keep)
    if a < 0.02 and b > dur - 0.02:
        return dur   # 已经干净：不动（幂等）
    tmp = _pl.Path(tempfile.mkstemp(suffix=".wav")[1])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-ss", f"{a:.3f}",
                    "-to", f"{b:.3f}", "-c:a", "pcm_s16le", str(tmp)], check=True)
    tmp.replace(path)
    return ffprobe_duration(path)


def cmd_say(args):
    proj = pathlib.Path(args.project).resolve()
    nar = proj / "narration.txt"
    if not nar.is_file():
        raise SystemExit(f"✗ 缺 {nar}")
    sents = parse_narration(nar)
    if not sents:
        raise SystemExit("✗ narration.txt 没有有效句子")
    (proj / "audio").mkdir(exist_ok=True)
    config, cfg_path = load_config(args.config)
    mode = args.mode
    if mode is None:
        pref = (config or {}).get("preferences", {}).get("voice", {}).get("mode")
        mode = "volc" if pref in ("clone", "volc") else (pref or "volc")
    speaker = None
    if mode == "volc":
        if not cloud_allowed(config):
            raise SystemExit("✗ policy 未允许云调用（cloud/paid_api ≠ allow）；改 --mode system 或改配置")
        speaker, src = resolve_speaker(config, args.voice)
        if not speaker:
            raise SystemExit(f"✗ {src}。用 --voice 传 speaker_id 或先登记")
        print(f"音色：{speaker}（{src}）· 通道：{'seed-icl-2.0' if speaker.startswith('S_') else 'seed-tts-2.0'}")
    else:
        print(f"系统音色：{pick_system_voice()}")
    cues = {"sample_rate": 48000, "gap": args.gap, "total": 0.0, "sentences": []}
    t_cur = 0.0
    for i, s in enumerate(sents):
        out = proj / "audio" / f"sent_{i:03d}.wav"
        if not (out.exists() and args.reuse):
            if mode == "volc":
                volc_synthesize(s["text"], speaker, out, speech_rate=args.speech_rate)
            else:
                system_say(s["text"], out)
        dur = trim_silence(out)
        cues["sentences"].append({"idx": i, "text": s["text"], "role": s["role"],
                                  "file": f"audio/sent_{i:03d}.wav",
                                  "start": round(t_cur, 3), "end": round(t_cur + dur, 3)})
        t_cur += dur + args.gap
        print(f"  [{i:02d}] {dur:5.2f}s  {s['text'][:24]}")
    cues["total"] = round(t_cur - args.gap, 3)
    (proj / "audio" / "cues.json").write_text(json.dumps(cues, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {len(sents)} 句  总口播 {cues['total']}s → audio/cues.json")
    print(f"  下一步：voice.py plan --project {args.project}")


def cmd_import(args):
    import numpy as np
    proj = pathlib.Path(args.project).resolve()
    src = pathlib.Path(args.audio).expanduser().resolve()
    if not src.is_file():
        raise SystemExit(f"✗ 找不到 {src}")
    (proj / "audio").mkdir(exist_ok=True)
    dst = proj / "audio" / "narration_import.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                    "-ac", "1", "-ar", "44100", str(dst)], check=True)
    dur = ffprobe_duration(dst)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(dst), "-f", "s16le", "-"],
                         capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    sr = 44100
    fr = int(sr * 0.03)
    n = len(x) // fr
    e = np.sqrt((x[:n * fr].reshape(n, fr) ** 2).mean(axis=1))
    e_s = np.convolve(e, np.ones(8) / 8, mode="same")
    thr = max(float(e_s.max()) * 0.06, 0.004)
    act = e_s > thr
    segs, s0 = [], None
    for i, a in enumerate(act):
        if a and s0 is None:
            s0 = i
        elif not a and s0 is not None:
            segs.append([s0 * 0.03, i * 0.03]); s0 = None
    if s0 is not None:
        segs.append([s0 * 0.03, n * 0.03])
    merged = []
    for sg in segs:
        if merged and sg[0] - merged[-1][1] < 0.35:
            merged[-1][1] = sg[1]
        else:
            merged.append(sg)
    merged = [m for m in merged if m[1] - m[0] >= 0.5] or [[0, dur]]
    texts = None
    if args.text:
        sents = parse_narration(args.text)
        if len(sents) == len(merged):
            texts = [s["text"] for s in sents]
        else:
            texts = ([s["text"] for s in sents] + [""] * len(merged))[:len(merged)]
            print(f"⚠ 文稿 {len(sents)} 句 vs 检测 {len(merged)} 段，文本按序截取对齐（建议校对 cues）")
    cues = {"sample_rate": sr, "total": round(dur, 3), "audio": "audio/narration_import.wav",
            "sentences": [{"idx": i, "text": (texts[i] if texts else ""),
                           "file": "audio/narration_import.wav",
                           "start": round(a, 3), "end": round(min(b, dur), 3)}
                          for i, (a, b) in enumerate(merged)]}
    (proj / "audio" / "cues.json").write_text(json.dumps(cues, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {len(merged)} 句段  总长 {dur:.2f}s → audio/cues.json")


def cmd_plan(args):
    proj = pathlib.Path(args.project).resolve()
    cues = json.loads((proj / "audio" / "cues.json").read_text(encoding="utf-8"))
    bar = 4 * 60 / args.bpm
    sents = cues["sentences"]
    gap = cues.get("gap", 0.45)
    groups, cur = [], []
    for s in sents:
        cur.append(s)
        if s["end"] - cur[0]["start"] >= args.target - bar * 0.5:
            groups.append(cur); cur = []
    if cur:
        if groups and cur[-1]["end"] - groups[-1][0]["start"] < args.target:
            groups[-1] += cur
        else:
            groups.append(cur)
    beats, t, total_bars = [], 0.0, 0
    for gi, g in enumerate(groups):
        gdur = g[-1]["end"] - g[0]["start"] + gap
        bars = int(gdur // bar) + (1 if (gdur % bar) > 0.01 else 0)
        bars = max(args.hook_bars if gi == 0 else 2, bars)
        beats.append({"id": f"b{gi}", "scene": f"s{gi}", "bars": bars,
                      "start": round(t, 3), "end": round(t + bars * bar, 3),
                      "sentences": [s["idx"] for s in g],
                      "energy": 0.9 if gi == 0 else 0.55,
                      "sfx": [[0.0, "whoosh", 0.15]] if gi == 0 else [],
                      "note": g[0]["text"][:18] + "…"})
        t += bars * bar
        total_bars += bars
    draft = {"bpm": args.bpm, "bar": round(bar, 3), "bars": total_bars,
             "duration": round(t, 3), "beats": beats}
    (proj / "film_beats_draft.json").write_text(json.dumps(draft, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(draft, ensure_ascii=False, indent=1)[:2200])
    print(f"→ film_beats_draft.json：{len(beats)} 拍 / {total_bars} 小节 / {t:.1f}s（并进 film.json 后补 sfx/ending_fade）")
    # 自动把口播贴到网格（若 film.json 已存在则以它为准，改完 beats 后再跑 place）
    draft_film = {"beats": beats}
    (proj / "_draft_film.json").write_text(json.dumps(draft_film, ensure_ascii=False), encoding="utf-8")
    if (proj / "film.json").is_file():
        _place_on_grid(proj, lead=args.lead)
        print("✓ cues.json 已按拍网格重写（plan 自动落位）")
    else:
        import shutil as _sh
        _sh.copy(proj / "_draft_film.json", proj / "film.json")
        _place_on_grid(proj, lead=args.lead)
        print("✓ 已生成 film.json 草稿并落位（补 title/theme/sfx 后再跑一次 place）")
    (proj / "_draft_film.json").unlink(missing_ok=True)




def _place_on_grid(proj, lead=0.35, gap=0.45, quiet=False):
    """把每句口播重新落位到 film.json 的拍网格上（拍起点+lead）。
    小节网格是唯一主时钟：音频、字幕、duck 全读重写后的 cues，漂移归零。"""
    film = json.loads((proj / "film.json").read_text(encoding="utf-8"))
    cues = json.loads((proj / "audio" / "cues.json").read_text(encoding="utf-8"))
    sents = cues["sentences"]
    covered = set()
    for b in film["beats"]:
        t = b["start"] + lead
        for si in b.get("sentences", []):
            if si >= len(sents):
                continue
            s = sents[si]
            dur = s["end"] - s["start"]
            s["start"] = round(t, 3)
            s["end"] = round(t + dur, 3)
            t += dur + gap
            covered.add(si)
        if t - gap > b["end"] + 0.05 and not quiet:
            print(f"⚠ {b['id']}: 句子组 {t - gap - b['start']:.2f}s 超出拍长 {b['end'] - b['start']:.2f}s（加小节或减句）")
    miss = [i for i in range(len(sents)) if i not in covered]
    if miss and not quiet:
        print(f"⚠ 句子 {miss} 不在任何拍里，保留自然位置")
    cues["total"] = max((s["end"] for s in sents), default=0.0)
    cues["placed"] = True
    cues["lead"] = lead
    (proj / "audio" / "cues.json").write_text(json.dumps(cues, ensure_ascii=False, indent=1), encoding="utf-8")
    return cues


def cmd_place(args):
    proj = pathlib.Path(args.project).resolve()
    before = json.loads((proj / "audio" / "cues.json").read_text(encoding="utf-8"))
    film = json.loads((proj / "film.json").read_text(encoding="utf-8"))
    print(f"{'拍':<5}{'原起点':>8}{'新起点':>8}{'拍起点':>8}{'句末-拍末':>10}")
    _place_on_grid(proj, lead=args.lead, gap=args.gap)
    after = json.loads((proj / "audio" / "cues.json").read_text(encoding="utf-8"))
    for b in film["beats"]:
        for si in b.get("sentences", []):
            if si >= len(after["sentences"]):
                continue
            s0 = before["sentences"][si]; s1 = after["sentences"][si]
            print(f"{b['id']:<5}{s0['start']:>8.2f}{s1['start']:>8.2f}{b['start']:>8.2f}{s1['end'] - b['end']:>9.2f}s")
    print(f"✓ 口播已贴到小节网格（lead={args.lead}s）→ audio/cues.json 已重写")
    print("  下一步（顺序不能换）：audio.py build 重混音 → render.py --full 重渲全片（字幕烧在帧里，必须重渲）→ ffmpeg 合成")


def cmd_status(args):
    config, cfg_path = load_config(args.config)
    print("配置链：", cfg_path or "（无）")
    if config:
        pref = config.get("preferences", {}).get("voice", {})
        print(f"偏好：mode={pref.get('mode')} voice_ref={pref.get('voice_ref')}  policy={config.get('policy')}")
        speaker, src = resolve_speaker(config, args.voice)
        print(f"音色解析：{speaker} ← {src}")
        appid, token = credentials(config)
        print(f"凭证：appid={'✓' if appid else '✗'} token={'✓' if token else '✗'}（只验存在性）")
        print(f"云调用：{'允许' if cloud_allowed(config) else '未允许（用 --mode system 或改 policy）'}")
    else:
        print("未找到配置；火山需 --voice speaker_id 且环境变量有凭证")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("say", "import", "plan", "place", "status"):
        s = sub.add_parser(name)
        s.add_argument("--project", default=".")
        s.add_argument("--config")
        if name == "say":
            s.add_argument("--mode", choices=["volc", "system"])
            s.add_argument("--voice")
            s.add_argument("--gap", type=float, default=0.45)
            s.add_argument("--speech-rate", dest="speech_rate", type=int, default=0)
            s.add_argument("--reuse", action="store_true")
        if name == "import":
            s.add_argument("--audio", required=True)
            s.add_argument("--text")
        if name in ("plan", "place"):
            s.add_argument("--lead", type=float, default=0.35, help="句音频相对拍起点的落位提前量")
            s.add_argument("--gap", type=float, default=0.45)
        if name == "plan":
            s.add_argument("--bpm", type=float, default=100)
            s.add_argument("--target", type=float, default=7.2)
            s.add_argument("--hook-bars", dest="hook_bars", type=int, default=1)
        if name == "status":
            s.add_argument("--voice")
    args = ap.parse_args()
    {"say": cmd_say, "import": cmd_import, "plan": cmd_plan, "place": cmd_place, "status": cmd_status}[args.cmd](args)
