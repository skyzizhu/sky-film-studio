// =====================================================================
// sky-film-studio · components/paintfx.js —— 绘画质感包（移植自 huashu 双库）
// flatFill  双色分面（TOON.flat：clip→阴影→偏移高光→本色，右下阴影带+左上高光边）
// wobblePath 手绘抖动（DG.hand：密度化+值噪声；boiling 每 0.125s 重抖=手绘沸腾感）
// brushReveal 笔刷揭开（DG.revealMask：之字形笔触遮罩从上到下刷出实体）
// 用法：drawObj/drawEntity 传 cfg.flat:true / cfg.wobble:1.8 / motion:"brushReveal"
// =====================================================================
"use strict";

// ---------- 值噪声（种子固定） ----------
const _NOISE = (() => { const r = mulberry32(4242), a = []; for (let i = 0; i < 64; i++) a.push(r() * 2 - 1); return a; })();
function vnoise(x) {
  const i = Math.floor(x), f = x - i;
  const a = _NOISE[i & 63], b = _NOISE[(i + 1) & 63], s = f * f * (3 - 2 * f);
  return a + (b - a) * s;
}

// ---------- 手绘抖动（boiling：8fps 重抖，像逐帧手绘） ----------
function wobblePath(pts, seed, amp, t, per) {
  if (!amp) return pts;
  per = per || 8;
  const boil = Math.floor((t || 0) * 8);                 // 每 0.125s 换一次抖动相位
  const ph = (seed * 13.7 + boil * 0.618) % 64;
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / per));
    for (let k = 0; k < n; k++) {
      const q = k / n;
      const x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q;
      const idx = out.length;
      out.push([x + vnoise(idx * 0.35 + ph) * amp, y + vnoise(idx * 0.35 + ph + 31) * amp]);
    }
  }
  out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  out.closed = _isClosed(pts);
  return out;
}

// ---------- 双色分面填充 ----------
function flatFill(ctx, pts, cfg) {
  const p = PAL();
  const path = new Path2D();
  pts.forEach((q, i) => i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]));
  path.closePath();
  const v = (cfg && cfg.v) || [9, 11], w2 = (cfg && cfg.w) || [4, 5];
  const base = (cfg && cfg.base) || p.accent, sh = (cfg && cfg.shadow) || p.accentDeep, hi = (cfg && cfg.hi) || p.accentHi;
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = sh; ctx.fill(path);                                  // 整块阴影
  ctx.save(); ctx.translate(-v[0], -v[1]); ctx.fillStyle = hi; ctx.fill(path); ctx.restore();   // 左上高光
  ctx.save(); ctx.translate(-v[0] + w2[0], -v[1] + w2[1]); ctx.fillStyle = base; ctx.fill(path); ctx.restore(); // 本色
  ctx.restore();
}

// ---------- 笔刷揭开（之字形笔触遮罩，从上往下刷出实体） ----------
/* cfg: { paths|id, x, y, s, at, dur=1.2, rows=6, color?, lw?, flat?, wobble? } */
function brushReveal(ctx, t, l, cfg) {
  const paths = _objectPaths(cfg);
  if (!paths) return;
  const u = MO.seg(l, cfg.at ?? 0, (cfg.at ?? 0) + (cfg.dur || 1.2));
  if (u <= 0) return;
  const s = cfg.s || 2, p = PAL();
  // 实体包围盒（局部坐标 → 画布）
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const pts of paths) for (const q of pts) {
    x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]);
    x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]);
  }
  const bx0 = cfg.x + x0 * s, by0 = cfg.y + y0 * s, bw = (x1 - x0) * s, bh = (y1 - y0) * s;
  // 笔触遮罩：rows 行之字带，逐行按进度推进（交替方向）
  const rows = cfg.rows || 6, rh = bh / rows;
  const e = MO.outCubic(u);
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < rows; i++) {
    const rowP = MO.clamp01(e * rows - i);
    if (rowP <= 0) break;
    const ry = by0 + i * rh;
    const wBand = rowP * (bw + rh * 0.6);
    const dir = i % 2 ? -1 : 1;
    const xL = dir > 0 ? bx0 - rh * 0.3 : bx0 + bw - wBand + rh * 0.3;
    ctx.rect(Math.min(xL, xL + wBand), ry - rh * 0.1, wBand, rh * 1.2);
  }
  ctx.clip();
  // 遮罩内画完整实体（实心填充 + 描边，支持手绘抖动）
  ctx.save();
  ctx.translate(cfg.x, cfg.y); ctx.scale(s, s);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (cfg.glow) { ctx.shadowColor = hexA(p.accentHi, 0.5); ctx.shadowBlur = cfg.glow; }
  if (cfg.fillRule) _fillCompound(ctx,paths,cfg);
  for (let pts of paths) {
    if (cfg.wobble) pts = wobblePath(pts, cfg.wSeed || 3, cfg.wobble, t, 6);
    ctx.beginPath();
    pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
    if (_isClosed(pts)) {
      ctx.closePath();
      if (cfg.fillRule || cfg.fill === null || cfg.fill === false || cfg.style === "line") { /* stroke only */ }
      else if (cfg.flat !== false) { flatFill(ctx, pts); continue; }
      else { ctx.fillStyle = cfg.fill || hexA(p.accentDeep, 0.5); ctx.fill(); }
    }
    ctx.strokeStyle = cfg.stroke || cfg.color || p.accent;
    ctx.lineWidth = (cfg.lw || 3.5) / s;
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
  // 当前笔刷行高亮提示
  const curRow = Math.min(rows - 1, Math.floor(e * rows));
  const rowP = MO.clamp01(e * rows - curRow);
  if (u < 1) {
    const ry = by0 + curRow * rh;
    const dir = curRow % 2 ? -1 : 1;
    const wBand = rowP * (bw + rh * 0.6);
    const xL = dir > 0 ? bx0 - rh * 0.3 : bx0 + bw - wBand + rh * 0.3;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = hexA(p.accentHi, 0.14);
    ctx.fillRect(Math.min(xL, xL + wBand), ry, wBand, rh);
    ctx.restore();
  }
}
