# 分镜：文字→画面映射、拍长节奏、字数预算

## 字数预算（写稿前先算，中文 TTS ≈ 4~4.5 字/秒）

| 时长 | 口播字数 | 拍数（主节奏 6–8s/拍） | BGM 小节 @100BPM |
|---|---|---|---|
| 30s | 120–135 字 | 4–5 拍 | 13 |
| 60s | 240–270 字 | 8–10 拍 | 25 |
| 120s | 480–560 字 | 16–20 拍 | 50 |
| 300s | 1200–1350 字 | 38–46 拍 | 125 |

超预算在稿面压缩，不靠语速凑。钩子（前 3 秒）必须有：第一帧即出画面和大字，禁黑屏起步；结构「钩子 → N 拍推进（每拍一个转折）→ 落人心一句收尾」。每章至少 1 个数据动效（数字必须来自 data.js）。

## 分镜表格式（写进 film.json 的 beats）

| 字段 | 说明 |
|---|---|
| `id / start / end` | 拍号与起止秒（`voice.py plan` 量化到小节线后回填） |
| `scene` | 对应 storyboard.js 里的场景函数名 |
| `sentences` | 该拍口播句子索引（来自 cues.json，字幕与画面同步的依据） |
| `energy` | 0–1，BGM 强弱（鼓/琶音密度由此驱动） |
| `sfx` | `[[t_rel, kind, gain]]`，kind 见 pipeline.md |
| `note` | 画面三层描述（前/中/背景）+ 数据动效 |

## 每拍动效选配（内容表现力核心，v0.3 起）

每拍**至少 1 个文字动效或 1 个实物动画**，一屏一个焦点，落点对齐口播/小节线：

**文字动效（components/textfx.js）**
| 场景 | 用 | 要点 |
|---|---|---|
| 核心词/主词（≤4 字） | `kineticWord` | 踩口播重音砸入（弹簧过冲），落定后不动 |
| 强调关键词 | `keywordMark`（marker 荧光笔/underline/circle） | 字出现后 0.15–0.5s 再刷；marker 先画字后画笔 |
| 辅句/标签/清单标题 | `textRise` | 槽里升起（高级感默认），逐行 stagger 0.06s |
| 引文/命令/代码 | `typeOn` | 26 字/秒，光标 2Hz 闪 |
| 金句/结尾 | `charFloat` | 逐字浮出，stagger 0.05s |
| 数字落定 | `numCounter`（内置微弹） | 落定那刻=口播说出数值那刻，宁早勿晚最多早 1 帧 |

**实体落实纪律（硬规则）**：分镜时把每句口播里的**实体名词逐个列出**（人物/景物/器物/材质），
每个实体必须有对应的实体动画——具体名词优先用 `entities.js` 参数化实体（monk/scholar/worker/buddha/
cliff/cliff7/mural/mural2 + drawScrollDoc 卷轴展开 + drawSand 沙粒堆积）或现场组合新实体；
图标库只做通用词兜底。**不许"最近似图标"糊弄具体名词**（僧人≠person、画壁≠doc、文书≠file-text）。
每个实体都要有诞生动画（逐笔描出/展开/飘落堆积/生长）。

**实物动画（components/objectfx.js `drawObj` 逐笔描出）**
实物来源两层：**手绘件**（seal/stamp/chartUp/person/db/doc/bubble/code/cloud/lock/key/magnifier/phone/folder/gear/flag…本地坐标大笔触）+ **图标库**（`icons.js`，lucide 137 个专业矢量线稿，键名即英文单词）。
图标库常用映射（口播名词 → 图标键名）：
想法→`lightbulb`；增长→`trending-up`/`rocket`；安全→`shield`/`shield-check`；时间→`clock`/`timer`/`hourglass`；
钱→`coins`/`wallet`/`credit-card`/`banknote`；用户→`users`/`user-check`；网络/AI→`network`/`bot`/`brain`/`cpu`；
数据→`database`/`server`/`hard-drive`；文档→`file-text`/`scroll`/`clipboard`/`book-open`；沟通→`message-circle`/`megaphone`/`bell`；
科技→`code`/`terminal`/`wifi`/`smartphone`；法律→`scale`/`gavel`；医疗→`stethoscope`/`pill`/`heart-pulse`/`dna`；
交通→`car`/`plane`/`train-front`/`ship`；建筑→`building`/`landmark`/`castle`/`home`/`store`；教育→`graduation-cap`/`book`/`pen-tool`；
自然→`mountain`/`tree-pine`/`leaf`/`sun`/`moon`/`flame`/`droplet`/`snowflake`；成就→`trophy`/`medal`/`crown`/`award`/`star`/`gem`；
新闻→`newspaper`/`mic`/`camera`/`video`；全球→`globe`/`map`/`compass`；警告→`alert-triangle`/`zap`/`siren`；礼物→`gift`/`package`。
图标密集细节多，建议 `s:1.2–1.8, lw:3–3.5, dur:0.6–0.9`；手绘件适合大场景 `s:2+`。
讲"变化/转换"用 `shapeMorph`；证据感用 `tornCard`。

