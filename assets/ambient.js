/* The original Animorio three-colour WebGL shader and three differential spring constants,
   adapted to an unobstructed website canvas. Source: user supplied three-coloured-lights...
   License: ANIMORIO-LICENSE.txt. The shader itself is retained unmodified. */
(() => {
  'use strict';
  const canvas=document.getElementById('ambientCanvas'),stage=document.querySelector('.ambient');
  if(!canvas||!stage)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touchScreen=matchMedia('(hover: none), (pointer: coarse)').matches;
  const VERT = 'attribute vec2 a; void main() { gl_Position = vec4(a, 0., 1.); }';
  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uDpr;
uniform vec2 uA;
uniform vec2 uB;
uniform vec2 uC;
uniform float uSize;
uniform float uI;
uniform float uFlash;
uniform float uRing;
uniform vec2 uRingC;
uniform float uTime;
uniform float uGrain;
uniform float uGrid;
uniform float uExpo;
uniform vec3 uCa;
uniform vec3 uCb;
uniform vec3 uCc;
uniform vec3 uPage;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
/* one soft light: a gaussian heart and a long exponential tail, gently breathing out of round */
float lamp(vec2 q, float s, float k) {
  q *= vec2(1. + .05 * sin(uTime * .6 + k), 1. + .05 * cos(uTime * .5 + k * 1.7));
  float d2 = dot(q, q);
  return exp(-d2 / (2. * s * s)) * .8 + exp(-sqrt(d2) / (s * 1.3)) * .14;
}

void main() {
  vec2 p = gl_FragCoord.xy / uDpr;
  p.y = uRes.y - p.y;
  p -= uRes * .5;
  float s = uSize;

  vec3 col = uCa * lamp(p - uA, s, 0.) + uCb * lamp(p - uB, s, 2.1) + uCc * lamp(p - uC, s, 4.2);

  /* the press: a white bloom on the button and a thin ring that runs out over the page */
  vec2 rq = p - uRingC;
  float rr = length(rq);
  col += vec3(1.) * uFlash * (exp(-rr * rr / (2. * 34. * 34.)) * 1.1 + exp(-rr / 120.) * .35);
  float R = uRing * length(uRes) * .62;
  float ring = exp(-(rr - R) * (rr - R) / (2. * 2.2 * 2.2)) * (1. - uRing) * (1. - uRing) * step(.001, uRing);
  float ang = atan(rq.y, rq.x);
  vec3 ringCol = mix(mix(uCa, uCb, .5 + .5 * sin(ang)), uCc, .5 + .5 * cos(ang * 1.5));
  col += mix(ringCol, vec3(1.), .45) * ring * .9;

  col *= uI;
  col = 1. - exp(-col * uExpo);
  float lum = dot(col, vec3(.3, .5, .2));

  /* the thin grid, lit only where the light falls */
  vec2 g = abs(fract(p / 44. - .5) - .5) * 44.;
  float line = max(1. - smoothstep(0., 1.1, g.x), 1. - smoothstep(0., 1.1, g.y));
  float fade = 1. - smoothstep(.25, .75, length(p / uRes));
  col += vec3(line * (.01 + .09 * lum) * uGrid * fade);

  /* a soft vignette, the page under it, then the grain */
  col *= 1. - .45 * smoothstep(.3, .85, length(p / uRes));
  col = 1. - (1. - uPage) * (1. - col);
  float n = hash(gl_FragCoord.xy + floor(uTime * 24.) * 17.31) - .5;
  col += n * uGrain * (.35 + lum);
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}`;

  let gl = null;
  const U = {};
  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: false });
  } catch (e) {
    gl = null;
  }
  if (gl) {
    try {
      const sh = (type, src) => {
        const o = gl.createShader(type);
        gl.shaderSource(o, src);
        gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
        return o;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uRes', 'uDpr', 'uA', 'uB', 'uC', 'uSize', 'uI', 'uFlash', 'uRing', 'uRingC', 'uTime', 'uGrain', 'uGrid', 'uExpo',
        'uCa', 'uCb', 'uCc', 'uPage'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    } catch (e) {
      gl = null;
    }
  }

  // Keep the moving CSS lamps available if WebGL is unavailable or lost during a touch.
  if (!gl) stage.classList.add('no-gl');
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); gl=null; stage.classList.add('no-gl'); canvas.style.visibility='hidden';
  }, {passive:false});
  // Continue in the CSS renderer after a loss instead of reusing invalid GPU resources.
  canvas.addEventListener('webglcontextrestored', () => {
    stage.classList.add('no-gl'); canvas.style.visibility='hidden';
  });
  const pools=[...stage.querySelectorAll('.ambient-pools i')];
  // Exact light colours from the source; theme affects underlying page rather than overwriting the RGB lamps.
  const COLORS=[[1,.3098,.4157],[.2392,1,.6353],[.2902,.4196,1]];
  let PAGE=[.02745,.02745,.0392];
  function syncTheme(){const el=document.createElement('span');el.style.background='var(--page)';document.body.appendChild(el);const str=getComputedStyle(el).backgroundColor;el.remove();const match=str.match(/[\d.]+/g);if(match?.length>=3)PAGE=[+match[0]/255,+match[1]/255,+match[2]/255]}
  syncTheme();window.addEventListener('ik-theme-change',syncTheme);
  let W=0,H=0,M=0,dpr=1;
  function resize(){W=stage.clientWidth;H=stage.clientHeight;M=Math.min(W,H);dpr=Math.min(devicePixelRatio||1,touchScreen?1.15:(W*H>900000?1.25:1.5));if(gl){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);gl.viewport(0,0,canvas.width,canvas.height)}}
  resize();window.addEventListener('resize',resize,{passive:true});
  // Original: STIFFNESS=150, DAMPING=15, LAG=.4, SPREAD=.27, SIZE=.2
  const stiffness=150,damping=15,lag=.4,spread=.27,size=.2;
  const K=[1+lag*.9,1,1-lag*.75];
  const lamps=[0,1,2].map(()=>({x:0,y:0,vx:0,vy:0}));
  const goal={x:0,y:0,spread:1,i:1};
  let turning=-Math.PI/2,last=performance.now(),t=0,first=performance.now(),mouseUntil=0,intro=0;
  const pos={x:0,y:0};
  let touchHeld=false, lastTouch=0;
  function move(e){
    // Touch.clientX/clientY are inherited, non-enumerable DOM properties.
    // Never spread a Touch object: doing so produces undefined coordinates, then NaN springs.
    if(!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;
    const touch=e.pointerType==='touch'||e.pointerType==='pen'||touchScreen;
    mouseUntil=performance.now()+(touch?1500:3000);
    // On small screens don't sweep the lamps away from the viewport when tapping the edge:
    // the original full-strength mouse-follow is retained for desktops.
    const follow=touch?.36:1;
    goal.x=Math.max(-W*.19,Math.min(W*.19,(e.clientX-W/2)*follow));
    goal.y=Math.max(-H*.19,Math.min(H*.19,(e.clientY-H/2)*follow));
    goal.spread=touch?.78:.30;
    goal.i=1;
    if(touch)lastTouch=performance.now();
  }
  document.addEventListener('pointermove',move,{passive:true});
  document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')touchHeld=true;move(e)},{passive:true});
  document.addEventListener('pointerup',()=>touchHeld=false,{passive:true});
  document.addEventListener('pointercancel',()=>touchHeld=false,{passive:true});
  document.addEventListener('touchstart',e=>{if(e.touches[0]){touchHeld=true;move({clientX:e.touches[0].clientX,clientY:e.touches[0].clientY,pointerType:'touch'});}},{passive:true});
  document.addEventListener('touchmove',e=>{if(e.touches[0])move({clientX:e.touches[0].clientX,clientY:e.touches[0].clientY,pointerType:'touch'})},{passive:true});
  document.addEventListener('touchend',()=>touchHeld=false,{passive:true});
  window.addEventListener('blur',()=>{mouseUntil=0});
  let lastPaint=0;
  function render(now){requestAnimationFrame(render);if(document.hidden||document.documentElement.dataset.theme==='light'){last=now;return}if(touchScreen&&now-lastPaint<32)return;lastPaint=now;const dt=Math.min((now-last)/1000,1/30);last=now;t+=dt;turning+=dt*.32;intro=Math.min(1,intro+dt*.8);
    // Source example's idle choreography: three lamp centres orbit and periodically blend to white.
    if(now>mouseUntil){const age=(now-first)/1000,period=age%12;
      const theta=age*.3;
      goal.x=Math.sin(theta)*Math.min(120,W*.15);
      goal.y=Math.cos(theta*.63)*Math.min(75,H*.11);
      goal.spread=period>4&&period<7?.035:.85;
      goal.i=1;
    }
    const radius=spread*M*goal.spread;
    for(let k=0;k<3;k++){
      const l=lamps[k],angle=turning+k*(Math.PI*2/3),gx=goal.x+Math.cos(angle)*radius,gy=goal.y+Math.sin(angle)*radius*.86;
      if(reduce){l.x=gx;l.y=gy}else{const st=stiffness*K[k],dm=damping*Math.sqrt(K[k]);for(let i=0;i<2;i++){const h=dt/2;l.vx+=(st*(gx-l.x)-dm*l.vx)*h;l.vy+=(st*(gy-l.y)-dm*l.vy)*h;l.x+=l.vx*h;l.y+=l.vy*h}}
    }
    if(gl){
      gl.uniform2f(U.uRes,W,H);gl.uniform1f(U.uDpr,dpr);
      gl.uniform2f(U.uA,lamps[0].x,lamps[0].y);gl.uniform2f(U.uB,lamps[1].x,lamps[1].y);gl.uniform2f(U.uC,lamps[2].x,lamps[2].y);
      gl.uniform1f(U.uSize,size*M);gl.uniform1f(U.uI,intro);
      gl.uniform1f(U.uFlash,0);gl.uniform1f(U.uRing,0);gl.uniform2f(U.uRingC,0,0);
      gl.uniform1f(U.uTime,t);gl.uniform1f(U.uGrain,.035);gl.uniform1f(U.uGrid,1);gl.uniform1f(U.uExpo,.95);
      gl.uniform3fv(U.uCa,COLORS[0]);gl.uniform3fv(U.uCb,COLORS[1]);gl.uniform3fv(U.uCc,COLORS[2]);gl.uniform3fv(U.uPage,PAGE);
      gl.drawArrays(gl.TRIANGLES,0,3);
    }else pools.forEach((p,k)=>{p.style.left=(W/2+lamps[k].x)+'px';p.style.top=(H/2+lamps[k].y)+'px'});
  }
  requestAnimationFrame(render);
})();
