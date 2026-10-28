// =====================================================================
// sky-film-studio · engine/renderer.js —— 渲染引擎管理器（v7 核心架构）
// 主题不再只是配色：每个主题可以拥有完全不同的渲染引擎。
// 引擎类型：
//   post     后处理型：正常渲染场景后对整帧做变换（glitch/pixel）
//   pre      前置型：改变背景和组件样式（ink/whiteboard/screencast）
//   default  标准型：使用现有管线，仅配色不同（default/tech/news/code/finance）
// =====================================================================
"use strict";

window.Renderer = {
  _current: null,
  _offscreen: null,

  // 初始化：根据 film.json 的 theme 或 renderer 字段选择引擎
  init(meta) {
    const themeKey = meta.theme || "default";
    // 显式指定 renderer 优先，否则按主题映射
    const rKey = meta.renderer || THEME_RENDERER_MAP[themeKey] || "default";
    if (meta.renderer && rKey !== "default" && !window.RENDERERS?.[rKey]) {
      throw new Error(`Unknown renderer: ${rKey}`);
    }
    if (window.RENDERERS && window.RENDERERS[rKey]) {
      window._current = window.RENDERERS[rKey];
    } else {
      window._current = null;   // 用标准管线
    }
  },

  // 场景前：背景
  bg(ctx, t, W, H, baseFn) {
    if (window._current && window._current.bg) {
      window._current.bg(ctx, t, W, H);
    } else {
      baseFn(ctx);
    }
  },

  // 场景前：开始帧（可做 canvas 变换）
  begin(ctx, t, W, H) {
    if (window._current && window._current.begin) {
      window._current.begin(ctx, t, W, H);
    }
  },

  // 场景后：后处理（RGB 分裂/像素化/扫描线等）
  post(ctx, t, W, H) {
    if (window._current && window._current.post) {
      window._current.post(ctx, t, W, H);
    }
  },

  // 最外层：覆盖效果（CRT 边框/纸纹等）
  overlay(ctx, t, W, H) {
    if (window._current && window._current.overlay) {
      window._current.overlay(ctx, t, W, H);
    }
  },

  // 实体样式覆盖（渲染引擎可以改变实体的默认画法）
  entityDefaults() {
    if (window._current && window._current.entityDefaults) {
      return window._current.entityDefaults();
    }
    return {};
  },

  // 文字样式覆盖
  textDefaults() {
    if (window._current && window._current.textDefaults) {
      return window._current.textDefaults();
    }
    return {};
  },

  // 音频配置
  audio() {
    if (window._current && window._current.audio) {
      return window._current.audio;
    }
    return null;
  },

  get current() { return window._current; }
};

// 主题 → 渲染引擎映射
const THEME_RENDERER_MAP = {
  "default": "default",
  "tech": "default",
  "news": "default",
  "code": "default",
  "finance": "default",
  // v7 新主题：用专属渲染引擎
  "blueprint": "blueprint",
  "museum": "museum",
  "ink": "ink",
  "pixel": "pixel",
  "glitch": "glitch",
  "whiteboard": "whiteboard",
  "screencast": "screencast",
  // three3d 需要显式 renderer: "three3d"
};
window.THEME_RENDERER_MAP = THEME_RENDERER_MAP;
