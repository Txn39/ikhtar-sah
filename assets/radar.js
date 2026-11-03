/* Source adaptation: user-supplied Animorio "Radar chart of AI models compared".
   Original geometry, 150/13 vertex spring, stagger, beam and glass tooltip are retained,
   but data is supplied by IK.rate(phones.json) rather than fictional scores. */
(() => {
  'use strict';
  let destroy=()=>{};
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS='http://www.w3.org/2000/svg';
  const make=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  window.IK=window.IK||{};
  window.IK.renderRadar=(a,b)=>{
    destroy();
    const card=document.querySelector('[data-radar-card]');if(!card)return;
    const stage=card.querySelector('[data-radar-stage]'),svg=card.querySelector('[data-svg]'),ringsG=card.querySelector('[data-rings]'),axesG=card.querySelector('[data-axes]'),beamG=card.querySelector('[data-beam]'),wedge=card.querySelector('[data-wedge]'),base=card.querySelector('[data-base]'),glow=card.querySelector('[data-glow]'),fill=card.querySelector('[data-fill]'),line=card.querySelector('[data-line]'),dotsG=card.querySelector('[data-dots]'),halo=card.querySelector('[data-halo]'),labelsG=card.querySelector('[data-labels]'),tip=card.querySelector('[data-tip]');
    const labels=window.IK.METRICS.slice(),N=labels.length,R=100;
    const scoreA=window.IK.rate(a),scoreB=window.IK.rate(b);
    const MAIN=labels.map(n=>scoreA[n]*10),BASE=labels.map(n=>scoreB[n]*10);
    if([...MAIN,...BASE].some(x=>x==null||!Number.isFinite(x)))return;
    card.querySelector('#radarNameA').textContent=a.name;
    card.querySelector('#radarNameB').textContent=b.name;
    card.querySelector('#legendA').textContent=a.name;
    card.querySelector('#legendB').textContent=b.name;
    const dir=i=>{const ang=i/N*Math.PI*2;return {x:Math.sin(ang),y:-Math.cos(ang)}};
    const at=(i,r)=>{const p=dir(i);return `${(p.x*r).toFixed(2)} ${(p.y*r).toFixed(2)}`};
    const polygon=rad=>labels.map((_,i)=>(i?'L':'M')+at(i,rad)).join('')+'Z';
    const WEDGE=22*Math.PI/180,x=Math.sin(WEDGE)*108,y=-Math.cos(WEDGE)*108;
    wedge.setAttribute('d',`M0 0L${-x} ${y}A108 108 0 0 1 ${x} ${y}Z`);
    ringsG.replaceChildren();axesG.replaceChildren();dotsG.replaceChildren();labelsG.replaceChildren();
    const rings=[];for(let j=5;j>=1;j--){const path=make('path',{d:polygon(R*j/5),'pathLength':1});ringsG.prepend(path);rings.push(path)}
    for(let i=0;i<N;i++){axesG.append(make('line',{x1:0,y1:0,x2:dir(i).x*R,y2:dir(i).y*R,'pathLength':1}));dotsG.append(make('circle',{class:'radar-dot',r:2.2}));}
    const dots=[...dotsG.children],labs=[];
    const main=labels.map(()=>({v:0,t:0,vel:0})),other=labels.map(()=>({v:0,t:0,vel:0}));
    const beam={a:0,v:0,t:0,i:0,vi:0,ti:0},pos={x:0,y:0,vx:0,vy:0,gx:0,gy:0,init:false};
    let raf=0,last=performance.now(),cx=0,cy=0,scale=1,active=-1,autoTimer=0,userUntil=0,alive=true,visible=true;
    labs.push(...labels.map((label,i)=>{
      const d=dir(i),btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.className='radar-lab '+(Math.abs(d.x)<.1?(d.y<0?'t':'b'):(d.x>0?'r':'l'));
      btn.addEventListener('pointerenter',()=>activate(i,true));btn.addEventListener('focus',()=>activate(i,true));btn.addEventListener('pointerdown',()=>activate(i,true));labelsG.append(btn);return btn
    }));
    function measure(){const w=stage.clientWidth,h=stage.clientHeight,side=Math.max(70,Math.min(w-12,h-32));scale=side/236;cx=w/2;cy=h/2;svg.style.width=side+'px';svg.style.height=side+'px';svg.style.left=(cx-side/2)+'px';svg.style.top=(cy-side/2)+'px';labs.forEach((el,i)=>{const d=dir(i),r=(R+12)*scale+5;el.style.left=(cx+d.x*r)+'px';el.style.top=(cy+d.y*r)+'px'});pos.init=false}
    const txt=card.querySelector('#tipName'),tipA=card.querySelector('#tipA'),tipB=card.querySelector('#tipB');
    function activate(i,fromUser=false){if(fromUser)userUntil=performance.now()+3700;if(i===active)return;active=i;labs.forEach((el,k)=>el.classList.toggle('is-active',k===i));beam.ti=i>=0?1:0;if(i<0)return;
      const angle=i/N*360;beam.t+=((angle-beam.t+540)%360)-180;
      txt.textContent=labels[i];tipA.textContent=(MAIN[i]/10).toFixed(1)+' / 10';tipB.textContent=(BASE[i]/10).toFixed(1)+' / 10 — '+b.name;
    }
    const mouse=e=>{
      const rect=stage.getBoundingClientRect(),x=e.clientX-(rect.left+cx),y=e.clientY-(rect.top+cy),d=Math.hypot(x,y);
      if(d<(R+32)*scale&&d>8){let deg=Math.atan2(x,-y)*180/Math.PI;if(deg<0)deg+=360;activate(Math.round(deg/(360/N))%N,true)}else if(performance.now()<userUntil)activate(-1,true);
    };
    const leave=()=>{userUntil=performance.now()+1700;activate(-1,false)};
    stage.addEventListener('pointermove',mouse,{passive:true});stage.addEventListener('pointerleave',leave);
    const vis=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting},{threshold:0});vis.observe(stage);
    const resize=new ResizeObserver(measure);resize.observe(stage);measure();
    function poly(series){return series.map((s,i)=>(i?'L':'M')+at(i,R*clamp(s.v/100,0,1))).join('')+'Z'}
    function frame(now){if(!alive)return;raf=requestAnimationFrame(frame);if(!visible||document.hidden){last=now;return}const dt=Math.min((now-last)/1000,1/30);last=now;
      if(!reduce){const autoTime=now/1000;if(now>userUntil&&Math.floor(autoTime/2.2)!==autoTimer){autoTimer=Math.floor(autoTime/2.2);activate(autoTimer%N,false)}}
      for(let z=0;z<(reduce?1:3);z++){
        const h=dt/(reduce?1:3);
        [...main,...other].forEach(s=>{if(reduce){s.v=s.t;return}s.vel+=(150*(s.t-s.v)-13*s.vel)*h;s.v+=s.vel*h});
        if(reduce){beam.a=beam.t;beam.i=beam.ti}else{
          beam.v+=(120*(beam.t-beam.a)-15*beam.v)*h;beam.a+=beam.v*h;
          beam.vi+=(90*(beam.ti-beam.i)-17*beam.vi)*h;beam.i+=beam.vi*h;
        }
      }
      const d=poly(main);line.setAttribute('d',d);fill.setAttribute('d',d);glow.setAttribute('d',d);base.setAttribute('d',poly(other));
      main.forEach((s,i)=>{const p=dir(i),r=R*clamp(s.v/100,0,1);dots[i].setAttribute('cx',p.x*r);dots[i].setAttribute('cy',p.y*r);dots[i].setAttribute('r',i===active?'3.2':'2.2')});
      beamG.setAttribute('transform',`rotate(${beam.a.toFixed(2)})`);beamG.style.opacity=clamp(beam.i,0,1).toFixed(3);
      if(active>=0){const p=dir(active),r=R*clamp(main[active].v/100,0,1),vx=p.x*r,vy=p.y*r;
        halo.setAttribute('cx',vx);halo.setAttribute('cy',vy);
        const px=cx+vx*scale,py=cy+vy*scale,tw=tip.offsetWidth,th=tip.offsetHeight;
        pos.gx=clamp(Math.abs(p.x)<.1?px-tw/2:p.x>0?px-tw-12:px+12,0,Math.max(0,stage.clientWidth-tw));
        pos.gy=clamp(Math.abs(p.x)<.1?(p.y<0?py+12:py-th-12):py-th/2,0,Math.max(0,stage.clientHeight-th));
        if(!pos.init){pos.x=pos.gx;pos.y=pos.gy;pos.init=true}
      }
      for(let i=0;i<2;i++){const h=dt/2;pos.vx+=(170*(pos.gx-pos.x)-20*pos.vx)*h;pos.vy+=(170*(pos.gy-pos.y)-20*pos.vy)*h;pos.x+=pos.vx*h;pos.y+=pos.vy*h}
      tip.style.transform=`translate(${pos.x.toFixed(1)}px,${pos.y.toFixed(1)}px)`;tip.style.opacity=clamp(beam.i,0,1);halo.style.opacity=clamp(beam.i,0,.6)
    }
    const start=performance.now();
    ringsG.querySelectorAll('path').forEach((r,i)=>{r.style.strokeDasharray='1 1';r.style.strokeDashoffset='1';setTimeout(()=>{if(!alive)return;r.style.transition=reduce?'none':'stroke-dashoffset .9s ease';r.style.strokeDashoffset='0'},100+i*70)});
    axesG.querySelectorAll('line').forEach((r,i)=>{r.style.strokeDasharray='1 1';r.style.strokeDashoffset='1';setTimeout(()=>{if(!alive)return;r.style.transition=reduce?'none':'stroke-dashoffset .6s ease';r.style.strokeDashoffset='0'},300+i*50)});
    for(let i=0;i<N;i++)setTimeout(()=>{if(!alive)return;main[i].t=MAIN[i];other[i].t=BASE[i]},reduce?0:800+i*70);
    raf=requestAnimationFrame(frame);
    destroy=()=>{alive=false;cancelAnimationFrame(raf);vis.disconnect();resize.disconnect();stage.removeEventListener('pointermove',mouse);stage.removeEventListener('pointerleave',leave)};
  };
})();
