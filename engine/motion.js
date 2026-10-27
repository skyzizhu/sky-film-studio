// =====================================================================
// sky-film-studio · engine/motion.js —— 运动原语库（全部纯函数、确定性）
// 借鉴：manim smooth / 欠阻尼弹簧 / Apple emphasized / 预备动作 / 脉冲节奏
// 用法：先 loadMotion() 或直接用 window.MO（本文件直接挂 window.MO）
// =====================================================================
"use strict";
window.MO = (() => {
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const seg = (t, a, b) => clamp01((t - a) / (b - a));

  // ---------- 缓动 ----------
  const outExpo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
  const inExpo = x => x <= 0 ? 0 : Math.pow(2, 10 * (x - 1));
  const outCubic = x => 1 - Math.pow(1 - x, 3);
  const inCubic = x => x * x * x;
  const inOutCubic = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const outBack = (x, s = 1.9) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  // manim smooth：6t⁵ − 15t⁴ + 10t³
  const smooth = x => x * x * x * (x * (x * 6 - 15) + 10);
  // Apple emphasized ≈ cubic-bezier(0.2, 0, 0, 1)（牛顿迭代 8 次，确定性）
  function bezier(p1x, p1y, p2x, p2y) {
    const cx = (t, a, b) => 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;
    return x => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const nx = cx(t, p1x, p2x) - x;
        const d = cx(t + 1e-4, p1x, p2x) - cx(t - 1e-4, p1x, p2x);
        if (Math.abs(d) < 1e-6) break;
        t -= nx / (d / 2e-4);
      }
      return cx(clamp01(t), p1y, p2y);
    };
  }
  const appleOut = bezier(0.2, 0, 0, 1);
  // 欠阻尼弹簧：1 − e^(−decay·t)·cos(2π·freq·t)，带过冲（y5 主词砸入用 freq 2.2 / decay 10）
  function spring(t, freq = 2.2, decay = 10) {
    if (t <= 0) return 0;
    return 1 - Math.exp(-decay * t) * Math.cos(2 * Math.PI * freq * t);
  }
  const thereAndBack = x => Math.sin(Math.PI * x);
  const wiggle = (t, freq = 2, amp = 1) => amp * Math.sin(2 * Math.PI * freq * t);

  // ---------- 编排工具 ----------
  const step12 = x => Math.floor(x * 12) / 12;                    // 12fps 步进（拼贴质感）
  const lag = (u, i, gap, n) => clamp01((u - i * gap) / Math.max(0.001, 1 - gap * (n - 1)));  // stagger 项进度
  // 拍点微冲：整屏每拍放大 1.2%，e^(−25t) 衰减（画面跟着鼓呼吸）
  const beatKick = (t, bpm, k = 0.012) => 1 + k * Math.exp(-25 * ((t % (60 / bpm))));

  // ---------- 脉冲节奏（停 → 快动 → 停；禁匀速慢推） ----------
  // 快推：0.28s 内 zoom 1→1+k 后停住
  const punch = (t, at, dur = 0.28, k = 0.25) => 1 + k * outExpo(seg(t, at, at + dur));
  // 同倍率横移：0.30s 从 dx 推到 0 后停
  const pan = (t, at, dx = 300, dur = 0.3) => dx * (1 - outExpo(seg(t, at, at + dur)));
  // 砸入缩放曲线：1.55 → 0.94 → 1.0（0.17s）
  function slamS(t, at, dur = 0.17) {
    const u = seg(t, at, at + dur);
    if (u <= 0) return 1.55;
    if (u < 0.6) return 1.55 + (0.94 - 1.55) * inCubic(u / 0.6);
    return 0.94 + (1 - 0.94) * outBack((u - 0.6) / 0.4, 2.2);
  }
  const slamSReady = (t, at, dur = 0.17) => t >= at + dur;        // 砸完了吗
  // 震镜：衰减双频
  function shake(t, at, dur = 0.3, amp = 10) {
    const u = seg(t, at, at + dur);
    if (u <= 0 || u >= 1) return { x: 0, y: 0 };
    const e = Math.exp(-6 * u) * amp;
    return { x: Math.sin(t * 88) * e, y: Math.cos(t * 96) * e * 0.7 };
  }
  // 预备动作：主动作前 0.1s 反向 5%，再 spring 冲出（"要发生了，准备好"）
  function antic(t, at, dur = 0.45, k = 0.05) {
    const aDur = Math.min(0.12, dur * 0.25);
    if (t < at) return 0;
    if (t < at + aDur) return -k * outCubic(seg(t, at, at + aDur));
    return -k + (1 + k) * spring((t - at - aDur) * 1.6);
  }
  // 退场统一语言：比入场快（inExpo 0.18s），缩 0.6 下落 60px；i 错开 0.03s
  function exitFx(t, at, i = 0, dur = 0.18, gap = 0.03) {
    const u = seg(t, at + i * gap, at + i * gap + dur);
    if (u <= 0) return { on: true, alpha: 1, dy: 0, scale: 1 };
    if (u >= 1) return { on: false, alpha: 0, dy: 60, scale: 0.6 };
    return { on: true, alpha: 1 - inExpo(u), dy: 60 * inExpo(u), scale: 1 - 0.4 * inExpo(u) };
  }
  // 落定脉冲：元素落地那一下的轻微放大回弹（数字落定、节点点亮）
  const land = (t, at, k = 0.14, dur = 0.35) => 1 + k * Math.exp(-9 * Math.max(0, t - at)) * (t >= at ? Math.sin(Math.PI * Math.min(1, (t - at) / dur)) : 0);

  // 关键词钉住：强调拍放大到 1.35 并停住
  const pin = (t, at, k = 1.35, dur = 0.3) => 1 + (k - 1) * outBack(seg(t, at, at + dur), 1.4);

  return { clamp01, seg, outExpo, inExpo, outCubic, inCubic, inOutCubic, outBack, smooth, bezier, appleOut,
           spring, thereAndBack, wiggle, step12, lag, beatKick,
           punch, pan, slamS, slamSReady, shake, antic, exitFx, land, pin };
})();
