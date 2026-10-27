// =====================================================================
// sky-film-studio · themes/decor.js —— 主题氛围层（背景层，scaffold 在 bgBase 后调用）
// 每个主题一套专属环境元素，让不同类别文案的画面气质"明显不同"。
// 全部种子化、低对比（背景永远比主角低一档）。
// =====================================================================
"use strict";
window.DECOR = {

  default(ctx, t) { /* 兜底主题不加氛围，靠金尘 */ },

  tech(ctx, t) {                     // 科技：代码雨 + 偶发数据带
    const p = PAL();
    const rnd = mulberry32(4201);
    ctx.save();
    ctx.font = MONO(16);
    ctx.textAlign = "left";
    for (let c = 0; c < 7; c++) {
      const x = 150 + c * 280 + (c % 2) * 60;
      const speed = 26 + rnd() * 40, y0 = rnd() * (H + 200);
      for (let k = 0; k < 9; k++) {
        const y = ((y0 + t * speed + k * 34) % (H + 120)) - 60;
        if (y < 46) continue;                                   // 顶部边缘带留给内容
        const a = 0.05 * (1 - k / 10);
        ctx.fillStyle = hexA(p.cream, a);
        ctx.fillText("01<>{}/;"[(k + c * 3) % 10], x, y);
      }
    }
    const band = (t * 0.12) % 3;
    if (band < 1) {
      ctx.fillStyle = hexA(p.accent, 0.028);
      ctx.fillRect(0, ((t * 40) % (H + 200)) - 100, W, 90);
    }
    ctx.restore();
  },

  history(ctx, t) {                  // 历史：纸纹斑驳 + 四角墨晕
    const p = PAL();
    const rnd = mulberry32(8527);
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const x = 80 + rnd() * (W - 160), y = 80 + rnd() * (H - 160), r = 30 + rnd() * 130;   // 避开 60px 边缘带
      ctx.fillStyle = hexA(p.cream, 0.018 + rnd() * 0.022);
      ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
      const g = ctx.createRadialGradient(cx, cy, 60, cx, cy, 560);
      g.addColorStop(0, "rgba(20,12,6,0.30)");
      g.addColorStop(1, "rgba(20,12,6,0)");
      ctx.fillStyle = g; ctx.fillRect(cx - 560, cy - 560, 1120, 1120);
    }
    ctx.restore();
  },

  news(ctx, t) {                     // 新闻：顶部红色要闻条 + LIVE 呼吸点 + 斜网格
    const p = PAL();
    ctx.save();
    ctx.strokeStyle = hexA(p.cream, 0.03); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -200; x < W + 200; x += 130) { ctx.moveTo(x, 0); ctx.lineTo(x + 300, H); }
    ctx.stroke();
    // 顶红条放 y 8-12（避开 26px 边缘检测带），LIVE 标签同步下移
    ctx.fillStyle = hexA(p.warn, 0.5);
    ctx.fillRect(0, 8, W, 4);
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 2.6);
    ctx.fillStyle = p.warn;
    ctx.beginPath(); ctx.arc(64, 42, 7, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.font = FONT(700, 17); ctx.textAlign = "left";
    ctx.fillStyle = hexA(p.cream, 0.65);
    ctx.fillText("LIVE", 80, 48);
    ctx.restore();
  },

  code(ctx, t) {                     // 技术分享：网格 + 往返扫描亮线
    const p = PAL();
    ctx.save();
    ctx.strokeStyle = hexA(p.accent, 0.05); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 96) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += 96) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    const q = (t * 0.11) % 2, y = (q < 1 ? q : 2 - q) * (H + 160) - 80;
    const g = ctx.createLinearGradient(0, y - 120, 0, y + 40);
    g.addColorStop(0, hexA(p.accent, 0)); g.addColorStop(1, hexA(p.accent, 0.05));
    ctx.fillStyle = g; ctx.fillRect(0, y - 120, W, 160);
    ctx.restore();
  },

  finance(ctx, t) {                  // 财经：网格 + 上行虚线影 + 缓移基线
    const p = PAL();
    ctx.save();
    ctx.strokeStyle = hexA(p.cream, 0.035); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 120) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += 120) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.setLineDash([4, 10]);
    ctx.strokeStyle = hexA(p.accent, 0.10); ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const off = (t * 18 + i * 400) % (W + 500) - 250;
      ctx.beginPath();
      ctx.moveTo(off, H * 0.8 - i * 120);
      ctx.lineTo(off + 240, H * 0.62 - i * 120);
      ctx.lineTo(off + 430, H * 0.70 - i * 120);
      ctx.lineTo(off + 660, H * 0.46 - i * 120);
      ctx.stroke();
    }
    ctx.restore();
  }
};
