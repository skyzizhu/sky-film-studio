// =====================================================================
// main.js —— 总调度：drawFrame(t) 完全由 t 决定画面
// 结构：底色 → 场景 → 时间轴/顶栏/字幕 → 金尘/光带/暗角/颗粒 → 收尾黑场
// =====================================================================
"use strict";
const CTX = document.getElementById("c").getContext("2d", { alpha: false });

const STEP_STARTS = [TM.s1, TM.s2, TM.s3, TM.s4, TM.s5, TM.s6, TM.s7];
const STEP_DONE_ALL = TM.s8;                 // 50.4s 后 7 步全部完成

function activeStepIdx(t) {
  for (let i = STEP_STARTS.length - 1; i >= 0; i--) if (t >= STEP_STARTS[i]) return i;
  return -1;
}

/* ---------- 顶部常驻标题 ---------- */
function drawTopTitle(ctx, t) {
  const a = seg(t, 1.72, 2.15) * (1 - seg(t, 55.0, 56.2));
  if (a <= 0) return;
  txt(ctx, DATA.meta.title, W / 2, 66, { size: 30, weight: 600, color: C.cream, ls: 10, alpha: a, glow: 10 });
  goldRule(ctx, 320, W / 2 - 480, 66, 0.4 * a, 1.4);
  goldRule(ctx, W / 2 + 480, 1600, 66, 0.4 * a, 1.4);
  // 两端小菱形
  [[318, 66], [1602, 66]].forEach(([x, y]) => {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = `rgba(217,180,92,${0.7 * a})`;
    ctx.fillRect(-3.2, -3.2, 6.4, 6.4);
    ctx.restore();
  });
}

