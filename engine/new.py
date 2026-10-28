#!/usr/bin/env python3
"""sky-film-studio · new.py —— 新建影片项目（自包含，可 zip 复现）
  new.py <dir> [--name 片名] [--theme tech|history|news|code|finance|default]"""
import argparse, json, pathlib, shutil, html, subprocess
from project import write_json, validate_font, file_hash
from direction import catalog, resolve, plan

SKILL = pathlib.Path(__file__).resolve().parents[1]

INDEX_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>__NAME__</title>
<style>
  html, body { margin: 0; background: #060503; overflow: hidden; }
  canvas { display: block; }
</style>
<!-- 字体：OTF 放 assets/fonts/；下载后必须 sfnt 表校验（pipeline.md 坑 2）。
     预览可回退并告警；交付检查要求所有字体成功加载。 -->
<script>
  window.__fontErrors = [];
  window.__fontsReady = Promise.all([
    ["NotoSerifSC-Regular.otf",400,"Noto Serif SC"], ["NotoSerifSC-SemiBold.otf",600,"Noto Serif SC"], ["NotoSerifSC-Bold.otf",700,"Noto Serif SC"],
    ["LXGWWenKai-500.woff",500,"LXGW WenKai"], ["Ma_Shan_Zheng.ttf",400,"Ma Shan Zheng"],
    ["Orbitron.ttf",400,"Orbitron"], ["Press_Start_2P.ttf",400,"Press Start 2P"]
  ].map(([f, w, family]) => {
    const ff = new FontFace(family, `url(assets/fonts/${f})`, { weight: String(w) });
    return ff.load().then(x => document.fonts.add(x)).catch(error => { window.__fontErrors.push(f); console.warn(`字体未加载: ${f}`); });
  }));
</script>
</head>
<body>
<canvas id="c" width="1920" height="1080"></canvas>
<script src="vendor/lib.js"></script>
<script src="vendor/motion.js"></script>
<script src="vendor/blur.js"></script>
<script src="vendor/process.js"></script>
<script src="vendor/camera.js"></script>
<script src="vendor/materials.js"></script>
<script src="vendor/style-motion.js"></script>
<script src="vendor/transitions.js"></script>
<script src="vendor/gears.js"></script>
<script src="vendor/components/base.js"></script>
<script src="vendor/components/textfx.js"></script>
<script src="vendor/components/objectfx.js"></script>
<script src="vendor/components/datafx.js"></script>
<script src="vendor/components/mockups.js"></script>
<script src="vendor/themes.js"></script>
<script src="vendor/decor.js"></script>
<script src="vendor/renderer.js"></script>
<script src="vendor/renderers/all.js"></script>
<script src="vendor/icons.js"></script>
<script src="vendor/icons-fill.js"></script>
<script src="vendor/components/iconlib.js"></script>
<script src="vendor/components/fx.js"></script>
<script src="vendor/components/entities.js"></script>
<script src="vendor/components/entityfx.js"></script>
<script src="vendor/components/paintfx.js"></script>
<script src="vendor/components/svgicons.js"></script>
<script src="data.js"></script>
<script src="storyboard.js"></script>
<script src="vendor/scaffold.js"></script>
</body>
</html>
"""

STORYBOARD = """// =====================================================================
// storyboard.js —— 场景函数（scene 名与 film.json beats[].scene 对应）
// 组件拼装优先；数字一律从 data.js（DATA）读。签名：(ctx, t, l, beat)
// =====================================================================
window.FILM = {
  theme: "__THEME__",
  timeline: undefined,
  // timeline: { starts: [2.4, 9.6], doneAt: 14.4, fadeAt: 20,
  //             items: [{ label: "调研 · 1–2 周" }, { label: "方案" }] },
  scenes: {
    s0(ctx, t, l, beat) {          // 钩子拍
      hookBurst(ctx, t, l, { lines: [
        { text: DATA.hook.l1, size: __FS__ },
        { text: DATA.hook.l2, size: __FS__, gold: true }
      ], y: __HOOKY__ });
      if (DATA.eco && DATA.eco.length)
        numCounter(ctx, t, l, { y: __NUMY__, at: 0.8, collide: true, items: DATA.eco });
    },
    s1(ctx, t, l, beat) {          // 第一内容拍（示例）
      stepIntro(ctx, t, l, 1, DATA.steps[0].full);
      checkList(ctx, t, l, { x: __CLX__, y: __CLY__, w: __CLW__, title: DATA.steps[0].listTitle,
                             at0: 0.5, items: DATA.steps[0].points });
      flowPath(ctx, t, l, { x0: __FPX0__, x1: __FPX1__, y: __FPY__, at0: 1.6,
                            nodes: DATA.steps[0].flow || ["输入", "核实", "合成", "渲染", "成片"] });
    }
    // s2, s3, … 按分镜继续
  }
};
"""

FILM_JSON = """{
  "title": "__NAME__",
  "theme": "__THEME__",
  "duration": 60.0,
  "fps": 30,
  "bpm": __BPM__,
  "width": __W__, "height": __H__,
  "music": { "mode": "__MODE__", "arpDensity": 1.0 },
  "voice": {},
  "chrome": { "titleAt": 1.7 },
  "beats": [
    { "id": "hook", "scene": "s0", "start": 0.0, "end": 2.4, "energy": 0.9,
      "sentences": [], "sfx": [[0.0, "boom", 0.9]], "note": "钩子" },
    { "id": "b1", "scene": "s1", "start": 2.4, "end": 60.0, "energy": 0.55,
      "sentences": [], "sfx": [[0.1, "pageturn", 0.25]], "note": "第一拍" }
  ],
  "ending_fade": [58.0, 59.5]
}
"""

DATA_JS = """// 事实数据集中在此；以 claimId 关联 claims.json。示例、序号与动画参数不冒充事实。
window.DATA = {
  hook: { l1: "（钩子第一行）", l2: "（钩子金色行）" },
  eco: [],                 // numCounter items: [{roll, text, unit, label, tag}]
  steps: [ { full: "步骤名", listTitle: "要点", points: ["要点一", "要点二", "要点三"],
             flow: ["输入", "核实", "合成", "渲染", "成片"] } ]
};
"""

NARRATION = """# 口播稿：每行一句（[角色] 前缀可选）；# 注释行不合成
第一句。
第二句。
"""


RATIOS = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080),
           "4:3": (1440, 1080), "3:4": (1080, 1440), "4:5": (1080, 1350),
           "2.35:1": (1920, 816), "21:9": (1920, 822)}


def parse_ratio(r):
    """比例 → 像素。内置档位；W:H 按长边 1920 缩放；WxH 直接像素（偶数）。"""
    r = r.strip()
    if r in RATIOS:
        return RATIOS[r]
    import re as _re
    m = _re.fullmatch(r"(\d+)[x×](\d+)", r)
    if m:
        w, h = int(m.group(1)), int(m.group(2))
        return (w - w % 2, h - h % 2)
    m = _re.fullmatch(r"(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)", r)
    if m:
        a, b = float(m.group(1)), float(m.group(2))
        if a <= 0 or b <= 0: raise SystemExit("比例两边必须为正数")
        if a >= b:
            return (1920, int(round(1920 * b / a / 2)) * 2)
        return (int(round(1920 * a / b / 2)) * 2, 1920)
    raise SystemExit(f"✗ 无法解析比例 {r!r}；支持 16:9 / 9:16 / 1:1 / 4:3 / 3:4 / 4:5 / 2.35:1 / W:H / WxH")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--name", default="我的短片")
    ap.add_argument("--theme", default=None,
                    choices=["tech", "history", "news", "code", "finance", "default", "ink", "pixel", "glitch", "whiteboard", "screencast", "blueprint", "museum"])
    ap.add_argument("--ratio", default="16:9",
                    help="16:9(默认)|9:16|1:1|4:3|3:4|4:5|2.35:1|W:H|WxH")
    ap.add_argument("--template", default=None,
                    help="参数化模板：daily-brief 日更快讯 | how-to N步流程 | fact-card 数据卡片")
    ap.add_argument('--style',choices=list(catalog()['styles']),help='Visual treatment; theme may independently override palette')
    ap.add_argument('--content',choices=list(catalog()['contents']),default='concept')
    ap.add_argument('--sound',choices=list(catalog()['sounds']),help='Semantic action-sound palette')
    args = ap.parse_args()
    args.theme=args.theme or args.style or 'default'
    args.style=args.style or (args.theme if args.theme in catalog()['styles'] else None)
    if not args.style and (args.sound or args.content!='concept'):
        ap.error('--content/--sound require --style blueprint|museum|whiteboard for now')
    proj = pathlib.Path(args.dir).resolve()
    if proj.exists() and any(proj.iterdir()):
        raise SystemExit(f"拒绝覆盖非空项目目录：{proj}；请新建目录或显式维护现有文件")
    if args.template and not (SKILL / "templates" / args.template / "storyboard.js").is_file():
        raise SystemExit("未知模板")
    proj.mkdir(parents=True, exist_ok=True)
    meta = {"tech": (105, "minor"), "history": (85, "pentatonic"), "news": (115, "major"),
            "code": (100, "minor"), "finance": (100, "major"), "default": (100, "minor"), "ink": (72,"pentatonic"), "pixel": (130,"minor"),
            "glitch": (128,"minor"), "whiteboard": (92,"major"), "screencast": (90,"minor"), "blueprint": (96,"minor"), "museum": (76,"pentatonic")}[args.theme]
    if args.style:
        sm=catalog()['styles'][args.style]['music'];meta=(sm['bpm'],sm['mode'])
    vw, vh = parse_ratio(args.ratio)
    if vw < 320 or vh < 320:
        raise SystemExit("画幅两边均须 ≥320 像素")
    portrait = vh > vw
    # Content positions depend on actual dimensions, including square/wide formats.
    cw = min(720, vw-120)
    top, bottom = 120, vh-280
    mid = (top+bottom)/2
    sb_vals = dict(__FS__=min(58,int(vw*.05)), __HOOKY__=int(mid),
                   __NUMY__=int(mid+100), __CLX__=int((vw-cw)/2),
                   __CLY__=int(max(top,mid-120)), __CLW__=cw,
                   __FPX0__=int(vw*.15), __FPX1__=int(vw*.85), __FPY__=int(bottom))
    (proj / "vendor" / "components").mkdir(parents=True, exist_ok=True)
    shutil.copy(SKILL / "engine" / "lib.js", proj / "vendor" / "lib.js")
    shutil.copy(SKILL / "engine" / "motion.js", proj / "vendor" / "motion.js")
    for name in ('blur.js','renderer.js','process.js','camera.js','materials.js','style-motion.js','transitions.js','gears.js'):
        shutil.copy(SKILL/'engine'/name,proj/'vendor'/name)
    (proj/'vendor/renderers').mkdir(exist_ok=True)
    shutil.copy(SKILL/'themes/renderers/all.js',proj/'vendor/renderers/all.js')
    shutil.copy(SKILL / "engine" / "scaffold.js", proj / "vendor" / "scaffold.js")
    for f in ["base", "datafx", "mockups", "textfx", "objectfx", "iconlib", "fx", "entities", "entityfx", "paintfx", "svgicons"]:
        shutil.copy(SKILL / "components" / f"{f}.js", proj / "vendor" / "components" / f"{f}.js")
    shutil.copy(SKILL / "themes" / "themes.js", proj / "vendor" / "themes.js")
    shutil.copy(SKILL / "themes" / "decor.js", proj / "vendor" / "decor.js")
    shutil.copy(SKILL / "components" / "icons.js", proj / "vendor" / "icons.js")
    shutil.copy(SKILL / "components" / "icons-fill.js", proj / "vendor" / "icons-fill.js")
    (proj / "index.html").write_text(INDEX_HTML.replace("__NAME__", html.escape(args.name)), encoding="utf-8")
    sb = STORYBOARD.replace("__THEME__", args.theme)
    for k2, v2 in sb_vals.items():
        sb = sb.replace(k2, str(v2))
    (proj / "storyboard.js").write_text(sb, encoding="utf-8")
    (proj / "film.json").write_text(
        FILM_JSON.replace("__NAME__", json.dumps(args.name,ensure_ascii=False)[1:-1]).replace("__THEME__", args.theme)
        .replace("__BPM__", str(meta[0])).replace("__MODE__", meta[1])
        .replace("__W__", str(vw)).replace("__H__", str(vh)), encoding="utf-8")
    (proj / "data.js").write_text(DATA_JS, encoding="utf-8")
    (proj / "narration.txt").write_text(NARRATION, encoding="utf-8")
    # 参数化模板：storyboard 固定 + data.js 全变量（换数据→重渲→同款新片）
    if args.template:
        import shutil as _sh2
        tpl = SKILL / "templates" / args.template
        _sh2.copy(tpl / "storyboard.js", proj / "storyboard.js")
        _sh2.copy(tpl / "defaults.js", proj / "data.js")
        bar = 4 * 60 / meta[0]
        beats = [{"id": "b0", "scene": "s0", "start": 0, "end": 1 * bar, "energy": 0.9,
                  "sentences": [], "sfx": [[0.0, "boom", 0.85]], "note": "钩子"}]
        if args.template == "daily-brief":
            for i in range(3):
                beats.append({"id": f"item{i}", "scene": "sItem", "start": beats[-1]["end"],
                              "end": beats[-1]["end"] + 2 * bar, "energy": 0.6, "sentences": [],
                              "sfx": [[0.3, "tick", 0.16]], "vars": {"i": i}, "note": f"条目{i+1}"})
            beats.append({"id": "num", "scene": "sNum", "start": beats[-1]["end"], "end": beats[-1]["end"] + 2 * bar,
                          "energy": 0.75, "sentences": [], "sfx": [[0.4, "ping", 0.2]], "note": "数字"})
        elif args.template == "how-to":
            for i in range(4):
                beats.append({"id": f"step{i}", "scene": "sStep", "start": beats[-1]["end"],
                              "end": beats[-1]["end"] + 2 * bar, "energy": 0.65, "sentences": [],
                              "sfx": [[1.0, "chime", 0.18]], "vars": {"i": i}, "note": f"步骤{i+1}"})
        else:
            beats.append({"id": "main", "scene": "sMain", "start": beats[-1]["end"], "end": beats[-1]["end"] + 3 * bar,
                          "energy": 0.8, "sentences": [], "sfx": [[0.5, "ping", 0.22]], "note": "主数字"})
            beats.append({"id": "cmp", "scene": "sCmp", "start": beats[-1]["end"], "end": beats[-1]["end"] + 3 * bar,
                          "energy": 0.6, "sentences": [], "sfx": [[0.5, "tick", 0.16]], "note": "对比"})
        beats.append({"id": "end", "scene": "sEnd", "start": beats[-1]["end"], "end": beats[-1]["end"] + 4 * bar,
                      "energy": 0.4, "sentences": [], "sfx": [[0.3, "swell", 0.2]], "note": "收尾"})
        dur = max(30, beats[-1]["end"])
        beats[-1]["end"] = dur
        f2 = json.loads((proj / "film.json").read_text(encoding="utf-8"))
        f2.update({"beats": beats, "duration": round(dur, 2), "bpm": meta[0],
                   "ending_fade": [dur - 1.6, dur - 0.35], "voice": {},
                   "progress": args.template != "fact-card",
                   "title": f"模板 · {args.template}"})
        (proj / "film.json").write_text(json.dumps(f2, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"✓ 模板 {args.template}：改 data.js → render --full → 同款新片（{dur:.0f}s）")
    if args.style:
        film=json.loads((proj/'film.json').read_text(encoding='utf-8'))
        film['direction']={'content':args.content,'style':args.style,'sound':args.sound or catalog()['styles'][args.style]['sound']}
        film['music']={}
        write_json(proj/'film.json',resolve(film))
        write_json(proj/'checks/direction-plan.json',plan(film,args.content,args.style,args.sound))
    (proj / "assets" / "fonts").mkdir(parents=True, exist_ok=True)
    # All fonts are bundled; copy the exact font manifest, preserving offline builds.
    for f in (SKILL/'assets/fonts').iterdir():
        if f.suffix.lower() in ('.otf','.ttf','.woff','.woff2'):
            if f.suffix.lower() in ('.otf','.ttf'): validate_font(f)
            shutil.copy(f,proj/'assets/fonts'/f.name)
    # Snapshot the actual builders as well as the browser runtime.
    (proj / "engine").mkdir(exist_ok=True)
    for name in ("render.py", "audio.py", "check.py", "voice.py", "project.py", "encode.py", "audio_metrics.py", "alignment.py", "direction.py", "preview.js"):
        shutil.copy(SKILL / "engine" / name, proj / "engine" / name)
    shutil.copy(SKILL/'themes/direction-profiles.json',proj/'engine/direction-profiles.json')
    shutil.copy(SKILL / "requirements.txt", proj / "requirements.txt")
    shutil.copy(SKILL / "requirements-asr.txt", proj / "requirements-asr.txt")
    version = subprocess.run(["git", "-C", str(SKILL), "rev-parse", "HEAD"],
                             capture_output=True, text=True).stdout.strip() or "unversioned"
    write_json(proj / "provenance.json", {"engine_revision": version,
               "source_hashes": {str(p.relative_to(proj)):file_hash(p) for p in sorted((proj/"engine").glob("*")) if p.is_file()},
               "fonts": {p.name:{"sha256":file_hash(p),"license":"OFL", "file":p.name}
                         for p in (proj/"assets/fonts").iterdir() if p.is_file()}, "assets": [],
               "rebuild": "python3 engine/check.py auto --project ."})
    write_json(proj / "claims.json", {"reviewed": False, "claims": [],
               "note": "核对所有事实主张及示例标识后设 reviewed:true；程序只检查结构，不替代事实核实"})
    print(f"✓ 项目已建：{proj}（theme={args.theme} bpm={meta[0]} 比例={vw}x{vh}）")
    print("写文稿/事实证据/分镜；TTS: say → plan → 审阅草案 → plan --apply")
    print("check.py preflight → 关键帧/短片段复查 → audio build → check.py auto → 编码 → delivery")


if __name__ == "__main__":
    main()
