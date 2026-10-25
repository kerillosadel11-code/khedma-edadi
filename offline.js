/* الحضور بدون إنترنت: لو النت قطع وإنت بتسجّل حضور/غياب/اعتذار أو بتمسح QR، العملية بتتحفظ على الجهاز
   (IndexedDB) وبتتبعت لوحدها لما النت يرجع. لازم يتحمّل بعد app.js. */
(function(){
const OLD='kh_offline_q',DBN='kh_offline',ST='kv',KEY='q';
const NAMES=['kh_mark','kh_mark_excuse','kh_checkin','kh_servant_checkin'];
const origRpc=sb.rpc.bind(sb);
let Q=[],idb=null,syncing=false;
const netErr=e=>!navigator.onLine||!!(e&&/fetch|network|load failed/i.test(e.message||''));
const keyOf=(fn,a)=>(fn==='kh_mark'||fn==='kh_mark_excuse')?'att|'+a.p_servee+'|'+a.p_date:fn+'|'+a.p_code+'|'+a.p_date;

function openDb(){return new Promise(res=>{try{const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);r.onblocked=()=>res(null)}catch(_){res(null)}})}
const idbGet=()=>new Promise(res=>{if(!idb)return res(null);try{const q=idb.transaction(ST).objectStore(ST).get(KEY);q.onsuccess=()=>res(q.result||[]);q.onerror=()=>res(null)}catch(_){res(null)}});
function save(){
  if(idb){try{idb.transaction(ST,'readwrite').objectStore(ST).put(Q,KEY);return}catch(_){}}
  try{localStorage.setItem(OLD+'2',JSON.stringify(Q))}catch(_){}
}
const ready=(async()=>{
  idb=await openDb();
  let q=await idbGet();
  if(q===null){try{q=JSON.parse(localStorage.getItem(OLD+'2')||'[]')}catch(_){q=[]}}
  // ترحيل الطابور القديم (localStorage) لو لسه فيه حاجة
  try{const o=JSON.parse(localStorage.getItem(OLD)||'[]');o.forEach(x=>q.push({fn:'kh_mark',args:{p_servee:x.servee,p_date:x.date,p_status:x.status},t:x.t||Date.now()}));localStorage.removeItem(OLD)}catch(_){}
  Q=q;save();
})();

function bar(){
  const off=!navigator.onLine;let b=document.getElementById('off-bar');
  if(!Q.length&&!off){if(b)b.remove();return}
  if(!b){
    b=document.createElement('div');b.id='off-bar';
    b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:98;padding:6px 12px;text-align:center;font-size:13px;font-weight:600;font-family:inherit';
    document.body.appendChild(b);
  }
  b.style.background=off?'#b3261e':'#b26a00';b.style.color='#fff';
  b.textContent=(off?'مفيش إنترنت · ':'')+(Q.length?Q.length+' عملية حضور مستنية الرفع':'التسجيل هيتحفظ على الجهاز');
}
function regSync(){try{navigator.serviceWorker.ready.then(r=>r.sync&&r.sync.register('kh-sync')).catch(()=>{})}catch(_){}}
function push(fn,args){
  const k=keyOf(fn,args);
  Q=Q.filter(x=>keyOf(x.fn,x.args)!==k);
  Q.push({fn,args,t:Date.now()});save();bar();regSync();
}
const findServee=code=>(S.servees||[]).find(s=>String(s.code||'')===String(code||'').trim());

function enqueue(fn,args){
  if(fn==='kh_checkin'){
    const s=findServee(args.p_code);
    if(!s)return{data:null,error:{message:'مفيش نت، والكود ده مش معروف على الجهاز'}};
    if(s.active===false)return{data:null,error:{message:'INACTIVE'}};
    const already=(S.att||[]).some(a=>a.servee_id===s.id&&a.status==='present')||Q.some(x=>x.fn==='kh_checkin'&&keyOf(x.fn,x.args)===keyOf(fn,args));
    push(fn,args);toast('اتحفظ على الجهاز، وهيترفع لما النت يرجع');
    return{data:{name:s.full_name,photo_path:null,class_name:(S.classes.find(c=>c.id===s.class_id)||{}).name||'',already},error:null};
  }
  if(fn==='kh_servant_checkin'){
    push(fn,args);toast('اتحفظ على الجهاز، وهيترفع لما النت يرجع');
    return{data:{name:'اتحفظ على الجهاز (هيتأكد لما النت يرجع)',already:false},error:null};
  }
  push(fn,args);toast('اتحفظ على الجهاز، وهيترفع لما النت يرجع');
  return{data:null,error:null};
}
sb.rpc=function(name,args){
  if(!NAMES.includes(name))return origRpc(name,args);
  return (async()=>{
    await ready;
    let r=null;
    if(navigator.onLine){try{r=await origRpc(name,args)}catch(e){r={error:e}}}
    if(!r||(r.error&&netErr(r.error)))return enqueue(name,args);
    // نجحت أونلاين: أي نسخة قديمة مستنية لنفس الخانة تتشال عشان ما تكتبش فوقها بعدين
    if(!r.error&&Q.length){const k=keyOf(name,args),n=Q.length;Q=Q.filter(x=>keyOf(x.fn,x.args)!==k);if(Q.length!==n){save();bar()}}
    return r;
  })();
};
function overlay(){
  Q.forEach(x=>{
    if(x.args.p_date!==S.date)return;
    let id=null,st=null;
    if(x.fn==='kh_mark'){id=x.args.p_servee;st=x.args.p_status}
    else if(x.fn==='kh_mark_excuse'){id=x.args.p_servee;st='excused'}
    else if(x.fn==='kh_checkin'){const s=findServee(x.args.p_code);if(s){id=s.id;st='present'}}
    if(!id)return;
    S.att=S.att.filter(a=>a.servee_id!==id);
    if(st!=='clear')S.att.push({servee_id:id,status:st});
  });
}
const origLoadAtt=window.loadAtt;
window.loadAtt=async function(){
  await ready;
  if(navigator.onLine&&!syncing){await origLoadAtt()}
  overlay();
};
async function sync(){
  await ready;
  if(syncing||!navigator.onLine||!Q.length)return;
  syncing=true;let sent=0,dropped=0;
  for(const it of Q.slice()){
    let r;
    try{r=await origRpc(it.fn,it.args)}catch(e){break}
    if(r.error&&netErr(r.error))break;
    if(r.error)dropped++;else sent++;
    Q=Q.filter(x=>x!==it&&!(x.t===it.t&&x.fn===it.fn));save();
  }
  syncing=false;bar();
  if(sent||dropped){
    toast(sent+' عملية اترفعت'+(dropped?' · '+dropped+' اترفضت (مفيش صلاحية أو الفصل اتغيّر)':''));
    await window.loadAtt();if(window.render&&S.p)window.render();
  }
}
window.addEventListener('online',()=>{bar();sync()});
window.addEventListener('offline',bar);
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='sync')sync()});
setInterval(sync,30000);
ready.then(()=>{bar();setTimeout(sync,3000)});
})();
