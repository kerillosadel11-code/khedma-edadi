/* إضافات الدفعة التانية: تقرير الاجتماع · لوحة الشرف ونقاط الحضور المنتظم · الفعاليات · تقييم الفصل
   · حضور الخدام بـ QR · طباعة ملف المخدوم.
   ملف مستقل بيتحمّل بعد app.js (زي finance.js) ومحتاج SQL ملف 24. */
(function(){
const X={rep:{date:'',text:'',busy:false},hon:{month:'',data:null,busy:false},
  evt:{list:null,rs:[],open:null,form:false,busy:false},
  rev:{month:'',cls:'',rows:null,busy:false},
  par:{ev:[],rs:[],sp:{}},myqr:undefined,uid:null,q:''};
const val=id=>{const e=document.getElementById(id);return e?e.value.trim():''};
const isStaff=()=>!!S.p&&(S.p.role==='admin'||S.p.role==='secretary');
const isSrvr=()=>!!S.p&&S.p.role==='servant';
const EXT={xrep:'تقرير الاجتماع',xhon:'لوحة الشرف',xevt:'الفعاليات',xrev:'تقييم الفصل'};
const EXI={xrep:'📋',xhon:'🏅',xevt:'🎉',xrev:'📝'};
const avail=()=>isStaff()?['xrep','xhon','xevt','xrev']:isSrvr()?['xhon','xevt','xrev']:[];
const KIND={trip:'رحلة',retreat:'خلوة',conference:'مؤتمر',other:'أخرى'};
const mNow=()=>today().slice(0,7);
const rp=()=>window.render();
const secOf=x=>(S.classes.find(c=>c.id===x.class_id)||{}).section||x.section||'';
const inScope=(e,x)=>e.scope==='all'||(e.scope==='section'&&secOf(x)===e.section)||(e.scope==='class'&&x.class_id===e.class_id);
const scopeLbl=e=>e.scope==='all'?'كل الخدمة':e.scope==='section'?'خدمة '+(SEC[e.section]||''):cname(e.class_id);
const tm=t=>{try{return ftime(t)}catch(_){return t}};
const fail=(e,def)=>toast(e&&e.message?e.message:def||'حصل خطأ');
const busyBtn=(b,on)=>{if(b)b.disabled=!!on};

/* ================= تقرير الاجتماع ================= */
const latestAtt=()=>(S.ah||[]).reduce((m,r)=>r.att_date>m?r.att_date:m,'')||today();
function vRep(){
  const R=X.rep;if(!R.date)R.date=latestAtt();
  return `<div class="card"><h2>تقرير الاجتماع</h2>
  <p class="empty" style="padding:0 0 8px">نسبة حضور كل فصل، مين غاب 3 اجتماعات أو أكتر، ومين اتفتقد ومين لسه. التقرير ده بيوصلك كإشعار تلقائي بعد كل اجتماع كمان.</p>
  <input type="date" id="x_rd" value="${esc(R.date)}" max="${today()}">
  <button class="p" data-x="repGo"${R.busy?' disabled':''}>${R.busy?'جاري التجهيز...':'اعمل التقرير'}</button></div>
  ${R.text?`<div class="card"><pre style="white-space:pre-wrap;word-break:break-word;font-family:inherit;margin:0 0 10px;line-height:1.8">${esc(R.text)}</pre>
  <div class="acts" style="justify-content:flex-start"><a class="s on" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block" href="https://wa.me/?text=${encodeURIComponent(R.text)}">إرسال واتساب</a><button class="s" data-x="repCopy">نسخ</button></div></div>`:''}`;
}

/* ================= لوحة الشرف ================= */
async function loadHon(){
  const H=X.hon;if(H.busy)return;H.busy=true;if(!H.month)H.month=mNow();
  const r=await sb.rpc('kh_honor_board',{p_month:H.month+'-01'});
  H.busy=false;H.data=r.error?[]:(r.data||[]);if(r.error)fail(r.error,'تعذّر تحميل لوحة الشرف');
  if(S.tab==='xhon')rp();
}
function vHon(){
  const H=X.hon;if(!H.month)H.month=mNow();
  if(H.data===null&&!H.busy)loadHon();
  const medal=['🥇','🥈','🥉'];
  const rows=(H.data||[]).map((c,i)=>`<div class="row" style="align-items:flex-start"><div><b>${i+1}. ${esc(c.class_name)}</b>
    <small>${c.att_pct===null?'مفيش اجتماعات الشهر ده':'حضور '+c.att_pct+'% · '+c.meetings+' اجتماع · '+c.members+' مخدوم'}</small>
    ${(c.top||[]).map((t,j)=>`<small>${medal[j]||''} ${esc(t.name)} · ${t.pts} نقطة</small>`).join('')||'<small>لسه مفيش نقاط</small>'}</div>
    <div style="width:35%;text-align:left">${c.att_pct===null?'—':c.att_pct+'%'}${typeof bar==='function'?bar(c.att_pct):''}</div></div>`).join('');
  return `<div class="card"><h2>لوحة الشرف</h2><input type="month" id="x_hm" data-x="honMonth" value="${esc(H.month)}" max="${mNow()}">
  <p class="empty" style="padding:6px 0 0">الفصول مترتبة بنسبة الحضور. نقاط الأولاد: كل حضور = نقطة، وكل 4 حضور ورا بعض = +5 مكافأة.</p></div>
  <div class="card"><h2>ترتيب الفصول</h2>${H.data===null?'<div class="empty">جاري التحميل...</div>':rows||'<div class="empty">مفيش فصول.</div>'}</div>`;
}

/* ================= الفعاليات ================= */
async function loadEvt(){
  const E=X.evt;if(E.busy)return;E.busy=true;
  const d0=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
  const r=await sb.from('events').select('*').gte('event_date',d0).order('event_date');
  E.list=r.error?[]:(r.data||[]);if(r.error)fail(r.error,'تعذّر تحميل الفعاليات');
  const ids=E.list.map(e=>e.id);
  if(ids.length){const q=await sb.from('event_rsvps').select('*').in('event_id',ids);E.rs=q.error?[]:(q.data||[])}else E.rs=[];
  E.busy=false;if(S.tab==='xevt')rp();
}
const rsvBtns=(ev,x,rs)=>{const cur=(rs.find(r=>r.event_id===ev.id&&r.servee_id===x.id)||{}).status;
  return `<button class="s ${cur==='going'?'on':''}" data-x="rsv" data-id="${ev.id}|${x.id}|going">جاي</button><button class="s ${cur==='not_going'?'on bad':''}" data-x="rsv" data-id="${ev.id}|${x.id}|not_going">مش جاي</button>`};
function evForm(){
  if(!isStaff())return '';
  if(!X.evt.form)return `<div class="card"><button class="p" data-x="evNew">+ فعالية جديدة</button></div>`;
  const adm=isAdmin();
  return `<div class="card" style="border-color:var(--gold)"><h2>فعالية جديدة</h2>
  <input id="x_et" placeholder="اسم الفعالية (مثلاً: رحلة وادي الريان)">
  <div class="two"><select id="x_ek">${Object.entries(KIND).map(([k,n])=>`<option value="${k}">${n}</option>`).join('')}</select><input id="x_ed" type="date" min="${today()}"></div>
  <div class="two"><input id="x_etm" type="time" aria-label="الميعاد"><input id="x_ep" placeholder="المكان"></div>
  <select id="x_es"><option value="class">لفصل واحد</option><option value="section">لكل القسم</option>${adm?'<option value="all">لكل الخدمة (بنين وبنات)</option>':''}</select>
  <select id="x_ec"><option value="">الفصل (لو اخترت «لفصل واحد»)</option>${opts(S.classes,cLabel)}</select>
  ${adm?`<select id="x_esec"><option value="">القسم (لو اخترت «لكل القسم»)</option><option value="boys">بنين</option><option value="girls">بنات</option></select>`:''}
  <textarea id="x_en" rows="2" placeholder="تفاصيل (المطلوب، الفلوس، ميعاد الرجوع...)"></textarea>
  <button class="p" data-x="evSave">حفظ وإرسال إشعار للأهالي</button><button class="s" data-x="evCancel" style="margin-top:8px">إلغاء</button></div>`;
}
function vEvt(){
  const E=X.evt;if(E.list===null&&!E.busy)loadEvt();
  if(E.list===null)return '<div class="card"><div class="empty">جاري التحميل...</div></div>';
  const td=today(),up=E.list.filter(e=>e.event_date>=td),past=E.list.filter(e=>e.event_date<td).reverse();
  const card=e=>{
    const tg=S.servees.filter(x=>x.active&&x.class_id&&inScope(e,x)),
      go=tg.filter(x=>E.rs.some(r=>r.event_id===e.id&&r.servee_id===x.id&&r.status==='going')).length,
      no=tg.filter(x=>E.rs.some(r=>r.event_id===e.id&&r.servee_id===x.id&&r.status==='not_going')).length,
      open=E.open===e.id,canDel=isStaff();
    return `<div class="card"><h2>${esc(e.title)} <span class="bd">${KIND[e.kind]||''}</span></h2>
    <div class="cnt" style="flex-direction:column;gap:2px"><span>${fdate(e.event_date)}${e.event_time?' · '+tm(e.event_time):''}</span>${e.place?`<span>المكان: ${esc(e.place)}</span>`:''}<span>لـ ${esc(scopeLbl(e))}</span>${e.note?`<span>${esc(e.note)}</span>`:''}</div>
    <div class="cnt"><span>جاي ${go}</span><span>مش جاي ${no}</span><span>لسه ما ردّش ${tg.length-go-no}</span></div>
    <div class="acts" style="justify-content:flex-start"><button class="s${open?' on':''}" data-x="evOpen" data-id="${e.id}">${open?'إخفاء الأسماء':'مين جاي'}</button>${canDel?`<button class="s d" data-x="evDel" data-id="${e.id}">حذف</button>`:''}</div>
    ${open?(tg.map(x=>`<div class="row"><div class="who">${av(x,36)}<div>${esc(x.full_name)}<small>${esc(cname(x.class_id))}</small></div></div><div class="acts">${rsvBtns(e,x,E.rs)}</div></div>`).join('')||'<div class="empty">مفيش مخدومين في النطاق ده.</div>'):''}</div>`};
  return evForm()+(up.map(card).join('')||'<div class="card"><div class="empty">مفيش فعاليات جاية.</div></div>')
    +(past.length?`<div class="card"><h2>فاتت (آخر 30 يوم)</h2>${past.map(e=>`<div class="row"><div>${esc(e.title)}<small>${fdate(e.event_date)} · ${esc(scopeLbl(e))}</small></div></div>`).join('')}</div>`:'');
}

/* ================= تقييم الفصل ================= */
async function loadRev(){
  const R=X.rev;if(R.busy)return;R.busy=true;if(!R.month)R.month=mNow();
  const r=await sb.from('class_reviews').select('*').eq('month',R.month+'-01');
  R.rows=r.error?[]:(r.data||[]);if(r.error)fail(r.error,'تعذّر تحميل التقييمات (شغّل ملف 24؟)');
  R.busy=false;if(S.tab==='xrev')rp();
}
function vRev(){
  const R=X.rev;if(!R.month)R.month=mNow();
  if(!S.classes.length)return '<div class="card"><div class="empty">مفيش فصل مربوط بيك لسه.</div></div>';
  if(!R.cls||!S.classes.some(c=>c.id===R.cls))R.cls=S.classes[0].id;
  if(R.rows===null&&!R.busy)loadRev();
  const cur=(R.rows||[]).find(r=>r.class_id===R.cls)||{},st=isStaff();
  const form=`<div class="card"><h2>تقييم الفصل</h2>
  <div class="two"><input type="month" id="x_rm" data-x="revMonth" value="${esc(R.month)}" max="${mNow()}"><select id="x_rc" data-x="revCls">${opts(S.classes,cLabel,R.cls)}</select></div>
  ${cur.reviewed?'<p class="empty" style="padding:4px 0">✓ اتراجع من الأمين/أبونا. أي تعديل هيلغي المراجعة.</p>':''}
  <label style="display:block;font-weight:600;margin:8px 0 4px">إيه اللي اتحسن الشهر ده؟</label><textarea id="x_ri" rows="3">${esc(cur.improved||'')}</textarea>
  <label style="display:block;font-weight:600;margin:8px 0 4px">مين محتاج متابعة؟</label><textarea id="x_rn" rows="3">${esc(cur.needs_followup||'')}</textarea>
  <label style="display:block;font-weight:600;margin:8px 0 4px">ملاحظات تانية</label><textarea id="x_ro" rows="2">${esc(cur.notes||'')}</textarea>
  <button class="p" data-x="revSave">حفظ التقييم</button>
  ${st&&cur.id?`<button class="s${cur.reviewed?' on':''}" data-x="revMark" data-id="${cur.id}" style="margin-top:8px">${cur.reviewed?'إلغاء المراجعة':'تمت المراجعة'}</button>`:''}</div>`;
  const list=st?`<div class="card"><h2>حالة الفصول (${esc(R.month)})</h2>${S.classes.map(c=>{const r=(R.rows||[]).find(x=>x.class_id===c.id);
    return `<div class="row"><div>${esc(cLabel(c))}<small>${r?(r.reviewed?'✓ اتراجع':'اتكتب · مستني مراجعتك'):'لسه ما اتكتبش'}</small></div><div class="acts"><button class="s${c.id===R.cls?' on':''}" data-x="revSel" data-id="${c.id}">فتح</button></div></div>`}).join('')}</div>`:'';
  return form+list;
}

/* ================= حضور الخدام بـ QR ================= */
const qrData=t=>{const q=qrcode(0,'M');q.addData(t);q.make();return q.createDataURL(6,4)};
async function ensureQr(){
  if(X.myqr!==undefined)return;X.myqr=null;
  const r=await sb.rpc('kh_my_qr');
  if(r.error){X.myqr='';return}X.myqr=r.data||'';if(S.tab==='sat')rp();
}
function myQrCard(){
  ensureQr();
  if(!X.myqr)return X.myqr===''?'':'<div class="card"><div class="empty">جاري تجهيز الكود...</div></div>';
  return `<div class="card" style="text-align:center"><h2>كود حضوري</h2><img src="${qrData('KS:'+X.myqr)}" alt="QR" style="width:200px;height:200px;max-width:70%"><p class="empty" style="padding:6px 0 0">اعرض الكود ده على الأمين أو أبونا لما توصل الاجتماع، وهو هيمسحه ويتسجّل حضورك.</p></div>`;
}
function scanCard(){return `<div class="card"><button class="p" data-x="xscan">📷 مسح كود خادم</button></div>`}
let sStream=null,sOn=false,sBusy=false,sLast='',sAt=0;
async function openXScan(){
  if(document.getElementById('xscan'))return;
  const o=document.createElement('div');o.id='xscan';o.style.cssText='position:fixed;inset:0;background:#000;z-index:60;display:flex;flex-direction:column';
  o.innerHTML='<video id="xsv" playsinline muted style="flex:1;width:100%;object-fit:cover;min-height:0"></video><canvas id="xsc" hidden></canvas><div id="xsr" style="background:#fff;padding:14px;text-align:center"><p class="empty">وجّه الكاميرا على كود الخادم.</p><button class="p" data-x="xscanClose">إغلاق</button></div>';
  document.body.appendChild(o);
  try{sStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}
  catch(_){closeXScan();return toast('مقدرتش أفتح الكاميرا. اسمح بالكاميرا من إعدادات المتصفح.')}
  const vd=document.getElementById('xsv');vd.srcObject=sStream;await vd.play();sOn=true;xtick();
}
async function closeXScan(){
  sOn=false;if(sStream)sStream.getTracks().forEach(t=>t.stop());sStream=null;
  const o=document.getElementById('xscan');if(o)o.remove();
  try{await loadExtra()}catch(_){}rp();
}
function xtick(){
  if(!sOn)return;
  const vd=document.getElementById('xsv'),cv=document.getElementById('xsc');
  if(vd&&cv&&vd.readyState===4&&!sBusy){
    const w=480,h=Math.round(w*vd.videoHeight/vd.videoWidth);cv.width=w;cv.height=h;
    const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(vd,0,0,w,h);
    const q=jsQR(cx.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'dontInvert'});
    if(q&&q.data&&(q.data!==sLast||Date.now()-sAt>4000)){sLast=q.data;sAt=Date.now();onXScan(q.data)}
  }
  requestAnimationFrame(xtick);
}
async function onXScan(code){
  sBusy=true;const res=document.getElementById('xsr');if(!res){sBusy=false;return}
  const btn='<button class="p" data-x="xscanClose">إغلاق</button>';
  if(!code.startsWith('KS:')){res.innerHTML=`<p class="err" style="font-weight:700">ده مش كود خادم. كروت المخدومين بتتمسح من «حضور المخدومين».</p>${btn}`;sBusy=false;return}
  const {data,error}=await sb.rpc(isMs()?'kh_servant_mass_checkin':'kh_servant_checkin',{p_code:code.slice(3),p_date:S.date});
  if(error){
    const m={NOT_FOUND:'الكود ده مش معروف أو الحساب موقوف',FORBIDDEN:'الخادم ده مش من قسمك',BAD_DATE:'التاريخ ده في المستقبل'}[(error.message||'').trim()]||error.message;
    res.innerHTML=`<p class="err" style="font-weight:700">${esc(m)}</p>${btn}`;navigator.vibrate&&navigator.vibrate([80,60,80]);
  }else{
    res.innerHTML=`<p style="font-weight:700;font-size:18px;margin:0 0 6px">${esc(data.name)}</p><p style="color:#1b7a43;font-weight:700;margin:0 0 10px">${data.already?'متسجّل حاضر قبل كده':'✓ اتسجّل حضوره'}${isMs()?' (القداس)':''} · ${esc(fdate(S.date))}</p>${btn}`;
    navigator.vibrate&&navigator.vibrate(60);
  }
  sBusy=false;
}

/* ================= طباعة ملف المخدوم ================= */
async function printProfile(){
  const x=S.servees.find(y=>y.id===S.pf);if(!x)return;
  const H=histInfo(90),st=servStat(x,H),m=H.byS[x.id]||{},ds=[...(H.datesByC[x.class_id]||[])].sort().reverse().slice(0,16),
    fu=(S.fu||[]).filter(f=>f.servee_id===x.id),par=S.pfPar||[],sv=svServants(x).map(p=>p.full_name||'').filter(Boolean),
    pr=(S.pr||[]).filter(p=>p.servee_id===x.id),tot=pr.reduce((a,p)=>a+p.points,0);
  let sp=[];try{const r=await sb.from('streak_points').select('points,streak').eq('servee_id',x.id);sp=r.error?[]:(r.data||[])}catch(_){}
  const spTot=sp.reduce((a,p)=>a+p.points,0),best=sp.reduce((a,p)=>Math.max(a,p.streak),0);
  const age=x.birth_date?Math.floor((Date.now()-new Date(x.birth_date+'T00:00:00'))/31557600000):null;
  const FKn={call:'اتصال',visit:'زيارة',message:'رسالة',other:'أخرى'},FSn={open:'متابعة',done:'تم'};
  const R=(a,b)=>`<tr><td class="k">${a}</td><td>${b}</td></tr>`;
  const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ملف ${esc(x.full_name)}</title>
<style>body{font-family:'Noto Kufi Arabic',Tahoma,Arial,sans-serif;margin:24px;color:#17302b;line-height:1.7}h1{margin:0 0 4px;font-size:22px}h2{font-size:15px;border-bottom:2px solid #d9a441;padding-bottom:3px;margin:18px 0 6px}
table{border-collapse:collapse;width:100%}td{padding:4px 8px;border-bottom:1px solid #e3e9e4;vertical-align:top;font-size:13px}td.k{width:28%;color:#5d6f6a;font-weight:700}
.ch{display:inline-block;border:1px solid #ccc;border-radius:12px;padding:1px 8px;margin:2px;font-size:12px}.ok{background:#cfeedd}.no{background:#f3d6d2}
@media print{body{margin:10mm}button{display:none}}</style></head><body>
<button id="pbtn" style="float:left;padding:6px 14px">طباعة / حفظ PDF</button>
<h1>${esc(x.full_name)}</h1><div style="color:#5d6f6a">${esc(cname(x.class_id))}${SEC[x.section]?' · خدمة '+SEC[x.section]:''} · اتطبع ${new Date().toLocaleDateString('ar-EG')}</div>
<h2>البيانات</h2><table>
${R('التليفون',esc(x.phone||'—'))}${R('الميلاد',x.birth_date?esc(x.birth_date)+(age!==null&&age>=0?' ('+age+' سنة)':''):'—')}${R('العنوان',esc(x.address||'—'))}${R('ملاحظات',esc(x.notes||'—'))}
${R('الخادم المسؤول',esc(sv.join(' · ')||'—'))}
${R('ولي الأمر',par.length?par.map(q=>esc(q.name||'')+' '+esc(q.contact_phone||q.phone||'')).join('<br>'):'—')}</table>
<h2>الحضور (آخر 90 يوم)</h2>${st.sessions?`<div>حاضر ${st.present} · غايب ${st.absent} · نسبة الحضور ${st.pct}%${st.streak?' · غياب متتالي '+st.streak:''}${st.last?' · آخر حضور '+esc(fdate(st.last)):''}</div>
<div style="margin-top:6px">${ds.map(d=>`<span class="ch ${m[d]==='present'?'ok':'no'}">${m[d]==='present'?'✓':'✗'} ${d.slice(5)}</span>`).join('')}</div>`:'<div>لسه مفيش حضور متسجّل.</div>'}
<h2>النقاط</h2><div>نقاط المسابقات: ${tot} · نقاط الحضور المنتظم: ${spTot} · أطول حضور متتالي: ${best}</div>
<h2>الافتقاد وملاحظات الخدام (${fu.length})</h2>${fu.length?`<table>${fu.slice(0,20).map(f=>R(esc(f.followup_date||''),(FKn[f.kind]||'')+' · '+(FSn[f.status]||'')+(f.note?'<br>'+esc(f.note):''))).join('')}</table>`:'<div>لسه ما اتفتقدش.</div>'}
</body></html>`;
  const w=window.open('','_blank');
  if(!w)return toast('المتصفح منع النافذة. اسمح بالنوافذ المنبثقة وجرّب تاني.');
  w.document.open();w.document.write(html);w.document.close();{const pb=w.document.getElementById('pbtn');if(pb)pb.addEventListener('click',()=>w.print())}w.focus();setTimeout(()=>{try{w.print()}catch(_){}},500);
}

/* ================= واجهة المخدوم / ولي الأمر: النقاط والفعاليات ================= */
async function parentExtras(){
  X.par={ev:[],rs:[],sp:{}};
  const ids=(S.servees||[]).map(x=>x.id);if(!ids.length)return;
  try{
    const [e,s]=await Promise.all([sb.from('events').select('*').gte('event_date',today()).order('event_date'),sb.from('streak_points').select('servee_id,points,streak').in('servee_id',ids)]);
    X.par.ev=e.error?[]:(e.data||[]);
    (s.error?[]:(s.data||[])).forEach(r=>{const o=X.par.sp[r.servee_id]||(X.par.sp[r.servee_id]={pts:0,best:0});o.pts+=r.points;o.best=Math.max(o.best,r.streak)});
    if(X.par.ev.length){const q=await sb.from('event_rsvps').select('*').in('servee_id',ids);X.par.rs=q.error?[]:(q.data||[])}
  }catch(_){}
}
function parentCards(){
  if(!S.servees||!S.servees.length)return '';
  let h='';
  const spc=S.servees.filter(x=>X.par.sp[x.id]);
  if(spc.length)h+=`<div class="card"><h2>نقاط الحضور المنتظم</h2>${spc.map(x=>{const o=X.par.sp[x.id];return `<div class="row"><div>${S.servees.length>1?esc(x.full_name):'نقاطك'}<small>أطول حضور متتالي: ${o.best} اجتماع</small></div><b>${o.pts} نقطة</b></div>`}).join('')}<p class="empty" style="padding:6px 0 0">كل حضور = نقطة، وكل 4 حضور ورا بعض = +5 مكافأة.</p></div>`;
  const evs=X.par.ev.filter(e=>S.servees.some(x=>inScope(e,x)));
  if(evs.length)h+=`<div class="card"><h2>الفعاليات والرحلات</h2>${evs.map(e=>{
    const kids=S.servees.filter(x=>inScope(e,x));
    return `<div class="row" style="align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:60%"><b>${esc(e.title)}</b> <span class="bd">${KIND[e.kind]||''}</span>
      <small>${fdate(e.event_date)}${e.event_time?' · '+tm(e.event_time):''}${e.place?' · '+esc(e.place):''}</small>${e.note?`<small>${esc(e.note)}</small>`:''}</div>
      <div style="width:100%">${kids.map(x=>`<div class="row" style="border:0;padding:4px 0"><div>${kids.length>1?esc(x.full_name):'هتيجي؟'}</div><div class="acts">${rsvBtns(e,x,X.par.rs)}</div></div>`).join('')}</div></div>`}).join('')}</div>`;
  return h;
}

/* ================= الأحداث ================= */
const ACT={
  async repGo(b){
    const R=X.rep;R.date=val('x_rd')||latestAtt();R.busy=true;R.text='';rp();
    const r=await sb.rpc('kh_report_text',{p_section:isAdmin()?(S.sec||''):'',p_date:R.date});
    R.busy=false;if(r.error){rp();return fail(r.error,'تعذّر عمل التقرير (شغّل ملف 24؟)')}
    R.text=r.data||'';rp();
  },
  async repCopy(){try{await navigator.clipboard.writeText(X.rep.text);toast('اتنسخ')}catch(_){toast('مقدرتش أنسخ، حدّد النص وانسخه يدوي')}},
  evNew(){X.evt.form=true;rp()},
  evCancel(){X.evt.form=false;rp()},
  async evSave(b){
    const sc=val('x_es'),row={title:val('x_et'),kind:val('x_ek'),event_date:val('x_ed'),event_time:val('x_etm')||null,place:val('x_ep')||null,note:val('x_en')||null,scope:sc,class_id:null,section:null};
    if(!row.title)return toast('اكتب اسم الفعالية');if(!row.event_date)return toast('اختار التاريخ');
    if(sc==='class'){row.class_id=val('x_ec');if(!row.class_id)return toast('اختار الفصل');row.section=(S.classes.find(c=>c.id===row.class_id)||{}).section||null}
    if(sc==='section'){row.section=isAdmin()?val('x_esec'):S.p.section;if(!row.section)return toast('اختار القسم')}
    busyBtn(b,true);const r=await sb.from('events').insert(row);busyBtn(b,false);
    if(!ok(r))return;X.evt.form=false;toast('اتضافت واتبعت إشعار للأهالي');X.evt.busy=false;await loadEvt();
  },
  async evDel(b){
    if(!confirm('حذف الفعالية دي وكل ردود الناس عليها؟'))return;
    if(!ok(await sb.from('events').delete().eq('id',b.dataset.id)))return;X.evt.busy=false;await loadEvt();
  },
  evOpen(b){X.evt.open=X.evt.open===b.dataset.id?null:b.dataset.id;rp()},
  async rsv(b){
    const [ev,sid,st]=b.dataset.id.split('|'),isPar=S.p.role==='parent';
    const rs=isPar?X.par.rs:X.evt.rs,cur=(rs.find(r=>r.event_id===ev&&r.servee_id===sid)||{}).status;
    const r=await sb.rpc('kh_rsvp',{p_event:ev,p_servee:sid,p_status:cur===st?'clear':st});
    if(r.error)return fail(r.error,'تعذّر التسجيل');
    if(isPar){await parentExtras();paint()}else{X.evt.busy=false;await loadEvt()}
  },
  revSel(b){X.rev.cls=b.dataset.id;rp();window.scrollTo(0,0)},
  async revSave(b){
    const R=X.rev;if(!R.cls)return;
    const row={class_id:R.cls,month:R.month+'-01',improved:val('x_ri')||null,needs_followup:val('x_rn')||null,notes:val('x_ro')||null};
    if(!row.improved&&!row.needs_followup&&!row.notes)return toast('اكتب أي حاجة الأول');
    busyBtn(b,true);const r=await sb.from('class_reviews').upsert(row,{onConflict:'class_id,month'});busyBtn(b,false);
    if(!ok(r))return;toast('اتحفظ التقييم');R.busy=false;await loadRev();
  },
  async revMark(b){
    const cur=(X.rev.rows||[]).find(r=>r.id===b.dataset.id);if(!cur)return;
    if(!ok(await sb.from('class_reviews').update({reviewed:!cur.reviewed}).eq('id',cur.id)))return;
    X.rev.busy=false;await loadRev();
  },
  xscan(){openXScan()},
  xscanClose(){closeXScan()},
  pfprint(){printProfile()}
};
const CHG={
  honMonth(b){X.hon.month=b.value||mNow();X.hon.data=null;X.hon.busy=false;rp()},
  revMonth(b){X.rev.month=b.value||mNow();X.rev.rows=null;X.rev.busy=false;rp()},
  revCls(b){X.rev.cls=b.value;rp()}
};
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-x]');if(!b||['SELECT','INPUT','TEXTAREA'].includes(b.tagName))return;
  const f=ACT[b.dataset.x];if(f){e.preventDefault();f(b)}
});
document.addEventListener('change',e=>{
  const b=e.target.closest&&e.target.closest('select[data-x],input[data-x]');if(!b)return;
  const f=CHG[b.dataset.x];if(f)f(b);
});

/* ================= التركيب في التطبيق ================= */
const VIEWS={xrep:vRep,xhon:vHon,xevt:vEvt,xrev:vRev};
const origRender=window.render;
window.render=function(){
  if(!S.p||S.cards||S.pf||!avail().length)return origRender();
  if(X.uid!==S.p.id){X.uid=S.p.id;X.rep={date:'',text:'',busy:false};X.hon={month:'',data:null,busy:false};X.evt={list:null,rs:[],open:null,form:false,busy:false};X.rev={month:'',cls:'',rows:null,busy:false};X.myqr=undefined}
  const ext=avail().includes(S.tab)&&VIEWS[S.tab]?S.tab:null;
  if(ext)S.tab='notif';
  origRender();
  if(ext)S.tab=ext;
  const sh=document.querySelector('.sheet');
  if(sh){
    const g=document.createElement('div');
    g.innerHTML='<h4>جديد</h4><div class="sg">'+avail().map(k=>`<button data-a="tab" data-id="${k}" class="${S.tab===k?'on':''}"><i aria-hidden="true">${EXI[k]}</i><span>${EXT[k]}</span></button>`).join('')+'</div>';
    while(g.firstChild)sh.appendChild(g.firstChild);
  }
  if(ext){
    const m=document.querySelector('main');if(m)m.innerHTML=VIEWS[ext]();
    const nav=document.querySelector('nav.bn');
    if(nav){nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));const mb=nav.querySelector('[data-a="more"]');if(mb)mb.classList.add('on')}
  }
};

/* حضور الخدام: زرار مسح QR للأمين/أبونا، وكود الخادم نفسه */
const origSat=window.vSat;
window.vSat=function(){
  const h=origSat();
  if(!S.p)return h;
  if(S.p.role==='admin')return scanCard()+h;
  if(S.p.role==='secretary')return scanCard()+myQrCard()+h;
  if(S.p.role==='servant')return myQrCard()+h;
  return h;
};

/* ملف المخدوم: زرار الطباعة */
const origProfile=window.vProfile;
window.vProfile=function(){
  const h=origProfile();
  return h.replace('<button class="s" data-a="pfBack">← رجوع</button>','<button class="s" data-a="pfBack">← رجوع</button> <button class="s on" data-x="pfprint">🖨️ طباعة الملف</button>');
};

/* المخدوم/ولي الأمر: تحميل وعرض النقاط والفعاليات */
const origLoadParent=window.loadParent;
window.loadParent=async function(){await origLoadParent();await parentExtras()};
const origParent=window.vParent;
window.vParent=function(){
  const h=origParent(),add=parentCards();
  return add?h.replace(/<\/main>\s*$/,add+'</main>'):h;
};

/* ================= حضور سريع: بحث بالاسم + تحديد سريع (المخدومين والخدام) ================= */
const nrm=t=>String(t||'').replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase().trim();
const rowSel='[data-a="mark"],[data-a="smark"],[data-a="mmark"],[data-a="smmark"]';
const isMs=()=>typeof S!=='undefined'&&S.mk==='mass';
const qRows=()=>[...document.querySelectorAll('main .row')].filter(r=>r.querySelector(rowSel));
const isSv=()=>!!document.querySelector('main [data-a="mark"],main [data-a="mmark"]');
const errMsg=e=>typeof rpcErr==='function'?rpcErr(e):(e&&e.message)||'حصل خطأ';
const rowName=r=>{const d=r.querySelector('.who>div')||r.firstElementChild;const n=d&&d.childNodes[0];return (n?n.textContent:r.textContent).trim()};
function qApply(){
  const q=nrm(X.q),rows=qRows();let n=0;
  rows.forEach(r=>{const m=!q||nrm(r.textContent).includes(q);r.style.display=m?'':'none';if(m)n++});
  document.querySelectorAll('main .card').forEach(c=>{const rs=[...c.querySelectorAll('.row')].filter(r=>r.querySelector(rowSel));if(rs.length)c.style.display=rs.some(r=>r.style.display!=='none')?'':'none'});
  const vis=rows.filter(r=>r.style.display!=='none'),c=document.getElementById('x_qc'),bp=document.getElementById('x_qp'),be=document.getElementById('x_qe');
  if(c)c.textContent=q?(n?n+' نتيجة':'مفيش نتيجة'):'';
  if(bp){bp.textContent=!q?'حاضر':n===1?'✓ حاضر: '+rowName(vis[0]):n?'حاضر للظاهرين ('+n+')':'حاضر';bp.disabled=!q||!n}
  if(be){be.textContent=!q?'معتذر':n===1?'معتذر: '+rowName(vis[0]):n?'معتذر للظاهرين ('+n+')':'معتذر';be.disabled=!q||!n}
  return vis;
}
function qIds(rows,st){
  const sel=(isSv()?(isMs()?'[data-a="mmark"]':'[data-a="mark"]'):(isMs()?'[data-a="smmark"]':'[data-a="smark"]'))+'[data-id$="|'+st+'"]';
  return rows.map(r=>r.querySelector(sel)).filter(b=>b&&!b.classList.contains('on')).map(b=>b.dataset.id.split('|')[0]);
}
async function qMark(ids,st,note){
  if(!ids.length)return toast(st==='present'?'الكل متسجّل حاضر':'الكل متسجّل معتذر');
  let bad=0;
  if(isSv()&&isMs()){
    const rs=await Promise.all(ids.map(id=>sb.rpc('kh_mass_mark',{p_servee:id,p_date:S.date,p_status:st,p_note:st==='excused'?(note||null):null})));
    const e=rs.find(r=>r.error);bad=rs.filter(r=>r.error).length;if(e)toast(typeof mErr==='function'?mErr(e.error):errMsg(e.error));
    await loadAtt();
  }else if(isSv()){
    const rs=await Promise.all(ids.map(id=>st==='excused'?sb.rpc('kh_mark_excuse',{p_servee:id,p_date:S.date,p_note:note||null}):sb.rpc('kh_mark',{p_servee:id,p_date:S.date,p_status:st})));
    const e=rs.find(r=>r.error);bad=rs.filter(r=>r.error).length;if(e)toast(errMsg(e.error));
    await loadAtt();
  }else{
    const r=await sb.from(isMs()?'servant_mass_attendance':'servant_attendance').upsert(ids.map(id=>({servant_id:id,att_date:S.date,status:st})),{onConflict:'servant_id,att_date'});
    if(r.error){toast('حصل خطأ: '+r.error.message);return}
    await loadExtra();
  }
  X.q='';rp();if(!bad)toast('اتسجّل '+(st==='present'?'حضور ':'اعتذار ')+ids.length);
}
function qDecorate(){
  if(!S.p||S.cards||S.pf||document.getElementById('x_q'))return;
  const anchor=S.tab==='att'?document.querySelector('main [data-a="scan"]'):S.tab==='sat'&&canManage()?document.querySelector('main input[data-a="satDate"]'):null;
  if(!anchor)return;
  const card=anchor.closest('.card');if(!card)return;
  const d=document.createElement('div');d.className='card';
  d.innerHTML=`<input id="x_q" type="search" placeholder="🔎 ابحث بالاسم" autocomplete="off" value="${esc(X.q||'')}"><div class="cnt"><span id="x_qc"></span></div><div class="acts" style="justify-content:flex-start;flex-wrap:wrap"><button class="p" id="x_qp" data-x="qPresent" disabled>حاضر</button><button class="s" id="x_qe" data-x="qExcuse" disabled>معتذر</button><button class="s" data-x="qAll">حضّر الكل</button></div>`;
  card.after(d);qApply();
}
const _r2=window.render;
window.render=function(){_r2();try{qDecorate()}catch(e){console.error(e)}};
document.addEventListener('input',e=>{if(e.target&&e.target.id==='x_q'){X.q=e.target.value;qApply()}});
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'||!e.target||e.target.id!=='x_q')return;
  e.preventDefault();const v=qApply();
  if(v.length===1)ACT.qPresent();
});
ACT.qPresent=async()=>{
  const v=qApply(),ids=qIds(v,'present');if(!X.q)return toast('اكتب جزء من الاسم الأول');
  if(ids.length>1&&!confirm('تسجيل '+ids.length+' كحاضرين؟'))return;qMark(ids,'present')
};
ACT.qExcuse=async()=>{
  const v=qApply(),ids=qIds(v,'excused');if(!X.q)return toast('اكتب جزء من الاسم الأول');
  if(!ids.length)return toast('الكل متسجّل معتذر');
  let note=null;
  if(isSv()){note=prompt('سبب الاعتذار؟ (مثلاً: مسافر، مريض، امتحان). سيبه فاضي لو مفيش سبب.','مسافر');if(note===null)return;note=note.trim()||null}
  if(ids.length>1&&!confirm('تسجيل '+ids.length+' كمعتذرين؟'))return;qMark(ids,'excused',note)
};
ACT.qAll=async()=>{X.q='';const ids=qIds(qRows(),'present');if(ids.length&&!confirm('تسجيل '+ids.length+' كحاضرين؟'))return;qMark(ids,'present')};

/* المعتذر مش بيتحسب غياب في الافتقاد ونسبة حضور المخدوم */
const _servStat=window.servStat;
window.servStat=function(x,H){
  const m=H.byS[x.id]||{};
  if(!Object.values(m).includes('excused'))return _servStat(x,H);
  const ds=new Set([...(H.datesByC[x.class_id]||[])].filter(d=>m[d]!=='excused'));
  return _servStat(x,{byS:H.byS,datesByC:Object.assign({},H.datesByC,{[x.class_id]:ds})});
};
})();
