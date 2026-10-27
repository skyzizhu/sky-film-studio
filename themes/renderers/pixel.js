// =====================================================================
// 渲染引擎 · pixel（8-bit 像素）—— 240×135 低分辨率 × 8 倍放大 + 步进动画
// =====================================================================
"use strict";
(() => {
  let _low = null;      // 低分辨率离屏 canvas
  let _lowCtx = null;
  const LOW_W = 240, LOW_H = 135;
  const SCALE = 8;       // 240×8=1920, 135×8=1080

  // 16 色限制调色板（经典 NES/CGA 风）
  const PALETTE = [
    "#0f0f1b", "#1b2a4a", "#3a5ba0", "#6a9fc8",   // 深蓝→浅蓝
    "#2a5a2a", "#4a8a3a", "#8ac842", "#c8f068",   // 绿系
    "#5a2a0f", "#8a4a20", "#c87830", "#f0a848",   // 棕橙系
    "#8a1a1a", "#c83a30", "#f06848", "#f0c898",   // 红系→肉色
  ];

  function nearestPalette(r, g, b) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
      const p = PALETTE[i];
      const pr = parseInt(p.slice(1, 3), 16), pg = parseInt(p.slice(3, 5), 16), pb = parseInt(p.slice(5, 7), 16);
      const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return PALETTE[best];
  }

  // 步进时间（8fps，一拍二）
  function stepTime(t) { return Math.floor(t * 8) / 8; }

  window.RENDERERS = window.RENDERERS || {};
  window.RENDERERS.pixel = {
    // 在低分辨率 canvas 上渲染，然后放大
    begin(ctx, t, W, H) {
      if (!_low) {
        _low = document.createElement("canvas");
        _low.width = LOW_W; _low.height = LOW_H;
        _lowCtx = _low.getContext("2d");
      }
      // 重定向渲染到低分辨率
      window.__pixelSwap = { ctx, lowCtx: _lowCtx, W, H };
      // 不真正 swap（太侵入），而是用后处理实现
    },

    // 像素风底色：纯色 + 星点
    bg(ctx, t, W, H) {
      const st = stepTime(t);
      ctx.fillStyle = "#0f0f1b";
      ctx.fillRect(0, 0, W, H);
      // 星空（步进闪烁）
      const rnd = mulberry32(42);
      for (let i = 0; i < 40; i++) {
        const x = rnd() * W, y = rnd() * H * 0.6;
        const tw = Math.floor(st * 2 + i) % 3 === 0;
        if (tw) {
          ctx.fillStyle = i % 5 === 0 ? "#c8f068" : "#6a9fc8";
          ctx.fillRect(Math.round(x / 8) * 8, Math.round(y / 8) * 8, 8, 8);
        }
      }
    },

    // 实体样式：粗线、无光晕、无渐变、步进
    entityDefaults() {
      return { flat: false, glow: 0, wobble: 0, lw: 6 };
    },

    textDefaults() {
      return { glow: 0, weight: 700 };
    },

    // 后处理：降采样到低分辨率再放大（像素化）+ 调色板量化
    post(ctx, t, W, H) {
      if (!_low) return;
      // 1) 把当前帧画到低分辨率 canvas
      _lowCtx.clearRect(0, 0, LOW_W, LOW_H);
      _lowCtx.drawImage(ctx.canvas, 0, 0, LOW_W, LOW_H);
      // 2) 调色板量化
      const img = _lowCtx.getImageData(0, 0, LOW_W, LOW_H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) { d[i + 3] = 0; continue; }   // 透明截断
        const c = nearestPalette(d[i], d[i + 1], d[i + 2]);
        d[i] = parseInt(c.slice(1, 3), 16);
        d[i + 1] = parseInt(c.slice(3, 5), 16);
        d[i + 2] = parseInt(c.slice(5, 7), 16);
        d[i + 3] = 255;
      }
      _lowCtx.putImageData(img, 0, 0);
      // 3) 放大回原尺寸（pixelated）
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(_low, 0, 0, W, H);
      ctx.restore();
    },

    overlay(ctx, t, W, H) {
      // 无额外覆盖（像素化本身就是最终效果）
    },

    // 音频：chiptune（方波 + 噪声）
    audio: { instruments: ["chiptune_square", "chiptune_noise"], bpm: 130, mode: "minor" },

    components: { stepTime, PALETTE, nearestPalette }
  };
})();
