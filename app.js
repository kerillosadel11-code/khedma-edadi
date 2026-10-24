const sb=supabase.createClient('https://radvrgthxxtesjitzkil.supabase.co','sb_publishable_UFK-e5F6zuI2qZ2P5KVjiw_LrE33N_k');
const S={nt:[],an:null,cmp:null,pr:null,pc:'',pbell:false,th:2,rd:56,rc:'',ah:null,fu:null,fuf:null,tab:'home',f:'',q:'',lim:50,st:'act',ed:null,edc:null,imp:null,aud:null,af:''},app=document.getElementById('app');
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const v=id=>document.getElementById(id).value.trim();
const ROLES={admin:'أدمن',secretary:'أمين خدمة',servant:'خادم',parent:'ولي أمر'};
const SEC={boys:'بنين',girls:'بنات'};
const isAdmin=()=>S.p&&S.p.role==='admin',isSec=()=>S.p&&S.p.role==='secretary',canManage=()=>isAdmin()||isSec();
const roleLabel=p=>(ROLES[p.role]||p.role)+((p.role==='secretary'&&p.section)?' '+SEC[p.section]:'');
const badge=sc=>sc&&SEC[sc]?`<span class="bd">${SEC[sc]}</span>`:'';
const cLabel=c=>c.name+(isAdmin()&&c.section?' · '+SEC[c.section]:'');
function toast(m){const t=document.getElementById('t');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',3000)}
const ok=r=>{if(r.error){toast(r.error.code==='23505'?'ده متسجّل قبل كده (مكرر)':'حصل خطأ: '+r.error.message);return false}return true};
const EMAIL_DOMAIN='khedma.app';
function normPhone(raw){
  let d=String(raw||'').replace(/[٠-٩]/g,c=>c.charCodeAt(0)-0x660).replace(/[۰-۹]/g,c=>c.charCodeAt(0)-0x6f0).replace(/\D/g,'');
  if(d.startsWith('0020'))d='0'+d.slice(4);else if(d.startsWith('20')&&d.length===12)d='0'+d.slice(2);else if(d.length===10&&d[0]==='1')d='0'+d;
  return /^01[0125]\d{8}$/.test(d)?d:null;
}
const toEmail=x=>{if(x.includes('@'))return x;const p=normPhone(x);return p?p+'@'+EMAIL_DOMAIN:null};
async function fn(body,name='create-user'){
  const {data,error}=await sb.functions.invoke(name,{body});
  if(error){let m=error.message;try{const j=await error.context.json();if(j.error)m=j.error}catch(_){}return{error:m}}
  return data;
}
async function fetchAll(mk){let out=[],f=0;for(;;){const r=await mk().range(f,f+999);if(r.error)return r;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000)return{data:out,error:null};f+=1000}}
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
S.sec=(()=>{try{const x=localStorage.getItem('khedma_sec');return x==='boys'||x==='girls'?x:''}catch(_){return ''}})();S.all=null;S.sq='';S.sfc='';S.ssec='';S.sso=null;S.sed=null;S.date=today();S.pd=today();S.photos={};S.att=[];S.sa=[];S.lp=[];
const av=(s,z=44)=>{const u=S.photos[s.id];return u?`<img class="av" src="${u}" alt="" style="width:${z}px;height:${z}px">`:`<span class="av" style="width:${z}px;height:${z}px;font-size:${Math.round(z/2.4)}px">${esc((s.full_name||'؟').trim().charAt(0))}</span>`};
function qrImg(code){if(!code)return'';const q=qrcode(0,'M');q.addData(code);q.make();return `<img src="${q.createDataURL(4,4)}" alt="QR">`}
const rpcErr=e=>({NOT_FOUND:'الكود ده مش معروف',FORBIDDEN:'المخدوم ده مش في فصلك',INACTIVE:'المخدوم ده موقوف',BAD_DATE:'التاريخ ده في المستقبل',BAD_STATUS:'حالة غير صحيحة',BAD_TITLE:'اكتب عنوان الإعلان',BAD_SECTION:'اختار القسم',BAD_SCOPE:'نطاق غير صحيح',BAD_POINTS:'عدد النقاط غير مسموح (من 1 لـ 50)',BAD_COMP:'المسابقة دي مش لفصل المخدوم ده'}[e.message]||e.message);
async function loadAtt(){const r=await sb.from('attendance_days').select('servee_id,status').eq('att_date',S.date);if(ok(r))S.att=fSv(r.data||[])}
async function loadPhotos(){
  const ps=S.servees.filter(x=>x.photo_path);S.photos={};if(!ps.length)return;
  const {data}=await sb.storage.from('servee-photos').createSignedUrls(ps.map(x=>x.photo_path),3600);
  (data||[]).forEach(d=>{const x=ps.find(y=>y.photo_path===d.path);if(x&&d.signedUrl)S.photos[x.id]=d.signedUrl});
}
const acid=()=>S.classes.some(c=>c.id===S.ac)?S.ac:(S.classes[0]||{}).id;
const opts=(a,l,sel)=>a.map(x=>`<option value="${x.id}"${x.id===sel?' selected':''}>${esc(l(x))}</option>`).join('');

