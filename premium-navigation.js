
/* Navigation transitions: same-origin pages only; safe for external links and browser back */
(()=>{'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let leaving=false;
function navigate(url){
 if(leaving)return;
 const target=new URL(url,location.href);
 if(target.origin!==location.origin||target.pathname===location.pathname&&target.search===location.search&&target.hash){location.href=target.href;return;}
 if(reduce){location.href=target.href;return;}
 leaving=true;document.body.classList.remove('ik-page-enter');document.body.classList.add('ik-page-leave');
 setTimeout(()=>{location.assign(target.href)},window.matchMedia("(max-width:800px)").matches?170:135);
}
function ready(){
 if(!reduce)document.body.classList.add('ik-page-enter');
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.hasAttribute('download')||a.target&&a.target!=='_self')return;
  const href=a.getAttribute('href');if(!href||href.startsWith('#')||href.startsWith('javascript:')||href.startsWith('mailto:')||href.startsWith('tel:'))return;
  const target=new URL(href,location.href);if(target.origin!==location.origin||target.pathname===location.pathname&&target.search===location.search)return;
  e.preventDefault();navigate(target.href);
 },true);
 // Existing smartphone-card navigation uses IK.go rather than anchors.
 if(window.IK&&typeof window.IK.go==='function'){window.IK.go=p=>{if(p&&p.page)navigate(p.page)}}
 addEventListener('pageshow',e=>{if(e.persisted){leaving=false;document.body.classList.remove('ik-page-leave');if(!reduce)document.body.classList.add('ik-page-enter')}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
