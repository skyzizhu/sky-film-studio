---
name: sky-film-studio
description: "Create and revise 30s–5min explainer films from a topic, script or recording using deterministic Canvas animation, sourced facts, sentence-timed narration/subtitles and synthesized music. 用于知识解说短片及其分镜、实体动画与成片修改；不用于单张配图或一般网页开发。"
---

# sky-film-studio

把主题、文稿或录音做成可直接观看的解说短片。画面是确定性的 `window.draw(t)`；Playwright 导帧，ffmpeg 编码。每片独立项目，vendor 和 Python 构建脚本随项目快照；不要为单片修改全局引擎。

## 必须保持的约束

- **范围**：默认约 60 秒、30fps、16:9；支持 30–300 秒。用户指定横竖屏、时长、风格优先。超范围先压缩内容或讨论拆集，不能默默截断。
- **事实**：事实数据集中在 `data.js`，以 `claimId` 关联 `claims.json` 的主张与直接来源。核查数字和非数字事实，优先第一方，记录口径、统计期、发布日期/访问日。用户私有数据注明用户来源。序号、坐标、动画参数不必联网核实；示例数据必须明确标示。核实不了的主张删除、改写或说明不确定性。
- **确定性**：同一环境中画面仅由 t、配置与素材决定。禁无种子随机、Date.now、rAF 和跨帧累积状态。用 `mulberry32(seed)`；对关键时刻做重复及乱序像素检查。不同浏览器/字体版本之间不承诺逐像素相同。
- **同源时间轴**：音频、字幕和 duck 使用 `film.voice.cues`。逐句 TTS 可落位；用户录音锁定源时间码，让分镜跟随录音。VAD 不是转录/文字对齐；词级触发需要词级对齐或抽听校对的事件点，不能用字数比例宣称帧级准确。
- **完整性**：不能丢字幕、截口播、覆盖现有项目或把未知实体拼写错误当作“智能省略”。cues、素材、字体、画面代码改变后重新构建受影响产物；字幕烧帧，改字幕必须重渲。
- **交付**：mp4（H.264/yuv420p + AAC）与可复现源码 zip。自动技术通过之后，仍要看画面、试听首句/数字句/末句；不能把“自动全绿”等同视觉和事实正确。

## 输入路由

| 模式 | 输入 | 处理 |
|---|---|---|
| A 研究成片 | 主题/一句话 | 调研核查 → 字数预算内写稿 → B |
| B 稿件成片 | 口播文稿 | 逐句 TTS → 分镜草案 → 审阅应用 → 场景 |
| C 静默科普 | 明确不要口播 | 分镜、可读字幕、画面与音乐；不调用语音 |
| D 录音成片 | 用户录音，可附稿 | 保留录音 → 转录/对齐或校对 cues → 分镜跟随源时间 |

口播选择：用户点名 > 项目配置 > 用户默认 `~/.config/sky-film-studio/media.json`（兼容只读 huashu 配置）> 必要时问一次。尊重已有云调用/付费 policy 和本次授权；凭证不进聊天或项目。CLI 只在配置允许时调云，不要为绕过 policy 擅改用户全局配置。无云授权时可用系统声；不要擅自把用户要的口播改成静默片。

## 制作流程

