# 经验证的操作经验

这些是有条件的经验，不是所有影片的审美硬规则。新影片的发现先记录在项目内，维护技能时保留可复核的问题、条件和结果；不将单片评分或主观偏好包装成通用证据。

- Chromium 本地 file:// 字体可能受 CORS 限制；引擎用 localhost HTTP 服务加载。下载 OTF 应检查 sfnt 表偏移/长度并等待字体成功加载，不能只看文件扩展名。
- 字幕烧入帧；改 cues 后仅重混音不够，必须重新导帧和编码。当前构建指纹帮助识别过期产物。
- 逐句独立 TTS 可按分镜重排，整段用户录音不能只移动 cues；源录音应锁时间码。
- 语音缓存按内容/音色/参数命中，序号只是输出名称；改稿和插句的回归样例在 tests 中。
- 口播段与字幕共同使用时间表不等于已实现词级对齐。VAD 能量边界需要文稿/转录与试听校对。
- 图形关键结构与轮廓比增加细节更有助于辨识；开口线和填充面应显式区分，不能靠放大闭合容差补边。
- 动态部件要检查连续片段；关键帧能发现遮挡，不能证明动作连续。
- 容器高度按内容起点、实际行数/行高与底垫计算；画外附加文字也要纳入边界。
- punch 放大后仍须留字幕空间；装饰框挂 chrome 层以免被内容缩放推出画面。
- 等比大格拼图比密集小缩略图更适合查字；边缘亮度扫描只作提示，亮背景和合法出血会误报。

验证入口：`python3 -m unittest discover -s tests`、`node tests/entities.test.js`，以及 `tests/render_smoke.py` 的浏览器/编码集成检查。前两项离线、不调用云；集成检查在临时目录生成演示片，不更改用户项目。
- 图标辨识度差的根因：把 SVG 路径转成折线再 lineTo() 丢失了曲线光滑度和填充质量——解法是 svgicons.js 用浏览器原生 SVG 渲染（构建 SVG 字符串 → Image 对象 → ctx.drawImage()），58 个常用图标验证缓存成功；手绘件（monk/buddha/cliff）保留折线管线因为需要 wobble 毛边效果。

### 2026-10-29：推导与陈列的针对性复查

- 淡叠尚未结束时，下一镜头的淡出可能已经开始。合成层必须同时应用两者；边界测试不能只覆盖孤立转场。
- 等分动画保留物件身份，标题与公式变化时不让主体重新出现；移动中的分组不提前标成完成值。
- 竖屏不能只放大标题：主体尺寸、推导信息和字幕保留区一起检查。陈列特写按展示窗口裁切，避免器底进入字幕。
- 手部端点与器壁从同一曲线求值；轮廓变化时单独的近似接触坐标会失效。
- 三种风格使用不同主奏乐句，允许主奏休止；小节间音层渐变。声音仍需试听，不以音色名称或测试通过代替听感。

### 2026-10-29：历史接力案例

- 切镜连续之外还要检查因果连续：后站必须在观测后才复现；视线失效时保留前一状态，不能照常自动推进。
- 事件年份不等于参考模型的制作年份；明确简化站数、地理比例与编码边界。
- StyleMotion默认风格应从scaffold的实际FILM_META读取；window属性并不等于顶层let绑定。浏览器回归比较默认与显式archive轨迹。
- 环境声使用独立种子的绝对时间区间，跨镜头不重启；观察镜与全景共用同一实体姿态。

### 分阶段构建与音频复核

- 检查脚本、事实说明和provenance变化不应触发画面/配乐重建；声音和画面分别依赖实际使用的字段，生成物还需散列校验。自定义场景跨层读取时显式声明补充依赖。
- ASR可把纯配乐尾段识别为重复短句；保留原始结果，结合独立VAD、片段置信度和源波形匹配定位，不把全文差异直接解释为真实多余人声。
- 长说明可在片头/片尾交代，过程镜头保留简短示意标签；结构标注按讲解顺序出现。镜头可在上一句提到主体时提前移动，为下一句观察留稳定画面。

### 2026-10-29：跨主题的原理与生活流程

- 题材、任务、风格、声源分别选择。原理片可把被动结构动作保留静默，只给可见路径标注配轻声；生活片按纸、软接触、金属物件分别处理，不逐项提示或逐拍whoosh。
- 局部相机推进时，路径标注必须使用同一变换与实际物件几何；否则静帧端点正确，特写中仍会偏离。
- 教程中的完成反馈由对象状态推导：未装的钥匙留在桌面，补装后才勾选；片尾合包不能掩盖未完成步骤。
- 视觉语法与色板可独立组合。陈列式物件不必使用深色底；生活台面案例改浅底后复查标题、字幕、轮廓和接触阴影。不能把某风格的文字颜色直接移到另一色板。
- 两个35秒案例分别采样71个时刻并逆序重绘，检查绳端约束/物件守恒与切点主体稳定；这些技术检查不等于人工听感或观众理解测试。

### Result holds and product previews

- Separate physical placement from checklist confirmation. Use the same carried-object pose for fingertips and elevation-aware contact shadows; let the hand release before the next operation.
- Reveal force arrows before the equation; preserve a result hold instead of adding more simultaneous labels. Event-linked BGM attenuation can make the observation window quieter without moving narration.
- Product previews use a separate promotion task and product style. Keep conceptual assets labeled; validate real product claims independently. Disable particles explicitly for a quiet studio stage; unknown or absent particle settings keep legacy behavior.
- Regression: 67 Python tests, product browser/audio checks, old style browser/audio checks, and an unchanged legacy mix hash. These do not establish subjective listening quality or advertising effectiveness.

### Dynamic product launch treatments

- Use deliberate acceleration, scale contrast, masked type and clear holds instead of a long static product layout. Product mechanism state continues across editorial shots; camera changes may be motivated cuts.
- Inspect occlusion in closed/open/closing poses. In the concept case, inward face winding and painter order exposed internal parts through a closed lid; corrected face orientation, back-face culling and explicit foreground/lid ordering were needed. This is a scene-specific illustration, not a general CAD renderer.
- Crop macro shots to the feature viewport and keep type outside it; magnifying a lid can hide the feature and reduce text contrast. Move the product toward its next composition before changing the explanation.
- Reference-study scope matters: official presentation pages and production-team descriptions support design choices; failed video playback does not establish exact original shot timing or sound design.
- Four treatment profiles passed saved-browser/type/audio checks; a complete precision concept case and the previous studio film provide a viewing comparison. Listener and audience response remain separate from technical checks.

### 2026-10-30：软件产品的连续演示

- 将功能列表组织为受众任务，延续同一输入、文字和输出；画面中的分类、摘要与提取结果应能回到输入核对。真实录屏、官网截图和作者演绎分别记录，截图/演绎不能证明实际操作已验证。具体规划见 [product-proof.md](product-proof.md)。
- 中间态暴露的问题比完整姿态更多：资料连线放在结果卡片后面；拼图裁剪时保留每个字幕区；移动图片的轨迹也须避开主标题。镜头观察点不等于剪辑切点。
- 波形/字幕或英文/译文在同一区域交叉淡化会形成阅读重影。`ProductMotion.replace` 将退场与显露分开，卡片及产品状态在回调外继续保留；顺序/逆序、父级状态与异常恢复有独立回归。需要并排对照时不使用替换。
- 扫描、提取、整理、裁剪和完成可选择不同音色，音乐在操作观察处做减法；由语义结果决定提示音时点。此经验来自案例制作和技术/抽帧复查，不代表已验证播放率、品牌效果或主观听感。
