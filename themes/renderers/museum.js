'use strict';
(() => {
 window.RENDERERS=window.RENDERERS||{};
 window.RENDERERS.museum={
  bg(ctx,t,W,H){
   ctx.save();ctx.fillStyle=TH.palette.bg0;ctx.fillRect(0,0,W,H);
   const g=ctx.createRadialGradient(W*.66,H*.4,0,W*.6,H*.45,Math.max(W,H)*.75);
   g.addColorStop(0,TH.palette.bg1);g.addColorStop(1,TH.palette.bg0);
   ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   // Quiet display plane, kept behind the objects and caption layer.
   ctx.strokeStyle='rgba(220,206,173,.09)';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(W*.07,H*.81);ctx.lineTo(W*.93,H*.81);ctx.stroke();
   ctx.restore();
  },
  entityDefaults(){return {color:TH.palette.accent,glow:0};},
  textDefaults(){return {color:TH.palette.cream,glow:0};},
  audio:{instruments:['guzheng','taiko'],bpm:76,mode:'pentatonic'}
 };
})();
