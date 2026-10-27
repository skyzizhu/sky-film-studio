#!/usr/bin/env python3
"""Narration: say (content-addressed cache), import (source-locked recording),
plan (draft only; --apply reviewed plan), place (validated independent TTS only).
VAD produces candidate intervals, not transcription or forced alignment."""
import argparse, base64, json, os, pathlib, subprocess, sys, uuid
import copy, hashlib, math, shutil, wave
from project import cues_path, write_json, timeline_errors, file_hash

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
    config = config or {}
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


def volc_synthesize(text, speaker, out, speech_rate=0, config=None):
    import requests
    if config is None:
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
    try:
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
    except requests.exceptions.RequestException:
        raise SystemExit("outcome_unknown：SSE 流中断，可能已计费；核对后决定是否重试")
    finally:
        r.close()
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


def system_say(text, out, voice=None):
    v = voice or pick_system_voice()
    if not v:
        raise SystemExit("✗ macOS 无中文系统音色；改 --mode volc 或导入录音")
    subprocess.run(["say", "-v", v, "-o", str(out), "--data-format=LEI16@44100", text], check=True)


def ffprobe_duration(p):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout.strip()
    if not out:
        raise ValueError(f"无法读取音频时长: {p}")
    duration = float(out)
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError(f"音频时长非法: {p}")
    return duration


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
    fd, name = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    tmp = _pl.Path(name)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-ss", f"{a:.3f}",
                    "-to", f"{b:.3f}", "-c:a", "pcm_s16le", str(tmp)], check=True)
    tmp.replace(path)
    return ffprobe_duration(path)


def register_cues(project, timing):
    path = project / "film.json"
    if path.is_file():
        film = json.loads(path.read_text(encoding="utf-8"))
        voice_config = film.setdefault("voice", {})
        voice_config.setdefault("cues", "audio/cues.json")
        voice_config["timing"] = timing
        write_json(path, film)


