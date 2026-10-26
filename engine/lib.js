// =====================================================================
// sky-film-studio · engine/lib.js
// 确定性基础件：种子随机、缓动、主题化色板/文字/颗粒/暗角/粒子/光带
// 画面完全由 t 决定：禁 Date / 禁无种子随机 / 禁 requestAnimationFrame
// TH 由 scaffold 按 FILM.theme 注入（themes/themes.js）
// =====================================================================
"use strict";

const W = 1920, H = 1080;
let TH = null;                       // 当前主题（scaffold 注入）
const PAL = () => TH.palette;

const FONT = (w, s) => `${w} ${s}px "${TH.fonts.serif}", "Songti SC", serif`;
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
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const pulse = (t, a, b) => { const x = seg(t, a, b); return Math.sin(Math.PI * x); };
const E = {
  linear: x => x,
  inQuad: x => x * x, outQuad: x => 1 - (1 - x) * (1 - x),
  inCubic: x => x * x * x, outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  outBack: x => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2)
};

// ---------- 文字 ----------
function txt(ctx, s, x, y, opt = {}) {
  const { size = 40, weight = 600, color, align = "center", alpha = 1,
    ls = 0, glow = 0, glowColor = null, gradient = false, baseline = "alphabetic" } = opt;
  const p = PAL();
  ctx.save();
  ctx.font = FONT(weight, size);
  ctx.textAlign = align; ctx.textBaseline = baseline;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${ls}px`;
  ctx.globalAlpha *= alpha;
  if (glow > 0) { ctx.shadowColor = glowColor || hexA(p.accentHi, 0.8); ctx.shadowBlur = glow; }
  if (gradient) {
    const g = ctx.createLinearGradient(0, y - size, 0, y + size * 0.16);
    g.addColorStop(0, p.accentHi); g.addColorStop(0.45, p.accent); g.addColorStop(1, p.accentDeep);
    ctx.fillStyle = g;
  } else ctx.fillStyle = color || p.cream;
  ctx.fillText(s, x, y);
  ctx.restore();
}

function accentGrad(ctx, yTop, h) {
  const p = PAL();
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  g.addColorStop(0, p.accentHi); g.addColorStop(0.42, p.accent);
  g.addColorStop(0.75, p.accentDeep); g.addColorStop(1, p.accentDeep);
  return g;
}
function hexA(hex, a) {
  if (hex.startsWith("rgb")) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function mixHex(a, b, k) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const f = sh => Math.round((A >> sh & 255) * (1 - k) + (B >> sh & 255) * k);
  return `rgb(${f(16)},${f(8)},${f(0)})`;
}

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

// ---------- 底色（按主题缓存） ----------
let _bgCanvas = null, _bgKey = null;
function bgBase(ctx) {
  const p = PAL();
  if (_bgCanvas && _bgKey === TH.key) { ctx.drawImage(_bgCanvas, 0, 0); return; }
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const b = c.getContext("2d");
  const g = b.createRadialGradient(W / 2, H * 0.42, 120, W / 2, H * 0.5, H * 1.05);
  g.addColorStop(0, p.bg1); g.addColorStop(0.55, mixHex(p.bg0, p.bg1, 0.5)); g.addColorStop(1, p.bg0);
  b.fillStyle = g; b.fillRect(0, 0, W, H);
  _bgCanvas = c; _bgKey = TH.key;
  ctx.drawImage(_bgCanvas, 0, 0);
}

// ---------- 胶片颗粒（8 张种子瓦片按帧号轮换） ----------
const GRAIN_TILES = [], GRAIN_SIZE = 288;
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
  if (alpha <= 0) return;
  const tile = GRAIN_TILES[frameIdx % GRAIN_TILES.length];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(tile, "repeat");
  ctx.translate((frameIdx * 37) % GRAIN_SIZE - GRAIN_SIZE, (frameIdx * 53) % GRAIN_SIZE - GRAIN_SIZE);
  ctx.fillRect(0, 0, W + GRAIN_SIZE * 2, H + GRAIN_SIZE * 2);
  ctx.restore();
}

// ---------- 暗角 ----------
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
  ctx.save(); ctx.globalAlpha = Math.min(1.4, (TH.vignette ?? 1) + extra);
  ctx.drawImage(_vigCanvas, 0, 0); ctx.restore();
}

// ---------- 漂浮粒子（dust 金尘 | soot 墨点 | snow 纸屑 | ticker 快闪 | bits 位块） ----------
const DUST = (() => {
  const rnd = mulberry32(20231001), arr = [];
  for (let i = 0; i < 90; i++) {
    arr.push({
      x: rnd() * W, y0: rnd() * (H + 300), r: 0.7 + rnd() * 2.3,
      sp: 6 + rnd() * 26, amp: 8 + rnd() * 34, w: 0.15 + rnd() * 0.5,
      ph: rnd() * Math.PI * 2, a: 0.10 + rnd() * 0.30, tw: 0.4 + rnd() * 1.2,
      sq: rnd() < 0.25
    });
  }
  return arr;
})();
function drawDust(ctx, t, opts = {}) {
  const p = PAL(), style = TH.particles || "dust";
  const drift = opts.drift || 0;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const q of DUST) {
    let y = q.y0 - (q.sp - drift * (q.sp + 20)) * t;
    y = ((y % (H + 300)) + (H + 300)) % (H + 300) - 150;
    const x = q.x + Math.sin(t * q.w + q.ph) * q.amp;
    let a = q.a * (0.55 + 0.45 * Math.sin(t * q.tw * Math.PI * 2 + q.ph)) * (opts.alpha ?? 1);
    if (style === "ticker") a *= pulse(t % 3, (q.ph + Math.PI) / (Math.PI * 2) % 3, ((q.ph + Math.PI) / (Math.PI * 2) + 0.1) % 3);
    if (a <= 0.01) continue;
    const col = style === "soot" ? `rgba(70,56,40,${a})`
      : style === "bits" ? hexA(p.accent, a * 0.8) : hexA(p.accentHi, a * 0.9);
    ctx.fillStyle = col;
    if ((style === "bits" || style === "snow") && q.sq) ctx.fillRect(x, y, q.r * 2.4, q.r * 2.4);
    else { ctx.beginPath(); ctx.arc(x, y, q.r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- 柔和光带 ----------
function drawLightBand(ctx, t, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const off = ((t * 26) % (W + 900)) - 450;
  const g = ctx.createLinearGradient(off - 300, 0, off + 300, H);
  g.addColorStop(0, hexA(TH.palette.accent, 0));
  g.addColorStop(0.5, hexA(TH.palette.accent, alpha));
  g.addColorStop(1, hexA(TH.palette.accent, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------- 细线（两端渐隐） ----------
function rule(ctx, x1, x2, y, alpha = 0.5, th = 1) {
  ctx.save();
  const g = ctx.createLinearGradient(x1, 0, x2, 0);
  g.addColorStop(0, hexA(TH.palette.accent, 0));
  g.addColorStop(0.5, hexA(TH.palette.accentHi, alpha));
  g.addColorStop(1, hexA(TH.palette.accent, 0));
  ctx.fillStyle = g; ctx.fillRect(x1, y - th / 2, x2 - x1, th);
  ctx.restore();
}

// ---------- 对勾（描边动画） ----------
function checkMark(ctx, x, y, s, p, lw = 3.5, color) {
  if (p <= 0) return;
  const p2 = PAL();
  ctx.save();
  ctx.strokeStyle = color || p2.accent; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.globalAlpha = 0.4 + 0.6 * clamp01((p - 0.4) / 0.6);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, y + s * 0.02);
  ctx.lineTo(x - s * 0.12, y + s * 0.34);
  if (p < 0.5) { const q = p / 0.5; ctx.lineTo(x - s * 0.12 + s * 0.55 * q, y + s * 0.34 - s * 0.68 * q); }
  else ctx.lineTo(x + s * 0.43, y - s * 0.34);
  ctx.stroke();
  ctx.restore();
}
