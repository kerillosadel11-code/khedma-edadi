const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');

function boot() {
  const win = {};
  const ctx = vm.createContext({ window: win, TextDecoder, TextEncoder, Blob, Response, DecompressionStream, Uint8Array, DataView, Uint32Array, ArrayBuffer, Math, String, Error, Promise });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'xlsx.js'), 'utf8'), ctx);
  return win;
}
const helpers = require('./helpers');
const buf = u8 => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);

test('xlsx: ملف Excel حقيقي (مضغوط، نصوص مشتركة، تاريخ، رقم تليفون)', async () => {
  const { xlsxRows } = boot();
  const f = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.xlsx'));
  const rows = await xlsxRows(buf(new Uint8Array(f)));
  assert.equal(rows.length, 4, 'الصف الفاضي مش بيتحسب، والشيت التاني مش بيتقري');
  assert.deepEqual([...rows[0]], ['الاسم', 'التليفون', 'تاريخ الميلاد', 'العنوان', 'ملاحظات']);
  assert.equal(rows[1][0], 'مينا جورج & سمير');
  assert.equal(rows[1][1], '1012345678');
  assert.match(rows[1][2], /^\d{5}$/, 'التاريخ جاي رقم تسلسلي من Excel');
  assert.equal(rows[1][4], '<مهم>');
  assert.equal(rows[2][3], '', 'الخلية الفاضية بتفضل مكانها');
  assert.equal(rows[3][0], 'كيرلس');
});

test('xlsx: النموذج الفاضي بيتقري تاني بنفس العناوين', async () => {
  const { xlsxTemplate, xlsxRows } = boot();
  const blob = xlsxTemplate();
  const rows = await xlsxRows(await blob.arrayBuffer());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].length, 10);
  const h = [...rows[0]].join('|');
  for (const k of ['اسم', 'الخادم المسئول', 'هاتف المخدوم', 'هاتف الأب', 'هاتف الأم', 'ميلاد', 'العنوان', 'المدرسة', 'الاعتراف']) assert.ok(h.includes(k), 'ناقص عمود ' + k);
});

test('xlsx: ملف مش zip بيرفض', async () => {
  const { xlsxRows } = boot();
  await assert.rejects(() => xlsxRows(new TextEncoder().encode('a,b\n1,2').buffer), /NOT_ZIP/);
});

test('استيراد: صفوف Excel بتتحوّل لمخدومين (تاريخ تسلسلي + تليفون رقم)', async () => {
  const { xlsxRows } = boot();
  const f = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.xlsx'));
  const raw = await xlsxRows(buf(new Uint8Array(f)));
  // نفس بيانات الملف (تليفون/ميلاد) على ترتيب الأعمدة الجديد، وباقي الحقول الإجبارية متكمّلة
  const rows = [['الاسم بالكامل', 'الخادم المسئول', 'رقم هاتف المخدوم', 'رقم هاتف الأب', 'رقم هاتف الأم', 'تاريخ الميلاد', 'العنوان', 'اسم المدرسة التابع لها', 'أب الاعتراف']];
  ['مينا جورج سمير فهمي', 'بيشوي عادل ناجي رزق', 'كيرلس مجدي صبحي عزيز'].forEach((n, i) => rows.push([n, 'سمير فؤاد', raw[i + 1][1], '01099999999', '', raw[i + 1][2] || '2010-01-01', 'شارع النصر', 'مدرسة السلام', 'أبونا يوحنا']));
  const S = { servees: [], profiles: [{ id: 'sv1', full_name: 'سمير فؤاد', role: 'servant', active: true }] };
  const g = helpers.load('app.js', ['normPhone', 'nameParts', 'QUAD_MSG', 'nz', 'nd', 'parseCSV', 'checkNewServee', 'buildImport'], { S, classServants: () => S.profiles });
  const m = g.buildImport(rows, 'c1');
  assert.equal(m.rej.length, 0, JSON.stringify(m.rej));
  assert.equal(m.ok.length, 3);
  assert.equal(m.ok[0].birth_date, '2012-05-31');
  assert.equal(m.ok[0].phone, '01012345678');
  assert.equal(m.ok[1].birth_date, '2011-03-04');
  assert.equal(m.ok[2].phone, '01222222222');
  assert.equal(m.ok[0].servant_id, 'sv1');
});
