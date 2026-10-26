// =====================================================================
// sky-film-studio · components/textfx.js —— 文字动效库
// 借鉴 y5 动态文字语法：主词砸入 / 槽里升起 / 打字机 / 逐字浮出 /
// 荧光笔·下划线·圈注·钉住；退场统一语言（快、加速、错开）。
// 规则内置：一屏一个焦点、主词 ≤4 字、字落定后不动、停留 ≥0.5s。
// =====================================================================
"use strict";

/* 主词砸入：1.7→1 弹簧（过冲 8%），首 0.06s 淡入；可带 hl 联动荧光笔
   cfg: { text, x, y, size, at, weight=700, gold?, color?, ls=6, dur=0.35, pinAt?, align } */
function kineticWord(ctx, t, l, cfg) {
  const p = PAL();
  const u = MO.seg(l, cfg.at, cfg.at + (cfg.dur || 0.35));
  if (u <= 0) return;
  const sp = MO.spring(u * (cfg.dur || 0.35), 2.2, 10);
  const sc = 1.7 - 0.7 * Math.min(1.15, Math.max(0, sp));       // 1.7 → 1（允许过冲到 ~0.93）
  const alpha = MO.seg(l, cfg.at, cfg.at + 0.06);
  const pinSc = cfg.pinAt !== undefined ? MO.pin(l, cfg.pinAt) : 1;
  ctx.save();
  ctx.translate(cfg.x, cfg.y);
  ctx.scale(sc * pinSc, sc * pinSc);
  txt(ctx, cfg.text, 0, 0, {
    size: cfg.size, weight: cfg.weight || 700, ls: cfg.ls ?? 6,
    gradient: !!cfg.gold, color: cfg.gold ? p.accentHi : cfg.color,
    alpha, glow: cfg.gold ? 22 : 14, align: cfg.align || "center", baseline: cfg.baseline || "alphabetic"
  });
  ctx.restore();
}

/* 槽里升起：文字在基线遮罩里从 +1.2em 推上来（高级感默认入场）
   cfg: { text, x, y, size, at, dur=0.32, stagger=0.06, per: "line"|"char", align, color, weight, ls }
   多行用 \n 分隔；per=char 逐字错开 */ 
