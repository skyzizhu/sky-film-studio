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
    return x1 + (x2 - x1) * v;
  }
  function fbm(x, y, oct) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < (oct || 4); i++) { v += a * noise2(x * f, y * f); a *= 0.5; f *= 2; }
    return v;
  }

  // 宣纸纤维底（缓存）
  let _paper = null;
  function paperTexture(ctx, W, H) {
    if (_paper) { ctx.drawImage(_paper, 0, 0); return; }
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
      const alpha = 0.85 - depth * 0.65;
      const yOffset = H * (0.30 + depth * 0.18);
      const amp = 60 - depth * 30;
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
