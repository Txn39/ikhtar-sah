/* Coloured fog (light theme) from the user-supplied Animorio original.
   Original GLSL shader, cloud formulae, colours, and pointer spring preserved.
   Embedded into the existing site without the example's unrelated Hush page UI.
   License: ANIMORIO-LICENSE.txt. No external animation dependencies required. */
(() => {
  'use strict';
  const stage = document.querySelector('.ambient');
  const canvas = document.getElementById('fogCanvas');
  if (!stage || !canvas) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touchScreen = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const isLight = () => document.documentElement.dataset.theme === 'light';
  const GIRO = 22, NUVOLE = 0.4, DENSA = 0.85, STORTA = 70, GRANA = 0.035, CALMA = 0.32, SEGUE = 0.35;
  const TAU = Math.PI * 2, clamp = (min,max,v) => Math.min(max,Math.max(min,v));
  // Exact fragment shader from the original coloured-fog-background example.
  const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uT;
uniform float uSale;
uniform vec3 uCarta;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec2 uPa;
uniform vec2 uPb;
uniform vec2 uPc;
uniform vec3 uRaggi;
uniform vec4 uTesto;
uniform float uStorta;
uniform float uDensa;
uniform float uCalma;
uniform float uGrana;

float caso(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
float nuvola(vec2 q, vec2 c, float r) {
  vec2 d = q - c;
  return exp(-dot(d, d) / (r * r));
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;

  /* lo spazio storto da due onde lente: i bordi delle nuvole si sfrangiano come fumo */
  vec2 q = px + uStorta * vec2(
    sin(px.y / 310.0 + uT + 0.8 * sin(px.x / 420.0 - uT)),
    sin(px.x / 360.0 - 2.0 * uT + 0.7 * sin(px.y / 280.0 + uT))
  );

  /* dietro al titolo la nebbia si fa più leggera */
  float e = length((px - uTesto.xy) / uTesto.zw);
  float calma = mix(1.0 - uCalma, 1.0, smoothstep(0.6, 1.35, e));
  float k = uDensa * uSale * calma;

  vec3 col = uCarta;
  col = mix(col, uC, nuvola(q, uPc, uRaggi.z) * k);
  col = mix(col, uA, nuvola(q, uPa, uRaggi.x) * k);
  col = mix(col, uB, nuvola(q, uPb, uRaggi.y) * k);

  /* la grana: ferma, fine, toglie anche le righe delle sfumature */
  col += (caso(gl_FragCoord.xy) - 0.5) * uGrana;
  gl_FragColor = vec4(col, 1.0);
}`;
  let gl = null, program = null;
  const U = {};
  try { gl = canvas.getContext('webgl', {antialias:false, alpha:false, premultipliedAlpha:false, preserveDrawingBuffer:false}); } catch(e) {}
  if (gl) {
    try {
      const shader=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VERT));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(program);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const a=gl.getAttribLocation(program,'aPos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      ['uRes','uDpr','uT','uSale','uCarta','uA','uB','uC','uPa','uPb','uPc','uRaggi','uTesto','uStorta','uDensa','uCalma','uGrana'].forEach(n=>U[n]=gl.getUniformLocation(program,n));
    } catch(e) {program=null;}
  }
  if(!program){stage.classList.add('fog-no-gl'); canvas.style.visibility='hidden';}
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();program=null;stage.classList.add('fog-no-gl');canvas.style.visibility='hidden';
  },{passive:false});
  canvas.addEventListener('webglcontextrestored',()=>{
    // The previous shaders/buffers are invalid after a context loss; use the live CSS fallback.
    program=null;stage.classList.add('fog-no-gl');canvas.style.visibility='hidden';
  });
  // Original colours, warm paper, periwinkle, apricot and butter.
  const COLORS=[[244/255,241/255,234/255],[245/255,174/255,138/255],[168/255,182/255,242/255],[241/255,215/255,156/255]];
  const pools=[...stage.querySelectorAll('.fog-fallback i')];
  let W=1,H=1,dpr=1,needsRedraw=true,lastTime=0,elapsed=0,opening=0,openingTime=0,vis=true;
  const pointer={x:0,y:0,tx:0,ty:0,vx:0,vy:0,force:0,fv:0,inside:false};
  let touchUntil=0, recentTouch=false;
  const progress={x:0,y:0,rx:1,ry:1};
  function resize(){
    W=Math.max(1,stage.clientWidth);H=Math.max(1,stage.clientHeight);
    dpr=Math.min(devicePixelRatio||1,touchScreen?1.15:1.5);
    // Save battery on small displays without making the fog pixelated.
    if(W<600)dpr=Math.min(dpr,1.15);
    if(program){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);gl.viewport(0,0,canvas.width,canvas.height);}
    // The lightness reduction sits behind the central content, as in the source.
    progress.x=W*.5;progress.y=H*.47;progress.rx=Math.max(170,W*.27);progress.ry=Math.max(120,H*.22);
    needsRedraw=true;
  }
  resize();addEventListener('resize',resize,{passive:true});
  function aim(x,y,touch=false){
    // Smaller touch gestures must not drag all colour beyond the screen edge.
    const factor=touch?0.60:1;
    pointer.tx=W*.5+(clamp(0,W,x)-W*.5)*factor;
    pointer.ty=H*.5+(clamp(0,H,y)-H*.5)*factor;
    recentTouch=touch;
    if(!pointer.inside&&pointer.force<.015){pointer.x=pointer.tx;pointer.y=pointer.ty;}
    pointer.inside=true;
  }
  // Pointer follows on desktop and touch input. Never cancel page scroll.
  document.addEventListener('pointermove',e=>{if(!reduced)aim(e.clientX,e.clientY,e.pointerType==='touch'||touchScreen);},{passive:true});
  document.addEventListener('pointerdown',e=>{if(!reduced){aim(e.clientX,e.clientY,e.pointerType==='touch'||touchScreen);if(e.pointerType==='touch')touchUntil=performance.now()+1500;}},{passive:true});
  document.addEventListener('touchstart',e=>{if(!reduced&&e.touches[0]){aim(e.touches[0].clientX,e.touches[0].clientY,true);touchUntil=performance.now()+1500;}},{passive:true});
  document.addEventListener('touchmove',e=>{if(!reduced&&e.touches[0]){aim(e.touches[0].clientX,e.touches[0].clientY,true);touchUntil=performance.now()+1500;}},{passive:true});
  document.addEventListener('touchend',()=>{touchUntil=performance.now()+1100;},{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>pointer.inside=false);
  addEventListener('blur',()=>pointer.inside=false);
  document.addEventListener('visibilitychange',()=>{vis=!document.hidden;lastTime=0;});
  function draw(){
    const T=(elapsed%GIRO)/GIRO*TAU;
    const r=(W+H)/2*NUVOLE;
    const pa=[W*(.24+.12*Math.cos(T)),H*(.30+.12*Math.sin(2*T))];
    let pb=[W*(.78+.10*Math.cos(-T+1)),H*(.62+.14*Math.sin(-T+1))];
    const pc=[W*(.50+.20*Math.sin(T+2)),H*(.98+.06*Math.cos(2*T))];
    if(pointer.force>.001){const k=(recentTouch?.58:1)*SEGUE*pointer.force;pb=[pb[0]+(pointer.x-pb[0])*k,pb[1]+(pointer.y-pb[1])*k];}
    if(program){
      gl.uniform2f(U.uRes,canvas.width,canvas.height);gl.uniform1f(U.uDpr,dpr);gl.uniform1f(U.uT,T);gl.uniform1f(U.uSale,opening);
      gl.uniform3fv(U.uCarta,COLORS[0]);gl.uniform3fv(U.uA,COLORS[1]);gl.uniform3fv(U.uB,COLORS[2]);gl.uniform3fv(U.uC,COLORS[3]);
      gl.uniform2f(U.uPa,pa[0],pa[1]);gl.uniform2f(U.uPb,pb[0],pb[1]);gl.uniform2f(U.uPc,pc[0],pc[1]);
      gl.uniform3f(U.uRaggi,r*1.05,r*.9,r);
      gl.uniform4f(U.uTesto,progress.x,progress.y,progress.rx,progress.ry);
      gl.uniform1f(U.uStorta,STORTA);gl.uniform1f(U.uDensa,DENSA);gl.uniform1f(U.uCalma,CALMA);gl.uniform1f(U.uGrana,GRANA);
      gl.drawArrays(gl.TRIANGLES,0,3);
    } else {
      const pts=[pa,pb,pc];
      pools.forEach((p,i)=>{p.style.transform=`translate3d(${pts[i][0]}px,${pts[i][1]}px,0) translate(-50%,-50%)`;p.style.opacity=String(Math.min(.72,opening*.65));});
    }
  }
  let lastPaint=0;
  function frame(now){
    requestAnimationFrame(frame);
    // One active animated background per theme; pause the fog when dark.
    if(!isLight()||!vis){lastTime=now;needsRedraw=true;return;}
    if(touchScreen&&now-lastPaint<32)return;lastPaint=now;
    const dt=Math.min(lastTime?(now-lastTime)/1000:1/60,1/30);lastTime=now;
    if(touchUntil && now>touchUntil){touchUntil=0;pointer.inside=false;}
    if(reduced){if(needsRedraw){opening=1;draw();needsRedraw=false;}return;}
    elapsed+=dt;
    // Fade in exactly like the original source, with a 2.8s power2.inOut-like curve.
    openingTime=Math.min(2.8,openingTime+dt);const linear=openingTime/2.8;opening=linear<.5?2*linear*linear:1-Math.pow(-2*linear+2,2)/2;
    pointer.vx+=(14*(pointer.tx-pointer.x)-7*pointer.vx)*dt;
    pointer.vy+=(14*(pointer.ty-pointer.y)-7*pointer.vy)*dt;
    pointer.x+=pointer.vx*dt;pointer.y+=pointer.vy*dt;
    pointer.fv+=(8*((pointer.inside?1:0)-pointer.force)-5*pointer.fv)*dt;
    pointer.force=clamp(0,1,pointer.force+pointer.fv*dt);
    draw();needsRedraw=false;
  }
  // Keep animation alive while visible, but do not render while a different theme is active.
  requestAnimationFrame(frame);
  window.addEventListener('ik-theme-change',()=>{needsRedraw=true;lastTime=0;});
})();
