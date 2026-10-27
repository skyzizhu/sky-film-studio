// =====================================================================
// sky-film-studio · engine/blur.js —— 运动模糊（P0：让动画从"弹"变"砸"）
// 原理：不用 ctx.filter（太慢），用多次偏移绘制近似方向模糊。
// 快动画帧叠 3~5 层半透明残影，运动方向偏移，落定瞬间收敛到清晰。
// =====================================================================
"use strict";

/*
 * 方向运动模糊包装器：把任意绘制函数包上运动模糊效果
 * 用法：
 *   withMotionBlur(ctx, t, { dx, dy, strength }, () => {
 *     kineticWord(ctx, t, l, {...});
 *   });
 * dx/dy = 运动方向像素偏移（正=向右/下），strength = 残影层数（3=轻 5=重）
 */
function withMotionBlur(ctx, t, cfg, drawFn) {
  const layers = cfg.strength || 3;
  const dx = cfg.dx || 0, dy = cfg.dy || 0;
  if (layers <= 1 || (dx === 0 && dy === 0)) { drawFn(); return; }
  
  ctx.save();
  // 从尾到头画，最后一层（最清晰）在最上面
  for (let i = layers; i >= 1; i--) {
    const q = i / layers;           // 0=远尾影 1=当前帧
    const alpha = i === 1 ? 1 : (1 - q) * 0.6;  // 尾影更透明
    const ox = dx * (1 - q) * 1.2;  // 尾影偏移更远
    const oy = dy * (1 - q) * 1.2;
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(-ox, -oy);
    drawFn();
    ctx.restore();
  }
  ctx.restore();
}

/*
 * 缩放模糊（slam 动画专用）：落定前几帧叠大→小多层
 * scaleFrom = 起始缩放（1.7），dur = 动画时长，u = 当前进度
 * 用法：
 *   withSlamBlur(ctx, u, { scaleFrom: 1.7 }, () => {
 *     txt(ctx, "关键词", x, y, {...});
 *   });
 */
function withSlamBlur(ctx, u, cfg, drawFn) {
  const scaleFrom = cfg.scaleFrom || 1.7;
  if (u >= 1) { drawFn(); return; }
  
  const layers = 4;
  const scaleNow = scaleFrom - (scaleFrom - 1) * MO.outExpo(u);
  ctx.save();
  for (let i = layers; i >= 1; i--) {
    const q = i / layers;
    const alpha = i === 1 ? 1 : (1 - q) * 0.35;
    // 模拟模糊：当前帧清晰，前几帧是更大缩放的半透明残影
    const blurScale = scaleNow + (scaleFrom - scaleNow) * q * 0.6;
    ctx.globalAlpha = alpha;
    ctx.save();
    // 围绕中心缩放
    const cx = cfg.cx ?? 0, cy = cfg.cy ?? 0;
    ctx.translate(cx, cy);
    ctx.scale(blurScale / scaleNow, blurScale / scaleNow);
    ctx.translate(-cx, -cy);
    drawFn();
    ctx.restore();
  }
  ctx.restore();
}

/*
 * 预渲染模糊层（P2 景深用）：把 canvas 的一个区域做模糊并缓存
 * 不是逐帧 ctx.filter，而是一次性生成模糊版本
 */
const _blurCache = new Map();

function preBlur(canvas, key, radius) {
  const cacheKey = key + "_" + radius;
  if (_blurCache.has(cacheKey)) return _blurCache.get(cacheKey);
  
  // 用缩小再放大近似高斯模糊
  const small = document.createElement("canvas");
  const ratio = 1 / (radius / 2 + 1);
  small.width = Math.max(1, Math.round(canvas.width * ratio));
  small.height = Math.max(1, Math.round(canvas.height * ratio));
  const sctx = small.getContext("2d");
  sctx.drawImage(canvas, 0, 0, small.width, small.height);
  
  const blurred = document.createElement("canvas");
  blurred.width = canvas.width;
  blurred.height = canvas.height;
  const bctx = blurred.getContext("2d");
  bctx.imageSmoothingEnabled = true;
  bctx.drawImage(small, 0, 0, blurred.width, blurred.height);
  
  _blurCache.set(cacheKey, blurred);
  return blurred;
}

