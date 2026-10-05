/* Time to Save — local vision engine (TinyCLIP ViT-40M/32, MIT) on TensorFlow.js */
(function(){"use strict";
/* ---------- local vision engine: TinyCLIP ViT-40M/32 on TF.js (runs in the browser) ---------- */
window.Vision=(()=>{
 let W=null,M=null,TX={},loading=null,backend="";
 const MEAN=[0.48145466,0.4578275,0.40821073],STD=[0.26862954,0.26130258,0.27577711];
 function f16(u){const o=new Float32Array(u.length);for(let i=0;i<u.length;i++){const h=u[i],s=(h&0x8000)?-1:1,e=(h>>10)&31,m=h&1023;o[i]=e===0?s*m*5.960464477539063e-8:e===31?(m?NaN:s*Infinity):s*Math.pow(2,e-15)*(1+m/1024)}return o}
 function script(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("script"));document.head.appendChild(s)})}
 async function init(onProgress){
  if(W)return;if(loading)return loading;
  loading=(async()=>{
   if(!window.tf){try{await script("lib/tf.min.js")}catch(e){await script("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js")}}
   try{await tf.setBackend("webgl")}catch(e){}
   if(tf.getBackend()!=="webgl")await tf.setBackend("cpu");
   await tf.ready();backend=tf.getBackend();
   const r=await fetch("models/clip.json");if(!r.ok)throw Object.assign(new Error("model"),{code:"model_missing"});
   M=await r.json();
   const buf=new Uint8Array(M.bytes);let off=0;
   for(let i=0;i<M.shards.length;i++){const rr=await fetch("models/"+M.shards[i]);if(!rr.ok)throw Object.assign(new Error("model"),{code:"model_missing"});const b=new Uint8Array(await rr.arrayBuffer());buf.set(b,off);off+=b.length;onProgress&&onProgress((i+1)/M.shards.length)}
   const w={};
   for(const t of M.tensors){
    const n=t.shape.reduce((a,b)=>a*b,1);let f;
    if(t.dtype==="int8"){const q=new Int8Array(buf.buffer,t.offset,n),cols=t.shape[t.shape.length-1],sc=new Float32Array(buf.buffer,t.scaleOffset,cols);f=new Float32Array(n);for(let i=0;i<n;i++)f[i]=q[i]*sc[i%cols]}
    else f=f16(new Uint16Array(buf.buffer,t.offset,n));
    if(t.name.startsWith("t."))TX[t.name.slice(2)]={d:f,n:t.shape[0]};else w[t.name]=tf.tensor(f,t.shape);
   }
   W=w;
  })();
  try{await loading}catch(e){loading=null;throw e}
 }
 function ln(x,g,b){const m=tf.moments(x,-1,true);return x.sub(m.mean).div(m.variance.add(1e-5).sqrt()).mul(g).add(b)}
 function gelu(x){return x.mul(0.5).mul(tf.tanh(x.add(x.pow(3).mul(0.044715)).mul(0.7978845608028654)).add(1))}
 function encode(batch){return tf.tidy(()=>{
  const B=batch.shape[0],D=512,H=8,L=50;
  let x=tf.conv2d(batch,W.conv,32,"valid").reshape([B,49,D]);
  x=tf.concat([W.class_embedding.reshape([1,1,D]).tile([B,1,1]),x],1).add(W.positional_embedding);
  x=ln(x,W["ln_pre.weight"],W["ln_pre.bias"]);
  const heads=t=>t.reshape([B,L,H,64]).transpose([0,2,1,3]).reshape([B*H,L,64]);
  for(let i=0;i<12;i++){
   const g=k=>W[i+"."+k];
   let h=ln(x,g("ln_1.weight"),g("ln_1.bias")).reshape([B*L,D]);
   const [q,k,v]=tf.split(tf.matMul(h,g("attn.in_proj_weight")).add(g("attn.in_proj_bias")),3,1);
   const a=tf.softmax(tf.matMul(heads(q),heads(k),false,true).mul(0.125));
   let o=tf.matMul(a,heads(v)).reshape([B,H,L,64]).transpose([0,2,1,3]).reshape([B*L,D]);
   x=x.add(tf.matMul(o,g("attn.out_proj.weight")).add(g("attn.out_proj.bias")).reshape([B,L,D]));
   h=ln(x,g("ln_2.weight"),g("ln_2.bias")).reshape([B*L,D]);
   h=gelu(tf.matMul(h,g("mlp.c_fc.weight")).add(g("mlp.c_fc.bias")));
   x=x.add(tf.matMul(h,g("mlp.c_proj.weight")).add(g("mlp.c_proj.bias")).reshape([B,L,D]));
  }
  let c=ln(x.slice([0,0,0],[B,1,D]).reshape([B,D]),W["ln_post.weight"],W["ln_post.bias"]);
  c=tf.matMul(c,W.proj);
  return c.div(c.norm("euclidean",-1,true));
 })}
 const cv=document.createElement("canvas");cv.width=cv.height=224;const cx=cv.getContext("2d",{willReadFrequently:true});
 function cropTensor(img,sx,sy,s){
  cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality="high";cx.drawImage(img,sx,sy,s,s,0,0,224,224);
  return tf.tidy(()=>tf.browser.fromPixels(cv).toFloat().div(255).sub(MEAN).div(STD));
 }
 function sharpness(){const d=cx.getImageData(0,0,224,224).data,g=new Float32Array(224*224);for(let i=0;i<g.length;i++)g[i]=d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114;let s=0,s2=0,n=0;for(let y=1;y<223;y++)for(let x=1;x<223;x++){const i=y*224+x,l=4*g[i]-g[i-1]-g[i+1]-g[i-224]-g[i+224];s+=l;s2+=l*l;n++}const m=s/n;return s2/n-m*m}
 const dot=(e,T,r)=>{let s=0;const o=r*512;for(let j=0;j<512;j++)s+=e[j]*T.d[o+j];return s};
 function sims(e,name){const T=TX[name],out=[];for(let r=0;r<T.n;r++)out.push(dot(e,T,r));return out}
 const lse=a=>{const m=Math.max(...a);return m+Math.log(a.reduce((s,x)=>s+Math.exp(x-m),0))};
 function softmax(a){const m=Math.max(...a),e=a.map(x=>Math.exp(x-m)),s=e.reduce((x,y)=>x+y,0);return e.map(x=>x/s)}
 function kinds(e){const l=["dog","cat","none"].map(k=>lse(sims(e,"kinds."+k).map(x=>x*100)));const p=softmax(l);return {dog:p[0],cat:p[1],none:p[2]}}
 function loadImg(src){return new Promise((res,rej)=>{const i=new Image();if(/^https?:/.test(src))i.crossOrigin="anonymous";i.onload=()=>res(i);i.onerror=rej;i.src=src})}
 async function analyze(src){
  const img=typeof src==="string"?await loadImg(src):src;const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,s=Math.min(w,h);
  const C=[[(w-s)/2,(h-s)/2,s]];
  if(w>h*1.15)C.push([0,0,h],[w-h,0,h]);else if(h>w*1.15)C.push([0,0,w],[0,h-w,w]);
  const s2=s*0.62,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const small=backend!=="webgl";
  for(const [fx,fy] of (small?[[.5,.5]]:[[.5,.5],[.22,.28],[.78,.28],[.22,.72],[.78,.72]]))C.push([cl(fx*w-s2/2,0,w-s2),cl(fy*h-s2/2,0,h-s2),s2]);
  const batch=tf.stack(C.map(c=>cropTensor(img,...c)));
  const E=encode(batch);batch.dispose();const emb=await E.array();E.dispose();
  const K=emb.map(kinds);
  let bi=0;K.forEach((k,i)=>{if((k.dog+k.cat)>(K[bi].dog+K[bi].cat)+(bi===0?0.04:0))bi=i});
  cropTensor(img,...C[bi]).dispose();const sharp=sharpness();
  const e=emb[bi],k=K[bi],cat=k.cat/(k.dog+k.cat+1e-9);
  const sp="dog";
  const col=softmax(sims(e,"col."+sp).map(x=>x*100)),age=softmax(sims(e,"age."+sp).map(x=>x*100));
  return {emb:e,pAnimal:k.dog+k.cat,pCat:cat,color:col,age,sharp,crop:bi};
 }
 return {init,analyze,encode,get ready(){return !!W},get backend(){return backend},get meta(){return M},_tx:()=>TX,_w:()=>W};
})();


})();
