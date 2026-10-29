'use strict';
window.FilmLayout=(()=>{
 function regions(W,H,{subtitleLines=2}={}){
  if(![W,H].every(Number.isFinite)||W<320||H<320||!Number.isInteger(subtitleLines)||subtitleLines<1||subtitleLines>4)throw Error('Invalid film layout');
  const margin=Math.max(24,Math.min(W,H)*.055),top=Math.min(H*.2,Math.max(95,H*.11)),bottom=92+subtitleLines*Math.min(47,Math.max(25,W*.035*1.25));
  const body={x:margin,y:top,width:W-2*margin,height:H-top-bottom},portrait=H>W;
  if(body.height<=100)throw Error('Insufficient content height');
  const title={x:body.x,y:body.y,width:body.width,height:body.height*.2};
  const stage={x:body.x,y:body.y+body.height*.23,width:body.width,height:body.height*.75};
  const gap=margin*.7;
  const compare=portrait?[{x:stage.x,y:stage.y,width:stage.width,height:(stage.height-gap)/2},{x:stage.x,y:stage.y+(stage.height+gap)/2,width:stage.width,height:(stage.height-gap)/2}]:[{x:stage.x,y:stage.y,width:(stage.width-gap)/2,height:stage.height},{x:stage.x+(stage.width+gap)/2,y:stage.y,width:(stage.width-gap)/2,height:stage.height}];
  return {portrait,margin,body,title,stage,compare};
 }
 return Object.freeze({regions});
})();
