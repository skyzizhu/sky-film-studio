'use strict';
(() => {
 window.RENDERERS=window.RENDERERS||{};
 window.RENDERERS.blueprint={
  bg(ctx,t,W,H){
   ctx.save();
   ctx.fillStyle=TH.palette.bg0;ctx.fillRect(0,0,W,H);
   const step=Math.max(20,Math.min(W,H)/18);
   for(let layer=0;layer<2;layer++){
    const d=step*(layer?5:1);
    ctx.strokeStyle=layer?'rgba(160,219,236,.14)':'rgba(160,219,236,.05)';ctx.lineWidth=1;
    ctx.beginPath();
    for(let x=0;x<=W;x+=d){ctx.moveTo(x,0);ctx.lineTo(x,H);}
    for(let y=0;y<=H;y+=d){ctx.moveTo(0,y);ctx.lineTo(W,y);}
    ctx.stroke();
   }
   ctx.restore();
  },
  entityDefaults(){return {color:TH.palette.accent,glow:0};},
  textDefaults(){return {color:TH.palette.cream,glow:0};},
  audio:{instruments:['fm_piano'],bpm:96,mode:'minor'}
 };
})();
