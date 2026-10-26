// =====================================================================
// lib.js —— 确定性工具库：种子随机、缓动、色板、文字、颗粒、暗角、金尘
// 画面完全由 t 决定：不使用 Date / Math.random / requestAnimationFrame
// =====================================================================
"use strict";

const W = 1920, H = 1080;

// ---------- 色板（暗金电影感，全片统一） ----------
const C = {
  bg0:      "#070503",   // 近黑底
  bg1:      "#100b06",
  ink:      "#0b0805",
  cream:    "#ede3cd",   // 米白正文
  creamDim: "#b8ac93",
  gold:     "#d9b45c",   // 主金
  goldHi:   "#f6e3a8",   // 高光金
  goldDeep: "#8a6a2a",   // 暗金
  goldLine: "rgba(217,180,92,0.55)",
  red:      "#b03028",   // 印章红（仅备案段）
  redHi:    "#d84a3a",
  dim:      "rgba(237,227,205,0.38)",
  faint:    "rgba(237,227,205,0.16)"
};

const FONT = (w, s) => `${w} ${s}px "Noto Serif SC", "Songti SC", serif`;
const MONO = (s) => `${s}px "Menlo", "SF Mono", monospace`;

// ---------- 种子随机 ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 缓动 ----------
const clamp01 = x => Math.max(0, Math.min(1, x));
const E = {
  linear: x => x,
  inQuad: x => x * x,
  outQuad: x => 1 - (1 - x) * (1 - x),
  inCubic: x => x * x * x,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  outBack: x => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2),
  outElastic: x => x === 0 ? 0 : x === 1 ? 1 :
    Math.pow(2, -9 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1
};
// 线性映射 + 截断：把 t 从 [a,b] 归一到 [0,1]，区间外截断
const seg = (t, a, b) => clamp01((t - a) / (b - a));
// 脉冲：进入后 0-1-0
const pulse = (t, a, b) => { const x = seg(t, a, b); return Math.sin(Math.PI * x); };

