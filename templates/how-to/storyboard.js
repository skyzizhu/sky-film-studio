window.FILM = {
  timeline: { showAt: 2.0,
    get starts() { return FILM_META.beats.filter(b=>b.scene==='sStep').map(b=>b.start); },
    get doneAt() { return FILM_META.beats.filter(b=>b.scene==='sStep').slice(-1)[0]?.end ?? 0; },
    items: DATA.steps.map(s => ({ label: s.name })) },
  scenes: {
    s0(ctx, t, l, beat) {
      hookBurst(ctx, t, l, { lines: [] });
      kineticWord(ctx, t, l, { text: DATA.hook, x: W/2, y: H*.38, size: Math.min(140,W*.11), at: 0.1, gold: true, ls: 16 });
      textRise(ctx, t, l, { text: DATA.sub, x: W/2, y: H*.55, size: 38, at: 0.8, ls: 6 });
    },
    sStep(ctx, t, l, beat) {
      const st = DATA.steps[beat.vars.i];
      stepIntro(ctx, t, l, beat.vars.i + 1, st.name);
      drawEntity(ctx, t, l, { id: st.entity, x: W<1280 ? W/2 : W*.7, y: W<1280 ? H*.3 : H*.44, s: 2.8, at: 0.25, dur: 0.8, glow: 12 });
      shockwave(ctx, t, l, { x: W<1280 ? W/2 : W*.7, y: W<1280 ? H*.3 : H*.44, at: 1.0 });
      checkList(ctx, t, l, { x: W<1280 ? W*.12 : W*.15, y: W<1280 ? H*.45 : H*.35, w: W<1280 ? W*.76 : W*.34, title: st.name, at0: 0.5, items: st.card.split(" · ") });
    },
    sEnd(ctx, t, l, beat) {
      charFloat(ctx, t, l, { text: DATA.ending, x: W/2, y: H*.44, size: Math.min(76,W*.075), at: 0.2, stagger: 0.08 });
      endingLine(ctx, t, l, { at: 2.2, endTitle: DATA.title });
    }
  } };
