// =====================================================================
// sky-film-studio · components/base.js —— 叙事基件
// 约定：签名 (ctx, t, l, cfg)，t 全局秒 / l 拍内局部秒；
// 数字一律经 cfg 从项目 data.js 传入，组件内不硬编码数据数字。
// =====================================================================
"use strict";

/* 钩子：粒子炸开 + 大字（+可选 numCounter 对撞在场景里另调） */
function hookBurst(ctx, t, l, cfg) {
  const p = PAL();
  const bp = E.outCubic(seg(l, 0, 1.15));
  if (l < 1.6) {
    const rnd = mulberry32(77), n = cfg.burst || 150;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, sp = 0.25 + Math.pow(rnd(), 0.6);
      const d = sp * bp * 690;
      const al = (1 - seg(l, 0.25, 1.5)) * 0.5;
      if (al <= 0) continue;
      ctx.fillStyle = hexA(p.accentHi, al);
      ctx.beginPath();
      ctx.arc(W / 2 + Math.cos(a) * d, H * 0.46 + Math.sin(a) * d * 0.72, 0.8 + rnd() * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    const fl = pulse(l, 0, 0.55);
    if (fl > 0) {
      ctx.strokeStyle = hexA(p.accentHi, fl * 0.75); ctx.lineWidth = 3 + fl * 5;
      ctx.beginPath(); ctx.arc(W / 2, H * 0.46, 40 + (1 - fl) * 320, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  (cfg.lines || []).forEach((ln, i) => {
    const at = (cfg.at || 0) + i * 0.28;
    const a = seg(l, at + 0.05, at + 0.5);
    if (a <= 0) return;
    ctx.save();
    ctx.translate(W / 2, (cfg.y || 470) + i * (cfg.lineGap || 110));
    ctx.scale(1 + (1 - E.outCubic(a)) * 0.16, 1 + (1 - E.outCubic(a)) * 0.16);
    txt(ctx, ln.text, 0, 0, {
      size: ln.size || 58, weight: ln.weight || 600, ls: ln.ls ?? 6, alpha: a,
      gradient: !!ln.gold, color: ln.color || (ln.gold ? p.accentHi : p.cream),
      glow: ln.gold ? 22 : 16
    });
    ctx.restore();
  });
}

/* 数字滚动（单组或对撞两组）。cfg: { x?, y=760, items:[{roll,text,unit,label,tag}], at=0.8, span=800, numSize=120, collide } */
function numCounter(ctx, t, l, cfg) {
  const p = PAL();
  const items = cfg.items || [];
  const fade = cfg.fade ?? 1;
  const numSize = cfg.numSize || 120;
  items.forEach((d, i) => {
    const at = (cfg.at || 0.8) + i * 0.5;
    const prog = E.outExpo(seg(l, at, at + 0.55));
    if (prog <= 0 || fade <= 0) return;
    const val = d.roll * prog;
    const shown = String(d.text).includes(".") ? val.toFixed(2) : String(Math.round(val));
    const vert = W < 1280 && items.length > 1;      // 窄画幅：双数字改竖排
    const span = vert ? 0 : (cfg.span || Math.min(800, W - 320));
    const x = (cfg.x !== undefined ? cfg.x : W / 2) + (i - (items.length - 1) / 2) * span;
    const y = (cfg.y || 760) + (vert ? i * 230 : 0);
    ctx.save(); ctx.textAlign = "center";
    ctx.font = FONT(700, numSize);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
    const wNum = ctx.measureText(shown).width;
    ctx.font = FONT(600, numSize * 0.44);
    const wUnit = ctx.measureText(d.unit).width;
    const x0 = x - (wNum + 12 + wUnit) / 2;
    txt(ctx, shown, x0 + wNum / 2, y, { size: numSize, weight: 700, baseline: "middle", gradient: true, alpha: fade, glow: 20 });
    txt(ctx, d.unit, x0 + wNum + 12 + wUnit / 2, y + 16, { size: numSize * 0.44, weight: 600, baseline: "middle", color: p.accent, alpha: fade });
    const aLab = seg(prog, 0.55, 1) * fade;
    const flL = fitText(ctx, d.label, Math.min(460, W - 120), 30);
    txt(ctx, flL.text, x, y + numSize * 0.62, { size: flL.size, color: p.creamDim, ls: 4, alpha: aLab });
    if (d.tag) txt(ctx, d.tag, x, y + numSize * 0.96, { size: 21, color: p.faint, ls: 3, alpha: aLab });
    ctx.restore();
  });
  if (cfg.collide) {
    const ring = pulse(l, (cfg.at || 0.8) + 0.55, (cfg.at || 0.8) + 1.1);
    if (ring > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = hexA(p.accentHi, ring * 0.6); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(W / 2, (cfg.y || 760) - 20, 26 + (1 - ring) * 120, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

/* 左上角章节标记（第 N 步 · 名称 + 出血幽灵数字） */
function stepIntro(ctx, t, l, idx, nameStr, color) {
  const p = PAL();
  const a = seg(l, 0.05, 0.45);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = 0.06 * a;
  txt(ctx, String(idx).padStart(2, "0"), 86, 152, { size: 230, weight: 700, align: "left", baseline: "middle", ls: -4 });
  ctx.restore();
  const aN = seg(l, 0.12, 0.5);
  txt(ctx, `第 ${idx} 步`, 150, 118, { size: 25, color: color || p.accent, align: "left", alpha: aN * 0.92, ls: 8 });
  const fn2 = fitText(ctx, nameStr, W - 420, 44);
  txt(ctx, fn2.text, 150, 180, { size: fn2.size, weight: TH.fonts.titleWeight || 600, align: "left", color: color || p.cream, alpha: aN, ls: 10, glow: 10 });
  rule(ctx, 152, 152 + 300 * aN, 208, 0.5, 2);
}

/* N 节点时间轴。cfg: { x0=330, x1=1590, y=1008, starts:[秒], doneAt, items:[{label}], showAt=1.95, fadeAt } */
function timelineN(ctx, t, cfg) {
  const p = PAL();
  const fade = (cfg.alpha ?? 1) * seg(t, cfg.showAt ?? 1.95, (cfg.showAt ?? 1.95) + 0.45)
    * (1 - seg(t, cfg.fadeAt ?? 1e9, (cfg.fadeAt ?? 1e9) + 1.2));
  if (fade <= 0) return;
  const x0 = cfg.x0 ?? Math.round(W * 0.17), x1 = cfg.x1 ?? Math.round(W * 0.83), y = cfg.y ?? H - 72;
  const compact = W < 1280;   // 窄画幅紧凑模式：只画序号，当前步骤名居中在轴上方
  const n = cfg.items.length, xs = i => x0 + i * (x1 - x0) / (n - 1);
  const starts = cfg.starts, doneAll = t >= (cfg.doneAt ?? 1e9);
  let act = -1;
  for (let i = n - 1; i >= 0; i--) if (t >= starts[i]) { act = i; break; }
  ctx.save(); ctx.globalAlpha = fade;
  ctx.strokeStyle = hexA(p.cream, 0.14); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  for (let i = 0; i < n - 1; i++) {
    const pr = clamp01((t - starts[i]) / (starts[i + 1] - starts[i]));
    if (pr <= 0) continue;
    const g = ctx.createLinearGradient(xs(i), 0, xs(i + 1), 0);
    g.addColorStop(0, hexA(p.accentDeep, 0.9)); g.addColorStop(1, hexA(p.accent, 0.95));
    ctx.strokeStyle = g; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(xs(i), y);
    ctx.lineTo(xs(i) + (xs(i + 1) - xs(i)) * E.outCubic(pr), y); ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const lit = t >= starts[i], isActive = i === act && !doneAll, x = xs(i);
    ctx.lineWidth = 2;
    if (lit) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 13);
      g.addColorStop(0, p.accentHi); g.addColorStop(1, p.accentDeep);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 9.5, 0, Math.PI * 2); ctx.fill();
      if (isActive) {
        const pu = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = hexA(p.accentHi, 0.35 + 0.3 * pu); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 15 + pu * 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    } else {
      ctx.strokeStyle = hexA(p.accent, 0.35); ctx.fillStyle = p.bg0;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const rt = t - starts[i];
    if (rt > 0 && rt < 0.6) {
      const q = rt / 0.6;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = hexA(p.accentHi, (1 - q) * 0.7); ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(x, y, 10 + q * 46, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (compact) {
      txt(ctx, String(i + 1), x, y + 24, { size: 15, color: lit ? p.accent : p.faint, alpha: fade * (lit ? 0.9 : 0.5) });
      if (isActive) {
        const flC = fitText(ctx, cfg.items[i].label, W - 160, 22);
        txt(ctx, flC.text, W / 2, y - 34, { size: flC.size, weight: 700, color: p.accentHi, alpha: fade, ls: 2, glow: 8 });
      }
    } else {
      const flC = fitText(ctx, cfg.items[i].label, (x1 - x0) / (n - 1) - 12, isActive ? 24 : 19.5);
      txt(ctx, flC.text, x, H - 34, {
        size: flC.size, weight: isActive ? 700 : 600,
        color: isActive ? p.accentHi : lit ? p.creamDim : p.faint,
        alpha: fade * (lit ? (isActive ? 1 : 0.85) : 0.4), ls: 1, glow: isActive ? 8 : 0
      });
      txt(ctx, String(i + 1), x, y - 26, { size: 17, color: lit ? p.accent : p.faint, alpha: fade * (lit ? 0.9 : 0.6) });
    }
  }
  ctx.restore();
}

/* 清单勾选。cfg: { x, y, w, title, items:[str], at0, dt=0.5, rowH=62 } */
function checkList(ctx, t, l, cfg) {
  const p = PAL();
  const aP = seg(l, cfg.at0 - 0.5, cfg.at0);
  if (aP <= 0) return;
  const rowH = cfg.rowH || 62;
  const h = 124 + Math.max(0, cfg.items.length - 1) * rowH + 44;
  ctx.save(); ctx.globalAlpha = aP;
  ctx.fillStyle = hexA(p.ink, 0.72);
  rrect(ctx, cfg.x, cfg.y, cfg.w, h, 14); ctx.fill();
  ctx.strokeStyle = hexA(p.accent, 0.3); ctx.lineWidth = 1.4;
  rrect(ctx, cfg.x, cfg.y, cfg.w, h, 14); ctx.stroke();
  ctx.restore();
  txt(ctx, cfg.title, cfg.x + 44, cfg.y + 46, { size: 27, color: p.creamDim, align: "left", ls: 8, alpha: aP });
  rule(ctx, cfg.x + 44, cfg.x + cfg.w - 44, cfg.y + 68, 0.3 * aP);
  cfg.items.forEach((s, i) => {
    const at = cfg.at0 + 0.15 + i * (cfg.dt || 0.5);
    const y = cfg.y + 124 + i * rowH;
    const bA = seg(l, at - 0.18, at);
    if (bA <= 0) return;
    ctx.strokeStyle = hexA(p.accent, 0.6 * bA); ctx.lineWidth = 1.6;
    rrect(ctx, cfg.x + 48, y - 17, 34, 34, 7); ctx.stroke();
    checkMark(ctx, cfg.x + 65, y, 26, seg(l, at, at + 0.35));
    const ft = fitText(ctx, s, cfg.w - 160, 29);
    txt(ctx, ft.text, cfg.x + 110, y + 1, { size: ft.size, align: "left", baseline: "middle", alpha: bA, ls: 3 });
  });
}

/* 流程路径。cfg: { x0, x1, y, nodes:[str], at0, waveAmp=26 } */
function flowPath(ctx, t, l, cfg) {
  const p = PAL();
  const aP = seg(l, cfg.at0, cfg.at0 + 0.4);
  if (aP <= 0) return;
  const nodes = cfg.nodes, step = (cfg.x1 - cfg.x0) / (nodes.length - 1);
  const lineP = E.inOutCubic(seg(l, cfg.at0 + 0.3, cfg.at0 + 1.6));
  ctx.save();
  ctx.strokeStyle = hexA(p.accent, 0.55); ctx.lineWidth = 2;
  ctx.setLineDash([6, 7]); ctx.lineDashOffset = -t * 30;
  ctx.globalAlpha = aP * lineP;
  ctx.beginPath();
  for (let i = 0; i < nodes.length; i++) {
    const x = cfg.x0 + i * step, y = cfg.y + Math.sin(i * 1.7) * (cfg.waveAmp ?? 26);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.restore();
  const fi = ((t * 0.55) % 1) * (nodes.length - 1), i0 = Math.floor(fi), q = fi - i0;
  if (lineP > 0.05 && i0 < nodes.length - 1) {
    const xa = cfg.x0 + i0 * step, xb = cfg.x0 + (i0 + 1) * step;
    const ya = cfg.y + Math.sin(i0 * 1.7) * (cfg.waveAmp ?? 26), yb = cfg.y + Math.sin((i0 + 1) * 1.7) * (cfg.waveAmp ?? 26);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = hexA(p.accentHi, 0.9);
    ctx.beginPath(); ctx.arc(xa + (xb - xa) * q, ya + (yb - ya) * q, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  nodes.forEach((s, i) => {
    const at = cfg.at0 + 0.15 + i * 0.28;
    const a = E.outBack(seg(l, at, at + 0.4));
    if (a <= 0) return;
    const x = cfg.x0 + i * step, y = cfg.y + Math.sin(i * 1.7) * (cfg.waveAmp ?? 26);
    ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
    ctx.fillStyle = hexA(p.ink, 0.95);
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(p.accent, 0.55); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    const fl = fitText(ctx, s, step * 0.86, 25);
    txt(ctx, fl.text, x, y + 56, { size: fl.size, color: p.creamDim, alpha: a, ls: 2 });
  });
}

/* 档案夹。cfg: { cx, cy, title, pairs:[[a,b]], at, note } */
function folder(ctx, t, l, cfg) {
  const p = PAL();
  const a = E.outBack(seg(l, cfg.at, cfg.at + 0.45));
  if (a <= 0) return;
  const nh = cfg.pairs.length <= 2 ? 148 : 148 + (cfg.pairs.length - 2) * 52;   // 高度随行数
  ctx.save();
  ctx.translate(cfg.cx, cfg.cy); ctx.scale(a, a); ctx.translate(-cfg.cx, -cfg.cy);
  ctx.fillStyle = hexA(p.ink, 0.94);
  rrect(ctx, cfg.cx - 380, cfg.cy - nh / 2, 760, nh, 12); ctx.fill();
  ctx.strokeStyle = hexA(p.accent, 0.5); ctx.lineWidth = 1.8;
  rrect(ctx, cfg.cx - 380, cfg.cy - nh / 2, 760, nh, 12); ctx.stroke();
  ctx.fillStyle = hexA(p.accent, 0.16);
  rrect(ctx, cfg.cx - 250, cfg.cy - nh / 2 - 18, 190, 24, 6); ctx.fill();
  ctx.strokeStyle = hexA(p.accent, 0.4); ctx.lineWidth = 1;
  rrect(ctx, cfg.cx - 250, cfg.cy - nh / 2 - 18, 190, 24, 6); ctx.stroke();
  txt(ctx, cfg.title, cfg.cx - 155, cfg.cy - nh / 2 - 5, { size: 19, color: p.accent, ls: 3 });
  const py0 = cfg.cy - (cfg.pairs.length - 1) * 26;                            // 行垂直居中
  cfg.pairs.forEach((pair, i) => {
    const aq = seg(l, cfg.at + 0.4 + i * 0.4, cfg.at + 0.8 + i * 0.4);
    if (aq <= 0) return;
    const fa = fitText(ctx, pair[0], 130, 30);
    const fb = fitText(ctx, pair[1], 380, 30);
    txt(ctx, fa.text, cfg.cx - 240, py0 + i * 52, { size: fa.size, baseline: "middle", alpha: aq, ls: 2 });
    txt(ctx, "→", cfg.cx - 108, py0 + i * 52, { size: 26, baseline: "middle", color: p.accentDeep, alpha: aq });
    txt(ctx, fb.text, cfg.cx + 40, py0 + i * 52, { size: fb.size, baseline: "middle", color: p.accentHi, alpha: aq, ls: 2, align: "left" });
  });
  ctx.restore();
  if (cfg.note) txt(ctx, cfg.note, cfg.cx, cfg.cy + 108, { size: 21, color: p.faint, alpha: seg(l, cfg.at + 1.05, cfg.at + 1.45), ls: 2 });
}

/* 日期卡。cfg: { x, y, w=360, h=176, date, note, at, stampText? } */
function dateCard(ctx, t, l, cfg) {
  const p = PAL();
  const a = E.outCubic(seg(l, cfg.at, cfg.at + 0.55));
  if (a <= 0) return;
  const w = cfg.w || 360, h = cfg.h || 176, x = cfg.x, y = cfg.y;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(a, a); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.fillStyle = hexA(p.ink, 0.88);
  rrect(ctx, x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = hexA(p.accent, 0.4); ctx.lineWidth = 1.5;
  rrect(ctx, x, y, w, h, 12); ctx.stroke();
  const fd = fitText(ctx, cfg.date, w - 40, 58);
  txt(ctx, fd.text, x + w / 2, y + 86, { size: fd.size, weight: 700, ls: 2, gradient: true, glow: 12 });
  txt(ctx, cfg.note, x + w / 2, y + 136, { size: 26, color: p.creamDim, ls: 8 });
  ctx.restore();
  if (cfg.stampText) {
    const sq = E.outBack(seg(l, cfg.at + 0.6, cfg.at + 0.95));
    ctx.save(); ctx.globalAlpha = sq;
    ctx.strokeStyle = hexA(p.warn, 0.85); ctx.lineWidth = 2.4;
    ctx.translate(x + w - 68, y + h + 26); ctx.rotate(-0.1);
    rrect(ctx, -62, -24, 130, 48, 6); ctx.stroke();
    txt(ctx, cfg.stampText, 3, 2, { size: 24, color: p.warn, ls: 4, baseline: "middle" });
    ctx.restore();
  }
}
