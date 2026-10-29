// =====================================================================
// sky-film-studio · themes/themes.js —— 主题注册表（全片一套，scaffold 注入 TH）
// palette: bg0 底 / bg1 中心 / ink 卡底 / cream 正文 / creamDim 次级
//          accent 主强调 / accentHi 高光 / accentDeep 暗部 / warn 警示红
// particles: dust | soot | snow | ticker | bits
// =====================================================================
"use strict";
window.THEMES = {

  default: {   // 暗金电影感（wxminipro 60s 片验证过）
    key: "default", bpm: 100,
    palette: { bg0: "#070503", bg1: "#100b06", ink: "#0b0805", cream: "#ede3cd", creamDim: "#b8ac93",
      accent: "#d9b45c", accentHi: "#f6e3a8", accentDeep: "#8a6a2a", warn: "#b03028",
      dim: "rgba(237,227,205,0.38)", faint: "rgba(237,227,205,0.16)" },
    fonts: { serif: "Noto Serif SC", titleWeight: 600 },
    music: { mode: "minor", brightness: 0.55, arpDensity: 1.0 },
    particles: "dust", vignette: 1.0, grain: 0.055, lightBand: 0.045,
    decor: {}
  },

  tech: {      // 科技/互联网：近黑蓝 + 电光青（冷科技，和暗底对比锐利）
    key: "tech", bpm: 105,
    palette: { bg0: "#06070a", bg1: "#0d1118", ink: "#0a0d12", cream: "#e6ecf2", creamDim: "#9fb0bd",
      accent: "#3ddbd9", accentHi: "#8af5f3", accentDeep: "#1a8a88", warn: "#e05a4a",
      secondary: "#7ab8ff", dim: "rgba(230,236,242,0.38)", faint: "rgba(230,236,242,0.15)" },
    fonts: { serif: "Noto Serif SC", titleWeight: 600 },
    music: { mode: "minor", brightness: 0.6, arpDensity: 1.1 },
    particles: "dust", vignette: 1.05, grain: 0.05, lightBand: 0.05,
    decor: { codeRain: true, dataBands: true }
  },

  history: {   // 历史/人文：宣纸暗底 + 朱砂 + 墨
    key: "history", bpm: 85,
    palette: { bg0: "#141009", bg1: "#241c10", ink: "#1c150c", cream: "#e8dcc2", creamDim: "#b3a483",
      accent: "#b03028", accentHi: "#d8544a", accentDeep: "#6e1d16", warn: "#b03028",
      dim: "rgba(232,220,194,0.40)", faint: "rgba(232,220,194,0.16)" },
    fonts: { serif: "Noto Serif SC", titleWeight: 700 },
    music: { mode: "pentatonic", brightness: 0.4, arpDensity: 0.7 },
    particles: "soot", vignette: 1.15, grain: 0.07, lightBand: 0.03,
    decor: { scrollEdge: true, paperTexture: true }
  },

  news: {      // 新闻/时事：深蓝 + 白 + 暖橙（紧迫感）
    key: "news", bpm: 115,
    palette: { bg0: "#050d1a", bg1: "#0a1830", ink: "#081120", cream: "#f2f5fa", creamDim: "#a8b8cc",
      accent: "#ff8c42", accentHi: "#ffc49b", accentDeep: "#cc5a1a", warn: "#d84a3a",
      dim: "rgba(242,245,250,0.40)", faint: "rgba(242,245,250,0.15)" },
    fonts: { serif: "Noto Serif SC", titleWeight: 700 },
    music: { mode: "major", brightness: 0.65, arpDensity: 1.2 },
    particles: "ticker", vignette: 0.9, grain: 0.045, lightBand: 0.04,
    decor: { headlineBar: true, timestamps: true, mapLines: true }
  },

  code: {      // 技术分享：近黑 + 终端绿 + 暗金
    key: "code", bpm: 100,
    palette: { bg0: "#050807", bg1: "#0a1210", ink: "#081009", cream: "#dce8e0", creamDim: "#93a89b",
      accent: "#58c98d", accentHi: "#a9f0c8", accentDeep: "#2c6e4c", warn: "#e05a4a",
      secondary: "#d9b45c", dim: "rgba(220,232,224,0.38)", faint: "rgba(220,232,224,0.15)" },
    fonts: { serif: "Noto Serif SC", titleWeight: 600 },
    music: { mode: "minor", brightness: 0.5, arpDensity: 0.9 },
    particles: "bits", vignette: 1.0, grain: 0.05, lightBand: 0.035,
    decor: { terminalChrome: true, grid: true }
  },

  finance: {   // 商业/财经：深蓝黑 + 铂银（冷金属，摆脱"金色=财经"的俗套）
    key: "finance", bpm: 100,
    palette: { bg0: "#060b16", bg1: "#0c1626", ink: "#091120", cream: "#eef0e8", creamDim: "#a9b2c0",
      accent: "#c8d4e8", accentHi: "#f0f5ff", accentDeep: "#6878a0", warn: "#d84a3a",
      dim: "rgba(238,240,232,0.40)", faint: "rgba(238,240,232,0.15)" },
    fonts: { serif: "Noto Serif SC", titleWeight: 700 },
    music: { mode: "major", brightness: 0.55, arpDensity: 1.0 },
    particles: "dust", vignette: 1.0, grain: 0.05, lightBand: 0.05,
    decor: { grid: true, risingLines: true }
  }
};

