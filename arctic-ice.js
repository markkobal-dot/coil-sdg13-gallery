/* Organic, deterministic ice geometry shared by the renderer and geometry checks. */
(function(host){
  'use strict';
  const mix=(a,b,t)=>a+(b-a)*t;
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453123;return n-Math.floor(n);};
  function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);}
  function fbm(x,y){let value=0,amplitude=.55;for(let i=0;i<4;i++){value+=amplitude*noise(x,y);x=x*2.03+11.7;y=y*2.03-7.1;amplitude*=.47;}return value;}
  const seam=z=>.8*Math.sin(z*.37)+.35*Math.sin(z*.92)+.14*Math.sin(z*2.43);
  const top=(x,z)=>.4+.48*(fbm(x*.32,z*.32)-.45)+.23*Math.pow(Math.abs(noise(x*.55,z*.55)*2-1),5)+.28*Math.exp(-Math.pow((x+8+1.6*Math.sin(z*.24))/1.1,2))*(.4+fbm(z*.3,4));
  function outerCurve(points,samples=240){
    const result=[];
    for(let j=1;j<samples;j++){
      const f=j/samples*(points.length-1),i=Math.min(points.length-2,Math.floor(f)),t=f-i;
      const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
      result.push([0,1].map(d=>.5*((2*p1[d])+(-p0[d]+p2[d])*t+(2*p0[d]-5*p1[d]+4*p2[d]-p3[d])*t*t+(-p0[d]+3*p1[d]-3*p2[d]+p3[d])*t*t*t)));
    }return result;
  }
  function outline(side){
    const shared=Array.from({length:161},(_,i)=>{const z=14-i*.2;return [seam(z),z];});
    if(side===0)return [...shared,...outerCurve([shared.at(-1),[-6,-20],[-14,-20.5],[-20.5,-14],[-23,-6],[-21.5,3],[-17,11],[-9,15],shared[0]])];
    return [...shared].reverse().concat(outerCurve([shared[0],[8,16],[17,12],[22,4],[23,-5],[19,-14],[11,-20],shared.at(-1)]));
  }
  function build(side,quality=1){
    const ring=outline(side),n=ring.length,center=[side===0?-11.5:11.5,-1],radials=quality===1?44:24,positions=[],colors=[],uv=[],indices=[];
    const distance=[0];for(let j=1;j<=n;j++)distance.push(distance[j-1]+Math.hypot(ring[j%n][0]-ring[j-1][0],ring[j%n][1]-ring[j-1][1]));
    const push=(x,y,z,c,u,v)=>{positions.push(x,y,z);colors.push(...c);uv.push(u,v);};
    push(center[0],top(...center),center[1],[.88,.94,.94],center[0]*.15,center[1]*.15);
    for(let r=1;r<=radials;r++)for(let j=0;j<n;j++){
      const t=r/radials,x=mix(center[0],ring[j][0],t),z=mix(center[1],ring[j][1],t),weather=fbm(x*.27,z*.27),c=.89+weather*.1;
      push(x,top(x,z),z,[c,c+.035,c+.03],x*.15,z*.15);
    }
    for(let j=0;j<n;j++)indices.push(0,1+j,1+(j+1)%n);
    for(let r=1;r<radials;r++)for(let j=0;j<n;j++){
      const a=1+(r-1)*n+j,b=1+(r-1)*n+(j+1)%n,c=1+r*n+j,d=1+r*n+(j+1)%n;indices.push(a,c,b,b,c,d);
    }
    const topCount=indices.length,wallStart=positions.length/3,layers=quality===1?40:24;
    const stride=n+1;
    // Duplicate the closing vertex so the UV seam does not stretch the entire texture into one triangle.
    for(let k=0;k<=layers;k++)for(let j=0;j<=n;j++){
      const t=k/layers,p=ring[j%n],depth=2.1+.45*fbm(p[0]*.35,p[1]*.35),taper=1-.17*Math.pow(t,1.4),rough=Math.sin(t*Math.PI)*(.07*Math.sin(p[0]*2.3+p[1]*1.8+t*17)+.06*Math.sin(p[1]*4.1+t*9));
      const x=center[0]+(p[0]-center[0])*taper+rough,z=center[1]+(p[1]-center[1])*taper+rough*.6,y=mix(top(...p),-depth,t),blue=Math.min(1,t*3),shade=.98-.28*t;
      push(x,y,z,[mix(.91,.27,blue)*shade,mix(.97,.66,blue)*shade,mix(.97,.79,blue)*shade],distance[j]/3,y*.5);
    }
    for(let k=0;k<layers;k++)for(let j=0;j<n;j++){
      const a=wallStart+k*stride+j,b=a+1,c=a+stride,d=c+1;indices.push(a,d,b,a,c,d);
    }
    const bottom=positions.length/3;push(center[0],-2.5,center[1],[.16,.39,.47],0,0);
    for(let j=0;j<n;j++)indices.push(bottom,wallStart+layers*stride+j+1,wallStart+layers*stride+j);
    return {positions,colors,uv,indices,topCount,ring,center};
  }
  const api={noise,fbm,seam,top,outline,build};if(typeof module==='object'&&module.exports)module.exports=api;else host.ArcticIce=api;
})(globalThis);
