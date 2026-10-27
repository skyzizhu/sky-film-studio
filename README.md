# sky-film-studio

把一句主题、一份文稿或一段录音制作成 30 秒到 5 分钟的知识解说短片。技能生成确定性的 Canvas 动画，配合句级字幕、火山或 macOS 系统配音、Python 合成音乐，交付 H.264 + AAC 视频与源码。

适用于 Codex 等能运行 Python、Playwright 和 ffmpeg 的 Agent。默认横屏，也支持竖屏和指定比例。

## 使用

```sh
git clone https://github.com/skyzizhu/sky-film-studio.git ~/.agents/skills/sky-film-studio
cd ~/.agents/skills/sky-film-studio
python3 -m pip install -r requirements.txt
python3 -m playwright install chromium
# 系统还需 ffmpeg/ffprobe；macOS 可 brew install ffmpeg
```

对 Agent 说：

- “用 sky-film-studio，把这份稿子做成 60 秒竖屏视频：……”
- “做一支两分钟的科普片，讲清楚……，用系统声音。”
- “用这段录音配画面，文稿也附上，画面跟我的声音走。”
- “做一支无口播解说片，保留字幕和音乐。”

默认音色配置读取 `~/.config/sky-film-studio/media.json`，兼容只读 huashu 配置和本地音色注册表。云调用需要已有的 cloud/paid_api 授权及凭证；凭证不写入项目。系统声需要 macOS 已安装的中文声音。

## 画面与同步

- 六套主题：科技电光青、历史纸墨朱砂、新闻暖橙、代码终端绿、财经铂银、通用暗金。主题是默认建议，用户可指定风格。
- 文字、图表、流程、实物组件可组合；按信息目标选择图标、矢量实体、参考素材或必要的 3D。
- 部件实体支持独立填色、层次、锚点、关节动作和退出；旧路径接口保持兼容，提供 wheeledCart 轮转示例。
- 逐句 TTS 可以落位；整段录音锁定源时间码。句级 cues 不冒充词级准确性，VAD 也不是语音识别。
- 字幕按实际字体测宽、长句分页，超长内容不静默丢字。事实由 data.js 与 claims.json 关联，人工核实来源后记录审查状态。

## 构建

```sh
S="$PWD"
FILM=/绝对路径/新影片
python3 "$S/engine/new.py" "$FILM" --name 片名 --theme tech --ratio 9:16
# 完成文稿、数据和来源
python3 "$S/engine/voice.py" say --project "$FILM" --mode system --reuse
python3 "$S/engine/voice.py" plan --project "$FILM"
# 审阅草案；--apply 会重新生成草案，手改草案则合并后 place
python3 "$S/engine/voice.py" plan --project "$FILM" --apply
# 完成 storyboard，核查事实/字幕时间后
python3 "$S/engine/check.py" preflight --project "$FILM"
python3 "$S/engine/render.py" --project "$FILM" --keys
python3 "$S/engine/check.py" sheet --project "$FILM"
# 看图、检查连续动作、修正
python3 "$S/engine/check.py" auto --project "$FILM"
python3 "$S/engine/encode.py" --project "$FILM" --output "$FILM/out/film.mp4"
python3 "$S/engine/check.py" delivery --project "$FILM" --video "$FILM/out/film.mp4"
```

C 模式不运行 voice，在 film.subtitles 配字幕。D 模式运行 voice import，提供文稿或已对齐 cues；校对源时间后让分镜跟随录音，禁止 place。更多命令与数据格式见 [制作管线](references/pipeline.md)、[语音](references/voice.md) 和 [实体绘制](references/entities.md)。

`render --preview` 可实时拖动时间轴。`new --template daily-brief|how-to|fact-card` 可生成系列模板；模板数据是演示内容，发布前替换并核查。new 只接受空目录，避免覆盖已有影片。

auto 先做严格预检与关键帧，再校验音频、仅在过期时全片重渲。delivery 检查最终编码和构建记录。自动技术通过不等于事实/视觉验收：仍需看片、试听、核对实物形态和字幕。

## 交付与复现

项目自带 vendor、engine 构建脚本、requirements、字体/素材、provenance/claims 和检查记录。源码 zip 排除凭证、.cache、.git 和逐帧图片。素材和字体须记录来源；支持默认合成音乐或用户授权素材，不宣称制作工具自动消除版权风险。

## 验证与第三方

```sh
python3 -m unittest discover -s tests
node tests/entities.test.js
python3 tests/render_smoke.py
```

集成检查需上述依赖与本机字体，在临时目录离线生成测试视频。图标来源：lucide（ISC）、phosphor（MIT）；Noto Serif SC 字体（OFL）。已有 examples/wxminipro 是历史参考片，不代表新版接口契约。
