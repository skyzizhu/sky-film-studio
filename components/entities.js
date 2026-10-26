// =====================================================================
// sky-film-studio · components/entities.js —— 具体实体库（叙事级"画得像"）
// 参数化人物（僧人/学者/工人/大佛）、崖壁洞窟、壁画墙 + 专属诞生动画
// （卷轴展开 drawScrollDoc / 沙粒飘落堆积 drawSand）。
// 实体注册进 OBJECTS，直接用 drawObj 逐笔描出 + 落定微弹。
// 依赖 objectfx.js 的 _poly/_circlePts/_arcPts/OBJECTS（先于本文件加载）。
// =====================================================================
"use strict";

/* ---------- 参数化人形：僧人/学者/工人 ----------
   cfg: { hat: bald|bun|scholar, staff, beads, halo, arms: down|up|folded } */
function figurePaths(cfg) {
  const P = [];
  if (cfg.halo) P.push(_arcPts(-13, -30, 19, Math.PI * 0.55, Math.PI * 1.45, 12));   // 头光（弧）
  P.push(_circlePts(0, -30, 10.5, 16));                                              // 头
  if (cfg.hat === "bun") P.push(_circlePts(0, -42, 4, 8));                           // 发髻
  if (cfg.hat === "scholar") {                                                       // 幞头（官帽）
    P.push(_poly([[-13, -37], [13, -37], [10, -46], [-10, -46], [-13, -37]]));
    P.push(_poly([[-13, -39], [-19, -33]])); P.push(_poly([[13, -39], [19, -33]]));
  }
  // 宽袍（A 字 + 弧形下摆）
  P.push(_poly([[-7.5, -19], [7.5, -19], [21, 32], [0, 43], [-21, 32], [-7.5, -19]]));
  P.push(_arcPts(0, 30, 21.5, Math.PI * 0.12, Math.PI * 0.88, 12));                  // 下摆弧线
  P.push(_poly([[-12, 5], [12, 5]]));                                                // 腰带
  // 双臂/衣袖
  if (cfg.arms === "up") {
    P.push(_poly([[-7, -14], [-24, -8], [-21, -1], [-7, -7]]));
    P.push(_poly([[7, -14], [24, -8], [21, -1], [7, -7]]));
  } else if (cfg.arms === "folded") {
    P.push(_poly([[-7, -13], [-17, 4], [-8, 7]]));
    P.push(_poly([[7, -13], [17, 4], [8, 7]]));
    P.push(_poly([[-9, -1], [9, 1]]));
  } else {
    P.push(_poly([[-7, -14], [-19, 9], [-14, 13], [-7, -2]]));
    P.push(_poly([[7, -14], [19, 9], [14, 13], [7, -2]]));
  }
  if (cfg.staff) {                                                                   // 锡杖
    P.push(_poly([[29, -36], [29, 44]]));
    P.push(_circlePts(29, -38, 4, 10));
    P.push(_poly([[25, -34], [33, -34]]));
  }
  if (cfg.beads) {                                                                   // 念珠（手垂一圈）
    P.push(_circlePts(22, 8, 7, 12));
    P.push(_poly([[16, 10], [14, 16]]));
  }
  return P;
}

/* 大佛（坐像）：头光两层 + 肩线 + 交叉腿坐 + 双手合拢 */
function buddhaPaths() {
  const P = [];
  P.push(_circlePts(0, -34, 13, 18));                                                // 头
  P.push(_circlePts(0, -34, 21, 22));                                                // 头光内圈
  P.push(_arcPts(0, -34, 28, Math.PI * 0.6, Math.PI * 1.4, 14));                     // 头光外弧
  P.push(_arcPts(-19, -18, 12, Math.PI * 0.5, Math.PI * 1.4, 10));                   // 左肩衣纹
  P.push(_arcPts(19, -18, 12, Math.PI * 1.6, Math.PI * 0.5, 10));                    // 右肩衣纹
  P.push(_poly([[-8, -22], [-30, 20], [-26, 26], [26, 26], [30, 20], [8, -22]]));    // 身
  P.push(_poly([[-30, 26], [-38, 34], [38, 34], [30, 26]]));                         // 莲座上沿
  P.push(_arcPts(0, 34, 38, Math.PI, 0, 14));                                        // 莲座
  P.push(_arcPts(0, 30, 26, Math.PI * 0.15, Math.PI * 0.85, 10));                    // 腿部衣纹
  P.push(_poly([[-10, 6], [10, 6]]));                                                // 合拢的手
  return P;
}