def cmd_say(args):
    proj = pathlib.Path(args.project).resolve()
    nar = proj / "narration.txt"
    if not nar.is_file():
        raise SystemExit(f"缺 {nar}")
    sents = parse_narration(nar)
    if not sents or args.gap < 0:
        raise SystemExit("需要有效文稿和非负 gap")
    (proj / "audio").mkdir(exist_ok=True)
    config, _ = load_config(args.config)
    pref = (config or {}).get("preferences", {}).get("voice", {}).get("mode")
    mode = args.mode or ("volc" if pref in ("clone", "volc") else (pref or "volc"))
    if mode not in ("volc", "system"):
        raise SystemExit("语音模式须为 volc 或 system；无口播请走 C 模式")
    if mode == "volc":
        if not cloud_allowed(config):
            raise SystemExit("policy 未允许云调用；用 --mode system 或按已有授权配置")
        speaker, src = resolve_speaker(config, args.voice)
        if not speaker:
            raise SystemExit(src)
    else:
        speaker = args.voice or pick_system_voice()
        if args.speech_rate:
            raise SystemExit("系统声暂不支持 --speech-rate；请省略该参数")
        if not speaker:
            raise SystemExit("无可用系统音色")
    print(f"音色：{speaker} · {mode}")
    cache = proj / ".cache" / "voice"
    cache.mkdir(parents=True, exist_ok=True)
    manifest_path = cache / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text())
    except (OSError, ValueError):
        manifest = {}
    cues = {"sample_rate": 48000, "timing": "tts", "gap": args.gap,
            "placed": False, "sentences": []}
    t_cur = 0.0
    for i, sentence in enumerate(sents):
        parameters = {"text": sentence["text"], "role": sentence["role"], "mode": mode,
                      "voice": speaker, "speech_rate": args.speech_rate,
                      "model": "seed-tts-2.0-expressive" if mode == "volc" else "macOS-say",
                      "sample_rate": 48000 if mode == "volc" else 44100,
                      "trim_version": 1}
        key = hashlib.sha256(json.dumps(parameters, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        cached = cache / f"{key}.wav"
        hit = False
        if args.reuse and cached.is_file() and key in manifest:
            try:
                with wave.open(str(cached)) as wav:
                    valid = wav.getnframes() > 0 and wav.getcomptype() == "NONE"
                hit = valid and file_hash(cached) == manifest[key]["sha256"] and ffprobe_duration(cached) > 0
            except (OSError, ValueError, KeyError, wave.Error, EOFError):
                pass
        if not hit:
            temporary = cache / f"{key}.pending.wav"
            if mode == "volc":
                volc_synthesize(sentence["text"], speaker, temporary,
                                speech_rate=args.speech_rate, config=config)
            else:
                system_say(sentence["text"], temporary, voice=speaker)
            trim_silence(temporary)
            temporary.replace(cached)
            manifest[key] = {"parameters": parameters, "sha256": file_hash(cached)}
            write_json(manifest_path, manifest)
        duration = ffprobe_duration(cached)
        out = proj / "audio" / f"sent_{i:03d}.wav"
        shutil.copyfile(cached, out)
        cues["sentences"].append({"idx": i, "text": sentence["text"], "role": sentence["role"],
                                  "file": f"audio/{out.name}", "cache_key": key,
                                  "start": round(t_cur, 3), "end": round(t_cur + duration, 3)})
        t_cur += duration + args.gap
        print(f"[{i:02d}] {duration:.2f}s {'缓存' if hit else '合成'} {sentence['text'][:24]}")
    cues["total"] = round(t_cur - args.gap, 3)
    write_json(cues_path(proj), cues)
    register_cues(proj, "tts")
    print("下一步：voice.py plan（审阅草案后 --apply）")


def cmd_import(args):
    import numpy as np
    proj = pathlib.Path(args.project).resolve()
    src = pathlib.Path(args.audio).expanduser().resolve()
    if not src.is_file():
        raise SystemExit(f"✗ 找不到 {src}")
    (proj / "audio").mkdir(exist_ok=True)
    dst = proj / "audio" / f".import-{uuid.uuid4().hex}.wav"
    try:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                        "-ac", "1", "-ar", "44100", str(dst)], check=True)
        dur = ffprobe_duration(dst)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(dst), "-f", "s16le", "-"],
                             capture_output=True).stdout
        x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
        sr = 44100
        fr = int(sr * 0.03)
        n = len(x) // fr
        if n < 8:
            raise SystemExit("录音过短，无法检测；请提供已对齐 cues 或更长录音")
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
        alignment = {"method": "vad-candidates", "reviewed": False}
        if args.text:
            lines = parse_narration(args.text)
            if len(lines) != len(merged):
                raise SystemExit(f"文稿 {len(lines)} 句 vs VAD {len(merged)} 段：拒绝截断/补空。提供 --aligned-cues 或校对分段后重试")
            texts = [s["text"] for s in lines]
        sentences = [{"idx": i, "text": texts[i] if texts else "",
                      "file": "audio/narration_import.wav", "start": round(a, 3),
                      "end": round(min(b, dur), 3), "source_start": round(a, 3),
                      "source_end": round(min(b, dur), 3)} for i, (a, b) in enumerate(merged)]
        if args.aligned_cues:
            aligned = json.loads(pathlib.Path(args.aligned_cues).read_text(encoding="utf-8"))
            sentences = aligned["sentences"]
            previous = 0
            for i, sentence in enumerate(sentences):
                a, b = sentence["start"], sentence["end"]
                if not (isinstance(a, (int, float)) and isinstance(b, (int, float)) and
                        math.isfinite(a) and math.isfinite(b) and previous <= a < b <= dur and sentence.get("text")):
                    raise SystemExit(f"对齐句 {i} 非法、重叠或无文本")
                sentence.update(idx=i, source_start=a, source_end=b, file="audio/narration_import.wav")
                previous = b
            if not sentences:
                raise SystemExit("对齐结果没有句子")
            alignment = {"method": "provided-alignment", "reviewed": bool(aligned.get("alignment", {}).get("reviewed"))}
        cues = {"sample_rate": sr, "timing": "source", "total": round(dur, 3),
                "audio": "audio/narration_import.wav", "alignment": alignment, "sentences": sentences}
        dst.replace(proj / "audio" / "narration_import.wav")
        write_json(cues_path(proj), cues)
        register_cues(proj, "source")
        print(f"✓ {len(sentences)} 段，源时间码已锁定；VAD 不是文字对齐，交付前须校对并将 alignment.reviewed 设为 true")
    finally:
        dst.unlink(missing_ok=True)


