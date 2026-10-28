const fs=require('fs'),vm=require('vm'),assert=require('assert');
const box={window:{}};vm.createContext(box);vm.runInContext(fs.readFileSync(__dirname+'/../engine/process.js','utf8'),box);
const P=box.window.ProcessMotion;
const target={x:0,y:0,width:100,height:100},s=[{start:1,end:2,x0:-10,x1:110,y:50,width:20,height:100}];
assert.equal(P.coverage(target,s,.5),0);
assert.equal(P.coverage(target,s,1),0);
assert.equal(P.coverage(target,s,1.5),.6);
assert.equal(P.coverage(target,s,2),1);
assert.equal(P.coverage({...target,y:200},s,3),0);
assert.equal(P.coverage(target,[...s,...s],2),1); // overlap cannot double-count
const items=Array.from({length:16},(_,i)=>({id:i})),dest=items.map((_,i)=>(i+5)%16);
const order=P.reorder(items,dest);items.forEach((v,i)=>assert.strictEqual(order[dest[i]],v));
const printed=P.imprint(order,4);printed.forEach((v,i)=>assert.strictEqual(v,order[Math.floor(i/4)*4+3-i%4]));
assert.throws(()=>P.reorder(items,items.map(()=>0)));
const cfg={start:1,end:3,from:{x:0,y:0},to:{x:100,y:50},lift:80};
assert.equal(P.carry(1,cfg).z,0);assert.equal(P.carry(2,cfg).z,80);assert.equal(P.carry(3,cfg).x,100);
const before=JSON.stringify(P.carry(1.5,cfg));P.carry(3,cfg);assert.equal(JSON.stringify(P.carry(1.5,cfg)),before);
console.log('Contact coverage, layout identity, imprint and pick/carry/place: passed');
