/* صندوق البريد (وارد / صادر) + طلبات الاعتذار عن الاجتماعات.
   المخدوم أو ولي أمره يبعت اعتذار بسبب → يوصل لخدام الفصل → لما يوافقوا يظهر في «حضور المخدومين» يوم الاجتماع.
   لازم يتحمّل بعد app.js و extras.js، وياخد قاعدته من supabase/sql/27_excuse_requests.sql */
(function () {
  'use strict';
  const M = { list: null, err: '', open: false, tab: 'in', sv: '', date: '', reason: '', last: 0 };
  const dt = x => new Date(x).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  const g = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
  const isParent = () => !!S.p && S.p.role === 'parent';
  const rp = () => (isParent() ? paint() : render());

  const ST = {
    pending: ['⏳ مستنّي رد الخادم', '#fde9b8'],
    approved: ['✅ اتقبل', '#cfeedd'],
    rejected: ['❌ ما اتقبلش', '#f3d6d2'],
    cancelled: ['↩️ اتلغى', '#eee']
  };
  const chip = st => { const c = ST[st] || [st, '#eee']; return `<span class="bd" style="background:${c[1]}">${c[0]}</span>`; };
  const ERR = {
    FORBIDDEN: 'مش مسموح لك بالعملية دي',
    NOT_FOUND: 'الطلب أو المخدوم مش موجود',
    INACTIVE: 'المخدوم ده موقوف',
    BAD_DATE: 'اختار تاريخ اجتماع جاي (من النهارده لحد 90 يوم)',
    BAD_REASON: 'اكتب سبب الاعتذار (من 3 حروف لحد 500)',
    DUPLICATE: 'فيه طلب اعتذار لنفس الاجتماع بالفعل',
    DONE: 'الطلب ده اتحسم قبل كده',
    TOO_MANY: 'بعت كتير، استنى دقيقة وجرّب تاني'
  };
  const errT = e => ERR[e && e.message] || ('حصل خطأ: ' + ((e && e.message) || ''));

  async function loadExq() {
    const r = await sb.from('excuse_requests').select('*').order('created_at', { ascending: false }).limit(80);
    M.list = r.error ? [] : (r.data || []);
    M.err = r.error ? r.error.message : '';
    M.last = Date.now();
  }
  const soft = async () => { if (!M.list || Date.now() - M.last > 30000) await loadExq(); };
  const pending = () => (M.list || []).filter(r => r.status === 'pending');

  /* ---------- المخدوم / ولي الأمر ---------- */
  function vBox() {
    const L = M.list || [], nIn = (S.nt || []).filter(x => !x.is_read).length, nPend = L.filter(r => r.status === 'pending').length;
    const T = [['in', '📥 وارد' + (nIn ? ' (' + nIn + ')' : '')], ['out', '📤 صادر' + (nPend ? ' (' + nPend + ')' : '')], ['new', '✍️ اعتذار عن اجتماع']];
    const head = `<div class="card"><h2>📬 صندوق البريد${nIn ? ' <small>(' + nIn + ' جديد)</small>' : ''}</h2>` + (M.open
      ? `<div class="two">${T.map(([k, n]) => `<button class="s${M.tab === k ? ' on' : ''}" data-m="tab" data-id="${k}">${n}</button>`).join('')}</div><button class="s" data-m="toggle" style="margin-top:8px">إغلاق ✕</button>`
      : `<div class="two"><button class="s" data-m="tab" data-id="in">📥 فتح البريد${nIn ? ' (' + nIn + ')' : ''}</button><button class="s" data-m="tab" data-id="new">✍️ اعتذار عن اجتماع</button></div>`) + '</div>';
    if (!M.open) return head;
    return head + (M.tab === 'new' ? vNew() : M.tab === 'out' ? vOut() : vIn());
  }

  function vIn() {
    const N = S.nt || [], n = N.filter(x => !x.is_read).length;
    return `<div class="card"><h2>الوارد${n ? ' (' + n + ' جديد)' : ''}</h2>${n ? '<button class="s" data-a="readAll" style="margin-bottom:8px">تحديد الكل كمقروء</button>' : ''}${N.map(x => `<div class="row" style="${x.is_read ? '' : 'background:#fff8e6;border-radius:8px;padding:10px'}"><div><b>${esc(x.title)}</b>${x.body ? `<small style="white-space:pre-wrap">${esc(x.body)}</small>` : ''}<small>${dt(x.created_at)}</small></div><div class="acts">${x.is_read ? '' : `<button class="s" data-a="readN" data-id="${x.id}">تم</button>`}${isMsgN(x) ? `<button class="s${S.rpn === x.id ? ' on' : ''}" data-a="replyOpen" data-id="${x.id}">رد</button>` : ''}</div>${S.rpn === x.id ? `<div style="flex-basis:100%"><textarea id="rp_b" rows="3" maxlength="500" data-a="rpdraft" placeholder="اكتب ردك...">${esc(S.rpd || '')}</textarea><button class="p" data-a="replySend" data-id="${x.id}">إرسال الرد</button></div>` : ''}</div>`).join('') || '<div class="empty">مفيش رسائل واردة.</div>'}</div>`;
  }

  function vOut() {
    const L = M.list || [], many = (S.servees || []).length > 1;
    const reqs = M.err
      ? `<div class="card"><div class="empty">تعذّر تحميل طلبات الاعتذار: ${esc(M.err)}<br>لو ده أول مرة، شغّل ملف 27_excuse_requests.sql في Supabase.</div></div>`
      : `<div class="card"><h2>طلبات الاعتذار (${L.length})</h2>${L.map(r => `<div class="row" style="align-items:flex-start"><div><b>${fdate(r.meeting_date)}</b>${many ? `<small>${esc(sname(r.servee_id))}</small>` : ''}<small style="white-space:pre-wrap">السبب: ${esc(r.reason)}</small>${r.decision_note ? `<small style="white-space:pre-wrap">رد الخادم: ${esc(r.decision_note)}</small>` : ''}<small>اتبعت ${dt(r.created_at)}${r.decided_at ? ' · اتحسم ' + dt(r.decided_at) : ''}</small></div><div class="acts">${chip(r.status)}${r.status === 'pending' ? `<button class="s d" data-m="cancel" data-id="${r.id}">إلغاء الطلب</button>` : ''}</div></div>`).join('') || '<div class="empty">لسه ما بعتّش طلبات اعتذار.</div>'}</div>`;
    const rps = S.rps || [];
    const rep = `<div class="card"><h2>الردود اللي بعتها (${rps.length})</h2>${rps.map(r => `<div class="row"><div><b>↩️ إلى ${esc(r.to_name || '؟')}</b><small style="white-space:pre-wrap">${esc(r.body)}</small><small>${dt(r.created_at)}</small></div></div>`).join('') || '<div class="empty">لسه ما بعتش ردود.</div>'}</div>`;
    return reqs + rep;
  }

  function vNew() {
    const sv = S.servees || [];
    if (!sv.length) return '';
    if (!M.sv || !sv.some(x => x.id === M.sv)) M.sv = sv[0].id;
    return `<div class="card"><h2>اعتذار عن اجتماع جاي</h2><p class="empty" style="padding:0 0 8px">الطلب بيوصل لخدام الفصل، ولما يوافقوا بيتسجّل الاعتذار يوم الاجتماع.</p>
    ${sv.length > 1 ? `<select id="m_sv" data-m="sv">${sv.map(x => `<option value="${x.id}"${x.id === M.sv ? ' selected' : ''}>${esc(x.full_name)}</option>`).join('')}</select>` : ''}
    <label class="empty" for="m_dt">تاريخ الاجتماع</label>
    <input id="m_dt" type="date" min="${today()}" value="${esc(M.date)}" data-m="date">
    <textarea id="m_rs" rows="3" maxlength="500" placeholder="سبب الاعتذار (مثلاً: مسافر، مريض، امتحان)" data-m="reason">${esc(M.reason)}</textarea>
    <button class="p" data-m="send">إرسال للخادم</button></div>`;
  }

  /* ---------- الخادم / الأمين ---------- */
  function vReq() {
    const P = pending();
    if (!P.length) return '';
    return `<div class="card"><h2>🙏 طلبات اعتذار مستنية ردك (${P.length})</h2>${P.map(r => `<div class="row" style="align-items:flex-start"><div><b>${esc(sname(r.servee_id))}</b><small>${esc(cname(r.class_id))} · اجتماع ${fdate(r.meeting_date)}</small><small style="white-space:pre-wrap">السبب: ${esc(r.reason)}</small><small>اتبعت ${dt(r.created_at)}</small></div><div class="acts"><button class="s on" data-m="yes" data-id="${r.id}">✅ موافقة</button><button class="s d" data-m="no" data-id="${r.id}">❌ رفض</button></div></div>`).join('')}</div>`;
  }
  function vDecided() {
    const D = (M.list || []).filter(r => r.decided_by === S.p.id && (r.status === 'approved' || r.status === 'rejected')).slice(0, 20);
    if (!D.length) return '';
    return `<div class="card"><h2>قرارات الاعتذار اللي أخدتها (${D.length})</h2>${D.map(r => `<div class="row"><div><b>${esc(sname(r.servee_id))}</b><small>اجتماع ${fdate(r.meeting_date)} · ${esc(r.reason)}</small>${r.decision_note ? `<small>ردي: ${esc(r.decision_note)}</small>` : ''}</div>${chip(r.status)}</div>`).join('')}</div>`;
  }
  /* اعتذارات مقبولة: بتظهر في شاشة الحضور يوم الاجتماع، وبضغطة واحدة تتسجّل «معتذر» */
  function toApply() {
    const cid = typeof acid === 'function' ? acid() : null;
    const done = new Set((S.att || []).filter(a => a.status === 'excused' || a.status === 'present').map(a => a.servee_id));
    return (M.list || []).filter(r => r.status === 'approved' && r.meeting_date === S.date && (!r.class_id || r.class_id === cid) && !done.has(r.servee_id));
  }
  function attCard() {
    const A = toApply(), td = today();
    const cid = typeof acid === 'function' ? acid() : null;
    const up = (M.list || []).filter(r => r.status === 'approved' && r.meeting_date > S.date && (!r.class_id || r.class_id === cid)).sort((a, b) => a.meeting_date < b.meeting_date ? -1 : 1).slice(0, 15);
    if (!A.length && !up.length) return '';
    let h = '';
    if (A.length) h += `<div class="card"><h2>🙏 اعتذارات مقبولة ليوم ${fdate(S.date)} (${A.length})</h2>${A.map(r => `<div class="row"><div><b>${esc(sname(r.servee_id))}</b><small>${esc(r.reason)}</small></div></div>`).join('')}${S.date <= td ? `<button class="p" data-m="apply">سجّلهم معتذرين</button>` : '<p class="empty">هتقدر تسجّلهم يوم الاجتماع.</p>'}</div>`;
    if (up.length) h += `<div class="card"><h2>اعتذارات مقبولة لاجتماعات جاية (${up.length})</h2>${up.map(r => `<div class="row"><div><b>${esc(sname(r.servee_id))}</b><small>${fdate(r.meeting_date)} · ${esc(r.reason)}</small></div></div>`).join('')}</div>`;
    return h;
  }

  /* ---------- الأحداث ---------- */
  async function decide(b, yes) {
    const note = prompt(yes ? 'ملاحظة للمخدوم (اختياري)' : 'سبب الرفض (اختياري)', '');
    if (note === null) return;
    b.disabled = true;
    const r = await sb.rpc('kh_excuse_decide', { p_req: b.dataset.id, p_approve: yes, p_note: note.trim() || null });
    b.disabled = false;
    if (r.error) return toast(errT(r.error));
    await loadExq();
    toast(yes ? 'اتقبل الاعتذار. هيظهر في الحضور يوم الاجتماع' : 'اتبعت الرفض للمخدوم');
    rp();
  }
  const A = {
    toggle() { M.open = !M.open; rp(); },
    tab(b) { M.open = true; M.tab = b.dataset.id; rp(); },
    async send(b) {
      const sv = M.sv || ((S.servees || [])[0] || {}).id, date = g('m_dt') || M.date, reason = g('m_rs') || M.reason;
      if (!sv) return toast('مفيش مخدوم مربوط بحسابك');
      if (!date) return toast('اختار تاريخ الاجتماع');
      if (date < today()) return toast(ERR.BAD_DATE);
      if (reason.length < 3) return toast(ERR.BAD_REASON);
      b.disabled = true;
      const r = await sb.rpc('kh_excuse_request', { p_servee: sv, p_date: date, p_reason: reason });
      b.disabled = false;
      if (r.error) return toast(errT(r.error));
      M.date = ''; M.reason = ''; M.tab = 'out';
      await loadExq();
      toast('اتبعت طلب الاعتذار للخادم');
      rp();
    },
    async cancel(b) {
      if (!confirm('تلغي طلب الاعتذار؟')) return;
      b.disabled = true;
      const r = await sb.rpc('kh_excuse_cancel', { p_req: b.dataset.id });
      b.disabled = false;
      if (r.error) return toast(errT(r.error));
      await loadExq(); toast('اتلغى الطلب'); rp();
    },
    yes(b) { return decide(b, true); },
    no(b) { return decide(b, false); },
    async apply(b) {
      const L = toApply();
      if (!L.length) return;
      b.disabled = true;
      const rs = await Promise.all(L.map(r => sb.rpc('kh_mark_excuse', { p_servee: r.servee_id, p_date: S.date, p_note: ('اعتذار مسبق: ' + r.reason).slice(0, 120) })));
      const bad = rs.filter(x => x.error);
      if (bad.length) toast(typeof rpcErr === 'function' ? rpcErr(bad[0].error) : 'حصل خطأ في تسجيل ' + bad.length);
      else toast('اتسجّلوا معتذرين');
      await loadAtt(); render();
    }
  };
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-m]');
    if (!b || ['SELECT', 'INPUT', 'TEXTAREA'].includes(b.tagName)) return;
    const f = A[b.dataset.m];
    if (f) { e.preventDefault(); f(b); }
  });
  document.addEventListener('input', e => {
    const t = e.target, k = t && t.dataset && t.dataset.m;
    if (k === 'date') M.date = t.value; else if (k === 'reason') M.reason = t.value;
  });
  document.addEventListener('change', e => {
    const t = e.target, k = t && t.dataset && t.dataset.m;
    if (k === 'sv') M.sv = t.value; else if (k === 'date') M.date = t.value;
  });

  /* ---------- التركيب في التطبيق ---------- */
  const oLP = window.loadParent;
  if (oLP) window.loadParent = async function () { await oLP(); try { await Promise.all([loadMsg(), loadExq()]); } catch (_) {} };

  const oVP = window.vParent;
  if (oVP) window.vParent = function () {
    const h = oVP();
    if (!S.servees || !S.servees.length) return h;
    const box = vBox(), m = h.match(/<h2 style="margin:0 0 10px">[^<]*<\/h2>/);
    return m ? h.replace(m[0], () => m[0] + box) : h.replace(/<\/main>\s*$/, () => box + '</main>');
  };

  const oLM = window.loadMsg;
  if (oLM) window.loadMsg = async function () {
    await oLM();
    if (!isParent()) { await loadExq(); if (!S.mbox && pending().length) S.mbox = 'in'; }
  };

  const oVI = window.vInbox;
  if (oVI) window.vInbox = function () { return vReq() + oVI(); };
  const oVO = window.vOutbox;
  if (oVO) window.vOutbox = function () { return oVO() + vDecided(); };

  const oLA = window.loadAtt;
  if (oLA) window.loadAtt = async function () { await oLA(); if (!isParent()) { try { await soft(); } catch (_) {} } };
  const oVA = window.vAtt;
  if (oVA) window.vAtt = function () { return attCard() + oVA(); };

  /* الضغط على إشعار طلب الاعتذار يفتح «الرسائل ← الوارد» عند الخادم */
  const oGN = window.goNav;
  if (oGN) window.goNav = function (u) {
    if (S.p && !isParent() && /tab=msg/.test(String(u || ''))) {
      S.mbox = 'in';
      Promise.resolve(loadMsg()).catch(() => {}).then(() => oGN(u));
      return;
    }
    return oGN(u);
  };
})();