function login(){
  app.innerHTML=`<main class="card login"><img src="logo.png" alt="كاتدرائية الشهيد العظيم مار مينا" style="width:100%;height:auto;display:block;margin-bottom:12px"><h1>خدمة إعدادي</h1><p>سجّل دخولك للمتابعة</p>
  <input id="em" type="text" inputmode="tel" placeholder="رقم التليفون" autocomplete="username" dir="ltr">
  <input id="pw" type="password" placeholder="الباسورد" autocomplete="current-password" dir="ltr">
  <button class="p" data-a="login">دخول</button><p class="err" id="err"></p></main>`;
}
function pwScreen(){
  app.innerHTML=`<main class="card login"><h1>غيّر الباسورد</h1><p>ده أول دخول ليك. اختار باسورد جديد تفتكره.</p>
  <input id="n1" type="password" placeholder="الباسورد الجديد (8 حروف على الأقل)" autocomplete="new-password" dir="ltr">
  <input id="n2" type="password" placeholder="أكّد الباسورد" autocomplete="new-password" dir="ltr">
  <button class="p" data-a="setpw">حفظ والدخول</button><p class="err" id="err"></p><a href="#" data-a="out">خروج</a></main>`;
}
const joinTok=()=>{const m=location.hash.match(/^#join=([0-9a-fA-F]{32,128})$/);return m?m[1].toLowerCase():null};
const rnd=()=>[...crypto.getRandomValues(new Uint8Array(24))].map(b=>b.toString(16).padStart(2,'0')).join('');
const sha=async t=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const joinWrap=h=>`<main class="card login"><img src="logo.png" alt="" style="width:100%;height:auto;display:block;margin-bottom:12px">${h}</main>`;
async function joinScreen(t){
  app.innerHTML=joinWrap('<h1>دعوة للانضمام</h1><p>بنتأكد من الدعوة...</p>');
  const x=await fn({action:'peek',token:t},'accept-invite');
  if(x.error)return app.innerHTML=joinWrap(`<h1>الدعوة مش شغّالة</h1><p class="err">${esc(x.error)}</p><a href="#" data-a="joinhome">الدخول للتطبيق</a>`);
  const who=x.role==='secretary'?'أمين خدمة '+(SEC[x.section]||''):x.role==='parent'?'ولي أمر '+esc(x.servee_name||''):'خادم في فصل '+esc(x.class_name||'');
  app.innerHTML=joinWrap(`<h1>أهلاً بيك في خدمة إعدادي</h1><p>دعوة للانضمام كـ <b>${who}</b></p>
  <input id="jn" placeholder="الاسم بالكامل"><input id="jp" type="tel" inputmode="tel" placeholder="رقم التليفون (هو اسم الدخول)" dir="ltr">
  <input id="j1" type="password" placeholder="اختار باسورد (8 حروف على الأقل)" autocomplete="new-password" dir="ltr"><input id="j2" type="password" placeholder="أكّد الباسورد" autocomplete="new-password" dir="ltr">
  <button class="p" data-a="joinGo">انضمام</button><p class="err" id="err"></p>${x.role==='servant'?'<p class="empty">بعد التسجيل، حسابك هيستنى موافقة أمين الخدمة.</p>':x.role==='parent'?'<p class="empty">بعد التسجيل هتدخل على طول وتتابع حضور ابنك.</p>':''}`);
}
async function joinGo(){
  const t=joinTok(),er=document.getElementById('err'),n=v('jn'),ph=normPhone(v('jp')),p1=document.getElementById('j1').value,p2=document.getElementById('j2').value;
  if(!t)return;
  if(!n)return er.textContent='اكتب اسمك.';
  if(!ph)return er.textContent='رقم التليفون مش صحيح (مثال: 01012345678).';
  if(p1.length<8)return er.textContent='الباسورد لازم يكون 8 حروف على الأقل.';
  if(p1!==p2)return er.textContent='الباسورد مش متطابق.';
  const b=document.querySelector('[data-a=joinGo]');b.disabled=true;er.textContent='';
  const x=await fn({action:'accept',token:t,name:n,phone:ph,password:p1},'accept-invite');
  b.disabled=false;
  if(x.error)return er.textContent=x.error;
  history.replaceState(null,'',location.pathname);
  if(!x.pending){await sb.auth.signOut();const {error}=await sb.auth.signInWithPassword({email:ph+'@'+EMAIL_DOMAIN,password:p1});if(!error)return boot();return login()}
  app.innerHTML=joinWrap(`<h1>تم التسجيل ✅</h1><p>رقم الدخول بتاعك: <b dir="ltr">${esc(x.login)}</b></p><p>حسابك دلوقتي مستني موافقة أمين الخدمة. أول ما يوافق تقدر تدخل بنفس الرقم والباسورد اللي اخترتهم.</p><a href="#" data-a="joinhome">صفحة الدخول</a>`);
}
async function boot(){
  const jt=joinTok();if(jt)return joinScreen(jt);
  const {data:{user}}=await sb.auth.getUser();
  if(!user)return login();
  if(user.user_metadata&&user.user_metadata.must_change)return pwScreen();
  const {data:p}=await sb.from('profiles').select('*').eq('id',user.id).single();
  if(!p||!p.active){const pend=p&&p.pending;await sb.auth.signOut();login();if(pend){const e=document.getElementById('err');if(e)e.textContent='حسابك لسه مستني موافقة أمين الخدمة.'}return}
  S.p=p;
  if(p.role==='admin'||p.role==='secretary'||p.role==='servant'){await load();render()}
  else{await loadParent();app.innerHTML=head()+vParent()}
  askPush();
}
async function loadParent(){
  const l=await sb.from('parent_links').select('servee_id').eq('parent_id',S.p.id);ok(l);
  const ids=(l.data||[]).map(x=>x.servee_id);S.hist=[];
  if(!ids.length){S.servees=[];S.classes=[];S.photos={};return}
  const r=await Promise.all([sb.from('servees').select('*').in('id',ids).order('full_name'),sb.from('classes').select('*'),sb.from('attendance_days').select('servee_id,att_date,status').in('servee_id',ids).order('att_date',{ascending:false}).limit(500)]);
  r.forEach(ok);[S.servees,S.classes,S.hist]=r.map(x=>x.data||[]);
  const pt=await sb.from('servee_points').select('servee_id,total_points').in('servee_id',ids);
  S.pts=pt.error?{}:Object.fromEntries((pt.data||[]).map(x=>[x.servee_id,x.total_points]));
  await loadNotifs();
  await loadPhotos();
}
const fdate=d=>new Date(d+'T00:00:00').toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'});
function vParent(){
  if(!S.servees.length)return `<main>${S.pbell?vNotif():''}<div class="card"><h2>أهلاً ${esc(S.p.full_name)}</h2><div class="empty">لسه مفيش ابن مربوط بحسابك. كلّم أبونا يربطه.</div></div></main>`;
  return `<main>${S.pbell?vNotif():''}<h2 style="margin:0 0 10px">أهلاً ${esc(S.p.full_name)}</h2>`+S.servees.map(x=>{
    const H=S.hist.filter(h=>h.servee_id===x.id),P=H.filter(h=>h.status==='present').length,B=H.length-P,pc=H.length?Math.round(P*100/H.length):0;
    return `<div class="card"><div class="who">${av(x,64)}<div><b style="font-size:18px">${esc(x.full_name)}</b><small>${esc(cname(x.class_id))}</small></div></div>
    <div class="cnt" style="margin-top:12px"><span>حاضر ${P}</span><span>غايب ${B}</span>${H.length?`<span>نسبة الحضور ${pc}%</span>`:''}${(S.pts||{})[x.id]>0?`<span>النقاط ${S.pts[x.id]}</span>`:''}</div>
    <h2 style="margin-top:8px">آخر الأسابيع</h2>${H.slice(0,12).map(h=>`<div class="row"><div>${fdate(h.att_date)}</div><span style="font-weight:700;color:${h.status==='present'?'#1b7a43':'var(--red)'}">${h.status==='present'?'حاضر':'غايب'}</span></div>`).join('')||'<div class="empty">لسه مفيش حضور متسجّل.</div>'}</div>`}).join('')+`</main>`;
}
const unread=()=>(S.nt||[]).filter(n=>!n.is_read).length;
const head=()=>`<header><b>خدمة إعدادي</b><span><a href="#" data-a="bell" style="color:#fff;text-decoration:none" aria-label="الإشعارات">🔔${unread()?` <b style="background:var(--red);border-radius:10px;padding:0 6px;font-size:12px">${unread()}</b>`:''}</a> · <a href="#" data-a="diag" aria-label="فحص الإشعارات" style="color:#fff;text-decoration:none">🩺<i id="pdot" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:3px;background:${S.pushSt==='on'?'#3ecf8e':S.pushSt?'#ff6b5e':'#999'}"></i></a> · ${esc(S.p.full_name)} · ${esc(roleLabel(S.p))} · <a href="#" data-a="out" style="color:#fff">خروج</a></span></header>${secBar()}`;
async function load(){
  if(canManage())await loadAdmin();
  else{
    const r=await Promise.all([sb.from('classes').select('*').order('created_at'),fetchAll(()=>sb.from('servees').select('*').order('full_name').order('id')),sb.from('class_servants').select('*')]);
    r.forEach(ok);[S.classes,S.servees,S.cs]=r.map(x=>x.data||[]);S.profiles=[];S.pl=[];
  }
  S.inv=[];if(canManage()){const ri=await sb.from('invites').select('*').order('created_at',{ascending:false});S.inv=ri.error?[]:(ri.data||[]).filter(i=>!secOn()||!i.section||i.section===S.sec)}
  await Promise.all([loadAtt(),loadPhotos(),loadExtra(),loadHist()]);
  if(!canManage())await loadMates();
}
async function loadExtra(){
  const d0=new Date(Date.now()-90*864e5).toISOString().slice(0,10);
  const [a,b]=await Promise.all([sb.from('servant_attendance').select('servant_id,att_date,status').gte('att_date',d0),sb.from('lesson_prep').select('*').order('prep_date',{ascending:false}).limit(200)]);
  S.sa=a.error?[]:(a.data||[]);S.lp=b.error?[]:(b.data||[]);
  if(secOn()){const pu=new Set(S.profiles.map(q=>q.id)),cu=new Set(S.classes.map(c=>c.id));S.sa=S.sa.filter(x=>pu.has(x.servant_id));S.lp=S.lp.filter(x=>cu.has(x.class_id))}
  await loadNotifs();
}
async function loadAdmin(){
  const r=await Promise.all([sb.from('classes').select('*').order('created_at'),fetchAll(()=>sb.from('servees').select('*').order('full_name').order('id')),sb.from('profiles').select('*').order('full_name'),sb.from('class_servants').select('*'),sb.from('parent_links').select('*')]);
  r.forEach(ok);
  [S.classes,S.servees,S.profiles,S.cs,S.pl]=r.map(x=>x.data||[]);
  S.all={classes:S.classes,servees:S.servees,profiles:S.profiles,cs:S.cs,pl:S.pl};applySec();
}
/* ===== مبدّل القسم لأبونا: الكل / بنين / بنات (الفلترة في التطبيق بعد التحميل) ===== */
const secOn=()=>isAdmin()&&!!S.sec;
function clearStale(){
  const has=id=>S.classes.some(c=>c.id===id);
  if(S.sfc&&S.sfc!=='_none'&&!has(S.sfc))S.sfc='';
  if(S.f&&!has(S.f))S.f='';if(S.rc&&!has(S.rc))S.rc='';if(S.ac&&!has(S.ac))S.ac=null;
  S.ssec='';S.sf='';
}
function applySec(){
  const A=S.all;if(!A)return;
  const sec=isAdmin()?S.sec:'';
  if(!sec){S.classes=A.classes;S.servees=A.servees;S.profiles=A.profiles;S.cs=A.cs;S.pl=A.pl;clearStale();return}
  const cl=A.classes.filter(c=>c.section===sec),cid=new Set(cl.map(c=>c.id)),
    sv=A.servees.filter(x=>x.section===sec||cid.has(x.class_id)||(!x.section&&!x.class_id)),sid=new Set(sv.map(x=>x.id)),
    cs=A.cs.filter(x=>cid.has(x.class_id)),csu=new Set(cs.map(x=>x.servant_id)),anyCs=new Set(A.cs.map(x=>x.servant_id)),
    pl=A.pl.filter(x=>sid.has(x.servee_id)),plu=new Set(pl.map(x=>x.parent_id));
  S.classes=cl;S.servees=sv;S.cs=cs;S.pl=pl;
  S.profiles=A.profiles.filter(q=>q.role==='admin'||(q.role==='secretary'?q.section===sec:q.role==='servant'?(q.section===sec||csu.has(q.id)||(!q.section&&!anyCs.has(q.id))):(plu.has(q.id)||(q.pending&&!q.active&&!q.section))));
  clearStale();
}
const fSv=rows=>{if(!secOn())return rows;const ids=new Set(S.servees.map(x=>x.id));return rows.filter(r=>ids.has(r.servee_id))};
function secBar(){
  if(!isAdmin())return'';
  return `<div class="secbar">${[['','الكل (بنين وبنات)'],['boys','خدمة بنين'],['girls','خدمة بنات']].map(([k,n])=>`<button class="s${S.sec===k?' on':''}" data-a="sec" data-id="${k}">${n}</button>`).join('')}</div>`;
}

const cname=id=>{const c=S.classes.find(c=>c.id===id);return c?cLabel(c):'بدون فصل'};
const pname=id=>(S.profiles.find(c=>c.id===id)||{}).full_name||'؟';
const sname=id=>(S.servees.find(c=>c.id===id)||{}).full_name||'؟';

const NAVIC={home:'🏠',mycls:'🧑‍🏫',mysv:'🧒',mypr:'👪',classes:'🏫',servees:'🧒',srv:'🤝',people:'👥',add:'➕',inv:'💬',att:'✅',sat:'🙋',prep:'📖',follow:'📞',comp:'🏆',ann:'📢',msg:'✉️',pst:'📡',set:'⚙️',rep:'📊',audit:'🛡️',notif:'🔔'};
function render(){
  const adm=canManage();
  if(S.cards)return app.innerHTML=head()+vCards();
  if(S.pf)return app.innerHTML=head()+vProfile();
  if(!adm&&!['mycls','mysv','mypr','att','prep','sat','follow','comp','notif'].includes(S.tab))S.tab='mycls';
  const T=adm?[['home','الرئيسية'],['classes','الفصول'],['servees','المخدومين'],['srv','الخدام'],['people','المستخدمين'+(S.profiles.some(p=>p.pending&&!p.active)?' ('+S.profiles.filter(p=>p.pending&&!p.active).length+')':'')],['add','مستخدم جديد'],['inv','دعوات واتساب'],['att','حضور المخدومين'],['sat','حضور الخدام'],['prep','تحضير الدرس'],['follow','الافتقاد'],['comp','المسابقات'],['ann','الإعلانات'],['msg','الرسائل'],['pst','حالة الإشعارات'],['rep','التقارير']].concat(isAdmin()?[['audit','السجل'],['set','الإعدادات']]:[]):[['mycls','فصلي'],['mysv','المخدومين'],['mypr','أولياء الأمور'],['att','حضور المخدومين'],['prep','تحضير الدرس'],['follow','الافتقاد'],['comp','المسابقات'],['sat','حضوري']];
  app.innerHTML=head()+`<main>${{mycls:vMyClass,mysv:vMyServees,mypr:vMyParents,classes:vClasses,servees:vServees,srv:vSrv,people:vPeople,add:vAdd,inv:vInv,att:vAtt,sat:vSat,prep:vPrep,home:vHome,audit:vAudit,follow:vFollow,rep:vRep,notif:vNotif,comp:vComp,ann:vAnn,msg:vMsg,pst:vPst,set:vSet}[S.tab]()}</main><nav class="bn">${T.map(([k,n])=>`<button data-a="tab" data-id="${k}" class="${S.tab===k?'on':''}"><i aria-hidden="true">${NAVIC[k]||'•'}</i><span>${n}</span></button>`).join('')}</nav>`;
  const on=document.querySelector('nav.bn .on');if(on)on.scrollIntoView({inline:'nearest',block:'nearest'});
}
function vClasses(){
  const ec=S.classes.find(c=>c.id===S.edc);
  const edit=ec?`<div class="card" style="border-color:var(--gold)"><h2>تعديل الفصل</h2><input id="ecn" value="${esc(ec.name)}" placeholder="اسم الفصل"><input id="ecs" value="${esc(ec.stage||'')}" placeholder="المرحلة (اختياري)">${isAdmin()?`<select id="ecsec"><option value="">اختار القسم</option><option value="boys"${ec.section==='boys'?' selected':''}>بنين</option><option value="girls"${ec.section==='girls'?' selected':''}>بنات</option></select>`:''}<button class="p" data-a="saveClass">حفظ</button><button class="s" data-a="cancelEdit" style="margin-top:8px">إلغاء</button></div>`:'';
  return edit+`<div class="card"><h2>إضافة فصل</h2><input id="cn" placeholder="اسم الفصل (مثال: أولى إعدادي)"><input id="cs" placeholder="المرحلة (اختياري)">${isSec()?`<select id="csec" disabled><option>${SEC[S.p.section]}</option></select>`:`<select id="csec"><option value="">اختار القسم</option><option value="boys"${S.sec==='boys'?' selected':''}>بنين</option><option value="girls"${S.sec==='girls'?' selected':''}>بنات</option></select>`}<button class="p" data-a="addClass">إضافة الفصل</button></div>
  <div class="card"><h2>الفصول (${S.classes.length})</h2>${S.classes.map(c=>`<div class="row"><div>${esc(c.name)}${badge(c.section)}<small>${esc(c.stage||'')} ${S.servees.filter(s=>s.class_id===c.id&&s.active).length} مخدوم · ${S.cs.filter(x=>x.class_id===c.id).length} خادم</small></div><div class="acts"><button class="s${S.cso===c.id?' on':''}" data-a="classOpen" data-id="${c.id}">${S.cso===c.id?'إخفاء':'الخدام والمخدومين'}</button><button class="s" data-a="editClass" data-id="${c.id}">تعديل</button><button class="s" data-a="promoteClass" data-id="${c.id}">ترقية</button><button class="s d" data-a="delClass" data-id="${c.id}">حذف</button></div></div>${S.cso===c.id?classDetail(c):''}`).join('')||'<div class="empty">لسه مفيش فصول. أضف أول فصل من فوق.</div>'}</div>`;
}
/* تفاصيل الفصل: الخدام + المخدومين وجنب كل مخدوم ولي أمره (للأمين وأبونا) */
const contactLinks=raw=>{const n=normPhone(raw);return n?`<a href="tel:${n}">اتصال</a><a href="https://wa.me/2${n}" target="_blank" rel="noopener">واتساب</a>`:''};
function classDetail(c){
  const srv=S.cs.filter(x=>x.class_id===c.id).map(x=>S.profiles.find(p=>p.id===x.servant_id)).filter(Boolean).sort((a,b)=>(a.full_name||'').localeCompare(b.full_name||'','ar'));
  const sv=S.servees.filter(x=>x.class_id===c.id&&x.active).sort((a,b)=>(a.full_name||'').localeCompare(b.full_name||'','ar'));
  const guard=sid=>S.pl.filter(l=>l.servee_id===sid).map(l=>S.profiles.find(p=>p.id===l.parent_id)).filter(Boolean);
  const srvRows=srv.map(p=>{const ph=p.contact_phone||p.phone;return `<div class="row"><div>${esc(p.full_name||'بدون اسم')}${p.active?'':'<span class="bd" style="background:#f3d6d2">موقوف</span>'}${ph?`<small dir="ltr" style="text-align:right">${esc(ph)}</small>`:''}</div><div class="cnt" style="margin:0">${contactLinks(ph)}</div></div>`}).join('')||'<div class="empty">مفيش خدام مربوطين بالفصل ده.</div>';
  const svRows=sv.map(s=>{const g=guard(s.id);return `<div class="row"><div class="who">${av(s,36)}<div>${esc(s.full_name)}${s.phone?`<small dir="ltr" style="text-align:right">${esc(s.phone)}</small>`:''}${g.length?g.map(p=>{const ph=p.contact_phone||p.phone;return `<small>ولي الأمر: ${esc(p.full_name||'بدون اسم')}${ph?` · <span dir="ltr">${esc(ph)}</span>`:''}</small>`}).join(''):'<small style="color:var(--red)">ولي الأمر: مش مسجّل</small>'}</div></div><div class="cnt" style="margin:0;flex-direction:column;gap:4px">${g.map(p=>contactLinks(p.contact_phone||p.phone)).join('')||contactLinks(s.phone)}</div></div>`}).join('')||'<div class="empty">مفيش مخدومين في الفصل ده.</div>';
  return `<div class="srv open"><div class="srvd"><h3>الخدام (${srv.length})</h3>${srvRows}<h3>المخدومين وأولياء أمورهم (${sv.length})</h3>${svRows}</div></div>`;
}
const nz=t=>String(t||'').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u064B-\u0652]/g,'').trim();
function svFiltered(){
  const q=nz(S.q);
  return S.servees.filter(s=>(!S.f||s.class_id===S.f)&&(!S.sf||s.section===S.sf)&&(S.st==='all'||(S.st==='arch'?!s.active:s.active))&&(!q||nz(s.full_name).includes(q)||(s.phone||'').includes(S.q.trim())||nz(s.code).includes(q)));
}
function svRow(s){
  return `<div class="row ${s.active?'':'off'}"><div class="who">${av(s)}<div>${esc(s.full_name)}${badge(s.section)}${s.active?'':'<span class="bd" style="background:#f3d6d2">مؤرشف</span>'}<small>${esc(cname(s.class_id))}${s.phone?' · '+esc(s.phone):''}${!s.active&&s.archive_reason?' · '+esc(s.archive_reason):''}</small></div></div><div class="acts"><button class="s on" data-a="pf" data-id="${s.id}">الملف</button><button class="s" data-a="editServee" data-id="${s.id}">تعديل</button>${canManage()&&s.active?`<button class="s" data-a="parInv" data-id="${s.id}">دعوة ولي أمر</button>`:''}<button class="s" data-a="photo" data-id="${s.id}">صورة</button><button class="s" data-a="card" data-id="${s.id}">كارت</button>${s.active?`<button class="s" data-a="archServee" data-id="${s.id}">أرشفة</button>`:`<button class="s on" data-a="restServee" data-id="${s.id}">استرجاع</button>`}${canManage()?`<button class="s d" data-a="delServee" data-id="${s.id}">حذف</button>`:''}</div></div>`;
}
function svList(){
  const L=svFiltered();
  return `<h2>المخدومين (${L.length})</h2>`+L.slice(0,S.lim).map(svRow).join('')+(L.length>S.lim?`<button class="s" data-a="more" style="width:100%;margin-top:8px">عرض المزيد (${L.length-S.lim})</button>`:'')+(L.length?'':'<div class="empty">مفيش مخدومين بالشكل ده.</div>');
}
function svEditCard(){
  const s=S.servees.find(x=>x.id===S.ed);if(!s)return'';
  return `<div class="card" style="border-color:var(--gold)"><h2>تعديل: ${esc(s.full_name)}</h2><input id="en" value="${esc(s.full_name)}" placeholder="الاسم بالكامل"><div class="two"><input id="ep" type="tel" dir="ltr" value="${esc(s.phone||'')}" placeholder="التليفون"><input id="eb" type="date" value="${esc(s.birth_date||'')}" aria-label="تاريخ الميلاد"></div><select id="ec"><option value="">بدون فصل</option>${opts(S.classes,cLabel,s.class_id)}</select><input id="ea" value="${esc(s.address||'')}" placeholder="العنوان"><textarea id="eno" rows="2" placeholder="ملاحظات">${esc(s.notes||'')}</textarea><button class="p" data-a="saveServee">حفظ</button><button class="s" data-a="cancelEdit" style="margin-top:8px">إلغاء</button></div>`;
}
function impCard(){
  const m=S.imp;if(!m)return'';
  return `<div class="card" style="border-color:var(--gold)"><h2>معاينة الاستيراد · ${esc(cname(m.cid))}</h2><div class="cnt"><span>جديد ${m.ok.length}</span><span>مكرر (هيتخطّى) ${m.dup}</span><span>بدون اسم ${m.bad}</span></div>${m.ok.slice(0,8).map(r=>`<div class="row"><div>${esc(r.full_name)}<small>${esc(r.phone||'')} ${esc(r.birth_date||'')}</small></div></div>`).join('')}${m.ok.length>8?`<div class="empty">و ${m.ok.length-8} كمان...</div>`:''}<button class="p" data-a="csvGo"${m.ok.length?'':' disabled'}>استيراد ${m.ok.length} مخدوم</button><button class="s" data-a="csvCancel" style="margin-top:8px">إلغاء</button></div>`;
}
function vServees(){
  return svEditCard()+impCard()+`<div class="card"><h2>إضافة مخدوم</h2><input id="sn" placeholder="الاسم بالكامل"><div class="two"><input id="sp" type="tel" placeholder="التليفون" dir="ltr"><input id="sb" type="date" aria-label="تاريخ الميلاد"></div>
  <select id="sc"><option value="">اختار الفصل</option>${opts(S.classes,cLabel)}</select><input id="sa" placeholder="العنوان (اختياري)"><textarea id="sno" rows="2" placeholder="ملاحظات (اختياري)"></textarea><button class="p" data-a="addServee">إضافة المخدوم</button></div>
  <div class="card"><h2>استيراد من ملف CSV</h2><select id="icl2"><option value="">اختار الفصل</option>${opts(S.classes,cLabel)}</select><input type="file" accept=".csv,.txt" data-a="csvPick"><p class="empty">الأعمدة: الاسم، التليفون، تاريخ الميلاد، العنوان، ملاحظات. من Excel احفظ الملف كـ CSV UTF-8.</p></div>
  <div class="card"><input id="sq" type="search" data-a="search" placeholder="ابحث بالاسم أو التليفون أو الكود" value="${esc(S.q)}"><div class="two"><select data-a="filter"><option value="">كل الفصول</option>${opts(S.classes,cLabel,S.f)}</select><select data-a="stfilter"><option value="act"${S.st==='act'?' selected':''}>الشغّالين</option><option value="arch"${S.st==='arch'?' selected':''}>المؤرشفين</option><option value="all"${S.st==='all'?' selected':''}>الكل</option></select></div><button class="s" data-a="cards" style="margin-bottom:8px">طباعة كروت الظاهرين</button>
  <div id="sl">${svList()}</div></div>`;
}
function srvStats(id){const H=S.sa.filter(x=>x.servant_id===id),P=H.filter(x=>x.status==='present').length;return{n:H.length,P,A:H.filter(x=>x.status==='absent').length,E:H.filter(x=>x.status==='excused').length,pct:H.length?Math.round(P*100/H.length):null}}
const srvClasses=id=>S.cs.filter(x=>x.servant_id===id).map(x=>S.classes.find(c=>c.id===x.class_id)).filter(Boolean);
function srvFiltered(){
  const q=nz(S.sq);
  return S.profiles.filter(p=>p.role==='servant'&&(!S.ssec||p.section===S.ssec||srvClasses(p.id).some(c=>c.section===S.ssec))&&(!S.sfc||(S.sfc==='_none'?!srvClasses(p.id).length:S.cs.some(x=>x.servant_id===p.id&&x.class_id===S.sfc)))&&(!q||nz(p.full_name).includes(q)||(p.phone||'').includes(S.sq.trim())));
}
function srvRow(p){
  const cl=srvClasses(p.id),open=S.sso===p.id,ph=normPhone(p.contact_phone||p.phone);
  const head=`<div class="row ${p.active?'':'off'}" style="border-top:0"><div class="who">${av(p)}<div>${esc(p.full_name||'بدون اسم')}${p.pending&&!p.active?'<span class="bd" style="background:#fde9b8">مستني موافقة</span>':!p.active?'<span class="bd" style="background:#f3d6d2">موقوف</span>':''}<small>${cl.length?cl.map(c=>esc(cLabel(c))).join(' · '):'<span style="color:var(--red)">غير مربوط بفصل</span>'}</small></div></div><div class="acts"><button class="s${open?' on':''}" data-a="srvOpen" data-id="${p.id}">${open?'إخفاء':'التفاصيل'}</button></div></div>`;
  if(!open)return `<div class="srv">${head}</div>`;
  const st=srvStats(p.id),np=S.lp.filter(x=>x.created_by===p.id).length,free=S.classes.filter(c=>!cl.some(x=>x.id===c.id));
  const det=`<div class="srvd">
  <div class="cnt">${p.phone?`<span dir="ltr">${esc(p.phone)}</span>`:'<span>مفيش رقم تليفون</span>'}${ph?`<a href="tel:${ph}">اتصال</a><a href="https://wa.me/2${ph}" target="_blank" rel="noopener">واتساب</a>`:''}${nb({u:p.id},p.full_name||'')}</div>
  ${(p.contact_phone||p.birth_date||p.address||p.notes)?`<div class="cnt" style="flex-direction:column;gap:2px">${p.contact_phone?`<span>رقم التواصل: <span dir="ltr">${esc(p.contact_phone)}</span></span>`:''}${p.birth_date?`<span>الميلاد: ${esc(p.birth_date)}</span>`:''}${p.address?`<span>العنوان: ${esc(p.address)}</span>`:''}${p.notes?`<span>ملاحظات: ${esc(p.notes)}</span>`:''}</div>`:''}
  <h3>الفصول المربوط بيها (${cl.length})</h3>
  ${cl.map(c=>`<div class="row"><div>${esc(cLabel(c))}<small>${esc(c.stage||'')} ${S.servees.filter(s=>s.class_id===c.id&&s.active).length} مخدوم · ${S.cs.filter(x=>x.class_id===c.id).length} خادم في الفصل</small></div><button class="s d" data-a="delCS" data-id="${c.id}|${p.id}">فك</button></div>`).join('')||'<div class="empty">لسه مش مربوط بأي فصل.</div>'}
  ${free.length?`<div class="two"><select id="sac_${p.id}"><option value="">اختار فصل للربط</option>${opts(free,cLabel)}</select><button class="p" data-a="srvAddCS" data-id="${p.id}" style="margin:0">ربط بالفصل</button></div>`:''}
  <h3>الحضور (آخر 90 يوم)</h3>
  <div class="cnt">${st.n?`<span>حاضر ${st.P}</span><span>غايب ${st.A}</span><span>معتذر ${st.E}</span><span>نسبة الحضور ${st.pct}%</span>`:'<span>لسه مفيش حضور متسجّل</span>'}</div>
  <div class="cnt"><span>تحضيرات الدروس: ${np}</span></div>
  <div class="acts" style="justify-content:flex-start"><button class="s" data-a="srvEdit" data-id="${p.id}">تعديل البيانات</button><button class="s" data-a="resetPw" data-id="${p.id}">باسورد جديد</button><button class="s${p.pending&&!p.active?' on':''}" data-a="togUser" data-id="${p.id}">${p.pending&&!p.active?'موافقة':(p.active?'إيقاف':'تفعيل')}</button></div></div>`;
  return `<div class="srv open">${head}${det}</div>`;
}
function srvEditCard(){
  const p=S.profiles.find(x=>x.id===S.sed);if(!p)return'';
  return `<div class="card" style="border-color:var(--gold)"><h2>تعديل: ${esc(p.full_name||'')}</h2><input id="xn" value="${esc(p.full_name||'')}" placeholder="الاسم بالكامل"><div class="two"><input id="xp" type="tel" dir="ltr" value="${esc(p.contact_phone||'')}" placeholder="رقم تواصل (واتساب)"><input id="xb" type="date" value="${esc(p.birth_date||'')}" aria-label="تاريخ الميلاد"></div><input id="xa" value="${esc(p.address||'')}" placeholder="العنوان"><textarea id="xo" rows="2" placeholder="ملاحظات">${esc(p.notes||'')}</textarea><p class="empty">رقم الدخول للتطبيق (${esc(p.phone||'')}) مبيتغيّرش من هنا.</p><button class="p" data-a="srvSave">حفظ</button><button class="s" data-a="srvCancel" style="margin-top:8px">إلغاء</button></div>`;
}
function srvList(){
  const L=srvFiltered().sort((a,b)=>(a.full_name||'').localeCompare(b.full_name||'','ar'));
  return `<h2>الخدام (${L.length})</h2>`+(L.map(srvRow).join('')||'<div class="empty">مفيش خدام بالشكل ده.'+(isAdmin()?'<small style="display:block;direction:ltr;text-align:left">sec='+(S.sec||'all')+' · servants='+S.profiles.filter(p=>p.role==="servant").length+'/'+(S.all?S.all.profiles.filter(p=>p.role==="servant").length:'?')+' · fc='+(S.sfc||'-')+' · q='+(S.sq||'-')+'</small>':'')+'</div>');
}
function vSrv(){
  const all=S.profiles.filter(p=>p.role==='servant'),free=all.filter(p=>p.active&&!srvClasses(p.id).length).length;
  return credCard()+srvEditCard()+`<div class="card"><input id="srq" type="search" data-a="srvsearch" placeholder="ابحث باسم الخادم أو تليفونه" value="${esc(S.sq)}">
  <select data-a="srvfc"><option value="">كل الفصول</option><option value="_none"${S.sfc==='_none'?' selected':''}>غير مربوطين بفصل${free?' ('+free+')':''}</option>${opts(S.classes,cLabel,S.sfc)}</select>
  <p class="empty">الخدام الجداد بيتعملوا من تبويب "مستخدم جديد" أو "دعوات واتساب"، وبعدين تربطهم بفصل من هنا.</p></div>
  <div class="card" id="srl">${srvList()}</div>`;
}
const nextBday=d=>{const t=new Date(today()+'T00:00:00'),b=new Date(d+'T00:00:00');let n=new Date(t.getFullYear(),b.getMonth(),b.getDate());if(n<t)n=new Date(t.getFullYear()+1,b.getMonth(),b.getDate());return{days:Math.round((n-t)/864e5),date:n}};
function vHome(){
  const act=S.servees.filter(x=>x.active),srv=S.profiles.filter(p=>p.role==='servant'&&p.active),pend=S.profiles.filter(p=>p.pending&&!p.active);
  const P=S.att.filter(a=>a.status==='present').length,B=S.att.filter(a=>a.status==='absent').length;
  const bd=act.filter(x=>x.birth_date).map(x=>({x,...nextBday(x.birth_date)})).filter(o=>o.days<=7).sort((a,b)=>a.days-b.days);
  const lbl=o=>o.days===0?'النهارده':o.days===1?'بكرة':'بعد '+o.days+' أيام · '+o.date.toLocaleDateString('ar-EG',{day:'numeric',month:'long'});
  return absCard(absList(),8,true)+`<div class="card"><h2>نظرة عامة</h2><div class="cnt"><span>مخدومين ${act.length}</span><span>خدام ${srv.length}</span><span>فصول ${S.classes.length}</span></div>
  <div class="cnt"><span>حضور ${fdate(S.date)}:</span><span>حاضر ${P}</span><span>غايب ${B}</span></div></div>
  ${pend.length?`<div class="card" style="border-color:var(--gold)"><h2>مستنيين موافقة (${pend.length})</h2>${pend.map(p=>`<div class="row"><div>${esc(p.full_name||'بدون اسم')}${badge(p.section)}${p.phone?`<small dir="ltr" style="text-align:right">${esc(p.phone)}</small>`:''}</div><button class="s on" data-a="togUser" data-id="${p.id}">موافقة</button></div>`).join('')}</div>`:''}
  <div class="card"><h2>أعياد ميلاد الأسبوع (${bd.length})</h2>${bd.map(o=>{const ph=normPhone(o.x.phone||'');const wa=ph?`<a target="_blank" rel="noopener" class="s" style="text-decoration:none;display:inline-block" href="https://wa.me/20${ph.slice(1)}?text=${encodeURIComponent('كل سنة وانت طيب يا '+o.x.full_name.split(' ')[0]+' 🎂 ربنا يفرّح قلبك. خدمة إعدادي')}">تهنئة</a>`:'';return `<div class="row"><div class="who">${av(o.x,36)}<div>${esc(o.x.full_name)}<small>${esc(cname(o.x.class_id))} · ${lbl(o)}</small></div></div>${wa}</div>`}).join('')||'<div class="empty">مفيش أعياد ميلاد الأسبوع ده.</div>'}</div>`;
}
const TBL={profiles:'مستخدم',servees:'مخدوم',classes:'فصل',class_servants:'ربط خادم بفصل',parent_links:'ربط ولي أمر',invites:'دعوة'};
const OPL={INSERT:'إضافة',UPDATE:'تعديل',DELETE:'حذف'};
const FLD={full_name:'الاسم',name:'الاسم',phone:'التليفون',role:'الدور',active:'التفعيل',pending:'الموافقة',section:'القسم',class_id:'الفصل',address:'العنوان',contact_phone:'رقم التواصل',notes:'ملاحظات',birth_date:'الميلاد',stage:'المرحلة',revoked:'ملغاة',archived_at:'الأرشفة',archive_reason:'سبب الأرشفة'};
async function loadAudit(){const r=await sb.from('audit_log').select('*').order('at',{ascending:false}).limit(200);S.aud=r.error?[]:(r.data||[]);S.audErr=r.error?r.error.message:''}
function fv(k,x){if(x===null||x===undefined||x==='')return'—';if(typeof x==='boolean')return x?'نعم':'لا';if(k==='class_id')return cname(x);if(k==='role')return ROLES[x]||x;if(k==='section')return SEC[x]||x;if(k==='archived_at')return fdate(String(x).slice(0,10));return String(x)}
function vAudit(){
  const L=(S.aud||[]).filter(a=>!S.af||a.table_name===S.af);
  return `<div class="card"><h2>سجل العمليات</h2><select data-a="auditf"><option value="">كل الأنواع</option>${Object.entries(TBL).map(([k,n])=>`<option value="${k}"${S.af===k?' selected':''}>${n}</option>`).join('')}</select>${S.audErr?`<p class="err">${esc(S.audErr)}</p>`:''}
  ${L.map(a=>{const o=a.old_row||{},n=a.new_row||{},nm=n.full_name||n.name||o.full_name||o.name||'';
    let det='';if(a.op==='UPDATE'){det=Object.keys(FLD).filter(k=>JSON.stringify(o[k])!==JSON.stringify(n[k])).map(k=>FLD[k]+': '+fv(k,o[k])+' ← '+fv(k,n[k])).join(' | ')}
    return `<div class="row"><div><b>${OPL[a.op]||a.op}</b> ${TBL[a.table_name]||esc(a.table_name)}${nm?' · '+esc(nm):''}<small>${esc(pname(a.actor)==='؟'?'النظام':pname(a.actor))} · ${new Date(a.at).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'})}</small>${det?`<small>${esc(det)}</small>`:''}</div></div>`}).join('')||'<div class="empty">مفيش عمليات.</div>'}</div>`;
}
function parseCSV(t){const rows=[];let r=[],c='',q=false;t=t.replace(/^\uFEFF/,'');for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}else if(ch==='"')q=true;else if(ch===','||ch===';'||ch==='\t'){r.push(c);c=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';if(r.some(x=>x.trim()))rows.push(r);r=[]}else c+=ch}r.push(c);if(r.some(x=>x.trim()))rows.push(r);return rows}
const nd=x=>{x=String(x||'').replace(/[\u0660-\u0669]/g,c=>c.charCodeAt(0)-0x660).trim();let m=x.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/),y,mo,d;if(m){y=m[1];mo=m[2];d=m[3]}else{m=x.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);if(!m)return null;d=m[1];mo=m[2];y=m[3]}const s=`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`,t=new Date(s+'T00:00:00');return isNaN(t)||t.getMonth()+1!==+mo?null:s};
function buildImport(text,cid){
  const R=parseCSV(text);if(!R.length)return null;
  const col={name:0,phone:1,birth:2,addr:3,notes:4},h=R[0].map(nz),isH=h.some(x=>x.includes('اسم')||x==='name');
  if(isH){const f=(...ks)=>h.findIndex(x=>ks.some(k=>x.includes(k)));col.name=f('اسم','name');col.phone=f('تليفون','موبايل','phone','mobile');col.birth=f('ميلاد','birth');col.addr=f('عنوان','address');col.notes=f('ملاحظ','note')}
  const exP=new Set(S.servees.map(x=>normPhone(x.phone||'')).filter(Boolean)),exN=new Set(S.servees.map(x=>nz(x.full_name))),seen=new Set(),ok=[];let dup=0,bad=0;
  for(const r of R.slice(isH?1:0)){
    const g=i=>i>=0&&r[i]!==undefined?String(r[i]).trim():'',name=g(col.name);
    if(!name){bad++;continue}
    const ph=g(col.phone),np=normPhone(ph),key=nz(name)+'|'+(np||'');
    if((np&&exP.has(np))||exN.has(nz(name))||seen.has(key)){dup++;continue}
    seen.add(key);ok.push({full_name:name,phone:np||ph||null,birth_date:nd(g(col.birth)),address:g(col.addr)||null,notes:g(col.notes)||null,class_id:cid});
  }
  return{cid,ok,dup,bad};
}
function vAtt(){
  if(!S.classes.length)return '<div class="card"><div class="empty">مفيش فصل مربوط بيك لسه. اطلب من أبونا يربطك بفصل.</div></div>';
  const cid=acid(),L=S.servees.filter(x=>x.class_id===cid&&x.active),A=Object.fromEntries(S.att.map(a=>[a.servee_id,a.status]));
  const P=L.filter(x=>A[x.id]==='present').length,B=L.filter(x=>A[x.id]==='absent').length;
  return `<div class="card"><h2>حضور المخدومين</h2>
  <select data-a="attClass">${opts(S.classes,cLabel,cid)}</select><input type="date" data-a="attDate" value="${S.date}" max="${today()}">
  <button class="p" data-a="scan">مسح كارت QR</button>
  <div class="cnt"><span>حاضر ${P}</span><span>غايب ${B}</span><span>لسه ${L.length-P-B}</span></div>
  <button class="s" data-a="restAbs">سجّل الباقي غياب</button></div>
  <div class="card"><h2>المخدومين (${L.length})</h2>${L.map(x=>`<div class="row"><div class="who">${av(x)}<div>${esc(x.full_name)}</div></div><div class="acts"><button class="s ${A[x.id]==='present'?'on':''}" data-a="mark" data-id="${x.id}|present">حاضر</button><button class="s ${A[x.id]==='absent'?'on bad':''}" data-a="mark" data-id="${x.id}|absent">غايب</button></div></div>`).join('')||'<div class="empty">مفيش مخدومين في الفصل ده.</div>'}</div>`;
}
const SST={present:'حاضر',absent:'غايب',excused:'معتذر'};
const servList=()=>S.profiles.filter(p=>p.role==='servant'&&p.active);
function vSat(){
  if(!canManage()){
    const H=S.sa.filter(x=>x.servant_id===S.p.id).sort((a,b)=>b.att_date.localeCompare(a.att_date)),P=H.filter(x=>x.status==='present').length;
    return `<div class="card"><h2>حضوري</h2><div class="cnt"><span>حاضر ${P}</span><span>غايب ${H.filter(x=>x.status==='absent').length}</span><span>معتذر ${H.filter(x=>x.status==='excused').length}</span>${H.length?`<span>نسبة الحضور ${Math.round(P*100/H.length)}%</span>`:''}</div></div>
    <div class="card"><h2>آخر الأيام</h2>${H.slice(0,30).map(h=>`<div class="row"><div>${fdate(h.att_date)}</div><span style="font-weight:700;color:${h.status==='present'?'#1b7a43':h.status==='excused'?'var(--mut)':'var(--red)'}">${SST[h.status]}</span></div>`).join('')||'<div class="empty">لسه مفيش حضور متسجّل.</div>'}</div>`;
  }
  const L=servList(),A=Object.fromEntries(S.sa.filter(x=>x.att_date===S.date).map(x=>[x.servant_id,x.status]));
  const P=L.filter(x=>A[x.id]==='present').length,B=L.filter(x=>A[x.id]==='absent').length,E=L.filter(x=>A[x.id]==='excused').length;
  return `<div class="card"><h2>حضور الخدام</h2><input type="date" data-a="satDate" value="${S.date}" max="${today()}">
  <div class="cnt"><span>حاضر ${P}</span><span>غايب ${B}</span><span>معتذر ${E}</span><span>لسه ${L.length-P-B-E}</span></div>
  <button class="s" data-a="satRest">سجّل الباقي غياب</button></div>
  <div class="card"><h2>الخدام (${L.length})</h2>${L.map(x=>`<div class="row"><div>${esc(x.full_name||'بدون اسم')}${isAdmin()?badge(x.section):''}</div><div class="acts"><button class="s ${A[x.id]==='present'?'on':''}" data-a="smark" data-id="${x.id}|present">حاضر</button><button class="s ${A[x.id]==='absent'?'on bad':''}" data-a="smark" data-id="${x.id}|absent">غايب</button><button class="s ${A[x.id]==='excused'?'on':''}" data-a="smark" data-id="${x.id}|excused">معتذر</button></div></div>`).join('')||'<div class="empty">مفيش خدام مفعّلين لسه.</div>'}</div>`;
}
const PST={todo:'لم يبدأ',doing:'جاري',ready:'جاهز'};
function vPrep(){
  if(!S.classes.length)return '<div class="card"><div class="empty">مفيش فصل مربوط بيك لسه. اطلب من أبونا يربطك بفصل.</div></div>';
  const cid=acid(),cur=S.lp.find(p=>p.class_id===cid&&p.prep_date===S.pd)||{},mg=canManage();
  const miss=mg?S.classes.filter(c=>!S.lp.some(p=>p.class_id===c.id&&p.prep_date===S.pd&&p.status==='ready')):[];
  const L=S.lp.filter(p=>p.class_id===cid);
  return `<div class="card"><h2>تحضير الدرس</h2>
  <select data-a="attClass">${opts(S.classes,cLabel,cid)}</select>
  <input type="date" data-a="prepDate" value="${S.pd}" aria-label="تاريخ الدرس">
  <input id="pt" placeholder="موضوع الدرس" value="${esc(cur.topic||'')}">
  <textarea id="pn" rows="4" placeholder="ملاحظات التحضير (الأفكار، الأنشطة، الأدوات...)">${esc(cur.notes||'')}</textarea>
  <select id="ps">${Object.entries(PST).map(([k,n])=>`<option value="${k}"${(cur.status||'todo')===k?' selected':''}>${n}</option>`).join('')}</select>
  <button class="p" data-a="prepSave">حفظ التحضير</button>
  ${cur.approved?'<p class="empty">✓ معتمد من الأمين. أي تعديل من الخادم هيلغي الاعتماد.</p>':''}</div>
  ${mg?`<div class="card"><h2>لسه ما جهّزوش في ${fdate(S.pd)} (${miss.length})</h2>${miss.map(c=>`<div class="row"><div>${esc(cLabel(c))}</div></div>`).join('')||'<div class="empty">كل الفصول جاهزة.</div>'}</div>`:''}
  <div class="card"><h2>تحضيرات الفصل (${L.length})</h2>${L.map(p=>`<div class="row"><div>${fdate(p.prep_date)}<span class="bd">${PST[p.status]||''}</span>${p.approved?'<span class="bd" style="background:#cfeedd">معتمد</span>':''}<small>${esc(p.topic||'من غير موضوع')}</small></div><div class="acts"><button class="s" data-a="prepOpen" data-id="${p.prep_date}">فتح</button>${mg&&p.status==='ready'?`<button class="s${p.approved?' on':''}" data-a="prepApp" data-id="${p.id}">${p.approved?'إلغاء الاعتماد':'اعتماد'}</button>`:''}</div></div>`).join('')||'<div class="empty">لسه مفيش تحضير للفصل ده.</div>'}</div>`;
}
async function loadHist(){
  const d0=new Date(Date.now()-90*864e5).toISOString().slice(0,10);
  const [a,f]=await Promise.all([fetchAll(()=>sb.from('attendance_days').select('servee_id,att_date,status').gte('att_date',d0).order('att_date',{ascending:false}).order('servee_id')),fetchAll(()=>sb.from('followups').select('*').order('followup_date',{ascending:false}).order('created_at',{ascending:false}))]);
  if(a.error)toast('تعذّر تحميل سجل الحضور: '+a.error.message);
  S.ah=fSv(a.error?[]:(a.data||[]));S.fu=fSv(f.error?[]:(f.data||[]));
}
function histInfo(days){
  const d0=new Date(Date.now()-days*864e5).toISOString().slice(0,10),sv=new Map(S.servees.map(x=>[x.id,x])),byS={},datesByC={};
  for(const r of S.ah||[]){if(r.att_date<d0)continue;const x=sv.get(r.servee_id);if(!x||!x.active||!x.class_id)continue;(byS[r.servee_id]=byS[r.servee_id]||{})[r.att_date]=r.status;(datesByC[x.class_id]=datesByC[x.class_id]||new Set()).add(r.att_date)}
  return{byS,datesByC};
}
function servStat(x,H){
  const m=H.byS[x.id]||{},first=[(x.created_at||'').slice(0,10),...Object.keys(m)].filter(Boolean).sort()[0]||'',
    ds=[...(H.datesByC[x.class_id]||[])].filter(d=>d>=first).sort().reverse();
  let pr=0,streak=0,stop=false,last=null;
  for(const d of ds){if(m[d]==='present'){pr++;if(!last)last=d;stop=true}else if(!stop)streak++}
  return{sessions:ds.length,present:pr,absent:ds.length-pr,pct:ds.length?Math.round(pr*100/ds.length):null,streak,last};
}
const FK={call:'اتصال',visit:'زيارة',message:'رسالة'},FS={open:'متابعة',done:'تم'};
const bar=p=>`<div style="height:8px;background:var(--line);border-radius:4px;min-width:60px"><div style="width:${p||0}%;height:8px;background:var(--gold);border-radius:4px"></div></div>`;
function vFollow(){
  if(S.ah===null)return '<div class="card"><div class="empty">جاري التحميل...</div></div>';
  const H=histInfo(90),th=S.th||2,fu=S.fu||[],lastFu=id=>fu.find(f=>f.servee_id===id);
  const L=S.servees.filter(x=>x.active&&x.class_id&&(!S.f||x.class_id===S.f)).map(x=>({x,st:servStat(x,H)})).filter(o=>o.st.streak>=th).sort((a,b)=>b.st.streak-a.st.streak);
  let form='';
  if(S.fuf){const x=S.servees.find(y=>y.id===S.fuf);if(x)form=fuForm(x)}
  const rows=L.map(({x,st})=>{const ph=normPhone(x.phone||''),lf=lastFu(x.id);
    const wa=ph?`<a class="s" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block" href="https://wa.me/20${ph.slice(1)}?text=${encodeURIComponent('أهلاً يا '+x.full_name.split(' ')[0]+'، افتقدناك في الاجتماع. ربنا يباركك ويحفظك. خدمة إعدادي')}">واتساب</a>`:''+nb({s:x.id,m:MSGP.abs(x)},'أولياء أمور '+x.full_name);
    const tel=ph?`<a class="s" style="text-decoration:none;display:inline-block" href="tel:${ph}">اتصال</a>`:'';
    return `<div class="row"><div class="who">${av(x,40)}<div>${esc(x.full_name)}<small>${esc(cname(x.class_id))} · غايب ${st.streak} اجتماع ورا بعض${st.last?' · آخر حضور '+fdate(st.last):' · مفيش حضور في الفترة'}</small>${lf?`<small>آخر افتقاد: ${FK[lf.kind]||''} ${fdate(lf.followup_date)} (${FS[lf.status]||''})</small>`:'<small>لسه ما اتفتقدش</small>'}</div></div><div class="acts">${tel}${wa}<button class="s on" data-a="fuOpen" data-id="${x.id}">تسجيل</button></div></div>`}).join('');
  const recent=fu.filter(f=>S.servees.some(x=>x.id===f.servee_id)).slice(0,30);
  return form+`<div class="card"><h2>محتاجين افتقاد (${L.length})</h2><div class="two"><select data-a="filter"><option value="">كل الفصول</option>${opts(S.classes,cLabel,S.f)}</select><select data-a="th">${[2,3,4].map(n=>`<option value="${n}"${th===n?' selected':''}>غياب ${n} مرات ورا بعض</option>`).join('')}</select></div>${rows||'<div class="empty">مفيش حد محتاج افتقاد بالمعيار ده. ✓</div>'}</div>
  <div class="card"><h2>آخر الافتقادات (${recent.length})</h2>${recent.map(f=>`<div class="row"><div>${esc(sname(f.servee_id))}<small>${FK[f.kind]||esc(f.kind)} · ${fdate(f.followup_date)}${canManage()&&pname(f.servant_id)!=='؟'?' · '+esc(pname(f.servant_id)):''}</small>${f.note?`<small>${esc(f.note)}</small>`:''}</div><div class="acts"><span class="bd">${FS[f.status]||esc(f.status)}</span>${f.status==='open'?`<button class="s" data-a="fuDone" data-id="${f.id}">تم</button>`:''}</div></div>`).join('')||'<div class="empty">لسه مفيش افتقادات متسجلة.</div>'}</div>`;
}
function vRep(){
  if(S.ah===null)return '<div class="card"><div class="empty">جاري التحميل...</div></div>';
  const days=S.rd||56,H=histInfo(days),cls=S.classes.filter(c=>!S.rc||c.id===S.rc);
  const crow=cls.map(c=>{const act=S.servees.filter(x=>x.active&&x.class_id===c.id),ds=[...(H.datesByC[c.id]||[])].sort();
    const pcts=ds.map(d=>act.length?Math.round(act.filter(x=>(H.byS[x.id]||{})[d]==='present').length*100/act.length):0);
    return{c,act,ds,pcts,avg:pcts.length?Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length):null}});
  let det='';
  if(S.rc&&crow[0]){const o=crow[0],st=o.act.map(x=>({x,st:servStat(x,H)})).sort((a,b)=>(a.st.pct??101)-(b.st.pct??101));
    det=`<div class="card"><h2>اجتماعات ${esc(cname(S.rc))}</h2>${o.ds.slice().reverse().map((d,i)=>{const pr=o.act.filter(x=>(H.byS[x.id]||{})[d]==='present').length,p=o.pcts[o.ds.length-1-i];return `<div class="row"><div>${fdate(d)}<small>حاضر ${pr} من ${o.act.length}</small></div><div style="width:45%;text-align:left">${p}%${bar(p)}</div></div>`}).join('')||'<div class="empty">مفيش اجتماعات متسجلة في الفترة.</div>'}</div>
    <div class="card"><h2>المخدومين (${st.length})</h2>${st.map(({x,st:t})=>`<div class="row"><div>${esc(x.full_name)}<small>حاضر ${t.present} من ${t.sessions}${t.streak>=2?' · غايب '+t.streak+' ورا بعض':''}</small></div><div style="width:40%;text-align:left">${t.pct===null?'—':t.pct+'%'}${bar(t.pct)}</div></div>`).join('')||'<div class="empty">مفيش مخدومين.</div>'}</div>`}
  let sv='';
  if(canManage()&&S.profiles.length){const d0=new Date(Date.now()-days*864e5).toISOString().slice(0,10);
    const L=servList().map(p=>{const r=S.sa.filter(x=>x.servant_id===p.id&&x.att_date>=d0),pr=r.filter(x=>x.status==='present').length;return{p,pr,ab:r.filter(x=>x.status==='absent').length,ex:r.filter(x=>x.status==='excused').length,n:r.length,pct:r.length?Math.round(pr*100/r.length):null}}).sort((a,b)=>(a.pct??101)-(b.pct??101));
    sv=`<div class="card"><h2>حضور الخدام (${L.length})</h2><button class="s" data-a="exp" data-id="servants" style="margin-bottom:8px">تصدير Excel (CSV)</button>${L.map(o=>`<div class="row"><div>${esc(o.p.full_name||'بدون اسم')}${isAdmin()?badge(o.p.section):''}<small>حاضر ${o.pr} · غايب ${o.ab} · معتذر ${o.ex}</small></div><div style="width:40%;text-align:left">${o.pct===null?'—':o.pct+'%'}${bar(o.pct)}</div></div>`).join('')||'<div class="empty">مفيش خدام.</div>'}</div>`}
  return `<div class="card"><h2>تقارير الحضور</h2><div class="two"><select data-a="rc"><option value="">كل الفصول</option>${opts(S.classes,cLabel,S.rc)}</select><select data-a="rd">${[[28,'آخر 4 أسابيع'],[56,'آخر 8 أسابيع'],[90,'آخر 90 يوم']].map(([n,l])=>`<option value="${n}"${days===n?' selected':''}>${l}</option>`).join('')}</select></div></div>
  <div class="card"><h2>الفصول</h2><button class="s" data-a="exp" data-id="servees" style="margin-bottom:8px">تصدير Excel (CSV)</button>${crow.map(o=>`<div class="row"><div>${esc(cLabel(o.c))}<small>${o.act.length} مخدوم · ${o.ds.length} اجتماع</small></div><div style="width:40%;text-align:left">${o.avg===null?'—':o.avg+'%'}${bar(o.avg)}</div></div>`).join('')||'<div class="empty">مفيش فصول.</div>'}</div>${det}${sv}`;
}
function dl(name,rows){
  const q=x=>{let t=String(x??'');if(/^[=+\-@]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
const paint=()=>S.p.role==='parent'?(app.innerHTML=head()+vParent()):render();

const VAPID_PUBLIC='BKMZUY2HZeDBRRJwsFdL0E66B0tvFY2p-QQ_X-Uljl44k6q1tXBvxzfhIEI-WRDmPXl6izrEmdVj5d5jzEY5xnM';
const pushOK=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const b64u=s=>{const p='='.repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(r,c=>c.charCodeAt(0))};
async function pushState(){if(!pushOK())return 'unsupported';if(Notification.permission==='denied')return 'denied';try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();return sub?'on':'off'}catch(_){return 'off'}}
async function pushEnable(){
  const perm=await Notification.requestPermission();if(perm!=='granted')return toast('الإشعارات مرفوضة من إعدادات المتصفح');
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(VAPID_PUBLIC)});
  const j=sub.toJSON();
  const r=await sb.from('push_subscriptions').upsert({user_id:S.p.id,endpoint:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth},{onConflict:'endpoint'});
  if(r.error)return toast('تعذّر التفعيل: '+r.error.message);
  toast('تم تفعيل الإشعارات على الجهاز ده');
}
async function pushDisable(){
  const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
  if(sub){await sb.from('push_subscriptions').delete().eq('endpoint',sub.endpoint);await sub.unsubscribe()}
  toast('تم إيقاف الإشعارات على الجهاز ده');
}
function pushCard(){
  const st=S.pushSt;
  if(!st)return '';
  if(st==='unsupported')return '<div class="card"><div class="empty">المتصفح ده مبيدعمش إشعارات الموبايل. على الآيفون: ضيف التطبيق للشاشة الرئيسية الأول.</div></div>';
  if(st==='denied')return '<div class="card"><div class="empty">الإشعارات مقفولة من إعدادات المتصفح للموقع ده. افتحها من إعدادات الموقع.</div></div>';
  return '<div class="card"><h2>إشعارات الموبايل</h2><small>'+(st==='on'?'مفعّلة على الجهاز ده':'مش مفعّلة على الجهاز ده')+'</small><button class="'+(st==='on'?'s':'p')+'" data-a="'+(st==='on'?'pushOff':'pushOn')+'" style="margin-top:8px">'+(st==='on'?'إيقاف':'تفعيل الإشعارات')+'</button></div>';
}

