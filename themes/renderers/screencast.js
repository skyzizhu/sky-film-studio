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
