window.FILM = { theme: "finance", progress: false, scenes: {
  s0(ctx, t, l, beat) {
    hookBurst(ctx, t, l, { lines: [] });
    kineticWord(ctx, t, l, { text: DATA.hook, x: W/2, y: 450, size: 160, at: 0.1, gold: true, ls: 14 });
    textRise(ctx, t, l, { text: DATA.sub, x: W/2, y: 640, size: 38, at: 0.8, ls: 8 });
  },
  sMain(ctx, t, l, beat) {
    rays(ctx, t, l, { x: W/2, y: 460, at: 0.2, alpha: 0.1, n: 12 });
    numCounter(ctx, t, l, { y: 500, at: 0.3, numSize: 160, items: [DATA.main] });
  },
  sCmp(ctx, t, l, beat) {
    stepIntro(ctx, t, l, 1, "变化");
    compareBars(ctx, t, l, { x: 480, y: 340, w: 900, at0: 0.4, max: DATA.compare.max, rows: DATA.compare.rows });
  },
  sEnd(ctx, t, l, beat) {
    charFloat(ctx, t, l, { text: DATA.ending, x: W/2, y: 500, size: 80, at: 0.2, stagger: 0.08 });
    endingLine(ctx, t, l, { at: 2.0, endTitle: DATA.title });
  }
} };