async function askPush(){
  S.pushSt=await pushState();
  let o=document.getElementById('pushAsk');
  if(S.pushSt==='on'){if(o)o.remove();return}
  if(!o){o=document.createElement('div');o.id='pushAsk';o.style.cssText='position:fixed;inset:0;background:rgba(23,48,43,.96);z-index:20;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto';document.body.appendChild(o)}
  const st=S.pushSt,adm=S.p&&S.p.role==='admin';
  const msg=st==='denied'?'الإشعارات مقفولة للموقع ده. افتح إعدادات الموقع (أيقونة القفل 🔒 جنب الرابط) واختار الإشعارات ثم «السماح»، وبعدين اضغط الزرار تحت.':st==='unsupported'?'المتصفح ده مبيدعمش الإشعارات. على الآيفون: اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية» وافتح التطبيق من الأيقونة. أو افتح الموقع من Chrome.':'تفعيل الإشعارات شرط لاستخدام التطبيق، عشان توصلك تنبيهات الخدمة والتذكير الأسبوعي. اضغط الزرار وبعدين «السماح».';
  o.innerHTML='<div class="card" style="max-width:360px;text-align:center;margin:0"><div style="font-size:44px">🔔</div><h2>فعّل الإشعارات</h2><p style="margin:6px 0 14px">'+msg+'</p><button class="p" id="pushGo" style="width:100%">'+(st==='off'?'تفعيل الإشعارات':'فعّلتها، تحقّق تاني')+'</button>'+(adm?'<button class="s" id="pushLater" style="width:100%;margin-top:8px">لاحقاً</button>':'')+'<button class="s" id="pushDiag" style="width:100%;margin-top:8px">🩺 افحص المشكلة</button><button class="s" id="pushOut" style="width:100%;margin-top:8px">تسجيل خروج</button></div>';
  document.getElementById('pushGo').onclick=async()=>{if(S.pushSt==='off')await pushEnable();await askPush();if(S.pushSt==='on'&&S.p)paint()};
  const l=document.getElementById('pushLater');if(l)l.onclick=()=>o.remove();
  document.getElementById('pushDiag').onclick=diagOpen;
  document.getElementById('pushOut').onclick=async()=>{o.remove();await sb.auth.signOut();location.reload()};
}
/* ===== فحص وتتبع الإشعارات: متاح لكل مستخدم من 🩺 في الهيدر ===== */
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isStandalone=()=>(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
const dgT=x=>new Date(x).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'});
const dgHost=u=>{try{const h=new URL(u).host;return /fcm|googleapis/.test(h)?'Chrome / أندرويد (Google)':/apple/.test(h)?'سفاري / آيفون (Apple)':/mozilla/.test(h)?'فايرفوكس':/windows|notify/.test(h)?'Edge / ويندوز':h}catch(_){return '؟'}};
const sameKey=(a,b)=>{if(!a||!b||a.byteLength!==b.byteLength)return false;const x=new Uint8Array(a),y=new Uint8Array(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true};
const dgRpcErr=e=>{const m=e.message||'';return m==='TOO_SOON'?'استنى 15 ثانية بين كل تجربة والتانية':m==='TOO_MANY'?'بعت كتير في آخر دقيقة، استنى شوية':m==='FORBIDDEN'?'مش مسموح لك تبعت للشخص ده':m==='NOT_FOUND'?'الحساب مش موجود أو موقوف':m==='EMPTY'?'اكتب نص الإشعار':(e.code==='PGRST202'||e.code==='42883'||/Could not find the function|does not exist/i.test(m))?'الدالة مش موجودة على السيرفر: الأدمن يشغّل ملف 17_notifications_tracking.sql':m};
S.dg=null;
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{const d=S.dg;if(e.data&&e.data.type==='push'&&d&&d.test){d.test.got=true;diagPaint()}});
async function dgChecks(){
  const out=[],add=(ok,t,d,fix)=>out.push({ok,t,d:d||'',fix:fix||''});
  let sub=null,reg=null;
  add(!!window.isSecureContext,'اتصال آمن (HTTPS)',window.isSecureContext?'':'الصفحة مش على https','افتح التطبيق من الرابط الرسمي (https).');
  if(isIOS())add(isStandalone(),'التطبيق متثبّت على الشاشة الرئيسية (آيفون)',isStandalone()?'':'مفتوح من سفاري مش من الأيقونة','الآيفون مبيدعمش الإشعارات إلا للتطبيق المتثبّت: في سفاري اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية»، افتح التطبيق من الأيقونة وفعّل الإشعارات. محتاج iOS 16.4 أو أحدث.');
  const sup=pushOK();
  add(sup,'المتصفح بيدعم الإشعارات',sup?'':'مفيش دعم للـ Push في المتصفح ده','استخدم Chrome أو Edge أو Firefox حديث. على الآيفون اتبع الخطوة اللي فوق.');
  if(!sup)return{out};
  try{reg=await navigator.serviceWorker.getRegistration()}catch(_){}
  const swOk=!!(reg&&reg.active);
  add(swOk,'خدمة التطبيق (Service Worker) شغالة',swOk?'الحالة: '+reg.active.state:'مش مسجّلة أو مش مفعّلة','اقفل التطبيق وافتحه تاني. لو فضل كده امسح بيانات الموقع من إعدادات المتصفح وادخل من جديد.');
  const perm=Notification.permission;
  add(perm==='granted'?true:perm==='default'?null:false,'إذن الإشعارات',perm==='granted'?'مسموح':perm==='default'?'لسه ما اتحددش':'مرفوض من المتصفح',perm==='default'?'اضغط «تفعيل / إصلاح الاشتراك» تحت وبعدين «السماح».':'اضغط القفل 🔒 جنب الرابط ← إعدادات الموقع ← الإشعارات ← «سماح». على الموبايل: إعدادات الجهاز ← الإشعارات ← المتصفح أو التطبيق ← تفعيل. وبعدها اضغط «إعادة الفحص».');
  if(swOk){try{sub=await reg.pushManager.getSubscription()}catch(_){}}
  add(!!sub,'الجهاز مشترك في الإشعارات',sub?dgHost(sub.endpoint):'مفيش اشتراك على الجهاز ده','اضغط «تفعيل / إصلاح الاشتراك» تحت.');
  if(sub){
    let km=null;try{const k=sub.options&&sub.options.applicationServerKey;km=k?sameKey(k,b64u(VAPID_PUBLIC)):null}catch(_){}
    add(km,'مفتاح الاشتراك مطابق لمفتاح التطبيق',km===null?'المتصفح مش بيكشف المفتاح (مش مشكلة)':km?'':'الاشتراك اتعمل بمفتاح قديم',km===false?'اضغط «تفعيل / إصلاح الاشتراك» عشان يتعمل اشتراك جديد.':'');
    const q=await sb.from('push_subscriptions').select('id').eq('endpoint',sub.endpoint).limit(1),has=!q.error&&!!(q.data&&q.data.length);
    add(has,'الاشتراك متسجّل على السيرفر',q.error?q.error.message:(has?'':'الجهاز مشترك بس مش متسجّل في قاعدة البيانات'),q.error?'الأدمن يشغّل ملف 15_push_subscriptions_fix.sql.':'اضغط «تفعيل / إصلاح الاشتراك».');
  }
  const n=await sb.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',S.p.id);
  add(!n.error,'قراءة الإشعارات من التطبيق',n.error?n.error.message:'','الأدمن يراجع صلاحيات جدول notifications (ملف 12).');
  return{out};
}
async function pushRepair(){
  if(!pushOK())return toast('المتصفح ده مبيدعمش الإشعارات');
  try{const reg=await navigator.serviceWorker.ready,old=await reg.pushManager.getSubscription();
    if(old){await sb.from('push_subscriptions').delete().eq('endpoint',old.endpoint);await old.unsubscribe()}}catch(_){}
  await pushEnable();S.pushSt=await pushState();
  if(S.pushSt==='on'){const po=document.getElementById('pushAsk');if(po)po.remove()}
}
function diagOpen(){
  let o=document.getElementById('diag');
  if(!o){o=document.createElement('div');o.id='diag';o.style.cssText='position:fixed;inset:0;background:rgba(23,48,43,.96);z-index:30;overflow:auto;padding:14px';document.body.appendChild(o);o.addEventListener('click',diagClick)}
  S.dg={checks:null,log:null,nlog:null,test:null};diagPaint();diagRun();
}
async function diagRun(){
  const d=S.dg;if(!d)return;
  const adm=isAdmin();
  const [c,lg,nl]=await Promise.all([dgChecks(),sb.from('push_log').select('*').order('id',{ascending:false}).limit(10),adm?sb.from('notify_log').select('*').order('id',{ascending:false}).limit(10):null]);
  if(S.dg!==d)return;
  d.checks=c.out;d.log=lg.error?{err:lg.error.message}:{rows:lg.data||[]};d.nlog=nl?(nl.error?{err:nl.error.message}:{rows:nl.data||[]}):null;
  S.pushSt=await pushState();const dot=document.getElementById('pdot');if(dot)dot.style.background=S.pushSt==='on'?'#3ecf8e':'#ff6b5e';
  diagPaint();
}
function dgSteps(t){
  const L=[];
  L.push(t.saved===null?'⏳ بنحفظ الإشعار...':t.saved?'✅ اتحفظ في قاعدة البيانات':'❌ '+t.err);
  if(t.saved){
    if(t.log){L.push(t.log.sent>0?`✅ السيرفر بعت لـ ${t.log.sent} من ${t.log.subs} جهاز`:'❌ السيرفر استلم بس مبعتش: '+(t.log.error||'سبب غير معروف'))}
    else L.push(t.done?'❌ السيرفر ما سجّلش أي محاولة خلال 15 ثانية: الـ Database Webhook مش متوصّل بالدالة send-push، أو الدالة مش منشورة. الأدمن يراجع خطوات التشغيل تحت.':'⏳ مستنيين السيرفر...');
    if(t.log&&t.log.sent>0)L.push(t.got?'✅ وصل للجهاز ده':t.done?'❌ السيرفر بعت بس الجهاز ماعرضش الإشعار: راجع إعدادات الإشعارات للمتصفح/التطبيق، وضع عدم الإزعاج، وتوفير الطاقة.':'⏳ مستنيين الجهاز...');
  }
  const ok=t.done&&t.saved&&t.log&&t.log.sent>0&&t.got;
  return L.map(x=>`<p style="margin:6px 0">${esc(x)}</p>`).join('')+(t.done?`<p style="margin:8px 0 0;font-weight:700;color:${ok?'#1b7a43':'var(--red)'}">${ok?'الإشعارات شغالة من أول لآخر ✓':'فيه حاجة مش شغالة، شوف الخطوة اللي فيها ❌.'}</p>`:'');
}
function diagPaint(){
  const o=document.getElementById('diag'),d=S.dg;if(!o||!d)return;
  const ic=ok=>ok===true?'✅':ok===false?'❌':'⚠️',adm=isAdmin(),pn=id=>{const p=(S.profiles||[]).find(q=>q.id===id);return p?p.full_name:String(id||'').slice(0,6)};
  const bad=d.checks?d.checks.filter(c=>c.ok===false).length:0,W='max-width:560px;margin:0 auto 12px';
  let h=`<div class="card" style="${W}"><h2>🩺 فحص الإشعارات</h2>`;
  h+=d.checks?`<p style="margin:0 0 8px;font-weight:700;color:${bad?'var(--red)':'#1b7a43'}">${bad?bad+(bad===1?' مشكلة':' مشاكل')+' على الجهاز ده':'الجهاز ده سليم ✓'}</p>`:'<p class="empty">جاري الفحص...</p>';
  h+=(d.checks||[]).map(c=>`<div class="row" style="align-items:flex-start"><div style="flex:1"><b>${ic(c.ok)} ${esc(c.t)}</b>${c.d?`<small>${esc(c.d)}</small>`:''}${c.ok!==true&&c.fix?`<small style="color:var(--red);white-space:pre-wrap">الحل: ${esc(c.fix)}</small>`:''}</div></div>`).join('');
  h+='<div class="acts" style="justify-content:flex-start;margin-top:10px"><button class="p" data-dg="fix">تفعيل / إصلاح الاشتراك على الجهاز ده</button><button class="s" data-dg="run">إعادة الفحص</button></div></div>';
  const t=d.test;
  h+=`<div class="card" style="${W}"><h2>اختبار كامل (من السيرفر للجهاز)</h2><p class="empty" style="margin:0 0 8px;padding:0">بيبعتلك إشعار حقيقي عن طريق السيرفر ويتتبّعه خطوة خطوة.</p><button class="p" data-dg="test"${t&&!t.done?' disabled':''}>إرسال إشعار تجريبي</button>${t?dgSteps(t):''}</div>`;
  const rowsOf=L=>!L?'<div class="empty">جاري التحميل...</div>':L.err?`<div class="empty">تعذّر القراءة: ${esc(L.err)} (الأدمن يشغّل 17_notifications_tracking.sql)</div>`:'';
  const lg=d.log;
  h+=`<div class="card" style="${W}"><h2>آخر محاولات الإرسال${adm?' (كل الحسابات)':' ليك'}</h2>${rowsOf(lg)||(lg.rows.map(r=>`<div class="row" style="align-items:flex-start"><div>${r.error?'❌':r.sent>0?'✅':'⚠️'} ${dgT(r.created_at)}${adm?' · '+esc(pn(r.user_id)):''}<small>اتبعت لـ ${r.sent} من ${r.subs} جهاز${r.failed?' · فشل '+r.failed:''}</small>${r.error?`<small style="color:var(--red)">${esc(r.error)}</small>`:''}</div></div>`).join('')||'<div class="empty">لسه مفيش محاولات إرسال متسجّلة.</div>')}</div>`;
  if(adm){
    const nl=d.nlog;
    h+=`<div class="card" style="${W}"><h2>الإشعارات اليدوية (🔔 جنب الواتساب)</h2>${rowsOf(nl)||(nl.rows.map(r=>`<div class="row"><div>${dgT(r.created_at)} · ${esc(pn(r.sender_id))} ← ${esc(pn(r.target_id))}<small>${esc(r.title||'')} · أجهزة المستلم: ${r.subs}</small></div></div>`).join('')||'<div class="empty">لسه ما اتبعتش إشعار يدوي.</div>')}</div>`;
    h+=`<div class="card" style="${W}"><details><summary><b>خطوات تشغيل نظام الإشعارات (للأدمن)</b></summary><ol style="line-height:1.9;margin:8px 0 0;padding-right:20px"><li>شغّل ملفات SQL: 12 و15 و17 في SQL Editor.</li><li>Edge Functions ← Secrets: ضيف <span dir="ltr">VAPID_PUBLIC_KEY</span> و<span dir="ltr">VAPID_PRIVATE_KEY</span> و<span dir="ltr">VAPID_SUBJECT</span> و<span dir="ltr">PUSH_SECRET</span>. المفتاح العام لازم يطابق <span dir="ltr">VAPID_PUBLIC</span> في app.js.</li><li>انشر الدالة <span dir="ltr">send-push</span> (Verify JWT = OFF).</li><li>Database ← Webhooks ← جديد: جدول <span dir="ltr">notifications</span>، حدث Insert، نوع Supabase Edge Function، الدالة <span dir="ltr">send-push</span>، وهيدر <span dir="ltr">x-push-secret</span> بنفس قيمة PUSH_SECRET.</li><li>كل مستخدم يفتح 🩺 ويضغط «تفعيل» ثم «إرسال إشعار تجريبي».</li></ol><p class="empty" style="margin:8px 0 0;padding:0">التفاصيل والحلول في ملف NOTIFICATIONS.md.</p></details></div>`;
  }
  h+=`<div style="${W}"><button class="p" data-dg="close" style="width:100%">إغلاق</button></div>`;
  o.innerHTML=h;
}
async function dgTest(){
  const d=S.dg;if(!d)return;
  const t=d.test={saved:null,log:null,got:false,done:false,err:'',id:''};diagPaint();
  const r=await sb.rpc('kh_notify_test');
  if(r.error){t.saved=false;t.err=dgRpcErr(r.error);t.done=true;return diagPaint()}
  t.saved=true;t.id=String(r.data);diagPaint();
  for(let i=0;i<15&&S.dg===d;i++){
    await new Promise(z=>setTimeout(z,1000));
    const q=await sb.from('push_log').select('*').eq('notification_id',t.id).order('id',{ascending:false}).limit(1);
    if(q.data&&q.data[0])t.log=q.data[0];
    if(t.log&&(t.log.sent===0||t.got))break;
    diagPaint();
  }
  t.done=true;if(S.dg===d){diagPaint();diagRun()}
}
async function diagClick(e){
  const b=e.target.closest('[data-dg]');if(!b)return;const a=b.dataset.dg;
  if(a==='close'){const o=document.getElementById('diag');if(o)o.remove();S.dg=null;return}
  if(a==='run')return diagRun();
  if(a==='fix'){b.disabled=true;await pushRepair();return diagRun()}
  if(a==='test')return dgTest();
}
/* ===== زرار «🔔 إشعار» جنب الواتساب: بيبعت إشعار في التطبيق + على الموبايل ===== */
function nb(who,name,msg,label){
  if(!who)return'';
  const m=who.m!==undefined?who.m:(msg||'');
  return `<button class="s" data-a="nt" ${who.u?'data-u="'+esc(who.u)+'"':'data-s="'+esc(who.s)+'"'} data-n="${esc(name||'')}" data-m="${esc(m)}">${label||'🔔 إشعار'}</button>`;
}
function ntOpen(b){
  const old=document.getElementById('ntm');if(old)old.remove();
  const u=b.dataset.u,s=b.dataset.s,o=document.createElement('div');o.id='ntm';
  o.style.cssText='position:fixed;inset:0;background:rgba(23,48,43,.85);z-index:25;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto';
  o.innerHTML=`<div class="card" style="max-width:400px;width:100%;margin:0"><h2>🔔 إشعار: ${esc(b.dataset.n||'')}</h2><p class="empty" style="margin:0 0 8px;padding:0">${s?'هيوصل لأولياء أمور المخدوم المربوطين بحساب (المخدوم نفسه ملوش حساب).':'هيوصل جوه التطبيق وعلى الموبايل لو مفعّل الإشعارات.'}</p><textarea id="ntb" rows="5" placeholder="اكتب الرسالة">${esc(b.dataset.m||'')}</textarea><button class="p" id="nts" style="width:100%">إرسال الإشعار</button><button class="s" id="ntx" style="width:100%;margin-top:8px">إلغاء</button><p class="err" id="nte"></p></div>`;
  document.body.appendChild(o);
  document.getElementById('ntx').onclick=()=>o.remove();
  document.getElementById('nts').onclick=async()=>{
    const body=document.getElementById('ntb').value.trim(),er=document.getElementById('nte'),btn=document.getElementById('nts');
    if(!body)return er.textContent='اكتب نص الإشعار.';
    btn.disabled=true;er.textContent='';
    const title='رسالة من '+(S.p.full_name||'الخدمة');
    const r=u?await sb.rpc('kh_notify',{p_user:u,p_title:title,p_body:body}):await sb.rpc('kh_notify_parents',{p_servee:s,p_title:title,p_body:body});
    btn.disabled=false;
    if(r.error)return er.textContent=dgRpcErr(r.error);
    const x=r.data||{};o.remove();
    toast(x.users===0?'مفيش ولي أمر مربوط بحساب للمخدوم ده. ابعت له واتساب.':x.subs===0?'اتبعت جوه التطبيق، بس مفيش جهاز مفعّل إشعارات عنده.':'اتبعت لـ '+x.subs+' جهاز ✓');
  };
}
async function loadNotifs(){const r=await sb.from('notifications').select('*').eq('user_id',S.p.id).order('created_at',{ascending:false}).limit(50);S.nt=r.error?[]:(r.data||[])}
function vNotif(){
  const L=S.nt||[],n=unread(),dt=x=>new Date(x).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'});
  return pushCard()+`<div class="card"><button class="s" data-a="diag">🩺 فحص الإشعارات واختبارها</button> <button class="s" data-a="outAll">تسجيل الخروج من كل الأجهزة</button></div><div class="card"><h2>الإشعارات${n?' ('+n+' جديد)':''}</h2>${n?'<button class="s" data-a="readAll" style="margin-bottom:8px">تحديد الكل كمقروء</button>':''}${L.map(x=>`<div class="row" style="${x.is_read?'':'background:#fff8e6;border-radius:8px;padding:10px'}"><div><b>${esc(x.title)}</b>${x.body?`<small style="white-space:pre-wrap">${esc(x.body)}</small>`:''}<small>${dt(x.created_at)}</small></div>${x.is_read?'':`<button class="s" data-a="readN" data-id="${x.id}">تم</button>`}</div>`).join('')||'<div class="empty">مفيش إشعارات.</div>'}</div>`;
}
async function loadAnn(){const r=await sb.from('announcements').select('*').order('created_at',{ascending:false}).limit(30);S.an=r.error?[]:(r.data||[]).filter(a=>!secOn()||a.scope==='all'||a.section===S.sec||(a.class_id&&S.classes.some(c=>c.id===a.class_id)));if(r.error)toast('تعذّر تحميل الإعلانات: '+r.error.message)}
function vAnn(){
  if(S.an===null)return '<div class="card"><div class="empty">جاري التحميل...</div></div>';
  const adm=isAdmin();
  return `<div class="card"><h2>إعلان جديد</h2><select id="asc" data-a="annscope">${adm&&!S.sec?'<option value="all">كل الخدمة</option>':''}<option value="section">${adm?(S.sec?'كل '+SEC[S.sec]:'قسم كامل'):'قسمي كله'}</option><option value="class">فصل معين</option></select>
  <div id="ascw" style="display:none">${adm?(S.sec?`<select id="asec"><option value="${S.sec}" selected>${SEC[S.sec]}</option></select>`:`<select id="asec"><option value="">اختار القسم</option><option value="boys">بنين</option><option value="girls">بنات</option></select>`):''}</div>
  <div id="aclw" style="display:none"><select id="acl"><option value="">اختار الفصل</option>${opts(S.classes,cLabel)}</select></div>
  <input id="at" maxlength="100" placeholder="عنوان الإعلان"><textarea id="ab" rows="4" maxlength="1000" placeholder="نص الإعلان (اختياري)"></textarea>
  <button class="p" data-a="annSend">إرسال</button><p class="empty">بيوصل للخدام وأولياء الأمور المعنيين كإشعار جوه التطبيق (🔔).</p></div>
  <div class="card"><h2>آخر الإعلانات (${S.an.length})</h2>${S.an.map(a=>`<div class="row"><div>${esc(a.title)}<small>${a.scope==='all'?'كل الخدمة':a.scope==='section'?'قسم '+(SEC[a.section]||''):'فصل '+esc(cname(a.class_id))} · وصل ${a.sent_count} · ${new Date(a.created_at).toLocaleDateString('ar-EG')}</small>${a.body?`<small style="white-space:pre-wrap">${esc(a.body)}</small>`:''}</div></div>`).join('')||'<div class="empty">لسه ما بعتش إعلانات.</div>'}</div>`;
}
const MSGERR={FORBIDDEN:'مش مسموح لك بالإرسال ده',BAD_BODY:'اكتب نص الرسالة',BAD_TARGET:'اختار مين هيوصله',NO_RECIPIENTS:'مفيش حد مطابق (ولي الأمر لازم يكون مربوط بحساب)',TOO_MANY:'بعت كتير، استنى دقيقة وجرّب تاني'};
const tplOf=k=>(S.tpl||[]).find(t=>t.key===k);
const tplRender=(x,vars)=>String(x||'').replace(/\{(\w+)\}/g,(m,k)=>k in vars?vars[k]:m);
async function loadTpl(){const r=await sb.from('message_templates').select('*').order('key');S.tpl=r.error?[]:(r.data||[]);if(r.error)toast('تعذّر تحميل الرسايل الجاهزة: '+r.error.message)}
async function loadMsg(){await loadTpl();const r=await sb.from('staff_messages').select('*').order('created_at',{ascending:false}).limit(30);S.msgs=r.error?[]:(r.data||[]);if(r.error)toast('تعذّر تحميل الرسائل: '+r.error.message)}
function vMsg(){
  if(S.msgs==null)return '<div class="card"><div class="empty">جاري التحميل...</div></div>';
  const sv=servList(),pr=S.profiles.filter(p=>p.role==='parent'&&p.active),dt=x=>new Date(x).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'});
  const tl=m=>(m.audience==='parents'?'أولياء أمور · ':'خدام · ')+(m.target==='all'?'الكل':m.target==='class'?'فصل '+esc(cname(m.class_id)):m.target==='servee'?'أهل '+esc(sname(m.servee_id)):m.target==='one'?'ولي أمر معيّن':'مختارين');
  const st=tplOf('servant_msg')||{title:'',body:''};
  return `<div class="card"><h2>رسالة جديدة</h2>
  <select id="sm_au" data-a="msgau"><option value="servants">لخدام</option><option value="parents">لأولياء أمور</option>${isAdmin()?'<option value="secs">لأمناء الخدمة</option>':''}</select>
  <div id="sm_sv"><select id="sm_tg" data-a="msgtgt"><option value="all">${isAdmin()?(S.sec?'كل خدام '+SEC[S.sec]:'كل الخدام'):'كل خدامي'}</option><option value="class">خدام فصل / مرحلة معينة</option><option value="selected">خادم بعينه (أو أكتر)</option></select>
  <div id="sm_cw" style="display:none"><select id="sm_cl"><option value="">اختار الفصل</option>${opts(S.classes,cLabel)}</select></div>
  <div id="sm_sw" style="display:none"><input type="search" data-a="msgfind" data-t="smchk" placeholder="ابحث باسم الخادم"><div style="max-height:220px;overflow:auto;border:1px solid #ddd;border-radius:8px;padding:6px;margin:6px 0">${sv.map(p=>`<label class="smlbl" data-n="${esc(nz(p.full_name))}" style="display:flex;gap:8px;align-items:center;padding:4px 0"><input type="checkbox" class="smchk" value="${p.id}"> ${esc(p.full_name)}<small style="margin-inline-start:auto">${esc(srvClasses(p.id).map(c=>c.name).join(' · '))}</small></label>`).join('')||'<div class="empty">مفيش خدام.</div>'}</div></div></div>
  <div id="sm_se" style="display:none"><select id="sm_st" data-a="msgst"><option value="all">${S.sec?'كل أمناء خدمة '+SEC[S.sec]:'كل أمناء الخدمة'}</option><option value="selected">أمين بعينه</option></select><div id="sm_sew" style="display:none;border:1px solid #ddd;border-radius:8px;padding:6px;margin:6px 0">${S.profiles.filter(p=>p.role==='secretary'&&p.active).map(p=>`<label style="display:flex;gap:8px;align-items:center;padding:4px 0"><input type="checkbox" class="smsec" value="${p.id}"> ${esc(p.full_name)} ${badge(p.section)}</label>`).join('')||'<div class="empty">مفيش أمناء خدمة.</div>'}</div></div>
  <div id="sm_pa" style="display:none"><select id="sm_pt" data-a="msgpt"><option value="all">${isAdmin()?(S.sec?'كل أولياء أمور '+SEC[S.sec]:'كل أولياء الأمور'):'كل أولياء أمور قسمي'}</option><option value="class">أولياء أمور فصل</option><option value="servee">أولياء أمور مخدوم معيّن</option><option value="one">ولي أمر معيّن</option></select>
  <div id="sm_pcw" style="display:none"><select id="sm_pcl"><option value="">اختار الفصل</option>${opts(S.classes,cLabel)}</select></div>
  <div id="sm_psw" style="display:none"><select id="sm_ps"><option value="">اختار المخدوم</option>${S.servees.filter(x=>x.active).map(x=>`<option value="${x.id}">${esc(x.full_name)} — ${esc(cname(x.class_id))}</option>`).join('')}</select></div>
  <div id="sm_puw" style="display:none"><select id="sm_pu"><option value="">اختار ولي الأمر</option>${pr.map(p=>`<option value="${p.id}">${esc(p.full_name)}</option>`).join('')}</select></div></div>
  <input id="sm_t" maxlength="80" placeholder="العنوان (اختياري)" value="${esc(st.title)}"><textarea id="sm_b" rows="5" maxlength="1000" placeholder="نص الرسالة">${esc(st.body)}</textarea>
  <p class="empty">اكتب <b>{name}</b> وهتتبدّل بأول اسمين من اسم كل مستلم، و<b>{servee}</b> باسم ابنه (لأولياء الأمور). بتوصل كإشعار على الموبايل وجوه التطبيق (🔔)، وتقدر تشوف مين قراها.</p>
  <button class="p" data-a="msgSend">إرسال</button></div>
  <div class="card"><h2>آخر الرسائل (${S.msgs.length})</h2>${S.msgs.map(m=>`<div class="row" style="flex-wrap:wrap"><div style="flex:1;min-width:0">${esc(m.title)}<small>${tl(m)} · وصل ${m.sent_count} · ${dt(m.created_at)}</small><small style="white-space:pre-wrap">${esc(m.body)}</small></div><button class="s" data-a="msgOpen" data-id="${m.id}">${S.msgOpen===m.id?'إخفاء':'مين قرا؟'}</button>${S.msgOpen===m.id?`<div style="flex-basis:100%;padding-top:8px">${(S.msgSt||[]).map(r=>`<small>${r.is_read?'✅':'⏳'} ${esc(r.full_name||'؟')}</small>`).join('')||'<small>مفيش بيانات.</small>'}</div>`:''}</div>`).join('')||'<div class="empty">لسه ما بعتش رسائل.</div>'}</div>`;
}
function vSet(){
  if(S.tpl==null)return '<div class="card"><div class="empty">جاري التحميل...</div></div>';
  const cards=S.tpl.map(t=>`<div class="card"><h2>${esc(t.label)}</h2><small>${esc(t.hint||'')}</small>
  ${t.key.startsWith('bday')?`<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="tp_en_${t.key}"${t.enabled?' checked':''}> مفعّلة (بتتبعت تلقائي)</label>`:''}
  <input id="tp_t_${t.key}" maxlength="80" value="${esc(t.title)}"><textarea id="tp_b_${t.key}" rows="5" maxlength="1000">${esc(t.body)}</textarea>
  <div class="empty" id="tp_pv_${t.key}" style="white-space:pre-wrap;text-align:right"></div>
  <button class="p" data-a="tplSave" data-id="${t.key}">حفظ</button> <button class="s" data-a="tplPrev" data-id="${t.key}">معاينة</button> <button class="s" data-a="tplReset" data-id="${t.key}">رجّع الافتراضي</button></div>`).join('');
  return pushCard()+`<div class="card"><h2>الإشعارات</h2><button class="s" data-a="diag">🩺 فحص الإشعارات واختبارها</button><p class="empty">فعّل الإشعارات على جهازك من الكارت اللي فوق. الرسايل التلقائية تحت جاهزة، وبتتبدّل فيها {name} بأول اسمين من اسم المستلم، وتقدر تعدّل نصها.</p></div>`+cards;
}
const PST_ROLE={servant:'خادم',parent:'ولي أمر',secretary:'أمين خدمة'};
const pstState=x=>x.subs===0?'off':((x.sent_30===0&&x.failed_30>0)?'warn':'on');
async function loadPst(){const r=await sb.rpc('kh_push_status');S.pst=r.error?[]:(r.data||[]);if(r.error)toast('تعذّر تحميل حالة الإشعارات: '+r.error.message)}
function vPst(){
  if(S.pst==null)return '<div class="card"><div class="empty">جاري التحميل...</div></div>';
  const f=S.pstR||'',q=S.pstS||'',dt=x=>x?new Date(x).toLocaleDateString('ar-EG',{day:'numeric',month:'short'}):'—';
  const vis=new Set(S.profiles.map(p=>p.id)),base=S.pst.filter(x=>vis.has(x.user_id)&&(!f||x.role===f)),cnt={on:0,warn:0,off:0};base.forEach(x=>cnt[pstState(x)]++);
  const ord={off:0,warn:1,on:2};
  const L=base.filter(x=>!q||pstState(x)===q).sort((a,b)=>ord[pstState(a)]-ord[pstState(b)]||String(a.full_name||'').localeCompare(String(b.full_name||''),'ar'));
  const msg=n=>encodeURIComponent('أهلاً '+n+'، عشان توصلك رسايل وتنبيهات خدمة إعدادي، افتح الرابط ده واضغط 🔔 ثم «تفعيل / إصلاح الاشتراك على الجهاز ده»: '+location.origin);
  const stTxt={on:'✅ مفعّل',warn:'⚠️ مفعّل لكن آخر إرسال فشل',off:'❌ مش مفعّل'};
  return `<div class="card"><h2>مين بيستقبل الإشعارات</h2>
  <div class="cnt"><span>✅ مفعّل ${cnt.on}</span><span>⚠️ مشكلة ${cnt.warn}</span><span>❌ مش مفعّل ${cnt.off}</span></div>
  <select data-a="pstf"><option value="">الكل</option><option value="servant"${f==='servant'?' selected':''}>الخدام</option><option value="parent"${f==='parent'?' selected':''}>أولياء الأمور</option>${isAdmin()?`<option value="secretary"${f==='secretary'?' selected':''}>أمناء الخدمة</option>`:''}</select>
  <select data-a="psts"><option value="">كل الحالات</option><option value="off"${q==='off'?' selected':''}>مش مفعّل</option><option value="warn"${q==='warn'?' selected':''}>فيه مشكلة</option><option value="on"${q==='on'?' selected':''}>مفعّل</option></select>
  <p class="empty">«مفعّل» معناه إن الشخص ده ضغط تفعيل الإشعارات على جهاز واحد على الأقل. ومحدش بيتحسب مفعّل لو فتح التطبيق بس.</p></div>
  <div class="card"><h2>القايمة (${L.length})</h2>${L.map(x=>{const s=pstState(x),ph=normPhone(x.contact_phone||''),n=esc(String(x.full_name||'').split(/\s+/).slice(0,2).join(' '));
  return `<div class="row"><div>${esc(x.full_name||'بدون اسم')} <span class="bd">${PST_ROLE[x.role]||''}</span>${isAdmin()&&x.section?badge(x.section):''}<small>${stTxt[s]}${x.subs?' · '+x.subs+' جهاز':''}</small><small>اشتراك: ${dt(x.last_sub)} · آخر محاولة إرسال: ${dt(x.last_attempt)} · وصل ${x.sent_30} / فشل ${x.failed_30} (آخر 30 يوم)</small></div><div class="acts">${s!=='on'&&ph?`<a class="s" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block" href="https://wa.me/20${ph.slice(1)}?text=${msg(n)}">ذكّره واتساب</a>`:''}</div></div>`}).join('')||'<div class="empty">مفيش حد.</div>'}</div>`;
}
async function loadComp(){
  const [c,p]=await Promise.all([sb.from('competitions').select('*').order('starts_on',{ascending:false}),fetchAll(()=>sb.from('points').select('*').order('created_at',{ascending:false}).order('id'))]);
  if(c.error)toast('تعذّر تحميل المسابقات: '+c.error.message);
  S.cmp=c.error?[]:(c.data||[]);S.pr=fSv(p.error?[]:(p.data||[]));
}
const PV=[1,2,3,5,10,-1,-2,-5];
function vComp(){
  if(S.cmp===null)return '<div class="card"><div class="empty">جاري التحميل...</div></div>';
  const td=today(),cs=S.cmp.filter(c=>!c.class_id||S.classes.some(x=>x.id===c.class_id)),act=cs.filter(c=>!c.ends_on||c.ends_on>=td);
  const cur=cs.find(c=>c.id===S.pc)||act[0]||cs[0]||null,mg=canManage();
  const cand=cur?S.servees.filter(x=>x.active&&(!cur.class_id||x.class_id===cur.class_id)):[];
  const rows=cur?(S.pr||[]).filter(x=>x.competition_id===cur.id):[];
  const sum={};rows.forEach(x=>sum[x.servee_id]=(sum[x.servee_id]||0)+x.points);
  const top=Object.entries(sum).map(([id,n])=>({id,n})).filter(o=>S.servees.some(x=>x.id===o.id)).sort((a,b)=>b.n-a.n).slice(0,10);
  const medal=['🥇','🥈','🥉'];
  const create=mg?`<div class="card"><h2>مسابقة جديدة</h2><input id="mt" placeholder="اسم المسابقة (مثال: مسابقة الحفظ)"><select id="mc"><option value="">اختار الفصل</option>${opts(S.classes,cLabel)}</select><div class="two"><input id="ms" type="date" value="${td}" aria-label="تبدأ"><input id="me" type="date" aria-label="تنتهي"></div><button class="p" data-a="compAdd">إضافة المسابقة</button></div>`:'';
  const sel=`<select data-a="pc">${cs.map(c=>`<option value="${c.id}"${cur&&c.id===cur.id?' selected':''}>${esc(c.title)}${c.class_id?' · '+esc(cname(c.class_id)):''}${c.ends_on&&c.ends_on<td?' (انتهت)':''}</option>`).join('')}</select>`;
  if(!cs.length)return create+'<div class="card"><h2>المسابقات</h2><div class="empty">لسه مفيش مسابقات.'+(mg?'':' كلّم الأمين يضيف مسابقة.')+'</div></div>';
  return create+`<div class="card"><h2>إعطاء نقاط</h2>${sel}<select id="pcs"><option value="">اختار المخدوم</option>${opts(cand,x=>x.full_name)}</select><div class="two"><select id="pv">${PV.map(n=>`<option value="${n}">${n>0?'+':''}${n}</option>`).join('')}</select><input id="pr" placeholder="السبب (اختياري)"></div><button class="p" data-a="givePts">تسجيل النقاط</button></div>
  <div class="card"><h2>لوحة الشرف${cur?' · '+esc(cur.title):''}</h2>${top.map((o,i)=>`<div class="row"><div>${medal[i]||(i+1)+'.'} ${esc(sname(o.id))}</div><b>${o.n}</b></div>`).join('')||'<div class="empty">لسه مفيش نقاط في المسابقة دي.</div>'}</div>
  <div class="card"><h2>آخر النقاط</h2>${rows.slice(0,20).map(x=>`<div class="row"><div>${esc(sname(x.servee_id))}<small>${x.reason?esc(x.reason)+' · ':''}${new Date(x.created_at).toLocaleDateString('ar-EG')}${mg&&pname(x.given_by)!=='؟'?' · '+esc(pname(x.given_by)):''}</small></div><div class="acts"><b style="color:${x.points>0?'#1b7a43':'var(--red)'}">${x.points>0?'+':''}${x.points}</b>${canManage()?`<button class="s d" data-a="ptDel" data-id="${x.id}">حذف</button>`:''}</div></div>`).join('')||'<div class="empty">مفيش نقاط لسه.</div>'}</div>
  ${cur&&(isAdmin()||(isSec()&&cur.class_id))?`<div class="card"><button class="s d" data-a="compDel" data-id="${cur.id}">حذف مسابقة «${esc(cur.title)}»</button></div>`:''}`;
}
function vCards(){
  const L=S.cards.map(id=>S.servees.find(x=>x.id===id)).filter(Boolean);
  return `<main><div class="np" style="display:flex;gap:8px;margin-bottom:12px"><button class="p" data-a="print">طباعة</button><button class="p" style="background:#fff;color:var(--ink);border:1px solid var(--line)" data-a="back">رجوع</button></div>
  <div class="cards">${L.map(x=>`<div class="idc"><div class="idh">خدمة إعدادي · مار مينا</div><div class="idb">${av(x,72)}<div><b>${esc(x.full_name)}</b><small>${esc(cname(x.class_id))}</small><span class="code">${esc(x.code||'')}</span></div></div><div class="idq">${qrImg(x.code)}</div></div>`).join('')||'<div class="empty">مفيش كروت.</div>'}</div></main>`;
}
let scanStream=null,scanOn=false,busy=false,lastCode='',lastAt=0;
async function openScan(){
  const o=document.createElement('div');o.id='scan';
  o.innerHTML='<video id="sv" playsinline muted></video><canvas id="sc" hidden></canvas><div id="sres"><p class="empty">وجّه الكاميرا على كارت المخدوم.</p><button class="p" id="sx">إغلاق</button></div>';
  document.body.appendChild(o);document.getElementById('sx').onclick=closeScan;
  try{scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}
  catch(_){closeScan();return toast('مقدرتش أفتح الكاميرا. اسمح بالكاميرا من إعدادات المتصفح.')}
  const vd=document.getElementById('sv');vd.srcObject=scanStream;await vd.play();scanOn=true;tick();
}
async function closeScan(){
  scanOn=false;if(scanStream)scanStream.getTracks().forEach(t=>t.stop());scanStream=null;
  const o=document.getElementById('scan');if(o)o.remove();
  await loadAtt();render();
}
function tick(){
  if(!scanOn)return;
  const vd=document.getElementById('sv'),cv=document.getElementById('sc');
  if(vd&&vd.readyState===4&&!busy){
    const w=480,h=Math.round(w*vd.videoHeight/vd.videoWidth);cv.width=w;cv.height=h;
    const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(vd,0,0,w,h);
    const q=jsQR(cx.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'dontInvert'});
    if(q&&q.data&&(q.data!==lastCode||Date.now()-lastAt>4000)){lastCode=q.data;lastAt=Date.now();onScan(q.data)}
  }
  requestAnimationFrame(tick);
}
async function onScan(code){
  busy=true;const res=document.getElementById('sres');
  const btn='<button class="p" id="sx">إغلاق</button>';
  const {data,error}=await sb.rpc('kh_checkin',{p_code:code,p_date:S.date});
  if(error){res.innerHTML=`<p class="err" style="font-weight:700">${esc(rpcErr(error))}</p>${btn}`;navigator.vibrate&&navigator.vibrate([80,60,80])}
  else{
    let u='';if(data.photo_path){const g=await sb.storage.from('servee-photos').createSignedUrl(data.photo_path,300);u=g.data?g.data.signedUrl:''}
    const img=u?`<img class="av" src="${u}" style="width:72px;height:72px">`:`<span class="av" style="width:72px;height:72px;font-size:30px">${esc(data.name.charAt(0))}</span>`;
    res.innerHTML=`<div class="who">${img}<div><b style="font-size:18px">${esc(data.name)}</b><small>${esc(data.class_name||'')}</small><span style="color:#1b7a43;font-weight:700">${data.already?'متسجّل حاضر قبل كده':'✓ تم تسجيل الحضور'}</span></div></div>${btn}`;
    navigator.vibrate&&navigator.vibrate(60);
  }
  document.getElementById('sx').onclick=closeScan;busy=false;
}
function credCard(){
  const c=S.created;if(!c)return'';
  const url=location.origin+location.pathname;
  const msg=`أهلاً ${c.name} 👋\nحسابك في تطبيق خدمة إعدادي جاهز.\nرقم الدخول: ${c.login}\nالباسورد المؤقت: ${c.password}\nالرابط: ${url}\nهتغيّر الباسورد أول مرة تدخل.`;
  const wa=c.phone?`<a target="_blank" rel="noopener" href="https://wa.me/20${c.phone.slice(1)}?text=${encodeURIComponent(msg)}" style="display:block;text-align:center;padding:11px;border-radius:8px;background:#25d366;color:#fff;font-weight:600;text-decoration:none;margin-bottom:8px">إرسال على واتساب</a>`:'';
  return `<div class="card" style="border-color:var(--gold)"><h2>${esc(c.name)}</h2>
  <p style="margin:0 0 8px">رقم الدخول: <b dir="ltr">${esc(c.login)}</b><br>الباسورد المؤقت: <b dir="ltr" style="font-size:20px;letter-spacing:1px">${esc(c.password)}</b></p>
  ${c.warning?`<p class="err">${esc(c.warning)}</p>`:''}<p class="empty">الباسورد مش هيظهر تاني بعد ما تقفل الكارت، ابعته دلوقتي.</p>${wa}<button class="s" data-a="dismiss">تم</button></div>`;
}
function vAdd(){
  return credCard()+`<div class="card"><h2>إضافة مستخدم</h2><input id="un" placeholder="الاسم بالكامل"><input id="up" type="tel" inputmode="tel" placeholder="رقم التليفون (هو اسم الدخول)" dir="ltr">
  <select id="ur" data-a="newrole">${Object.entries(ROLES).filter(([k])=>isAdmin()||k==='servant'||k==='parent').map(([k,n])=>`<option value="${k}"${k==='servant'?' selected':''}>${n}</option>`).join('')}</select>
  <div id="usc" style="display:none"><select id="usec"><option value="">اختار قسم أمين الخدمة</option><option value="boys"${S.sec==='boys'?' selected':''}>بنين</option><option value="girls"${S.sec==='girls'?' selected':''}>بنات</option></select></div>
  <div id="uc"><select id="ucl"><option value="">اختار فصل الخادم</option>${opts(S.classes,cLabel)}</select></div>
  <div id="ue" style="display:none"><select id="use"><option value="">اختار المخدوم</option>${opts(S.servees,s=>s.full_name)}</select></div>
  <button class="p" data-a="addUser">إنشاء الحساب</button><p class="empty">هيتعمل باسورد مؤقت يتغيّر أول دخول. لو ولي الأمر عنده أكتر من ابن، اربط الباقي من تبويب المستخدمين.</p></div>`;
}
function invLinkCard(){
  const c=S.invLink;if(!c)return'';
  const wa='https://wa.me/?text='+encodeURIComponent(c.msg);
  return `<div class="card" style="border-color:var(--gold)"><h2>${esc(c.title)}</h2><p dir="ltr" style="word-break:break-all;margin:0 0 8px;font-size:13px">${esc(c.url)}</p>
  <a target="_blank" rel="noopener" href="${wa}" style="display:block;text-align:center;padding:11px;border-radius:8px;background:#25d366;color:#fff;font-weight:600;text-decoration:none;margin-bottom:8px">إرسال على واتساب</a>
  <button class="s" data-a="copyInv">نسخ اللينك</button> <button class="s" data-a="dismissInv">تم</button>
  <p class="empty">اللينك مش هيظهر تاني بعد ما تقفل الكارت. لو ضاع اعمل لينك جديد.</p></div>`;
}
function vInv(){
  const adm=isAdmin(),now=Date.now();
  const act=(S.inv||[]).filter(i=>!i.revoked&&i.uses<i.max_uses&&new Date(i.expires_at).getTime()>now);
  const lbl=i=>i.role==='secretary'?'أمين خدمة '+(SEC[i.section]||''):i.role==='parent'?'ولي أمر · '+sname(i.servee_id):'خادم · '+cname(i.class_id);
  return invLinkCard()+`<div class="card"><h2>${adm?'دعوة جديدة':'دعوة خدام'}</h2>
  ${adm?`<select id="ir" data-a="invrole"><option value="secretary">أمين خدمة</option><option value="servant">خادم</option></select>
  <div id="isec"><select id="is"><option value="">اختار القسم</option><option value="boys"${S.sec==='boys'?' selected':''}>بنين</option><option value="girls"${S.sec==='girls'?' selected':''}>بنات</option></select></div>`:''}
  <div id="icl" ${adm?'style="display:none"':''}><select id="ic"><option value="">اختار الفصل</option>${opts(S.classes,cLabel)}</select></div>
  <button class="p" data-a="mkInv">عمل لينك الدعوة</button>
  <p class="empty">${adm?'لينك الأمين لمرة واحدة. ':''}لينك الخدام صالح 7 أيام ولحد 30 خادم، وكل خادم بيسجّل بياناته بنفسه وحسابه بيستنى موافقتك.</p></div>
  <div class="card"><h2>الدعوات الشغّالة (${act.length})</h2>${act.map(i=>`<div class="row"><div>${esc(lbl(i))}<small>استُخدم ${i.uses} من ${i.max_uses} · ينتهي ${new Date(i.expires_at).toLocaleDateString('ar-EG')}</small></div><button class="s d" data-a="revInv" data-id="${i.id}">إلغاء</button></div>`).join('')||'<div class="empty">مفيش دعوات شغّالة.</div>'}</div>`;
}
async function mkParInv(id){
  const x=S.servees.find(y=>y.id===id);if(!x||!canManage())return;
  const row={role:'parent',servee_id:id,section:x.section||null,created_by:S.p.id,expires_at:new Date(Date.now()+7*864e5).toISOString(),max_uses:3};
  const tok=rnd();row.token_hash=await sha(tok);
  const r=await sb.from('invites').insert(row);if(!ok(r))return;
  const url=location.origin+location.pathname+'#join='+tok;
  S.invLink={url,title:'دعوة ولي أمر · '+x.full_name,msg:`أهلاً 👋\nدعوة لحساب ولي أمر ${x.full_name} في تطبيق خدمة إعدادي، علشان تتابع حضوره.\nافتح اللينك واكتب بياناتك واختار باسورد:\n${url}\nاللينك صالح 7 أيام ويكفي لـ 3 أشخاص (أب وأم مثلاً).`};
  S.tab='inv';await load();render();window.scrollTo(0,0);
}
async function mkInv(){
  const adm=isAdmin(),role=adm?v('ir'):'servant';
  const row={role,created_by:S.p.id,expires_at:new Date(Date.now()+7*864e5).toISOString(),max_uses:role==='secretary'?1:30};
  let title,msg;
  if(role==='secretary'){if(!v('is'))return toast('اختار القسم');row.section=v('is');title='دعوة أمين خدمة '+SEC[row.section]}
  else{if(!v('ic'))return toast('اختار الفصل');row.class_id=v('ic');const c=S.classes.find(x=>x.id===row.class_id);row.section=c?c.section:null;title='دعوة خدام · '+(c?c.name:'')}
  const tok=rnd();row.token_hash=await sha(tok);
  const r=await sb.from('invites').insert(row);if(!ok(r))return;
  const url=location.origin+location.pathname+'#join='+tok;
  msg=role==='secretary'
    ?`أهلاً 👋\nدعوة للانضمام كأمين خدمة ${SEC[row.section]} في تطبيق خدمة إعدادي.\nافتح اللينك واكتب بياناتك واختار باسورد:\n${url}\nاللينك صالح 7 أيام ولمرة واحدة.`
    :`أهلاً 👋\nدعوة للانضمام كخادم في ${title.replace('دعوة خدام · ','فصل ')} في تطبيق خدمة إعدادي.\nافتح اللينك واكتب بياناتك واختار باسورد، وبعدها استنى موافقة أمين الخدمة:\n${url}\nاللينك صالح 7 أيام.`;
  S.invLink={url,title,msg};await load();render();
}
function vPeople(){
  const sv=S.profiles.filter(p=>p.role==='servant'),pr=S.profiles.filter(p=>p.role==='parent');
  return credCard()+`<div class="card"><h2>المستخدمين (${S.profiles.length})</h2><p class="empty">الحسابات الجديدة بتتعمل من تبويب "مستخدم جديد". هنا تعمل باسورد مؤقت جديد أو توقّف الحساب${isAdmin()?' أو تغيّر الدور':''}.</p>
  ${S.profiles.filter(p=>isAdmin()||(p.id!==S.p.id&&(p.role==='servant'||p.role==='parent'))).map(p=>`<div class="row ${p.active?'':'off'}"><div>${esc(p.full_name||'بدون اسم')}${p.role==='secretary'?badge(p.section):''}${p.pending&&!p.active?'<span class="bd" style="background:#fde9b8">مستني موافقة</span>':''}${p.phone?`<small dir="ltr" style="text-align:right">${esc(p.phone)}</small>`:''}${isSec()?`<small>${esc(ROLES[p.role]||'')}</small>`:''}</div><div class="acts"><button class="s" data-a="renameUser" data-id="${p.id}">الاسم</button><button class="s" data-a="resetPw" data-id="${p.id}">باسورد جديد</button>${p.id!==S.p.id?`<button class="s${p.pending&&!p.active?' on':''}" data-a="togUser" data-id="${p.id}">${p.pending&&!p.active?'موافقة':(p.active?'إيقاف':'تفعيل')}</button>`:''}${isAdmin()?`<select data-a="role" data-id="${p.id}" style="margin:0;width:auto">${Object.entries(ROLES).map(([k,n])=>`<option value="${k}"${p.role===k?' selected':''}>${n}</option>`).join('')}</select>`:''}</div></div>`).join('')}</div>
  <div class="card"><h2>ربط خادم بفصل</h2><select id="ls">${opts(sv,p=>p.full_name||'بدون اسم')}</select><select id="lc">${opts(S.classes,cLabel)}</select><button class="p" data-a="addCS">ربط</button>
  ${S.cs.map(x=>`<div class="row"><div>${esc(pname(x.servant_id))}<small>${esc(cname(x.class_id))}</small></div><button class="s d" data-a="delCS" data-id="${x.class_id}|${x.servant_id}">فك</button></div>`).join('')}</div>
  <div class="card"><h2>ربط ولي أمر بمخدوم</h2><select id="lp">${opts(pr,p=>p.full_name||'بدون اسم')}</select><select id="le">${opts(S.servees,s=>s.full_name)}</select><button class="p" data-a="addPL">ربط</button>
  ${S.pl.map(x=>`<div class="row"><div>${esc(pname(x.parent_id))}<small>${esc(sname(x.servee_id))}</small></div><button class="s d" data-a="delPL" data-id="${x.parent_id}|${x.servee_id}">فك</button></div>`).join('')}</div>`;
}
async function run(a,id){
  let r;
  if(a==='addClass'){if(!v('cn'))return toast('اكتب اسم الفصل');if(isAdmin()&&!v('csec'))return toast('اختار قسم الفصل');r=await sb.from('classes').insert({name:v('cn'),stage:v('cs')||null,section:isSec()?S.p.section:v('csec')})}
  else if(a==='delClass'){if(S.servees.some(x=>x.class_id===id))return toast('انقل أو أرشف المخدومين اللي في الفصل ده الأول');if(!confirm('حذف الفصل؟'))return;r=await sb.from('classes').delete().eq('id',id)}
  else if(a==='addServee'){if(!v('sn'))return toast('اكتب اسم المخدوم');
    {const np=normPhone(v('sp')||''),dup=S.servees.find(x=>(np&&normPhone(x.phone||'')===np)||nz(x.full_name)===nz(v('sn')));if(dup&&!confirm('فيه مخدوم بنفس الاسم أو التليفون: '+dup.full_name+'. تضيفه برضه؟'))return}
    r=await sb.from('servees').insert({full_name:v('sn'),phone:v('sp')||null,birth_date:v('sb')||null,class_id:v('sc')||null,address:v('sa')||null,notes:v('sno')||null})}
  else if(a==='delServee'){if(!canManage())return;const sv=S.servees.find(x=>x.id===id);if(!sv)return;const t=prompt('الحذف نهائي وبيمسح حضوره ونقاطه. لو عايز تحتفظ بيه استخدم «أرشفة».\nاكتب اسم المخدوم للتأكيد:\n'+sv.full_name);if(t===null)return;if(nz(t)!==nz(sv.full_name))return toast('الاسم مش مطابق، ما اتحذفش');r=await sb.from('servees').delete().eq('id',id)}
  else if(a==='archServee'){const why=prompt('سبب الأرشفة (اختياري: انتقل، سافر، انقطع...)');if(why===null)return;r=await sb.from('servees').update({active:false,archived_at:new Date().toISOString(),archive_reason:why.trim()||null}).eq('id',id)}
  else if(a==='restServee'){r=await sb.from('servees').update({active:true,archived_at:null,archive_reason:null}).eq('id',id)}
  else if(a==='togServee'){const s=S.servees.find(x=>x.id===id);r=await sb.from('servees').update({active:!s.active}).eq('id',id)}
  else if(a==='togUser'){const u=S.profiles.find(x=>x.id===id);if(!u)return;r=await sb.from('profiles').update(u.pending&&!u.active?{active:true,pending:false}:{active:!u.active}).eq('id',id)}
  else if(a==='addCS'){if(!v('ls')||!v('lc'))return toast('اختار الخادم والفصل');r=await sb.from('class_servants').insert({servant_id:v('ls'),class_id:v('lc')})}
  else if(a==='srvAddCS'){const c=document.getElementById('sac_'+id);if(!c||!c.value)return toast('اختار الفصل');r=await sb.from('class_servants').insert({servant_id:id,class_id:c.value})}
  else if(a==='delCS'){const[c,s]=id.split('|');r=await sb.from('class_servants').delete().eq('class_id',c).eq('servant_id',s)}
  else if(a==='addPL'){if(!v('lp')||!v('le'))return toast('اختار ولي الأمر والمخدوم');r=await sb.from('parent_links').insert({parent_id:v('lp'),servee_id:v('le')})}
  else if(a==='promoteClass'){const f=S.classes.find(x=>x.id===id);if(!f)return;const t=S.classes.filter(x=>x.id!==id&&x.section===f.section);if(!t.length)return toast('مفيش فصل تاني في نفس القسم');const n=prompt('رقّي مخدومين «'+f.name+'» لأنهي فصل؟ اكتب الرقم:\n'+t.map((x,i)=>(i+1)+' - '+x.name).join('\n'));if(n===null)return;const to=t[parseInt(n,10)-1];if(!to)return toast('رقم غير صحيح');if(!confirm('نقل كل مخدومين «'+f.name+'» إلى «'+to.name+'»؟'))return;r=await sb.rpc('kh_promote_class',{p_from:id,p_to:to.id});if(!r.error)toast('تم نقل '+r.data+' مخدوم')}
  else if(a==='delPL'){const[p,s]=id.split('|');r=await sb.from('parent_links').delete().eq('parent_id',p).eq('servee_id',s)}
  else if(a==='addUser'){
    const role=v('ur'),ph=normPhone(v('up'));
    if(!v('un'))return toast('اكتب الاسم');
    if(!ph)return toast('رقم التليفون مش صحيح (مثال: 01012345678)');
    if(role==='servant'&&!v('ucl'))return toast('اختار فصل الخادم');
    if(role==='parent'&&!v('use'))return toast('اختار المخدوم');
    if(role==='secretary'&&!v('usec'))return toast('اختار قسم أمين الخدمة');
    const btn=document.querySelector('[data-a=addUser]');btn.disabled=true;
    const x=await fn({name:v('un'),phone:ph,role,class_id:role==='servant'?v('ucl'):null,servee_id:role==='parent'?v('use'):null,section:role==='secretary'?v('usec'):null});
    btn.disabled=false;
    if(x.error)return toast(x.error);
    S.created=x;
  }
  else if(a==='resetPw'){
    if(!confirm('هيتعمل باسورد مؤقت جديد والباسورد القديم هيبطل. متأكد؟'))return;
    const x=await fn({action:'reset',user_id:id});
    if(x.error)return toast(x.error);
    S.created=x;
  }
  if(r&&!ok(r))return;
  await load();render();if(S.created)window.scrollTo(0,0);toast(S.created?'تم، الباسورد المؤقت فوق':'تم');
}
function fuForm(x){
  const fu=S.fu||[];
  return `<div class="card" style="border-color:var(--gold)"><h2>افتقاد: ${esc(x.full_name)}</h2><div class="two"><select id="fk">${Object.entries(FK).map(([k,n])=>`<option value="${k}">${n}</option>`).join('')}</select><select id="fs">${Object.entries(FS).map(([k,n])=>`<option value="${k}">${n}</option>`).join('')}</select></div><input id="fd" type="date" value="${today()}" max="${today()}"><textarea id="fn" rows="3" placeholder="ملاحظات الافتقاد (اتكلمنا مع مين، السبب، المطلوب...)"></textarea><button class="p" data-a="saveFu">حفظ الافتقاد</button><button class="s" data-a="cancelEdit" style="margin-top:8px">إلغاء</button>${fu.filter(f=>f.servee_id===x.id).slice(0,4).map(f=>`<div class="row"><div>${FK[f.kind]||esc(f.kind)} · ${fdate(f.followup_date)}<small>${esc(f.note||'')}</small></div><span class="bd">${FS[f.status]||esc(f.status)}</span></div>`).join('')}</div>`;
}
/* ===== تنبيه الغياب المتتالي · فصلي · ملف المخدوم · اتصال وواتساب سريع ===== */
const ABS_TH=3,LK='text-decoration:none;display:inline-block';
S.mates={};S.cpar={};S.pf=null;S.pfPar=null;
const waUrl=(ph,msg)=>{const p=normPhone(ph||'');return p?'https://wa.me/20'+p.slice(1)+(msg?'?text='+encodeURIComponent(msg):''):''};
const fst=n=>String(n||'').trim().split(/\s+/)[0];
const MSG={
  abs:x=>'أهلاً يا '+fst(x.full_name)+'، افتقدناك في الاجتماع. ربنا يباركك ويحفظك. خدمة إعدادي',
  bd:x=>'كل سنة وانت طيب يا '+fst(x.full_name)+' 🎂 ربنا يفرّح قلبك. خدمة إعدادي',
  rem:x=>'أهلاً يا '+fst(x.full_name)+'، بنفكّرك باجتماع الخدمة الجاي. هنستناك ❤️ خدمة إعدادي'
};
const MSGP={
  abs:x=>'أهلاً بحضرتك، معاك خدمة إعدادي. افتقدنا '+fst(x.full_name)+' في الاجتماع وحبّينا نطمّن عليه. ربنا يبارككم',
  bd:x=>'كل سنة و'+fst(x.full_name)+' طيب 🎂 ربنا يحفظه ويفرّح قلبكم. خدمة إعدادي',
  rem:x=>'أهلاً بحضرتك، بنفكّركم باجتماع الخدمة الجاي ونتمنى نشوف '+fst(x.full_name)+'. ربنا يبارككم'
};
/* اتصال + واتساب (برسالة جاهزة لو اتحددت) */
function qc(ph,msg,who,name){
  const p=normPhone(ph||''),n=nb(who,name,msg);if(!p)return n;
  return `<a class="s" style="${LK}" href="tel:${p}">اتصال</a><a class="s" target="_blank" rel="noopener" style="${LK}" href="${waUrl(p,msg)}">واتساب</a>`+n;
}
/* أزرار الرسائل الجاهزة: غياب / تهنئة / تذكير */
function tpl(ph,M,x){
  if(!normPhone(ph||''))return'';
  return [['غياب','abs'],['تهنئة بعيد الميلاد','bd'],['تذكير بالاجتماع','rem']].map(([l,k])=>`<a class="s" target="_blank" rel="noopener" style="${LK}" href="${waUrl(ph,M[k](x))}">💬 ${l}</a>`).join('');
}
/* المحتاجين افتقاد: غياب ${ABS_TH} اجتماعات ورا بعض أو أكتر */
function absList(cid){
  const H=histInfo(90);
  return S.servees.filter(x=>x.active&&x.class_id&&(!cid||x.class_id===cid)).map(x=>({x,st:servStat(x,H)})).filter(o=>o.st.streak>=ABS_TH).sort((a,b)=>b.st.streak-a.st.streak||a.x.full_name.localeCompare(b.x.full_name,'ar'));
}
function absCard(L,max,showAll){
  if(S.ah===null)return'';
  const fu=S.fu||[],open=id=>fu.find(f=>f.servee_id===id&&f.status==='open');
  const rows=L.slice(0,max).map(({x,st})=>{const o=open(x.id);
    return `<div class="row"><div class="who">${av(x,40)}<div>${esc(x.full_name)}<small>${esc(cname(x.class_id))} · غايب ${st.streak} اجتماعات ورا بعض${st.last?' · آخر حضور '+fdate(st.last):''}</small><small>${o?'<span class="bd" style="background:#fde9b8;margin:0">بند افتقاد مفتوح</span>':'لسه ما اتفتقدش'}</small></div></div><div class="acts">${qc(x.phone,MSG.abs(x),{s:x.id,m:MSGP.abs(x)},'أولياء أمور '+x.full_name)}<button class="s on" data-a="pf" data-id="${x.id}">الملف</button></div></div>`}).join('');
  return `<div class="card" style="border-color:${L.length?'var(--red)':'var(--line)'}"><h2>⚠️ محتاجين افتقاد (${L.length})</h2><p class="empty" style="margin:0 0 4px;padding:0">غابوا ${ABS_TH} اجتماعات ورا بعض أو أكتر. بيتفتح لهم بند افتقاد وبيوصل إشعار للخادم أوتوماتيك.</p>${rows||'<div class="empty">مفيش حد غايب '+ABS_TH+' اجتماعات ورا بعض. ✓</div>'}${showAll&&L.length>max?`<button class="s" data-a="tab" data-id="follow" style="width:100%;margin-top:8px">عرض الكل (${L.length})</button>`:''}</div>`;
}
/* زمايل الخادم في الفصل (دالة سيرفر عشان الخادم ما يقرأش جدول المستخدمين) */
async function loadMates(cid){
  cid=cid||acid();if(!cid)return;
  const [r,q]=await Promise.all([sb.rpc('kh_class_servants',{p_class:cid}),sb.rpc('kh_class_parents',{p_class:cid})]);
  S.mates[cid]=r.error?[]:(r.data||[]);S.cpar[cid]=q.error?null:(q.data||[]);
}
/* ---------- شاشة «فصلي» ---------- */
function myPage(which){
  if(!S.classes.length)return '<div class="card"><div class="empty">مفيش فصل مربوط بيك لسه. اطلب من أبونا يربطك بفصل.</div></div>';
  const cid=acid(),c=S.classes.find(x=>x.id===cid)||{},H=histInfo(90),
    L=S.servees.filter(x=>x.class_id===cid&&x.active).sort((a,b)=>a.full_name.localeCompare(b.full_name,'ar')),
    R=L.map(x=>({x,st:servStat(x,H)})),A=Object.fromEntries(S.att.map(a=>[a.servee_id,a.status])),
    P=L.filter(x=>A[x.id]==='present').length,B=L.filter(x=>A[x.id]==='absent').length,
    ps=R.filter(o=>o.st.pct!==null).map(o=>o.st.pct),avg=ps.length?Math.round(ps.reduce((a,b)=>a+b,0)/ps.length):null,
    bd=L.filter(x=>x.birth_date).map(x=>({x,...nextBday(x.birth_date)})).filter(o=>o.days<=14).sort((a,b)=>a.days-b.days),
    mates=(S.mates[cid]||[]).filter(m=>m.id!==S.p.id),
    lbl=o=>o.days===0?'النهارده':o.days===1?'بكرة':'بعد '+o.days+' يوم';
  const par=S.cpar[cid],byP=new Map();
  (par||[]).forEach(r=>{let g=byP.get(r.parent_id);if(!g){g={id:r.parent_id,name:r.name,phone:r.contact_phone||r.phone,kids:[]};byP.set(r.parent_id,g)}const k=L.find(x=>x.id===r.servee_id);if(k)g.kids.push(k.full_name)});
  const linked=new Set((par||[]).map(r=>r.servee_id)),noPar=L.filter(x=>!linked.has(x.id));
  const parCard=`<div class="card"><h2>أولياء الأمور${par?' ('+byP.size+')':''}</h2>${par===null?'<div class="empty">تعذّر تحميل أولياء الأمور.</div>':[...byP.values()].map(g=>`<div class="row"><div>${esc(g.name||'بدون اسم')}<small>ولي أمر: ${g.kids.map(esc).join('، ')}</small><small dir="ltr" style="text-align:right">${esc(g.phone||'')}</small></div><div class="acts">${qc(g.phone,'',{u:g.id},g.name)}</div></div>`).join('')||'<div class="empty">لسه مفيش ولي أمر مربوط بحساب. اطلب من أمين الخدمة يبعتله دعوة.</div>'}${par&&noPar.length?`<p class="empty" style="margin:8px 0 0;padding:0">من غير ولي أمر مربوط (${noPar.length}): ${noPar.map(x=>esc(x.full_name)).join('، ')}</p>`:''}</div>`;
  const sum=`<div class="card"><h2>فصلي</h2>${S.classes.length>1?`<select data-a="attClass">${opts(S.classes,cLabel,cid)}</select>`:`<b>${esc(cLabel(c))}</b>`}
  <div class="cnt"><span>مخدومين ${L.length}</span>${avg!==null?`<span>متوسط الحضور ${avg}%</span>`:''}<span>${fdate(S.date)}: حاضر ${P} · غايب ${B}</span></div>
  <button class="p" data-a="tab" data-id="att">تسجيل الحضور</button></div>`,sev=`
  <div class="card"><h2>مخدومين الفصل (${L.length})</h2>${R.map(({x,st})=>`<div class="row"><div class="who">${av(x,40)}<div>${esc(x.full_name)}<small${st.streak>=ABS_TH?' style="color:var(--red)"':''}>${st.pct===null?'لسه مفيش حضور':'حضور '+st.pct+'%'}${st.streak>=1?' · غايب '+st.streak+' ورا بعض':''}</small></div></div><div class="acts">${qc(x.phone,st.streak>=1?MSG.abs(x):'',{s:x.id,m:st.streak>=1?MSGP.abs(x):''},'أولياء أمور '+x.full_name)}<button class="s on" data-a="pf" data-id="${x.id}">الملف</button></div></div>`).join('')||'<div class="empty">مفيش مخدومين في الفصل ده.</div>'}</div>`,rest=`
  ${absCard(absList(cid),10,false)}
  ${bd.length?`<div class="card"><h2>أعياد ميلاد قريبة (${bd.length})</h2>${bd.map(o=>`<div class="row"><div class="who">${av(o.x,36)}<div>${esc(o.x.full_name)}<small>${lbl(o)}</small></div></div><div class="acts">${qc(o.x.phone,MSG.bd(o.x))}</div></div>`).join('')}</div>`:''}
  <div class="card"><h2>زمايلي في الفصل (${mates.length})</h2>${mates.map(m=>`<div class="row"><div>${esc(m.name||'بدون اسم')}<small dir="ltr" style="text-align:right">${esc(m.contact_phone||m.phone||'')}</small></div><div class="acts">${qc(m.contact_phone||m.phone,'',{u:m.id},m.name)}</div></div>`).join('')||'<div class="empty">إنت الخادم الوحيد المربوط بالفصل ده.</div>'}</div>`;
  const hd=`<div class="card">${S.classes.length>1?`<select data-a="attClass">${opts(S.classes,cLabel,cid)}</select>`:`<b>${esc(cLabel(c))}</b>`}</div>`;
  return which==='pr'?hd+parCard:which==='sv'?hd+sev:sum+rest;
}
function vMyClass(){return myPage('cl')}
function vMyServees(){return myPage('sv')}
function vMyParents(){return myPage('pr')}
/* ---------- ملف المخدوم ---------- */
async function openProfile(id){
  S.pf=id;S.pfPar=null;S.fuf=null;render();window.scrollTo(0,0);
  const [r]=await Promise.all([sb.rpc('kh_servee_parents',{p_servee:id}),S.pr===null?loadComp():null,S.ah===null?loadHist():null]);
  if(S.pf!==id)return;
  S.pfPar=r.error?[]:(r.data||[]);render();
}
function vProfile(){
  const x=S.servees.find(y=>y.id===S.pf);
  if(!x)return '<main><div class="card"><div class="empty">المخدوم مش موجود.</div><button class="s" data-a="pfBack">رجوع</button></div></main>';
  const H=histInfo(90),st=servStat(x,H),m=H.byS[x.id]||{},ds=[...(H.datesByC[x.class_id]||[])].sort().reverse().slice(0,12),
    fu=(S.fu||[]).filter(f=>f.servee_id===x.id),par=S.pfPar,
    pr=S.pr===null?null:(S.pr||[]).filter(p=>p.servee_id===x.id),tot=pr?pr.reduce((a,p)=>a+p.points,0):0,
    nb=x.birth_date?nextBday(x.birth_date):null,
    age=x.birth_date?Math.floor((Date.now()-new Date(x.birth_date+'T00:00:00'))/31557600000):null,
    sd=d=>new Date(d+'T00:00:00').toLocaleDateString('ar-EG',{day:'numeric',month:'numeric'}),
    cmpName=id=>(S.cmp||[]).find(c=>c.id===id);
  return `<main><div class="np" style="margin-bottom:12px"><button class="s" data-a="pfBack">← رجوع</button></div>
  <div class="card"><div class="who">${av(x,72)}<div><b style="font-size:19px">${esc(x.full_name)}</b>${badge(x.section)}${x.active?'':'<span class="bd" style="background:#f3d6d2">مؤرشف</span>'}<small>${esc(cname(x.class_id))}</small></div></div>
  ${x.phone?`<div class="acts" style="justify-content:flex-start;margin-top:10px"><span dir="ltr" style="align-self:center">${esc(x.phone)}</span>${qc(x.phone,'')}</div>
  <div class="acts" style="justify-content:flex-start;margin-top:8px">${tpl(x.phone,MSG,x)}</div>`:'<p class="empty">مفيش رقم تليفون للمخدوم.</p>'}
  ${canManage()?`<button class="s" data-a="editServee" data-id="${x.id}" style="margin-top:10px">تعديل البيانات</button>`:''}</div>
  ${S.fuf===x.id?fuForm(x):''}
  <div class="card"><h2>البيانات</h2><div class="cnt" style="flex-direction:column;gap:2px">
    <span>الميلاد: ${x.birth_date?esc(x.birth_date)+(age!==null&&age>=0?' · '+age+' سنة':'')+(nb&&nb.days<=30?' · عيد ميلاده '+(nb.days===0?'النهارده':nb.days===1?'بكرة':'بعد '+nb.days+' يوم'):''):'—'}</span>
    <span>العنوان: ${esc(x.address||'—')}</span><span>ملاحظات: ${esc(x.notes||'—')}</span></div></div>
  <div class="card"><h2>ولي الأمر</h2>${par===null?'<div class="empty">جاري التحميل...</div>':par.map(q=>{const ph=q.contact_phone||q.phone;return `<div class="row" style="align-items:flex-start"><div>${esc(q.name||'بدون اسم')}<small dir="ltr" style="text-align:right">${esc(ph||'')}</small></div><div class="acts">${qc(ph,MSGP.abs(x))}</div></div>${normPhone(ph||'')?`<div class="acts" style="justify-content:flex-start;margin-bottom:6px">${tpl(ph,MSGP,x)}</div>`:''}`}).join('')||'<div class="empty">مفيش ولي أمر مربوط بحساب في التطبيق. اعمل له دعوة من تبويب المخدومين.</div>'}${par&&par.length?`<div class="acts" style="justify-content:flex-start;margin-top:8px">${[['غياب','abs'],['تهنئة بعيد الميلاد','bd'],['تذكير بالاجتماع','rem']].map(([l,k])=>nb({s:x.id,m:MSGP[k](x)},'أولياء أمور '+x.full_name,'','🔔 '+l)).join('')}</div>`:''}</div>
  <div class="card"><h2>الحضور (آخر 90 يوم)</h2><div class="cnt">${st.sessions?`<span>حاضر ${st.present}</span><span>غايب ${st.absent}</span><span>نسبة الحضور ${st.pct}%</span>`:'<span>لسه مفيش حضور متسجّل</span>'}</div>
    ${st.sessions?`<div class="cnt"><span${st.streak>=ABS_TH?' style="color:var(--red);font-weight:700"':''}>غياب متتالي: ${st.streak}</span>${st.last?`<span>آخر حضور ${fdate(st.last)}</span>`:''}</div>
    <div class="pfl">${ds.map(d=>`<span class="chip ${m[d]==='present'?'ok':'no'}">${m[d]==='present'?'✓':'✗'} ${sd(d)}</span>`).join('')}</div>`:''}</div>
  <div class="card"><h2>النقاط</h2>${pr===null?'<div class="empty">جاري التحميل...</div>':`<div class="cnt"><span>إجمالي النقاط ${tot}</span></div>${pr.slice(0,6).map(p=>{const c=cmpName(p.competition_id);return `<div class="row"><div>${esc(p.reason||'نقاط')}<small>${c?esc(c.title)+' · ':''}${new Date(p.created_at).toLocaleDateString('ar-EG')}</small></div><b style="color:${p.points>0?'#1b7a43':'var(--red)'}">${p.points>0?'+':''}${p.points}</b></div>`}).join('')||'<div class="empty">لسه مفيش نقاط.</div>'}`}</div>
  <div class="card"><h2>الافتقاد (${fu.length})</h2><button class="s on" data-a="fuOpen" data-id="${x.id}" style="margin-bottom:8px">تسجيل افتقاد</button>${fu.slice(0,8).map(f=>`<div class="row"><div>${FK[f.kind]||esc(f.kind)} · ${fdate(f.followup_date)}<small>${esc(f.note||'')}</small></div><div class="acts"><span class="bd">${FS[f.status]||esc(f.status)}</span>${f.status==='open'?`<button class="s" data-a="fuDone" data-id="${f.id}">تم</button>`:''}</div></div>`).join('')||'<div class="empty">لسه ما اتفتقدش.</div>'}</div></main>`;
}