1. **规格与内容**：确定模式、比例、帧率和目标时长。默认横屏 1920×1080；竖屏 1080×1920；也支持 1:1、4:3、3:4、4:5、2.35:1、W:H、WxH。`new.py` 要求空目录。按实际 W/H 排版，不能只改画布尺寸。
2. **事实与文稿**：写 `narration.txt`（每句一行）、`data.js` 和 `claims.json`。中文 TTS 约 4–4.5 字/秒只用于粗预算，实际音频时长才是排镜依据。核查完成再设 `claims.reviewed:true`，该标记是人工审查记录，程序不会替你证明主张真实。
3. **语音与分镜**：B 用 `voice.py say`；`plan` 默认只产草案，不改原 cues/film。审阅后 `plan --apply` 应用新分镜并落位 TTS；手改句子分组/边界后 `place`，越界或漏句会拒绝写入。D 用 `import`，VAD 只出候选，提供 `--aligned-cues` 或校对后设 `alignment.reviewed:true`；禁止对整段录音执行 place。关键动作可用本地词时码估计与 `event_anchors` 绑定，低置信度需复核；最终全长自动转录/源波形检查与真人试听分别记录。详见 [voice.md](references/voice.md)。
4. **画面设计**：先确定每拍要解释的变化、关系或行动，再选实体和表现方式。先按内容选择叙事与证据，再组合表现风格和动作声音；工程蓝图、博物陈列、白板、历史叙事的档案与接口读 [direction.md](references/direction.md)。历史题材的史料/形态边界、接力与条件失败演示读 [history.md](references/history.md)。主题是默认建议，不限制用户风格。主题及渲染器配置在 `themes/themes.js`；按需读 [themes.md](references/themes.md)。实体、部件、动作接口读 [entities.md](references/entities.md)；操作/工艺/转印的接触与共享状态读 [process.md](references/process.md)，构图与分镜读 [storyboard.md](references/storyboard.md)；等分教学的物件守恒、横竖屏安全区与陈列对照读 [teaching.md](references/teaching.md)；跨镜头物件/相机连续性、可选内容转场与齿轮示意助手读 [continuity.md](references/continuity.md)。需要陶土/纸/金属/木纹、接触阴影或局部扫光/剖面对齐导线时读 [materials.md](references/materials.md)，这些效果按内容启用。
5. **预检与视觉复查**：先 `check.py preflight`，再 `render.py --keys`、拼图和看图。第一轮查构图/辨识度/文字，修后复查相关时刻；有运动的镜头再用 `render.py --clip 起点,终点 --output checks/motion.mp4` 看短动画片段。不得用两轮同样静帧替代连续性检查。预览可 `--preview`。
6. **技术终检**：`check.py auto`（严格预检、仅重建过期音频与全片、关键帧/确定性、边缘提示）→ `encode.py`（未变则复用）→ `check.py delivery --video`。自定义场景跨层读取配乐、词时码或波形时声明补充依赖，见 [pipeline.md](references/pipeline.md)。混音采样峰值 ≤ -1dBFS；编码后另查可配置LUFS与真峰值（默认-16 LUFS、≤-1 dBTP），结尾淡出不切口播；配乐尽量在乐句上收束。合成音乐是默认选项，也可使用用户授权素材并记录来源，不能宣称工具合成天然“无版权风险”。
7. **交付与经验**：源码包含 vendor、engine、requirements、字体/素材及来源、分镜文稿、音轨与检查记录；不要打包凭证、缓存、巨量 frames。新经验先记项目内，维护技能时再筛选合并到 [experience.md](references/experience.md)。

## 表达选择

- 通用概念用清晰图标；具体实物可用参数化矢量、SVG、参考图片或必要的 3D。真实人物、历史遗物、指定产品应核验关键形态，虚构示意不可冒充真实记录。
- 先保证轮廓和关键部件可辨，再加材质、光影、描线或抖动。入场动画与物体动作分开：出现、抓取/转动/流转、停留、退出。跨镜头复用实体身份。
- 动作要显示原因与结果：刷涂按接触区改变表面，转印与重排共用布局，抓取分抬起/移动/放下；关键事件与口播按语义核对，不能仅保证句子落在镜头里。
- 一屏主焦点明确。文字、数据图、过程演示、静止、慢推或冲击效果按内容使用；不强制每章数字动画、每拍重击或每片金句。
- chrome（顶栏/字幕/进度）与内容分层。`progress` 明确按内容设置；timeline 优先于进度轨；字幕底部自动补位。内容安全区仍须按目标画幅和平台遮挡复查。

## 展示片技巧按需使用

参考 [code-video-showcase](https://github.com/Moessif/code-video-showcase) 的单镜头验证、回声字、排版与音色设计，使用方式见 [showcase.md](references/showcase.md)。展示片的固定 BPM、闪切、大字卡和无字幕规则不适用于所有解说片；保留句级口播与证据时间轴。新增效果要同时检查首次绘制、乱序绘制与浅/深色背景。

## 运行条件

Python 3.9+、`requirements.txt` 中依赖、Chromium、系统 ffmpeg/ffprobe；系统声另需 macOS `say`。安装 `python3 -m pip install -r requirements.txt`、`python3 -m playwright install chromium`。火山另需已有授权配置与凭证。缺依赖给出修复指引，不静默降级。

字体从合法的本地资源或上游取得并校验完整性；项目自带 Noto Serif SC。预览回退会告警，正式渲染用 `--strict-fonts`。可参考 `examples/wxminipro/` 的历史成片，但它不是当前引擎接口契约。
