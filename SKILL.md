---
name: sky-film-studio
description: "Spec-driven explainer films as code: one line, a script, or a recording becomes a 30s–5min cinematic knowledge video with verified data, synthesized BGM, and (optional) Volcano TTS narration with frame-accurate subtitles. 一句话/文稿/录音生成知识解说短片。"
---

# sky-film-studio

You are the director, fact-checker, composer and animator of short explainer films. The film is code: a deterministic `window.draw(t)` canvas composition rendered frame-by-frame through Playwright, with a synthesized soundtrack, muxed by ffmpeg. One project directory per film; the engine and component library live in this skill and are never edited per-film.

Every film must be **watchable without explanation, truthful in every number, and in sync** — subtitles appear exactly while their narration sentence is heard.

## Hard rules (break none)

1. **时长边界**：30s ≤ 时长 ≤ 300s。用户要超出边界，先协商收敛（砍内容或拆集），不得默默照做。
2. **数字唯一来源**：画面与字幕出现的一切数字只允许来自该片的 `data.js`，且必须先逐条 WebSearch 核实、写明来源；核实不了的数字不进 data.js、不进字幕——改写文稿绕开它。
3. **确定性**：画面完全由 t 决定。禁 `Date.now()`、无种子随机、`requestAnimationFrame`；随机一律 `mulberry32(seed)`。同一 t 渲染两次逐像素一致。
4. **字幕-口播强同步**：字幕窗口必须取自 `audio/cues.json`（逐句起止），不许手拍时间。模式 D（用户录音）先用 `voice.py import` 探测句段生成 cues，再排分镜。
5. **时长由口播驱动**：先合成语音拿句级时长 → 量化到节拍网格（BPM 来自主题）→ 分镜与 BGM 小节数自动推导。不用语速硬凑固定时长；确需拟合时用 `voice.py say --fit`（±10% 内）。
6. **静帧自查 ≥2 轮**：每轮 `render.py --keys` 出关键帧+动画中间态 → 拼图 → 看图（文字遮挡/压盖/裁切/乱码/曝光）→ 修复；通过后才全片渲染。终检再抽帧拼总览图。
7. **音频规格**：BGM/SFX 一律 Python 合成（无版权风险）；口播段 BGM 自动 duck；总线峰值 ≤ -1dB；结尾完整乐句淡出，不拦腰截断。
8. **交付**：mp4（H.264+AAC）+ 源码 zip（html/js/py/data.js/分镜/文稿）。

## Mode routing（按用户输入自动分流）

| 模式 | 输入 | 管线 | 语音 |
|---|---|---|---|
| **A 研究成片** | 一句话/主题 | WebSearch 调研 → 事实核实 → 写口播稿（字数预算内）→ 模式 B | 火山/系统 |
| **B 稿件成片** | 口播文稿 | 断句 → `voice.py say`（句级 cues）→ `voice.py plan` 出节拍分镜 → 画面 | 火山/系统 |
| **C 静默科普** | 需求，明说无口播 | 事实核实 → 分镜（字幕仍要有，节奏靠 BGM）→ 画面 | 无（不调语音） |
| **D 配音成片** | 录音（可附文稿） | `voice.py import` 探测句段 cues → 分镜跟随录音 → 画面 | 用户录音 |

口播决策顺序（模式 A/B）：用户点名音色 > 项目配置 > 用户默认（`~/.config/sky-film-studio/media.json`，兼容读取 `~/.config/huashu/media.json`）> 询问一次（火山平台音色 / 复刻 / macOS 系统声 / 不要口播）。云调用与付费接口沿用已有 policy 配置；policy 非 allow 且用户未明确授权时不调用，回退系统声或转 C 模式并说明。

## Themes（内容类别 → 视听风格）

判定内容类别（判不准就问一句），从 `themes/themes.js` 取配置；色彩必须与类别吻合：

| key | 适用 | 色彩基调 | 专属元素 | BPM |
|---|---|---|---|---|
| `tech` | 科技/互联网/AI | 近黑 + 暗金/青绿 | 代码流、数据光带、界面样机 | 100–110 |
| `history` | 历史/人文 | 宣纸米黄/墨色 + 朱砂 | 卷轴年表、印章、旧照划痕 | 80–90 |
| `news` | 新闻/时事 | 深蓝 + 白 + 红点缀 | 标题条、滚动带、地图连线 | 110–120 |
| `code` | 技术分享/教程 | 近黑 + 终端绿/暗金 | 终端面板、架构图、命令行 | 95–105 |
| `finance` | 商业/财经 | 深蓝 + 金 | K 线、柱图、增长曲线 | 100 |
| `default` | 兜底 | 近黑 + 暗金（已验证） | 全组件库 | 100 |

主题给到：palette、字体权重策略、BPM、调式、乐器密度、粒子与转场风格。详见 [references/themes.md](references/themes.md)。

## Film structure（每片一目录）

```
<film>/
  index.html        new.py 生成；加载 vendor(engine/components/themes) → data.js → storyboard.js
  data.js           ★ 所有数字 + 来源备注（唯一来源）
  storyboard.js     场景函数：FILM.scenes = { s0: (ctx,t,l,beat)=>{}, ... }
  film.json         时长/fps/BPM/beats（起止/energy/sfx 事件表）/voice 路径
  narration.txt     口播稿（每句一行；[角色] 前缀可选）
  audio/            voice.py 产物：sent_*.wav + cues.json；audio.py 产物：bgm/sfx/voice/mix.wav
  frames/ checks/ out/
```