app.addEventListener('click',async e=>{
  const b=e.target.closest('[data-a]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return;
  const a=b.dataset.a,id=b.dataset.id;e.preventDefault();
  if(a==='login'){
    const em=toEmail(v('em'));
    const {error}=em?await sb.auth.signInWithPassword({email:em,password:document.getElementById('pw').value}):{error:1};
    if(error)return document.getElementById('err').textContent='الرقم أو الباسورد غلط، جرّب تاني.';
    return boot();
  }
  if(a==='setpw'){
    const n1=document.getElementById('n1').value,n2=document.getElementById('n2').value,er=document.getElementById('err');
    if(n1.length<8)return er.textContent='الباسورد لازم يكون 8 حروف على الأقل.';
    if(n1!==n2)return er.textContent='الباسورد مش متطابق.';
    const {error}=await sb.auth.updateUser({password:n1,data:{must_change:false}});
    if(error)return er.textContent='حصل خطأ: '+error.message;
    return boot();
  }
  if(a==='scan')return openScan();
  if(a==='mark'){
    const[sid,st]=id.split('|'),cur=(S.att.find(x=>x.servee_id===sid)||{}).status;
    const {error}=await sb.rpc('kh_mark',{p_servee:sid,p_date:S.date,p_status:cur===st?'clear':st});
    if(error)return toast(rpcErr(error));
    await loadAtt();return render();
  }
  if(a==='restAbs'){
    if(!confirm('تسجيل كل اللي لسه ما اتحضروش كغايبين؟'))return;
    const {data,error}=await sb.rpc('kh_mark_rest',{p_class:acid(),p_date:S.date});
    if(error)return toast(rpcErr(error));
    await loadAtt();render();return toast('اتسجّل غياب '+data+' مخدوم');
  }
  if(a==='cards'){S.cards=svFiltered().filter(x=>x.active).map(x=>x.id);return render()}
  if(a==='card'){S.cards=[id];return render()}
  if(a==='back'){S.cards=null;return render()}
  if(a==='print')return window.print();
  if(a==='photo'){S.pu=id;return document.getElementById('pf').click()}
  if(a==='dismiss'){S.created=null;return render()}
  if(a==='out'){await sb.auth.signOut();return login()}
  if(a==='diag')return diagOpen();
  if(a==='nt')return ntOpen(b);
  if(a==='tab'){S.tab=id;if(id==='audit')await loadAudit();if(['follow','rep','home','mycls','mysv'].includes(id))await loadHist();if(['mycls','mypr'].includes(id))await loadMates();if(id==='comp')await loadComp();if(id==='ann')await loadAnn();if(id==='msg')await loadMsg();if(id==='pst')await loadPst();if(id==='set'){S.pushSt=await pushState();await loadTpl()}if(id==='notif'){S.pushSt=await pushState();await loadNotifs()}return render()}
  if(a==='joinGo')return joinGo();
  if(a==='joinhome'){history.replaceState(null,'',location.pathname);return boot()}
  if(a==='mkInv')return mkInv();
  if(a==='parInv')return mkParInv(id);
  if(a==='copyInv'){try{await navigator.clipboard.writeText(S.invLink.url);toast('اتنسخ')}catch(_){toast('انسخ اللينك يدويًا')}return}
  if(a==='dismissInv'){S.invLink=null;return render()}
  if(a==='revInv'){if(!confirm('إلغاء الدعوة دي؟'))return;const r=await sb.from('invites').update({revoked:true}).eq('id',id);if(!ok(r))return;await load();render();return toast('اتلغت')}
  if(a==='editServee'){S.pf=null;S.ed=id;S.edc=null;S.tab='servees';render();return window.scrollTo(0,0)}
  if(a==='editClass'){S.edc=id;S.ed=null;render();return window.scrollTo(0,0)}
  if(a==='cancelEdit'){S.ed=null;S.edc=null;S.fuf=null;return render()}
  if(a==='saveServee'){
    const sv=S.servees.find(x=>x.id===S.ed);if(!sv)return;if(!v('en'))return toast('اكتب الاسم');
    const r=await sb.from('servees').update({full_name:v('en'),phone:v('ep')||null,birth_date:v('eb')||null,class_id:v('ec')||null,address:v('ea')||null,notes:v('eno')||null}).eq('id',sv.id);
    if(!ok(r))return;S.ed=null;await load();render();return toast('تم الحفظ');
  }
  if(a==='saveClass'){
    const c=S.classes.find(x=>x.id===S.edc);if(!c)return;if(!v('ecn'))return toast('اكتب اسم الفصل');
    const upd={name:v('ecn'),stage:v('ecs')||null};
    if(isAdmin()){if(!v('ecsec'))return toast('اختار القسم');upd.section=v('ecsec')}
    const r=await sb.from('classes').update(upd).eq('id',c.id);
    if(!ok(r))return;S.edc=null;await load();render();return toast('تم الحفظ');
  }
  if(a==='more'){S.lim+=50;document.getElementById('sl').innerHTML=svList();return}
  if(a==='renameUser'){
    const u=S.profiles.find(x=>x.id===id);if(!u)return;
    const n=(prompt('الاسم الجديد',u.full_name||'')||'').trim();if(!n||n===u.full_name)return;
    const r=await sb.from('profiles').update({full_name:n}).eq('id',id);
    if(!ok(r))return;await load();render();return toast('تم');
  }
  if(a==='csvCancel'){S.imp=null;return render()}
  if(a==='csvGo'){
    const m=S.imp;if(!m||!m.ok.length)return;
    const b=document.querySelector('[data-a=csvGo]');if(b)b.disabled=true;
    for(let i=0;i<m.ok.length;i+=200){const r=await sb.from('servees').insert(m.ok.slice(i,i+200));if(!ok(r)){await load();render();return}}
    const n=m.ok.length;S.imp=null;await load();render();return toast('اتضاف '+n+' مخدوم');
  }
  if(a==='fuOpen'){S.fuf=id;render();return window.scrollTo(0,0)}
  if(a==='saveFu'){
    const r=await sb.from('followups').insert({servee_id:S.fuf,servant_id:S.p.id,kind:v('fk'),status:v('fs'),note:document.getElementById('fn').value.trim()||null,followup_date:v('fd')||today()});
    if(!ok(r))return;if(v('fs')==='done')await sb.from('followups').update({status:'done'}).eq('servee_id',S.fuf).eq('status','open').like('note','[تلقائي]%');S.fuf=null;await loadHist();render();return toast('اتسجّل');
  }
  if(a==='fuDone'){const r=await sb.from('followups').update({status:'done'}).eq('id',id);if(!ok(r))return;await loadHist();return render()}
  if(a==='exp'){
    const H=histInfo(S.rd||56),d=today();
    if(id==='servees'){
      const rows=[['الاسم','الفصل','التليفون','اجتماعات','حاضر','غايب','نسبة الحضور %','غياب متتالي','آخر حضور']];
      S.servees.filter(x=>x.active&&x.class_id&&(!S.rc||x.class_id===S.rc)).forEach(x=>{const t=servStat(x,H);rows.push([x.full_name,cname(x.class_id),x.phone||'',t.sessions,t.present,t.absent,t.pct===null?'':t.pct,t.streak,t.last||''])});
      dl('attendance-servees-'+d+'.csv',rows);
    }else{
      const d0=new Date(Date.now()-(S.rd||56)*864e5).toISOString().slice(0,10),rows=[['الخادم','حاضر','غايب','معتذر','نسبة الحضور %']];
      servList().forEach(p=>{const r=S.sa.filter(x=>x.servant_id===p.id&&x.att_date>=d0),pr=r.filter(x=>x.status==='present').length;rows.push([p.full_name||'',pr,r.filter(x=>x.status==='absent').length,r.filter(x=>x.status==='excused').length,r.length?Math.round(pr*100/r.length):''])});
      dl('attendance-servants-'+d+'.csv',rows);
    }
    return;
  }
  if(a==='outAll'){if(!confirm('تسجيل الخروج من كل الأجهزة (بما فيها دي)؟'))return;await sb.auth.signOut({scope:'global'});return location.reload()}
  if(a==='pushOn'){await pushEnable();S.pushSt=await pushState();return paint()}
  if(a==='pushOff'){await pushDisable();S.pushSt=await pushState();return paint()}
  if(a==='bell'){S.pushSt=await pushState();await loadNotifs();if(S.p.role==='parent')S.pbell=!S.pbell;else S.tab='notif';return paint()}
  if(a==='readAll'){const r=await sb.from('notifications').update({is_read:true}).eq('user_id',S.p.id).eq('is_read',false);if(!ok(r))return;await loadNotifs();return paint()}
  if(a==='readN'){const r=await sb.from('notifications').update({is_read:true}).eq('id',id);if(!ok(r))return;await loadNotifs();return paint()}
  if(a==='annSend'){
    const sc=v('asc'),title=v('at'),body=document.getElementById('ab').value.trim(),cl=sc==='class'?v('acl'):null,sec=(sc==='section'&&isAdmin())?v('asec'):null;
    if(!title)return toast('اكتب عنوان الإعلان');
    if(sc==='class'&&!cl)return toast('اختار الفصل');
    if(sc==='section'&&isAdmin()&&!sec)return toast('اختار القسم');
    if(!confirm('إرسال الإعلان دلوقتي؟'))return;
    const {data,error}=await sb.rpc('kh_announce',{p_title:title,p_body:body||null,p_scope:sc,p_class:cl,p_section:sec});
    if(error)return toast(error.message==='FORBIDDEN'?'مش مسموح لك بالإرسال ده':rpcErr(error));
    toast('اتبعت لـ '+data+' شخص');await loadAnn();return render();
  }
  if(a==='msgSend'){
    const au=v('sm_au'),title=v('sm_t'),body=document.getElementById('sm_b').value.trim();
    if(!body)return toast('اكتب نص الرسالة');
    let fn,args;
    if(au==='secs'){
      const tg=v('sm_st'),us=tg==='selected'?[...document.querySelectorAll('.smsec:checked')].map(x=>x.value):S.profiles.filter(p=>p.role==='secretary'&&p.active).map(p=>p.id);
      if(!us.length)return toast(tg==='selected'?'اختار أمين واحد على الأقل':'مفيش أمناء خدمة');
      fn='kh_msg_servants';args={p_title:title||null,p_body:body,p_target:'selected',p_class:null,p_users:us,p_section:null};
    }else if(au==='servants'){
      const tg=v('sm_tg'),cl=tg==='class'?v('sm_cl'):null,us=tg==='selected'?[...document.querySelectorAll('.smchk:checked')].map(x=>x.value):null;
      if(tg==='class'&&!cl)return toast('اختار الفصل');
      if(tg==='selected'&&!us.length)return toast('اختار خادم واحد على الأقل');
      fn='kh_msg_servants';args={p_title:title||null,p_body:body,p_target:tg,p_class:cl,p_users:us,p_section:(isAdmin()&&S.sec)||null};
    }else{
      const tg=v('sm_pt'),cl=tg==='class'?v('sm_pcl'):null,sv=tg==='servee'?v('sm_ps'):null,us=tg==='one'?v('sm_pu'):null;
      if(tg==='class'&&!cl)return toast('اختار الفصل');
      if(tg==='servee'&&!sv)return toast('اختار المخدوم');
      if(tg==='one'&&!us)return toast('اختار ولي الأمر');
      fn='kh_msg_parents';args={p_title:title||null,p_body:body,p_target:tg,p_class:cl,p_servee:sv,p_user:us,p_section:(isAdmin()&&S.sec)||null};
    }
    if(!confirm('إرسال الرسالة دلوقتي؟'))return;
    const {data,error}=await sb.rpc(fn,args);
    if(error)return toast(MSGERR[error.message]||('حصل خطأ: '+error.message));
    toast('اتبعتت لـ '+data+(au==='parents'?' ولي أمر':au==='secs'?' أمين':' خادم'));S.msgOpen=null;await loadMsg();return render();
  }
  if(a==='msgOpen'){
    if(S.msgOpen===id){S.msgOpen=null;return render()}
    const r=await sb.rpc('kh_msg_status',{p_msg:id});
    if(r.error)return toast('تعذّر تحميل التفاصيل: '+r.error.message);
    S.msgOpen=id;S.msgSt=r.data||[];return render();
  }
  if(a==='tplPrev'){
    const el=document.getElementById('tp_pv_'+id);
    const vars={name:'كيرلس عادل',servee:'مريم جورج',class:'أولى',age:'13'};
    el.textContent='معاينة:\n'+tplRender(document.getElementById('tp_t_'+id).value,vars)+'\n'+tplRender(document.getElementById('tp_b_'+id).value,vars);return;
  }
  if(a==='tplSave'){
    const en=document.getElementById('tp_en_'+id),row={title:v('tp_t_'+id),body:document.getElementById('tp_b_'+id).value};
    if(!row.title)return toast('اكتب العنوان');
    if(en)row.enabled=en.checked;
    if(ok(await sb.from('message_templates').update(row).eq('key',id))){toast('اتحفظت');await loadTpl();return render()}
    return;
  }
  if(a==='tplReset'){
    const t=tplOf(id);if(!t||!confirm('ترجّع النص الافتراضي؟ التعديلات هتتمسح.'))return;
    if(ok(await sb.from('message_templates').update({title:t.default_title,body:t.default_body}).eq('key',id))){toast('اترجّع الافتراضي');await loadTpl();return render()}
    return;
  }
  if(a==='compAdd'){
    if(!v('mt'))return toast('اكتب اسم المسابقة');if(!v('mc'))return toast('اختار الفصل');
    if(v('me')&&v('me')<v('ms'))return toast('تاريخ النهاية قبل البداية');
    const r=await sb.from('competitions').insert({title:v('mt'),class_id:v('mc'),starts_on:v('ms')||today(),ends_on:v('me')||null});
    if(!ok(r))return;await loadComp();render();return toast('اتضافت');
  }
  if(a==='compDel'){const c=S.cmp.find(x=>x.id===id);if(!c||!(isAdmin()||(isSec()&&c.class_id)))return;if(!confirm('حذف المسابقة «'+c.title+'» ونقاطها؟'))return;const r=await sb.from('competitions').delete().eq('id',id);if(!ok(r))return;S.pc='';await loadComp();return render()}
  if(a==='givePts'){
    const c=S.cmp.find(x=>x.id===S.pc)||S.cmp.filter(x=>!x.ends_on||x.ends_on>=today())[0]||S.cmp[0];
    if(!c)return;if(!v('pcs'))return toast('اختار المخدوم');
    const r=await sb.from('points').insert({servee_id:v('pcs'),competition_id:c.id,points:parseInt(v('pv'),10),reason:v('pr')||null});
    if(r.error)return toast(rpcErr(r.error));
    S.pc=c.id;await loadComp();render();return toast('اتسجّلت');
  }
  if(a==='ptDel'){if(!canManage()||!confirm('حذف عملية النقاط دي؟'))return;const r=await sb.from('points').delete().eq('id',id);if(!ok(r))return;await loadComp();return render()}
  if(a==='smark'){
    const[uid,st]=id.split('|'),cur=(S.sa.find(x=>x.servant_id===uid&&x.att_date===S.date)||{}).status;
    const r=cur===st?await sb.from('servant_attendance').delete().eq('servant_id',uid).eq('att_date',S.date):await sb.from('servant_attendance').upsert({servant_id:uid,att_date:S.date,status:st},{onConflict:'servant_id,att_date'});
    if(!ok(r))return;await loadExtra();return render();
  }
  if(a==='satRest'){
    if(!confirm('تسجيل كل اللي لسه ما اتحضروش كغايبين؟'))return;
    const done=new Set(S.sa.filter(x=>x.att_date===S.date).map(x=>x.servant_id));
    const rows=servList().filter(p=>!done.has(p.id)).map(p=>({servant_id:p.id,att_date:S.date,status:'absent'}));
    if(!rows.length)return toast('الكل متسجّل');
    const r=await sb.from('servant_attendance').upsert(rows,{onConflict:'servant_id,att_date'});
    if(!ok(r))return;await loadExtra();render();return toast('اتسجّل غياب '+rows.length+' خادم');
  }
  if(a==='prepSave'){
    const cid=acid();if(!cid)return;
    if(!v('pt'))return toast('اكتب موضوع الدرس');
    const r=await sb.from('lesson_prep').upsert({class_id:cid,prep_date:S.pd,topic:v('pt'),notes:document.getElementById('pn').value.trim()||null,status:v('ps')},{onConflict:'class_id,prep_date'});
    if(!ok(r))return;await loadExtra();render();return toast('تم الحفظ');
  }
  if(a==='prepOpen'){S.pd=id;render();return window.scrollTo(0,0)}
  if(a==='prepApp'){
    const p=S.lp.find(x=>x.id===id);if(!p)return;
    const r=await sb.from('lesson_prep').update({approved:!p.approved}).eq('id',id);
    if(!ok(r))return;await loadExtra();return render();
  }
  if(a==='srvEdit'){S.sed=id;S.sso=id;render();return window.scrollTo(0,0)}
  if(a==='srvCancel'){S.sed=null;return render()}
  if(a==='srvSave'){
    const n=v('xn');if(!n)return toast('اكتب اسم الخادم');
    const cp=v('xp'),np=cp?normPhone(cp):null;if(cp&&!np)return toast('رقم التواصل مش صحيح');
    const r=await sb.from('profiles').update({full_name:n,contact_phone:np,birth_date:v('xb')||null,address:v('xa')||null,notes:v('xo')||null}).eq('id',S.sed);
    if(!ok(r))return;S.sed=null;await load();render();return toast('تم الحفظ');
  }
  if(a==='classOpen'){S.cso=S.cso===id?null:id;return render()}
  if(a==='srvOpen'){S.sso=S.sso===id?null:id;return render()}
  if(a==='sec'){
    if(!isAdmin()||S.sec===id)return;
    S.sec=id;try{localStorage.setItem('khedma_sec',id)}catch(_){}
    S.f='';S.rc='';S.ac=null;S.sfc='';S.ssec='';S.sf='';S.ed=null;S.edc=null;S.sed=null;S.sso=null;S.pf=null;S.pfPar=null;S.fuf=null;S.cards=null;S.lim=50;
    await load();if(S.cmp!==null)await loadComp();if(S.an!==null)await loadAnn();
    render();return toast(id==='boys'?'خدمة بنين':id==='girls'?'خدمة بنات':'الكل: بنين وبنات');
  }
  if(a==='pf')return openProfile(id);
  if(a==='pfBack'){S.pf=null;S.pfPar=null;S.fuf=null;return render()}
  run(a,id);
});
app.addEventListener('change',async e=>{
  const b=e.target.closest('[data-a]');if(!b)return;
  if(b.dataset.a==='newrole'){
    document.getElementById('uc').style.display=b.value==='servant'?'':'none';
    document.getElementById('usc').style.display=b.value==='secretary'?'':'none';
    document.getElementById('ue').style.display=b.value==='parent'?'':'none';return;
  }
  if(b.dataset.a==='invrole'){document.getElementById('isec').style.display=b.value==='secretary'?'':'none';document.getElementById('icl').style.display=b.value==='servant'?'':'none';return}
  if(b.dataset.a==='attClass'){S.ac=b.value;if(['mycls','mypr'].includes(S.tab))await loadMates();return render()}
  if(b.dataset.a==='satDate'){S.date=b.value||today();await loadAtt();return render()}
  if(b.dataset.a==='prepDate'){S.pd=b.value||today();return render()}
  if(b.dataset.a==='attDate'){S.date=b.value||today();await loadAtt();return render()}
  if(b.dataset.a==='filter'){S.f=b.value;S.lim=50;return render()}
  if(b.dataset.a==='annscope'){const x=b.value;const w=document.getElementById('ascw'),c=document.getElementById('aclw');if(w)w.style.display=(x==='section'&&isAdmin())?'block':'none';if(c)c.style.display=x==='class'?'block':'none';return}
  if(b.dataset.a==='msgau'){const x=b.value,sv=document.getElementById('sm_sv'),pa=document.getElementById('sm_pa'),bd=document.getElementById('sm_b'),ti=document.getElementById('sm_t');sv.style.display=x==='servants'?'block':'none';pa.style.display=x==='parents'?'block':'none';const se=document.getElementById('sm_se');if(se)se.style.display=x==='secs'?'block':'none';const t=tplOf(x==='parents'?'parent_msg':'servant_msg'),o=tplOf(x==='parents'?'servant_msg':'parent_msg');if(t&&(!bd.value.trim()||(o&&bd.value===o.body))){bd.value=t.body;ti.value=t.title}return}
  if(b.dataset.a==='msgst'){const w=document.getElementById('sm_sew');if(w)w.style.display=b.value==='selected'?'block':'none';return}
  if(b.dataset.a==='msgtgt'){const x=b.value,c=document.getElementById('sm_cw'),w=document.getElementById('sm_sw');if(c)c.style.display=x==='class'?'block':'none';if(w)w.style.display=x==='selected'?'block':'none';return}
  if(b.dataset.a==='msgpt'){const x=b.value;for(const [k,id] of [['class','sm_pcw'],['servee','sm_psw'],['one','sm_puw']]){const e=document.getElementById(id);if(e)e.style.display=x===k?'block':'none'}return}
  if(b.dataset.a==='pstf'){S.pstR=b.value;return render()}
  if(b.dataset.a==='psts'){S.pstS=b.value;return render()}
  if(b.dataset.a==='pc'){S.pc=b.value;return render()}
  if(b.dataset.a==='th'){S.th=+b.value;return render()}
  if(b.dataset.a==='rc'){S.rc=b.value;return render()}
  if(b.dataset.a==='rd'){S.rd=+b.value;return render()}
  if(b.dataset.a==='srvfc'){S.sfc=b.value;return render()}
  if(b.dataset.a==='srvsec'){S.ssec=b.value;return render()}
  if(b.dataset.a==='stfilter'){S.st=b.value;S.lim=50;return render()}
  if(b.dataset.a==='auditf'){S.af=b.value;return render()}
  if(b.dataset.a==='csvPick'){
    const f=b.files&&b.files[0],cid=document.getElementById('icl2').value;
    if(!f)return;if(!cid){b.value='';return toast('اختار الفصل الأول')}
    const t=await f.text(),m=buildImport(t,cid);b.value='';
    if(!m)return toast('الملف فاضي أو مش مقروء');
    S.imp=m;return render();
  }
  if(b.dataset.a==='sfilter'){S.sf=b.value;S.f='';S.lim=50;return render()}
  if(b.dataset.a==='role'){
    if(b.dataset.id===S.p.id&&b.value!=='admin'&&!confirm('هتشيل الأدمن من حسابك. متأكد؟'))return render();
    let upd={role:b.value};
    if(b.value==='secretary'){const t=(prompt('قسم أمين الخدمة؟ اكتب: بنين أو بنات')||'').trim();const m={'بنين':'boys','بنات':'girls'}[t];if(!m){toast('لازم تحدد القسم (بنين أو بنات)');return render()}upd.section=m}
    if(!ok(await sb.from('profiles').update(upd).eq('id',b.dataset.id)))return;
    await load();render();toast('تم');
  }
});
document.getElementById('pf').addEventListener('change',async e=>{
  const f=e.target.files[0];e.target.value='';if(!f||!S.pu)return;
  toast('بنرفع الصورة...');
  try{
    const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(f)});
    const z=400,cv=document.createElement('canvas');cv.width=cv.height=z;const m=Math.min(im.width,im.height);
    cv.getContext('2d').drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,z,z);
    const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.85)),path=S.pu+'.jpg';
    let r=await sb.storage.from('servee-photos').upload(path,blob,{upsert:true,contentType:'image/jpeg'});
    if(!ok(r))return;
    r=await sb.from('servees').update({photo_path:path}).eq('id',S.pu);if(!ok(r))return;
    await load();render();toast('تم رفع الصورة');
  }catch(_){toast('الصورة دي مش مقبولة، جرّب صورة تانية')}
});
app.addEventListener('input',e=>{
  const b=e.target;if(b&&b.dataset&&b.dataset.a==='msgfind'){const q=nz(b.value);document.querySelectorAll('.smlbl').forEach(l=>l.style.display=(!q||l.dataset.n.includes(q))?'flex':'none');return}
  if(b&&b.dataset&&b.dataset.a==='srvsearch'){clearTimeout(S.qt);S.qt=setTimeout(()=>{S.sq=b.value;const l=document.getElementById('srl');if(l)l.innerHTML=srvList()},150);return}
  if(!b||!b.dataset||b.dataset.a!=='search')return;
  clearTimeout(S.qt);S.qt=setTimeout(()=>{S.q=b.value;S.lim=50;const l=document.getElementById('sl');if(l)l.innerHTML=svList()},150);
});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
// إشعارات فاتت وإنت قافل التطبيق أو النت كان قاطع: بتتحمّل أول ما ترجع، وبتوصل لحظيًا وإنت فاتح
let _live=null,_liveUid=null,_busy=false,_rt=false;
async function catchUp(){
  if(!S.p||_busy)return;_busy=true;
  try{
    if(S.nt==null){await loadNotifs();return}
    const seen=new Set(S.nt.map(x=>x.id));
    await loadNotifs();
    const fresh=S.nt.filter(x=>!x.is_read&&!seen.has(x.id));
    if(fresh.length){
      const f=fresh[0];
      toast(fresh.length===1?'🔔 '+f.title:'🔔 عندك '+fresh.length+' إشعارات جديدة');
      if(navigator.vibrate)navigator.vibrate(80);
      if(document.hidden&&'Notification' in window&&Notification.permission==='granted'&&await pushState()!=='on'){
        try{const reg=await navigator.serviceWorker.ready;reg.showNotification(f.title||'خدمة إعدادي',{body:String(f.body||'').slice(0,200),icon:'icon-192.png',dir:'rtl',lang:'ar',tag:'nt-'+f.id})}catch(_){}
      }
    }
    const hd=document.querySelector('header');
    if(hd){const t=document.createElement('div');t.innerHTML=head();if(t.firstElementChild)hd.replaceWith(t.firstElementChild)}
    if(S.tab==='notif'||S.pbell)paint();
  }catch(_){}finally{_busy=false}
}
function startLive(){
  if(!S.p||_liveUid===S.p.id)return;
  try{
    if(_live)sb.removeChannel(_live);
    _liveUid=S.p.id;_rt=false;
    _live=sb.channel('nt-'+S.p.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+S.p.id},()=>catchUp()).subscribe(st=>{_rt=st==='SUBSCRIBED'});
  }catch(_){_liveUid=null}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.p){catchUp();startLive()}});
window.addEventListener('online',()=>{if(S.p){catchUp();startLive()}});
window.addEventListener('focus',()=>{if(S.p)catchUp()});
setInterval(()=>{if(S.p&&!document.hidden)startLive()},20000);
// لو الاتصال اللحظي مش شغّال لأي سبب، نفحص كل دقيقة
setInterval(()=>{if(S.p&&!_rt)catchUp()},60000);

boot();
