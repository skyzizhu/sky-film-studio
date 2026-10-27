// =====================================================================
// 渲染引擎 · glitch（赛博故障）—— RGB 三通道分离 + 横向切片位移 + CRT 扫描线
// =====================================================================
"use strict";
(() => {
  let _frameA = null, _frameB = null, _frameC = null;
  let _faCtx = null, _fbCtx = null, _fcCtx = null;

  function ensureBuffers(W, H) {
    if (!_frameA) {
      _frameA = document.createElement("canvas"); _frameA.width = W; _frameA.height = H;
      _frameB = document.createElement("canvas"); _frameB.width = W; _frameB.height = H;
      _frameC = document.createElement("canvas"); _frameC.width = W; _frameC.height = H;
      _faCtx = _frameA.getContext("2d");
      _fbCtx = _frameB.getContext("2d");
      _fcCtx = _frameC.getContext("2d");
    }
  }

  window.RENDERERS = window.RENDERERS || {};
  window.RENDERERS.glitch = {
    // 霓虹底色
    bg(ctx, t, W, H) {
      ctx.fillStyle = "#08000f";
      ctx.fillRect(0, 0, W, H);
      // 透视网格（远近扫描线）
      const horizon = H * 0.45;
      ctx.strokeStyle = "rgba(255,0,128,0.15)"; ctx.lineWidth = 1;
      // 横线（越远越密）
      for (let i = 0; i < 20; i++) {
        const y = horizon + Math.pow(i / 20, 2) * (H - horizon);
        ctx.globalAlpha = 0.15 + (i / 20) * 0.2;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      // 纵线（从消失点放射）
      ctx.globalAlpha = 0.08;
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + i * 30, horizon);
        ctx.lineTo(W / 2 + i * 200, H);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // 太阳（条纹霓虹）
      const sunY = H * 0.35;
      const sunR = 120;
      for (let y = 0; y < sunR * 2; y += 8) {
        const w = Math.sqrt(sunR * sunR - (y - sunR) * (y - sunR)) * 2;
        if (w > 0) {
          ctx.fillStyle = `rgba(255,${80 + Math.sin(y * 0.1) * 40},128,${0.3 - y / (sunR * 2) / 6})`;
          ctx.fillRect(W / 2 - w / 2, sunY - sunR + y, w, 4);
        }
      }
    },

    entityDefaults() {
      return { color: "#00ffee", flat: true, glow: 15, lw: 3 };
    },

    textDefaults() {
      return { color: "#00ffee", glow: 20 };
    },

    // RGB 三通道分离 + 切片位移
    post(ctx, t, W, H) {
      ensureBuffers(W, H);
      // 复制当前帧到三个缓冲区
      _faCtx.clearRect(0, 0, W, H); _faCtx.drawImage(ctx.canvas, 0, 0);
      _fbCtx.clearRect(0, 0, W, H); _fbCtx.drawImage(ctx.canvas, 0, 0);
      _fcCtx.clearRect(0, 0, W, H); _fcCtx.drawImage(ctx.canvas, 0, 0);

      // 故障量（脉冲式，大部分时间轻微，拍点爆发）
      const burst = (Math.floor(t * 2) % 4 === 0 ? 6 : 2) + Math.sin(t * 8) * 2;
      const off = burst;

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.clearRect(0, 0, W, H);
      // R 通道（左偏）
      ctx.globalAlpha = 0.8;
      _faCtx.globalCompositeOperation = "multiply";
      _faCtx.fillStyle = "#ff0000"; _faCtx.fillRect(0, 0, W, H);
      ctx.drawImage(_frameA, -off, 0);
      // G 通道（原位）
      _fbCtx.globalCompositeOperation = "multiply";
      _fbCtx.fillStyle = "#00ff00"; _fbCtx.fillRect(0, 0, W, H);
      ctx.drawImage(_frameB, 0, 0);
      // B 通道（右偏）
      _fcCtx.globalCompositeOperation = "multiply";
      _fcCtx.fillStyle = "#0000ff"; _fcCtx.fillRect(0, 0, W, H);
      ctx.drawImage(_frameC, off, 0);
      ctx.restore();

      // 横向切片位移（种子随机选几条横带做水平错位）
      const rnd = mulberry32(Math.floor(t * 8));    // 8fps 闪烁
      const sliceCount = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < sliceCount; i++) {
        if (rnd() > 0.4) continue;                   // 不是每帧都故障
        const y = Math.floor(rnd() * H);
        const h2 = 4 + Math.floor(rnd() * 20);
        const dx = (rnd() - 0.5) * off * 6;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, y, W, h2); ctx.clip();
        ctx.drawImage(ctx.canvas, dx, y - y + y, W, h2, 0, y, W, h2);
        ctx.restore();
      }
    },

    // CRT 扫描线 + 紫色暗角
    overlay(ctx, t, W, H) {
      // 扫描线
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "#000";
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
      ctx.restore();
      // 紫色暗角
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
      g.addColorStop(0, "rgba(128,0,255,0)");
      g.addColorStop(1, "rgba(128,0,255,0.12)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },

    // 音频：失真锯齿 + 4/4 底鼓 + 白噪
    audio: { instruments: ["saw_distort", "kick_808", "noise_sweep"], bpm: 128, mode: "minor" },
  };
})();
