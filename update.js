/* تنبيه «في تحديث جديد»: النسخة الجديدة من الـ Service Worker بتستنى، وبضغطة واحدة تتفعّل والصفحة تتحدّث.
   كمان بيقارن version.json كاحتياطي لو التنبيه ما ظهرش. */
(function(){
let cur=null,shown=false;
async function get(){
  try{const r=await fetch('version.json?_='+Date.now(),{cache:'no-store'});if(!r.ok)return null;return (await r.json()).v}catch(_){return null}
}
async function apply(){
  let reg=null;try{reg=await navigator.serviceWorker.getRegistration()}catch(_){}
  if(reg&&reg.waiting){
    let done=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(done)return;done=true;location.reload()});
    reg.waiting.postMessage({type:'SKIP_WAITING'});
    setTimeout(()=>{if(!done)location.reload()},3000);
    return;
  }
  try{const k=await caches.keys();await Promise.all(k.map(x=>caches.delete(x)))}catch(_){}
  try{if(reg)await reg.update()}catch(_){}
  location.reload();
}
function bar(){
  if(shown||document.getElementById('upd-bar'))return;shown=true;
  const d=document.createElement('div');d.id='upd-bar';
  d.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99;background:#17302b;color:#fff;padding:12px 16px;text-align:center;font-weight:600;cursor:pointer;font-family:inherit';
  d.textContent='في تحديث جديد · اضغط هنا للتحديث';
  d.onclick=apply;
  document.body.appendChild(d);
}
async function check(){
  const v=await get();if(!v)return;
  if(cur===null){cur=v;return}
  if(v!==cur)bar();
}
if('serviceWorker' in navigator){
  navigator.serviceWorker.ready.then(reg=>{
    if(reg.waiting&&navigator.serviceWorker.controller)bar();
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)bar()})});
    setInterval(()=>{reg.update().catch(()=>{})},10*60*1000);
  }).catch(()=>{});
}
check();
setInterval(check,5*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){check();navigator.serviceWorker&&navigator.serviceWorker.getRegistration().then(r=>r&&r.update()).catch(()=>{})}});
})();
