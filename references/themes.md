# 主题默认与定制

主题在 `themes/themes.js`，一个 key 一个对象；scaffold 启动时按 `film.json.theme`（兼容 FILM.theme）注入 `TH`，组件全部从 `TH` 取色/字体/粒子风格。默认保持全片视觉一致；用户指定风格优先。

## 字段

```js
tech: {
  key: "tech", bpm: 105,
  palette: { bg0, bg1, ink, cream, creamDim, accent, accentHi, accentDeep, warn, dim, faint },
  fonts:   { serif: "Noto Serif SC", titleWeight: 600 },
  music:   { mode: "minor|major|pentatonic", brightness, arpDensity },
  particles: "dust|soot|snow|ticker|bits",
  vignette: 1.0, grain: 0.055, lightBand: 0.045,
  decor: { codeRain: true, dataBands: true }     // 主题专属背景开关（自绘背景时参考）
}
```

## 基础六主题速查

| key | bg | accent | 粒子 | 专属 decor | 音乐 |
|---|---|---|---|---|---|
| `tech` | #06070a 近黑 | 电光青 #3ddbd9 | 金尘 | 代码雨、数据光带 | 小调电子拨弦 105 |
| `history` | #141009 宣纸暗 | 朱砂 #b03028 | 墨点缓沉 | 卷轴边、纸纹、多印章 | 五声拨弦 85 |
| `news` | #050d1a 深蓝 | 暖橙 #ff8c42 + 红 #d84a3a | 快闪 ticker | 标题条、时间戳、连线地图 | 大调紧张鼓点 115 |
| `code` | #050807 近黑 | 终端绿 #58c98d | 位块 bits | 终端框、网格底 | 极简脉冲 100 |
| `finance` | #060b16 深蓝 | 铂银 #c8d4e8 | 金尘上升 | 网格底、增长曲线 | 大调沉稳 100 |
| `default` | #070503 近黑 | 暗金 #d9b45c | 金尘 | 全组件 | 小调（已验证）100 |

## 主题三件套（v0.4 起）：palette + **氛围层（decor.js，自动）** + 转场默认

| key | 氛围层（背景自动叠） | 拍首转场默认 | 音乐 |
|---|---|---|---|
| `tech` | 代码雨纵列 + 数据光带 | bands 斜切色带 | 小调电子 105 |
| `history` | 纸纹斑驳 + 四角墨晕 | **ink 墨晕开** | 五声拨弦 85 |
| `news` | 斜网格 + 顶部红条 + LIVE 呼吸点 | bar 横推 | 大调鼓点 115 |
| `code` | 网格 + 往返扫描亮线 | scan 扫描线 | 极简脉冲 100 |
| `finance` | 网格 + 上行虚线影 | bar 横推 | 大调沉稳 100 |

氛围层由 scaffold 按最终解析的主题自动调用（film.json `decor:false` 关闭）；转场写 film.json `wipe`。
主题包含色板、背景与可选转场；配乐 mode/BPM 由 film.json 显式记录，换主题后同步检查音乐配置。

## 判类规则

技术名词密集/产品流程 → `tech`；年代/朝代/人物叙事 → `history`；时事/政策/数据发布 → `news`；代码示例/操作步骤/工具链 → `code`；市场/融资/经营 → `finance`；拿不准 → 问用户一句，或用 `default` 并说明。按实际内容和用户偏好选，不按关键词强制覆盖。

## 新增主题

复制最接近的主题改 palette/bpm/decor；music.mode 支持 `minor | major | pentatonic`（audio.py 内置三套和弦进行）。新主题验证过一支片后把速查表补一行。

## 专属渲染器

| key | 画面 | 默认音色 |
|---|---|---|
| ink | 浅宣纸、墨色山脊、书法字体 | 合成古筝与太鼓 |
| whiteboard | 浅白板、手写字体 | 合成尼龙弦 |
| pixel | 保持目标宽高比的低分辨率量化 | 方波与噪声打击 |
| glitch | RGB 分离、切片与扫描线 | 失真锯齿 |
| screencast | 深色编辑器背景 | FM 电钢 |
| blueprint | 深蓝工程网格、清晰线条，适合结构/原理图 | 稀疏 FM 电钢，96 BPM 小调 |
| museum | 墨绿陈列背景、静态柔光与展示平面，适合实体/工艺 | 合成古筝，76 BPM 五声 |

`theme` 提供色板与默认渲染器；`renderer` 可显式覆盖。`music.instrumentTheme` 可独立选上述音色；mode/BPM 仍以 film.json 为准。纯英文装饰字可使用随项目复制的 Orbitron 或 Press Start 2P，中文正文保留完整中文字库。不要给中文整行强配不含中文的字体。

渲染器原文件在 themes/renderers/*.js；修改后重建 all.js 并测试实际装载的 bundle。SVG 图标用同步 Path2D 保留原始曲线；只有旧接口需要逐笔路径时才惰性采样。未知实体仍应报错，自定义部件与动作优先于图标兜底。

`blueprint/museum` 背景按实际画幅直接绘制，无整帧后处理；材质由场景单独选择。它们不自动给所有物体叠纹理/高光，也不自动安排鼓点。new.py 写入相应 BPM/mode；music.layers 与 leadDensity 按口播密度调整。自绘不透明背景会遮住主题底，应有意复用主题底或主动替换，不要只改 theme 后声称已换画面。

重建渲染器 bundle（仓库根目录）：

```sh
python3 - <<'PY'
from pathlib import Path
p=Path('themes/renderers')
(p/'all.js').write_text('// Generated from renderer sources; rebuild after edits.\n'+'\n'.join((p/(n+'.js')).read_text() for n in ['ink','pixel','glitch','whiteboard','screencast','blueprint','museum']))
PY
```

显式 renderer 拼写未知会报错；`renderer:"default"` 可使用基础管线。宣纸/白板缓存按目标宽高更新。
