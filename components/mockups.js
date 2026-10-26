// =====================================================================
// sky-film-studio · components/mockups.js —— 拟物件与收尾件
// =====================================================================
"use strict";

/* 手机样机：画机身并返回屏幕矩形给调用方。cfg: { x, y, w=400, h=760, at } */
function phoneMock(ctx, t, l, cfg) {
  const p = PAL();
  const a = E.outCubic(seg(l, cfg.at, cfg.at + 0.5));
  if (a <= 0) return null;
  const { x, y } = cfg, w = cfg.w || 400, h = cfg.h || 760;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.97 + a * 0.03, 0.97 + a * 0.03); ctx.translate(-x - w / 2, -y - h / 2);
  ctx.globalAlpha = a;
  ctx.fillStyle = p.ink;
  rrect(ctx, x, y, w, h, 44); ctx.fill();
  ctx.strokeStyle = hexA(p.accent, 0.55); ctx.lineWidth = 2.4;
  rrect(ctx, x, y, w, h, 44); ctx.stroke();
  ctx.strokeStyle = hexA(p.accent, 0.16); ctx.lineWidth = 1;
  rrect(ctx, x + 10, y + 10, w - 20, h - 20, 36); ctx.stroke();
  rrect(ctx, x + w / 2 - 55, y + 16, 110, 22, 11);
  ctx.fillStyle = "#040302"; ctx.fill();
  ctx.restore();
  return { sx: x + 34, sy: y + 78, sw: w - 68, sh: h - 128, alpha: a };
}