// ---------- 文字 ----------
function txt(ctx, s, x, y, opt = {}) {
  const {
    size = 40, weight = 600, color = C.cream, align = "center", alpha = 1,
    ls = 0,                     // 字距 px
    glow = 0, glowColor = null, // 光晕强度
    gradient = null, gradY = 0  // 渐变（相对文字顶部，向下高度）
  } = opt;
  ctx.save();
  ctx.font = FONT(weight, size);
  ctx.textAlign = align;
  ctx.textBaseline = opt.baseline || "alphabetic";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${ls}px`;
  ctx.globalAlpha *= alpha;
  if (glow > 0) { ctx.shadowColor = glowColor || "rgba(246,227,168,0.8)"; ctx.shadowBlur = glow; }
  ctx.fillStyle = gradient || color;
  if (gradient) {
    const m = ctx.measureText(s);
    const w = m.width;
    const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    const g = ctx.createLinearGradient(0, y - gradY, 0, y - gradY + size * 1.15);
    g.addColorStop(0, C.goldHi); g.addColorStop(0.45, C.gold); g.addColorStop(1, C.goldDeep);
    ctx.fillStyle = g;
    void x0; void w;
  }
  ctx.fillText(s, x, y);
  ctx.restore();
}

// 金色数字渐变填充（大号数字专用）
function goldGrad(ctx, yTop, h) {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  g.addColorStop(0, "#f9ecc0");
  g.addColorStop(0.42, "#e8c877");
  g.addColorStop(0.75, "#c69a45");
  g.addColorStop(1, "#8a6a2a");
  return g;
}

// 圆角矩形路径
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- 底色（缓存） ----------
let _bgCanvas = null;
function bgBase(ctx) {
  if (!_bgCanvas) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const b = c.getContext("2d");
    const g = b.createRadialGradient(W / 2, H * 0.42, 120, W / 2, H * 0.5, H * 1.05);
    g.addColorStop(0, C.bg1); g.addColorStop(0.55, "#0a0705"); g.addColorStop(1, C.bg0);
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    _bgCanvas = c;
  }
  ctx.drawImage(_bgCanvas, 0, 0);
}

// ---------- 胶片颗粒（预生成 8 张种子噪声瓦片，按帧号轮换，确定性） ----------
const GRAIN_TILES = [];
const GRAIN_SIZE = 288;
function initGrain() {
  for (let k = 0; k < 8; k++) {
    const c = document.createElement("canvas"); c.width = GRAIN_SIZE; c.height = GRAIN_SIZE;
    const b = c.getContext("2d");
    const img = b.createImageData(GRAIN_SIZE, GRAIN_SIZE);
    const rnd = mulberry32(9137 + k * 7919);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 108 + rnd() * 40 | 0;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    b.putImageData(img, 0, 0);
    GRAIN_TILES.push(c);
  }
}
function drawGrain(ctx, frameIdx, alpha) {
  const tile = GRAIN_TILES[frameIdx % GRAIN_TILES.length];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  const pat = ctx.createPattern(tile, "repeat");
  ctx.fillStyle = pat;
  ctx.translate((frameIdx * 37) % GRAIN_SIZE - GRAIN_SIZE, (frameIdx * 53) % GRAIN_SIZE - GRAIN_SIZE);
  ctx.fillRect(0, 0, W + GRAIN_SIZE * 2, H + GRAIN_SIZE * 2);
  ctx.restore();
}

// ---------- 暗角（缓存） ----------
let _vigCanvas = null;
function drawVignette(ctx, extra = 0) {
  if (!_vigCanvas) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const b = c.getContext("2d");
    const g = b.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.98);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.72, "rgba(0,0,0,0.18)");
    g.addColorStop(1, "rgba(2,1,0,0.66)");
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    _vigCanvas = c;
  }
  ctx.save();
  ctx.globalAlpha = 1 + extra;
  ctx.drawImage(_vigCanvas, 0, 0);
  ctx.restore();
}

// ---------- 漂浮金尘（90 粒，全部由 t 决定） ----------
const DUST = (() => {
  const rnd = mulberry32(20231001), arr = [];
  for (let i = 0; i < 90; i++) {
    arr.push({
      x: rnd() * W, y0: rnd() * (H + 300),
      r: 0.7 + rnd() * 2.3,
      sp: 6 + rnd() * 26,          // 上浮速度 px/s
      amp: 8 + rnd() * 34,         // 横向摆幅
      w: 0.15 + rnd() * 0.5,       // 摆动角速度
      ph: rnd() * Math.PI * 2,
      a: 0.10 + rnd() * 0.30,
      tw: 0.4 + rnd() * 1.2        // 闪烁频率
    });
  }
  return arr;
})();
function drawDust(ctx, t, opts = {}) {
  const drift = opts.drift || 0;           // >0：缓慢下沉（结尾沉淀用）
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of DUST) {
    let y = p.y0 - (p.sp - drift * (p.sp + 20)) * t;
    y = ((y % (H + 300)) + (H + 300)) % (H + 300) - 150;
    const x = p.x + Math.sin(t * p.w + p.ph) * p.amp;
    const a = p.a * (0.55 + 0.45 * Math.sin(t * p.tw * Math.PI * 2 + p.ph)) * (opts.alpha ?? 1);
    if (a <= 0.01) continue;
    ctx.fillStyle = `rgba(238,214,150,${a})`;
    ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ---------- 柔和光带（斜向缓慢平移的极淡金色光） ----------
function drawLightBand(ctx, t, alpha = 0.05) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const off = ((t * 26) % (W + 900)) - 450;
  const g = ctx.createLinearGradient(off - 300, 0, off + 300, H);
  g.addColorStop(0, "rgba(216,178,100,0)");
  g.addColorStop(0.5, `rgba(216,178,100,${alpha})`);
  g.addColorStop(1, "rgba(216,178,100,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------- 帧工具 ----------
const smoothstep = (a, b, x) => { const u = seg(x, a, b); return u * u * (3 - 2 * u); };

// 细金线（带两端渐隐）
function goldRule(ctx, x1, x2, y, alpha = 0.5, th = 1) {
  ctx.save();
  const g = ctx.createLinearGradient(x1, 0, x2, 0);
  g.addColorStop(0, "rgba(217,180,92,0)");
  g.addColorStop(0.5, `rgba(230,196,120,${alpha})`);
  g.addColorStop(1, "rgba(217,180,92,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x1, y - th / 2, x2 - x1, th);
  ctx.restore();
}

// 对勾（动画描边）
function checkMark(ctx, x, y, s, p, color = C.gold, lw = 3.5) {
  if (p <= 0) return;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, y + s * 0.02);
  ctx.lineTo(x - s * 0.12, y + s * 0.34);
  if (p < 0.5) {
    const q = p / 0.5;
    ctx.lineTo(x - s * 0.12 + (s * 0.55) * q, y + s * 0.34 - (s * 0.68) * q);
  } else {
    ctx.lineTo(x + s * 0.43, y - s * 0.34);
  }
  const q = clamp01((p - 0.4) / 0.6);
  ctx.globalAlpha = 0.4 + 0.6 * q;
  ctx.stroke();
  ctx.restore();
}

// 印章红渐变
function redGrad(ctx, yTop, h) {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  g.addColorStop(0, "#d8544a"); g.addColorStop(0.6, "#b03028"); g.addColorStop(1, "#7c1f18");
  return g;
}
