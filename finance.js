/* الحسابات: خزنة البنين/البنات + الرحلات والمؤتمرات
   ملف مستقل بيتحمّل بعد app.js ومش محتاج تعديل في app.js. */
(function(){
const F={ld:false,busy:false,uid:null,v:'box',k:'income',acc:null,ev:null,accs:[],bal:[],cats:[],tx:[],evs:[],dues:[],evtx:[],err:null};
const canFin=()=>S.p&&(S.p.role==='admin'||S.p.role==='secretary');
const money=n=>Number(n||0).toLocaleString('ar-EG',{maximumFractionDigits:2})+' ج';
const KIND={income:'إيراد',expense:'مصروف',transfer_in:'تحويل داخل',transfer_out:'تحويل خارج'};
const EK={trip:'رحلة',conference:'مؤتمر'};
const today=()=>new Date().toISOString().slice(0,10);
const num=s=>parseFloat(String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('،','.').replace('٫','.'));
const val=id=>{const e=document.getElementById(id);return e?e.value.trim():''};
const catName=id=>(F.cats.find(c=>c.id===id)||{}).name||'';
const accSec=id=>(F.accs.find(a=>a.id===id)||{}).section;
const evOf=id=>F.evs.find(e=>e.id===id);

async function loadDues(){
  const [d,t]=await Promise.all([
    sb.from('finance_event_dues').select('*').eq('event_id',F.ev),
    sb.from('finance_tx').select('*').eq('event_id',F.ev).order('tx_date',{ascending:false}).order('created_at',{ascending:false})]);
  F.dues=d.error?[]:d.data;F.evtx=t.error?[]:t.data;
}
async function loadFin(){
  F.busy=true;
  const r=await Promise.all([
    sb.from('finance_accounts').select('*').order('section'),
    sb.from('finance_balances').select('*').order('section'),
    sb.from('finance_categories').select('*').eq('active',true).order('name'),
    sb.from('finance_tx').select('*').order('tx_date',{ascending:false}).order('created_at',{ascending:false}).limit(150),
    sb.from('finance_events').select('*').order('event_date',{ascending:false,nullsFirst:false}),
    sb.from('finance_event_summary').select('*')]);
  const bad=r.find(x=>x.error);
  if(bad){F.err=bad.error.message}
  else{
    F.err=null;F.accs=r[0].data;F.bal=r[1].data;F.cats=r[2].data;F.tx=r[3].data;
    F.evs=r[4].data.map(e=>({...(r[5].data.find(s=>s.event_id===e.id)||{}),...e}));
    if(!F.acc||!F.accs.some(a=>a.id===F.acc))F.acc=(F.accs[0]||{}).id||null;
    if(F.ev&&!evOf(F.ev))F.ev=null;
    if(F.ev)await loadDues();
  }
  F.ld=true;F.busy=false;
}
async function boot(){if(F.busy)return;await loadFin();window.render()}
async function refresh(){await loadFin();window.render()}

/* ---------- الشاشات ---------- */
function vFin(){
  if(!F.ld)return `<div class="card"><div class="empty">جاري التحميل…</div></div>`;
  if(F.err)return `<div class="card"><h2>الحسابات</h2><p class="err">${esc(F.err)}</p><div class="empty">لو ده أول مرة، اتأكد إنك شغّلت phase20 ثم phase21 في SQL Editor.</div></div>`;
  if(!F.accs.length)return `<div class="card"><div class="empty">مفيش خزنة ليك لسه. اتأكد إن حسابك أمين خدمة وليه قسم.</div></div>`;
  return `<div class="two"><button class="${F.v==='box'?'p':'s'}" data-fa="v" data-id="box">الخزنة</button><button class="${F.v==='ev'?'p':'s'}" data-fa="v" data-id="ev">رحلات ومؤتمرات</button></div>`+(F.v==='ev'?vEv():vBox());
}
const accSel=()=>isAdmin()&&F.accs.length>1?`<select data-fa="acc">${F.accs.map(a=>`<option value="${a.id}"${a.id===F.acc?' selected':''}>${esc(a.name)}</option>`).join('')}</select>`:'';
function catOpts(kind){return `<option value="">البند</option>`+F.cats.filter(c=>c.kind===kind).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}
function txRow(t){
  const inn=t.kind==='income'||t.kind==='transfer_in';
  const ev=t.event_id?evOf(t.event_id):null;
  const meta=[t.tx_date,catName(t.category_id),t.servee_id?sname(t.servee_id):'',ev?ev.title:'',t.note||''].filter(Boolean).map(esc).join(' · ');
  return `<div class="row ${t.voided?'off':''}"><div><b style="color:${inn?'#1b7a3d':'#b3261e'}">${inn?'+':'−'} ${money(t.amount)}</b> ${esc(KIND[t.kind])}${t.voided?' <span class="bd" style="background:#fde9b8">ملغاة</span>':''}${F.accs.length>1?badge(t.section):''}<small>${meta}${t.voided&&t.void_reason?' · سبب الإلغاء: '+esc(t.void_reason):''}</small></div>
  <div class="acts">${!t.voided&&(t.kind==='income'||t.kind==='expense')?`<button class="s d" data-fa="void" data-id="${t.id}">إلغاء</button>`:''}</div></div>`;
}
function vBox(){
  const bal=F.bal.map(b=>`<div class="card"><h2>${esc(b.name)}</h2><div style="font-size:26px;font-weight:700">${money(b.balance)}</div><small>دخل ${money(b.total_in)} · خرج ${money(b.total_out)}${Number(b.opening_balance)?' · رصيد افتتاحي '+money(b.opening_balance):''}</small></div>`).join('');
  const tot=F.bal.length>1?`<div class="card" style="border-color:var(--gold)"><h2>إجمالي الخدمة</h2><div style="font-size:26px;font-weight:700">${money(F.bal.reduce((s,b)=>s+Number(b.balance),0))}</div></div>`:'';
  const acc=F.accs.find(a=>a.id===F.acc);
  const form=`<div class="card"><h2>تسجيل حركة${acc?' · '+esc(acc.name):''}</h2>${accSel()}
  <select data-fa="kind"><option value="income"${F.k==='income'?' selected':''}>إيراد</option><option value="expense"${F.k==='expense'?' selected':''}>مصروف</option></select>
  <input id="f_amt" type="text" inputmode="decimal" placeholder="المبلغ (جنيه)"><select id="f_cat">${catOpts(F.k)}</select>
  <input id="f_date" type="date" value="${today()}"><input id="f_note" placeholder="ملاحظة (اختياري)">
  <button class="p" data-fa="addtx">تسجيل</button></div>`;
  const tr=isAdmin()&&F.accs.length>1?`<div class="card"><h2>تحويل بين الخزنتين</h2><select id="f_dir"><option value="boys>girls">من خزنة البنين لخزنة البنات</option><option value="girls>boys">من خزنة البنات لخزنة البنين</option></select><input id="f_tamt" type="text" inputmode="decimal" placeholder="المبلغ"><input id="f_tnote" placeholder="ملاحظة (اختياري)"><button class="p" data-fa="transfer">تحويل</button></div>`:'';
  const list=F.tx.filter(t=>!isAdmin()||F.accs.length<2||t.account_id===F.acc);
  return tot+bal+form+tr+`<div class="card"><h2>آخر الحركات</h2>${list.map(txRow).join('')||'<div class="empty">لسه مفيش حركات.</div>'}</div>`;
}
function vEv(){return F.ev?vEvDetail():vEvList()}
function vEvList(){
  const acc=F.accs.find(a=>a.id===F.acc),sec=acc&&acc.section;
  const cls=S.classes.filter(c=>c.section===sec);
  const form=`<div class="card"><h2>رحلة أو مؤتمر جديد${acc?' · '+esc(acc.name):''}</h2>${accSel()}
  <select id="f_ek"><option value="trip">رحلة</option><option value="conference">مؤتمر</option></select>
  <input id="f_et" placeholder="الاسم (مثال: رحلة وادي النطرون)"><input id="f_ed" type="date">
  <div class="two"><input id="f_ep" type="text" inputmode="decimal" placeholder="سعر المخدوم"><input id="f_eb" type="text" inputmode="decimal" placeholder="الميزانية (اختياري)"></div>
  <select id="f_ec"><option value="">كل الفصول</option>${opts(cls,c=>c.name,'')}</select>
  <button class="p" data-fa="addev">إضافة</button></div>`;
  const list=F.evs.filter(e=>!isAdmin()||F.accs.length<2||e.account_id===F.acc).map(e=>`<div class="row ${e.status==='closed'?'off':''}"><div>${esc(e.title)} <span class="bd">${EK[e.kind]}</span>${F.accs.length>1?badge(e.section):''}${e.status==='closed'?' <span class="bd" style="background:#fde9b8">مقفولة</span>':''}<small>${e.event_date?esc(e.event_date)+' · ':''}إيراد ${money(e.income)} · مصروف ${money(e.expense)} · صافي ${money(e.net)} · ${e.registered||0} مشترك</small></div><div class="acts"><button class="s" data-fa="openev" data-id="${e.id}">فتح</button></div></div>`).join('');
  return form+`<div class="card"><h2>الرحلات والمؤتمرات</h2>${list||'<div class="empty">لسه مفيش رحلات أو مؤتمرات.</div>'}</div>`;
}
function vEvDetail(){
  const e=evOf(F.ev);if(!e)return '';
  const open=e.status==='open';
  const cls=S.classes.filter(c=>c.section===e.section);
  const over=e.budget!=null&&Number(e.expense)>Number(e.budget);
  const head=`<div class="card"><button class="s" data-fa="back">رجوع</button><h2 style="margin-top:8px">${esc(e.title)} <span class="bd">${EK[e.kind]}</span>${badge(e.section)}</h2>
  <small>${e.event_date?esc(e.event_date)+' · ':''}${e.price_per_servee!=null?'السعر '+money(e.price_per_servee)+' · ':''}${open?'مفتوحة':'مقفولة'}</small>
  <div style="margin:8px 0">إيراد <b>${money(e.income)}</b> · مصروف <b style="${over?'color:#b3261e':''}">${money(e.expense)}</b>${e.budget!=null?' من '+money(e.budget):''} · صافي <b>${money(e.net)}</b></div>
  ${over?'<p class="err">المصروف عدّى الميزانية.</p>':''}
  ${isAdmin()?`<button class="s${open?' d':''}" data-fa="${open?'closeev':'reopenev'}">${open?'قفل الرحلة':'إعادة فتح'}</button>`:''}</div>`;
  const reg=open?`<div class="card"><h2>تسجيل مشتركين</h2><select id="f_rc"><option value="">اختار فصل</option>${opts(cls,c=>c.name,'')}</select><button class="p" data-fa="regclass">تسجيل الفصل كله</button></div>`:'';
  const dues=`<div class="card"><h2>المشتركين (${F.dues.length})</h2>${F.dues.map(d=>{const rem=Number(d.remaining);return `<div class="row"><div>${esc(sname(d.servee_id))}<small>المطلوب ${money(d.amount_due)} · دفع ${money(d.paid)} · ${rem>0?'باقي <b>'+money(rem)+'</b>':'<b style="color:#1b7a3d">خالص</b>'}</small></div><div class="acts">${open&&rem>0?`<button class="s on" data-fa="pay" data-id="${d.servee_id}">دفعة</button>`:''}${open&&Number(d.paid)===0?`<button class="s d" data-fa="unreg" data-id="${d.servee_id}">شيل</button>`:''}</div></div>`}).join('')||'<div class="empty">لسه ما سجّلتش مشتركين.</div>'}</div>`;
  const exp=open?`<div class="card"><h2>مصروف على الرحلة</h2><input id="e_amt" type="text" inputmode="decimal" placeholder="المبلغ"><select id="e_cat">${catOpts('expense')}</select><input id="e_note" placeholder="ملاحظة (اختياري)"><button class="p" data-fa="evexp">تسجيل مصروف</button></div>`:'';
  const tx=`<div class="card"><h2>حركات الرحلة</h2>${F.evtx.map(txRow).join('')||'<div class="empty">مفيش حركات.</div>'}</div>`;
  return head+reg+dues+exp+tx;
}

/* ---------- الأوامر ---------- */
async function insTx(row){
  const r=await sb.from('finance_tx').insert(row);
  return ok(r);
}
const ACT={
  v:b=>{F.v=b.dataset.id;F.ev=null;window.render()},
  back:()=>{F.ev=null;window.render()},
  acc:b=>{F.acc=b.value;window.render()},
  kind:b=>{F.k=b.value;window.render()},
  async addtx(){
    const amt=num(val('f_amt'));if(!(amt>0))return toast('اكتب المبلغ');
    if(await insTx({account_id:F.acc,kind:F.k,amount:amt,category_id:val('f_cat')||null,tx_date:val('f_date')||today(),note:val('f_note')||null})){toast('اتسجّلت');await refresh()}
  },
  async void(b){
    const why=prompt('سبب الإلغاء؟');if(why===null)return;
    if(ok(await sb.from('finance_tx').update({voided:true,void_reason:why||null}).eq('id',b.dataset.id))){toast('اتلغت');await refresh()}
  },
  async transfer(){
    const amt=num(val('f_tamt'));if(!(amt>0))return toast('اكتب المبلغ');
    const [f,t]=val('f_dir').split('>');
    if(ok(await sb.rpc('finance_transfer',{p_from:f,p_to:t,p_amount:amt,p_note:val('f_tnote')||null}))){toast('اتحوّل');await refresh()}
  },
  async addev(){
    if(!val('f_et'))return toast('اكتب الاسم');
    const row={account_id:F.acc,kind:val('f_ek'),title:val('f_et'),event_date:val('f_ed')||null,class_id:val('f_ec')||null};
    const p=num(val('f_ep')),bg=num(val('f_eb'));
    row.price_per_servee=isNaN(p)?null:p;row.budget=isNaN(bg)?null:bg;
    if(ok(await sb.from('finance_events').insert(row))){toast('اتضافت');await refresh()}
  },
  async openev(b){F.ev=b.dataset.id;await loadDues();window.render()},
  async closeev(){if(confirm('تقفل الرحلة؟ الأمين مش هيقدر يسجّل عليها بعد كده.')&&ok(await sb.from('finance_events').update({status:'closed'}).eq('id',F.ev)))await refresh()},
  async reopenev(){if(ok(await sb.from('finance_events').update({status:'open'}).eq('id',F.ev)))await refresh()},
  async regclass(){
    const e=evOf(F.ev),cid=val('f_rc');if(!cid)return toast('اختار الفصل');
    const rows=S.servees.filter(s=>s.class_id===cid&&s.active).map(s=>({event_id:F.ev,servee_id:s.id,amount_due:e.price_per_servee||0}));
    if(!rows.length)return toast('الفصل فاضي');
    if(ok(await sb.from('finance_event_servees').upsert(rows,{onConflict:'event_id,servee_id',ignoreDuplicates:true}))){toast('اتسجّلوا '+rows.length);await refresh()}
  },
  async unreg(b){if(confirm('تشيل المخدوم من الرحلة؟')&&ok(await sb.from('finance_event_servees').delete().eq('event_id',F.ev).eq('servee_id',b.dataset.id)))await refresh()},
  async pay(b){
    const e=evOf(F.ev),d=F.dues.find(x=>x.servee_id===b.dataset.id);if(!e||!d)return;
    const a=num(prompt('المبلغ المدفوع؟',String(d.remaining)));if(!(a>0))return;
    if(a>Number(d.remaining)&&!confirm('المبلغ أكبر من الباقي. تكمّل؟'))return;
    const cat=F.cats.find(c=>c.name===(e.kind==='trip'?'اشتراك رحلة':'اشتراك مؤتمر'));
    if(await insTx({account_id:e.account_id,kind:'income',amount:a,event_id:e.id,servee_id:d.servee_id,category_id:cat?cat.id:null})){toast('اتسجّلت الدفعة');await refresh()}
  },
  async evexp(){
    const e=evOf(F.ev),amt=num(val('e_amt'));if(!(amt>0))return toast('اكتب المبلغ');
    if(await insTx({account_id:e.account_id,kind:'expense',amount:amt,event_id:e.id,category_id:val('e_cat')||null,note:val('e_note')||null})){toast('اتسجّل');await refresh()}
  }
};
function onEvt(e,isChange){
  const b=e.target.closest&&e.target.closest('[data-fa]');if(!b)return;
  const sel=b.tagName==='SELECT';if(sel!==isChange)return;
  const f=ACT[b.dataset.fa];if(f){e.stopPropagation&&e.stopPropagation();f(b)}
}
document.addEventListener('click',e=>onEvt(e,false));
document.addEventListener('change',e=>onEvt(e,true));
// الدخول على التبويب بيحدّث البيانات
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-a="tab"][data-id="fin"]');if(b)F.ld=false},true);

/* ---------- التركيب في التطبيق ---------- */
const orig=window.render;
window.render=function(){
  if(!canFin()||S.cards)return orig();
  if(F.uid!==S.p.id){F.uid=S.p.id;F.ld=false;F.acc=null;F.ev=null}
  const fin=S.tab==='fin';
  if(fin)S.tab='home';
  orig();
  if(fin)S.tab='fin';
  const nav=document.querySelector('nav');
  if(nav){
    if(fin)nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));
    const bt=document.createElement('button');bt.dataset.a='tab';bt.dataset.id='fin';bt.textContent='الحسابات';
    if(fin)bt.className='on';
    nav.appendChild(bt);
  }
  if(fin){
    const m=document.querySelector('main');if(m)m.innerHTML=vFin();
    if(!F.ld&&!F.busy)boot();
  }
};
})();
