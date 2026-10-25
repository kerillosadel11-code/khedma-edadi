// فحوصات هيكل المشروع: بتكشف أخطاء النشر قبل ما توصل للموبايلات
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');

test('كل ملفات JS سليمة (node --check)', () => {
  for (const f of ['app.js', 'finance.js', 'extras.js', 'offline.js', 'update.js', 'sw.js', 'scripts/bump-version.js'])
    cp.execFileSync(process.execPath, ['--check', path.join(root, f)]);
});

test('كل ملف في قايمة الـ precache بتاعة sw.js موجود فعلاً', () => {
  const sw = rd('sw.js');
  const list = sw.match(/const SHELL=\[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map(s => s.slice(1, -1));
  assert.ok(list.length > 15);
  for (const f of list) if (f !== './') assert.ok(fs.existsSync(path.join(root, f)), 'ناقص: ' + f);
});

test('sw.js فيه رقم نسخة، و version.json مطابق ليه', () => {
  const m = rd('sw.js').match(/const V='khedma-([^']+)'/);
  assert.ok(m, 'const V مش موجود');
  assert.equal(JSON.parse(rd('version.json')).v, m[1], 'sw.js و version.json لازم يبقوا نفس الرقم (شغّل: npm run bump)');
});

test('index.html بيحمّل المكتبات محليًا (من غير CDN) وكل سكربت موجود', () => {
  const h = rd('index.html');
  assert.ok(!/https?:\/\/(cdn|fonts)\./.test(h), 'فيه رابط خارجي');
  for (const m of h.matchAll(/<script src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, m[1])), 'ناقص: ' + m[1]);
});

test('مفيش inline event handlers (بتتكسر مع الـ CSP)', () => {
  for (const f of ['index.html', 'app.js', 'finance.js', 'extras.js'])
    assert.ok(!/\son(click|change|input|submit|error|load)="/.test(rd(f)), f + ' فيه on*= inline');
});

test('الـ CSP مفعّل في _headers', () => {
  const h = rd('_headers');
  assert.match(h, /Content-Security-Policy:.*script-src 'self'/);
  assert.match(h, /frame-ancestors 'none'/);
});

test('ملفات الخادم والـ SQL مش بتتنشر مع الموقع', () => {
  const ig = rd('.assetsignore').split('\n');
  for (const x of ['supabase', 'scripts', 'tests', '.github', '*.sql', '*.ts']) assert.ok(ig.includes(x), 'ناقص في .assetsignore: ' + x);
});

test('ملفات SQL مرقّمة من غير تكرار', () => {
  const nums = fs.readdirSync(path.join(root, 'supabase/sql')).filter(f => /^\d+_/.test(f)).map(f => f.split('_')[0]);
  assert.equal(new Set(nums).size, nums.length);
});
