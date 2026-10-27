const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const context={window:null,console,Math,W:640,H:360,PAL:()=>({accent:'#aaa',accentDeep:'#333',accentHi:'#fff'}),hexA:x=>x};
context.window=context;vm.createContext(context);
for(const file of ['engine/motion.js','components/objectfx.js','components/entityfx.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
function recorder(){
  const calls=[]; const target={globalAlpha:1};
  const ctx=new Proxy(target,{set(o,k,v){o[k]=v;return true},get(o,k){return k in o?o[k]:(...args)=>calls.push([k,...args]);}});
  return {ctx,calls};
}
{
  const {ctx,calls}=recorder();
  context.drawEntity(ctx,0,.001,{paths:[[[0,0],[100,0]]],x:0,y:0,at:0,dur:1,style:'line'});
  const end=calls.find(x=>x[0]==='lineTo');
  assert.ok(end[1]>0 && end[1]<1,'single segment must be partially traced');
}
{
  const {ctx,calls}=recorder();
  context.drawObj(ctx,0,.1,{paths:[[[0,0],[10,0],[110,0]]],x:0,y:0,at:0,dur:1,style:'line'});
  const points=calls.filter(x=>x[0]==='lineTo');
  assert.equal(points[0][1],10);
  assert.ok(Math.abs(points[1][1]-110*(1-.9**3))<1e-6,'trace uses length rather than vertex count');
}
{
  const {ctx,calls}=recorder();
  context.drawEntity(ctx,1,1,{paths:[[[0,-50],[0,50]]],x:100,y:200,at:0,dur:.8,motion:'grow'});
  assert.equal(calls.filter(x=>x[0]==='stroke').length,1,'grow draws once');
  assert.deepEqual(calls.find(x=>x[0]==='translate'),['translate',100,200],'completed geometry keeps its original origin');
}
assert.equal(context._isClosed([[0,0],[100,0],[100,100],[0,100],[0,10]]),false,'open gap must not get filled');
assert.equal(context._isClosed(context._poly([[0,0],[100,0],[0,100]],true)),true);
assert.throws(()=>context.drawEntity(recorder().ctx,1,1,{id:'typo',x:0,y:0}),/未知实体/);
assert.doesNotThrow(()=>context.drawEntity(recorder().ctx,1,1,{id:'typo',omit:true}));
{
  const {ctx,calls}=recorder();
  const entity={parts:[{points:[[0,0],[20,0]],closed:false,fill:null,pose:(t,l)=>({rot:l})}]};
  context.drawEntity(ctx,1,1,{entity,x:100,y:200,at:0,enter:'fadeIn'});
  assert.ok(calls.some(x=>x[0]==='rotate' && x[1]===1),'joint pose reaches the canvas transform');
}
{
  const {ctx}=recorder();
  const entity={palette:{body:'accentDeep',edge:'accentHi'},parts:[{points:[[0,0],[20,0],[20,20]],closed:true,fill:'body',stroke:'edge'}]};
  context.drawEntity(ctx,1,1,{entity,x:0,y:0,at:0});
  assert.equal(ctx.strokeStyle,'#fff','semantic palette token must resolve to CSS color');
  assert.equal(ctx.fillStyle,'#333');
}
for (const file of ['components/icons.js','components/icons-fill.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
for (const name of ['how-to','daily-brief','fact-card']) {
  vm.runInContext(fs.readFileSync(path.join(root,'templates',name,'defaults.js'),'utf8'),context);
  const ids=[...(context.DATA.steps || []).map(x=>x.entity),...(context.DATA.items || []).map(x=>x.icon)].filter(Boolean);
  for (const id of ids) assert.ok(context.OBJECTS[id] || context.ICONS[id] || context.ICONS_FILL[id],`template ${name}: unknown ${id}`);
}
console.log('9 entity/template regressions passed');
