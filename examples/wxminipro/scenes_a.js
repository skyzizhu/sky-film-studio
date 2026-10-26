// =====================================================================
// scenes_a.js —— S0 钩子 / S1 调研 / S2 方案 / S3 UI 设计
// 所有数字一律取自 window.DATA，代码内不出现数据数字
// =====================================================================
"use strict";
const TM = DATA.timing;

/* ================= S0 钩子（0 – 2.4s） ================= */
const BURST = (() => {
  const rnd = mulberry32(77), arr = [];
  for (let i = 0; i < 150; i++) {
    const a = rnd() * Math.PI * 2, sp = 0.25 + Math.pow(rnd(), 0.6) * 1.0;
    arr.push({ a, sp, r: 0.8 + rnd() * 2.6, ph: rnd() * Math.PI * 2 });
  }
  return arr;
})();

function drawS0(ctx, t) {
  // 背景爆开的金色尘埃
  const bp = E.outCubic(seg(t, 0, 1.15));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (t < 1.6) {
    for (const p of BURST) {
      const d = p.sp * bp * 690;
      const x = W / 2 + Math.cos(p.a) * d, y = H * 0.46 + Math.sin(p.a) * d * 0.72;
      const a = (1 - seg(t, 0.25, 1.5)) * 0.5;
      if (a <= 0) continue;
      ctx.fillStyle = `rgba(240,214,150,${a})`;
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 0s 中心闪光环
  const fl = pulse(t, 0, 0.55);
  if (fl > 0) {
    ctx.strokeStyle = `rgba(246,227,168,${fl * 0.75})`;
    ctx.lineWidth = 3 + fl * 5;
    ctx.beginPath(); ctx.arc(W / 2, H * 0.46, 40 + (1 - fl) * 320, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  // 主句（0.05 起）
  const a1 = seg(t, 0.06, 0.5);
  const rise = seg(t, 0.7, 1.0);          // 0.7s 后微缩上移给数字让位
  const yL1 = 420 - rise * 52;
  ctx.save();
  ctx.translate(W / 2, yL1);
  ctx.scale(1 + (1 - E.outCubic(a1)) * 0.16, 1 + (1 - E.outCubic(a1)) * 0.16);
  txt(ctx, DATA.eco.hookL1, 0, 0, { size: 58, weight: 600, ls: 6, alpha: a1, color: C.cream, glow: 18 });
  ctx.restore();

  // “只需 7 步”（金色，7 放大）
  const a2 = seg(t, 0.34, 0.85);
  if (a2 > 0) {
    ctx.save();
    ctx.font = FONT(600, 58); const w1 = ctx.measureText(DATA.eco.hookL2a).width;
    ctx.font = FONT(700, 128); const w2 = ctx.measureText(" " + DATA.eco.hookL2b + " ").width;
    ctx.font = FONT(600, 58); const w3 = ctx.measureText(DATA.eco.hookL2c).width;
    const total = w1 + w2 + w3;
    let x = W / 2 - total / 2;
    const y2 = 540 - rise * 40;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "10px";
    txt(ctx, DATA.eco.hookL2a, x + w1 / 2, y2, { size: 58, weight: 600, ls: 10, alpha: a2, color: C.creamDim, baseline: "middle" });
    txt(ctx, " " + DATA.eco.hookL2b + " ", x + w1 + w2 / 2, y2 + 6, {
      size: 128, weight: 700, alpha: a2, baseline: "middle", ls: 0,
      gradient: goldGrad(ctx, y2 - 70, 150), glow: 26
    });
    txt(ctx, DATA.eco.hookL2c, x + w1 + w2 + w3 / 2, y2, { size: 58, weight: 600, ls: 10, alpha: a2, color: C.creamDim, baseline: "middle" });
    ctx.restore();
  }

  // 两组生态数字（0.78 起，对撞）
  const numA = E.outExpo(seg(t, 0.78, 1.32));
  const numB = E.outExpo(seg(t, 1.28, 1.78));
  const fadeAll = 1 - seg(t, 2.12, 2.38);
  const yN0 = 760, yN = yN0 - seg(t, 1.6, 2.3) * 46;
  if (t > 0.72 && fadeAll > 0) {
    // 左：月活
    drawEcoNum(ctx, 560, yN, numA, DATA.eco.wechatMAU, "left", fadeAll);
    // 右：日活
    drawEcoNum(ctx, 1360, yN, numB, DATA.eco.miniDAU, "right", fadeAll);
    // 中缝分隔与对撞闪光
    goldRule(ctx, 700, 1220, yN - 6, 0.28 * fadeAll);
    const ring = pulse(t, 1.3, 1.85);
    if (ring > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(246,227,168,${ring * 0.6})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(W / 2, yN - 20, 26 + (1 - ring) * 120, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

// 生态数字块（滚动计数 + 标签 + 来源角标）
function drawEcoNum(ctx, x, y, prog, d, side, fade) {
  if (prog <= 0 || fade <= 0) return;
  const val = d.roll * prog;
  const shown = d.text.includes(".") ? val.toFixed(2) : Math.round(val).toString();
  ctx.save();
  ctx.textAlign = "center";
  // 数字
  const numSize = 120;
  ctx.font = FONT(700, numSize);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
  const wNum = ctx.measureText(shown).width;
  ctx.font = FONT(600, 52);
  const wUnit = ctx.measureText(d.unit).width;
  const total = wNum + 12 + wUnit;
  const x0 = x - total / 2;
  const g = goldGrad(ctx, y - 96, 130);
  txt(ctx, shown, x0 + wNum / 2, y, { size: numSize, weight: 700, baseline: "middle", gradient: g, alpha: fade, glow: 20 });
  txt(ctx, d.unit, x0 + wNum + 12 + wUnit / 2, y + 18, { size: 52, weight: 600, baseline: "middle", color: C.gold, alpha: fade });
  // 标签 + 来源
  const aLab = seg(prog, 0.55, 1) * fade;
  txt(ctx, d.label, x, y + 72, { size: 30, color: C.creamDim, ls: 4, alpha: aLab });
  txt(ctx, d.tag, x, y + 112, { size: 21, color: C.faint, ls: 3, alpha: aLab });
  // 侧别小竖线
  ctx.globalAlpha = aLab * 0.6;
  ctx.strokeStyle = C.goldLine; ctx.lineWidth = 2;
  const sx = side === "left" ? x - total / 2 - 34 : x + total / 2 + 34;
  ctx.beginPath(); ctx.moveTo(sx, y - 60); ctx.lineTo(sx, y + 30); ctx.stroke();
  ctx.restore();
}

/* ================= 场景公共：步骤标记（左上角，避开内容区） ================= */
function stepIntro(ctx, l, idx, nameStr, color = C.gold) {
  const a = seg(l, 0.05, 0.45);
  if (a <= 0) return;
  const numStr = String(idx).padStart(2, "0");
  // 背后幽灵数字：左上角小幅出血，极淡
  ctx.save();
  ctx.globalAlpha = 0.06 * a;
  txt(ctx, numStr, 86, 152, { size: 230, weight: 700, align: "left", baseline: "middle", ls: -4 });
  ctx.restore();
  const aN = seg(l, 0.12, 0.5);
  txt(ctx, `第 ${idx} 步`, 150, 118, { size: 25, color, align: "left", alpha: aN * 0.92, ls: 8 });
  txt(ctx, nameStr, 150, 180, { size: 44, weight: 600, align: "left", color, alpha: aN, ls: 10, glow: 10 });
  goldRule(ctx, 152, 152 + 300 * aN, 208, 0.5, 2);
}

/* ================= S1 调研（2.4 – 9.6s） ================= */
const CROWD = (() => {
  const rnd = mulberry32(311), arr = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 26; c++) {
    arr.push({
      x: 90 + c * 70 + rnd() * 34, y: 585 + r * 62 + rnd() * 20,
      r: 4.5 + rnd() * 4.5, ph: rnd() * Math.PI * 2, sp: 0.5 + rnd() * 0.7
    });
  }
  return arr;
})();

function drawS1(ctx, t) {
  const l = t - TM.s1;

  // —— 背景：人群剪影 + 顶部档案卡 ——
  ctx.save();
  for (const p of CROWD) {
    const y = p.y + Math.sin(t * p.sp + p.ph) * 3;
    ctx.fillStyle = `rgba(190,170,130,0.09)`;
    ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(p.x - p.r * 0.85, y + p.r + 1, p.r * 1.7, p.r * 1.9);
  }
  ctx.restore();
  // 背景档案纸堆（右上，微漂）
  for (let i = 0; i < 3; i++) {
    const a = seg(l, 0.3 + i * 0.12, 0.9 + i * 0.12) * 0.10;
    if (a <= 0) continue;
    ctx.save();
    ctx.translate(1560 + Math.sin(t * 0.5 + i) * 6, 250 + i * 26 + Math.cos(t * 0.4 + i) * 4);
    ctx.rotate((i - 1) * 0.05);
    ctx.globalAlpha = a;
    ctx.strokeStyle = C.goldLine; ctx.lineWidth = 1.2;
    rrect(ctx, -150, -95, 300, 190, 8); ctx.stroke();
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-110, -50 + k * 34); ctx.lineTo(90, -50 + k * 34); ctx.stroke(); }
    ctx.restore();
  }

  stepIntro(ctx, l, 1, DATA.steps[0].full);

  // —— 中景左：需求验证 · 竞品扫描（抽象柱，无数值）——
  const cx0 = 330, cyBase = 840;
  const aChart = seg(l, 0.6, 1.1);
  if (aChart > 0) {
    txt(ctx, "需求验证 · 竞品扫描", 330 + 270, 600, { size: 27, color: C.creamDim, ls: 6, alpha: aChart });
    goldRule(ctx, 330, 870, cyBase + 8, 0.35 * aChart);
    const bars = [
      { name: "竞品 A", v: 0.55, at: 1.2 },
      { name: "竞品 B", v: 0.72, at: 1.7 },
      { name: "竞品 C", v: 0.44, at: 2.2 },
      { name: "你的机会", v: 0.88, at: 2.7, hero: true }
    ];
    bars.forEach((b, i) => {
      const gp = E.outCubic(seg(l, b.at, b.at + 0.6));
      if (gp <= 0) return;
      const bw = 104, x = cx0 + 26 + i * 146, hgt = 212 * b.v * gp;
      const g = ctx.createLinearGradient(0, cyBase - hgt, 0, cyBase);
      if (b.hero) { g.addColorStop(0, "rgba(246,227,168,0.95)"); g.addColorStop(1, "rgba(138,106,42,0.35)"); }
      else { g.addColorStop(0, "rgba(224,206,170,0.55)"); g.addColorStop(1, "rgba(160,142,110,0.18)"); }
      ctx.fillStyle = g;
      rrect(ctx, x, cyBase - hgt, bw, hgt, 4); ctx.fill();
      txt(ctx, b.name, x + bw / 2, cyBase + 40, {
        size: 24, color: b.hero ? C.gold : C.creamDim, alpha: aChart * seg(l, b.at + 0.2, b.at + 0.6),
        ls: 2, glow: b.hero ? 10 : 0
      });
    });
  }

  // —— 中景右：主体三选一卡片 ——
  const cards = DATA.steps[0].subjects;
  const cardX = 1080, cardW = 560, cardH = 96, gapY = 26;
  const cardIn = i => E.outBack(seg(l, 2.95 + i * 0.22, 3.35 + i * 0.22));
  const hiAt = [3.6, 4.3, 5.0];
  cards.forEach((s, i) => {
    const ain = cardIn(i);
    if (ain <= 0) return;
    const y = 470 + i * (cardH + gapY);
    const isHi = l >= hiAt[i] && l < hiAt[i] + 0.85;
    const isEnt = i === 2 && l >= hiAt[2];
    ctx.save();
    ctx.translate(cardX + cardW / 2, y + cardH / 2);
    ctx.scale(ain, ain);
    ctx.translate(-(cardX + cardW / 2), -(y + cardH / 2));
    // 卡片
    ctx.fillStyle = isEnt ? "rgba(30,22,10,0.92)" : "rgba(18,14,9,0.85)";
    rrect(ctx, cardX, y, cardW, cardH, 12); ctx.fill();
    const bAlpha = isEnt ? 0.95 : isHi ? 0.6 : 0.28;
    ctx.strokeStyle = isEnt ? C.gold : `rgba(217,180,92,${bAlpha})`;
    ctx.lineWidth = isEnt ? 2.2 : 1.4;
    rrect(ctx, cardX, y, cardW, cardH, 12); ctx.stroke();
    // 主体名
    txt(ctx, s, cardX + 42, y + cardH / 2 + 2, { size: 34, weight: 600, align: "left", baseline: "middle", color: isEnt ? C.goldHi : C.cream, alpha: 0.95 });
    // 序号点
    ctx.fillStyle = isEnt ? C.gold : "rgba(217,180,92,0.4)";
    ctx.beginPath(); ctx.arc(cardX + 22, y + cardH / 2, 4.5, 0, Math.PI * 2); ctx.fill();
    // 企业徽章
    if (isEnt) {
      const bA = seg(l, hiAt[2] + 0.35, hiAt[2] + 0.8);
      if (bA > 0) {
        const bw2 = 208;
        rrect(ctx, cardX + cardW - bw2 - 26, y + cardH / 2 - 22, bw2, 44, 22);
        ctx.strokeStyle = `rgba(217,180,92,${0.85 * bA})`; ctx.lineWidth = 1.6; ctx.stroke();
        txt(ctx, DATA.steps[0].subjectBadge, cardX + cardW - 26 - bw2 / 2, y + cardH / 2 + 1, { size: 23, color: C.gold, alpha: bA, ls: 2 });
        checkMark(ctx, cardX + cardW - bw2 - 44, y + cardH / 2 + 2, 26, seg(l, hiAt[2] + 0.5, hiAt[2] + 0.95));
      }
    }
    ctx.restore();
  });
  // 脚注
  txt(ctx, DATA.steps[0].subjectNote, cardX + cardW / 2, 470 + 3 * (cardH + gapY) + 2, { size: 21, color: C.faint, alpha: seg(l, 5.6, 6.1), ls: 2 });

  // —— 前景：放大镜（两次扫过）——
  const sweep1 = seg(l, 0.5, 2.5), sweep2 = seg(l, 5.4, 7.0);
  let mx = null, my = null;
  if (sweep1 > 0 && sweep1 < 1) { mx = 260 + sweep1 * 700; my = 690 + Math.sin(sweep1 * Math.PI) * -46; }
  if (sweep2 > 0 && sweep2 < 1) { mx = 1080 + sweep2 * 540; my = 620 - sweep2 * 40; }
  if (mx !== null) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(240,214,150,0.85)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(mx, my, 86, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(216,178,100,0.07)";
    ctx.beginPath(); ctx.arc(mx, my, 84, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(mx + 62, my + 62); ctx.lineTo(mx + 108, my + 108); ctx.lineWidth = 7; ctx.stroke();
    // 镜内十字
    ctx.strokeStyle = "rgba(240,214,150,0.35)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(mx - 30, my); ctx.lineTo(mx + 30, my); ctx.moveTo(mx, my - 30); ctx.lineTo(mx, my + 30); ctx.stroke();
    ctx.restore();
    // 镜下内容增亮
    ctx.save();
    ctx.beginPath(); ctx.arc(mx, my, 84, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "rgba(240,214,150,0.05)"; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/* ================= S2 方案（9.6 – 14.4s） ================= */
function drawS2(ctx, t) {
  const l = t - TM.s2;
  stepIntro(ctx, l, 2, DATA.steps[1].full);

  // —— 左：功能清单（逐条勾选）——
  const fx = 250, fy = 420, fw = 560, fh = 330;
  const aPanel = seg(l, 0.1, 0.55);
  if (aPanel > 0) {
    ctx.save();
    ctx.globalAlpha = aPanel;
    ctx.fillStyle = "rgba(16,12,8,0.72)";
    rrect(ctx, fx, fy, fw, fh, 14); ctx.fill();
    ctx.strokeStyle = "rgba(217,180,92,0.30)"; ctx.lineWidth = 1.4;
    rrect(ctx, fx, fy, fw, fh, 14); ctx.stroke();
    ctx.restore();
    txt(ctx, "功能清单", fx + 44, fy + 58, { size: 28, color: C.creamDim, align: "left", ls: 8, alpha: aPanel });
    goldRule(ctx, fx + 44, fx + fw - 44, fy + 80, 0.3 * aPanel);
    const ticks = [0.5, 1.0, 1.5];
    DATA.steps[1].features.forEach((s, i) => {
      const y = fy + 140 + i * 62;
      const boxA = seg(l, ticks[i] - 0.18, ticks[i]);
      if (boxA <= 0) return;
      ctx.strokeStyle = `rgba(217,180,92,${0.6 * boxA})`; ctx.lineWidth = 1.6;
      rrect(ctx, fx + 48, y - 17, 34, 34, 7); ctx.stroke();
      checkMark(ctx, fx + 65, y, 26, seg(l, ticks[i], ticks[i] + 0.35));
      txt(ctx, s, fx + 110, y + 1, { size: 29, align: "left", baseline: "middle", color: C.cream, alpha: boxA, ls: 3 });
    });
  }

  // —— 右上：用户路径（连线动画）——
  const pth = DATA.steps[1].path;
  const px0 = 1020, px1 = 1660, py = 480;
  const aPath = seg(l, 1.3, 1.7);
  if (aPath > 0) {
    txt(ctx, "用户路径", (px0 + px1) / 2, 378, { size: 26, color: C.creamDim, ls: 8, alpha: aPath });
    const step = (px1 - px0) / (pth.length - 1);
    // 连线（描边生长）
    const lineP = E.inOutCubic(seg(l, 1.6, 2.9));
    ctx.save();
    ctx.strokeStyle = "rgba(217,180,92,0.55)"; ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    for (let i = 0; i < pth.length; i++) {
      const x = px0 + i * step;
      const y = py + Math.sin(i * 1.7) * 26;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.save();
    ctx.setLineDash([6, 7]);
    ctx.lineDashOffset = 0;
    // 用裁剪近似“生长”
    ctx.restore();
    ctx.save();
    ctx.lineDashOffset = -t * 30;
    ctx.globalAlpha = lineP;
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    // 流动数据点
    const dotP = (t * 0.55) % 1;
    if (lineP > 0.05) {
      const fi = dotP * (pth.length - 1), i0 = Math.floor(fi), q = fi - i0;
      const xa = px0 + i0 * step, xb = px0 + (i0 + 1) * step;
      const ya = py + Math.sin(i0 * 1.7) * 26, yb = py + Math.sin((i0 + 1) * 1.7) * 26;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(246,227,168,0.9)";
      ctx.beginPath(); ctx.arc(xa + (xb - xa) * q, ya + (yb - ya) * q, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // 节点
    pth.forEach((s, i) => {
      const at = 1.45 + i * 0.28;
      const a = E.outBack(seg(l, at, at + 0.4));
      if (a <= 0) return;
      const x = px0 + i * step, y = py + Math.sin(i * 1.7) * 26;
      ctx.save();
      ctx.translate(x, y); ctx.scale(a, a);
      ctx.fillStyle = "rgba(20,15,9,0.95)";
      ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.goldLine; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      txt(ctx, s, x, y + 56, { size: 25, color: C.creamDim, alpha: a, ls: 2 });
    });
  }

  // —— 底部中：类目资质档案夹 ——
  const fa = E.outBack(seg(l, 3.05, 3.5));
  if (fa > 0) {
    const cx = W / 2, cy = 748;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(fa, fa); ctx.translate(-cx, -cy);
    // 档案夹（带标签页）
    ctx.fillStyle = "rgba(26,20,11,0.94)";
    rrect(ctx, cx - 380, cy - 74, 760, 148, 12); ctx.fill();
    ctx.strokeStyle = "rgba(217,180,92,0.5)"; ctx.lineWidth = 1.8;
    rrect(ctx, cx - 380, cy - 74, 760, 148, 12); ctx.stroke();
    ctx.fillStyle = "rgba(217,180,92,0.16)";
    rrect(ctx, cx - 250, cy - 92, 190, 24, 6); ctx.fill();
    ctx.strokeStyle = "rgba(217,180,92,0.4)"; ctx.lineWidth = 1;
    rrect(ctx, cx - 250, cy - 92, 190, 24, 6); ctx.stroke();
    txt(ctx, "类目 → 资质", cx - 155, cy - 79, { size: 19, color: C.gold, ls: 3 });
    // 两条资质
    const q = DATA.steps[1].categoryQuals;
    q.forEach((pair, i) => {
      const aq = seg(l, 3.45 + i * 0.4, 3.85 + i * 0.4);
      if (aq <= 0) return;
      txt(ctx, pair[0], cx - 240, cy - 8 + i * 52, { size: 30, baseline: "middle", color: C.cream, alpha: aq, ls: 2 });
      txt(ctx, "→", cx - 108, cy - 8 + i * 52, { size: 26, baseline: "middle", color: C.goldDeep, alpha: aq });
      txt(ctx, pair[1], cx + 40, cy - 8 + i * 52, { size: 30, baseline: "middle", color: C.goldHi, alpha: aq, ls: 2, align: "left" });
    });
    ctx.restore();
    txt(ctx, DATA.steps[1].qualNote, cx, cy + 108, { size: 21, color: C.faint, alpha: seg(l, 4.1, 4.5), ls: 2 });
  }
}

/* ================= S3 UI 设计（14.4 – 21.6s） ================= */
function drawS3(ctx, t) {
  const l = t - TM.s3;
  stepIntro(ctx, l, 3, DATA.steps[2].full);

  const px = 760, py = 150, pw = 400, ph = 760;   // 手机

  // —— 背后漂浮图层（视差）——
  for (let i = 0; i < 3; i++) {
    const a = seg(l, 0.4 + i * 0.25, 1.0 + i * 0.25) * 0.13;
    if (a <= 0) continue;
    const dx = Math.sin(t * 0.5 + i * 2.1) * 14, dy = Math.cos(t * 0.42 + i * 1.3) * 10;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = C.goldLine; ctx.lineWidth = 1.2;
    rrect(ctx, px - 170 + i * 62 + dx, py + 90 + i * 74 + dy, pw + 240, ph - 200, 18); ctx.stroke();
    ctx.restore();
  }

  // —— 手机本体 ——
  const aPhone = E.outCubic(seg(l, 0.1, 0.6));
  if (aPhone <= 0) return;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(0.97 + aPhone * 0.03, 0.97 + aPhone * 0.03); ctx.translate(-W / 2, -H / 2);
  ctx.globalAlpha = aPhone;
  // 机身
  ctx.fillStyle = "#0d0a07";
  rrect(ctx, px, py, pw, ph, 44); ctx.fill();
  ctx.strokeStyle = "rgba(217,180,92,0.55)"; ctx.lineWidth = 2.4;
  rrect(ctx, px, py, pw, ph, 44); ctx.stroke();
  ctx.strokeStyle = "rgba(217,180,92,0.16)"; ctx.lineWidth = 1;
  rrect(ctx, px + 10, py + 10, pw - 20, ph - 20, 36); ctx.stroke();
  // 灵动岛（窄胶囊，避开导航文字）
  rrect(ctx, W / 2 - 55, py + 16, 110, 22, 11);
  ctx.fillStyle = "#040302"; ctx.fill();

  const wire = seg(l, 0.25, 1.7);        // 线框期
  const colorP = seg(l, 1.75, 3.1);      // 上色期
  const polish = seg(l, 3.15, 5.2);      // 精修期
  const sx = px + 34, sy = py + 78, sw = pw - 68, sh = ph - 128;
  ctx.save();
  rrect(ctx, sx, sy, sw, sh, 18); ctx.clip();

  // —— 屏内：导航栏 ——
  const navA = seg(wire, 0, 0.3);
  if (navA > 0) {
    ctx.strokeStyle = `rgba(190,175,148,${0.55 * navA})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(sx, sy + 52); ctx.lineTo(sx + sw, sy + 52); ctx.stroke();
    const fillA = colorP * 0.5;
    if (fillA > 0) { ctx.fillStyle = `rgba(138,106,42,${fillA})`; ctx.fillRect(sx, sy, sw, 52); }
    txt(ctx, "小程序", sx + sw / 2, sy + 34, { size: 22, color: C.creamDim, alpha: navA, ls: 4 });
  }
  // —— 轮播主图 ——
  const heroA = seg(wire, 0.15, 0.5);
  if (heroA > 0) {
    const yy = sy + 70, hh = 170 * E.outCubic(heroA);
    ctx.strokeStyle = `rgba(190,175,148,${0.5 * heroA})`; ctx.lineWidth = 1.4;
    rrect(ctx, sx + 22, yy, sw - 44, hh, 10); ctx.stroke();
    // 线框期对角线
    if (colorP < 0.6) {
      ctx.beginPath(); ctx.moveTo(sx + 22, yy); ctx.lineTo(sx + sw - 22, yy + hh);
      ctx.moveTo(sx + sw - 22, yy); ctx.lineTo(sx + 22, yy + hh);
      ctx.globalAlpha = 0.5 * heroA * (1 - colorP / 0.6); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (colorP > 0) {
      const g = ctx.createLinearGradient(sx, yy, sx + sw, yy + hh);
      g.addColorStop(0, "rgba(138,106,42,0.55)"); g.addColorStop(1, "rgba(64,48,22,0.55)");
      ctx.globalAlpha = colorP; ctx.fillStyle = g;
      rrect(ctx, sx + 22, yy, sw - 44, hh, 10); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  // —— 内容行 ——
  const rowsA = seg(wire, 0.35, 0.85);
  if (rowsA > 0) {
    for (let i = 0; i < 3; i++) {
      const a = seg(rowsA, i * 0.28, 0.4 + i * 0.28);
      if (a <= 0) continue;
      const yy = sy + 268 + i * 66;
      ctx.strokeStyle = `rgba(190,175,148,${0.45 * a})`; ctx.lineWidth = 1.2;
      rrect(ctx, sx + 22, yy, 52, 52, 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 96, yy + 14); ctx.lineTo(sx + sw - 60, yy + 14);
      ctx.moveTo(sx + 96, yy + 38); ctx.lineTo(sx + sw - 130, yy + 38); ctx.stroke();
      if (colorP > 0.1 + i * 0.18) {
        ctx.fillStyle = `rgba(216,178,100,${0.20 * colorP})`;
        rrect(ctx, sx + 22, yy, 52, 52, 8); ctx.fill();
        ctx.fillStyle = `rgba(237,227,205,${0.16 * colorP})`;
        ctx.fillRect(sx + 96, yy + 10, (sw - 156) * 0.7, 8);
        ctx.fillRect(sx + 96, yy + 34, (sw - 226) * 0.7, 8);
      }
    }
  }
  // —— 底部按钮（精修期点按）——
  const btnA = seg(wire, 0.6, 1);
  if (btnA > 0) {
    const tapT = 4.35;
    const pressed = pulse(l, tapT, tapT + 0.5);
    const bs = 1 - pressed * 0.08;
    const by = sy + sh - 66;
    ctx.save();
    ctx.translate(sx + sw / 2, by); ctx.scale(bs, bs); ctx.translate(-sx - sw / 2, -by);
    ctx.strokeStyle = `rgba(190,175,148,${0.6 * btnA})`; ctx.lineWidth = 1.6;
    rrect(ctx, sx + 40, by - 26, sw - 80, 52, 26); ctx.stroke();
    if (colorP > 0.5) {
      const g = ctx.createLinearGradient(0, by - 26, 0, by + 26);
      g.addColorStop(0, "#e8c877"); g.addColorStop(1, "#8a6a2a");
      ctx.globalAlpha = (colorP - 0.5) / 0.5 * 0.95;
      ctx.fillStyle = g; rrect(ctx, sx + 40, by - 26, sw - 80, 52, 26); ctx.fill();
      ctx.globalAlpha = 1;
    }
    txt(ctx, "立即体验", sx + sw / 2, by + 1, {
      size: 24, baseline: "middle", ls: 6,
      color: colorP > 0.5 ? "#241a0c" : C.creamDim,
      alpha: btnA, weight: 600
    });
    ctx.restore();
    // 点按涟漪
    if (pressed > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(246,227,168,${pressed * 0.8})`; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(sx + sw / 2, by, 30 + (1 - pressed) * 90, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore(); // 屏幕裁剪

  // —— 游标（精修期移动到按钮）——
  if (polish > 0 && l < 5.0) {
    const cxp = E.inOutCubic(seg(l, 3.3, 4.3));
    const x = sx + 40 + (sw - 80) * (0.15 + 0.7 * cxp);
    const y = sy + sh - 66 + Math.sin(l * 2) * 4;
    ctx.save();
    ctx.fillStyle = "rgba(246,227,168,0.9)";
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(246,227,168,0.5)";
    ctx.beginPath(); ctx.arc(x, y, 8 + pulse(l, 4.3, 4.8) * 16, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore(); // 手机整体

  // —— 右侧：色板与字体样张 ——
  const swA = seg(l, 2.2, 2.8);
  if (swA > 0) {
    const cols = ["#f6e3a8", "#d9b45c", "#8a6a2a", "#3a2f1c"];
    cols.forEach((cc, i) => {
      const a = seg(swA, i * 0.15, 0.5 + i * 0.15);
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = cc;
      rrect(ctx, 1330, 372 + i * 80, 190, 48, 8); ctx.fill();
      ctx.strokeStyle = "rgba(217,180,92,0.35)"; ctx.lineWidth = 1;
      rrect(ctx, 1330, 372 + i * 80, 190, 48, 8); ctx.stroke();
      ctx.restore();
    });
    txt(ctx, "色板 · 衬线字体", 1425, 348, { size: 24, color: C.creamDim, ls: 4, alpha: swA });
    const specA = seg(l, 2.9, 3.4);
    if (specA > 0) {
      txt(ctx, "永", 1425, 720, { size: 92, weight: 700, alpha: specA, gradient: goldGrad(ctx, 640, 100), baseline: "middle" });
      txt(ctx, "Aa 123", 1425, 800, { size: 34, color: C.creamDim, alpha: specA, ls: 4, baseline: "middle" });
    }
  }

  // —— 左侧：间距标注 ——
  const dimA = seg(l, 3.6, 4.2);
  if (dimA > 0) {
    ctx.save();
    ctx.globalAlpha = dimA;
    ctx.strokeStyle = "rgba(217,180,92,0.5)"; ctx.lineWidth = 1.2;
    const yy = sy + 70 + 85;
    ctx.beginPath();
    ctx.moveTo(600, yy); ctx.lineTo(px + 22, yy);
    ctx.moveTo(600, yy - 8); ctx.lineTo(600, yy + 8);
    ctx.moveTo(px + 22, yy - 8); ctx.lineTo(px + 22, yy + 8);
    ctx.stroke();
    txt(ctx, "间距 · 圆角 · 层级", 590, yy - 26, { size: 23, color: C.creamDim, ls: 3, alpha: dimA });
    ctx.restore();
  }

  // —— 底部：三阶段指示 ——
  const stA = seg(l, 0.5, 1.0);
  if (stA > 0) {
    const stages3 = ["线框", "视觉", "动效"];
    const active = l < 1.75 ? 0 : l < 3.15 ? 1 : 2;
    stages3.forEach((s, i) => {
      const x = W / 2 + (i - 1) * 150, y = 952;
      const on = i === active;
      txt(ctx, s, x, y, { size: 25, color: on ? C.gold : C.faint, alpha: stA, ls: 6, glow: on ? 8 : 0 });
      if (on) goldRule(ctx, x - 34, x + 34, y + 18, 0.7, 2);
      if (i < 2) {
        ctx.strokeStyle = "rgba(217,180,92,0.3)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 48, y - 8); ctx.lineTo(x + 102, y - 8); ctx.stroke();
      }
    });
  }
}
