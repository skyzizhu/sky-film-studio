// =====================================================================
// sky-film-studio · components/iconlib.js —— 图标路径采样桥
// window.ICONS（icons.js，lucide path-d）→ window.ICON_PATHS（折线组，±50 局部坐标）
// 采样用浏览器原生 SVGGeometryElement.getTotalLength/getPointAtLength（确定性），
// 供 drawObj 的弧长逐笔描出渲染器直接使用——专业矢量线稿，"画得像"的关键。
// =====================================================================
"use strict";
window.ICON_PATHS = {};

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
  return n;
}
