# 构建、检查与交付

## 命令（S=技能目录；FILM=影片目录）

```sh
python3 "$S/engine/new.py" "$FILM" --name 片名 --theme tech --ratio 9:16
# 写 data.js / claims.json / narration.txt；语音按 voice.md
python3 "$S/engine/voice.py" say --project "$FILM" --mode system --reuse
python3 "$S/engine/voice.py" plan --project "$FILM"
python3 "$S/engine/voice.py" plan --project "$FILM" --apply
# 完成 storyboard.js；核查 claims，录音另核对 alignment
python3 "$S/engine/check.py" preflight --project "$FILM"
python3 "$S/engine/render.py" --project "$FILM" --keys
python3 "$S/engine/check.py" sheet --project "$FILM" --n 4
# 检查连续动作：无声 MP4，绝对时间，不重建/覆盖全片 frames 或构建指纹
python3 "$S/engine/render.py" --project "$FILM" --clip 10,13 --output "$FILM/checks/motion.mp4" --strict-fonts --determinism
# 看图、看片段、修改并复查
# auto按依赖补建音频与画面；需要明确强制重混时才直接运行audio.py build。
python3 "$S/engine/check.py" auto --project "$FILM"
python3 "$S/engine/encode.py" --project "$FILM" --output "$FILM/out/film.mp4"
python3 "$S/engine/check.py" delivery --project "$FILM" --video "$FILM/out/film.mp4"
```

C 模式 voice:{}，字幕在 film.subtitles 中；不运行 voice。D 模式使用 import 和源时间码，禁止 place。

- preflight/storyboard：快速结构、事实证据结构、音频文件/时长、字幕速度检查。--strict 将待校对状态阻断；程序不会核实来源内容是否真实。
- render --keys：默认按每拍初期/中段/完成附近采样，也可传具体秒数。--preview 为实时预览。动作检查应补有代表性的短片段。
- auto：严格预检 → 必要的音频构建/校验 → 关键帧与乱序确定性检查 → 等比拼图 → 仅过期时全片渲染 → 边缘亮度提示。不会为每轮预检重渲整片；不会跳过缺失混音并宣称交付通过。
- delivery：检查必要产物/构建指纹、H.264/AAC、画幅、帧率、时长与视频散列，写 checks/delivery.json。人工观看/试听另行完成，报告明确列出该要求。
- 不同 W/H 的拼图保持比例；edges 是提示，亮背景与装饰出血不当成硬错误。必要内容是否被切、文字是否压盖仍靠看图或专门几何校验。

## 项目配置

```json
{"title":"片名","theme":"tech","duration":60,"fps":30,"bpm":105,
 "width":1920,"height":1080,"progress":false,
 "music":{"mode":"minor","arpDensity":1},
 "voice":{"cues":"audio/cues.json","duck_db":-14,"timing":"tts"},
 "beats":[{"id":"b0","scene":"s0","start":0,"end":60,
           "sentences":[0],"energy":0.5,"sfx":[],"note":"主角/变化/构图"}],
 "ending_fade":[58,59.5]}
```

示例只说明字段，实际句子需落在所属拍内、片末淡出之前；拍连续覆盖全片。fps 不写死在编码命令。frames 数为 ceil(duration×fps)，没有额外片尾帧。film.json 是主题/进度的权威，旧 FILM.theme 只作为缺省兼容。

字幕：默认保留底部预留区；仅当已核对构图时用全局或每拍 `subtitleY` 指定像素基线。回声字/typography 字段不会自动上移字幕。浅底主题关闭黑色文字光晕。句级时间窗内按实际字体测宽，最多两行一页，长句分页而不丢字；分页按文本长度分摊句长，属于阅读排版，不是词级对齐。默认最多 12 字符/秒（可用 subtitles_max_cps 按语言调整），过快应修改时长或文稿。

claims.json：

```json
{"reviewed":true,"claims":[
 {"id":"scale","kind":"fact","statement":"具体事实主张","data_key":"main.roll",
  "source":"直接来源 URL 或用户数据文件","accessed":"2026-10-27",
  "period":"统计期","unit":"单位","verified":true},
 {"id":"demo","kind":"example","display_label":"示例数据，非事实统计"}
]}
```

data.js 的 claimId 指向该 ID。reviewed 代表已检查完整事实覆盖，不能仅为通过门禁设置。示例标识需真实出现在画面，结构检查无法替代这一步。

## 复现与依赖

new.py 只接受空目录；现有片子直接维护文件，不重复初始化。项目含 vendor JS、engine Python、requirements、provenance.json（引擎 revision/素材与字体来源）、assets/fonts；版本快照保证可追踪，复现仍需相容 Python、Chromium 和系统 ffmpeg。

