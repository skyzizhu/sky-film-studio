# sky-film-studio

**一句话 / 一份文稿 / 一段录音 → 30 秒到 5 分钟的电影感知识解说短片。**

规格驱动、代码生成的视频 skill：事实先核实、数字可溯源、句级 cues 统筹口播、字幕和分镜，BGM 默认本地合成、画面逐帧确定性渲染，交付 H.264+AAC 的 mp4。它跑在 AI Agent（ZCode/Claude Code/Codex 等）里，你用自然语言指挥，Agent 按本 skill 的流程当导演、事实核查员、作曲和动画师。

```
你的话 ──► 事实核查(WebSearch) ──► data.js + claims.json(事实与来源)
      ──► 口播(火山TTS/系统声/你的录音, 句级cues)
      ──► 句级分镜与语义事件 ──► Canvas draw(t) 确定性动画
      ──► BGM/SFX 合成(numpy, 口播自动闪避) ──► ffmpeg ──► mp4
```

---

## 一、它能干什么

| 能力 | 说明 |
|---|---|
| 四种成片模式 | 一句话自动调研写稿 / 给口播文稿直接成片 / 无口播纯画面+字幕+BGM / 用你的配音录音驱动画面 |
| 事实硬规则 | 事实主张关联 claims.json 与直接来源；动画参数、序号和已标示示例另行处理 |
| 三方强同步 | 音频、字幕和 duck 共用句级 cues；逐句 TTS 可落位，用户录音锁源时间；词级事件需额外对齐 |
| 主题系统 | **13 种视听风格**：6 种基础主题 + 7 种渲染主题（水墨/像素/故障/白板/录屏/工程蓝图/博物陈列），主题=渲染引擎+配色+音色 |
| 实体管线 | 按表达目标选参考素材、原生SVG或部件实体；入场、动作和退出分开，跨镜头保持身份 |
| 材质光影 | 可选陶土、纸、金属和木纹；抬升接触阴影、局部扫光和剖面对齐导线，详见 [接口说明](references/materials.md) |
| 文字动效 | 主词砸入/槽里升起/打字机/逐字浮出/荧光笔·下划线·圈注 |
| 冲击特效 | 冲击波/粒子飞射/速度线/放射光 + 四式拍首转场（色带/墨晕/横推/扫描线） |
| BGM/SFX | Python 本地合成（记录代码与素材来源），能量曲线跟分镜，口播段自动 duck，混音采样峰值 -1dB；编码后响度/真峰值检查 |
| 任意比例 | 默认 16:9；说"竖屏"→9:16；可点名 1:1/4:3/4:5/2.35:1/任意 W:H |
| 质检闭环 | 严格预检、关键帧/确定性、音频与过期重建；编码后 delivery；画面和试听仍须复查 |
| 完全离线 | 字体（35MB）、图标（245 个）、渲染引擎全部内置 `assets/`+`components/`，依赖安装完成后可离线渲染 |

**时长边界**：30 秒 ~ 5 分钟（默认 60s，超界先和你商量收敛）。

## 二、支持哪些文案类型（主题自动匹配）

| 内容类型 | 视听风格 | 氛围与转场 | 配乐 |
|---|---|---|---|
| 科技 / 互联网 / AI | 近黑蓝+**电光青** | 代码雨+数据光带 / 斜切色带转场 | 小调电子 105BPM |
| 历史 / 人文 | 宣纸暗+朱砂+墨 | 纸纹斑驳+墨晕 / 墨晕开转场 | 五声拨弦 85BPM |
| 新闻 / 时事 | 深蓝+白+**暖橙** | 斜网格+红条+LIVE 呼吸点 / 横推 | 大调鼓点 115BPM |
| 技术分享 / 教程 | 近黑+终端绿 | 网格+扫描亮线 / 扫描线转场 | 极简脉冲 100BPM |
| 商业 / 财经 | 深蓝黑+**铂银** | 网格+上行虚线影 / 横推 | 大调沉稳 100BPM |
| 通用兜底 | 暗金电影感 | 金尘 / 色带 | 小调 100BPM |
| **水墨 ink** | **宣纸纤维+fBm山脊+墨晕+红印** | 噪声山脊流动+墨晕扩散诞生 | 五声古筝 72BPM |
| **像素 pixel** | **低分辨率等比缩放+16色量化** | 可选步进时间+像素化后处理 | chiptune 130BPM |
| **赛博 glitch** | **RGB三通道分离+切片位移+CRT扫描线** | 故障闪现（RGB分离→归位） | 失真锯齿 128BPM |
| **白板 whiteboard** | **白板底+磁铁+笔托**（浅色主题） | 毛边手绘（双遍随机偏移） | 合成尼龙弦 92BPM |
| **代码录屏 screencast** | **假IDE（文件树+语法高亮+逐字打字+终端）** | 字符级打字+光标闪烁 | lo-fi 90BPM |

