/* تنبيه «في تحديث جديد»: بيقارن version.json بالنسخة اللي فتحتها وبيطلّع شريط للتحديث */
(function(){
let cur=null;
async function get(){
  try{const r=await fetch('version.json?_='+Date.now(),{cache:'no-store'});if(!r.ok)return null;return (await r.json()).v}catch(_){return null}
}
function bar(){
  if(document.getElementById('upd-bar'))return;
  const d=document.createElement('div');d.id='upd-bar';
  d.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99;background:#17302b;color:#fff;padding:12px 16px;text-align:center;font-weight:600;cursor:pointer;font-family:inherit';
  d.textContent='في تحديث جديد · اضغط هنا للتحديث';
  d.onclick=async()=>{try{const k=await caches.keys();await Promise.all(k.map(x=>caches.delete(x)))}catch(_){}location.reload()};
  document.body.appendChild(d);
}
async function check(){
  const v=await get();if(!v)return;
  if(cur===null){cur=v;return}
  if(v!==cur)bar();
}
check();
setInterval(check,5*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
})();
