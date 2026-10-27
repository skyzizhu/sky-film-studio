window.FILM = {  scenes: {
  s0(ctx, t, l, beat) {
    hookBurst(ctx, t, l, { lines: [] });
    kineticWord(ctx, t, l, { text: DATA.hook, x: W/2, y: H*.38, size: Math.min(160,W*.11), at: 0.1, gold: true, ls: 14 });
    textRise(ctx, t, l, { text: DATA.sub, x: W/2, y: H*.55, size: 38, at: 0.8, ls: 8 });
  },
  sMain(ctx, t, l, beat) {
    rays(ctx, t, l, { x: W/2, y: H*.42, at: 0.2, alpha: 0.1, n: 12 });
    numCounter(ctx, t, l, { y: H*.44, at: 0.3, numSize: 160, items: [DATA.main] });
  },
  sCmp(ctx, t, l, beat) {
    stepIntro(ctx, t, l, 1, "变化");
    compareBars(ctx, t, l, { x: W*.15, y: H*.32, w: W*.7, at0: 0.4, max: DATA.compare.max, rows: DATA.compare.rows });
  },
  sEnd(ctx, t, l, beat) {
    charFloat(ctx, t, l, { text: DATA.ending, x: W/2, y: H*.44, size: Math.min(80,W*.075), at: 0.2, stagger: 0.08 });
    endingLine(ctx, t, l, { at: 2.0, endTitle: DATA.title });
  }
} };
