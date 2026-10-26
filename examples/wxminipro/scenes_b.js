// =====================================================================
// scenes_b.js —— S4 开发 / S5 测试 / S6 备案 / S7 提审发布 / S8 结尾
// =====================================================================
"use strict";

/* 沿圆弧排布文字（印章环文用） */
function arcText(ctx, s, cx, cy, r, a0, a1, opt = {}) {
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1));
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = opt.color || "rgba(216,74,58,0.9)";
    ctx.font = FONT(opt.weight || 600, opt.size || 22);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.fillText(s[i], 0, 0);
    ctx.restore();
  }
}

/* 五角星路径 */
function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a2) * r * 0.42, cy + Math.sin(a2) * r * 0.42);
  }
  ctx.closePath();
}

/* ================= S4 开发（21.6 – 28.8s） ================= */
const CODE_LINES = [
  ["// app.json", 0],
  ["{", 0],
  ['  "pages": ["pages/index/index"],', 3],
  ['  "window": { "navigationBarTitleText": "小程序" }', 3],
  ["}", 0],
  ["", 0],
  ["// index.js", 0],
  ["const { login, pay } = require('../../util')", 1],
  ["wx.login({", 1],
  ["  success: ({ code }) => {", 1],
  ["    // code → 服务端 → openid", 2],
  ["    session(code).then(init)", 1],
  ["  }", 1],
  ["})", 1],
  ["wx.requestPayment({", 1],
  ["  timeStamp, nonceStr, package,", 3],
  ["  signType: 'RSA', paySign", 3],
  ["})", 1]
];

