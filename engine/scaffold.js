// =====================================================================
// sky-film-studio · engine/scaffold.js —— 影片运行器
// 项目只定义 window.FILM = { theme, title?, timeline?, scenes:{name:(ctx,t,l,beat)=>{}} }
// scaffold：fetch film.json + audio/cues.json → 注入 TH → window.draw(t)
// 场景分发 → 顶栏 / cues 字幕（口播强同步）/ 时间轴 → 底层特效 → 收尾黑场
// =====================================================================
"use strict";

window.__ready = false;
let FILM_META = null, CUES = null, CTX = null;

async function bootScaffold() {
  const canvas = document.getElementById("c");
  CTX = canvas.getContext("2d", { alpha: false });
  initGrain();
  const themeKey = (window.FILM && window.FILM.theme) || "default";
  TH = window.THEMES[themeKey] || window.THEMES.default;
  try { FILM_META = await (await fetch("film.json")).json(); }
  catch (e) {
    FILM_META = (window.FILM && window.FILM.meta) || { duration: 60, fps: 30, beats: [] };
  }
  // 任意比例：画布尺寸由 film.json 决定
  {
    const cv = document.getElementById("c");
    W = Math.max(320, FILM_META.width || 1920);
    H = Math.max(320, FILM_META.height || 1080);
    cv.width = W; cv.height = H;
    cv.style.width = W + "px"; cv.style.height = H + "px";
  }
  try { CUES = await (await fetch("audio/cues.json")).json(); } catch (e) { CUES = null; }
  if (window.__fontsReady) await window.__fontsReady;
  await document.fonts.ready;
  window.__ready = true;
}

// ---------- 字幕（cues 驱动；无 cues 用 film.json.subtitles [start,end,text]） ----------
function drawSubtitle(ctx, t) {
  let text = null, a = 0;
  if (CUES && CUES.sentences) {
    const s = CUES.sentences.find(q => t >= q.start - 0.05 && t <= q.end + 0.25);
    if (s) {
      text = s.text;
      a = seg(t, s.start - 0.05, s.start + 0.15) * (1 - seg(t, s.end + 0.05, s.end + 0.25));
    }
  } else if (FILM_META.subtitles) {
    const s = FILM_META.subtitles.find(q => t >= q[0] && t <= q[1]);
    if (s) text = s[2], a = seg(t, s[0], s[0] + 0.3) * (1 - seg(t, s[1] - 0.3, s[1]));
  }
  if (!text || a <= 0) return;
  // 每行字数随画幅自适应；最多 3 行；字幕区锚定画布底部
  const cpl = Math.max(12, Math.min(28, Math.floor((W - 140) / 39)));
  const lines = [];
  for (let i = 0; i < text.length && lines.length < 3; i += cpl) lines.push(text.slice(i, i + cpl));
  const subY = (window.FILM && window.FILM.timeline) || progressOn() ? H - 160 : H - 92;   // 底部无轨/轴时字幕贴底补位
  const topY = subY - (lines.length - 1) * 46;
  ctx.save();
  const g = ctx.createLinearGradient(0, topY - 56, 0, topY + 34);
  g.addColorStop(0, "rgba(5,4,2,0)"); g.addColorStop(1, "rgba(5,4,2,0.5)");
  ctx.fillStyle = g; ctx.fillRect(0, topY - 56, W, 90);
  ctx.restore();
  lines.forEach((ln, i) => {
    txt(ctx, ln, W / 2, subY - (lines.length - 1 - i) * 46, {
      size: 37, weight: 600, alpha: a, ls: 3, glow: 8, glowColor: "rgba(0,0,0,0.9)"
    });
  });
}

// ---------- 底部占用判定：timeline > 进度轨 > 字幕贴底 ----------
function progressOn() {
  if (window.FILM && window.FILM.timeline) return false;
  if (FILM_META.progress === true) return true;
  if (FILM_META.progress === false) return false;
  return (FILM_META.duration || 60) >= 50 && (FILM_META.beats || []).length >= 5;
}

