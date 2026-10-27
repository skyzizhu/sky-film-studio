window.FILM = { theme: "tech", progress: true, scenes: {
  s0(ctx, t, l, beat) {
    hookBurst(ctx, t, l, { lines: [] });
    kineticWord(ctx, t, l, { text: DATA.hook, x: W/2, y: 450, size: 150, at: 0.1, gold: true, ls: 18 });
    keywordMark(ctx, t, l, { text: DATA.hook, x: W/2, y: 450, size: 150, at: 0.1, delay: 0.5, mode: "underline", ls: 18 });
    textRise(ctx, t, l, { text: DATA.sub, x: W/2, y: 640, size: 40, at: 0.8, ls: 8 });
  },
  sItem(ctx, t, l, beat) {
    const it = DATA.items[beat.vars.i];
    stepIntro(ctx, t, l, beat.vars.i + 1, it.title);
    drawEntity(ctx, t, l, { id: it.icon, x: 1280, y: 480, s: 2.4, at: 0.3, dur: 0.7, glow: 10 });
    kineticWord(ctx, t, l, { text: it.title, x: 640, y: 440, size: 96, at: 0.15, ls: 10 });
    textRise(ctx, t, l, { text: it.desc, x: 640, y: 600, size: 36, at: 0.7 });
  },
  sNum(ctx, t, l, beat) {
    numCounter(ctx, t, l, { y: 520, at: 0.3, numSize: 150, items: [DATA.number] });
  },
  sEnd(ctx, t, l, beat) {
    charFloat(ctx, t, l, { text: DATA.ending, x: W/2, y: 500, size: 90, at: 0.2, stagger: 0.08 });
    endingLine(ctx, t, l, { at: 2.0, endTitle: DATA.title });
  }
} };
