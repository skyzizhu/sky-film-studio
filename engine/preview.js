// =====================================================================
// sky-film-studio · engine/preview.js —— 预览工作台（render.py --preview 注入）
// 时间轴拖动实时调 window.draw(t)｜播放/暂停｜拍标记+口播 cue 标尺｜点击画面报坐标
// =====================================================================
"use strict";
(function () {
  const boot = () => {
    if (!window.__ready) return setTimeout(boot, 100);
    fetch("film.json").then(r => r.json()).then(FILM => {
      fetch("audio/cues.json").then(r => r.ok ? r.json() : null).catch(() => null).then(CUES => init(FILM, CUES));
    });
  };

  function init(FILM, CUES) {
    const dur = FILM.duration || 60;
    const cv = document.getElementById("c");
    const oldW = cv.width, oldH = cv.height;
    // 画布缩放适配窗口
    const fit = () => {
      const k = Math.min((innerWidth - 40) / oldW, (innerHeight - 130) / oldH, 1);
      cv.style.width = oldW * k + "px"; cv.style.height = oldH * k + "px";
    };
    fit(); addEventListener("resize", fit);

    // ---- UI ----
    const ui = document.createElement("div");
    ui.style.cssText = "position:fixed;left:0;right:0;bottom:0;background:rgba(8,6,4,.94);color:#ede3cd;" +
      "font:13px/1.5 Menlo,monospace;padding:10px 16px 12px;z-index:99;border-top:1px solid rgba(217,180,92,.4)";
    ui.innerHTML = `
      <div id="pv-tl" style="position:relative;height:34px;margin:2px 0 6px;cursor:pointer">
        <div style="position:absolute;inset:14px 0;background:rgba(237,227,205,.14);border-radius:3px"></div>
        <div id="pv-fill" style="position:absolute;left:0;top:14px;height:6px;background:linear-gradient(90deg,#8a6a2a,#f6e3a8);border-radius:3px;width:0"></div>
        <div id="pv-marks"></div>
        <div id="pv-head" style="position:absolute;top:6px;width:2px;height:22px;background:#fff"></div>
      </div>
      <div style="display:flex;gap:14px;align-items:center">
        <button id="pv-play" style="background:#d9b45c;color:#1a1408;border:0;border-radius:5px;padding:3px 14px;font:600 13px Menlo;cursor:pointer">▶ 播放</button>
        <span id="pv-time">0.00 / ${dur.toFixed(2)}s</span>
        <span style="opacity:.55">空格播放/暂停 · 拖动时间轴 · 点击画面取坐标 · ←→ 逐帧(1/30s)</span>
      </div>`;
    document.body.appendChild(ui);
    document.body.style.background = "#0a0805";

    const tl = ui.querySelector("#pv-tl"), fill = ui.querySelector("#pv-fill"),
      head = ui.querySelector("#pv-head"), marks = ui.querySelector("#pv-marks"),
      playBtn = ui.querySelector("#pv-play"), timeEl = ui.querySelector("#pv-time");

    // 拍标记 + cue 标记
    (FILM.beats || []).forEach((b, i) => {
      const m = document.createElement("div");
      m.style.cssText = `position:absolute;top:8px;width:1px;height:20px;background:rgba(217,180,92,.85);left:${b.start / dur * 100}%`;
      m.title = `${b.id} ${b.scene} ${b.start}s–${b.end}s`;
      marks.appendChild(m);
      const lb = document.createElement("div");
      lb.textContent = i;
      lb.style.cssText = `position:absolute;top:-4px;font-size:9px;color:rgba(217,180,92,.8);transform:translateX(-50%);left:${b.start / dur * 100}%`;
      marks.appendChild(lb);
    });
    if (CUES && CUES.sentences) CUES.sentences.forEach(s => {
      const m = document.createElement("div");
      m.style.cssText = `position:absolute;bottom:0;height:6px;width:${Math.max(0.2, (s.end - s.start) / dur * 100)}%;left:${s.start / dur * 100}%;background:rgba(232,120,90,.55);border-radius:2px`;
      m.title = s.text;
      marks.appendChild(m);
    });

    let t = 0, playing = false, last = 0;
    const render1 = () => {
      window.draw(t);
      fill.style.width = t / dur * 100 + "%";
      head.style.left = `calc(${t / dur * 100}% - 1px)`;
      timeEl.textContent = `${t.toFixed(2)} / ${dur.toFixed(2)}s`;
    };
    const loop = (now) => {
      if (playing) {
        t = Math.min(dur - 0.001, t + (now - last) / 1000);
        render1();
        if (t >= dur - 0.002) { playing = false; playBtn.textContent = "▶ 播放"; }
      }
      last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const seek = (e) => {
      const r = tl.getBoundingClientRect();
      t = Math.max(0, Math.min(dur - 0.001, (e.clientX - r.left) / r.width * dur));
      render1();
    };
    let drag = false;
    tl.addEventListener("pointerdown", e => { drag = true; seek(e); });
    addEventListener("pointermove", e => drag && seek(e));
    addEventListener("pointerup", () => drag = false);

    playBtn.onclick = () => { playing = !playing; playBtn.textContent = playing ? "⏸ 暂停" : "▶ 播放"; };
    addEventListener("keydown", e => {
      if (e.code === "Space") { e.preventDefault(); playBtn.click(); }
      if (e.code === "ArrowLeft") { t = Math.max(0, t - 1 / 30); render1(); }
      if (e.code === "ArrowRight") { t = Math.min(dur - 0.001, t + 1 / 30); render1(); }
    });
    // 点击画面取坐标（缩放回画布坐标）
    cv.style.cursor = "crosshair";
    cv.addEventListener("pointerdown", e => {
      const r = cv.getBoundingClientRect();
      const x = Math.round((e.clientX - r.left) / r.width * oldW);
      const y = Math.round((e.clientY - r.top) / r.height * oldH);
      console.log(`[preview] t=${t.toFixed(2)}s 点击坐标 (${x}, ${y}) —— 画布 ${oldW}×${oldH}`);
      timeEl.textContent = `${t.toFixed(2)} / ${dur.toFixed(2)}s  ·  点击 (${x}, ${y})`;
    });
    render1();
    console.log("[preview] 工作台就绪：拍=金色序号线，口播=底部红条；拖动/空格/方向键");
  }
  boot();
})();
