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
  const response = await fetch("film.json");
  if (!response.ok) throw new Error("film.json 加载失败");
  FILM_META = await response.json();
  const themeKey = FILM_META.theme || window.FILM?.theme || "default";
  TH = window.THEMES[themeKey];
  if (!TH) throw new Error(`未知主题 ${themeKey}`);
  if (window.Renderer) Renderer.init(FILM_META);
  // 任意比例：画布尺寸由 film.json 决定
  {
    const cv = document.getElementById("c");
    W = Math.max(320, FILM_META.width || 1920);
    H = Math.max(320, FILM_META.height || 1080);
    cv.width = W; cv.height = H;
    cv.style.width = W + "px"; cv.style.height = H + "px";
  }
  const cuesPath = FILM_META.voice?.cues;
  if (cuesPath) {
    const response = await fetch(cuesPath);
    if (!response.ok) throw new Error(`cues 加载失败 ${cuesPath}`);
    CUES = await response.json();
  }
  if (window.__fontsReady) await window.__fontsReady;
  await document.fonts.ready;
  if (window.__assetsReady) await window.__assetsReady;
  if (window.initIcons) initIcons();   // 图标路径采样（确定性）
  for (const beat of FILM_META.beats || [])
    if (typeof window.FILM?.scenes?.[beat.scene] !== "function")
      throw new Error(`未定义场景 ${beat.scene}`);
  window.SUBTITLE_LAYOUT = makeSubtitleLayout(CTX, CUES?.sentences ||
    (FILM_META.subtitles || []).map(([start,end,text])=>({start,end,text})));
  if (window.preloadSVGIcons) await preloadSVGIcons();
  window.__ready = true;
}

// ---------- 字幕（cues 驱动；无 cues 用 film.json.subtitles [start,end,text]） ----------
function makeSubtitleLayout(ctx, sentences) {
  const size = Math.min(37, Math.max(20, W*.035));
  const spacing = 2;
  ctx.save(); ctx.font = FONT(600,size);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  const width = W-Math.max(80,W*.08);
  const layout = [];
  for (const sentence of sentences) {
    const chars = Array.from(sentence.text || "");
    if (!chars.length) continue;
    const lines = []; let line = "";
    for (const ch of chars) {
      if (ch === "\n") { lines.push(line); line=""; continue; }
      const next = line+ch;
      if (line && ctx.measureText(next).width + Array.from(next).length*spacing > width) {
        lines.push(line); line=ch;
      } else line=next;
    }
    if (line) lines.push(line);
    const pages = [];
    for (let i=0;i<lines.length;i+=2) pages.push(lines.slice(i,i+2));
    const total = pages.reduce((sum,lines)=>sum+lines.join("").length,0);
    let offset = 0;
    pages.forEach((lines,i)=>{
      const count = lines.join("").length;
      const start = sentence.start+(sentence.end-sentence.start)*offset/total;
      offset += count;
      const end = i===pages.length-1 ? sentence.end : sentence.start+(sentence.end-sentence.start)*offset/total;
      layout.push({start,end,lines,size,spacing,chars:count,
        cps: count/Math.max(.001,end-start)});
    });
  }
  ctx.restore();
  return layout;
}

function drawSubtitle(ctx,t) {
  const page = window.SUBTITLE_LAYOUT.find(q=>t>=q.start && t<q.end);
  if (!page) return;
  const fade = Math.min(.1,(page.end-page.start)/4);
  const a = seg(t,page.start,page.start+fade)*(1-seg(t,page.end-fade,page.end));
  const beat = (FILM_META.beats || []).find(b=>t>=b.start && t<b.end);
  const explicitY = beat?.subtitleY ?? FILM_META.subtitleY;
  const subY = Number.isFinite(explicitY) ? explicitY :
    (window.FILM?.timeline || progressOn() ? H-160 : H-92);
  page.lines.forEach((line,i)=>{
    const y = subY-(page.lines.length-1-i)*page.size*1.25;
    const options = {size:page.size,weight:600,alpha:a,ls:page.spacing};
    if (!TH.light) txt(ctx,line,W/2,y,{...options,glow:10,glowColor:"rgba(0,0,0,0.95)"});
    txt(ctx,line,W/2,y,options);
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
  if (ctx.reset) ctx.reset();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  const _rnd = window.Renderer && Renderer.current;
  if (_rnd) {
    Renderer.bg(ctx, t, W, H, () => bgBase(ctx));
  } else {
    bgBase(ctx);
    const decorFn = (window.DECOR || {})[TH.key];
    if (decorFn && FILM_META.decor !== false) decorFn(ctx, t);
  }

  // 回声字：钩子拍和关键拍的背景漂移轮廓字（v8 视觉纵深核心）
  if (window.echoText && FILM_META.echo !== false) {
    const beats2 = (FILM_META.beats || []);
    let cur2 = null;
    for (const b of beats2) if (t >= b.start) cur2 = b;
    if (cur2 && cur2.echoText) {
      echoText(ctx, t, { text: cur2.echoText, size: cur2.echoSize || 500,
        x: cur2.echoX ?? W * 0.75, y: cur2.echoY ?? H * 0.35,
        alpha: 0.035, phase: cur2.start });
    }
  }
  if (window.Renderer) Renderer.begin(ctx,t,W,H);
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

  // 拍首转场（film.json wipe: true|bands/ink/bar/scan；盖场景不盖字幕）
  if (FILM_META.wipe && window.beatWipe && beats.length) {
    let cur = null;
    for (const b of beats) if (t >= b.start) cur = b;
    if (cur && cur !== beats[0] && t - cur.start < 0.6) {
      const def = { history: "ink", code: "scan", news: "bar", finance: "bar", tech: "bands", default: "bands" }[TH.key] || "bands";
      beatWipe(ctx, t, t - cur.start, { at: 0, dur: 0.5, mode: FILM_META.wipe === true ? def : FILM_META.wipe });
    }
  }
  if (window.Renderer) Renderer.post(ctx, t, W, H);
  if (window.FILM && window.FILM.frame) window.FILM.frame(ctx, t);   // 装饰边框（chrome 层，不随 punch 缩放）
  drawTopTitle(ctx, t);
  if (window.FILM && window.FILM.timeline) timelineN(ctx, t, window.FILM.timeline);
  else if (progressOn()) drawProgressRail(ctx, t);   // progress:false（情绪/故事/金句型）不画轨，字幕自动贴底
  drawSubtitle(ctx, t);

  drawDust(ctx, t, { alpha: 0.85 });
  drawLightBand(ctx, t, TH.lightBand ?? 0.045);
  drawVignette(ctx, window.FILM && window.FILM.vignetteExtra ? window.FILM.vignetteExtra(t) : 0);
  if (!_rnd || !_rnd.post) drawGrain(ctx, Math.round(t * (FILM_META.fps || 30)), TH.grain ?? 0.055);
  if (window.Renderer) Renderer.overlay(ctx, t, W, H);

  const ef = FILM_META.ending_fade;
  if (ef) {
    const black = seg(t, ef[0], ef[1]);
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

bootScaffold().catch(error=>{ window.__bootError=error.message; console.error(error); });