/* 崖壁洞窟：崖顶折线山体 + 一排拱形窟门 */
function cliffCavesPaths(n) {
  const P = [];
  P.push(_poly([[-92, -34], [-62, -44], [-34, -30], [0, -46], [34, -30], [62, -44], [92, -34],
    [92, 46], [-92, 46], [-92, -34]]));
  for (let i = 0; i < n; i++) {
    const cx = -66 + i * (132 / Math.max(1, n - 1));
    P.push(_arcPts(cx, 8, 13, Math.PI, 0, 10));                                      // 拱顶
    P.push(_poly([[cx - 13, 8], [cx - 13, 30], [cx + 13, 30], [cx + 13, 8]]));       // 窟身
    P.push(_poly([[cx - 6, 30], [cx - 6, 22]]));                                     // 窟内龛影
  }
  P.push(_poly([[-92, 46], [92, 46]]));                                              // 地平线
  return P;
}

/* 壁画墙：墙框 + 佛龛拱/头光/飘带/莲座/散点花 —— 一笔一笔"被画出来" */
function muralWallPaths(seed) {
  const rnd = mulberry32(seed);
  const P = [];
  P.push(_poly([[-84, -62], [84, -62], [84, 62], [-84, 62], [-84, -62]]));           // 墙
  P.push(_poly([[-84, -50], [84, -50]]));                                            // 檐线
  P.push(_arcPts(-34, -6, 17, Math.PI, 0, 10));                                      // 龛拱
  P.push(_circlePts(-34, -12, 4.5, 8));                                              // 头光
  P.push(_poly([[-42, 26], [-26, 26]]));                                             // 莲座
  P.push(_arcPts(28, -2, 20, -Math.PI * 0.85, Math.PI * 0.25, 12));                  // 飘带 1
  P.push(_arcPts(34, 12, 15, Math.PI * 0.95, -Math.PI * 0.15, 10));                  // 飘带 2
  P.push(_arcPts(50, -20, 10, -Math.PI * 0.7, Math.PI * 0.2, 8));                    // 飘带 3
  for (let i = 0; i < 7; i++) {                                                      // 散点花
    const x = -70 + rnd() * 140, y = -40 + rnd() * 88;
    if (Math.abs(x + 34) < 26 && y < 30) continue;                                   // 避开龛位
    P.push(_circlePts(x, y, 2.6, 6));
  }
  return P;
}

/* 注册进实物库（drawObj 直接可用） */
Object.assign(OBJECTS, {
  monk: figurePaths({ hat: "bald", staff: true, beads: true, halo: true, arms: "down" }),
  monkWalking: figurePaths({ hat: "bald", staff: true, arms: "up" }),
  scholar: figurePaths({ hat: "scholar", arms: "folded" }),
  worker: figurePaths({ hat: "bun", arms: "up" }),
  believer: figurePaths({ hat: "bald", arms: "folded" }),
  buddha: buddhaPaths(),
  cliff: cliffCavesPaths(5),
  cliff7: cliffCavesPaths(7),
  mural: muralWallPaths(5),
  mural2: muralWallPaths(12)
});

/* ---------- 专属诞生动画 ---------- */

