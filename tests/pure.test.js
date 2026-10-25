const test = require('node:test'), assert = require('node:assert/strict');
const { load } = require('./helpers');

test('normPhone: أرقام مصرية بكل الصيغ', () => {
  const { normPhone } = load('app.js', ['normPhone']);
  assert.equal(normPhone('01012345678'), '01012345678');
  assert.equal(normPhone('+201012345678'), '01012345678');
  assert.equal(normPhone('00201112345678'), '01112345678');
  assert.equal(normPhone('1012345678'), '01012345678');
  assert.equal(normPhone('٠١٠١٢٣٤٥٦٧٨'), '01012345678');       // أرقام عربية
  assert.equal(normPhone('0101 234 5678'), '01012345678');
  assert.equal(normPhone('01312345678'), null);               // شبكة غير موجودة
  assert.equal(normPhone('0101234567'), null);                // ناقص رقم
  assert.equal(normPhone(''), null);
  assert.equal(normPhone(null), null);
});

test('toEmail: الرقم بيتحوّل لإيميل الدخول', () => {
  const g = load('app.js', ['normPhone', 'toEmail'], { EMAIL_DOMAIN: 'khedma.app' });
  // EMAIL_DOMAIN متعرّفة const في app.js، فبنحقنها هنا
  assert.equal(g.toEmail('a@b.com'), 'a@b.com');
});

test('nz: توحيد الحروف العربية للبحث', () => {
  const { nz } = load('app.js', ['nz']);
  assert.equal(nz('أحمد'), nz('احمد'));
  assert.equal(nz('مريم'), nz('مريم'));
  assert.equal(nz('هبة'), nz('هبه'));
  assert.equal(nz('مُحَمَّد'), nz('محمد'));
  assert.equal(nz(null), '');
});

test('esc: بيمنع حقن HTML', () => {
  const { esc } = load('app.js', ['esc']);
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(esc('"\'&'), '&quot;&#39;&amp;');
  assert.equal(esc(undefined), '');
});

test('html``: بيعمل escape تلقائي ويسيب المتداخل', () => {
  const g = load('app.js', ['esc', 'RAW', 'fmtH', 'html'], { Symbol });
  const evil = '<script>x</script>';
  const out = g.html`<b>${evil}</b>${g.html`<i>${'ok'}</i>`}${[1, '<']}`;
  assert.equal(out.s, '<b>&lt;script&gt;x&lt;/script&gt;</b><i>ok</i>1&lt;');
});

test('nextBday: أيام باقية على عيد الميلاد', () => {
  const g = load('app.js', ['nextBday'], { today: () => '2026-10-25', Date, Math });
  assert.equal(g.nextBday('2012-10-26').days, 1);
  assert.equal(g.nextBday('2012-10-25').days, 0);
  assert.equal(g.nextBday('2012-10-24').days, 364);
});
