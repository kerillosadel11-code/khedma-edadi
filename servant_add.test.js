// الخادم يضيف مخدومين لفصله: الواجهة متوافقة مع 41_servant_add_servee.sql
const test = require('node:test');
const assert = require('node:assert');
const { read } = require('./helpers');

test('الواجهة بتنادي دالة موجودة في ملف الـ SQL وبتبعت كل بارامتراتها', () => {
  const js = read('app.js'), sql = read('supabase/sql/41_servant_add_servee.sql');
  assert.match(js, /sb\.rpc\('kh_servant_add_servee'/);
  assert.match(sql, /function public\.kh_servant_add_servee\(/);
  for (const p of ['p_name', 'p_phone', 'p_birth', 'p_class', 'p_address', 'p_notes']) {
    assert.ok(js.includes(p + ':'), 'الواجهة مش بتبعت ' + p);
    assert.ok(sql.includes(p + ' '), 'الدالة مش بتستقبل ' + p);
  }
});

test('الدالة بتقفل على الخادم وفصله بس ومش متاحة لـ anon', () => {
  const sql = read('supabase/sql/41_servant_add_servee.sql');
  assert.match(sql, /kh_role\(\) is distinct from 'servant'/);
  assert.match(sql, /servant_has_class\(p_class\)/);
  assert.match(sql, /revoke all on function public\.kh_servant_add_servee[^;]*from public, anon/);
  assert.match(sql, /grant execute on function public\.kh_servant_add_servee[^;]*to authenticated/);
});

test('كارت الإضافة بيظهر للخادم بس في صفحة «مخدومين الفصل»', () => {
  const js = read('app.js');
  assert.match(js, /function addSvCard\(\)\{\s*if\(canManage\(\)\|\|!acid\(\)\)return ''/);
  assert.match(js, /which==='sv'\?hd\+addSvCard\(\)\+sev/);
  // الأدمن والأمين لسه بيضيفوا بالـ insert العادي
  assert.match(js, /\}else\s*r=await sb\.from\('servees'\)\.insert\(/);
});
