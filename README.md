# sky-film-studio

**一句话 / 一份文稿 / 一段录音 → 30 秒到 5 分钟的电影感知识解说短片。**

规格驱动、代码生成的视频 skill：事实先核实、数字可溯源、口播与字幕与画面三方强同步、BGM 全合成无版权、画面逐帧确定性渲染，交付 H.264+AAC 的 mp4。它跑在 AI Agent（ZCode/Claude Code/Codex 等）里，你用自然语言指挥，Agent 按本 skill 的流程当导演、事实核查员、作曲和动画师。

```
你的话 ──► 事实核查(WebSearch) ──► data.js(数字唯一来源)
      ──► 口播(火山TTS/系统声/你的录音, 句级cues)
      ──► 小节网格分镜(100BPM系) ──► Canvas draw(t) 确定性动画
      ──► BGM/SFX 合成(numpy, 口播自动闪避) ──► ffmpeg ──► mp4
```

---

## 一、它能干什么

| 能力 | 说明 |
|---|---|
| 四种成片模式 | 一句话自动调研写稿 / 给口播文稿直接成片 / 无口播纯画面+字幕+BGM / 用你的配音录音驱动画面 |
| 事实硬规则 | 出现的每个数字先 WebSearch 逐条核实并写明来源；核实不了的不进画面 |
| 三方强同步 | 口播音频、字幕、画面共用同一份句级 cues 和小节网格，漂移为 0（句开口=拍起点+0.35s，画面入场略先于声音） |
| 主题系统 | 6 套视听风格（氛围层+粒子+转场+配乐调式+色板），换主题=换整套气质 |
| 实物动画 | 137 个专业矢量线稿图标（lucide，ISC）+ 手绘大件，逐笔描出（"名词画成实物"） |
| 文字动效 | 主词砸入/槽里升起/打字机/逐字浮出/荧光笔·下划线·圈注 |
| 冲击特效 | 冲击波/粒子飞射/速度线/放射光 + 四式拍首转场（色带/墨晕/横推/扫描线） |
| BGM/SFX | Python 纯合成（无版权风险），能量曲线跟分镜，口播段自动 duck，峰值 -1dB |
| 任意比例 | 默认 16:9；说"竖屏"→9:16；可点名 1:1/4:3/4:5/2.35:1/任意 W:H |
| 质检闭环 | 静帧自查 ≥2 轮、低阈值边缘扫描、分轨人声开口点验证、音频 RMS 校验 |

**时长边界**：30 秒 ~ 5 分钟（默认 60s，超界先和你商量收敛）。

## 二、支持哪些文案类型（主题自动匹配）

| 内容类型 | 视听风格 | 氛围与转场 | 配乐 |
|---|---|---|---|
| 科技 / 互联网 / AI | 近黑+暗金+青绿 | 代码雨+数据光带 / 斜切色带转场 | 小调电子 105BPM |
| 历史 / 人文 | 宣纸暗+朱砂+墨 | 纸纹斑驳+墨晕 / 墨晕开转场 | 五声拨弦 85BPM |
| 新闻 / 时事 | 深蓝+白+红 | 斜网格+红条+LIVE 呼吸点 / 横推 | 大调鼓点 115BPM |
| 技术分享 / 教程 | 近黑+终端绿 | 网格+扫描亮线 / 扫描线转场 | 极简脉冲 100BPM |
| 商业 / 财经 | 深蓝+金 | 网格+上行虚线影 / 横推 | 大调沉稳 100BPM |
| 通用兜底 | 暗金电影感 | 金尘 / 色带 | 小调 100BPM |

## 三、安装

```bash
# 1）克隆到 Agent 的 skills 目录
git clone https://github.com/skyzizhu/sky-film-studio.git ~/.agents/skills/sky-film-studio

# 2）依赖（缺哪个装哪个）
python3 -m pip install numpy requests        # requests 仅口播走火山时需要
python3 -m playwright install chromium       # 渲染引擎
brew install ffmpeg                          # 合成（macOS 示例）
```