function textRise(ctx, t, l, cfg) {
  const p = PAL();
  const lines = String(cfg.text).split("\n");
  const size = cfg.size || 40;
  if (cfg.per === "char") {
    // 逐字模式：整行作为一个槽，字符在槽内横向排布并逐个升起
    let idx = 0;
    lines.forEach((ln, li) => {
      const chars = [...ln];
      ctx.save();
      ctx.font = FONT(cfg.weight || 600, size);
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${cfg.ls || 0}px`;
      const total = chars.reduce((w2, c) => w2 + ctx.measureText(c).width + (cfg.ls || 0), 0) - (cfg.ls || 0);
      let x0 = cfg.x - total / 2;
      const clipTop = cfg.y - size * 1.0 - li * size * 1.35;
      ctx.beginPath();
      ctx.rect(cfg.x - total / 2 - 10, clipTop, total + 20, size * 1.3);
      ctx.clip();
      chars.forEach(c => {
        const w2 = ctx.measureText(c).width + (cfg.ls || 0);
        const u = MO.outExpo(MO.seg(l, cfg.at + idx * (cfg.stagger || 0.04), cfg.at + idx * (cfg.stagger || 0.04) + (cfg.dur || 0.3)));
        if (u > 0) txt(ctx, c, x0 + w2 / 2, cfg.y + li * size * 1.35 + (1 - u) * size * 1.2, {
          size, weight: cfg.weight || 600, baseline: "middle", alpha: u, color: cfg.color || p.cream, ls: 0
        });
        x0 += w2; idx++;
      });
      ctx.restore();
    });
    return;
  }
  lines.forEach((ln, li) => {
    const u = MO.outExpo(MO.seg(l, cfg.at + li * (cfg.stagger || 0.06), cfg.at + li * (cfg.stagger || 0.06) + (cfg.dur || 0.32)));
    if (u <= 0) return;
    const y = cfg.y + li * size * 1.35;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-W, y - size * 1.0, W * 2, size * 1.25);   // 槽：基线上 1.0em 到基线下 0.25em
    ctx.clip();
    txt(ctx, ln, cfg.x, y + (1 - u) * size * 1.2, {
      size, weight: cfg.weight || 600, alpha: u, ls: cfg.ls ?? 2,
      color: cfg.color || p.cream, align: cfg.align || "center"
    });
    ctx.restore();
  });
}

/* 打字机：按字符截断 + 光标闪烁（代码/引文/命令）
   cfg: { text, x, y, size, at, cps=26, cursorHz=2, mono=true, color } */
function typeOn(ctx, t, l, cfg) {
  const p = PAL();
  const u = MO.seg(l, cfg.at, cfg.at + cfg.text.length / (cfg.cps || 26));
  if (u <= 0) return;
  const n = Math.floor(u * cfg.text.length);
  const shown = cfg.text.slice(0, n);
  const blink = (t * (cfg.cursorHz || 2)) % 1 < 0.5;
  ctx.save();
  ctx.font = (cfg.mono === false ? FONT(600, cfg.size) : MONO(cfg.size));
  const wShown = ctx.measureText(shown).width;
  const wFull = ctx.measureText(cfg.text).width;
  const x0 = cfg.x - wFull / 2;
  ctx.fillStyle = cfg.color || p.cream;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(shown, x0, cfg.y);
  if (u < 1 && blink) {
    ctx.fillStyle = PAL().accent;
    ctx.fillRect(x0 + wShown + 3, cfg.y - cfg.size * 0.42, cfg.size * 0.55, cfg.size * 0.84);
  }
  ctx.restore();
}

/* 逐字浮出：字符逐个上浮淡入（抒情/结尾金句）
   cfg: { text, x, y, size, at, stagger=0.05, rise=28, dur=0.4, color, weight, ls } */
function charFloat(ctx, t, l, cfg) {
  const p = PAL();
  const chars = [...cfg.text];
  ctx.save();
  ctx.font = FONT(cfg.weight || 600, cfg.size);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${cfg.ls || 0}px`;
  const total = chars.reduce((w2, c) => w2 + ctx.measureText(c).width + (cfg.ls || 0), 0) - (cfg.ls || 0);
  let x0 = cfg.x - total / 2;
  chars.forEach((c, i) => {
    const w2 = ctx.measureText(c).width + (cfg.ls || 0);
    const u = MO.outCubic(MO.seg(l, cfg.at + i * (cfg.stagger || 0.05), cfg.at + i * (cfg.stagger || 0.05) + (cfg.dur || 0.4)));
    if (u > 0) {
      txt(ctx, c, x0 + w2 / 2, cfg.y - (cfg.rise || 28) * u + (1 - u) * 8, {
        size: cfg.size, weight: cfg.weight || 600, baseline: "middle",
        alpha: u, color: cfg.color || p.cream, ls: 0, glow: cfg.glow || 0
      });
    }
    x0 += w2;
  });
  ctx.restore();
}

/* 关键词标记：荧光笔(marker)/下划线/圈注 —— 在字出现后 0.15–0.5s 再刷
   cfg: { text, x, y, size, at, delay=0.3, dur=0.3, mode: "marker"|"underline"|"circle",
          color?, weight=700, ls=0, align="center" }
   marker 画在字后面（先调用 marker 再画字），underline/circle 画在字上面（后调用） */
function keywordMark(ctx, t, l, cfg) {
  const p = PAL();
  const at = cfg.at + (cfg.delay ?? 0.3);
  const u = MO.outExpo(MO.seg(l, at, at + (cfg.dur || 0.3)));
  if (u <= 0) return;
  ctx.save();
  ctx.font = FONT(cfg.weight || 700, cfg.size);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${cfg.ls || 0}px`;
  const w2 = ctx.measureText(cfg.text).width;
  const x0 = cfg.x - w2 / 2;
  const col = cfg.color || p.accent;
  if (cfg.mode === "marker") {
    // 斜切荧光笔：下半 0.55em 高，斜率 0.18
    const h = cfg.size * 0.55, y0 = cfg.y - cfg.size * 0.08;
    const ww = w2 * u;
    ctx.fillStyle = hexA(col, 0.4);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + ww, y0);
    ctx.lineTo(x0 + ww - h * 0.18, y0 + h);
    ctx.lineTo(x0 - h * 0.18, y0 + h);
    ctx.closePath(); ctx.fill();
  } else if (cfg.mode === "underline") {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, cfg.size * 0.08); ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, cfg.y + cfg.size * 0.18);
    ctx.lineTo(x0 + w2 * u, cfg.y + cfg.size * 0.18);
    ctx.stroke();
  } else if (cfg.mode === "circle") {
    // 椭圆圈注按弧长画出
    const rx = w2 / 2 + cfg.size * 0.2, ry = cfg.size * 0.72;
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, cfg.size * 0.07);
    ctx.beginPath();
    ctx.ellipse(cfg.x, cfg.y - cfg.size * 0.32, rx, ry, -0.06, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u);
    ctx.stroke();
  }
  ctx.restore();
}
