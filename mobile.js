/* Mobile-specific behavior; no desktop impact. */
(()=>{'use strict';if(!matchMedia('(max-width:800px)').matches)return;
const ready=()=>{document.documentElement.classList.add('ik-mobile');
// Keep the search overlay aligned when the visual viewport shifts for the keyboard.
let raf=0;const reposition=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const active=document.activeElement;if(active&&active.matches('input'))window.dispatchEvent(new Event('resize'))})};
if(window.visualViewport){visualViewport.addEventListener('resize',reposition,{passive:true});visualViewport.addEventListener('scroll',reposition,{passive:true})}
};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();})();
