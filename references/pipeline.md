# 管线：引擎命令、film.json、ffmpeg、常见坑

## 命令速查（$S = 本 skill 目录；<film> = 项目目录）

```sh
# 新建项目（vendor 自包含）
python3 $S/engine/new.py <film> --name 片名 --theme tech

# 语音（B：逐句合成 → 节拍分镜草案）
python3 $S/engine/voice.py say    --project <film> [--mode volc|system] [--voice 名] [--gap 0.45] [--reuse]
python3 $S/engine/voice.py import --project <film> --audio 录音.wav [--text 文稿.txt]
python3 $S/engine/voice.py plan   --project <film> [--bpm 100] [--target 7.2]
python3 $S/engine/voice.py status

# 渲染（关键帧 → 自查 ≥2 轮 → 全片）
python3 $S/engine/render.py --project <film> --keys "1.5,6,12,..."
python3 $S/engine/render.py --project <film> --full

# 音频（BGM+SFX 能量曲线合成，cues duck，母带 -1dB）+ 校验
python3 $S/engine/audio.py build --project <film>
python3 $S/engine/check.py  audio --project <film>
python3 $S/engine/check.py  sheet --project <film> --n 4

# 合成
ffmpeg -y -framerate 30 -i <film>/frames/f%05d.jpg -i <film>/audio/mix.wav \
  -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  -movflags +faststart <film>/out/<名>.mp4
```

## film.json schema

```json
{ "title": "顶部常驻标题", "theme": "tech", "duration": 61.2, "fps": 30,
  "bpm": 105, "width": 1920, "height": 1080,
  "music": { "mode": "minor", "arpDensity": 1.0 },
  "voice": { "cues": "audio/cues.json", "duck_db": -8 },
  "chrome": { "titleAt": 1.7 },
  "beats": [ { "id": "hook", "scene": "s0", "start": 0, "end": 2.4,
               "energy": 0.9, "sentences": [0],
               "sfx": [[0.0, "boom", 0.9], [0.85, "ping", 0.2]] } ],
  "ending_fade": [56.8, 59.6] }
```

- `duration` 由 plan 算出（Σ小节），渲染与音频都以它为准；frames = ceil(duration×fps)+1。
- `energy` 0–1 → 织体：>0.15 贝斯，>0.25 底鼓，>0.45 军鼓+镲，>0.55 琶音，>0.8 重击/切分。
- `sfx` kind：`boom ping tick key ding chime stamp thock clock strike pageturn blip whoosh swell`（第 4 元素可选传频率参数）。

## 常见坑（做片前读一遍）

1. **Chromium file:// 字体 CORS**：FontFace 加载本地 OTF 被拦 → render.py 已内置 127.0.0.1 HTTP server，别改回 file://。
2. **字体下载截断**：GitHub OTF 可能截断且 `file` 仍识别 → sfnt 表目录校验（表偏移+长度 ≤ 文件长）。
3. **letterSpacing**：字符串带单位，Chromium 99+；用前判 `"letterSpacing" in ctx`。
4. **draw 冒烟**：导帧前 render.py 会全时间轴采样跑 draw() 抓 JS 异常，别跳过。
5. **音频数组长度**：不同时长音效相加前 np.pad 对齐。
6. **字幕/时间轴抢位**：字幕基线 y≈884；时间轴线 y=1008、卡 y=1046；组件底部文字别越过 y≈950。
7. **toDataURL 性能**：1920×1080 jpeg ≈ 40ms/帧，批量 30 帧/次 evaluate。
8. **火山 speech_rate**：只放 audio_params；超时=结果未知不重试；`say --reuse` 改稿只重合成改动句。
9. **skill 目录写入**：往 `~/.agents/skills/` 装文件用 shell（cp/写文件）并 `find` 校验——本机曾出现工具写入被回滚的情况。
10. **数字读音**：小数/年份先试听；不顺改中文写法进 narration.txt。

## 交付与回流

mp4 + zip（index.html/data.js/storyboard.js/film.json/narration.txt/audio wav 与 py/检查图/README）。新坑写 `references/experience.md`（一行结论+一行证据）。
