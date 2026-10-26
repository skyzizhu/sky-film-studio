// =====================================================================
// sky-film-studio · components/datafx.js —— 数据动效件（数值经 cfg 从 data.js 传入）
// =====================================================================
"use strict";

/* 对比条。cfg: { x, y, w, rows:[{label, fee, feeText}], max, at0, dt=0.3 } */
function compareBars(ctx, t, l, cfg) {
  const p = PAL();
  cfg.rows.forEach((r, i) => {
    const ain = E.outBack(seg(l, cfg.at0 + i * (cfg.dt || 0.3), cfg.at0 + 0.4 + i * (cfg.dt || 0.3)));
    if (ain <= 0) return;
    const y = cfg.y + i * 170;
    ctx.save();
    ctx.translate(cfg.x + cfg.w / 2, y + 60); ctx.scale(ain, ain); ctx.translate(-cfg.x - cfg.w / 2, -y - 60);
    ctx.fillStyle = hexA(p.ink, 0.8);
    rrect(ctx, cfg.x, y, cfg.w, 120, 14); ctx.fill();
    ctx.strokeStyle = hexA(p.accent, 0.35); ctx.lineWidth = 1.4;
    rrect(ctx, cfg.x, y, cfg.w, 120, 14); ctx.stroke();
    txt(ctx, r.label, cfg.x + 44, y + 42, { size: 29, align: "left", ls: 3 });
    const frac = r.fee / cfg.max;
    const grow = E.outCubic(seg(l, cfg.at0 + 0.55 + i * (cfg.dt || 0.3), cfg.at0 + 1.35 + i * (cfg.dt || 0.3)));
    const bw = Math.max(0.018, frac) * (cfg.w - 220) * grow;
    const g = ctx.createLinearGradient(cfg.x + 44, 0, cfg.x + 44 + cfg.w - 220, 0);
    g.addColorStop(0, p.accentHi); g.addColorStop(1, p.accentDeep);
    ctx.fillStyle = i === cfg.rows.length - 1 ? g : hexA(p.accent, 0.3);
    rrect(ctx, cfg.x + 44, y + 70, bw, 16, 8); ctx.fill();
    txt(ctx, r.feeText, cfg.x + cfg.w - 44, y + 78, {
      size: 34, align: "right", baseline: "middle", weight: 700,
      color: i === cfg.rows.length - 1 ? p.accentHi : p.creamDim, alpha: grow, ls: 2
    });
    ctx.restore();
  });
}

/* 勾选矩阵。cfg: { x, y, rows:[str], cols:[str], at0, dt=0.32, cw=90, chh=62 } */
function checkMatrix(ctx, t, l, cfg) {
  const p = PAL();
  const aM = seg(l, cfg.at0 - 0.4, cfg.at0);
  if (aM <= 0) return;
  const cw = cfg.cw || 90, chh = cfg.chh || 62, gap = 14;
  cfg.cols.forEach((s, j) => {
    txt(ctx, s, cfg.x + 150 + j * (cw + gap) + cw / 2, cfg.y + 4, { size: 23, color: p.creamDim, alpha: aM, ls: 2 });
  });
  cfg.rows.forEach((rv, i) => {
    const y = cfg.y + 36 + i * (chh + gap);
    txt(ctx, rv, cfg.x + 60, y + chh / 2 + 1, { size: 24, color: p.creamDim, baseline: "middle", alpha: aM, ls: 2 });
    cfg.cols.forEach((s, j) => {
      const x = cfg.x + 150 + j * (cw + gap);
      ctx.fillStyle = hexA(p.ink, 0.7);
      rrect(ctx, x, y, cw, chh, 8); ctx.fill();
      ctx.strokeStyle = hexA(p.accent, 0.22); ctx.lineWidth = 1;
      rrect(ctx, x, y, cw, chh, 8); ctx.stroke();
      const at = cfg.at0 + 0.15 + (i * cfg.cols.length + j) * (cfg.dt || 0.32);
      const aCell = E.outBack(seg(l, at, at + 0.4));
      if (aCell > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, aCell);
        ctx.fillStyle = hexA(p.accent, 0.13);
        rrect(ctx, x, y, cw, chh, 8); ctx.fill();
        checkMark(ctx, x + cw / 2, y + chh / 2, 34, seg(l, at + 0.1, at + 0.5), p.accent, 3);
        ctx.restore();
      }
    });
  });
}