function drawS4(ctx, t) {
  const l = t - TM.s4;
  stepIntro(ctx, l, 4, DATA.steps[3].full);
  const d4 = DATA.steps[4 - 1]; // steps[3]

  // —— 左：注册与验证 ——
  const lx = 230, lw = 610;
  const aReg = E.outCubic(seg(l, 0.15, 0.7));
  if (aReg > 0) {
    ctx.save();
    ctx.globalAlpha = aReg;
    ctx.fillStyle = "rgba(16,12,8,0.8)";
    rrect(ctx, lx, 300, lw, 150, 14); ctx.fill();
    ctx.strokeStyle = "rgba(217,180,92,0.4)"; ctx.lineWidth = 1.6;
    rrect(ctx, lx, 300, lw, 150, 14); ctx.stroke();
    ctx.restore();
    txt(ctx, d4.registerLabel, lx + 44, 356, { size: 30, align: "left", color: C.cream, alpha: aReg, ls: 3 });
    txt(ctx, d4.registerFeeText, lx + 44, 416, {
      size: 52, align: "left", weight: 700, alpha: aReg, ls: 6,
      gradient: goldGrad(ctx, 374, 60), glow: 14
    });
    // 右侧“二选一”标签
    txt(ctx, "主体验证 · 二选一", lx + lw - 44, 356, { size: 24, align: "right", color: C.creamDim, alpha: seg(l, 1.0, 1.4), ls: 2 });
  }
  // 验证两卡 + 对比条
  const aCh = seg(l, 1.1, 1.6);
  if (aCh > 0) {
    d4.verify.forEach((v, i) => {
      const y = 490 + i * 170;
      const ain = E.outBack(seg(l, 1.15 + i * 0.3, 1.55 + i * 0.3));
      if (ain <= 0) return;
      ctx.save();
      ctx.translate(lx + lw / 2, y + 60); ctx.scale(ain, ain); ctx.translate(-lx - lw / 2, -y - 60);
      ctx.fillStyle = "rgba(16,12,8,0.8)";
      rrect(ctx, lx, y, lw, 120, 14); ctx.fill();
      ctx.strokeStyle = "rgba(217,180,92,0.35)"; ctx.lineWidth = 1.4;
      rrect(ctx, lx, y, lw, 120, 14); ctx.stroke();
      txt(ctx, v.label, lx + 44, y + 42, { size: 29, align: "left", color: C.cream, ls: 3 });
      // 对比条（长度按真实费用 0 与 300）
      const maxFee = d4.verify[1].fee;
      const frac = v.fee / maxFee;
      const grow = E.outCubic(seg(l, 1.7 + i * 0.35, 2.5 + i * 0.35));
      const bw2 = Math.max(0.018, frac) * (lw - 220) * grow;
      const g = ctx.createLinearGradient(lx + 44, 0, lx + 44 + lw - 220, 0);
      g.addColorStop(0, "#e8c877"); g.addColorStop(1, "#8a6a2a");
      ctx.fillStyle = i === 1 ? g : "rgba(217,180,92,0.30)";
      rrect(ctx, lx + 44, y + 70, bw2, 16, 8); ctx.fill();
      txt(ctx, v.feeText, lx + lw - 44, y + 78, {
        size: 34, align: "right", baseline: "middle", weight: 700,
        color: i === 1 ? C.goldHi : C.creamDim, alpha: grow, ls: 2
      });
      ctx.restore();
    });
    txt(ctx, "打款金额原路退回 · 以平台规则为准", lx + lw / 2, 840, { size: 21, color: C.faint, alpha: seg(l, 2.6, 3.0), ls: 2 });
  }

  // —— 右：代码面板（瀑布滚动）——
  const cpx = 950, cpy = 280, cpw = 720, cph = 400;
  const aCode = seg(l, 0.35, 0.9);
  if (aCode > 0) {
    ctx.save();
    ctx.globalAlpha = aCode;
    ctx.fillStyle = "rgba(10,8,5,0.92)";
    rrect(ctx, cpx, cpy, cpw, cph, 14); ctx.fill();
    ctx.strokeStyle = "rgba(217,180,92,0.35)"; ctx.lineWidth = 1.4;
    rrect(ctx, cpx, cpy, cpw, cph, 14); ctx.stroke();
    // 标题栏圆点
    ["#b03028", "#d9b45c", "#5a7d4a"].forEach((cc, i) => {
      ctx.fillStyle = cc; ctx.globalAlpha = aCode * 0.8;
      ctx.beginPath(); ctx.arc(cpx + 30 + i * 26, cpy + 26, 6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = aCode;
    txt(ctx, "微信开发者工具", cpx + cpw / 2 + 30, cpy + 33, { size: 20, color: C.creamDim, ls: 2 });
    ctx.restore();
    // 代码滚动（offset 只由 t 决定）
    ctx.save();
    rrect(ctx, cpx + 8, cpy + 52, cpw - 16, cph - 60, 8); ctx.clip();
    const lineH = 26, total = CODE_LINES.length;
    const off = (t * 2.2) % total;   // 行数循环
    for (let i = -1; i < 15; i++) {
      const idx = ((Math.floor(off) + i) % total + total) % total;
      const y = cpy + 76 + i * lineH - (off % 1) * lineH;
      if (y < cpy + 56 || y > cpy + cph - 14) continue;
      const [s, kind] = CODE_LINES[idx];
      if (!s) continue;
      const col = kind === 1 ? "rgba(217,180,92,0.9)" : kind === 3 ? "rgba(196,164,110,0.85)"
        : kind === 2 ? "rgba(150,140,120,0.55)" : "rgba(210,200,180,0.75)";
      ctx.font = MONO(19);
      ctx.fillStyle = col;
      ctx.textAlign = "left";
      ctx.fillText(s, cpx + 30, y);
    }
    // 打字光标行高亮
    const curY = cpy + 76 + 13 * lineH - (off % 1) * lineH;
    ctx.fillStyle = "rgba(217,180,92,0.07)";
    ctx.fillRect(cpx + 8, curY - 17, cpw - 16, lineH);
    ctx.restore();
  }

  // —— 下：前后端联调 ——
  const aLink = seg(l, 4.2, 4.7);
  if (aLink > 0) {
    const y = 780;
    txt(ctx, "小程序前端", 1010, y, { size: 27, color: C.cream, alpha: aLink, ls: 3 });
    txt(ctx, "服务端", 1590, y, { size: 27, color: C.cream, alpha: aLink, ls: 3 });
    [-30, 0, 30].forEach((dy, i) => {
      ctx.strokeStyle = `rgba(217,180,92,${0.22 * aLink})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(1080, y + dy * 0.4); ctx.bezierCurveTo(1240, y + dy, 1370, y + dy, 1480, y + dy * 0.4); ctx.stroke();
    });
    // 往返数据包
    for (let k = 0; k < 3; k++) {
      const st = (t * 0.6 + k / 3) % 1;
      const x = 1080 + st * 400;
      const dir = k % 2 === 0 ? 1 : -1;
      const yy = y + Math.sin(st * Math.PI) * dir * 16;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = aLink * Math.sin(st * Math.PI);
      ctx.fillStyle = "rgba(246,227,168,0.95)";
      ctx.beginPath(); ctx.arc(x, yy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    txt(ctx, "联调", 1285, y - 40, { size: 22, color: C.creamDim, alpha: aLink * (0.6 + 0.4 * Math.sin(t * 4)), ls: 6 });
  }
}

/* ================= S5 测试（28.8 – 36s） ================= */
function drawS5(ctx, t) {
  const l = t - TM.s5;
  stepIntro(ctx, l, 5, DATA.steps[4].full);
  const d5 = DATA.steps[5 - 1];

  // —— 左：真机阵列 ——
  for (let i = 0; i < 3; i++) {
    const ain = E.outBack(seg(l, 0.15 + i * 0.2, 0.55 + i * 0.2));
    if (ain <= 0) continue;
    const x = 250 + i * 190, y = 380, w = 150, h = 300;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(ain, ain); ctx.translate(-x - w / 2, -y - h / 2);
    ctx.fillStyle = "#0d0a07";
    rrect(ctx, x, y, w, h, 20); ctx.fill();
    ctx.strokeStyle = "rgba(217,180,92,0.5)"; ctx.lineWidth = 1.8;
    rrect(ctx, x, y, w, h, 20); ctx.stroke();
    // 屏内迷你界面
    ctx.strokeStyle = "rgba(217,180,92,0.35)"; ctx.lineWidth = 1;
    rrect(ctx, x + 14, y + 18, w - 28, 54, 6); ctx.stroke();
    ctx.fillStyle = "rgba(216,178,100,0.22)";
    rrect(ctx, x + 14, y + 86, w - 28, 70, 6); ctx.fill();
    ctx.fillStyle = "rgba(237,227,205,0.16)";
    for (let r = 0; r < 3; r++) ctx.fillRect(x + 14, y + 172 + r * 34, (w - 28) * (r === 2 ? 0.5 : 0.9), 10);
    ctx.fillStyle = "rgba(216,178,100,0.5)";
    rrect(ctx, x + 34, y + h - 44, w - 68, 26, 13); ctx.fill();
    ctx.restore();
    // 机型标注
    txt(ctx, d5.devices[i], x + w / 2, y + h + 36, { size: 23, color: C.creamDim, alpha: ain, ls: 3 });
  }
  txt(ctx, "真机预览", 350, 330, { size: 26, color: C.creamDim, ls: 6, alpha: seg(l, 0.4, 0.8) });

  // —— 右：兼容性矩阵 ——
  const mx = 940, my = 330, cw = 90, chh = 62, gap = 14;
  const aM = seg(l, 0.5, 0.95);
  if (aM > 0) {
    txt(ctx, "兼容矩阵", mx + 210, my - 12, { size: 26, color: C.creamDim, ls: 6, alpha: aM });
    // 表头（系统）
    d5.systems.forEach((s, j) => {
      txt(ctx, s, mx + 150 + j * (cw + gap) + cw / 2, my + 34, { size: 23, color: C.creamDim, alpha: aM, ls: 2 });
    });
    // 行（机型）+ 单元格
    d5.devices.forEach((dv, i2) => {
      const y = my + 66 + i2 * (chh + gap);
      txt(ctx, dv, mx + 60, y + chh / 2 + 1, { size: 24, color: C.creamDim, baseline: "middle", alpha: aM, ls: 2 });
      d5.systems.forEach((s, j) => {
        const x = mx + 150 + j * (cw + gap);
        ctx.fillStyle = "rgba(16,12,8,0.7)";
        rrect(ctx, x, y, cw, chh, 8); ctx.fill();
        ctx.strokeStyle = "rgba(217,180,92,0.22)"; ctx.lineWidth = 1;
        rrect(ctx, x, y, cw, chh, 8); ctx.stroke();
        // 逐格点亮（9 格）
        const cellIdx = i2 * 3 + j;
        const at = 0.9 + cellIdx * 0.32;
        const aCell = E.outBack(seg(l, at, at + 0.4));
        if (aCell > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, aCell);
          ctx.fillStyle = "rgba(216,178,100,0.13)";
          rrect(ctx, x, y, cw, chh, 8); ctx.fill();
          checkMark(ctx, x + cw / 2, y + chh / 2, 34, seg(l, at + 0.1, at + 0.5), C.gold, 3);
          ctx.restore();
        }
      });
    });
  }

  // —— 下中右：BUG 清单（逐个划掉，右移避开手机阵与字幕）——
  const bx = 820, by = 600, bw = 720, bh = 46 + d5.bugs.length * 52;
  const aB = seg(l, 3.3, 3.8);
  if (aB > 0) {
    ctx.save();
    ctx.globalAlpha = aB;
    ctx.fillStyle = "rgba(14,10,6,0.85)";
    rrect(ctx, bx, by, bw, bh, 14); ctx.fill();
    ctx.strokeStyle = "rgba(176,48,40,0.4)"; ctx.lineWidth = 1.5;
    rrect(ctx, bx, by, bw, bh, 14); ctx.stroke();
    ctx.restore();
    txt(ctx, "BUG 修复 · 提审自查", bx + 44, by + 36, { size: 24, color: C.creamDim, ls: 4, alpha: aB });
    const strikes = [3.9, 4.8, 5.7];
    d5.bugs.forEach((s, i) => {
      const y = by + 78 + i * 52;
      txt(ctx, s, bx + 60, y + 1, { size: 27, align: "left", baseline: "middle", color: C.cream, alpha: aB, ls: 2 });
      // 删除线扫过
      const sp = seg(l, strikes[i], strikes[i] + 0.28);
      if (sp > 0) {
        ctx.strokeStyle = `rgba(216,74,58,${0.9 * Math.min(1, sp * 2)})`;
        ctx.lineWidth = 3; ctx.lineCap = "round";
        const tw = 320;
        ctx.beginPath(); ctx.moveTo(bx + 60, y); ctx.lineTo(bx + 60 + tw * E.outCubic(sp), y); ctx.stroke();
      }
      // 已修复
      const okA = seg(l, strikes[i] + 0.32, strikes[i] + 0.62);
      if (okA > 0) {
        txt(ctx, "已修复", bx + bw - 60, y + 1, { size: 22, align: "right", baseline: "middle", color: C.gold, alpha: okA, ls: 2 });
        checkMark(ctx, bx + bw - 132, y, 24, okA);
      }
    });
  }
}

/* ================= S6 备案（36 – 43.2s）强调段 ================= */
function drawS6(ctx, t) {
  const l = t - TM.s6;
  const d6 = DATA.steps[6 - 1];

  // 背景：更暗 + 红调脉动
  ctx.save();
  const beat = Math.sin(t * Math.PI * 2 / 1.2) * 0.5 + 0.5;
  const g = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1100);
  g.addColorStop(0, "rgba(60,14,10,0)");
  g.addColorStop(1, `rgba(46,10,8,${0.42 + beat * 0.10})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  stepIntro(ctx, l, 6, d6.full, C.redHi);

  // —— 大字「备案」砸入 + 震屏 ——
  const aStamp = seg(l, 0.05, 0.32);
  if (aStamp > 0) {
    const sc = 2.6 - 1.6 * E.inCubic(aStamp);
    const shake = Math.max(0, 1 - seg(l, 0.32, 0.9));
    const shx = Math.sin(t * 88) * 13 * shake, shy = Math.cos(t * 96) * 9 * shake;
    ctx.save();
    ctx.translate(W / 2 + shx, 348 + shy);
    ctx.scale(sc, sc);
    ctx.font = FONT(700, 190);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "26px";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = redGrad(ctx, -110, 240);
    ctx.globalAlpha = Math.min(1, aStamp * 1.6);
    ctx.shadowColor = "rgba(216,74,58,0.55)"; ctx.shadowBlur = 34;
    ctx.fillText("备案", 0, 0);
    ctx.restore();
    // 砸入冲击环
    const ring = pulse(l, 0.3, 0.9);
    if (ring > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(216,74,58,${ring * 0.65})`; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(W / 2, 348, 130 + (1 - ring) * 300, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  // —— 红色印章（环文 + 五角星）——
  const sealA = E.outBack(seg(l, 0.4, 1.0));
  if (sealA > 0) {
    const cx = 1436, cy = 332, r = 100;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.06 + Math.sin(t * 0.8) * 0.012);
    ctx.scale(sealA, sealA);
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = "rgba(200,58,48,0.9)"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(200,58,48,0.55)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, Math.PI * 2); ctx.stroke();
    starPath(ctx, 0, 8, 34);
    ctx.fillStyle = "rgba(200,58,48,0.85)"; ctx.fill();
    arcText(ctx, "小程序·备案核验", 0, 0, r - 34, -Math.PI * 0.78, Math.PI * 0.28, { size: 24, color: "rgba(216,74,58,0.92)" });
    arcText(ctx, "工信部", 0, 0, r - 34, Math.PI * 0.52, Math.PI * 0.98, { size: 24, color: "rgba(216,74,58,0.92)" });
    ctx.restore();
  }

  // —— 左上：强制日期档案卡（下移避开章节标记）——
  const aCal = E.outCubic(seg(l, 0.8, 1.35));
  if (aCal > 0) {
    ctx.save();
    ctx.translate(310, 340); ctx.scale(aCal, aCal); ctx.translate(-310, -340);
    ctx.fillStyle = "rgba(18,10,7,0.88)";
    rrect(ctx, 130, 252, 360, 176, 12); ctx.fill();
    ctx.strokeStyle = "rgba(217,180,92,0.4)"; ctx.lineWidth = 1.5;
    rrect(ctx, 130, 252, 360, 176, 12); ctx.stroke();
    txt(ctx, d6.enforceDate, 310, 330, {
      size: 58, weight: 700, ls: 2, gradient: goldGrad(ctx, 284, 70), glow: 12
    });
    txt(ctx, d6.enforceNote, 310, 386, { size: 26, color: C.creamDim, ls: 8 });
    ctx.restore();
    // 存量限期（第二行）
    const aL2 = seg(l, 1.5, 2.0);
    if (aL2 > 0) {
      txt(ctx, "存量限期", 168, 484, { size: 24, align: "left", color: C.creamDim, alpha: aL2, ls: 4 });
      txt(ctx, d6.legacyDeadline, 300, 486, { size: 34, weight: 700, color: C.cream, alpha: aL2, ls: 2 });
      const sq = E.outBack(seg(l, 1.9, 2.25));
      ctx.save(); ctx.globalAlpha = sq;
      ctx.strokeStyle = "rgba(216,74,58,0.85)"; ctx.lineWidth = 2.4;
      ctx.save(); ctx.translate(452, 478); ctx.rotate(-0.1);
      rrect(ctx, -62, -24, 130, 48, 6); ctx.stroke();
      txt(ctx, "逾期清退", 3, 2, { size: 24, color: C.redHi, ls: 4, baseline: "middle" });
      ctx.restore(); ctx.restore();
    }
  }

  // —— 右上：反常识徽标 ——
  const aCC = seg(l, 1.9, 2.4);
  if (aCC > 0) {
    const px2 = 1590, py2 = 190;
    ctx.save();
    ctx.globalAlpha = aCC * (0.82 + 0.18 * Math.sin(t * 3));
    ctx.strokeStyle = "rgba(217,180,92,0.6)"; ctx.lineWidth = 1.6;
    rrect(ctx, px2 - 250, py2 - 34, 500, 68, 8); ctx.stroke();
    // 括角
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(px2 + sx * 250 - sx * 16, py2 + sy * 34 - sy * 16 + (sy > 0 ? -8 : 8));
      ctx.lineTo(px2 + sx * 250 - sx * 16, py2 + sy * 34 + (sy > 0 ? -2 : 2));
      ctx.lineTo(px2 + sx * 250 + (sx > 0 ? -2 : 2), py2 + sy * 34 + (sy > 0 ? -2 : 2));
      ctx.stroke();
    });
    txt(ctx, d6.counterClaim, px2, py2 + 2, { size: 27, baseline: "middle", color: C.goldHi, ls: 3, glow: 10 });
    ctx.restore();
  }

  // —— 中下：5 环节进度环 ——
  const aRing = seg(l, 2.3, 2.8);
  if (aRing > 0) {
    const cx = W / 2, cy = 730, R = 150;
    const stages = d6.stages;
    const per = 0.78; // 每环节点亮耗时
    const startAt = 2.5;
    ctx.save();
    ctx.globalAlpha = aRing;
    // 环底
    ctx.strokeStyle = "rgba(217,180,92,0.16)"; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    stages.forEach((s, i) => {
      const a0 = -Math.PI / 2 + i * (Math.PI * 2 / 5) + 0.09;
      const a1 = -Math.PI / 2 + (i + 1) * (Math.PI * 2 / 5) - 0.09;
      // 点亮弧
      const p = E.outCubic(seg(l, startAt + i * per, startAt + i * per + per * 0.8));
      if (p > 0) {
        ctx.strokeStyle = i === 4 ? "#e8c877" : "rgba(217,180,92,0.9)";
        ctx.lineWidth = 13; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0, a0 + (a1 - a0) * p);
        ctx.stroke();
        // 弧端光点
        const ae = a0 + (a1 - a0) * p;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(246,227,168,0.9)";
        ctx.beginPath(); ctx.arc(cx + Math.cos(ae) * R, cy + Math.sin(ae) * R, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // 节点标签
      const am = a0 + (a1 - a0) / 2;
      const lx = cx + Math.cos(am) * (R + 66), ly = cy + Math.sin(am) * (R + 62);
      const on = l >= startAt + i * per;
      txt(ctx, s, lx, ly, {
        size: 25, baseline: "middle", ls: 1,
        color: on ? (i === 4 ? C.goldHi : C.cream) : "rgba(237,227,205,0.46)",
        alpha: aRing, glow: on && i === 4 ? 12 : 0
      });
    });
    // 中心：完成前只显示大百分比 + 小字，避免文字堆叠
    const done = l >= startAt + 4 * per + 0.15;
    if (done) {
      checkMark(ctx, cx, cy - 12, 60, seg(l, startAt + 4 * per + 0.1, startAt + 4 * per + 0.5), C.goldHi, 6);
      txt(ctx, "备案成功", cx, cy + 44, { size: 30, color: C.goldHi, ls: 4, alpha: seg(l, startAt + 4 * per + 0.3, startAt + 4 * per + 0.7), glow: 12 });
    } else {
      const prog = seg(l, startAt, startAt + 4 * per + 0.15);
      txt(ctx, Math.round(prog * 100) + "%", cx, cy - 6, { size: 58, weight: 700, color: C.gold, alpha: aRing * 0.95, gradient: goldGrad(ctx, cy - 52, 68) });
      txt(ctx, "流转中", cx, cy + 46, { size: 21, color: C.creamDim, ls: 8, alpha: aRing * 0.8 });
    }
    ctx.restore();
    // 时限刻度（数字均来自 DATA；错峰：待字幕淡出后再出现）
    const tickA = seg(l, 3.75, 4.2);
    if (tickA > 0) {
      const s = d6.stageTimes.join("　·　");
      txt(ctx, s, W / 2, 938, { size: 25, color: C.creamDim, alpha: tickA, ls: 2 });
    }
  }
}

/* ================= S7 提审发布（43.2 – 50.4s） ================= */
function drawS7(ctx, t) {
  const l = t - TM.s7;
  stepIntro(ctx, l, 7, DATA.steps[7 - 1].full);
  const d7 = DATA.steps[7 - 1];

  // 背景光束（汇聚中心）
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const a = 0.016 + 0.012 * Math.sin(t * 0.7 + i);
    const x = 200 + i * 380;
    const g = ctx.createLinearGradient(x, 0, W / 2, H / 2);
    g.addColorStop(0, "rgba(216,178,100,0)");
    g.addColorStop(1, `rgba(216,178,100,${a})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 60, 0); ctx.lineTo(x + 60, 0);
    ctx.lineTo(W / 2 + 130, H / 2); ctx.lineTo(W / 2 - 130, H / 2);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // —— 审核进度条（1–7 工作日）——
  const aBar = seg(l, 0.25, 0.7);
  if (aBar > 0) {
    const bx = 400, bx2 = 1520, by = 430;
    txt(ctx, "代码审核", W / 2, 352, { size: 31, color: C.creamDim, ls: 10, alpha: aBar });
    txt(ctx, `${d7.auditMin}–${d7.auditMax} 个工作日 · ${d7.auditNote}`, W / 2, 400, { size: 24, color: "rgba(237,227,205,0.5)", alpha: aBar, ls: 4 });
    // 轨道
    ctx.fillStyle = "rgba(217,180,92,0.14)";
    rrect(ctx, bx, by, bx2 - bx, 14, 7); ctx.fill();
    // 刻度 1..7
    for (let k = d7.auditMin; k <= d7.auditMax; k++) {
      const x = bx + (bx2 - bx) * (k - 1) / (d7.auditMax - 1);
      ctx.strokeStyle = "rgba(217,180,92,0.4)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, by - 10); ctx.lineTo(x, by + 24); ctx.stroke();
      txt(ctx, String(k), x, by + 52, { size: 22, color: C.creamDim, alpha: aBar });
    }
    txt(ctx, "工作日", bx2 + 64, by + 52, { size: 22, color: C.faint, alpha: aBar, ls: 2 });
    // 填充（分 7 步推进）
    const stepT = 0.42, startFill = 0.45;
    const total = (d7.auditMax - 1) * stepT;
    const fp = E.inOutCubic(seg(l, startFill, startFill + total)) * (d7.auditMax - 1) / (d7.auditMax - 1);
    const fw = (bx2 - bx) * fp;
    if (fw > 4) {
      const g = ctx.createLinearGradient(bx, 0, bx2, 0);
      g.addColorStop(0, "#8a6a2a"); g.addColorStop(1, "#f6e3a8");
      ctx.fillStyle = g;
      rrect(ctx, bx, by, fw, 14, 7); ctx.fill();
      // 端点光标
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(246,227,168,0.95)";
      ctx.beginPath(); ctx.arc(bx + fw, by + 7, 7 + Math.sin(t * 9) * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    txt(ctx, fp > 0.99 ? "审核完成" : "审核中…", bx2, by - 26, { size: 24, align: "right", color: fp > 0.99 ? C.goldHi : C.creamDim, alpha: aBar, ls: 3 });
  }

  // —— 审核通过徽章 ——
  const badgeT = 3.3;
  const aBadge = E.outBack(seg(l, badgeT, badgeT + 0.55));
  if (aBadge > 0) {
    const shrink = seg(l, 4.15, 4.5);     // 给发布按钮让位
    const cx = W / 2 - shrink * 240, cy = 620 - shrink * 66;
    const sc = aBadge * (1 - shrink * 0.28);
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    // 外圈
    ctx.strokeStyle = "rgba(217,180,92,0.55)"; ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.arc(0, 0, 104, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 84, 0, Math.PI * 2); ctx.stroke();
    checkMark(ctx, 0, -8, 62, seg(l, badgeT + 0.25, badgeT + 0.7), C.goldHi, 6);
    txt(ctx, d7.badge, 0, 52, { size: 27, color: C.goldHi, ls: 6, glow: 10 });
    ctx.restore();
    // 爆发环
    const burst = pulse(l, badgeT, badgeT + 0.6);
    if (burst > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(246,227,168,${burst * 0.7})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 100 + (1 - burst) * 220, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  // —— 发布按钮 ——
  const btnT = 4.35;
  const aBtn = E.outBack(seg(l, btnT, btnT + 0.5));
  if (aBtn > 0) {
    const cx = W / 2 + 150 + (1 - aBtn) * 40, cy = 620;
    const press = pulse(l, 4.75, 5.3);
    const bs = aBtn * (1 - press * 0.1);
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(bs, bs);
    const bw = 300, bh = 94;
    const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
    g.addColorStop(0, "#f2dc9d"); g.addColorStop(0.5, "#dcb964"); g.addColorStop(1, "#8a6a2a");
    ctx.fillStyle = g;
    rrect(ctx, -bw / 2, -bh / 2, bw, bh, 47); ctx.fill();
    ctx.strokeStyle = "rgba(246,227,168,0.8)"; ctx.lineWidth = 2;
    rrect(ctx, -bw / 2, -bh / 2, bw, bh, 47); ctx.stroke();
    txt(ctx, d7.button, 0, 2, { size: 40, weight: 700, color: "#241a0c", ls: 14, baseline: "middle" });
    ctx.restore();
    // 按下涟漪
    if (press > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(246,227,168,${press * 0.8})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 60 + (1 - press) * 260, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(246,227,168,${press * 0.4})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 40 + (1 - press) * 420, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // 发布光束横扫
    const sweep = seg(l, 4.95, 5.55);
    if (sweep > 0 && sweep < 1) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const x = -300 + sweep * (W + 600);
      const g2 = ctx.createLinearGradient(x - 240, 0, x + 240, 0);
      g2.addColorStop(0, "rgba(246,227,168,0)");
      g2.addColorStop(0.5, "rgba(246,227,168,0.10)");
      g2.addColorStop(1, "rgba(246,227,168,0)");
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  // —— 手动发布提示 ——
  txt(ctx, d7.manualNote, W / 2, 800, { size: 24, color: C.creamDim, alpha: seg(l, 3.9, 4.3), ls: 2 });

  // —— 尾声：手机亮起（衔接 S8）——
  const glow = seg(l, 5.6, 7.0);
  if (glow > 0) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 800);
    g.addColorStop(0, `rgba(246,227,168,${glow * 0.22})`);
    g.addColorStop(1, "rgba(246,227,168,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/* ================= S8 结尾（50.4 – 60s） ================= */
function drawS8(ctx, t) {
  const l = t - TM.s8;
  const EN = DATA.ending;

  // —— 手机（右侧，图标格）——
  const px = 1130, py = 190, pw = 330, ph = 660;
  const aP = E.outCubic(seg(l, 0.15, 1.0));
  if (aP > 0) {
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2); ctx.scale(0.94 + aP * 0.06, 0.94 + aP * 0.06); ctx.translate(-px - pw / 2, -py - ph / 2);
    ctx.globalAlpha = aP;
    ctx.fillStyle = "#151009";
    rrect(ctx, px, py, pw, ph, 40); ctx.fill();
    // 屏幕内微光，提升整体可见度
    const sg = ctx.createRadialGradient(px + pw * 0.5, py + ph * 0.42, 40, px + pw / 2, py + ph / 2, 480);
    sg.addColorStop(0, "rgba(216,178,100,0.10)");
    sg.addColorStop(1, "rgba(216,178,100,0)");
    ctx.fillStyle = sg;
    rrect(ctx, px, py, pw, ph, 40); ctx.fill();
    ctx.strokeStyle = "rgba(217,180,92,0.65)"; ctx.lineWidth = 2.2;
    rrect(ctx, px, py, pw, ph, 40); ctx.stroke();
    // 图标阵（4×5），我们的小程序第 2 个
    const iconA = seg(l, 0.5, 1.3);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
      const idx = r * 4 + c;
      const isMine = idx === 5;
      const x = px + 30 + c * 70, y = py + 96 + r * 104;
      const a = iconA <= 0 ? 0 : clamp01((iconA - idx * 0.02) / 0.5) * (isMine ? 1 : 0.40 - l * 0.02);
      if (a <= 0) continue;
      if (isMine) {
        const g = ctx.createLinearGradient(x, y, x + 52, y + 52);
        g.addColorStop(0, "#f6e3a8"); g.addColorStop(1, "#a9812f");
        ctx.fillStyle = g;
        rrect(ctx, x, y, 52, 52, 13); ctx.fill();
        txt(ctx, "微", x + 26, y + 27, { size: 30, weight: 700, color: "#241a0c", baseline: "middle" });
        txt(ctx, "我的小程序", x + 26, y + 72, { size: 15, color: C.creamDim, alpha: Math.min(1, a + 0.3) });
      } else {
        ctx.globalAlpha = aP * a;
        ctx.strokeStyle = "rgba(217,180,92,0.42)"; ctx.lineWidth = 1.2;
        rrect(ctx, x, y, 52, 52, 13); ctx.stroke();
        ctx.globalAlpha = aP;
      }
    }
    ctx.restore();

    // 图标光环（呼吸 + 扩散环）
    const halo = seg(l, 1.5, 2.1);
    if (halo > 0) {
      const hx = px + 30 + 1 * 70 + 26, hy = py + 96 + 1 * 104 + 26;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const breathe = 0.5 + 0.5 * Math.sin(t * 2.2);
      const g = ctx.createRadialGradient(hx, hy, 10, hx, hy, 190);
      g.addColorStop(0, `rgba(246,227,168,${0.30 * halo * (0.7 + 0.3 * breathe)})`);
      g.addColorStop(1, "rgba(246,227,168,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(hx, hy, 190, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 3; k++) {
        const p = ((t * 0.5 + k / 3) % 1);
        ctx.strokeStyle = `rgba(246,227,168,${(1 - p) * 0.5 * halo})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(hx, hy, 40 + p * 150, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // —— 左侧文案 ——
  const a1 = seg(l, 1.55, 2.1);
  const a2 = seg(l, 3.2, 3.8);
  if (a1 > 0) {
    txt(ctx, EN.l1, 560, 430, { size: 52, weight: 600, color: C.cream, alpha: a1, ls: 6, glow: 16 });
    goldRule(ctx, 340, 780, 486, 0.5 * a2, 2);
  }
  if (a2 > 0) {
    txt(ctx, EN.l2, 560, 566, { size: 42, color: C.goldHi, alpha: a2, ls: 8, glow: 10 });
    txt(ctx, EN.l3, 560, 640, { size: 42, color: C.goldHi, alpha: a2, ls: 8, glow: 10 });
  }

  // —— 金尘沉淀 ——
  drawDust(ctx, t, { drift: 0.85, alpha: seg(l, 0.5, 1.5) });

  // —— 全局压暗与收尾 ——
  const dim = seg(l, 7.3, 9.05);
  if (dim > 0) {
    ctx.fillStyle = `rgba(4,3,2,${dim})`;
    ctx.fillRect(0, 0, W, H);
    const endA = pulse(l, 7.5, 9.35) * 0.95;
    if (endA > 0) {
      txt(ctx, DATA.meta.title, W / 2, H / 2, { size: 32, color: C.cream, alpha: endA, ls: 12, glow: 12 });
      goldRule(ctx, W / 2 - 260, W / 2 + 260, H / 2 + 38, endA * 0.6);
    }
  }
}
