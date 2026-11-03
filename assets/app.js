/* Ikhtar Sah rebuild: one source of truth (phones.json), one navigation on every page.
   Animorio's navigation spring position and light behavior were adapted for a real multi-page phone catalog. */
(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IK=(window.IK=window.IK||{});
  let phonePromise;
  const norm=s=>String(s||'').toLowerCase().replace(/[\s\-_]+/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
  const normalizePhone=p=>({...p,search:[p.name,p.model,`${p.brand||''} ${p.model||''}`,...(p.aliases||[])].map(norm)});
  IK.load=()=>phonePromise ||= (location.protocol==='file:'&&window.IK_OFFLINE_PHONES?Promise.resolve(window.IK_OFFLINE_PHONES):fetch('phones.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})).then(data=>data.phones.map(normalizePhone));
  IK.find=(phones,q)=>!norm(q)?phones:phones.filter(p=>p.search.some(s=>s.includes(norm(q))));
  IK.price=p=>p.price_usd?`$${Number(p.price_usd).toLocaleString('en-US')}${p.price_iqd?' — '+Number(p.price_iqd).toLocaleString('en-US')+' د.ع':''}`:'السعر غير متوفر';
  IK.page=p=>p.id+'.html';
  IK.go=p=>{location.href=IK.page(p)};
  IK.METRICS=['الأداء','الشاشة','الكاميرات','البطارية','الشحن'];
  const clamp=n=>Math.max(0,Math.min(10,n));
  const value=(p,k)=>String(p.specs?.[k]||'');
  const num=(s,re)=>{const m=String(s).replace(/,/g,'').match(re);return m?Number(m[1]):null};
  IK.rate=p=>{
    const cpu=value(p,'المعالج').toLowerCase();
    const tiers=[[/8 elite gen\s*5/,9.5],[/dimensity 9500/,9.4],[/a19\s*pro/,9.3],[/8 elite/,9],[/dimensity 9400/,9],[/a18\s*pro/,8.9],[/dimensity 9300/,8.6],[/8 gen ?3/,8.5],[/8 gen ?2/,8],[/dimensity 8[45]00/,7.6],[/8300/,7.3]];
    const tier=tiers.find(([re])=>re.test(cpu));
    const h=num(value(p,'الشاشة'),/(\d{2,3})\s*hz/i);
    const dim=value(p,'الدقة').match(/(\d{3,4})\s*[×xX]\s*(\d{3,4})/);
    const px=dim?+dim[1]*+dim[2]:null;
    const main=value(p,'الكاميرا الرئيسية'),tele=value(p,'التقريب'),wide=value(p,'الواسعة جداً');
    const mah=num(value(p,'البطارية'),/(\d{4,5})\s*mah/i),watts=num(value(p,'البطارية'),/(\d{2,3})\s*w\b/i);
    return {'الأداء':tier?tier[1]:null,'الشاشة':h!=null?clamp(5.5+Math.min(h,144)/144*2.5+(px!=null?(px>=4000000?2:px>=3000000?1.5:1):0)):null,'الكاميرات':main?clamp(5.5+(tele?1.5:0)+(wide?1:0)+(/ois/i.test(main)?1:0)+(/ois/i.test(tele)?0.5:0)+(/1 بوصة|1\/1\.3/i.test(main)?0.5:0)):null,'البطارية':mah!=null?clamp(2+Math.min(mah,8500)/8500*8):null,'الشحن':watts!=null?clamp(2+Math.min(watts,150)/150*8):null};
  };
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
  const image=(p,cls='')=>{const img=node('img',cls);img.src=p.image||'phone-placeholder.svg';img.alt='صورة '+p.name;img.loading='lazy';img.addEventListener('error',()=>{if(!img.src.endsWith('phone-placeholder.svg'))img.src='phone-placeholder.svg'},{once:true});return img};
  function setupTheme(){
    const html=document.documentElement;
    const theme=$('#themeToggle');
    const update=()=>{
      if(theme){theme.textContent=html.dataset.theme==='dark'?'☀':'◐';theme.title=html.dataset.theme==='dark'?'الوضع الفاتح':'الوضع الداكن';}
      $$('[data-palette]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.palette===html.dataset.palette)));
      window.dispatchEvent(new CustomEvent('ik-theme-change'));
    };
    theme?.addEventListener('click',()=>{html.dataset.theme=html.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('siteTheme',html.dataset.theme)}catch(e){}update()});
    $$('[data-palette]').forEach(btn=>btn.addEventListener('click',()=>{html.dataset.palette=btn.dataset.palette;try{localStorage.setItem('sitePalette',btn.dataset.palette)}catch(e){}update()}));
    update();
  }
  function initNavigation(){
    const wrap=$('[data-wrap]');if(!wrap)return;
    const bar=$('[data-bar]',wrap),links=$$('[data-link]',wrap),linksBox=$('[data-links]',wrap),pill=$('[data-pill]',wrap),ghost=$('[data-ghost]',wrap),input=$('[data-input]',wrap),toggle=$('[data-search]',wrap),panel=$('[data-panel]',wrap),rows=$('[data-rows]',wrap),none=$('[data-none]',wrap),count=$('[data-count]',wrap),live=$('[data-live]',wrap);
    const path=location.pathname.split('/').pop()||'index.html';let active=(document.body.dataset.page==='compare'||path==='compare.html')?2:(location.hash==='#finder'?1:0),open=false,selected=0;
    links[active].setAttribute('aria-current','page');
    // A precisely damped spring, from the original Animorio navigation's STIFFNESS/DAMPING/STRETCH system.
    const spring=(k,d)=>({x:0,v:0,t:0,k,d});const sx=spring(420,29),sw=spring(525,32),sl=spring(120,2*Math.sqrt(120)*.8);
    let raf=0,last=0,pointer=null;
    const barCenter=el=>{const a=el.getBoundingClientRect(),b=bar.getBoundingClientRect();return a.left+a.width/2-b.left};
    const offset=el=>el.getBoundingClientRect().left-linksBox.getBoundingClientRect().left;
    const target=()=>pointer??barCenter(links[active]);
    function draw(){const extra=reduce?0:Math.min(Math.abs(sx.v)*.018,26);pill.style.width=Math.max(0,sw.x+extra)+'px';pill.style.transform=`translate3d(${sx.x-extra/2}px,0,0)`;bar.style.setProperty('--lx',sl.x+'px');panel.style.setProperty('--lx',sl.x+'px')}
    function step(s,h){const a=s.k*(s.t-s.x)-s.d*s.v;s.v+=a*h;s.x+=s.v*h}
    function loop(now){const dt=Math.min((now-last)/1000,1/30);last=now;for(let i=0;i<4;i++)[sx,sw,sl].forEach(s=>step(s,dt/4));draw();if([sx,sw,sl].every(s=>Math.abs(s.t-s.x)<.05&&Math.abs(s.v)<.05)){[sx,sw,sl].forEach(s=>{s.x=s.t;s.v=0});draw();raf=0;return}raf=requestAnimationFrame(loop)}
    function aim(immediate=false){sx.t=offset(links[active]);sw.t=links[active].getBoundingClientRect().width;sl.t=target();if(reduce||immediate){[sx,sw,sl].forEach(s=>{s.x=s.t;s.v=0});draw()}else if(!raf){last=performance.now();raf=requestAnimationFrame(loop)}}
    links.forEach((l,i)=>{l.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&i!==active&&!open){ghost.style.width=l.getBoundingClientRect().width+'px';ghost.style.transform=`translateX(${offset(l)}px)`;ghost.style.opacity='1'}});l.addEventListener('pointerleave',()=>ghost.style.opacity='0');l.addEventListener('click',()=>{active=i;aim()})});
    bar.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;pointer=e.clientX-bar.getBoundingClientRect().left;sl.t=target();if(!raf){last=performance.now();raf=requestAnimationFrame(loop)}});
    bar.addEventListener('pointerleave',()=>{pointer=null;sl.t=target();if(!raf){last=performance.now();raf=requestAnimationFrame(loop)}});
    window.addEventListener('resize',()=>aim(true));window.addEventListener('hashchange',()=>{if(path==='index.html'){links[active].removeAttribute('aria-current');active=location.hash==='#finder'?1:0;links[active].setAttribute('aria-current','page');aim()}});
    let data=[];IK.load().then(phones=>{data=phones;if(open)render()}).catch(()=>{data=[];if(open)rows.textContent='تعذّر تحميل البيانات، افتح الموقع عبر Live Server أو خادم ويب.'});
    const highlight=(name,q,where)=>{const k=norm(q),s=String(name);if(!k){where.textContent=s;return}const i=norm(s).indexOf(k);if(i<0){where.textContent=s;return}const from=s.slice(0,i),middle=s.slice(i,i+q.length),end=s.slice(i+q.length);where.append(document.createTextNode(from),node('mark','',middle),document.createTextNode(end))};
    function render(){rows.replaceChildren();const q=input.value.trim();const items=(q?IK.find(data,q):data).slice(0,8);selected=0;count.textContent=items.length+' نتائج';none.hidden=items.length!==0;items.forEach((p,i)=>{
      const b=node('button','row');b.type='button';b.setAttribute('role','option');b.setAttribute('aria-selected',String(i===0));
      const sw=node('span','row__sw');sw.appendChild(image(p));const txt=node('span','row__txt'),name=node('span','row__name'),sub=node('span','row__sub',p.brand||'هاتف');highlight(p.name,q,name);txt.append(name,sub);b.append(sw,txt,node('span','row__price',IK.price(p)));b.addEventListener('click',()=>IK.go(p));b.addEventListener('pointerenter',()=>select(i));rows.appendChild(b)
    });panel.style.height='auto';}
    function select(i){const items=$$('.row',rows);if(!items.length)return;selected=(i+items.length)%items.length;items.forEach((item,k)=>item.setAttribute('aria-selected',String(k===selected)));items[selected]?.scrollIntoView({block:'nearest'})}
    const openSearch=()=>{if(open)return;open=true;wrap.classList.add('is-searching');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','إغلاق البحث');input.setAttribute('aria-expanded','true');panel.hidden=false;render();requestAnimationFrame(()=>panel.classList.add('is-visible'));input.focus({preventScroll:true});sl.t=target();aim()};
    const closeSearch=()=>{if(!open)return;open=false;wrap.classList.remove('is-searching');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','فتح البحث');input.setAttribute('aria-expanded','false');panel.classList.remove('is-visible');setTimeout(()=>{if(!open)panel.hidden=true},530);toggle.focus({preventScroll:true});aim()};
    toggle.addEventListener('click',()=>open?closeSearch():openSearch());$$('[data-open-search]').forEach(x=>x.addEventListener('click',openSearch));
    input.addEventListener('input',render);input.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'){e.preventDefault();select(selected+1)}else if(e.key==='ArrowUp'){e.preventDefault();select(selected-1)}else if(e.key==='Enter'){e.preventDefault();const all=IK.find(data,input.value.trim()).slice(0,8);if(all[selected])IK.go(all[selected])}else if(e.key==='Escape'){e.preventDefault();closeSearch()}
    });
    document.addEventListener('keydown',e=>{if(e.key==='/'&&!open&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();openSearch()}else if(e.key==='Escape'&&open)closeSearch()});
    document.addEventListener('pointerdown',e=>{if(open&&!wrap.contains(e.target)&&!e.target.closest('[data-open-search]'))closeSearch()});
    requestAnimationFrame(()=>aim(true));if(document.fonts?.ready)document.fonts.ready.then(()=>aim(true));
    live.textContent='';
  }
  function animateCards(scope=document){
    const cards=$$('.glass-card',scope).filter(el=>!el.classList.contains('radar-card'));
    cards.forEach(c=>{
      c.classList.add('interactive');
      if(c.dataset.ikCard)return;c.dataset.ikCard='1';
      const updateGlow=(x,y)=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',`${x-r.left}px`);c.style.setProperty('--my',`${y-r.top}px`);};
      c.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')updateGlow(e.clientX,e.clientY);},{passive:true});
      let activeTimer;
      function lightTouch(x,y){
        updateGlow(x,y);c.classList.remove('touch-lit');
        // Force a fresh pulse for every press, even on browsers without hover.
        void c.offsetWidth;c.classList.add('touch-lit');
        clearTimeout(activeTimer);activeTimer=setTimeout(()=>c.classList.remove('touch-lit'),950);
      }
      c.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')lightTouch(e.clientX,e.clientY)},{passive:true});
      c.addEventListener('touchstart',e=>{if(e.touches[0])lightTouch(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
      c.addEventListener('touchmove',e=>{if(e.touches[0])updateGlow(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
      c.addEventListener('pointercancel',()=>{clearTimeout(activeTimer);c.classList.remove('touch-lit')});
    });
    // The message notification example's soft spring entrance, but only for the actual site cards.
    if(reduce||!('IntersectionObserver'in window))return;
    const observer=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(!e.isIntersecting)return;observer.unobserve(e.target);if(e.target.dataset.ikRevealed)return;e.target.dataset.ikRevealed='1';
      e.target.animate([{opacity:.55,transform:'translateY(18px) scale(.978)',filter:'blur(2px)'},{opacity:1,transform:'translateY(-2px) scale(1.007)',filter:'blur(0)'},{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)'}],{duration:720,easing:'cubic-bezier(.23,1,.29,1)',fill:'none'});
    }),{threshold:.06});cards.forEach(c=>{if(!c.dataset.ikRevealed)observer.observe(c)});
  }
  const tile=p=>{
    const a=node('a','glass-card phone-tile interactive');a.href=IK.page(p);
    const top=node('span','phone-tile__top');top.append(node('span','phone-tile__brand',p.brand||'هاتف'),node('span','phone-tile__arrow','↖'));
    const visual=node('div','phone-tile__image');visual.appendChild(image(p));a.append(top,visual,node('h3','phone-tile__title',p.name),node('p','phone-tile__price',IK.price(p)));
    const scores=IK.rate(p);const usable=Object.values(scores).filter(n=>n!=null);const foot=node('div','phone-tile__foot');foot.append(node('span','', 'عرض التفاصيل'),node('span','',usable.length?`${usable.length} معايير للتقييم`: 'مواصفات متوفرة'));a.append(foot);return a;
  };
  function initHome(phones){const container=$('#finderResults');if(!container)return;
    const budget=$('#budget'),needs=$$('#needs .need');let current='all';
    const update=()=>{let list=phones.slice();const max=budget.value;if(max!=='all')list=list.filter(p=>p.price_usd!=null&&p.price_usd<=Number(max));if(current!=='all')list=list.filter(p=>IK.rate(p)[current]!=null).sort((a,b)=>IK.rate(b)[current]-IK.rate(a)[current]);container.replaceChildren();if(!list.length)container.append(node('div','empty-state','ماكو هواتف مطابقة. جرّب تغيّر الميزانية أو الأولوية.'));else list.forEach(p=>container.appendChild(tile(p)));$('#phoneCount').textContent=`${list.length} من ${phones.length} هواتف`;animateCards(container)};
    budget.addEventListener('change',update);needs.forEach(btn=>btn.addEventListener('click',()=>{current=btn.dataset.need;needs.forEach(x=>{x.classList.toggle('is-active',x===btn);x.setAttribute('aria-pressed',String(x===btn))});update()}));update();animateCards();}
  function phoneId(){let given=document.body.dataset.phoneId;if(given)return given;const params=new URLSearchParams(location.search);return params.get('id')||'xiaomi-14t';}
  const makeList=(items,cls)=>{const ul=node('ul',cls);items.forEach(x=>ul.appendChild(node('li','',x)));return ul};
  async function initPhone(phones){const host=$('#phoneContent');if(!host)return;
    const p=phones.find(x=>x.id===phoneId());if(!p){host.replaceChildren(node('div','empty-state','هذا الهاتف مو موجود حالياً بقاعدة البيانات.'));return}
    document.title=p.name+' | اختَر صح';$('#breadcrumbName').textContent=p.name;host.replaceChildren();
    const hero=node('section','glass-card phone-hero'),copy=node('div','phone-hero__info'),visual=node('div','phone-hero__media');
    copy.append(node('span','section-eyebrow',(p.brand||'الهاتف')+' · المواصفات الكاملة'),node('h1','',p.name),node('p','phone-hero-desc','اعرف مواصفات هذا الهاتف ونقاط قوته وضعفه قبل ما تتخذ قرارك.'));
    const price=node('div','phone-price');price.append(node('strong','',IK.price(p)),node('small','muted','سعر تجريبي غير مرتبط بالسوق المحلي'));copy.append(price);
    const buttons=node('div','phone-actionbar');const compare=node('a','cta cta--bright','⇄ قارن هذا الهاتف');compare.href='compare.html?phone='+encodeURIComponent(p.id);
    const search=node('button','cta cta--outline','⌕ دوّر على غيره');search.type='button';search.setAttribute('data-open-search','');search.addEventListener('click',()=>document.querySelector('[data-search]')?.click());buttons.append(compare,search);copy.appendChild(buttons);visual.appendChild(image(p));hero.append(copy,visual);host.appendChild(hero);
    const specs=node('section','phone-section'),heading=node('h2','','المواصفات التقنية'),grid=node('dl','spec-grid');
    Object.entries(p.specs||{}).forEach(([k,v])=>{const item=node('div','glass-card spec-item');item.append(node('dt','',k),node('dd','',v));grid.appendChild(item)});specs.append(heading,grid);host.appendChild(specs);
    const analysis=node('section','phone-section'),ac=node('div','pros-cons'),pros=node('div','glass-card pros'),cons=node('div','glass-card cons');
    pros.append(node('h3','','✓ نقاط القوة'),makeList(p.strengths||[]));cons.append(node('h3','','× نقاط الضعف'),makeList(p.weaknesses||[]));ac.append(pros,cons);analysis.append(node('h2','','نقاط القوة والضعف'),ac);host.appendChild(analysis);
    try{const opinions=location.protocol==='file:'&&window.IK_OFFLINE_OPINIONS?window.IK_OFFLINE_OPINIONS:await fetch('opinions.json').then(r=>r.json());if(opinions[p.id]?.length){const opinion=node('section','phone-section'),card=node('div','glass-card opinion-card');opinions[p.id].forEach(s=>card.appendChild(node('p','',s)));opinion.append(node('h2','','رأي اختَر صح'),card);host.appendChild(opinion)}}catch(e){}
    const foot=node('div','glass-card notice-card phone-section','المواصفات من بيانات المشروع وقد تختلف حسب الإصدار والسوق. الأسعار تجريبية، والتقييمات ليست بديلاً عن تجربة الهاتف فعلياً.');host.append(foot);animateCards(host);
  }
  function initCompare(phones){if(!$('#compareButton'))return;
    const selected=[null,null],inputs=[$('#search1'),$('#search2')],options=[$('#options1'),$('#options2')],chosen=[$('#chosen1'),$('#chosen2')],btn=$('#compareButton'),msg=$('#compareMessage'),out=$('#comparisonOutput');
    const updateButton=()=>btn.disabled=!(selected[0]&&selected[1]&&selected[0].id!==selected[1].id);
    const set=(idx,p)=>{selected[idx]=p;inputs[idx].value=p.name;chosen[idx].textContent='✓ '+p.name;options[idx].replaceChildren();out.hidden=true;msg.textContent=selected[0]&&selected[1]&&selected[0].id===selected[1].id?'اختَر هاتفين مختلفين.':'اضغط اعرض المقارنة حتى تشوف التفاصيل.';updateButton()};
    inputs.forEach((input,i)=>{
      const render=()=>{const matches=IK.find(phones,input.value.trim()).filter(p=>p.id!==selected[1-i]?.id).slice(0,8);options[i].replaceChildren();if(!matches.length){options[i].append(node('p','', 'ما لكينا هاتف بهذا الاسم.'));return}matches.forEach(p=>{const b=node('button','pick-option',p.name);b.type='button';b.addEventListener('pointerdown',e=>e.preventDefault());b.addEventListener('click',()=>set(i,p));options[i].appendChild(b)})};
      input.addEventListener('input',()=>{selected[i]=null;chosen[i].textContent='';out.hidden=true;updateButton();render()});input.addEventListener('focus',render);
      input.addEventListener('keydown',e=>{if(e.key==='Escape')options[i].replaceChildren();if(e.key==='Enter'){const first=$('.pick-option',options[i]);if(first){e.preventDefault();first.click()}}});input.addEventListener('blur',()=>setTimeout(()=>options[i].replaceChildren(),150));
    });
    document.addEventListener('click',e=>{inputs.forEach((input,i)=>{if(!input.parentNode.contains(e.target))options[i].replaceChildren()})});
    const id=new URLSearchParams(location.search).get('phone');const initial=phones.find(p=>p.id===id);if(initial)set(0,initial);
    $('#newCompare').addEventListener('click',()=>{selected[0]=selected[1]=null;inputs.forEach(i=>i.value='');chosen.forEach(c=>c.textContent='');options.forEach(o=>o.replaceChildren());out.hidden=true;msg.textContent='اختَر هاتفين مختلفين حتى نبدأ المقارنة.';updateButton();inputs[0].focus();window.scrollTo({top:0,behavior:reduce?'auto':'smooth'})});
    btn.addEventListener('click',()=>{const [a,b]=selected;if(!a||!b||a.id===b.id)return;out.hidden=false;msg.textContent='تم عرض المقارنة.';renderTable(a,b);renderAnalysis(a,b);out.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});});
    function renderTable(a,b){const dest=$('#comparisonTable');dest.replaceChildren();const table=node('table','spec-table'),thead=node('thead'),tr=node('tr');
      tr.append(node('th','','المواصفة'));
      [a,b].forEach(p=>{const th=node('th',''),wrap=node('span','table-phone'),link=node('a','',p.name);link.href=IK.page(p);wrap.append(image(p),link);th.append(wrap);tr.appendChild(th)});thead.appendChild(tr);table.appendChild(thead);
      const tbody=node('tbody');const keys=[...new Set([...Object.keys(a.specs||{}),...Object.keys(b.specs||{})])];
      for(const key of keys){const row=node('tr');row.appendChild(node('td','',key));const v1=a.specs?.[key]||'غير متوفر',v2=b.specs?.[key]||'غير متوفر';row.append(node('td','',v1),node('td','',v2));
        const compare=(v,key)=>{const s=String(v).replace(/,/g,'');if(key==='البطارية')return num(s,/(\d{4,5})\s*mah/i);if(key==='الشاشة')return num(s,/(\d{2,3})\s*hz/i);if(key==='الدقة'){const m=s.match(/(\d+)\s*[×xX]\s*(\d+)/);return m?+m[1]*+m[2]:null}if(key==='الذاكرة')return num(s,/(\d+)\s*gb/i);return null};
        const c1=compare(v1,key),c2=compare(v2,key);if(c1!==null&&c2!==null&&c1!==c2)row.children[c1>c2?1:2].classList.add('spec-winner');tbody.appendChild(row)
      }
      const pRow=node('tr');pRow.append(node('td','','السعر (تجريبي)'),node('td','',IK.price(a)),node('td','',IK.price(b)));tbody.append(pRow);table.append(tbody);dest.append(table);
    }
    function renderAnalysis(a,b){const grid=$('#analysisGrid');grid.replaceChildren();const scores=[IK.rate(a),IK.rate(b)];[a,b].forEach((p,i)=>{const div=node('article','glass-card analysis-card');div.append(node('h3','',p.name));const ul=node('ul');IK.METRICS.forEach(k=>{const n=scores[i][k],other=scores[1-i][k];ul.appendChild(node('li','',`${k}: ${n==null?'غير محسوب':n.toFixed(1)+'/10'}${n!=null&&other!=null?(n>other?' — تقدير أعلى':n<other?' — تقدير أقل':' — تعادل'):''}`))});div.appendChild(ul);grid.appendChild(div)});animateCards(grid);
      // Don't fabricate a complete graphic if either phone lacks one of the defined five metrics.
      if(IK.METRICS.every(k=>scores.every(s=>s[k]!=null))){$('#radarSection').hidden=false;window.IK.renderRadar?.(a,b)}else{$('#radarSection').hidden=true}
    }
  }
  async function main(){setupTheme();initNavigation();animateCards();try{const phones=await IK.load();initHome(phones);initCompare(phones);await initPhone(phones)}catch(e){console.error('Ikhtar Sah data loading:',e);['#finderResults','#phoneContent'].forEach(s=>{const dest=$(s);if(dest)dest.replaceChildren(node('div','empty-state','ما قدرنا نحمّل بيانات الهواتف. شغّل الموقع عبر Live Server أو GitHub Pages.'))});if($('#compareMessage'))$('#compareMessage').textContent='فشل تحميل بيانات الهواتف.'}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main);else main();
})();
