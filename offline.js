/* الحضور بدون إنترنت: لو النت قطع وإنت بتعلّم حاضر/غايب، التسجيل بيتحفظ على الجهاز
   وبيتبعت لوحده لما النت يرجع. لازم يتحمّل بعد app.js. */
(function(){
const KEY='kh_offline_q';
const rd=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_){return[]}};
const wr=q=>{try{localStorage.setItem(KEY,JSON.stringify(q))}catch(_){}};
const netErr=e=>!navigator.onLine||!!(e&&/fetch|network|load failed/i.test(e.message||''));
const origRpc=sb.rpc.bind(sb);
let syncing=false;

function bar(){
  const q=rd(),off=!navigator.onLine;
  let b=document.getElementById('off-bar');
  if(!q.length&&!off){if(b)b.remove();return}
  if(!b){
    b=document.createElement('div');b.id='off-bar';
    b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:98;padding:6px 12px;text-align:center;font-size:13px;font-weight:600;font-family:inherit';
    document.body.appendChild(b);
  }
  b.style.background=off?'#b3261e':'#b26a00';b.style.color='#fff';
  b.textContent=(off?'مفيش إنترنت · ':'')+(q.length?q.length+' تسجيل حضور مستني الرفع':'التسجيل هيتحفظ على الجهاز');
}
function enqueue(a){
  const q=rd().filter(x=>!(x.servee===a.p_servee&&x.date===a.p_date));
  q.push({servee:a.p_servee,date:a.p_date,status:a.p_status,t:Date.now()});
  wr(q);bar();toast('اتحفظ على الجهاز، وهيترفع لما النت يرجع');
}
sb.rpc=function(name,args){
  if(name!=='kh_mark')return origRpc(name,args);
  return (async()=>{
    let r=null;
    if(navigator.onLine){try{r=await origRpc(name,args)}catch(e){r={error:e}}}
    if(!r||(r.error&&netErr(r.error))){enqueue(args);return{data:null,error:null}}
    return r;
  })();
};
function overlay(){
  rd().filter(x=>x.date===S.date).forEach(x=>{
    S.att=S.att.filter(a=>a.servee_id!==x.servee);
    if(x.status!=='clear')S.att.push({servee_id:x.servee,status:x.status});
  });
}
const origLoadAtt=window.loadAtt;
window.loadAtt=async function(){
  if(navigator.onLine&&!syncing){await origLoadAtt()}
  overlay();
};
async function sync(){
  if(syncing||!navigator.onLine)return;
  const q=rd();if(!q.length)return;
  syncing=true;let sent=0,dropped=0;
  for(const it of q){
    let r;
    try{r=await origRpc('kh_mark',{p_servee:it.servee,p_date:it.date,p_status:it.status})}catch(e){break}
    if(r.error&&netErr(r.error))break;
    if(r.error)dropped++;else sent++;
    wr(rd().filter(x=>!(x.servee===it.servee&&x.date===it.date&&x.t===it.t)));
  }
  syncing=false;bar();
  if(sent||dropped){
    toast(sent+' تسجيل اترفع'+(dropped?' · '+dropped+' اترفض (مفيش صلاحية أو الفصل اتغيّر)':''));
    await window.loadAtt();if(window.render&&S.p)window.render();
  }
}
window.addEventListener('online',()=>{bar();sync()});
window.addEventListener('offline',bar);
setInterval(sync,30000);
setTimeout(()=>{bar();sync()},3000);
})();
