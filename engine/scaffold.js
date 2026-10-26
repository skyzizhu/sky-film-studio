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
  ctx.save();
  const g = ctx.createLinearGradient(0, 830, 0, 920);
  g.addColorStop(0, "rgba(5,4,2,0)"); g.addColorStop(1, "rgba(5,4,2,0.5)");
  ctx.fillStyle = g; ctx.fillRect(0, 830, W, 90);
  ctx.restore();
  const lines = text.length > 28 ? [text.slice(0, 28), text.slice(28)] : [text];
  lines.forEach((ln, i) => {
    txt(ctx, ln, W / 2, 890 - (lines.length - 1 - i) * 46, {
      size: 37, weight: 600, alpha: a, ls: 3, glow: 8, glowColor: "rgba(0,0,0,0.9)"
    });
  });
}

function drawTopTitle(ctx, t) {
  if (!FILM_META.title) return;
  const at = (FILM_META.chrome && FILM_META.chrome.titleAt) || 1.7;
  const fadeOut = (FILM_META.chrome && FILM_META.chrome.titleFade) || 1e9;
  const a = seg(t, at, at + 0.45) * (1 - seg(t, fadeOut, fadeOut + 1.2));
  if (a <= 0) return;
  txt(ctx, FILM_META.title, W / 2, 66, { size: 30, weight: TH.fonts.titleWeight || 600, ls: 10, alpha: a, glow: 10 });
  rule(ctx, 320, W / 2 - 480, 66, 0.4 * a, 1.4);
  rule(ctx, W / 2 + 480, 1600, 66, 0.4 * a, 1.4);
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
    if (fn) fn(ctx, t, t - beat.start, beat);
  }

  drawTopTitle(ctx, t);
  if (window.FILM && window.FILM.timeline) timelineN(ctx, t, window.FILM.timeline);
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
