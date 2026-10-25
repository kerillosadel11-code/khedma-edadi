const test = require('node:test'), assert = require('node:assert/strict');
const { load } = require('./helpers');

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const base = S => load('app.js', ['fname', 'fdate', 'servCmpCard', 'vParent'], {
  S, esc, today: () => '2026-10-25', av: () => '<i class="av"></i>', cname: () => 'أولى إعدادي', vNotif: () => '', parentMassBlock: () => ''
});
const count = (h, t) => h.split(t).length - 1;

test('fname: الاسم الأول بس', () => {
  const g = base({});
  assert.equal(g.fname('مينا جورج سمير'), 'مينا');
  assert.equal(g.fname('  مريم '), 'مريم');
  assert.equal(g.fname(null), '');
});

test('الصفحة الرئيسية للمخدوم: الاسم الكامل ما يتكررش، والمسابقات الفاضية مخفية', () => {
  const S = {
    p: { full_name: 'مينا جورج سمير', self_servee_id: 'x1', role: 'parent' },
    servees: [{ id: 'x1', full_name: 'مينا جورج سمير', class_id: 'c1' }], hist: [], pts: {}, cmp: [], classes: []
  };
  const h = base(S).vParent();
  assert.match(h, /أهلاً مينا</);
  assert.equal(count(h, 'مينا جورج سمير'), 0, 'الاسم الكامل مش مفروض يظهر في جسم الصفحة');
  assert.ok(!h.includes('المسابقات'), 'كارت المسابقات الفاضي مخفي');
});

test('ولي الأمر: اسم الابن يظهر مرة واحدة، والتحية باسم ولي الأمر الأول', () => {
  const S = {
    p: { full_name: 'جورج سمير', role: 'parent' },
    servees: [{ id: 'x1', full_name: 'مينا جورج', class_id: 'c1' }], hist: [], pts: {}, classes: []
  };
  const h = base(S).vParent();
  assert.match(h, /أهلاً جورج</);
  assert.equal(count(h, 'مينا جورج'), 1);
});

test('المسابقات المفتوحة بتفضل ظاهرة', () => {
  const S = { cmp: [{ title: 'مسابقة الصيف', ends_on: '2026-12-01' }] };
  assert.match(base(S).servCmpCard(), /مسابقة الصيف/);
});

test('extras.parentCards: مفيش كارت فعاليات لو مفيش فعاليات', () => {
  const g = load('extras.js', ['parentCards'], { S: { servees: [{ id: 'a' }] }, X: { par: { ev: [], rs: [], sp: {} } }, inScope: () => true, esc, fdate: x => x });
  assert.equal(g.parentCards(), '');
});
