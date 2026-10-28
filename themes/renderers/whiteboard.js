// =====================================================================
// 渲染引擎 · whiteboard（手绘白板）—— 浅色底 + 毛边形状 + 手写字体 + 马克笔色
// 这是唯一的浅色主题，视觉上和其他所有主题形成强对比。
// =====================================================================
"use strict";
(() => {
  let _board = null;

  // 白板底（缓存）：白底 + 淡网格 + 板边 + 磁铁
  function boardBg(ctx, W, H) {
    if (_board && _board.width === W && _board.height === H) { ctx.drawImage(_board, 0, 0); return; }
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const b = c.getContext("2d");
    // 白板面
    b.fillStyle = "#f8f6f0"; b.fillRect(0, 0, W, H);
    // 淡网格
    b.strokeStyle = "rgba(180,180,170,0.12)"; b.lineWidth = 1;
    for (let x = 0; x <= W; x += 80) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x, H); b.stroke(); }
    for (let y = 0; y <= H; y += 80) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
    // 板框
    b.strokeStyle = "rgba(120,120,115,0.3)"; b.lineWidth = 3;
    b.strokeRect(15, 15, W - 30, H - 30);
    // 四角磁铁（彩色小圆）
    const magnets = ["#c83828", "#2870c8", "#28a038", "#c88828"];
    magnets.forEach((col, i) => {
      const x = 30 + i * 40, y = 28;
      b.fillStyle = col;
      b.beginPath(); b.arc(x, y, 7, 0, Math.PI * 2); b.fill();
      b.fillStyle = "rgba(255,255,255,0.5)";
      b.beginPath(); b.arc(x - 2, y - 2, 3, 0, Math.PI * 2); b.fill();
    });
    // 笔托
    b.fillStyle = "rgba(120,120,115,0.15)";
    b.fillRect(W - 200, H - 35, 180, 12);
    // 笔
    const penCols = ["#1a1a1a", "#c83828", "#2870c8"];
    penCols.forEach((col, i) => {
      b.save();
      b.translate(W - 180 + i * 25, H - 30);
      b.rotate(-0.1 + i * 0.05);
      b.fillStyle = col;
      b.fillRect(-3, -14, 6, 28);
      b.restore();
    });
    _board = c;
    ctx.drawImage(_board, 0, 0);
  }

  // rough edge（每个顶点随机偏移 ±2px，两次绘制叠加）
  function roughStroke(ctx, pts, cfg) {
    ctx.save();
    const rnd = mulberry32(cfg.seed || 3);
    ctx.strokeStyle = cfg.color || "#1a1a1a";
    ctx.lineWidth = cfg.lw || 3.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // 第一遍（主体）
    ctx.beginPath();
    pts.forEach((p, i) => {
      const jx = (rnd() - 0.5) * 4, jy = (rnd() - 0.5) * 4;
      i === 0 ? ctx.moveTo(p[0] + jx, p[1] + jy) : ctx.lineTo(p[0] + jx, p[1] + jy);
    });
    if (cfg.closed) ctx.closePath();
    ctx.stroke();
    // 第二遍（重叠加强，手绘感）
    if (cfg.double !== false) {
      ctx.globalAlpha *= 0.3;
      ctx.beginPath();
      const rnd2 = mulberry32((cfg.seed || 3) + 100);
      pts.forEach((p, i) => {
        const jx = (rnd2() - 0.5) * 5, jy = (rnd2() - 0.5) * 5;
        i === 0 ? ctx.moveTo(p[0] + jx, p[1] + jy) : ctx.lineTo(p[0] + jx, p[1] + jy);
      });
      if (cfg.closed) ctx.closePath();
      ctx.stroke();

    }
    ctx.restore();
  }

  window.RENDERERS = window.RENDERERS || {};
  window.RENDERERS.whiteboard = {
    // 浅色白板底（和其他所有主题的暗色形成强烈反差）
    bg(ctx, t, W, H) { boardBg(ctx, W, H); },

    entityDefaults() {
      return { color: "#1a1a1a", flat: false, glow: 0, wobble: 1.6, lw: 3.5 };
    },

    textDefaults() {
      return { color: "#1a1a1a", glow: 0 };
    },

    // 无后处理
    post(ctx, t, W, H) { },

    overlay(ctx, t, W, H) {
      // 轻微纸面阴影（四角）
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(100,100,95,0.08)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },

    // 音频：尤克里里 + 马克笔噪声
    audio: { instruments: ["ukulele", "marker_squeak"], bpm: 92, mode: "major" },

    components: { roughStroke, boardBg }
  };
})();
