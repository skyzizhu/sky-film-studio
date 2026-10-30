'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../engine/product-motion.js'),'utf8'),sandbox);
const M=sandbox.window.ProductMotion;
function context(){return {globalAlpha:.4,x:7,stack:[],save(){this.stack.push([this.globalAlpha,this.x])},restore(){[this.globalAlpha,this.x]=this.stack.pop()},translate(x){this.x+=x}}}
const ctx=context(),event=[1,1.4,1.6,2],seen=new Map();
function sample(t){const calls=[];const draw=id=>(g,at)=>{calls.push({id,at,alpha:g.globalAlpha});g.translate(90);g.globalAlpha=.01};const r=M.replace(ctx,t,event,draw('old'),draw('new'));
 assert.equal(ctx.globalAlpha,.4);assert.equal(ctx.x,7);assert.equal(ctx.stack.length,0);assert.ok(calls.length<=1);
 for(const c of calls){assert.ok(c.alpha>0&&c.alpha<=.4);assert.equal(c.at,t);assert.equal(c.id,t<1.4?'old':'new')}
 if(t>=1.4&&t<=1.6){assert.equal(calls.length,0);assert.equal(r.opacity,0)}
 return JSON.stringify({r,calls});}
const times=[-1,...Array.from({length:301},(_,i)=>i/100),20];
for(const t of times)seen.set(t,sample(t));for(const t of times.reverse())assert.equal(sample(t),seen.get(t));
assert.equal(JSON.parse(sample(-1)).calls[0].alpha,.4);assert.equal(JSON.parse(sample(20)).calls[0].alpha,.4);
assert.equal(M.replace(ctx,1.5,[1,1.5,1.5,2],()=>assert.fail(),()=>assert.fail()).opacity,0);
for(const t of [0,3]){assert.throws(()=>M.replace(ctx,t,event,()=>{ctx.translate(99);throw Error('callback')},()=>{ctx.translate(99);throw Error('callback')}),/callback/);assert.equal(ctx.x,7);assert.equal(ctx.globalAlpha,.4);assert.equal(ctx.stack.length,0)}
for(const e of [[1,1,2,3],[1,2,1,3],[1,2,3,3],[1,2,3],[1,2,NaN,4]])assert.throws(()=>M.replace(ctx,0,e,()=>{},()=>{}),/Invalid/);
assert.throws(()=>M.replace(ctx,NaN,event,()=>{},()=>{}),/Invalid/);assert.throws(()=>M.replace(ctx,0,event,null,()=>{}),/Invalid/);
console.log('Product replace: non-overlap, holds, reverse time, context/exception restoration and invalid inputs passed.');