build/*.json 分别记录frames、audio、video与checks的依赖和产物散列。旧schema首次检查要求重建，不把旧指纹直接标成新版本通过。旧项目没有快照时应先备份，再按需复制新引擎并检查 index.html 的依赖装载，不自动改写旧影片。

zip 包含成片、源文件、vendor/engine、requirements、assets、claims/provenance、文稿分镜、audio 分轨、checks 和 build 记录；排除 .git/.cache/frames 与任何凭证。跨机器或重新打包后仍应执行 auto/编码/验收，不把旧构建记录当免检证明。

## 常见操作问题

- 渲染通过 localhost 服务加载资源；不要切回 file://，避免字体 CORS。
- 下载字体后检查 sfnt 表边界；字体加载门控成功不等于未回退，正式渲染必须 --strict-fonts。
- cues 路径统一使用 film.voice.cues；不存在时报错，不静默丢字幕或音轨。
- 字幕烧帧：place/改稿 → audio build → full render → encode → delivery。auto 的指纹可发现过期产物。
- 入场与转场的中间态应单独看；动画快慢、图形结构正确与否无法靠亮度扫描证明。

## 配乐分层与最终响度

`music.layers` 可独立设置 `pad/bass/percussion/snare/hats/lead/shimmer` 增益（0关闭，支持0–2），`beat.music.layers` 可覆盖当前段落。`music.leadDensity` 设置主题主奏每小节约 `4×density` 个音；低能量主题仍可有稀疏旋律，不再要求 energy>0.55。旧常规主题未显式指定 lead 时保持原门槛。实际编曲记录在 `checks/arrangement.json`；乐器名不等于实际发声记录。段落参数在小节边界采样，语义音效仍用精确事件时间。

`voice.duck_attack/duck_release` 分别控制配乐闪避进入与恢复（默认0.18/0.65秒）；保留短句间的自然衔接，不强制每句末立刻恢复满音量。可用 `brush/paper/clay` 合成动作音效；它们是声音示意，不是历史工具录音。p可为brush/paper的时长（0.02–5秒）。

`audio_master` 示例：`{"integrated_lufs":-16,"true_peak_dbtp":-1,"loudness_tolerance":1}`。这是可调的交付默认，不代表所有平台统一标准。encode.py 对源混音做两遍测量/归一化，为AAC留真峰值余量，测量编码结果后才写构建成功；delivery 再测最终解码音轨。采样峰值/RMS不能代替LUFS与dBTP。超限失败时查看实际音轨与目标，不能只修改验收阈值。工具依据：[FFmpeg loudnorm](https://ffmpeg.org/ffmpeg-filters.html#loudnorm)。

动作与共享状态的接口见 [process.md](process.md)。短片段输出的相对路径以调用命令时的工作目录解析，不随服务端切换到项目目录。

## 分阶段复用与自定义依赖

| 修改 | 必要的重建 | 可保留 |
|---|---|---|
| 场景JS、HTML、字体、图像 | frames、video，重新检查 | audio |
| 配乐、动作声、源录音 | audio、video，重新检查 | frames |
| 字幕文字 | frames、video，重新检查 | 已有音频；改口播正文仍须先重新合成 |
| cues起止、共有events、时长、BPM | frames、audio、video，重新检查 | BPM可能驱动beatKick |
| audio_master、编码器 | video、重新检查 | frames、audio |
| 检查/ASR脚本、史料、provenance | 检查 | frames、audio、video |

encode.py在依赖与目标文件散列一致时复用成片。实际帧、混音、视频被替换或损坏时不能只凭源配置复用；记录还包含产物散列。auto仍刷新关键帧与技术检查，“未重渲全片”不等于不执行验证。相同源码的仓库引擎与项目快照采用一致依赖标识。缓存适用于相容运行环境；浏览器、Python依赖或FFmpeg版本改变时重新构建相关产物。

默认分离遵循内置运行器的数据用途：music/soundscape、每拍sfx/music/energy等不参与画面；音频不依赖字幕排版、场景函数名、字体等。自定义场景若读取这些音频字段、词时码、混音波形或检查文件，须声明补充依赖；不能假设任意自定义JS的读取都能被自动推断。

```json
{"build_dependencies":{
 "frames":{"paths":["audio/words.json"],"film_fields":["music","beats"]},
 "audio":{"paths":["assets/custom-sound.wav"]}
}}
```

paths为项目相对文件或glob，必须存在，禁止绝对路径和上级跳转；film_fields为点分隔字段路径，数组可声明整个beats。只添加本片真正读取的补充项，普通句级字幕片无需添加words.json。若可视化audio/mix.wav，先audio build保证输入存在，再auto。不要声明读写同一产物的循环依赖。说明文档和输出目录通常不影响媒体；自定义代码读取它们时也需声明。
