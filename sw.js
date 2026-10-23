const C='khedma-v9';
// سكريبتات وخطوط خارجية بنخزّنها عشان التطبيق يفتح لو النت ضعيف (الـ API بتاع Supabase عمره ما بيتخزّن)
const EXT=['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'];
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  if(u.origin!==location.origin&&!EXT.includes(u.hostname))return;
  e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(C).then(x=>x.put(r,c));return res}).catch(()=>caches.match(r)));
});
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(_){}
  e.waitUntil(self.registration.showNotification(d.title||'خدمة إعدادي',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',dir:'rtl',lang:'ar',tag:'khedma'}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if('focus' in c)return c.focus()}return clients.openWindow('./')}));
});
