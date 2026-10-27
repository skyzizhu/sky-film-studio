// =====================================================================
// sky-film-studio · components/svgicons.js —— SVG 原生渲染图标（替代折线近似）
// 把 icons.js / icons-fill.js 里的 SVG 路径构建成完整 SVG → Image 对象 →
// ctx.drawImage() 绘制。曲线光滑、比例精准、填充质量=设计师原版。
// =====================================================================
"use strict";

window.SVG_ICONS = {};      // name → Image 对象（缓存）
window.SVG_PENDING = {};    // name → Promise（去重）

/* 构建 SVG 字符串（lucide 线稿 或 phosphor 双色） */
function _buildSVG(name, opts) {
  const p = PAL();
  const accent = opts.color || p.accent;
  const deep = opts.deep || p.accentDeep;
  const hi = opts.hi || p.accentHi;
  const size = opts.px || 512;   // 渲染分辨率

  // 优先 phosphor 双色（更有辨识度）
  if (window.ICONS_FILL && window.ICONS_FILL[name]) {
    const layers = window.ICONS_FILL[name];
    let paths = "";
    for (const q of layers) {
      const fill = q.base ? deep : accent;
      const op = q.base ? 0.35 : 1;
      paths += `<path d="${q.d}" fill="${fill}" opacity="${op}"/>`;
    }
    // 勾边提清晰度
    for (const q of layers) {
      if (!q.base) paths += `<path d="${q.d}" fill="none" stroke="${hi}" stroke-width="3" opacity="0.3"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}">${paths}</svg>`;
  }

  // 回退 lucide 线稿
  if (window.ICONS && window.ICONS[name]) {
    const ds = window.ICONS[name];
    let paths = "";
    for (const d of ds) {
      paths += `<path d="${d}" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">${paths}</svg>`;
  }

  return null;
}

/* 获取（或创建）SVG 图标的 Image 对象 */
function getSVGIcon(name, opts) {
  const key = name + "_" + (opts.color || "") + (opts.deep || "");
  if (window.SVG_ICONS[key]) return window.SVG_ICONS[key];
  if (window.SVG_PENDING[key]) return null;   // 还在加载

  const svg = _buildSVG(name, opts || {});
  if (!svg) return null;

  const img = new Image();
  window.SVG_PENDING[key] = true;
  img.onload = () => {
    window.SVG_ICONS[key] = img;
    delete window.SVG_PENDING[key];
  };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  return null;    // 第一次调用返回 null，下一帧就有缓存了
}

/* 绘制 SVG 图标（替代 drawObj 的折线渲染）
   cfg: { id, x, y, s=2(缩放), at, dur, motion: fadeIn|grow|drawOn(近似), alpha, glow } */
function drawSVGIcon(ctx, t, l, cfg) {
  const img = getSVGIcon(cfg.id, cfg);
  if (!img) return;

  const u = MO.seg(l, cfg.at || 0, (cfg.at || 0) + (cfg.dur || 0.8));
  if (u <= 0) return;

  const p = PAL();
  const s = cfg.s || 2;
  const w = 50 * s;       // 图标基准尺寸
  const x = cfg.x, y = cfg.y;
  const m = cfg.motion || "fadeIn";

  ctx.save();

  // 诞生动画
  let alpha = 1, scale = 1, dy = 0;
  if (m === "fadeIn") {
    alpha = MO.outCubic(u);
    scale = 0.96 + 0.04 * u;
  } else if (m === "grow") {
    alpha = Math.min(1, u * 2);
    scale = MO.outBack(u, 1.15);
  } else if (m === "pop") {
    alpha = MO.seg(l, cfg.at || 0, (cfg.at || 0) + 0.05);
    scale = MO.spring(u * (cfg.dur || 0.8), 2.5, 10);
  } else if (m === "floatIn") {
    alpha = MO.outCubic(u);
    dy = 40 * (1 - alpha);
    if (u >= 1) dy = Math.sin(t * 1.5) * 5;    // 持续缓浮
    scale = 1;
  } else {
    // drawOn 近似：alpha 渐入 + 剪裁从左到右展开
    alpha = 1;
    scale = 1;
  }

  ctx.globalAlpha = alpha * (cfg.alpha ?? 1);
  ctx.translate(x, y + dy);
  ctx.scale(scale, scale);

  // drawOn 近似：圆形剪裁从中心扩展
  if (m === "drawOn") {
    const reveal = MO.outCubic(u);
    const r = w * 0.8 * reveal + 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
  }

  // 光晕
  if (cfg.glow) {
    ctx.shadowColor = hexA(p.accentHi, 0.6);
    ctx.shadowBlur = cfg.glow;
  }

  ctx.drawImage(img, -w / 2, -w / 2, w, w);
  ctx.restore();

  // 落定微弹光环
  if (u >= 1 && cfg.glow) {
    const k = MO.land(l, (cfg.at || 0) + (cfg.dur || 0.8), 0.04);
    if (k > 1.001) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = p.accentHi;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, w * 0.65 * k, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// 预热常用图标（initIcons 后调用）
function preloadSVGIcons() {
  const common = ["rocket", "shield", "clock", "coins", "users", "network",
    "trending-up", "database", "lightbulb", "message-circle", "globe",
    "trophy", "zap", "brain", "landmark", "scroll", "lock", "key",
    "search", "smartphone", "monitor", "cloud", "code", "terminal",
    "cpu", "hard-drive", "server", "wifi", "flag", "star", "gem",
    "flame", "sun", "moon", "mountain", "leaf", "tree-pine",
    "car", "plane", "train-front", "ship", "building", "house",
    "factory", "bridge", "graduation-cap", "heart-pulse", "stethoscope",
    "scale", "gavel", "newspaper", "mic", "camera", "video",
    "bot", "puzzle", "target", "medal", "award", "crown", "sparkle"];
  for (const name of common) {
    getSVGIcon(name, {});
  }
}