/* ---------- 底部时间轴（7 节点，随进度点亮） ---------- */
function drawTimeline(ctx, t) {
  const a = seg(t, 1.95, 2.4) * (1 - seg(t, 55.2, 56.6));
  if (a <= 0) return;
  const x0 = 330, x1 = 1590, y = 1008;
  const n = 7;
  const xs = i => x0 + i * (x1 - x0) / (n - 1);
  const act = activeStepIdx(t);
  const allDone = t >= STEP_DONE_ALL;

  ctx.save();
  ctx.globalAlpha = a;

  // 底轨
  ctx.strokeStyle = "rgba(237,227,205,0.14)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();

  // 分段填充：第 i 段在第 i 步进行期内点亮
  for (let i = 0; i < n - 1; i++) {
    const st = STEP_STARTS[i], en = STEP_STARTS[i + 1];
    const p = clamp01((t - st) / (en - st));
    if (p <= 0) continue;
    const g = ctx.createLinearGradient(xs(i), 0, xs(i + 1), 0);
    g.addColorStop(0, "rgba(138,106,42,0.9)");
    g.addColorStop(1, "rgba(232,200,119,0.95)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(xs(i), y); ctx.lineTo(xs(i) + (xs(i + 1) - xs(i)) * E.outCubic(p), y);
    ctx.stroke();
  }

  // 节点与卡片
  for (let i = 0; i < n; i++) {
    const lit = t >= STEP_STARTS[i];
    const isActive = i === act && !allDone;
    const x = xs(i);
    // 节点圆
    ctx.lineWidth = 2;
    if (lit) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 13);
      g.addColorStop(0, "#f6e3a8"); g.addColorStop(1, "#8a6a2a");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 9.5, 0, Math.PI * 2); ctx.fill();
      if (isActive) {
        const pu = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(246,227,168,${0.35 + 0.3 * pu})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 15 + pu * 3, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.strokeStyle = "rgba(217,180,92,0.35)";
      ctx.fillStyle = "rgba(10,8,5,1)";
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // 激活瞬间的扩散环
    const ringT = t - STEP_STARTS[i];
    if (ringT > 0 && ringT < 0.6) {
      const p = ringT / 0.6;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(246,227,168,${(1 - p) * 0.7})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(x, y, 10 + p * 46, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // 节点卡（步骤名 · 数据）
    const card = DATA.steps[i].card;
    const ca = lit ? (isActive ? 1 : 0.85) : 0.4;
    txt(ctx, card, x, 1046, {
      size: isActive ? 24 : 19.5,
      weight: isActive ? 700 : 600,
      color: isActive ? C.goldHi : lit ? C.creamDim : C.faint,
      alpha: ca * a * (isActive ? 1 : 0.9),
      ls: 1, glow: isActive ? 8 : 0
    });
    // 步骤序号（线上方小字）
    txt(ctx, String(i + 1), x, y - 26, {
      size: 17, color: lit ? C.gold : C.faint, alpha: a * (lit ? 0.9 : 0.6)
    });
  }
  // 全部完成的终态光
  if (allDone) {
    const sh = 0.5 + 0.5 * Math.sin(t * 2.4);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "rgba(246,227,168,0)");
    g.addColorStop(0.5, `rgba(246,227,168,${0.10 + 0.05 * sh})`);
    g.addColorStop(1, "rgba(246,227,168,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, y - 3, x1 - x0, 6);
    ctx.restore();
  }
  ctx.restore();
}

/* ---------- 字幕 ---------- */
const SUB_WINS = [
  [TM.s1 + 0.2, 6.9, DATA.subs.s1],
  [TM.s2 + 0.15, 13.5, DATA.subs.s2],
  [TM.s3 + 0.2, 18.9, DATA.subs.s3],
  [TM.s4 + 0.2, 26.7, DATA.subs.s4],
  [TM.s5 + 0.2, 33.9, DATA.subs.s5],
  [TM.s6 + 0.2, 39.8, DATA.subs.s6],
  [TM.s7 + 0.2, 48.4, DATA.subs.s7]
];
function drawSubtitle(ctx, t) {
  for (const [st, en, s] of SUB_WINS) {
    if (t < st || t > en + 0.4) continue;
    const a = seg(t, st, st + 0.35) * (1 - seg(t, en, en + 0.4));
    if (a <= 0 || !s) continue;
    // 底部柔光衬底，保证可读
    ctx.save();
    const g = ctx.createLinearGradient(0, 830, 0, 920);
    g.addColorStop(0, "rgba(5,4,2,0)");
    g.addColorStop(1, "rgba(5,4,2,0.5)");
    ctx.fillStyle = g; ctx.fillRect(0, 830, W, 90);
    ctx.restore();
    txt(ctx, s, W / 2, 890, {
      size: 37, weight: 600, color: C.cream, alpha: a, ls: 3,
      glow: 8, glowColor: "rgba(0,0,0,0.9)"
    });
  }
}

/* ---------- 总调度 ---------- */
function drawFrame(t) {
  const ctx = CTX;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  bgBase(ctx);

  if (t < TM.s1) drawS0(ctx, t);
  else if (t < TM.s2) drawS1(ctx, t);
  else if (t < TM.s3) drawS2(ctx, t);
  else if (t < TM.s4) drawS3(ctx, t);
  else if (t < TM.s5) drawS4(ctx, t);
  else if (t < TM.s6) drawS5(ctx, t);
  else if (t < TM.s7) drawS6(ctx, t);
  else if (t < TM.s8) drawS7(ctx, t);
  else drawS8(ctx, t);

  drawTopTitle(ctx, t);
  drawTimeline(ctx, t);
  drawSubtitle(ctx, t);

  if (t < TM.s8) drawDust(ctx, t, { alpha: 0.85 });
  drawLightBand(ctx, t, 0.045);
  drawVignette(ctx, (t >= TM.s6 && t < TM.s7) ? 0.16 : 0);
  drawGrain(ctx, Math.round(t * 30), 0.055);

  // 收尾黑场保证（59.2 → 60 全黑）
  const black = seg(t, 59.25, 59.9);
  if (black > 0) {
    ctx.fillStyle = `rgba(3,2,1,${black})`;
    ctx.fillRect(0, 0, W, H);
  }
}

initGrain();
