// =====================================================================
// sky-film-studio · components/objectfx.js —— 实物绘制库（把口播里的名词画出来）
// 每个实物 = 若干条折线路径（局部坐标 ±50），drawOn 按弧长逐笔描出；
// 另含概念形变 shapeMorph 与拼贴质感（撕边卡/胶带）。
// 用法：drawObj(ctx, t, l, { id: "rocket", x, y, s: 1.4, at, dur: 0.7 })
// =====================================================================
"use strict";

// ---------- 路径工具 ----------
function _poly(pts) { return pts; }
function _circlePts(cx, cy, r, n = 28) {
  const a = [];
  for (let i = 0; i <= n; i++) a.push([cx + Math.cos(-Math.PI / 2 + i / n * Math.PI * 2) * r, cy + Math.sin(-Math.PI / 2 + i / n * Math.PI * 2) * r]);
  return a;
}
function _arcPts(cx, cy, r, a0, a1, n = 14) {
  const a = [];
  for (let i = 0; i <= n; i++) a.push([cx + Math.cos(a0 + (a1 - a0) * i / n) * r, cy + Math.sin(a0 + (a1 - a0) * i / n) * r]);
  return a;
}

// ---------- 实物库（局部坐标 ±50，stroke 线稿） ----------
window.OBJECTS = {
  seal: [_circlePts(0, 0, 44), _circlePts(0, 0, 34), _poly([[0, -14], [8, 4], [-8, 4], [0, -14]])],                    // 印章
  stamp: [_poly([[-34, -8], [34, -8], [34, 26], [-34, 26], [-34, -8]]), _poly([[-18, -8], [-18, -30], [18, -30], [18, -8]])],  // 图章（把手+底座）
  folder: [_poly([[-42, -20], [-12, -20], [-4, -30], [38, -30], [38, 32], [-42, 32], [-42, -20]]), _poly([[-42, 2], [38, 2]])],
  phone: [_poly([[-24, -44], [24, -44], [24, 44], [-24, 44], [-24, -44]]), _poly([[-8, 34], [8, 34]])],
  magnifier: [_circlePts(-6, -6, 26), _poly([[12, 12], [38, 38]])],
  rocket: [_poly([[0, -46], [14, -18], [14, 22], [0, 34], [-14, 22], [-14, -18], [0, -46]]),
           _poly([[14, 4], [32, 26], [14, 22]]), _poly([[-14, 4], [-32, 26], [-14, 22]]), _circlePts(0, -14, 6, 12)],
  gear: [_circlePts(0, 0, 26), (() => { const t = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; t.push(_poly([[Math.cos(a) * 30, Math.sin(a) * 30], [Math.cos(a) * 42, Math.sin(a) * 42]])); } return t; })().flat(),
         (() => { const t = []; for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; t.push(_arcPts(0, 0, 36, a - 0.25, a + 0.25, 3)); } return t; })().flat()],
  shield: [_poly([[0, -44], [36, -30], [36, 2], [0, 44], [-36, 2], [-36, -30], [0, -44]]),
           _poly([[-12, 0], [-3, 10], [14, -10]])],
  clock: [_circlePts(0, 0, 42), _poly([[0, 0], [0, -26]]), _poly([[0, 0], [18, 8]])],
  calendar: [_poly([[-38, -30], [38, -30], [38, 38], [-38, 38], [-38, -30]]),
             _poly([[-38, -12], [38, -12]]), _poly([[-20, -38], [-20, -22]]), _poly([[20, -38], [20, -22]]),
             _poly([[-20, 6], [-8, 6]]), _poly([[8, 6], [20, 6]]), _poly([[-20, 22], [-8, 22]]), _poly([[8, 22], [20, 22]])],
  coin: [_circlePts(0, 0, 40), _poly([[-14, -18], [-14, 18]]), _poly([[-14, -18], [4, -18], [10, -12], [4, -6], [-14, -6]]), _poly([[-14, 4], [8, 4], [14, 10], [8, 16], [-14, 16]])],
  person: [_circlePts(0, -22, 15), _arcPts(0, 52, 34, -Math.PI * 0.82, -Math.PI * 0.18, 18)],
  network: (() => { const ns = [[0, 0], [-36, -26], [36, -26], [-36, 26], [36, 26]];
    const ps = [];
    for (let i = 1; i < 5; i++) ps.push(_poly([ns[0], ns[i]]));
    ps.push(_poly([ns[1], ns[3]])); ps.push(_poly([ns[2], ns[4]]));
    ns.forEach(n => ps.push(_circlePts(n[0], n[1], 6, 10)));
    return ps; })(),
  chartUp: [_poly([[-40, -36], [-40, 36], [40, 36]]), _poly([[-30, 22], [-8, 2], [6, 14], [34, -22]]), _poly([[24, -22], [34, -22], [34, -12]])],
  doc: [_poly([[-26, -42], [14, -42], [26, -30], [26, 42], [-26, 42], [-26, -42]]),
        _poly([[14, -42], [14, -30], [26, -30]]),
        _poly([[-16, -14], [16, -14]]), _poly([[-16, 0], [16, 0]]), _poly([[-16, 14], [6, 14]])],
  lightbulb: [_circlePts(0, -10, 26), _poly([[-9, 12], [9, 12]]), _poly([[-7, 22], [7, 22]]), _poly([[-5, 32], [5, 32]]),
              _poly([[0, -46], [0, -40]]), _poly([[-22, -36], [-18, -31]]), _poly([[22, -36], [18, -31]])],
  bubble: [_poly([[-38, -26], [38, -26], [38, 12], [-6, 12], [-16, 28], [-18, 12], [-38, 12], [-38, -26]]),
           _circlePts(-18, -7, 3, 8), _circlePts(0, -7, 3, 8), _circlePts(18, -7, 3, 8)],
  code: [_poly([[-18, -26], [-36, 0], [-18, 26]]), _poly([[18, -26], [36, 0], [18, 26]]), _poly([[-6, -30], [6, 30]])],
  cloud: [_arcPts(-16, 8, 16, Math.PI * 0.5, Math.PI * 1.5, 10), _arcPts(4, -6, 18, Math.PI * 0.8, Math.PI * 2.05, 12),
          _arcPts(22, 8, 13, Math.PI * 1.5, Math.PI * 0.6, 10), _poly([[-32, 8], [34, 8]])],
  db: [_circlePts(0, -28, 32), _poly([[-32, -28], [-32, 28], [32, 28], [32, -28]]), _arcPts(0, 28, 32, 0, Math.PI, 12),
       _arcPts(0, -4, 32, Math.PI, Math.PI * 2, 12)],
  lock: [_poly([[-26, -6], [26, -6], [26, 38], [-26, 38], [-26, -6]]), _arcPts(0, -6, 16, Math.PI, Math.PI * 2, 12), _circlePts(0, 14, 5, 10)],
  key: [_circlePts(-24, 0, 13), _poly([[-11, 0], [36, 0]]), _poly([[24, 0], [24, 12]]), _poly([[34, 0], [34, 12]])],
  flag: [_poly([[-26, -44], [-26, 44]]), _poly([[-26, -40], [34, -30], [-26, -14], [-26, -40]])]
};

