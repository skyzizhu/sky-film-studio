// =====================================================================
// sky-film-studio · components/entityfx.js —— 实体统一入口（实体管线核心）
// drawEntity(ctx, t, l, { id|paths, x, y, s, at, motion, from, ... })
//   motion 按实体性质选：
//   drawOn  逐笔描出（人物/建筑/山体/器物——"被画出来/被建造"）
//   grow    从地面生长（植物/山/塔——底端锚点，scaleY 弹出）
//   floatIn 漂浮淡入（云/气泡/羽毛/雾——进场后持续缓浮）
//   flyIn   画外飞入（鸟/飞机/火箭/箭——贝塞尔弧线+尾迹+落定弹）
//   fadeIn  淡入（光/抽象替代物）
//   （unroll 卷轴展开→drawScrollDoc；pour 颗粒飘落→drawSand；计数→numCounter）
// 未知实体静默跳过（智能放弃：宁缺毋滥）。
// 依赖 objectfx.js（OBJECTS/drawObj）与 iconlib.js（ICON_PATHS）。
// =====================================================================
"use strict";

/* 静态整组描边（供 grow/floatIn/flyIn/fadeIn 用） */
function strokePathsStatic(ctx, paths, cfg) {
  const p = PAL();
  const s = cfg.s || 1;
  ctx.save();
  ctx.translate(cfg.px ?? cfg.x, cfg.py ?? cfg.y);
  if (cfg.rot) ctx.rotate(cfg.rot);
  ctx.scale((cfg.scx ?? 1) * s, (cfg.scy ?? 1) * s);
  ctx.globalAlpha = cfg.alpha ?? 1;
  ctx.strokeStyle = cfg.color || p.accent;
  ctx.lineWidth = (cfg.lw || 4) / s;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (cfg.glow) { ctx.shadowColor = hexA(p.accentHi, 0.7); ctx.shadowBlur = cfg.glow; }
  for (const pts of paths) {
    if (!pts || pts.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (_isClosed(pts)) {                              // 闭合形：双色分面或平涂
      ctx.closePath();
      if (cfg.flat) { ctx.save(); ctx.globalAlpha *= 1; flatFill(ctx, pts); ctx.restore(); }
      else { ctx.fillStyle = hexA(PAL().accentDeep, 0.45); ctx.fill(); }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function _pathsOf(cfg) {
  if (cfg.paths) return cfg.paths;
  if (OBJECTS[cfg.id]) return OBJECTS[cfg.id];
  if (window.ICON_PATHS && window.ICON_PATHS[cfg.id]) return window.ICON_PATHS[cfg.id];
  return null;
}

/* 实体统一入口 */
function drawEntity(ctx, t, l, cfg) {
  // SVG 图标优先用原生渲染（手绘件保留折线管线）
  if (!OBJECTS[cfg.id] && window.drawSVGIcon && (window.ICONS_FILL?.[cfg.id] || window.ICONS?.[cfg.id])) {
    drawSVGIcon(ctx, t, l, cfg);
    return;
  }
  const paths = _pathsOf(cfg);
  if (!paths) return;                                   // 未知实体：不画（智能放弃）
  const at = cfg.at || 0, dur = cfg.dur || 0.8;
  const u = MO.seg(l, at, at + dur);
  if (u <= 0) return;
  const m = cfg.motion || "drawOn";

  if (m === "drawOn") { drawObj(ctx, t, l, cfg); return; }
  if (m === "brushReveal") { brushReveal(ctx, t, l, cfg); return; }

  if (m === "grow") {
    // 底端锚点生长：scaleY 0→1（轻过冲）+ scaleX 0.7→1 + 淡入
    const baseY = cfg.y + (cfg.base ?? 50) * (cfg.s || 1);
    const sy = Math.max(0.001, MO.outBack(u, 1.2));
    const sx = 0.7 + 0.3 * u;
    strokePathsStatic(ctx, paths, { ...cfg, py: baseY, scy: sy, scx: sx, alpha: Math.min(1, u * 1.6) });
    if (u >= 1) {                                        // 长成轻晃
      const sway = Math.sin(t * 1.3) * 0.012;
      if (sway !== 0) strokePathsStatic(ctx, paths, { ...cfg, py: baseY, scy: 1 + sway, scx: 1 - sway * 0.6, alpha: 1 });
    }
    return;
  }

  if (m === "floatIn") {
    // 淡入下落进场，进场后持续缓慢上下漂浮
    const inU = MO.outCubic(u);
    const ph = cfg.ph ?? 0;
    const bob = Math.sin(t * (cfg.bobHz ?? 1.4) + ph) * (cfg.bob ?? 6);
    const y2 = cfg.y + 46 * (1 - inU) + (u >= 1 ? bob : bob * inU);
    strokePathsStatic(ctx, paths, { ...cfg, py: y2, scx: 0.92 + 0.08 * inU, scy: 0.92 + 0.08 * inU, alpha: inU });
    return;
  }

  if (m === "flyIn") {
    // 从画外沿二次贝塞尔飞入：位置+朝向旋转+尾迹，到达落定弹
    const p0 = cfg.from || { x: W + 160, y: cfg.y - 220 };
    const p1 = { x: cfg.x, y: cfg.y };
    const ctrl = cfg.ctrl || { x: (p0.x + p1.x) / 2, y: Math.min(p0.y, p1.y) - 130 };
    const e = MO.outCubic(u);
    const qx = (1 - e) * (1 - e) * p0.x + 2 * (1 - e) * e * ctrl.x + e * e * p1.x;
    const qy = (1 - e) * (1 - e) * p0.y + 2 * (1 - e) * e * ctrl.y + e * e * p1.y;
    const dx = 2 * (1 - e) * (ctrl.x - p0.x) + 2 * e * (p1.x - ctrl.x);
    const dy = 2 * (1 - e) * (ctrl.y - p0.y) + 2 * e * (p1.y - ctrl.y);
    const rot = (cfg.rot !== undefined ? cfg.rot : 1) ? Math.atan2(dy, dx) * 0.35 : 0;
    const settle = u >= 1 ? MO.land(l, at + dur, 0.1) : 1;
    strokePathsStatic(ctx, paths, { ...cfg, px: qx, py: qy, rot, scx: settle, scy: settle, alpha: Math.min(1, u * 2) });
    if (u < 1) {                                         // 尾迹
      const p2 = PAL();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (let k = 0; k < 3; k++) {
        const back = 0.06 + k * 0.05;
        const bx = (1 - (e - back)) * (1 - (e - back)) * p0.x + 2 * (1 - (e - back)) * (e - back) * ctrl.x + (e - back) * (e - back) * p1.x;
        const by = (1 - (e - back)) * (1 - (e - back)) * p0.y + 2 * (1 - (e - back)) * (e - back) * ctrl.y + (e - back) * (e - back) * p1.y;
        if (e - back <= 0) continue;
        ctx.strokeStyle = hexA(p2.accentHi, (1 - u) * (0.5 - k * 0.13));
        ctx.lineWidth = 3 - k;
        ctx.beginPath();
        ctx.moveTo(bx, by); ctx.lineTo(qx - dx * 0.02 * (1 + k), qy - dy * 0.02 * (1 + k));
        ctx.stroke();
      }
      ctx.restore();
    }
    return;
  }

  if (m === "fadeIn") {
    strokePathsStatic(ctx, paths, { ...cfg, scx: 0.96 + 0.04 * u, scy: 0.96 + 0.04 * u, alpha: MO.outCubic(u) });
    return;
  }
}

/* ---------- 常用生长/飞行实体补充 ---------- */
Object.assign(OBJECTS, {
  tree: (() => {                                          // 树：干 + 三层冠（grow 用）
    const P = [];
    P.push(_poly([[0, 50], [0, 6]]));
    P.push(_poly([[-3, 50], [-16, 54]])); P.push(_poly([[3, 50], [16, 54]]));
    P.push(_arcPts(0, 2, 26, Math.PI * 0.15, Math.PI * 0.85, 10));      // 冠下层
    P.push(_arcPts(0, -12, 20, Math.PI * 0.1, Math.PI * 0.9, 10));      // 冠中层
    P.push(_arcPts(0, -25, 14, Math.PI * 0.1, Math.PI * 0.9, 8));       // 冠顶
    return P;
  })(),
  bird: (() => {                                          // 鸟：两段翅弧（flyIn 用）
    const P = [];
    P.push(_arcPts(-2, 0, 16, Math.PI * 1.15, Math.PI * 1.95, 8));
    P.push(_arcPts(2, 0, 16, Math.PI * 1.05, Math.PI * 1.85, 8));
    P.push(_poly([[-2, 0], [2, 0]]));
    return P;
  })(),
  birdBig: (() => {                                       // 大鸟/雁：更展开
    const P = [];
    P.push(_arcPts(-2, 0, 24, Math.PI * 1.2, Math.PI * 2.0, 10));
    P.push(_arcPts(2, 0, 24, Math.PI * 1.0, Math.PI * 1.8, 10));
    P.push(_poly([[-2, 0], [2, 0]]));
    return P;
  })()
});
