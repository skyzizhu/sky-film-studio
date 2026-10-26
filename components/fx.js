// =====================================================================
// sky-film-studio · components/fx.js —— 冲击特效包
// shockwave 冲击波 / sparks 粒子飞射 / speedlines 速度线 / rays 放射光
// beatWipe 拍首转场（bands 斜切色带 / ink 墨晕 / bar 横推 / scan 扫描线）
// =====================================================================
"use strict";

/* 冲击波：双环扩散，落点/砸入时叠在元素上 */
function shockwave(ctx, t, l, cfg) {
  const p = PAL();
  for (let i = 0; i < 2; i++) {
    const u = seg(l, (cfg.at || 0) + i * 0.06, (cfg.at || 0) + i * 0.06 + (cfg.dur || 0.6));
    if (u <= 0 || u >= 1) continue;
    const r = 20 + MO.outCubic(u) * (cfg.r || 360) * (1 - i * 0.3);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = hexA(cfg.color || p.accentHi, (1 - u) * (0.7 - i * 0.25));
    ctx.lineWidth = (4.5 - i * 1.5) * (1 - u) + 1;
    ctx.beginPath(); ctx.arc(cfg.x, cfg.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

/* 粒子飞射：落点冲击的火星（种子固定；可限 spread 定向） */
function sparks(ctx, t, l, cfg) {
  const p = PAL();
  const rnd = mulberry32((cfg.seed || 7) + 13);
  const dur = cfg.dur || 0.5, n = cfg.n || 14, dist = cfg.dist || 230;
  const a0 = cfg.a0 ?? 0, spread = cfg.spread ?? Math.PI * 2;
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const ang = a0 + (rnd() - 0.5) * spread;
    const v = 0.55 + rnd() * 0.75, len = 12 + rnd() * 30;
    const u = seg(l, cfg.at || 0, (cfg.at || 0) + dur);
    if (u <= 0) continue;
    const e = MO.outCubic(u);
    const d = v * e * dist;
    const x2 = cfg.x + Math.cos(ang) * d, y2 = cfg.y + Math.sin(ang) * d;
    const d1 = Math.max(0, d - len * (1 - e * 0.4));
    ctx.strokeStyle = hexA(cfg.color || p.accentHi, (1 - u) * 0.85);
    ctx.lineWidth = 2.2 * (1 - u) + 0.6;
    ctx.beginPath();
    ctx.moveTo(cfg.x + Math.cos(ang) * d1, cfg.y + Math.sin(ang) * d1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

/* 速度线：全屏横向冲刺线（转折/快推叠加），dir=1 右 / -1 左 */
function speedlines(ctx, t, l, cfg) {
  const p = PAL();
  const dur = cfg.dur || 0.45, n = cfg.n || 16, dir = cfg.dir || 1;
  const rnd = mulberry32((cfg.seed || 31) + 5);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const ys = [], lens = [];
  for (let i = 0; i < n; i++) { ys.push(60 + rnd() * (H - 160)); lens.push(120 + rnd() * 300); }
  for (let i = 0; i < n; i++) {
    const u = seg(l, cfg.at || 0, (cfg.at || 0) + dur);
    if (u <= 0) continue;
    const e = MO.outExpo(u);
    const x = dir > 0 ? -400 + e * (W + 700) : W + 400 - e * (W + 700);
    ctx.strokeStyle = hexA(p.accentHi, (1 - u) * (0.16 + 0.12 * ((i * 37) % 10) / 10));
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x, ys[i]); ctx.lineTo(x + lens[i] * dir, ys[i]); ctx.stroke();
  }
  ctx.restore();
}

/* 放射光：权威感/神迹感（缓慢旋转的光芒） */
function rays(ctx, t, l, cfg) {
  const p = PAL();
  const a = seg(l, cfg.at || 0, (cfg.at || 0) + 0.6) * (cfg.alpha ?? 0.1);
  if (a <= 0) return;
  const n = cfg.n || 12, rot = (cfg.rot ?? 0) + t * 0.06;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.translate(cfg.x, cfg.y); ctx.rotate(rot);
  for (let i = 0; i < n; i++) {
    if (i % 2) continue;                                  // 隔一道画，疏朗
    const ang = i / n * Math.PI * 2;
    // 默认收在画内（中心到四边距离×0.92）；要全屏出血光需显式传 cfg.r1
    const r1 = cfg.r0 || 120, r2 = cfg.r1 || Math.min(cfg.x, W - cfg.x, cfg.y, H - cfg.y) * 0.92;
    const g = ctx.createLinearGradient(Math.cos(ang) * r1, Math.sin(ang) * r1, Math.cos(ang) * r2, Math.sin(ang) * r2);
    g.addColorStop(0, hexA(cfg.color || p.accentHi, a));
    g.addColorStop(1, hexA(cfg.color || p.accentHi, 0));
    ctx.strokeStyle = g; ctx.lineWidth = cfg.w || 60;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
    ctx.stroke();
  }
  ctx.restore();
}

/* 拍首转场：bands 斜切色带 / ink 墨晕开 / bar 横条推 / scan 扫描线
   用法：beat 内 l∈[0,dur] 调用；覆盖场景层、不盖字幕/时间轴（chrome 保持可读） */
function beatWipe(ctx, t, l, cfg) {
  const p = PAL();
  const dur = cfg.dur || 0.5, u = seg(l, cfg.at || 0, (cfg.at || 0) + dur);
  if (u <= 0 || u >= 1) return;
  const col = cfg.color || p.accent;
  ctx.save();
  if (cfg.mode === "bands") {
    ctx.globalAlpha = Math.sin(Math.PI * u) * 0.9;
    for (let i = 0; i < 3; i++) {
      const q = clamp01(u * 1.3 - i * 0.12);
      const x = -500 + q * (W + 900);
      ctx.fillStyle = i === 1 ? p.accentHi : hexA(col, 0.85);
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 260, 0); ctx.lineTo(x + 130, H); ctx.lineTo(x - 130, H);
      ctx.closePath(); ctx.fill();
    }
  } else if (cfg.mode === "ink") {
    // 墨晕：中段最大覆盖（正弦包络），圆边缘带不规则毛边
    const cover = Math.sin(Math.PI * u);
    const r = cover * Math.hypot(W, H) * 0.62;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = hexA(col, 0.9);
    ctx.beginPath();
    const rnd = mulberry32(77);
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * Math.PI * 2;
      const rr = r * (1 + (rnd() - 0.5) * 0.18 * cover);
      const x = (cfg.x ?? W / 2) + Math.cos(a) * rr, y = (cfg.y ?? H / 2) + Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  } else if (cfg.mode === "bar") {
    ctx.globalAlpha = 0.95;
    const q = MO.inOutCubic(u);
    const w2 = W * 0.55 * Math.sin(Math.PI * u) + W * 0.2;
    ctx.fillStyle = hexA(col, 0.92);
    ctx.fillRect(-W * 0.1 + q * W, 0, w2, H);
  } else if (cfg.mode === "scan") {
    const q = MO.inOutCubic(u);
    const x = q * (W + 300) - 150;
    const g = ctx.createLinearGradient(x - 260, 0, x, 0);
    g.addColorStop(0, hexA(col, 0));
    g.addColorStop(1, hexA(col, 0.55 * Math.sin(Math.PI * u)));
    ctx.fillStyle = g; ctx.fillRect(x - 260, 0, 260, H);
    ctx.fillStyle = hexA(p.accentHi, 0.9 * Math.sin(Math.PI * u));
    ctx.fillRect(x, 0, 5, H);
  }
  ctx.restore();
}
