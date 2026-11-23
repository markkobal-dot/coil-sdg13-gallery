/* Reversible, C1-continuous camera choreography. Close-ups illustrate processes, not dated measurements. */
(function(host){
'use strict';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const chapters=[0,.22,.415,.67,.79,.98],opening={camera:[-8,3.1,22],target:[-.5,1,-17],fov:43};
const keys=[
[0,opening.camera,opening.target,.35,0,0],
[.11,[-19,1.8,24],[-7,.1,2],.45,0,0],
[.23,[-13,-1.4,23],[-3,-.7,-6],.7,0,0],
[.34,[-3,-1.1,20],[0,-.25,-17],1.7,0,0],
[.415,[.2,-.25,4],[.2,.3,-19],3,0,0],
[.46,[.3,.7,-9],[.3,.2,-26],3.3,0,0],
[.51,[0,7,-18],[0,0,-26],3.4,0,0],
[.56,[0,25,-4],[0,0,-7],3.4,.08,0],
[.61,[20,120,.1],[20,0,0],3.4,.55,0],
[.65,[65,320,.12],[65,0,0],3.4,1,0],
[.80,[65,320,.12],[65,0,0],3.4,1,0],
[.85,[30,160,15],[30,0,0],3.4,.65,0],
[.935,opening.camera,opening.target,3.4,0,0],
[.955,opening.camera,opening.target,7,0,.18],
[1,opening.camera,opening.target,8,0,1]
];
const values=keys.map(k=>[...k[1],...k[2],k[3],k[4],k[5]]);
// Shape-preserving Hermite tangents keep velocity continuous without overshooting the waterline.
const slopes=values.map((row,i)=>row.map((_,d)=>{
const delta=j=>(values[j+1][d]-values[j][d])/(keys[j+1][0]-keys[j][0]);
if(i===0)return delta(0);if(i===keys.length-1)return delta(i-1);
const a=delta(i-1),b=delta(i);if(a*b<=0)return 0;
const h0=keys[i][0]-keys[i-1][0],h1=keys[i+1][0]-keys[i][0],w1=2*h1+h0,w2=h1+2*h0;return (w1+w2)/(w1/a+w2/b);
}));
function frameAt(raw,portrait=false){
const p=clamp(Number.isFinite(raw)?raw:0);let i=keys.findIndex((_,j)=>j<keys.length-1&&p<=keys[j+1][0]);if(i<0)i=keys.length-2;
const h=keys[i+1][0]-keys[i][0],t=clamp((p-keys[i][0])/h),t2=t*t,t3=t2*t;
const v=values[i].map((a,d)=>(2*t3-3*t2+1)*a+(t3-2*t2+t)*h*slopes[i][d]+(-2*t3+3*t2)*values[i+1][d]+(t3-t2)*h*slopes[i+1][d]);
let camera=v.slice(0,3),target=v.slice(3,6);const map=clamp(v[7]),handoff=ease((map-.12)/.78);
if(portrait){camera=[camera[0]*.5,camera[1]+190*map,camera[2]+4*(1-map)+80*map];camera[0]*=1-map;target=[target[0]*.3*(1-map),target[1]-.25*(1-map),target[2]+80*map];}
let chapter=0;for(let j=1;j<chapters.length;j++)if(p>=(chapters[j-1]+chapters[j])/2)chapter=j;
return {progress:p,portrait,chapter,camera,target,fov:portrait?54:opening.fov,gap:v[6],map,orbitCover:ease(handoff/.45),mapBlend:ease((handoff-.3)/.7),drift:clamp(v[8]),underwater:ease((.08-camera[1])/.4),wildlife:1-ease((p-.07)/.13)};
}
function progressAt(scrollY,start,trackHeight,stageHeight){return clamp((scrollY-start)/Math.max(1,trackHeight-stageHeight));}
function follow(current,target,dt){const d=target-current;return Math.abs(d)<.000003?target:current+d*(1-Math.exp(-Math.min(50,dt)/65));}
function chartPoint(row,index,count){return [48+index/Math.max(1,count-1)*624,226-row.extent/9*194];}
const api={chapters,opening,frameAt,progressAt,chartPoint,clamp,ease,follow,waypoints:keys.map(k=>k[0])};
if(typeof module==='object'&&module.exports)module.exports=api;else host.ArcticModel=api;
})(globalThis);
