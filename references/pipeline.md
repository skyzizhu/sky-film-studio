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
# 看图、看片段、修改并复查
python3 "$S/engine/audio.py" build --project "$FILM"
python3 "$S/engine/check.py" auto --project "$FILM"
python3 "$S/engine/encode.py" --project "$FILM" --output "$FILM/out/film.mp4"
python3 "$S/engine/check.py" delivery --project "$FILM" --video "$FILM/out/film.mp4"
```

C 模式 voice:{}，字幕在 film.subtitles 中；不运行 voice。D 模式使用 import 和源时间码，禁止 place。

- preflight/storyboard：快速结构、事实证据结构、音频文件/时长、字幕速度检查。--strict 将待校对状态阻断；程序不会核实来源内容是否真实。
- render --keys：默认按每拍初期/中段/完成附近采样，也可传具体秒数。--preview 为实时预览。动作检查应补有代表性的短片段。
- auto：严格预检 → 关键帧与乱序确定性检查 → 等比拼图 → 必要的音频构建/校验 → 仅过期时全片渲染 → 边缘亮度提示。不会为每轮预检重渲整片；不会跳过缺失混音并宣称交付通过。
- delivery：检查必要产物/构建指纹、H.264/AAC、画幅、帧率、时长与视频散列，写 checks/delivery.json。人工观看/试听另行完成，报告明确列出该要求。
- 不同 W/H 的拼图保持比例；edges 是提示，亮背景与装饰出血不当成硬错误。必要内容是否被切、文字是否压盖仍靠看图或专门几何校验。

## 项目配置

```json
{"title":"片名","theme":"tech","duration":60,"fps":30,"bpm":105,
 "width":1920,"height":1080,"progress":false,
 "music":{"mode":"minor","arpDensity":1},
 "voice":{"cues":"audio/cues.json","duck_db":-8,"timing":"tts"},
 "beats":[{"id":"b0","scene":"s0","start":0,"end":60,
           "sentences":[0],"energy":0.5,"sfx":[],"note":"主角/变化/构图"}],
 "ending_fade":[58,59.5]}
```

示例只说明字段，实际句子需落在所属拍内、片末淡出之前；拍连续覆盖全片。fps 不写死在编码命令。frames 数为 ceil(duration×fps)，没有额外片尾帧。film.json 是主题/进度的权威，旧 FILM.theme 只作为缺省兼容。

字幕：句级时间窗内按实际字体测宽，最多两行一页，长句分页而不丢字；分页按文本长度分摊句长，属于阅读排版，不是词级对齐。默认最多 12 字符/秒（可用 subtitles_max_cps 按语言调整），过快应修改时长或文稿。

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

build/*.json 记录保守依赖指纹：代码、配置、cues、源音频与素材变化会使产物过期。frames/audio/video 重新构建后记录新状态；缓存和 checks 不影响指纹。旧项目没有快照时应先备份，再按需复制新引擎并检查 index.html 的依赖装载，不自动改写旧影片。

zip 包含成片、源文件、vendor/engine、requirements、assets、claims/provenance、文稿分镜、audio 分轨、checks 和 build 记录；排除 .git/.cache/frames 与任何凭证。跨机器或重新打包后仍应执行 auto/编码/验收，不把旧构建记录当免检证明。

## 常见操作问题

- 渲染通过 localhost 服务加载资源；不要切回 file://，避免字体 CORS。
- 下载字体后检查 sfnt 表边界；字体加载门控成功不等于未回退，正式渲染必须 --strict-fonts。
- cues 路径统一使用 film.voice.cues；不存在时报错，不静默丢字幕或音轨。
- 字幕烧帧：place/改稿 → audio build → full render → encode → delivery。auto 的指纹可发现过期产物。
- 入场与转场的中间态应单独看；动画快慢、图形结构正确与否无法靠亮度扫描证明。