/* 卷轴文书：右轴带着纸面向右展开，纸上字行随展开浮现 */
function drawScrollDoc(ctx, t, l, cfg) {
  const p = PAL();
  const u = MO.outCubic(MO.seg(l, cfg.at, cfg.at + (cfg.dur || 1.0)));
  if (u <= 0) return;
  const s = cfg.s || 2, x = cfg.x, y = cfg.y;
  const paperW = 150 * u, H2 = 54;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = cfg.color || p.accent; ctx.lineWidth = 2.2;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // 纸面
  ctx.fillStyle = hexA(p.cream, 0.07);
  rrect(ctx, -70, -H2 / 2, paperW, H2, 3); ctx.fill(); ctx.stroke();
  // 左轴
  rrect(ctx, -78, -H2 / 2 - 4, 10, H2 + 8, 5); ctx.stroke();
  // 右轴（随展开移动）
  rrect(ctx, -70 + paperW - 3, -H2 / 2 - 6, 8, H2 + 12, 4); ctx.stroke();
  // 字行随纸面浮现
  ctx.strokeStyle = hexA(p.cream, 0.5); ctx.lineWidth = 1.6;
  const rnd = mulberry32(cfg.seed || 9);
  for (let r2 = 0; r2 < 3; r2++) {
    const ry = -14 + r2 * 14;
    const segN = 4 + Math.floor(rnd() * 3);
    let cx2 = -60;
    for (let k = 0; k < segN; k++) {
      const w2 = 10 + rnd() * 16;
      if (cx2 + w2 < -70 + paperW - 10) {
        const vis = MO.seg(u, (cx2 + 70) / 200 + 0.05, (cx2 + 70) / 200 + 0.2);
        if (vis > 0) {
          ctx.globalAlpha = vis * 0.8;
          ctx.beginPath(); ctx.moveTo(cx2, ry); ctx.lineTo(cx2 + w2, ry); ctx.stroke();
        }
      }
      cx2 += w2 + 6;
    }
  }
  ctx.restore();
  // 展开完成的落定微弹光环
  const doneAt = cfg.at + (cfg.dur || 1.0);
  if (l > doneAt) {
    const k = MO.land(l, doneAt, 0.05);
    if (k > 1.001) {
      ctx.save(); ctx.globalAlpha = 0.25; ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = p.accentHi; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 92 * s * 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

/* 沙粒：种子化颗粒从上方飘落（带横向摆动），落到沙丘轮廓上停住堆积 */
function drawSand(ctx, t, l, cfg) {
  const p = PAL();
  const u = MO.seg(l, cfg.at, cfg.at + (cfg.dur || 2.2));
  if (u <= 0) return;
  const x0 = cfg.x, y0 = cfg.y, w2 = cfg.w || 420, n = cfg.grains || 90;
  const rnd = mulberry32((cfg.seed || 21) + 3);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const gx = x0 - w2 / 2 + rnd() * w2;
    const delay = rnd() * 0.55, fall = 0.45;                       // 相对进度
    const gu = MO.clamp01((u - delay) / fall);
    if (gu <= 0) continue;
    const dropH = 150 + rnd() * 60;
    const land = y0 - Math.abs(Math.sin((gx - x0) / (w2 / 2) * 1.2)) * 34 - rnd() * 10;  // 丘形
    const yy = y0 - dropH + MO.outCubic(gu) * dropH;
    const sway = Math.sin(t * 2 + i) * 6 * (1 - gu);
    const a = 0.25 + rnd() * 0.5;
    ctx.fillStyle = hexA(p.accentHi, gu >= 1 ? a : a * 0.8);
    const r2 = 1.2 + rnd() * 1.8;
    ctx.beginPath(); ctx.arc(gx + sway, Math.min(yy, land), r2, 0, Math.PI * 2); ctx.fill();
  }
  // 沙丘轮廓随堆积描出
  const mu = MO.outCubic(MO.seg(u, 0.3, 1));
  if (mu > 0) {
    ctx.strokeStyle = hexA(p.accent, 0.6); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 30; k++) {
      const qx = x0 - w2 / 2 + w2 * k / 30;
      const qy = y0 - Math.sin(k / 30 * Math.PI) * 38 * mu;
      k === 0 ? ctx.moveTo(qx, qy) : ctx.lineTo(qx, qy);
    }
    ctx.stroke();
  }
  ctx.restore();
}
