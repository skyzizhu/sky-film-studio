window.FILM = { theme: "code", progress: true,
  timeline: { showAt: 2.0, doneAt: 1e9, items: DATA.steps.map(s => ({ label: s.name })) },
  scenes: {
    s0(ctx, t, l, beat) {
      hookBurst(ctx, t, l, { lines: [] });
      kineticWord(ctx, t, l, { text: DATA.hook, x: W/2, y: 450, size: 140, at: 0.1, gold: true, ls: 16 });
      textRise(ctx, t, l, { text: DATA.sub, x: W/2, y: 630, size: 38, at: 0.8, ls: 6 });
    },
    sStep(ctx, t, l, beat) {
      const st = DATA.steps[beat.vars.i];
      stepIntro(ctx, t, l, beat.vars.i + 1, st.name);
      drawEntity(ctx, t, l, { id: st.entity, x: 1240, y: 480, s: 2.8, at: 0.25, dur: 0.8, glow: 12 });
      shockwave(ctx, t, l, { x: 1240, y: 480, at: 1.0 });
      checkList(ctx, t, l, { x: 300, y: 380, w: 620, title: st.name, at0: 0.5, items: st.card.split(" · ") });
    },
    sEnd(ctx, t, l, beat) {
      charFloat(ctx, t, l, { text: DATA.ending, x: W/2, y: 500, size: 76, at: 0.2, stagger: 0.08 });
      endingLine(ctx, t, l, { at: 2.2, endTitle: DATA.title });
    }
  } };