// ---------- 弧长逐笔描出 ----------
function _pathLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

/* 画一个实物：各子路径按总弧长顺序逐笔描出（"被画出来/被连接"）
   cfg: { id, x, y, s=1, at, dur=0.7, color?, lw=4, glow?, order="seq" } */
function _tracePts(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}
function _isClosed(pts) {
  if (pts.length < 3) return false;
  const a2 = pts[0], b2 = pts[pts.length - 1];
  return Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) < Math.max(6, _pathLen(pts) * 0.06);
}

/* 实心双色渲染（phosphor duotone）：按序渐显填充——base 层深色打底、detail 层主色成形 */
function drawFillIcon(ctx, t, l, cfg) {
  const p = PAL();
  const layers = window.ICON_FILL_PATHS[cfg.id];
  const u = MO.seg(l, cfg.at, cfg.at + (cfg.dur || 0.8));
  if (u <= 0) return;
  const s = cfg.s || 1.5;
  ctx.save();
  ctx.translate(cfg.x, cfg.y); ctx.scale(s, s);
  if (cfg.glow) { ctx.shadowColor = hexA(p.accentHi, 0.55); ctx.shadowBlur = cfg.glow; }
  const n = layers.length, each = 1 / Math.max(1, n);
  // 未上色的层先画"底稿线"（低透明度描边），消除'只有半个图标'
  for (let i = 0; i < n; i++) {
    const a2 = MO.clamp01((u - i * each) / Math.max(0.12, each * 0.7));
    if (a2 > 0) continue;
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = p.accentHi; ctx.lineWidth = 1 / s;
    ctx.beginPath();
    layers[i].pts.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
    if (layers[i].base) ctx.closePath();
    ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const a2 = MO.clamp01((u - i * each) / Math.max(0.12, each * 0.7));
    if (a2 <= 0) continue;
    const q = layers[i];
    ctx.globalAlpha = a2;
    _tracePts(ctx, q.pts);
    ctx.closePath();
    ctx.fillStyle = q.base ? hexA(p.accentDeep, 0.55) : p.accent;
    ctx.fill();
    if (!q.base) {                                    // 细勾边提清晰度
      ctx.strokeStyle = hexA(p.accentHi, 0.5);
      ctx.lineWidth = 1.2 / s;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawObj(ctx, t, l, cfg) {
  // 优先级：手绘件（艺术控制）→ SVG 原生渲染（图标保真）→ 折线兜底
  if (!OBJECTS[cfg.id] && window.drawSVGIcon && (window.ICONS_FILL?.[cfg.id] || window.ICONS?.[cfg.id])) {
    drawSVGIcon(ctx, t, l, cfg);
    return;
  }
  const paths = OBJECTS[cfg.id] || (window.ICON_PATHS && window.ICON_PATHS[cfg.id]);
  const fills = window.ICON_FILL_PATHS && window.ICON_FILL_PATHS[cfg.id];
  if (!paths && !fills) throw new Error(`objectfx: 未知实物 ${cfg.id}；手绘件 ${Object.keys(OBJECTS).length} 种 / 图标 ${Object.keys(window.ICON_PATHS || {}).length} 个，键名见 icons.js`);
  // 默认实心双色（cfg.style:"line" 强制线稿）
  if (fills && (cfg.style || "duotone") !== "line" && !OBJECTS[cfg.id]) {
    drawFillIcon(ctx, t, l, cfg);
    const doneAt = cfg.at + (cfg.dur || 0.8);
    if (l > doneAt) {
      const k = MO.land(l, doneAt, 0.04);
      if (k > 1.001) {
        ctx.save(); ctx.globalAlpha = 0.22; ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = PAL().accentHi; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cfg.x, cfg.y, 62 * (cfg.s || 1.5), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    return;
  }
  if (!paths) { drawFillIcon(ctx, t, l, cfg); return; }
  const p = PAL();
  const u = MO.seg(l, cfg.at, cfg.at + (cfg.dur || 0.7));
  if (u <= 0) return;
  const s = cfg.s || 1;
  const drawPaths = cfg.wobble ? paths.map((p2, i2) => wobblePath(p2, (cfg.wSeed || 3) + i2, cfg.wobble, t, 6)) : paths;
  const lens = drawPaths.map(_pathLen), total = lens.reduce((a2, b2) => a2 + b2, 0);
  let budget = total * MO.outCubic(u) * 1.02;           // 2% 余量，防浮点截尾
  ctx.save();
  ctx.translate(cfg.x, cfg.y);
  ctx.scale(s, s);
  ctx.strokeStyle = cfg.color || p.accent;
  ctx.lineWidth = (cfg.lw || 4) / s;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (cfg.glow) { ctx.shadowColor = hexA(p.accentHi, 0.7); ctx.shadowBlur = cfg.glow; }
  // 填充时机："全部描完后整体上色"，透明度用 smoothstep 平滑（防止色块突现）
  const fillAll = (MO.clamp01((u - 0.88) / 0.14) ** 1.6) * ((cfg.style || "duotone") !== "line" ? 1 : 0);
  if (fillAll > 0) {
    for (const pts of drawPaths) {
      if (!_isClosed(pts)) continue;
      ctx.save(); ctx.globalAlpha = fillAll;
      if (cfg.flat) flatFill(ctx, pts);
      else {
        ctx.fillStyle = p.accentDeep;
        _tracePts(ctx, pts); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }
  for (const pts of drawPaths) {
    if (budget <= 0) break;
    const L = _pathLen(pts);
    const frac = Math.min(1, budget / Math.max(0.001, L));
    budget -= L;
    if (frac <= 0) continue;
    ctx.beginPath();
    const nFull = Math.max(1, Math.floor((pts.length - 1) * frac));
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= nFull; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (nFull < pts.length - 1) {
      const q = (pts.length - 1) * frac - nFull;
      const a2 = pts[nFull], b2 = pts[nFull + 1];
      ctx.lineTo(a2[0] + (b2[0] - a2[0]) * q, a2[1] + (b2[1] - a2[1]) * q);
    }
    if (frac >= 1 && _isClosed(pts)) ctx.closePath();   // 描线自身也闭合（补齐"缺一条边"）
    ctx.stroke();
  }
  ctx.restore();
  // 描完的落定微弹
  const doneAt = cfg.at + (cfg.dur || 0.7);
  if (l > doneAt) {
    const k = MO.land(l, doneAt, 0.04);
    if (k > 1.001) {
      ctx.save(); ctx.translate(cfg.x, cfg.y); ctx.scale(k, k);
      ctx.strokeStyle = cfg.color || p.accent; ctx.lineWidth = (cfg.lw || 4) / s / k;
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(0, 0, 56 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

/* 概念形变：from 形状平滑变成 to 形状（讲"变化/转换"用）
   cfg: { x, y, s=1.4, at, dur=0.8, from: "circle", to: "rect", color?, lw } */
function _shapePts(kind, n = 40) {
  if (kind === "circle") return _circlePts(0, 0, 40, n);
  if (kind === "rect") { const a = []; for (let i = 0; i <= n; i++) { const q = i / n * 4; a.push([q < 1 ? -40 + 80 * q : q < 2 ? 40 : q < 3 ? 40 - 80 * (q - 2) : -40, q < 1 ? -40 : q < 2 ? -40 + 80 * (q - 1) : q < 3 ? 40 : 40 - 80 * (q - 3)]); } return a; }
  if (kind === "triangle") { const a = []; for (let i = 0; i <= n; i++) { const q = i / n * 3; a.push(q < 1 ? [-40 + 40 * q, 34 - 74 * q] : q < 2 ? [0 + 40 * (q - 1), -40 + 74 * (q - 1)] : [40 - 80 * (q - 2), 34]); } return a; }
  return _circlePts(0, 0, 40, n);
}
function shapeMorph(ctx, t, l, cfg) {
  const p = PAL();
  const u = MO.seg(l, cfg.at, cfg.at + (cfg.dur || 0.8));
  if (u <= 0) return;
  const A = _shapePts(cfg.from || "circle"), B = _shapePts(cfg.to || "rect");
  const s = cfg.s || 1.4;
  ctx.save();
  ctx.translate(cfg.x, cfg.y); ctx.scale(s, s);
  ctx.strokeStyle = cfg.color || p.accent; ctx.lineWidth = (cfg.lw || 4) / s;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < A.length; i++) {
    const x = A[i][0] + (B[i][0] - A[i][0]) * u, y = A[i][1] + (B[i][1] - A[i][1]) * u;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/* 撕边卡片（拼贴质感）：锯齿边（种子固定）+ 可选胶带
   cfg: { x, y, w, h, at, tape=true, fill?, seed=7 } */
function tornCard(ctx, t, l, cfg) {
  const p = PAL();
  const u = MO.outBack(MO.seg(l, cfg.at, cfg.at + 0.4));
  if (u <= 0) return;
  const rnd = mulberry32(cfg.seed || 7);
  const jag = [], n = 26;
  for (let i = 0; i <= n; i++) jag.push((rnd() - 0.5) * 7);
  const { x, y, w, h } = cfg;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(u, u); ctx.rotate(-0.02);
  ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.beginPath();
  const edge = (x0, y0, x1, y1, j) => { for (let i = 0; i <= n; i++) { const q = i / n; ctx.lineTo(x0 + (x1 - x0) * q + (y1 - y0 ? jag[i] * j : 0) * (y1 === y0 ? 1 : 0), y0 + (y1 - y0) * q + (x1 === x0 ? jag[i] * j : 0)); } };
  ctx.moveTo(x, y);
  edge(x, y, x + w, y, 1); edge(x + w, y, x + w, y + h, 1); edge(x + w, y + h, x, y + h, 1); edge(x, y + h, x, y, 1);
  ctx.closePath();
  ctx.fillStyle = cfg.fill || hexA(p.cream, 0.06);
  ctx.fill();
  ctx.strokeStyle = hexA(p.accent, 0.5); ctx.lineWidth = 1.6;
  ctx.stroke();
  if (cfg.tape !== false) {
    ctx.save();
    ctx.translate(x + w / 2, y - 6); ctx.rotate(-0.08);
    ctx.fillStyle = hexA(p.accent, 0.18);
    ctx.fillRect(-46, -12, 92, 24);
    ctx.restore();
  }
  ctx.restore();
}