/* 屏内三阶段 UI（线框→上色→精修+点按）。cfg: { rect:{sx,sy,sw,sh}, at, navTitle?, btnText?, taps? } */
function phoneScreen(ctx, t, l, cfg) {
  const p = PAL();
  const { sx, sy, sw, sh } = cfg.rect;
  const wire = seg(l, cfg.at + 0.1, cfg.at + 1.45);
  const colorP = seg(l, cfg.at + 1.5, cfg.at + 2.85);
  if (wire <= 0) return;
  ctx.save();
  rrect(ctx, sx, sy, sw, sh, 18); ctx.clip();
  const navA = seg(wire, 0, 0.3);
  if (navA > 0) {
    ctx.strokeStyle = hexA(p.creamDim, 0.55 * navA); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(sx, sy + 52); ctx.lineTo(sx + sw, sy + 52); ctx.stroke();
    if (colorP > 0) { ctx.fillStyle = hexA(p.accentDeep, colorP * 0.5); ctx.fillRect(sx, sy, sw, 52); }
    const fnv = fitText(ctx, cfg.navTitle || "小程序", sw - 100, 22);
    txt(ctx, fnv.text, sx + sw / 2, sy + 34, { size: fnv.size, color: p.creamDim, alpha: navA, ls: 4 });
  }
  const heroA = seg(wire, 0.15, 0.5);
  if (heroA > 0) {
    const yy = sy + 70, hh = 170 * E.outCubic(heroA);
    ctx.strokeStyle = hexA(p.creamDim, 0.5 * heroA); ctx.lineWidth = 1.4;
    rrect(ctx, sx + 22, yy, sw - 44, hh, 10); ctx.stroke();
    if (colorP > 0) {
      const g = ctx.createLinearGradient(sx, yy, sx + sw, yy + hh);
      g.addColorStop(0, hexA(p.accentDeep, 0.55)); g.addColorStop(1, hexA(p.accentDeep, 0.25));
      ctx.globalAlpha = colorP; ctx.fillStyle = g;
      rrect(ctx, sx + 22, yy, sw - 44, hh, 10); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  const rowsA = seg(wire, 0.35, 0.85);
  if (rowsA > 0) {
    for (let i = 0; i < 3; i++) {
      const a = seg(rowsA, i * 0.28, 0.4 + i * 0.28);
      if (a <= 0) continue;
      const yy = sy + 268 + i * 66;
      ctx.strokeStyle = hexA(p.creamDim, 0.45 * a); ctx.lineWidth = 1.2;
      rrect(ctx, sx + 22, yy, 52, 52, 8); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + 96, yy + 14); ctx.lineTo(sx + sw - 60, yy + 14);
      ctx.moveTo(sx + 96, yy + 38); ctx.lineTo(sx + sw - 130, yy + 38); ctx.stroke();
      if (colorP > 0.1 + i * 0.18) {
        ctx.fillStyle = hexA(p.accent, 0.2 * colorP);
        rrect(ctx, sx + 22, yy, 52, 52, 8); ctx.fill();
      }
    }
  }
  const btnA = seg(wire, 0.6, 1);
  if (btnA > 0) {
    const tap = (cfg.taps || [])[0] ?? cfg.at + 2.95;
    const pressed = pulse(l, tap, tap + 0.5);
    const bs = 1 - pressed * 0.08, by = sy + sh - 66;
    ctx.save();
    ctx.translate(sx + sw / 2, by); ctx.scale(bs, bs); ctx.translate(-sx - sw / 2, -by);
    ctx.strokeStyle = hexA(p.creamDim, 0.6 * btnA); ctx.lineWidth = 1.6;
    rrect(ctx, sx + 40, by - 26, sw - 80, 52, 26); ctx.stroke();
    if (colorP > 0.5) {
      const g = ctx.createLinearGradient(0, by - 26, 0, by + 26);
      g.addColorStop(0, p.accentHi); g.addColorStop(1, p.accentDeep);
      ctx.globalAlpha = (colorP - 0.5) / 0.5 * 0.95;
      ctx.fillStyle = g; rrect(ctx, sx + 40, by - 26, sw - 80, 52, 26); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const fbt = fitText(ctx, cfg.btnText || "立即体验", sw - 150, 24);
    txt(ctx, fbt.text, sx + sw / 2, by + 1, {
      size: fbt.size, baseline: "middle", ls: 6, color: colorP > 0.5 ? p.bg0 : p.creamDim, alpha: btnA
    });
    ctx.restore();
    if (pressed > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = hexA(p.accentHi, pressed * 0.8); ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(sx + sw / 2, by, 30 + (1 - pressed) * 90, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

/* 代码面板。cfg: { x, y, w=720, h=400, title?, lines:[[str,kind]...], at, speed=2.2 } */
function codePanel(ctx, t, l, cfg) {
  const p = PAL();
  const a = seg(l, cfg.at, cfg.at + 0.55);
  if (a <= 0) return;
  const w = cfg.w || 720, h = cfg.h || 400, x = cfg.x, y = cfg.y;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = hexA(p.bg0, 0.92);
  rrect(ctx, x, y, w, h, 14); ctx.fill();
  ctx.strokeStyle = hexA(p.accent, 0.35); ctx.lineWidth = 1.4;
  rrect(ctx, x, y, w, h, 14); ctx.stroke();
  [p.warn, p.accent, "#5a7d4a"].forEach((cc, i) => {
    ctx.fillStyle = cc; ctx.globalAlpha = a * 0.8;
    ctx.beginPath(); ctx.arc(x + 30 + i * 26, y + 26, 6, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = a;
  txt(ctx, cfg.title || "终端", x + w / 2 + 30, y + 33, { size: 20, color: p.creamDim, ls: 2 });
  ctx.restore();
  ctx.save();
  rrect(ctx, x + 8, y + 52, w - 16, h - 60, 8); ctx.clip();
  const lineH = 26, total = cfg.lines.length;
  const off = (t * (cfg.speed || 2.2)) % total;
  for (let i = -1; i < 15; i++) {
    const idx = ((Math.floor(off) + i) % total + total) % total;
    const yy = y + 76 + i * lineH - (off % 1) * lineH;
    if (yy < y + 56 || yy > y + h - 14) continue;
    const [s, kind] = cfg.lines[idx];
    if (!s) continue;
    ctx.font = MONO(19);
    if (ctx.measureText(s).width > w - 60) continue;   // 超宽代码行跳过，不溢出面板
    const col = kind === 1 ? hexA(p.accent, 0.9) : kind === 3 ? hexA(p.creamDim, 0.85)
      : kind === 2 ? hexA(p.creamDim, 0.45) : hexA(p.cream, 0.7);
    ctx.font = MONO(19);
    ctx.fillStyle = col;
    ctx.textAlign = "left";
    ctx.fillText(s, x + 30, yy);
  }
  ctx.restore();
}

/* 结尾：图标光环 + 金句。cfg: { iconX, iconY, at, lines:[{text,size?,gold?}], lx=560, ly=430, lineGap=74 } */
function iconGlow(ctx, t, l, cfg) {
  const p = PAL();
  const halo = seg(l, cfg.at + 1.0, cfg.at + 1.6);
  if (halo > 0) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const breathe = 0.5 + 0.5 * Math.sin(t * 2.2);
    const g = ctx.createRadialGradient(cfg.iconX, cfg.iconY, 10, cfg.iconX, cfg.iconY, 190);
    g.addColorStop(0, hexA(p.accentHi, 0.3 * halo * (0.7 + 0.3 * breathe)));
    g.addColorStop(1, hexA(p.accentHi, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cfg.iconX, cfg.iconY, 190, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 3; k++) {
      const q = (t * 0.5 + k / 3) % 1;
      ctx.strokeStyle = hexA(p.accentHi, (1 - q) * 0.5 * halo);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cfg.iconX, cfg.iconY, 40 + q * 150, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  (cfg.lines || []).forEach((ln, i) => {
    const at = cfg.at + 1.5 + i * 0.15;
    const a = seg(l, at, at + 0.55);
    if (a <= 0) return;
    const feL = fitText(ctx, ln.text, Math.min(760, W - 200), ln.size || 42);
    txt(ctx, feL.text, cfg.lx ?? 560, (cfg.ly ?? 430) + i * (cfg.lineGap || 74), {
      size: feL.size, weight: 600, color: ln.gold ? p.accentHi : p.cream, alpha: a, ls: 8, glow: 14
    });
  });
}

/* 收尾压暗 + 片尾标题。cfg: { at, endTitle? } */
function endingLine(ctx, t, l, cfg) {
  const dim = seg(l, cfg.at, cfg.at + 1.75);
  if (dim > 0) {
    ctx.fillStyle = `rgba(4,3,2,${dim})`;
    ctx.fillRect(0, 0, W, H);
    if (cfg.endTitle) {
      const endA = pulse(l, cfg.at + 0.4, cfg.at + 2.3) * 0.95;
      if (endA > 0) {
        const feT = fitText(ctx, cfg.endTitle, W - 320, 32);
        txt(ctx, feT.text, W / 2, H / 2, { size: feT.size, alpha: endA, ls: 12, glow: 12 });
        rule(ctx, W / 2 - 260, W / 2 + 260, H / 2 + 38, endA * 0.6);
      }
    }
  }
}
