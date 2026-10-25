const V='khedma-202610251232'; // بيتغيّر لوحده من scripts/bump-version.js (GitHub Action)
const SHELL=['./','index.html','styles.css','app.js','finance.js','extras.js','xlsx.js','offline.js','mail.js','update.js','manifest.json','logo.png','icon-192.png','icon-512.png','apple-touch-icon.png',
  'vendor/supabase.js','vendor/591.supabase.js','vendor/qrcode.js','vendor/jsQR.js',
  'fonts/noto-kufi-arabic-arabic-400-normal.woff2','fonts/noto-kufi-arabic-arabic-600-normal.woff2','fonts/noto-kufi-arabic-arabic-700-normal.woff2',
  'fonts/noto-kufi-arabic-latin-400-normal.woff2','fonts/noto-kufi-arabic-latin-600-normal.woff2','fonts/noto-kufi-arabic-latin-700-normal.woff2'];
const STATIC=/\/(vendor|fonts)\/|\.(png|woff2)$/;

/* مفيش skipWaiting تلقائي: النسخة الجديدة بتستنى لحد ما المستخدم يضغط «تحديث» (رسالة SKIP_WAITING)،
   فالتطبيق ما يتبدّلش من تحت إيدك وانت بتسجّل حضور. */
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))));
});
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>clients.claim()))});

const keep=(r,res)=>{if(res&&res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c)).catch(()=>{})}return res};
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return;
  if(u.pathname.endsWith('/version.json')){e.respondWith(fetch(r,{cache:'no-store'}).catch(()=>caches.match(r)));return}
  // ملفات ثابتة (مكتبات، خطوط، صور): من الكاش الأول
  if(STATIC.test(u.pathname)){
    e.respondWith(caches.match(r).then(h=>h||fetch(r).then(res=>keep(r,res))));return;
  }
  // فتح الصفحة: من النت، ولو مفيش نت من الكاش (يفتح التطبيق أوفلاين)
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>keep(r,res)).catch(()=>caches.match(r,{ignoreSearch:true}).then(h=>h||caches.match('index.html')||caches.match('./'))));return;
  }
  // باقي الملفات (js/css/json): النت الأول عشان التعديلات توصل، والكاش لو النت قاطع
  e.respondWith(fetch(r).then(res=>keep(r,res)).catch(()=>caches.match(r,{ignoreSearch:true})));
});

self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(_){}
  const title=d.title||'خدمة إعدادي';
  e.waitUntil(Promise.all([
    self.registration.showNotification(title,{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',dir:'rtl',lang:'ar',tag:d.tag||undefined,renotify:!!d.tag,data:{url:d.url||'./#tab=notif'}}),
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>l.forEach(c=>c.postMessage({type:'push',title:d.title||'',body:d.body||''})))
  ]));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./#tab=notif';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
    for(const c of l){if('focus' in c){c.postMessage({type:'nav',url});return c.focus()}}
    return clients.openWindow(url);
  }));
});
// Background Sync: بيصحّي التطبيق المفتوح عشان يرفع طابور الحضور أول ما النت يرجع
self.addEventListener('sync',e=>{
  if(e.tag==='kh-sync')e.waitUntil(clients.matchAll({includeUncontrolled:true}).then(l=>l.forEach(c=>c.postMessage({type:'sync'}))));
});