| **工程蓝图 blueprint** | 深蓝工程网格与清晰线条 | 结构/原理示意 | FM 电钢 96BPM 小调 |
| **博物陈列 museum** | 墨绿陈列底与柔光 | 物件/工艺展示 | 合成古筝 76BPM 五声 |

## 三、安装

```bash
# 1）克隆到 Agent 的 skills 目录
git clone https://github.com/skyzizhu/sky-film-studio.git ~/.agents/skills/sky-film-studio

# 2）依赖（缺哪个装哪个）
python3 -m pip install -r ~/.agents/skills/sky-film-studio/requirements.txt
python3 -m playwright install chromium       # 渲染引擎
brew install ffmpeg                          # 合成（macOS 示例）
```

**可选：火山口播配置**（不配可显式选 macOS 系统声音；无口播片由用户选择）

```bash
# 凭证（二选一）：环境变量或 ~/.volc.env
cat > ~/.volc.env <<'EOF'
export VOLC_SPEECH_APPID=你的appid
export VOLC_SPEECH_TOKEN=你的token
EOF

# 偏好（可选）：~/.config/sky-film-studio/media.json
{ "preferences": { "voice": { "mode": "clone", "voice_ref": "liufei" } },
  "policy": { "cloud": "allow", "paid_api": "allow" },
  "bindings": { "volcengine": { "env_file": "~/.volc.env" },
                "voices": { "liufei": { "entry": "liufei" } } } }
```

兼容读取 `~/.config/huashu/media.json` 与 `~/.koubo/voices.json`（已有 koubo/huashu 配置直接生效）。凭证永不进聊天、不进项目目录。

**离线说明**：字体（Noto Serif SC ×3 + LXGW WenKai）、图标（lucide 137 + phosphor 108）、渲染引擎全部内置在仓库中，`git clone` 后完全离线可用。唯一需要网络的是：火山 TTS（可选，回退系统声）和事实核查 WebSearch（按需）。

装好后对 Agent 说"**用 sky-film-studio 做一支……**"即可触发；命令行手动管线见第七节。

## 四、怎么用：分场景自然语言速查（重点）

### 场景 A：有口播文案（最常用）——给文稿，直接成片
> - "用 sky-film-studio 把这份口播稿做成 60 秒视频：……（贴文稿）"
> - "这是一段 90 秒的解说词，做成竖屏的，口播用我的默认音色"
> - "帮我把这篇稿子做成片子，里面的数字你先核实一遍再上画面"
> - "按这份文案做视频，历史题材，要有那种纸墨卷轴的味道"

Agent 流程：断句 → 逐句火山 TTS → 按实际音频时长分镜与落位 → 提取关键词/实物逐拍分镜 → 渲染 → 交付 mp4。

### 场景 B：没有文案，只有主题或一句话——自动调研写稿
> - "用 sky-film-studio 做一支 60 秒的片子：中国高铁为什么快"
> - "给我做一支 2 分钟的科普视频，讲清楚什么是大模型幻觉，横屏"
> - "一句话：'普通人怎么买黄金'，做成竖屏 45 秒"

Agent 流程：WebSearch 调研 → 事实核实 → 在字数预算内写口播稿（60s≈240-270 字）→ 走场景 A。

### 场景 C：不要口播——纯画面 + 字幕 + BGM
> - "做一支无声科普视频，不要配音，画面配字幕和音乐就行"
> - "这支不要口播，节奏靠音乐带，主题是冥想的好处，竖屏"

不调用任何语音服务；字幕仍逐句有，节奏由 BGM 能量曲线驱动。

### 场景 D：已有配音录音——音频驱动画面
> - "我有一段 90 秒的配音（audio.wav），配一支画面，科技风"
> - "这是我自己录的解说（me.m4a），文稿也给你（script.txt），画面跟着我的声音走"

Agent 流程：能量切句探测 → 生成句级 cues（给文稿则自动对齐文本）→ 分镜跟随录音节奏。

### 常用调整（任何模式下随口说）
> - "换成竖屏 / 换成 2.35:1 电影宽幅"
> - "换成历史风格试试" "新闻感再强一点"
> - "口播换女声" "用系统声音，别调云服务" "这段重新配：……（改后的句子）"
> - "第 3 拍的火箭太丑了，换成 trending-up 图标"（实物可点名换）
> - "节奏快一点，每拍别超过 5 秒"
> - "片尾那句改成：……"

## 五、预览工作台 / 模板 / 自检门禁

- **实时预览**：`render.py --project <项目> --preview` → 浏览器拖时间轴实时调 draw(t)（金线=拍、红条=口播、点击取坐标、空格播放、←→逐帧），指哪改哪
- **参数化模板**：`new.py <项目> --template daily-brief|how-to|fact-card`，改 data.js 变量即出同款新片（日更快讯/N 步流程/数据卡片）
- **技术检查**：`check.py auto --project <项目>`——严格预检→关键帧/确定性→拼图→音频→过期时重渲；边缘亮度仅提示；编码后再 delivery，并人工检查画面/试听
- **渲染引擎主题**：`new.py <项目> --theme ink|pixel|glitch|whiteboard|screencast`——主题=渲染引擎，不只是配色：水墨用 fBm 噪声画山、像素做 16 色量化、故障做 RGB 分裂、白板使用浅色底、录屏画假 IDE

