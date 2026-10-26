#!/usr/bin/env python3
"""sky-film-studio · new.py —— 新建影片项目（自包含，可 zip 复现）
  new.py <dir> [--name 片名] [--theme tech|history|news|code|finance|default]"""
import argparse, pathlib, shutil

SKILL = pathlib.Path(__file__).resolve().parents[1]

INDEX_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>__NAME__</title>
<style>
  html, body { margin: 0; background: #060503; overflow: hidden; }
  canvas { display: block; width: 1920px; height: 1080px; }
</style>
<!-- 字体：OTF 放 assets/fonts/；下载后必须 sfnt 表校验（pipeline.md 坑 2）。
     加载失败自动回退 Songti SC，不会卡死渲染。 -->
<script>
  window.__fontsReady = Promise.all([
    ["NotoSerifSC-Regular.otf", 400], ["NotoSerifSC-SemiBold.otf", 600], ["NotoSerifSC-Bold.otf", 700]
  ].map(([f, w]) => {
    const ff = new FontFace("Noto Serif SC", `url(assets/fonts/${f})`, { weight: String(w) });
    return ff.load().then(x => document.fonts.add(x)).catch(() => {});
  }));
</script>
</head>
<body>
<canvas id="c" width="1920" height="1080"></canvas>
<script src="vendor/lib.js"></script>
<script src="vendor/components/base.js"></script>
<script src="vendor/components/datafx.js"></script>
<script src="vendor/components/mockups.js"></script>
<script src="vendor/themes.js"></script>
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
        { text: DATA.hook.l1, size: 58 },
        { text: DATA.hook.l2, size: 58, gold: true }
      ], y: 470 });
      if (DATA.eco && DATA.eco.length)
        numCounter(ctx, t, l, { y: 760, at: 0.8, collide: true, items: DATA.eco });
    },
    s1(ctx, t, l, beat) {          // 第一内容拍（示例）
      stepIntro(ctx, t, l, 1, DATA.steps[0].full);
      checkList(ctx, t, l, { x: 600, y: 400, w: 720, title: DATA.steps[0].listTitle,
                             at0: 0.5, items: DATA.steps[0].points });
      flowPath(ctx, t, l, { x0: 320, x1: 1600, y: 830, at0: 1.6,
                            nodes: DATA.steps[0].flow || ["输入", "核实", "合成", "渲染", "成片"] });
    }
    // s2, s3, … 按分镜继续
  }
};
"""

FILM_JSON = """{
  "title": "__NAME__",
  "theme": "__THEME__",
  "duration": 12.0,
  "fps": 30,
  "bpm": __BPM__,
  "width": 1920, "height": 1080,
  "music": { "mode": "__MODE__", "arpDensity": 1.0 },
  "voice": { "cues": "audio/cues.json", "duck_db": -8 },
  "chrome": { "titleAt": 1.7 },
  "beats": [
    { "id": "hook", "scene": "s0", "start": 0.0, "end": 2.4, "energy": 0.9,
      "sentences": [], "sfx": [[0.0, "boom", 0.9]], "note": "钩子" },
    { "id": "b1", "scene": "s1", "start": 2.4, "end": 12.0, "energy": 0.55,
      "sentences": [], "sfx": [[0.1, "pageturn", 0.25]], "note": "第一拍" }
  ],
  "ending_fade": [9.2, 11.7]
}
"""

DATA_JS = """// 数据唯一来源：片中一切数字只准出自这里；逐条注明来源；核实不了的数字不进本表
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--name", default="我的短片")
    ap.add_argument("--theme", default="default",
                    choices=["tech", "history", "news", "code", "finance", "default"])
    args = ap.parse_args()
    proj = pathlib.Path(args.dir).resolve()
    proj.mkdir(parents=True, exist_ok=True)
    meta = {"tech": (105, "minor"), "history": (85, "pentatonic"), "news": (115, "major"),
            "code": (100, "minor"), "finance": (100, "major"), "default": (100, "minor")}[args.theme]
    (proj / "vendor" / "components").mkdir(parents=True, exist_ok=True)
    shutil.copy(SKILL / "engine" / "lib.js", proj / "vendor" / "lib.js")
    shutil.copy(SKILL / "engine" / "scaffold.js", proj / "vendor" / "scaffold.js")
    for f in ["base", "datafx", "mockups"]:
        shutil.copy(SKILL / "components" / f"{f}.js", proj / "vendor" / "components" / f"{f}.js")
    shutil.copy(SKILL / "themes" / "themes.js", proj / "vendor" / "themes.js")
    (proj / "index.html").write_text(INDEX_HTML.replace("__NAME__", args.name), encoding="utf-8")
    (proj / "storyboard.js").write_text(STORYBOARD.replace("__THEME__", args.theme), encoding="utf-8")
    (proj / "film.json").write_text(
        FILM_JSON.replace("__NAME__", args.name).replace("__THEME__", args.theme)
        .replace("__BPM__", str(meta[0])).replace("__MODE__", meta[1]), encoding="utf-8")
    (proj / "data.js").write_text(DATA_JS, encoding="utf-8")
    (proj / "narration.txt").write_text(NARRATION, encoding="utf-8")
    (proj / "assets" / "fonts").mkdir(parents=True, exist_ok=True)
    # 优先复用本机已有字体
    for cand in [pathlib.Path.home() / "Desktop/video-agent/wxminipro_video/assets/fonts",
                 pathlib.Path.home() / ".agents/skills/huashu-art-motion/scripts/engine/lib/fonts"]:
        if (cand / "NotoSerifSC-SemiBold.otf").is_file():
            for f in ["NotoSerifSC-Regular.otf", "NotoSerifSC-SemiBold.otf", "NotoSerifSC-Bold.otf"]:
                if (cand / f).is_file():
                    shutil.copy(cand / f, proj / "assets" / "fonts" / f)
            break
    print(f"✓ 项目已建：{proj}（theme={args.theme} bpm={meta[0]}）")
    print("  1) 写 narration.txt / data.js / storyboard.js / film.json")
    print("  2) voice.py say → plan → render.py --keys（自查≥2轮）→ --full")
    print("  3) audio.py build → check.py audio → ffmpeg 合成")


if __name__ == "__main__":
    main()
