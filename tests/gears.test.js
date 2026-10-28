const assert=require('assert'),fs=require('fs'),vm=require('vm');
const box={window:{}};vm.createContext(box);vm.runInContext(fs.readFileSync('engine/gears.js','utf8'),box);
const G=box.window.GearMotion,a=G.geometry({teeth:18,module:10}),b=G.geometry({teeth:36,module:10});
assert.equal(a.radius,90);assert.equal(b.radius,180);
assert.equal(a.points.length/18,2*(12+1)+4+4);
for(const beta of [0,.5,-1])for(const angle of [0,.01,1,2,40]){
 const p=G.mesh(a,b,angle,beta),q=G.mesh(a,b,angle+.001,beta);
 assert.equal(p.centerDistance,270);assert(Math.abs((q.angle-p.angle)/.001+.5)<1e-10);
 const invariant=18*angle+36*p.angle-(18+36)*beta;
 assert(Math.abs(invariant-(36*Math.PI-Math.PI))<1e-10);
}
const s=[{start:0,end:10,turns:1},{start:15,end:23,turns:2}];
assert.equal(G.turns(12,s),1);assert.equal(G.turns(23,s),3);
for(const t of [16,2,20,0,10,23,16])assert.equal(G.turns(t,s),G.turns(t,s));
assert(Math.abs(G.turns(15+1e-5,s)-G.turns(15-1e-5,s))<1e-8);
assert.throws(()=>G.mesh(a,G.geometry({teeth:36,module:11}),0));
assert.throws(()=>G.geometry({teeth:12,module:10}));
assert.throws(()=>G.turns(3,[{start:0,end:4,turns:1},{start:3,end:5,turns:1}]));
console.log('Gear geometry, ratio, phase, arbitrary axes and continuous rotation schedule passed');