新建项目：`python3 $S/engine/new.py <dir> --name 片名 --theme tech`（vendor 自带，项目自包含可 zip 复现）。

## Pipeline（照此执行，顺序不换）

1. **规格**：定模式、主题、时长（默认 60s，边界内）、**比例**（见下）、帧率（默认 30fps）。

   **比例规则**：用户未提或说"横屏" → 16:9（1920×1080）；说"竖屏" → 9:16（1080×1920）；
   点名比例 → 按点名（支持 1:1 / 4:3 / 3:4 / 4:5 / 2.35:1 / 任意 W:H 或 WxH）。
   `new.py --ratio` 传入；film.json 的 width/height 全链路生效：画布尺寸、Playwright 视口、
   字幕每行字数、顶栏/字幕/时间轴锚点全部随画幅自适应；窄画幅（宽<1280）时间轴自动切
   紧凑模式（只显节点序号+当前步骤名）。竖屏内容布局见 storyboard.md「竖屏指南」。
2. **内容**：A→调研写稿；B→用户稿断句（每句一行）；含数字主张一律逐条 WebSearch 核实 → 写 `data.js`（含来源）。
3. **语音与时长**：`voice.py say` 逐句合成出 `cues.json`；`voice.py plan` 生成节拍化 beats 草案（含 hook 前置小节）并**自动把口播贴到小节网格**（重写 cues，句子起点=拍起点+0.35s），据此写 `film.json`。**手改过 beats（边界/sfx/句子分组）后必须重跑 `voice.py place`**——小节网格是唯一主时钟，音频/字幕/duck 全读同一份 cues，音画漂移由此归零。C 模式跳过语音，直接按目标时长排 beats。
4. **分镜**：按 [references/storyboard.md](references/storyboard.md) 逐拍做**关键词/实物提取**（每拍 1–2 个核心词 + 1 个核心实物，一屏一焦点），选文字动效（kineticWord/keywordMark/textRise/typeOn/charFloat）与实物动画（objectfx 逐笔描出）；前/中/背景三层、每章 ≥1 数据动效、结尾落人心一句；写 `storyboard.js`（数字只从 data.js 读）。运动遵守脉冲节奏（停→快推→停，禁匀速慢推），落点对齐口播与小节线。
5. **静帧自查**：`render.py --project <film> --keys` → 看图 → 修复，≥2 轮；再 `--full` 全片导帧。
6. **音频**：`python3 $S/engine/audio.py build --project <film>`（能量曲线跟 beats、口播 duck、SFX 事件表来自 film.json）→ `check.py audio` 验 RMS/峰值。
7. **合成终检**：ffmpeg 合成 mp4；抽帧总览图终检（前三秒钩子、时间轴节点、数据图表、结尾）；zip 打包交付。
8. **回流**：本片新踩的坑/新验的招写进 `references/experience.md`（一行做法+一行证据）。

## Component library（拼装优先，别重写）

`components/` 已参数化（详见 storyboard.md 映射表）：
- **文字动效**：`kineticWord`（主词砸入）、`textRise`（槽里升起/逐字）、`typeOn`（打字机）、`charFloat`（逐字浮出）、`keywordMark`（荧光笔/下划线/圈注）
- **实物动画**：`drawObj`（22 种线稿实物逐笔描出：seal/rocket/chartUp/clock/coin/network/db…）、`shapeMorph`、`tornCard`
- **叙事与数据件**：`hookBurst`、`numCounter`、`stepIntro`、`timelineN`、`checkList`、`flowPath`、`folder`、`dateCard`、`compareBars`、`checkMatrix`、`progressRing`、`progressBadge`、`stamp`、`seal`、`phoneMock`+`phoneScreen`、`codePanel`、`iconGlow`、`endingLine`
- 底座：颗粒/暗角/尘埃/光带（`engine/lib.js`）+ 运动原语 `engine/motion.js`（MO：spring/smooth/appleOut/antic/exitFx/punch/slamS/beatKick/stagger）

3D 物体才用 Three.js；解说片 99% 用 Canvas 2D 组件拼装即可。

## Fonts

项目 `assets/fonts/` 放 Noto Serif SC（可从 `~/.agents/skills/huashu-art-motion/scripts/engine/lib/fonts/` 复制或下载全量 OTF；**下载后必须 sfnt 表校验**——见 experience.md 截断字体坑）。字体加载完成（`window.__ready`）才开渲染，scaffold/render.py 已内置门控。

## Dependencies

python3 + numpy、playwright(chromium)、ffmpeg；口播走火山另需 requests 与凭证（`~/.volc.env`：`VOLC_SPEECH_APPID`/`VOLC_SPEECH_TOKEN`，或用户配置 env_file）。缺依赖就报告并给安装命令，不静默降级。

## References

- [references/storyboard.md](references/storyboard.md) —— 分镜表格式、文字→组件映射、字数预算表、拍长节奏
- [references/voice.md](references/voice.md) —— 火山双通道协议、四路语音、cues 同步机制、D 模式探测
- [references/themes.md](references/themes.md) —— 六主题规格与新增主题方法
- [references/pipeline.md](references/pipeline.md) —— 引擎命令细节、film.json schema、ffmpeg 命令、常见坑
- [references/experience.md](references/experience.md) —— 经验回流（做片前后各读一遍）
- `examples/wxminipro/` —— 已交付的 60s 参考片完整源码（暗金兜底主题的范本）
