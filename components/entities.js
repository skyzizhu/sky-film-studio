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

/* ---------- 高频具象实体（手绘件，比通用图标"更像"） ---------- */

/* 汽车（侧视）：车身+座舱+窗+双轮+灯，flat 双色后一眼可辨 */
function carPaths(cfg) {
  const P = [];
  // 车身（下弧+上弧）
  P.push(_poly([[-46, 8], [-38, 20], [38, 20], [46, 8], [42, -2], [-42, -2], [-46, 8]]));
  // 座舱
  P.push(_poly([[-26, -2], [-18, -22], [18, -22], [26, -2], [-26, -2]]));
  // 车窗（两块）
  P.push(_poly([[-14, -5], [-8, -16], [2, -16], [2, -5], [-14, -5]]));
  P.push(_poly([[8, -5], [8, -16], [14, -16], [18, -5], [8, -5]]));
  // 车轮×2（外圈+内毂）
  P.push(_circlePts(-28, 22, 10, 16));
  P.push(_circlePts(-28, 22, 4, 8));
  P.push(_circlePts(28, 22, 10, 16));
  P.push(_circlePts(28, 22, 4, 8));
  // 底线
  P.push(_poly([[-46, 8], [-38, 8]]));
  P.push(_poly([[38, 8], [46, 8]]));
  // 头灯+尾灯
  P.push(_poly([[42, 0], [46, 0]]));
  P.push(_poly([[-46, 0], [-42, 0]]));
  if (cfg && cfg.charge) {                                    // 充电版：车顶充电弧
    P.push(_arcPts(0, -22, 12, Math.PI, 0, 8));
    P.push(_poly([[0, -34], [0, -30]]));
  }
  return P;
}

/* 飞机（侧视）：机身+机翼+尾翼+发动机+窗排 */
function planePaths() {
  const P = [];
  P.push(_poly([[-46, -4], [-30, -12], [30, -12], [46, -8], [48, -2], [42, 4], [-38, 4], [-46, -4]])); // 机身
  P.push(_poly([[-8, -12], [-22, 6], [-12, 6], [4, -12]]));       // 主翼
  P.push(_poly([[-38, -2], [-48, 12], [-40, 12], [-32, -2]]));     // 尾翼
  P.push(_circlePts(18, 4, 4, 8));                                 // 发动机
  for (let i = 0; i < 5; i++) P.push(_circlePts(-24 + i * 12, -6, 1.5, 6)); // 窗排
  return P;
}

/* 火车（侧视）：车体+车轮排+烟囱+连接杆 */
function trainPaths() {
  const P = [];
  P.push(_poly([[-44, -30], [44, -30], [44, 16], [-44, 16], [-44, -30]]));  // 车体
  P.push(_poly([[-38, -22], [38, -22]]));                                     // 腰线
  P.push(_poly([[-44, -30], [-50, -44], [-38, -44], [-44, -30]]));            // 烟囱
  P.push(_poly([[-30, -14], [30, -14]]));
  for (let i = 0; i < 4; i++) {
    const cx = -30 + i * 20;
    P.push(_circlePts(cx, 24, 8, 12));
    P.push(_circlePts(cx, 24, 3, 6));
  }
  P.push(_poly([[-38, 24], [38, 24]]));                                       // 连接杆
  return P;
}

/* 船（侧视）：船体+上层建筑+烟囱+桅杆+水线 */
function shipPaths() {
  const P = [];
  P.push(_poly([[-46, 10], [46, 10], [36, 26], [-36, 26], [-46, 10]]));      // 船体
  P.push(_poly([[-20, 10], [-20, -10], [20, -10], [20, 10]]));                // 上层
  P.push(_poly([[-8, -10], [-4, -28], [4, -28], [8, -10]]));                  // 烟囱
  P.push(_poly([[0, -10], [0, -38], [2, -38], [2, -10]]));                    // 桅杆
  P.push(_poly([[2, -38], [20, -30], [2, -24]]));                             // 旗
  P.push(_arcPts(0, 28, 46, Math.PI * 0.1, Math.PI * 0.9, 14));              // 水线弧
  return P;
}

