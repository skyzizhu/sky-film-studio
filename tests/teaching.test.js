const fs=require('fs'),vm=require('vm'),assert=require('assert'),b={window:{}};vm.createContext(b);for(const f of ['layout','teaching'])vm.runInContext(fs.readFileSync('engine/'+f+'.js','utf8'),b);
const T=b.window.TeachingMotion,L=b.window.FilmLayout,items=T.tokens([3,6,9]),slots=T.equalSlots(items,3);
assert.equal(items.length,18);assert.equal(new Set(items.map(q=>q.id)).size,18);
for(let g=0;g<3;g++)assert.equal(slots.filter(q=>q.targetGroup===g).length,6);
const from=(q,i)=>({x:i,y:0}),to=(q,i)=>({x:i+30,y:40}),config={start:1,end:4,from,to,lift:30,stagger:.3};
const stable=JSON.stringify(T.interpolate(slots,2,config));T.interpolate(slots,3,config);assert.equal(JSON.stringify(T.interpolate(slots,2,config)),stable);
for(const t of [0,2,5])assert.deepEqual(T.interpolate(slots,t,config).map(q=>q.id),slots.map(q=>q.id));
assert.equal(T.interpolate(slots,5,config)[17].x,47);assert.throws(()=>T.equalSlots(T.tokens([2,3]),3));
for(const [w,h]of [[1920,1080],[1080,1920],[960,540],[540,960],[600,600],[320,320]]){
 const a=L.regions(w,h);for(const r of [a.body,a.title,a.stage,...a.compare])assert(r.x>=0&&r.y>=0&&r.width>0&&r.height>0&&r.x+r.width<=w&&r.y+r.height<=h);
 assert(a.stage.y+a.stage.height<=h-130);assert.equal(a.portrait,h>w);
}
console.log('Responsive safe regions, conserved token identity, equal allocation and continuous paths passed');