**可选：火山口播配置**（不配也能用——回退 macOS 系统声音，或做无口播片）

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

装好后对 Agent 说"**用 sky-film-studio 做一支……**"即可触发；命令行手动管线见第六节。

## 四、怎么用：分场景自然语言速查（重点）

### 场景 A：有口播文案（最常用）——给文稿，直接成片
> - "用 sky-film-studio 把这份口播稿做成 60 秒视频：……（贴文稿）"
> - "这是一段 90 秒的解说词，做成竖屏的，口播用我的默认音色"
> - "帮我把这篇稿子做成片子，里面的数字你先核实一遍再上画面"
> - "按这份文案做视频，历史题材，要有那种纸墨卷轴的味道"

Agent 流程：断句 → 逐句火山 TTS → 句级时长量化到小节网格 → 提取关键词/实物逐拍分镜 → 渲染 → 交付 mp4。

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
- **一键门禁**：`check.py auto --project <项目>`——全片渲染→静帧拼图→边缘扫描→音频校验→教学逻辑 lint（钩子≤3s/落点/数字来源/cues 落位），全绿才交付

## 六、交付物

每支片子一个自包含目录（可 zip 复现）：`mp4 成片` + `index.html/data.js/storyboard.js/film.json/narration.txt` + `audio 分轨(bgm/sfx/voice/mix)` + 静帧检查图。

## 七、命令行（手动管线，Agent 内部也走这套）

```bash
S=~/.agents/skills/sky-film-studio
python3 $S/engine/new.py <项目> --name 片名 --theme tech --ratio 9:16   # 建项目（vendor 自带）
python3 $S/engine/voice.py say    --project <项目>                       # 逐句TTS → cues.json
python3 $S/engine/voice.py import --project <项目> --audio 录音.wav --text 文稿.txt
python3 $S/engine/voice.py plan   --project <项目>                       # 分镜草案+口播贴网格
python3 $S/engine/voice.py place  --project <项目>                       # 手改beats后重贴（防音画漂移）
python3 $S/engine/render.py --project <项目> --keys "1.5,6,..."         # 静帧自查（≥2轮）
python3 $S/engine/render.py --project <项目> --full                     # 全片导帧
python3 $S/engine/audio.py  build --project <项目>                      # BGM/SFX/混音
python3 $S/engine/check.py  edges|audio|sheet --project <项目>          # 质检
ffmpeg -y -framerate 30 -i <项目>/frames/f%05d.jpg -i <项目>/audio/mix.wav \
  -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  -movflags +faststart <项目>/out/成片.mp4
```

**铁律**：cues 任何变更（place/改稿）后，顺序是 `audio.py build → render.py --full → ffmpeg`，一步不能省（字幕烧在帧里）。

## 八、工作原理（一分钟版）

- **确定性渲染**：画面=纯函数 `draw(t)`，种子随机、无 Date/rAF，同一 t 渲两次逐像素一致；Playwright 批量导帧（约 40ms/帧）。
- **小节网格是唯一主时钟**：口播、字幕、duck、分镜、BGM 全部对齐同一网格（音画同步零漂移的根源设计）。
- **数字唯一来源**：`data.js` 常量表+来源，动画只从它读数。
- **主题三件套**：palette + 氛围层 + 转场，scaffold 自动装配。
- **图标桥**：lucide SVG 路径 → 浏览器 getPointAtLength 采样 → 弧长逐笔描出。

## 九、目录结构

```
SKILL.md               Agent 主契约（四模式/硬规则/流程）
engine/                lib/motion/scaffold/render/voice/audio/check/new/icons (.js/.py)
components/            base/datafx/mockups/textfx/objectfx/fx/iconlib/icons（17+组件/特效/137图标）
themes/                themes.js(6主题) + decor.js(氛围层)
references/            分镜映射/语音协议/主题规格/管线命令/经验回流
examples/wxminipro/    已交付 60s 参考片源码（微信小程序从0到上架）
```

第三方：图标 [lucide](https://lucide.dev)（ISC）；字体 Noto Serif SC（OFL）；其余全部自研合成。