// ---------- 进度轨：拍刻度 + 进度 + 游标 ----------
function drawProgressRail(ctx, t) {
  const p = PAL();
  const dur = FILM_META.duration || 60;
  const a = seg(t, 1.5, 2.0) * (1 - seg(t, dur - 2.2, dur - 1.2));
  if (a <= 0) return;
  const y = H - 76;
  const x0 = Math.round(W * 0.17), x1 = Math.round(W * 0.83);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = hexA(p.cream, 0.14); ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, p.accentDeep); g.addColorStop(1, p.accentHi);
  ctx.strokeStyle = g; ctx.lineWidth = 3.5;
  const fx = x0 + (x1 - x0) * clamp01(t / dur);
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(fx, y); ctx.stroke();
  ctx.lineWidth = 1.6;
  for (const b of (FILM_META.beats || [])) {
    const bx = x0 + (x1 - x0) * clamp01(b.start / dur);
    ctx.strokeStyle = t >= b.start ? hexA(p.accent, 0.75) : hexA(p.cream, 0.22);
    ctx.beginPath(); ctx.moveTo(bx, y - 7); ctx.lineTo(bx, y + 7); ctx.stroke();
  }
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = hexA(p.accentHi, 0.9);
  ctx.beginPath(); ctx.arc(fx, y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawTopTitle(ctx, t) {
  if (!FILM_META.title) return;
  const at = (FILM_META.chrome && FILM_META.chrome.titleAt) || 1.7;
  const fadeOut = (FILM_META.chrome && FILM_META.chrome.titleFade) || 1e9;
  const a = seg(t, at, at + 0.45) * (1 - seg(t, fadeOut, fadeOut + 1.2));
  if (a <= 0) return;
  const ftT = fitText(ctx, FILM_META.title, W - 260, 30);
  txt(ctx, ftT.text, W / 2, 66, { size: ftT.size, weight: TH.fonts.titleWeight || 600, ls: 10, alpha: a, glow: 10 });
  rule(ctx, Math.max(110, W / 2 - 580), W / 2 - 440, 66, 0.4 * a, 1.4);
  rule(ctx, W / 2 + 440, Math.min(W - 110, W / 2 + 580), 66, 0.4 * a, 1.4);
}

function drawFrame(t) {
  const ctx = CTX;
  const dur = FILM_META.duration || 60;
  t = Math.max(0, Math.min(t, dur - 1e-3));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  bgBase(ctx);

  const beats = (FILM_META.beats || []).slice().sort((a2, b2) => a2.start - b2.start);
  if (beats.length && window.FILM && window.FILM.scenes) {
    let beat = beats[0];
    for (const b of beats) if (t >= b.start) beat = b;
    const fn = window.FILM.scenes[beat.scene];
    if (fn) {
      // 场景级脉冲：停 → 0.28s 快推 → 停（film.json punches: [[at, dur?, k?]]，可省略）
      let z = 1;
      for (const pu of (FILM_META.punches || []))
        z = Math.max(z, MO.punch(t, pu[0], pu[1] || 0.28, pu[2] || 0.2));
      if (FILM_META.beatKick) z *= MO.beatKick(t, FILM_META.bpm || 100);
      if (z > 1.0005) {
        ctx.save();
        ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
        fn(ctx, t, t - beat.start, beat);
        ctx.restore();
      } else fn(ctx, t, t - beat.start, beat);
    }
  }

  drawTopTitle(ctx, t);
  if (window.FILM && window.FILM.timeline) timelineN(ctx, t, window.FILM.timeline);
  else if (progressOn()) drawProgressRail(ctx, t);   // progress:false（情绪/故事/金句型）不画轨，字幕自动贴底
  drawSubtitle(ctx, t);

  drawDust(ctx, t, { alpha: 0.85 });
  drawLightBand(ctx, t, TH.lightBand ?? 0.045);
  drawVignette(ctx, window.FILM && window.FILM.vignetteExtra ? window.FILM.vignetteExtra(t) : 0);
  drawGrain(ctx, Math.round(t * 30), TH.grain ?? 0.055);

  const ef = FILM_META.ending_fade;
  if (ef) {
    const black = seg(t, Math.max(ef[0], dur - 1.5), Math.min(ef[1], dur));
    if (black > 0) { ctx.fillStyle = `rgba(3,2,1,${black})`; ctx.fillRect(0, 0, W, H); }
  }
}

window.draw = function (t) { if (window.__ready) drawFrame(t); };
window.renderBatch = function (t0, n, dt, q) {
  const out = [];
  for (let i = 0; i < n; i++) {
    drawFrame(t0 + i * dt);
    out.push(document.getElementById("c").toDataURL("image/jpeg", q));
  }
  return out;
};

bootScaffold();