**冲击特效（components/fx.js，落点叠加增强"冲击感"）**
`shockwave`（双环冲击波，砸入/落定配）、`sparks`（粒子飞射，可定向 spread）、`speedlines`（全屏速度线，转折/快推）、
`rays`（放射光，权威/神迹感）。拍首转场：film.json `"wipe": true|bands|ink|bar|scan`（主题默认：tech=bands 斜切色带、
history=ink 墨晕、code=scan 扫描线、news/finance=bar 横推；盖场景不盖字幕）。

**动效语义（每种动效都在说话）**：outExpo=带着意图到达；spring=活的/落地；drawOn=被画出/被连接；
stagger=它们是一组；hold=这很重要读它；punch=事件发生了。

**punch 安全区（重要）**：punch 的缩放是"推近后停住"且对场景内容常驻（chrome 不缩放）。
16:9 下场景内容必须放在 **x ∈ [200, 1400]、y ∈ [120, 780]**（punch 1.2 后右缘 ≤1560、底 ≤816，
不进字幕带 830+，也抗播放器 5-10% 裁切）；竖屏按比例（x ∈ [110, W÷1.2-110]、y ∈ [120, H-500]）。

**脉冲节奏硬规则（禁匀速慢推）**：运动动在事件上——停住 → 快推/砸入 → 停住。
场景级快推写在 film.json `punches: [[at, dur, k]]`（0.28s 推 20% 后停）；`beatKick: true` 开拍点呼吸。
入场 0.3–0.4s、退场 0.18s（`MO.exitFx` 统一语言）、落定后停 ≥0.5s；主词停留 ≥0.5s、辅句 ≥1.0s。
同一时刻只让一个东西入场；先结构、后数据、最后标注；颜色=概念（语义色 ≤4 种）。

## 文字→组件映射（写 storyboard.js 时按稿选件）

| 稿件里出现 | 组件 | 备注 |
|---|---|---|
| 流程/步骤/阶段 | `timelineN` + `stepIntro` | 节点数=步骤数，节点卡随进度点亮 |
| 数字/规模/占比 | `numCounter` | 数值先进 data.js 并核实；两组数字用"对撞" |
| 二选一/费用/对比 | `compareBars` | 条长按真实数值比例 |
| 清单/要点/条件 | `checkList` | 逐条点亮配 tick 音 |
| 路径/流转/链路 | `flowPath` | 连线生长+流动光点 |
| 时间线/期限/审核 | `progressRing` / `dateCard` / `progressBadge` | 环=环节数；徽章配 1–N 刻度 |
| 资质/文件/条款 | `folder` / `stamp` + `seal` | stamp 砸入配重击音+震屏 |
| 产品/界面/App | `phoneMock` + `phoneScreen` | 线框→上色→精修三阶段内置 |
| 代码/命令/终端 | `codePanel` | 语法三色，滚动由 t 决定 |
| 强调/反常识断言 | 角框徽标（自绘，参考 examples/wxminipro S6） | ≤14 字 |
| 情绪收尾/金句 | `endingLine` + `iconGlow` | 收尾不加数据 |

## 装饰边框挂 FILM.frame（chrome 层）

边框/界栏/水印类装饰**不要画在场景里**（会被 punch 缩放推出画外或半帧消失），挂到 `FILM.frame = (ctx, t) => {}`：
scaffold 在场景之后、字幕之前调用，**不随 punch 缩放、整片稳定**。`progress:false` 贴底字幕模式下，
边框必须把字幕带包进同一风格区（下边线 ≥ H-40），否则字幕掉在框外形成风格断裂的空带。

## 进度轨判定（film.json `"progress": true|false|缺省`）

| 内容类型 | progress | 底部呈现 |
|---|---|---|
| 流程/教程/清单/章节旅程、≥60s 知识片 | `true` | 进度轨（拍刻度+进度+游标） |
| 情绪/故事/品牌/金句型、≤45s 短片 | `false` | 无轨，**字幕自动贴底（H-92）补位**，不留空带 |
| 拿不准 | 缺省 | 自动：时长≥50s 且拍数≥5 才显示 |

有 timeline 的片子 progress 恒不生效（时间轴本身就是进度）。分镜阶段按文案类型显式写入 film.json，别依赖缺省。

## 竖屏指南（9:16 及一切窄画幅，宽 < 1280）

- **单列布局**：内容卡居中（x=(W-卡宽)/2），卡宽 ≤ W-160；不做左右双栏。
- **chrome 自动适配**：顶栏 y=66、字幕锚定 H-190（每行字数=按宽算）、时间轴 H-72 紧凑模式、
  双数字自动竖排（numCounter W<1280 且多项时）——这些不用你管。
- **要你管的坐标**：组件 y 避开三个保留带——顶栏带（0–110）、字幕带（H-250～H-140）、
  时间轴带（H-110～H）；内容主区 120 ～ H-260。
- 字号整体可小一档（-15%），钩子大字 ≤ W-160 宽（fitText 会自动兜底）。
- 拍数可比横屏多 1–2 拍（竖屏观看更耐长节奏），钩子仍 ≤3s。

## 拍长与节奏

- 每拍 = 整数小节（小节长 = 4×60/BPM）。`voice.py plan` 自动把"句子组时长+呼吸"向上取整到小节。
- 主节奏 6–8s 一个转折；300s 长片允许 10s 大拍，但不允许 >12s 无画面事件。
- 相邻两拍换构图（左重右轻/中心/满幅交替），不换画风——**全片一套主题**。
- 每拍至少一个"落点"（组件砸入/点亮/划线），音效落在落点帧上。