def planned_film(cues, film, bpm, target=7.2, lead=.35, gap=.45, hook_bars=1):
    if bpm <= 0 or target <= 0 or lead < 0 or gap < 0:
        raise ValueError("BPM/target 须为正数，lead/gap 不得为负")
    bar = 240 / bpm
    sents = cues["sentences"]
    if not sents:
        raise ValueError("没有口播句子")
    groups, current, elapsed = [], [], 0
    for i, sentence in enumerate(sents):
        duration = sentence["end"] - sentence["start"]
        if duration <= 0:
            raise ValueError(f"句 {i} 时长非法")
        current.append(i)
        elapsed += duration + gap
        if elapsed >= target - bar * .5:
            groups.append(current); current, elapsed = [], 0
    if current:
        groups.append(current)
    beats, cursor = [], 0
    source = bool(cues.get("audio"))
    for gi, group in enumerate(groups):
        if source:
            end = sents[groups[gi+1][0]]["start"] if gi+1 < len(groups) else max(30, cues["total"] + .8)
        else:
            length = lead + sum(sents[i]["end"] - sents[i]["start"] for i in group) + gap*(len(group)-1) + .2
            bars = max(hook_bars if gi == 0 else 2, math.ceil(length/bar))
            end = cursor + bars*bar
        beats.append({"id": f"b{gi}", "scene": f"s{gi}", "start": round(cursor,3),
                      "end": round(end,3), "sentences": group, "energy": .65,
                      "sfx": [], "note": sents[group[0]].get("text", "")[:28]})
        cursor = end
    if not source:
        cursor = max(30, math.ceil((cursor+.8)/bar)*bar)
        beats[-1]["end"] = round(cursor,3)
    if cursor > 300:
        raise ValueError("口播排布超过 300 秒；压缩内容或拆集")
    draft = copy.deepcopy(film)
    draft.update(bpm=bpm, duration=round(cursor,3), beats=beats,
                 ending_fade=[round(cursor-.6,3), round(cursor-.1,3)])
    draft.setdefault("voice", {})["cues"] = film.get("voice", {}).get("cues", "audio/cues.json")
    draft["voice"]["timing"] = "source" if source else "tts"
    return draft


def cmd_plan(args):
    proj = pathlib.Path(args.project).resolve()
    path = proj / "film.json"
    film = json.loads(path.read_text()) if path.is_file() else {}
    cues = json.loads(cues_path(proj, film).read_text())
    bpm = args.bpm or film.get("bpm",100)
    draft = planned_film(cues, film, bpm, args.target, args.lead, args.gap, args.hook_bars)
    write_json(proj / "film_beats_draft.json", draft)
    print(f"草案：{len(draft['beats'])} 拍 / {draft['duration']}s → film_beats_draft.json")
    if not args.apply:
        print("film.json 与 cues 未改；审阅草案后 plan --apply，或手工合并分镜后 place")
        return
    if cues.get("audio"):
        errors = timeline_errors(draft, cues)
        if errors:
            raise SystemExit("; ".join(errors))
    else:
        _place_on_grid(proj, args.lead, args.gap, film=draft)
    write_json(path, draft)
    print("✓ 新分镜已应用；录音保留源时间码，TTS 按新分镜落位。补齐场景后预检")


def _place_on_grid(proj, lead=.35, gap=.45, quiet=False, film=None):
    proj = pathlib.Path(proj)
    film = film or json.loads((proj / "film.json").read_text())
    path = cues_path(proj, film)
    cues = json.loads(path.read_text())
    if cues.get("audio"):
        raise SystemExit("用户录音锁定源时间码；请让分镜跟随录音，不要 place（重排需先切片）")
    if lead < 0 or gap < 0:
        raise SystemExit("lead/gap 不得为负")
    updated = copy.deepcopy(cues)
    sents = updated["sentences"]
    seen = set()
    for beat in film["beats"]:
        cursor = beat["start"] + lead
        for index in beat.get("sentences", []):
            if not isinstance(index, int) or isinstance(index, bool) or not 0 <= index < len(sents) or index in seen:
                raise SystemExit(f"非法或重复句索引 {index}")
            sentence = sents[index]
            duration = sentence["end"] - sentence["start"]
            sentence["start"], sentence["end"] = round(cursor,3), round(cursor+duration,3)
            cursor += duration+gap
            seen.add(index)
    updated.update(total=max((s["end"] for s in sents), default=0), placed=True, lead=lead, gap=gap, timing="tts")
    errors = timeline_errors(film, updated)
    if errors:
        raise SystemExit("落位失败（未写入）：" + "; ".join(errors))
    write_json(path, updated)
    return updated


def cmd_place(args):
    _place_on_grid(pathlib.Path(args.project).resolve(), args.lead, args.gap)
    print("✓ 已校验并落位；audio build → 最终 render --full → 编码后 delivery 检查")


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
            s.add_argument("--aligned-cues", help="已对齐 sentences JSON，保留源时间码")
        if name in ("plan", "place"):
            s.add_argument("--lead", type=float, default=0.35, help="句音频相对拍起点的落位提前量")
            s.add_argument("--gap", type=float, default=0.45)
        if name == "plan":
            s.add_argument("--bpm", type=float, default=None)
            s.add_argument("--apply", action="store_true", help="审阅后应用新分镜；默认只出草案")
            s.add_argument("--target", type=float, default=7.2)
            s.add_argument("--hook-bars", dest="hook_bars", type=int, default=1)
        if name == "status":
            s.add_argument("--voice")
    args = ap.parse_args()
    {"say": cmd_say, "import": cmd_import, "plan": cmd_plan, "place": cmd_place, "status": cmd_status}[args.cmd](args)
