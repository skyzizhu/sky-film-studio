// Generated from renderer sources; rebuild after edits.
// =====================================================================
// 渲染引擎 · ink（水墨）—— fBm 噪声山脊 + 墨晕扩散 + 宣纸纤维 + 竖排书法
// 与 history 主题的区别：history 只是换色板；ink 换了整个"画画方式"。
// =====================================================================
"use strict";
(() => {
  // fBm 噪声（分形布朗运动，种子固定）
  const _perm = new Uint8Array(512);
  (() => { const r = mulberry32(8888); for (let i = 0; i < 256; i++) _perm[i] = _perm[i + 256] = Math.floor(r() * 256); })();
  function noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const aa = _perm[_perm[X] + Y], ab = _perm[_perm[X] + Y + 1];
    const ba = _perm[_perm[X + 1] + Y], bb = _perm[_perm[X + 1] + Y + 1];
    const x1 = aa + (ba - aa) * u, x2 = ab + (bb - ab) * u;
    return (x1 + (x2 - x1) * v) / 127.5 - 1;
  }
  function fbm(x, y, oct) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < (oct || 4); i++) { v += a * noise2(x * f, y * f); a *= 0.5; f *= 2; }
    return v;
  }

  // 宣纸纤维底（缓存）
  let _paper = null;
  function paperTexture(ctx, W, H) {
    if (_paper && _paper.width === W && _paper.height === H) { ctx.drawImage(_paper, 0, 0); return; }
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const b = c.getContext("2d");
    const g = b.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#ece4d0"); g.addColorStop(0.5, "#f4eeda"); g.addColorStop(1, "#e8dfc8");
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    // 纤维
    const rnd = mulberry32(77);
    b.strokeStyle = "rgba(180,165,130,0.08)"; b.lineWidth = 0.7;
    for (let i = 0; i < 300; i++) {
      const x = rnd() * W, y = rnd() * H, len = 8 + rnd() * 30, ang = rnd() * Math.PI;
      b.beginPath(); b.moveTo(x, y);
      b.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      b.stroke();
    }
    // 斑驳
    for (let i = 0; i < 40; i++) {
      const x = rnd() * W, y = rnd() * H, r = 20 + rnd() * 80;
      const gg = b.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, "rgba(200,185,150,0.04)");
      gg.addColorStop(1, "rgba(200,185,150,0)");
      b.fillStyle = gg; b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill();
    }
    _paper = c;
    ctx.drawImage(_paper, 0, 0);
  }

  // fBm 山脊（多条平行山脊线，浓淡渐变）
  function mountainRidge(ctx, t, W, H, cfg) {
    const layers = cfg.layers || 3;
    for (let L = 0; L < layers; L++) {
      const depth = L / layers;                 // 0=近（浓）→ 1=远（淡）
      const alpha = 0.16 - depth * 0.10;
      const yOffset = H * (0.72 + depth * 0.10);
      const amp = H * (0.035 - depth * 0.015);
      const freq = 0.003 + depth * 0.002;
      const speed = 0.02 + depth * 0.01;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const y = yOffset + fbm(x * freq + t * speed + L * 10, L * 5, 4) * amp * 2 - amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      // 墨色浓淡
      const ink = Math.round(30 + depth * 40);
      ctx.fillStyle = `rgba(${ink},${ink - 5},${ink - 12},${alpha})`;
      ctx.fill();
      // 山脊线
      ctx.strokeStyle = `rgba(${ink - 15},${ink - 10},${ink - 20},${alpha * 0.6})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // 墨晕扩散（替代逐笔描出的诞生动画）
  function inkDiffuse(ctx, t, l, cfg) {
    const u = MO.seg(l, cfg.at || 0, (cfg.at || 0) + (cfg.dur || 1.2));
    if (u <= 0) return;
    const p = PAL();
    const x = cfg.x, y = cfg.y, r = cfg.r || 80;
    // 多层墨晕
    for (let i = 0; i < 3; i++) {
      const e = MO.outCubic(MO.clamp01((u - i * 0.12) / 0.7));
      if (e <= 0) continue;
      const rr = r * e * (1 + i * 0.3);
      const a = (1 - e) * 0.25 + 0.05;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      const ink = 25 + i * 15;
      g.addColorStop(0, `rgba(${ink},${ink - 5},${ink - 12},${a})`);
      g.addColorStop(0.7, `rgba(${ink},${ink - 5},${ink - 12},${a * 0.5})`);
      g.addColorStop(1, `rgba(${ink},${ink - 5},${ink - 12},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 红印章（水墨中唯一饱和色）
  function redSeal(ctx, t, l, cfg) {
    const u = MO.seg(l, cfg.at || 0, (cfg.at || 0) + 0.4);
    if (u <= 0) return;
    const x = cfg.x, y = cfg.y, s = cfg.s || 1;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.globalAlpha = MO.outBack(u) * 0.92;
    ctx.strokeStyle = "#c02818"; ctx.lineWidth = 4;
    ctx.strokeRect(-32, -32, 64, 64);
    ctx.fillStyle = "#c02818";
    ctx.font = FONT(700, 34);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.fillText(cfg.text || "印", 0, 2);
    ctx.restore();
  }

  window.RENDERERS = window.RENDERERS || {};
  window.RENDERERS.ink = {
    // 宣纸底 + 远山 + 红日
    bg(ctx, t, W, H) {
      paperTexture(ctx, W, H);
      // 远山（fBm 噪声，随时间缓慢流动）
      mountainRidge(ctx, t, W, H, { layers: 3 });
      // 红日（左上角）
      const sunA = MO.seg(t, 0, 2);
      if (sunA > 0) {
        ctx.save();
        ctx.globalAlpha = sunA * 0.7;
        const g = ctx.createRadialGradient(W * 0.22, H * 0.18, 0, W * 0.22, H * 0.18, 60);
        g.addColorStop(0, "#d04838"); g.addColorStop(1, "rgba(208,72,56,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(W * 0.22, H * 0.18, 60, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },

    // 实体默认样式：墨色线稿 + 墨晕填充
    entityDefaults() {
      return { color: "rgba(35,28,18,0.85)", flat: false, wobble: 1.4, glow: 0 };
    },

    // 文字默认样式：深墨色，无光晕，衬线
    textDefaults() {
      return { color: "#2a2114", glow: 0 };
    },

    // 无额外后处理（水墨本身就是最终效果）
    post(ctx, t, W, H) { },
    overlay(ctx, t, W, H) {
      // 四角宣纸暗角
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(120,100,60,0.12)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },

    // 音频：古筝 + 太鼓 + 笛
    audio: { instruments: ["pluck", "taiko", "flute"], bpm: 72, mode: "pentatonic" },

    // 主题专属组件
    components: { inkDiffuse, mountainRidge, redSeal, paperTexture, fbm }
  };
})();

// =====================================================================
// 渲染引擎 · pixel（8-bit 像素）—— 240×135 低分辨率 × 8 倍放大 + 步进动画
// =====================================================================
"use strict";
(() => {
  let _low = null;      // 低分辨率离屏 canvas
  let _lowCtx = null;
  let LOW_W = 240, LOW_H = 135;
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
      const targetH=Math.max(1,Math.round(240*H/W));
      if (!_low || LOW_H!==targetH) {
        LOW_H=targetH;
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

// =====================================================================
// 渲染引擎 · glitch（赛博故障）—— RGB 三通道分离 + 横向切片位移 + CRT 扫描线
// =====================================================================
"use strict";
(() => {
  let _frameA = null, _frameB = null, _frameC = null;
  let _faCtx = null, _fbCtx = null, _fcCtx = null;

  function ensureBuffers(W, H) {
    if (!_frameA || _frameA.width !== W || _frameA.height !== H) {
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
      // Reset compositing before copying; previous tint must not multiply the next frame.
      for (const c of [_faCtx,_fbCtx,_fcCtx]) c.globalCompositeOperation='source-over';
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
        ctx.drawImage(ctx.canvas, 0, y, W, Math.min(h2,H-y), dx, y, W, Math.min(h2,H-y));
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

// =====================================================================
// 渲染引擎 · screencast（代码录屏）—— 假 IDE + 语法高亮 + 逐字打字 + 文件树
// 画面就是一块代码编辑器，代码逐字打出，文件树/终端/预览同步切换。
// =====================================================================
"use strict";
(() => {
  // 语法高亮配色
  const SYNTAX = {
    keyword: "#c678dd",   // 紫色：const/let/function/return/if/else
    string: "#98c379",    // 绿色：'...' / "..."
    number: "#d19a66",    // 橙色：123 / 0.5
    comment: "#5c6370",   // 灰色：// ...
    func: "#61afef",      // 蓝色：函数名
    type: "#e5c07b",      // 黄色：类名/类型
    plain: "#abb2bf",     // 默认
    punct: "#7f8c8d",     // 标点
  };

  // 简易语法高亮（逐字符状态机）
  function tokenize(line) {
    const tokens = [];
    let i = 0;
    const kw = /\b(const|let|var|function|return|if|else|for|while|class|new|import|from|export|async|await|try|catch|throw|typeof|interface|type|extends|implements)\b/;
    while (i < line.length) {
      // 注释
      if (line[i] === "/" && line[i + 1] === "/") {
        tokens.push({ text: line.slice(i), color: SYNTAX.comment }); break;
      }
      // 字符串
      if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
        const q = line[i]; let j = i + 1;
        while (j < line.length && line[j] !== q) j++;
        tokens.push({ text: line.slice(i, j + 1), color: SYNTAX.string }); i = j + 1; continue;
      }
      // 数字
      if (/\d/.test(line[i])) {
        let j = i; while (j < line.length && /[\d.]/.test(line[j])) j++;
        tokens.push({ text: line.slice(i, j), color: SYNTAX.number }); i = j; continue;
      }
      // 标识符
      if (/[a-zA-Z_$]/.test(line[i])) {
        let j = i; while (j < line.length && /[a-zA-Z0-9_$.]/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (kw.test(word)) tokens.push({ text: word, color: SYNTAX.keyword });
        else if (line[j] === "(") tokens.push({ text: word, color: SYNTAX.func });
        else if (/^[A-Z]/.test(word)) tokens.push({ text: word, color: SYNTAX.type });
        else tokens.push({ text: word, color: SYNTAX.plain });
        i = j; continue;
      }
      // 标点/空格
      tokens.push({ text: line[i], color: SYNTAX.punct }); i++;
    }
    return tokens;
  }

  // IDE 面板（带侧边文件树 + 主编辑区 + 底部终端）
  function drawIDE(ctx, t, l, cfg) {
    const p = PAL();
    const u = MO.seg(l, cfg.at || 0, (cfg.at || 0) + 0.4);
    if (u <= 0) return;
    const W2 = W, H2 = H;
    const sidebarW = 220;
    const termH = 120;
    // 整体入场
    ctx.save();
    ctx.translate(W2 / 2, H2 / 2);
    ctx.scale(0.96 + u * 0.04, 0.96 + u * 0.04);
    ctx.translate(-W2 / 2, -H2 / 2);
    ctx.globalAlpha = u;

    // 编辑器底色
    ctx.fillStyle = "#1e2127";
    ctx.fillRect(0, 0, W2, H2);

    // === 侧边栏（文件树）===
    ctx.fillStyle = "#181b20";
    ctx.fillRect(0, 0, sidebarW, H2);
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sidebarW, 0); ctx.lineTo(sidebarW, H2); ctx.stroke();
    // 文件树
    ctx.font = MONO(15); ctx.textAlign = "left"; ctx.textBaseline = "middle";
    (cfg.files || ["src/", "  index.js", "  utils.js", "  api.js", "package.json", "README.md"]).forEach((f, i) => {
      const active = f === (cfg.activeFile || "index.js");
      const y = 60 + i * 28;
      if (active) {
        ctx.fillStyle = "rgba(97,175,239,0.12)";
        ctx.fillRect(8, y - 12, sidebarW - 16, 24);
      }
      ctx.fillStyle = active ? "#61afef" : f.includes("/") ? "#848a97" : "#abb2bf";
      ctx.fillText(f, 24, y);
    });

    // === 主编辑区 ===
    const codeX = sidebarW + 30;
    const codeY = 50;
    const lineH = 26;
    // 行号
    ctx.font = MONO(16);
    const codeLines = cfg.code || [];
    codeLines.forEach((line, i) => {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.textAlign = "right";
      ctx.fillText(String(i + 1), sidebarW + 18, codeY + i * lineH);
    });
    // 代码内容（逐行逐字打字）
    const totalChars = codeLines.reduce((a, b) => a + b.length, 0);
    const typeU = MO.seg(l, (cfg.at || 0) + 0.4, (cfg.at || 0) + 0.4 + totalChars / (cfg.cps || 24));
    let charIdx = 0;
    ctx.textAlign = "left";
    codeLines.forEach((line, li) => {
      const tokens = tokenize(line);
      let x = codeX;
      let lineShown = 0;
      const lineStart = charIdx;
      charIdx += line.length;
      const lineVisible = MO.clamp01((typeU * totalChars - lineStart) / Math.max(1, line.length));
      const charsToShow = Math.floor(line.length * lineVisible);
      if (charsToShow <= 0) return;
      for (const tok of tokens) {
        const tokVisible = Math.min(tok.text.length, Math.max(0, charsToShow - lineShown));
        if (tokVisible <= 0) break;
        const text = tok.text.slice(0, tokVisible);
        ctx.fillStyle = tok.color;
        ctx.font = MONO(16);
        ctx.fillText(text, x, codeY + li * lineH);
        x += ctx.measureText(text).width;
        lineShown += tok.text.length;
        if (lineShown >= charsToShow) break;
      }
      // 光标（只在当前行末尾闪烁）
      if (lineVisible > 0 && lineVisible < 1 && Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = "#61afef";
        ctx.fillRect(x + 2, codeY + li * lineH - 9, 8, 18);
      }
    });

    // === 底部终端 ===
    const termY = H2 - termH;
    ctx.fillStyle = "#181b20";
    ctx.fillRect(0, termY, W2, termH);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.moveTo(0, termY); ctx.lineTo(W2, termY); ctx.stroke();
    // 终端文字
    const termLines = cfg.terminal || ["$ node index.js", "✓ Server running on :3000", "✓ Connected to database"];
    termLines.forEach((tl, i) => {
      const tu = MO.seg(l, (cfg.at || 0) + 1.0 + i * 0.3, (cfg.at || 0) + 1.3 + i * 0.3);
      if (tu <= 0) return;
      ctx.font = MONO(15);
      ctx.fillStyle = tl.startsWith("✓") ? "#98c379" : tl.startsWith("$") ? "#61afef" : "#abb2bf";
      ctx.fillText(tl, 20, termY + 30 + i * 24);
    });

    // === 标签栏 ===
    ctx.fillStyle = "#21252b";
    ctx.fillRect(sidebarW, 0, W2 - sidebarW, 36);
    ctx.font = MONO(14);
    ctx.fillStyle = "#61afef";
    ctx.fillText(cfg.activeFile || "index.js", sidebarW + 20, 18);
    ctx.strokeStyle = "#61afef"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sidebarW, 36); ctx.lineTo(sidebarW + 120, 36); ctx.stroke();

    ctx.restore();
  }

  window.RENDERERS = window.RENDERERS || {};
  window.RENDERERS.screencast = {
    // 深色 IDE 底
    bg(ctx, t, W, H) {
      ctx.fillStyle = "#1e2127";
      ctx.fillRect(0, 0, W, H);
    },

    entityDefaults() {
      return { color: "#61afef", flat: false, glow: 5, lw: 3 };
    },

    textDefaults() {
      return { color: "#abb2bf", glow: 0 };
    },

    post(ctx, t, W, H) { },

    overlay(ctx, t, W, H) {
      // 轻微暗角
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.9);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.2)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },

    audio: { instruments: ["keyboard_tick", "lofi_piano"], bpm: 90, mode: "minor" },

    components: { drawIDE, tokenize, SYNTAX }
  };
})();

'use strict';
(() => {
 window.RENDERERS=window.RENDERERS||{};
 window.RENDERERS.blueprint={
  bg(ctx,t,W,H){
   ctx.save();
   ctx.fillStyle=TH.palette.bg0;ctx.fillRect(0,0,W,H);
   const step=Math.max(20,Math.min(W,H)/18);
   for(let layer=0;layer<2;layer++){
    const d=step*(layer?5:1);
    ctx.strokeStyle=layer?'rgba(160,219,236,.14)':'rgba(160,219,236,.05)';ctx.lineWidth=1;
    ctx.beginPath();
    for(let x=0;x<=W;x+=d){ctx.moveTo(x,0);ctx.lineTo(x,H);}
    for(let y=0;y<=H;y+=d){ctx.moveTo(0,y);ctx.lineTo(W,y);}
    ctx.stroke();
   }
   ctx.restore();
  },
  entityDefaults(){return {color:TH.palette.accent,glow:0};},
  textDefaults(){return {color:TH.palette.cream,glow:0};},
  audio:{instruments:['fm_piano'],bpm:96,mode:'minor'}
 };
})();

'use strict';
(() => {
 window.RENDERERS=window.RENDERERS||{};
 window.RENDERERS.museum={
  bg(ctx,t,W,H){
   ctx.save();ctx.fillStyle=TH.palette.bg0;ctx.fillRect(0,0,W,H);
   const g=ctx.createRadialGradient(W*.66,H*.4,0,W*.6,H*.45,Math.max(W,H)*.75);
   g.addColorStop(0,TH.palette.bg1);g.addColorStop(1,TH.palette.bg0);
   ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   // Quiet display plane, kept behind the objects and caption layer.
   ctx.strokeStyle='rgba(220,206,173,.09)';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(W*.07,H*.81);ctx.lineTo(W*.93,H*.81);ctx.stroke();
   ctx.restore();
  },
  entityDefaults(){return {color:TH.palette.accent,glow:0};},
  textDefaults(){return {color:TH.palette.cream,glow:0};},
  audio:{instruments:['guzheng','taiko'],bpm:76,mode:'pentatonic'}
 };
})();


'use strict';
(() => {
 window.RENDERERS=window.RENDERERS||{};
 window.RENDERERS.archive={
  bg(ctx,t,W,H){
   ctx.save();ctx.fillStyle=TH.palette.bg0;ctx.fillRect(0,0,W,H);
   const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,TH.palette.bg1);g.addColorStop(1,TH.palette.bg0);
   ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   ctx.strokeStyle='rgba(222,196,150,.12)';ctx.lineWidth=1;
   ctx.strokeRect(W*.025,H*.025,W*.95,H*.95);
   ctx.beginPath();ctx.moveTo(W*.065,H*.13);ctx.lineTo(W*.935,H*.13);ctx.stroke();ctx.restore();
  },
  entityDefaults(){return {color:TH.palette.accent,glow:0};},
  textDefaults(){return {color:TH.palette.cream,glow:0};}
 };
})();
