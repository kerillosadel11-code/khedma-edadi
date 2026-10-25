// صور الخدام: الواجهة متوافقة مع 28_servant_photos.sql
const test = require('node:test'), assert = require('node:assert/strict');
const { read } = require('./helpers');

test('الواجهة بتستخدم bucket ودالة موجودين في ملف الـ SQL', () => {
  const sql = read('supabase/sql/28_servant_photos.sql'), js = read('app.js');
  assert.match(js, /from\('servant-photos'\)/);
  assert.match(sql, /'servant-photos'/);
  assert.match(js, /rpc\('kh_set_servant_photo'/);
  assert.match(sql, /function public\.kh_set_servant_photo\(p_id uuid, p_path text\)/);
  assert.match(sql, /add column if not exists photo_path/);
});

test('الصورة بتتصغّر قبل الرفع (320px JPEG) عشان المساحة', () => {
  const js = read('app.js');
  assert.match(js, /const z=320,cv=/);
  assert.match(js, /'image\/jpeg',\.8\)/);
  assert.match(read('supabase/sql/28_servant_photos.sql'), /file_size_limit = 307200/);
});