/* 进度环。cfg: { cx, cy, r=150, stages:[str], at0, per=0.78, doneText, timesLine? } */
function progressRing(ctx, t, l, cfg) {
  const p = PAL();
  const aR = seg(l, cfg.at0 - 0.5, cfg.at0);
  if (aR <= 0) return;
  const cx = cfg.cx, cy = cfg.cy, R = cfg.r || 150, per = cfg.per || 0.78;
  const st = cfg.stages;
  ctx.save(); ctx.globalAlpha = aR;
  ctx.strokeStyle = hexA(p.accent, 0.16); ctx.lineWidth = 13;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  st.forEach((s, i) => {
    const a0 = -Math.PI / 2 + i * (Math.PI * 2 / st.length) + 0.09;
    const a1 = -Math.PI / 2 + (i + 1) * (Math.PI * 2 / st.length) - 0.09;
    const pr = E.outCubic(seg(l, cfg.at0 + i * per, cfg.at0 + i * per + per * 0.8));
    if (pr > 0) {
      ctx.strokeStyle = i === st.length - 1 ? p.accentHi : hexA(p.accent, 0.9);
      ctx.lineWidth = 13; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + (a1 - a0) * pr); ctx.stroke();
      const ae = a0 + (a1 - a0) * pr;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = hexA(p.accentHi, 0.9);
      ctx.beginPath(); ctx.arc(cx + Math.cos(ae) * R, cy + Math.sin(ae) * R, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const am = a0 + (a1 - a0) / 2;
    const on = l >= cfg.at0 + i * per;
    txt(ctx, s, cx + Math.cos(am) * (R + 66), cy + Math.sin(am) * (R + 62), {
      size: 25, baseline: "middle", ls: 1,
      color: on ? (i === st.length - 1 ? p.accentHi : p.cream) : hexA(p.cream, 0.46),
      glow: on && i === st.length - 1 ? 12 : 0
    });
  });
  const doneAt = cfg.at0 + (st.length - 1) * per + 0.15;
  if (l >= doneAt) {
    checkMark(ctx, cx, cy - 12, 60, seg(l, doneAt - 0.05, doneAt + 0.35), p.accentHi, 6);
    txt(ctx, cfg.doneText || "完成", cx, cy + 44, { size: 30, color: p.accentHi, ls: 4, alpha: seg(l, doneAt + 0.15, doneAt + 0.55), glow: 12 });
  } else {
    const prog = seg(l, cfg.at0, doneAt);
    txt(ctx, Math.round(prog * 100) + "%", cx, cy - 6, { size: 58, weight: 700, color: p.accent, alpha: aR * 0.95, gradient: true });
    txt(ctx, "流转中", cx, cy + 46, { size: 21, color: p.creamDim, ls: 8, alpha: aR * 0.8 });
  }
  ctx.restore();
  if (cfg.timesLine) {
    const ta = seg(l, cfg.at0 + 1.45, cfg.at0 + 1.9);
    if (ta > 0) txt(ctx, cfg.timesLine, cx, cy + R + 188, { size: 25, color: p.creamDim, alpha: ta, ls: 2 });
  }
}

/* 审核进度条+徽章+按钮。cfg: { title, min, max, note, at0, fillDur=2.6, badgeAt, badgeText, btnAt, btnText, manualNote } */
function progressBadge(ctx, t, l, cfg) {
  const p = PAL();
  const aBar = seg(l, cfg.at0, cfg.at0 + 0.45);
  if (aBar > 0) {
    const x0 = cfg.x0 ?? 400, x1 = cfg.x1 ?? 1520, y = cfg.y ?? 430;
    txt(ctx, cfg.title || "代码审核", W / 2, y - 72, { size: 31, color: p.creamDim, ls: 10, alpha: aBar });
    txt(ctx, `${cfg.min}–${cfg.max} 个工作日 · ${cfg.note}`, W / 2, y - 30, { size: 24, color: hexA(p.cream, 0.5), alpha: aBar, ls: 4 });
    ctx.fillStyle = hexA(p.accent, 0.14);
    rrect(ctx, x0, y, x1 - x0, 14, 7); ctx.fill();
    for (let k = cfg.min; k <= cfg.max; k++) {
      const x = x0 + (x1 - x0) * (k - 1) / (cfg.max - 1);
      ctx.strokeStyle = hexA(p.accent, 0.4); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 24); ctx.stroke();
      txt(ctx, String(k), x, y + 52, { size: 22, color: p.creamDim, alpha: aBar });
    }
    txt(ctx, "工作日", x1 + 64, y + 52, { size: 22, color: p.faint, alpha: aBar, ls: 2 });
    const fp = E.inOutCubic(seg(l, cfg.at0 + 0.2, cfg.at0 + 0.2 + (cfg.fillDur || 2.6)));
    const fw = (x1 - x0) * fp;
    if (fw > 4) {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, p.accentDeep); g.addColorStop(1, p.accentHi);
      ctx.fillStyle = g;
      rrect(ctx, x0, y, fw, 14, 7); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = hexA(p.accentHi, 0.95);
      ctx.beginPath(); ctx.arc(x0 + fw, y + 7, 7 + Math.sin(t * 9) * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    txt(ctx, fp > 0.99 ? "审核完成" : "审核中…", x1, y - 26, { size: 24, align: "right", color: fp > 0.99 ? p.accentHi : p.creamDim, alpha: aBar, ls: 3 });
  }
  if (cfg.badgeAt !== undefined) {
    const aB = E.outBack(seg(l, cfg.badgeAt, cfg.badgeAt + 0.55));
    if (aB > 0) {
      const shrink = cfg.btnAt !== undefined ? seg(l, cfg.btnAt - 0.2, cfg.btnAt + 0.15) : 0;
      const cx = W / 2 - shrink * 240, cy = 620 - shrink * 66;
      const sc = aB * (1 - shrink * 0.28);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(sc, sc);
      ctx.strokeStyle = hexA(p.accent, 0.55); ctx.lineWidth = 2;
      ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.arc(0, 0, 104, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = p.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 84, 0, Math.PI * 2); ctx.stroke();
      checkMark(ctx, 0, -8, 62, seg(l, cfg.badgeAt + 0.25, cfg.badgeAt + 0.7), p.accentHi, 6);
      txt(ctx, cfg.badgeText || "审核通过", 0, 52, { size: 27, color: p.accentHi, ls: 6, glow: 10 });
      ctx.restore();
      const burst = pulse(l, cfg.badgeAt, cfg.badgeAt + 0.6);
      if (burst > 0) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = hexA(p.accentHi, burst * 0.7); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 100 + (1 - burst) * 220, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }
  if (cfg.btnAt !== undefined) {
    const aBtn = E.outBack(seg(l, cfg.btnAt, cfg.btnAt + 0.5));
    if (aBtn > 0) {
      const press = pulse(l, cfg.btnAt + 0.4, cfg.btnAt + 0.95);
      const cx = W / 2 + 150, cy = 620, bs = aBtn * (1 - press * 0.1);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(bs, bs);
      const bw = 300, bh = 94;
      const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
      g.addColorStop(0, p.accentHi); g.addColorStop(0.5, p.accent); g.addColorStop(1, p.accentDeep);
      ctx.fillStyle = g;
      rrect(ctx, -bw / 2, -bh / 2, bw, bh, 47); ctx.fill();
      ctx.strokeStyle = hexA(p.accentHi, 0.8); ctx.lineWidth = 2;
      rrect(ctx, -bw / 2, -bh / 2, bw, bh, 47); ctx.stroke();
      txt(ctx, cfg.btnText || "发 布", 0, 2, { size: 40, weight: 700, color: p.bg0, ls: 14, baseline: "middle" });
      ctx.restore();
      if (press > 0) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = hexA(p.accentHi, press * 0.8); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 60 + (1 - press) * 260, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    if (cfg.manualNote) txt(ctx, cfg.manualNote, W / 2, 800, { size: 24, color: p.creamDim, alpha: seg(l, cfg.btnAt - 0.4, cfg.btnAt), ls: 2 });
  }
}

/* 印章大字砸入。cfg: { cx?=W/2, cy?=348, text, at, size=190 } */
function stamp(ctx, t, l, cfg) {
  const p = PAL();
  const aS = seg(l, cfg.at, cfg.at + 0.27);
  if (aS <= 0) return;
  const size = cfg.size || 190;
  const sc = 2.6 - 1.6 * E.inCubic(aS);
  const shake = Math.max(0, 1 - seg(l, cfg.at + 0.27, cfg.at + 0.85));
  const shx = Math.sin(t * 88) * 13 * shake, shy = Math.cos(t * 96) * 9 * shake;
  ctx.save();
  ctx.translate((cfg.cx ?? W / 2) + shx, (cfg.cy ?? 348) + shy);
  ctx.scale(sc, sc);
  ctx.font = FONT(700, size);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "26px";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = p.warn;
  ctx.globalAlpha = Math.min(1, aS * 1.6);
  ctx.shadowColor = hexA(p.warn, 0.55); ctx.shadowBlur = 34;
  ctx.fillText(cfg.text, 0, 0);
  ctx.restore();
  const ring = pulse(l, cfg.at + 0.25, cfg.at + 0.85);
  if (ring > 0) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = hexA(p.warn, ring * 0.65); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cfg.cx ?? W / 2, cfg.cy ?? 348, 130 + (1 - ring) * 300, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

/* 环形印章（warn 色 + 环文 + 五角星）。cfg: { cx, cy, r=100, ringText, at } */
function seal(ctx, t, l, cfg) {
  const p = PAL();
  const a = E.outBack(seg(l, cfg.at, cfg.at + 0.6));
  if (a <= 0) return;
  const r = cfg.r || 100;
  ctx.save();
  ctx.translate(cfg.cx, cfg.cy);
  ctx.rotate(-0.06 + Math.sin(t * 0.8) * 0.012);
  ctx.scale(a, a);
  ctx.globalAlpha = 0.92;
  ctx.strokeStyle = hexA(p.warn, 0.9); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = hexA(p.warn, 0.55); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const aa = -Math.PI / 2 + i * (Math.PI * 2 / 5), a2 = aa + Math.PI / 5;
    ctx.lineTo(Math.cos(aa) * 34, 8 + Math.sin(aa) * 34);
    ctx.lineTo(Math.cos(a2) * 34 * 0.42, 8 + Math.sin(a2) * 34 * 0.42);
  }
  ctx.closePath();
  ctx.fillStyle = hexA(p.warn, 0.85); ctx.fill();
  const n = cfg.ringText.length;
  for (let i = 0; i < n; i++) {
    const aa = -Math.PI * 0.78 + (Math.PI * 1.06) * (i / Math.max(1, n - 1));
    ctx.save();
    ctx.translate(Math.cos(aa) * (r - 34), Math.sin(aa) * (r - 34));
    ctx.rotate(aa + Math.PI / 2);
    ctx.fillStyle = hexA(p.warn, 0.92);
    ctx.font = FONT(600, 24);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.fillText(cfg.ringText[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