/* 房屋（正视）：墙体+屋顶+门+双窗+烟囱 */
function housePaths() {
  const P = [];
  P.push(_poly([[-32, 20], [-32, -20], [32, -20], [32, 20], [-32, 20]]));    // 墙
  P.push(_poly([[-42, -20], [0, -46], [42, -20], [-42, -20]]));               // 屋顶
  P.push(_poly([[-8, 20], [-8, -2], [8, -2], [8, 20]]));                      // 门
  P.push(_poly([[-24, -8], [-12, -8], [-12, 2], [-24, 2], [-24, -8]]));      // 左窗
  P.push(_poly([[12, -8], [24, -8], [24, 2], [12, 2], [12, -8]]));            // 右窗
  P.push(_poly([[18, -46], [18, -32], [28, -32], [28, -42], [18, -46]]));    // 烟囱
  return P;
}

/* 工厂：厂房锯齿顶+烟囱排+门 */
function factoryPaths() {
  const P = [];
  P.push(_poly([[-46, 30], [-46, -14], [-20, -14], [-20, -26], [-4, -14], [-4, -26], [12, -14], [12, -26], [28, -14], [46, -14], [46, 30], [-46, 30]]));
  P.push(_poly([[-34, -26], [-34, -48], [-26, -48], [-26, -26]]));            // 烟囱1
  P.push(_poly([[-12, -26], [-12, -44], [-4, -44], [-4, -26]]));              // 烟囱2
  P.push(_poly([[-10, 30], [-10, 8], [10, 8], [10, 30]]));                    // 门
  for (let i = 0; i < 3; i++) P.push(_poly([[-38 + i * 12, -6], [-30 + i * 12, -6], [-30 + i * 12, 2], [-38 + i * 12, 2]])); // 窗排
  return P;
}

/* 桥梁：桥面+主塔+悬索+桥墩 */
function bridgePaths() {
  const P = [];
  P.push(_poly([[-50, 0], [50, 0]]));                                           // 桥面
  P.push(_poly([[-20, 0], [-20, -34]]));                                        // 左塔
  P.push(_poly([[20, 0], [20, -34]]));                                          // 右塔
  P.push(_arcPts(0, -34, 20, Math.PI, 0, 12));                                  // 主悬索
  P.push(_arcPts(0, -34, 30, Math.PI, 0, 14));                                  // 副悬索
  for (let i = 0; i < 5; i++) {
    const x = -16 + i * 8;
    const y2 = -34 + Math.sqrt(400 - x * x);
    P.push(_poly([[x, -34 + Math.sqrt(900 - x * x)], [x, y2]]));               // 竖索
  }
  P.push(_poly([[-46, 0], [-46, 14]]));                                         // 桥墩左
  P.push(_poly([[46, 0], [46, 14]]));                                           // 桥墩右
  return P;
}

/* 机器人/机器（正视）：头+身+双臂+双腿+天线 */
function machinePaths() {
  const P = [];
  P.push(_poly([[-18, -40], [18, -40], [18, -18], [-18, -18], [-18, -40]]));  // 头
  P.push(_circlePts(-8, -30, 4, 8));                                            // 左眼
  P.push(_circlePts(8, -30, 4, 8));                                             // 右眼
  P.push(_poly([[0, -40], [0, -50]]));                                          // 天线
  P.push(_circlePts(0, -52, 3, 6));                                             // 天线球
  P.push(_poly([[-16, -18], [-22, 10], [-14, 10], [-10, -18]]));               // 左臂
  P.push(_poly([[16, -18], [22, 10], [14, 10], [10, -18]]));                   // 右臂
  P.push(_poly([[-14, -18], [14, -18], [18, 14], [-18, 14], [-14, -18]]));    // 身体
  P.push(_poly([[-10, 14], [-10, 36], [-2, 36], [-2, 14]]));                   // 左腿
  P.push(_poly([[2, 14], [2, 36], [10, 36], [10, 14]]));                       // 右腿
  P.push(_poly([[-6, -10], [6, -10], [6, 0], [-6, 0], [-6, -10]]));            // 胸口面板
  return P;
}

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
  mural2: muralWallPaths(12),
  car: carPaths(),
  carCharge: carPaths({ charge: true }),
  plane: planePaths(),
  train: trainPaths(),
  ship: shipPaths(),
  house: housePaths(),
  factory: factoryPaths(),
  bridge: bridgePaths(),
  machine: machinePaths()
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
