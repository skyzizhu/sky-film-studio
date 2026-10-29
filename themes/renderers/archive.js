
'use strict';
(() => {
 window.RENDERERS=window.RENDERERS||{};
 window.RENDERERS.archive={
  bg(ctx,t,W,H){
   ctx.save();ctx.fillStyle=TH.palette.bg0;ctx.fillRect(0,0,W,H);
   const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,TH.palette.bg1);g.addColorStop(1,TH.palette.bg0);
   ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   ctx.strokeStyle='rgba(222,196,150,.12)';ctx.lineWidth=1;
   ctx.strokeRect(W*.025,H*.025,W*.95,H*.95);
   ctx.beginPath();ctx.moveTo(W*.065,H*.13);ctx.lineTo(W*.935,H*.13);ctx.stroke();ctx.restore();
  },
  entityDefaults(){return {color:TH.palette.accent,glow:0};},
  textDefaults(){return {color:TH.palette.cream,glow:0};}
 };
})();