/*
 * 回声字（Echo Text）：600px 轮廓字在背景漂移
 * 设计感的核心元素：巨大的轮廓字缓缓漂移，制造纵深
 */
function echoText(ctx, t, cfg) {
  const p = PAL();
  const text = cfg.text;
  const size = cfg.size || 600;
  const x = cfg.x ?? W / 2;
  const y = cfg.y ?? H / 2;
  const alpha = cfg.alpha ?? 0.04;
  
  // 缓慢漂移（60s 周期）
  const drift = Math.sin(t * 0.1 + (cfg.phase || 0)) * 30;
  const dy2 = Math.cos(t * 0.08 + (cfg.phase || 0)) * 15;
  
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = FONT(700, size);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${cfg.ls ?? 20}px`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = cfg.color || p.accent;
  ctx.lineWidth = 1.5;
  ctx.translate(x + drift, y + dy2);
  ctx.rotate(cfg.rot ?? -0.03);
  ctx.strokeText(text, 0, 0);
  ctx.restore();
}

/*
 * 胶囊标签（Capsule Label）：文字嵌入胶囊形容器
 * 替代底部字幕的"文字即设计"方案
 */
function capsuleLabel(ctx, t, l, cfg) {
  const p = PAL();
  const text = cfg.text;
  const x = cfg.x, y = cfg.y;
  const size = cfg.size || 24;
  const at = cfg.at || 0;
  const u = MO.seg(l, at, at + 0.4);
  if (u <= 0) return;
  
  ctx.save();
  ctx.font = FONT(600, size);
  const w = ctx.measureText(text).width + size * 1.2;
  const h = size * 1.7;
  
  // 缩放入场
  ctx.translate(x, y);
  ctx.scale(MO.outBack(u), MO.outBack(u));
  
  // 胶囊底色
  ctx.fillStyle = cfg.bg || hexA(p.accent, 0.12);
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  
  // 胶囊边框
  ctx.strokeStyle = cfg.border || hexA(p.accent, 0.4);
  ctx.lineWidth = 1.5;
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.stroke();
  
  // 文字
  ctx.fillStyle = cfg.color || p.accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${cfg.ls ?? 3}px`;
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

/*
 * 排版层级系统（Typography Scale）
 * 钩子拍：首行 70px + 关键词 170px + 胶囊标签
 * 使文字本身成为画面主体
 */
function typographyScale(ctx, t, l, cfg) {
  const p = PAL();
  const u = MO.seg(l, cfg.at || 0, (cfg.at || 0) + (cfg.dur || 1.0));
  if (u <= 0) return;
  const x = cfg.x ?? W / 2;
  const y = cfg.y ?? H / 2;
  
  // 首行（70px，较小，引导）
  if (cfg.firstLine) {
    const a1 = MO.seg(u, 0, 0.4);
    withSlamBlur(ctx, a1, { scaleFrom: 1.4, cx: x, cy: y - 100 }, () => {
      txt(ctx, cfg.firstLine, x, y - 100, {
        size: 70, weight: 600, color: p.creamDim, alpha: a1, ls: 8
      });
    });
  }
  
  // 关键词（170px，最大，带运动模糊的 slam）
  if (cfg.keyword) {
    const a2 = MO.seg(u, 0.15, 0.55);
    withSlamBlur(ctx, a2, { scaleFrom: 1.7, cx: x, cy: y }, () => {
      txt(ctx, cfg.keyword, x, y, {
        size: 170, weight: 700, color: cfg.keywordColor || p.accentHi,
        alpha: a2, ls: 10, glow: 15
      });
    });
  }
  
  // 胶囊标签（小字，收尾）
  if (cfg.label) {
    capsuleLabel(ctx, t, l, {
      text: cfg.label, x, y: y + 130, size: 24, at: (cfg.at || 0) + 0.5,
      color: p.accent
    });
  }
  
  // 下划线（8px，精准装饰）
  if (cfg.underline) {
    const a3 = MO.seg(u, 0.5, 0.8);
    if (a3 > 0) {
      ctx.save();
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      const lineW = 200 * MO.outCubic(a3);
      ctx.beginPath();
      ctx.moveTo(x - lineW / 2, y + 70);
      ctx.lineTo(x - lineW / 2 + lineW, y + 70);
      ctx.stroke();
      ctx.restore();
    }
  }
}
