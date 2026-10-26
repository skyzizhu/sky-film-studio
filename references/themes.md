# 主题：类别→视听风格，色彩必须与内容吻合

主题在 `themes/themes.js`，一个 key 一个对象；scaffold 启动时按 `FILM.theme` 注入 `TH`，组件全部从 `TH` 取色/字体/粒子风格。**全片一套主题，中途不换。**

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

## 六主题速查

| key | bg | accent | 粒子 | 专属 decor | 音乐 |
|---|---|---|---|---|---|
| `tech` | #06070a 近黑 | 暗金 #d9b45c + 青绿 #58a89b | 金尘 | 代码雨、数据光带 | 小调电子拨弦 105 |
| `history` | #141009 宣纸暗 | 朱砂 #b03028 | 墨点缓沉 | 卷轴边、纸纹、多印章 | 五声拨弦 85 |
| `news` | #050d1a 深蓝 | 金 #e8b23c + 红 #d84a3a | 快闪 ticker | 标题条、时间戳、连线地图 | 大调紧张鼓点 115 |
| `code` | #050807 近黑 | 终端绿 #58c98d + 暗金 | 位块 bits | 终端框、网格底 | 极简脉冲 100 |
| `finance` | #060b16 深蓝 | 金 #e2bd6b | 金尘上升 | 网格底、增长曲线 | 大调沉稳 100 |
| `default` | #070503 近黑 | 暗金 #d9b45c | 金尘 | 全组件 | 小调（已验证）100 |

## 判类规则

技术名词密集/产品流程 → `tech`；年代/朝代/人物叙事 → `history`；时事/政策/数据发布 → `news`；代码示例/操作步骤/工具链 → `code`；市场/融资/经营 → `finance`；拿不准 → 问用户一句，或用 `default` 并说明。教育内容涉及时政不选 `news`，用 `tech`。

## 新增主题

复制最接近的主题改 palette/bpm/decor；music.mode 支持 `minor | major | pentatonic`（audio.py 内置三套和弦进行）。新主题验证过一支片后把速查表补一行。