## 六、交付物

每支片子一个自包含目录（可 zip 复现）：`mp4 成片` + `index.html/data.js/storyboard.js/film.json/narration.txt` + `audio 分轨(bgm/sfx/voice/mix)` + 静帧检查图。

## 七、命令行（手动管线，Agent 内部也走这套）

```bash
S=~/.agents/skills/sky-film-studio
python3 $S/engine/new.py <项目> --name 片名 --theme tech --ratio 9:16   # 建项目（vendor 自带）
python3 $S/engine/voice.py say    --project <项目>                       # 逐句TTS → cues.json
python3 $S/engine/voice.py import --project <项目> --audio 录音.wav --text 文稿.txt
python3 $S/engine/voice.py plan --project <项目>                         # 只生成草案
python3 $S/engine/voice.py plan --project <项目> --apply                 # 审阅后应用；录音模式不place
python3 $S/engine/check.py preflight --project <项目>
python3 $S/engine/render.py --project <项目> --keys --strict-fonts --determinism
python3 $S/engine/render.py --project <项目> --clip 10,13 --output <项目>/checks/motion.mp4
python3 $S/engine/audio.py build --project <项目>
python3 $S/engine/check.py auto --project <项目>
python3 $S/engine/encode.py --project <项目> --output <项目>/out/成片.mp4
python3 $S/engine/check.py delivery --project <项目> --video <项目>/out/成片.mp4
python3 $S/engine/render.py --project <项目> --preview
```

**铁律**：cues 任何变更（place/改稿）后，顺序是 `audio.py build → check.py auto → encode.py → delivery`，自动发现受影响产物（字幕烧在帧里）。

## 八、工作原理（一分钟版）

- **确定性渲染**：画面=纯函数 `draw(t)`，种子随机、无 Date/rAF，同一 t 渲两次逐像素一致；Playwright 批量导帧（约 40ms/帧）。
- **时间轴**：以实际 cues 为共同依据；用户录音保留源时间码，小节网格辅助剪辑，不能替代字词对齐。
- **数字唯一来源**：`data.js` 常量表+来源，动画只从它读数。
- **主题三件套**：palette + 氛围层 + 转场，scaffold 自动装配。
- **图标桥**：原始 SVG 同步编译 Path2D 保留曲线；旧逐笔接口按需惰性采样，无图像异步加载竞态。
- **渲染引擎**（v7）：每个主题可拥有独立渲染引擎（bg/begin/post/overlay 四阶段），改变"画画方式"本身——水墨用 fBm 噪声、像素做低分辨率量化、故障做 RGB 通道分离、白板用毛边手绘、录屏画假 IDE。
- **同步覆盖所有渲染引擎**：字幕在 renderer.post 之后渲染（像素化/RGB 分裂不影响字幕可读性）；口播 TTS 在 audio.py 层与渲染无关，所有主题共用同一份句级 cues。

## 九、目录结构

```
SKILL.md               Agent 主契约（四模式/硬规则/流程）
engine/                lib/motion/scaffold/render/voice/audio/check/new/icons/renderer (.js/.py)
components/            base/datafx/mockups/textfx/objectfx/fx/iconlib/icons
                       entityfx(实体管线) entities(手绘件) paintfx(双色分面/手绘抖动/笔刷)
                       icons.js(137线稿) icons-fill.js(108实心双色)
themes/                themes.js(11主题) + decor.js(氛围层) + renderer.js(引擎管理)
themes/renderers/      ink/pixel/glitch/whiteboard/screencast（5 个渲染引擎）
assets/fonts/          NotoSerifSC ×3 + LXGWWenKai（内置字体，离线可用）
templates/             daily-brief / how-to / fact-card（参数化模板）
references/            分镜映射/语音协议/主题规格/管线命令/经验回流
examples/wxminipro/    已交付 60s 参考片源码（微信小程序从0到上架）
```

第三方：线稿图标 [lucide](https://lucide.dev)（ISC）；实心图标 [phosphor](https://phosphoricons.com)（MIT）；字体 Noto Serif SC、LXGW WenKai 及专属展示字体见 assets/fonts。制作方法亦参考 [code-video-showcase](https://github.com/Moessif/code-video-showcase)，适配范围见 [showcase.md](references/showcase.md)。

工艺演示支持接触遮罩、实体身份保持、镜像转印与抬起/搬运/放下；见 [process.md](references/process.md)。配乐支持独立分层、段落覆盖与可配置闪避；最终MP4按可配置LUFS/dBTP验收，见 [pipeline.md](references/pipeline.md)。

可选本地词时码与关键动作绑定、事件同源音效和内容局部镜头框景已接入；完整音轨的自动转录/源波形检查与真人试听状态分开记录。ASR依赖独立于核心渲染，见 [voice.md](references/voice.md)。
