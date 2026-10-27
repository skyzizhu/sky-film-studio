// =====================================================================
// sky-film-studio · components/iconlib.js —— 图标路径采样桥
// window.ICONS（icons.js，lucide path-d）→ window.ICON_PATHS（折线组，±50 局部坐标）
// 采样用浏览器原生 SVGGeometryElement.getTotalLength/getPointAtLength（确定性），
// 供 drawObj 的弧长逐笔描出渲染器直接使用——专业矢量线稿，"画得像"的关键。
// =====================================================================
"use strict";
window.ICON_PATHS = {};
window.ICON_FILL_PATHS = {};

function _closed(pts) {
  if (pts.length < 3) return false;
  const a2 = pts[0], b2 = pts[pts.length - 1];
  return Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) < Math.max(6, _polyLen(pts) * 0.06);   // 容差放宽：抗采样/抖动误差
}
function _polyLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

function initIcons() {
  if (!window.ICONS) return 0;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  document.body.appendChild(svg);
  let n = 0;
  for (const name of Object.keys(window.ICONS)) {
    const polys = [];
    for (const d of window.ICONS[name]) {
      const p = document.createElementNS(svgNS, "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
      try {
        const L = p.getTotalLength();
        if (L >= 0.5) {
          const steps = Math.max(2, Math.ceil(L / 1.2));    // 24 空间 1.2 步长
          const pts = [];
          for (let i = 0; i <= steps; i++) {
            const q = p.getPointAtLength(L * i / steps);
            pts.push([(q.x / 24 - 0.5) * 100, (q.y / 24 - 0.5) * 100]);   // → ±50
          }
          polys.push(pts);
        }
      } catch (e) { /* 跳过无效路径 */ }
      svg.removeChild(p);
    }
    if (polys.length) { window.ICON_PATHS[name] = polys; n++; }
  }
  svg.remove();
  // 实心双色集（phosphor duotone，按填充设计）
  if (window.ICONS_FILL) {
    for (const name of Object.keys(window.ICONS_FILL)) {
      const arr = [];
      for (const q of window.ICONS_FILL[name]) {
        const p2 = document.createElementNS(svgNS, "path");
        p2.setAttribute("d", q.d);
        svg.appendChild(p2);
        try {
          const L = p2.getTotalLength();
          if (L >= 0.5) {
            const steps = Math.max(2, Math.ceil(L / 2.4));
            const pts = [];
            for (let i = 0; i <= steps; i++) {
              const g = p2.getPointAtLength(L * i / steps);
              pts.push([(g.x / 256 - 0.5) * 100, (g.y / 256 - 0.5) * 100]);
            }
            arr.push({ pts, base: !!q.base });
          }
        } catch (e) { }
        svg.removeChild(p2);
      }
      if (arr.length) window.ICON_FILL_PATHS[name] = arr;
    }
  }
  svg.remove();
  return n;
}
