// =====================================================================
// sky-film-studio · components/svgicons.js —— SVG 原生渲染图标（替代折线近似）
// 把 icons.js / icons-fill.js 的 SVG 路径同步编译为原生 Path2D →
// ctx.fill/stroke 绘制：保留贝塞尔曲线与填充，无异步加载竞态。
// =====================================================================
"use strict";

window.SVG_ICONS = {}; // name -> synchronously compiled native vector paths

/* Native vector paths compile synchronously: no image-load race or colour cache. */
function getSVGIcon(name, opts = {}) {
  if (window.SVG_ICONS[name]) return window.SVG_ICONS[name];
  const fill = window.ICONS_FILL?.[name];
  const outline = window.ICONS?.[name];
  if (!fill && !outline) throw new Error(`未知 SVG 图标 ${name}`);
  return window.SVG_ICONS[name] = fill
    ? { size:256, fill:true, paths:fill.map(q=>({path:new Path2D(q.d),base:q.base})) }
    : { size:24, fill:false, paths:outline.map(d=>({path:new Path2D(d)})) };
}
function paintSVGIcon(ctx, icon, cfg, width) {
  const p=PAL();
  ctx.save(); ctx.translate(-width/2,-width/2); ctx.scale(width/icon.size,width/icon.size);
  for (const q of icon.paths) {
    ctx.save();
    if (icon.fill) {
      ctx.fillStyle=q.base?(cfg.deep||p.accentDeep):(cfg.color||p.accent);
      ctx.globalAlpha*=q.base?.35:1; ctx.fill(q.path);
    } else {
      ctx.strokeStyle=cfg.color||p.accent; ctx.lineWidth=cfg.strokeWidth??2;
      ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(q.path);
    }
    ctx.restore();
  }
  ctx.restore();
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
  const m = cfg.enter || cfg.motion || "fadeIn";

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
    dy = 40 * (1 - alpha) + Math.sin(t * 1.5) * 5 * alpha;
    scale = 1;
  } else {
    // drawOn 近似：alpha 渐入 + 剪裁从左到右展开
    alpha = 1;
    scale = 1;
  }

  ctx.globalAlpha *= alpha * (cfg.alpha ?? 1);
  ctx.translate(x, y + dy);
  if (m === "grow") ctx.translate(0,w/2);
  ctx.scale(scale, scale);
  if (m === "grow") ctx.translate(0,-w/2);

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

  paintSVGIcon(ctx,img,cfg,w);
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

// Paths are compiled on first use synchronously; custom colours need no preload.
function preloadSVGIcons() { return Promise.resolve(); }