for (const [key,base,palette,font,light] of [
 ['ink','history',{bg0:'#f2ead8',bg1:'#faf5e9',ink:'#e3d6bc',cream:'#29251f',creamDim:'#625846',accent:'#ad382e',accentHi:'#b84336',accentDeep:'#722820'},'Ma Shan Zheng',true],
 ['whiteboard','default',{bg0:'#f8f6f0',bg1:'#ffffff',ink:'#ece9e0',cream:'#222222',creamDim:'#656565',accent:'#2870c8',accentHi:'#2870c8',accentDeep:'#1a4b88'},'LXGW WenKai',true],
 ['pixel','tech',{accent:'#59eb88',accentHi:'#c7ff90'},'Noto Serif SC',false],
 ['glitch','tech',{accent:'#ff2bd6',accentHi:'#7effff'},'Noto Serif SC',false],
 ['screencast','code',{bg0:'#1e2127',bg1:'#1e2127',accent:'#61afef'},'Noto Serif SC',false]
]) {
 const src=THEMES[base];
 THEMES[key]={...src,key,light,palette:{...src.palette,...palette},fonts:{...src.fonts,serif:font},
   grain:light?0:src.grain,lightBand:light?0:src.lightBand,vignette:light?0:src.vignette};
}

// Opt-in object-focused themes; music choices are mirrored by new.py.
for (const [key,base,palette,bpm,mode] of [
 ['blueprint','tech',{bg0:'#0a243b',bg1:'#103650',ink:'#103047',cream:'#e7f4f4',creamDim:'#a5c4ce',accent:'#78d1df',accentHi:'#c4f4f6',accentDeep:'#336c86'},96,'minor'],
 ['archive','history',{bg0:'#211d18',bg1:'#393125',ink:'#30291f',cream:'#f3e7cd',creamDim:'#c2b59d',accent:'#d0a36a',accentHi:'#f0cd93',accentDeep:'#80603b'},80,'minor'],
 ['museum','history',{bg0:'#182622',bg1:'#30423a',ink:'#22332c',cream:'#f4ead6',creamDim:'#b9c4b5',accent:'#c7a574',accentHi:'#efcf9a',accentDeep:'#7b603f'},76,'pentatonic']
]) {
 const src=THEMES[base];
 THEMES[key]={...src,key,bpm,palette:{...src.palette,...palette},
  music:{mode,brightness:.4,arpDensity:.5},grain:0,vignette:0,lightBand:0,decor:{}};
}

// Product studio palette; the renderer uses a quiet light stage, without grid/dust.
THEMES.product={...THEMES.whiteboard,key:'product',bpm:120,
 palette:{...THEMES.whiteboard.palette,bg0:'#e9eef1',bg1:'#fafcfd',ink:'#dce4e9',cream:'#20303d',creamDim:'#627381',accent:'#277b88',accentHi:'#4aa4af',accentDeep:'#205563'},
 fonts:{serif:'Noto Sans SC',titleWeight:700},music:{mode:'major',brightness:.5,arpDensity:.5},
 particles:false,grain:0,vignette:0,lightBand:0,decor:{}};
