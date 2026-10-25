// حضور القداس: منطق الإحصائية + ربط الواجهة بدوال/جداول 27_mass_attendance.sql
const test = require('node:test'), assert = require('node:assert/strict');
const { load, read } = require('./helpers');
const has = f => require('fs').existsSync(require('path').join(__dirname, '..', f));
const { massStat } = load('app.js', ['massStat']);

const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const C = 'c1', old = '2020-01-01T00:00:00Z';
const sv = [{ id: 'a', class_id: C, created_at: old }, { id: 'b', class_id: C, created_at: old }, { id: 'z', class_id: 'other', created_at: old }];
const row = (id, d, status) => ({ servee_id: id, att_date: day(d), status });

test('قداسات الفصل = الأيام اللي اتسجّل فيها قداس لأي حد من الفصل، والنسبة والغياب المتتالي صح', () => {
  const rows = [row('b', 21, 'present'), row('a', 21, 'present'), row('b', 14, 'present'), row('a', 14, 'absent'),
    row('b', 7, 'present'), row('a', 7, 'absent'), row('b', 0, 'present')]; // a ماتسجّلش له النهارده = غياب
  const s = massStat(sv[0], rows, sv, 90);
  assert.equal(s.sessions, 4); assert.equal(s.present, 1); assert.equal(s.absent, 3);
  assert.equal(s.pct, 25); assert.equal(s.streak, 3); assert.equal(s.last, day(21));
});

test('المعتذر مش غياب ومش بيقطع الغياب المتتالي', () => {
  const rows = [row('b', 21, 'present'), row('a', 21, 'present'), row('b', 14, 'present'), row('a', 14, 'absent'),
    row('b', 7, 'present'), row('a', 7, 'excused'), row('b', 0, 'present'), row('a', 0, 'absent')];
  const s = massStat(sv[0], rows, sv, 90);
  assert.equal(s.excused, 1); assert.equal(s.absent, 2); assert.equal(s.streak, 2);
  assert.equal(s.sessions, 3); // الحاضر + الغايب بس
});

test('قداسات قبل إضافة المخدوم ما بتتحسبش عليه', () => {
  const late = { id: 'n', class_id: C, created_at: new Date(Date.now() - 10 * 864e5).toISOString() };
  const rows = [row('b', 21, 'present'), row('b', 14, 'present'), row('b', 7, 'present'), row('n', 7, 'present')];
  const s = massStat(late, rows, sv.concat(late), 90);
  assert.equal(s.sessions, 1); assert.equal(s.pct, 100);
});

test('قداسات فصل تاني، ومخدوم من غير فصل، مش بتأثر', () => {
  const rows = [row('z', 7, 'present'), row('a', 7, 'present')];
  assert.equal(massStat(sv[0], rows, sv, 90).sessions, 1);
  assert.equal(massStat({ id: 'q', class_id: null, created_at: old }, rows, sv, 90).sessions, 0);
});

test('الفترة بتتحدد بالأيام', () => {
  const rows = [row('a', 100, 'present'), row('a', 5, 'present')];
  assert.equal(massStat(sv[0], rows, sv, 90).sessions, 1);
});

test('كل دالة وجدول قداس بتستخدمهم الواجهة موجودين في ملف الـ SQL', { skip: !has('supabase/sql/27_mass_attendance.sql') && 'ملف 27_mass_attendance.sql مش موجود هنا' }, () => {
  const sql = read('supabase/sql/27_mass_attendance.sql'), js = read('app.js') + read('extras.js');
  for (const m of js.matchAll(/'(kh_(?:servant_)?mass_[a-z_]+)'/g))
    assert.ok(new RegExp('function public\\.' + m[1] + '\\(').test(sql), 'ناقصة في SQL: ' + m[1]);
  for (const t of ['mass_attendance', 'servant_mass_attendance'])
    assert.ok(new RegExp('create table if not exists public\\.' + t + '\\b').test(sql), 'ناقص جدول: ' + t);
});

test('تنبيه غياب القداس مستقل عن الاجتماع (ملاحظة وإشعار مختلفين وحد 3)', { skip: !has('supabase/sql/27_mass_attendance.sql') && 'ملف 27_mass_attendance.sql مش موجود هنا' }, () => {
  const sql = read('supabase/sql/27_mass_attendance.sql');
  assert.match(sql, /\[تلقائي-قداس\]/);
  assert.match(sql, /th\s+constant integer := 3/);
  assert.ok(!/on public\.attendance_days/.test(sql), 'ملف القداس مايلمسش attendance_days');
});
