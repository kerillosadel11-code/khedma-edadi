// قواعد إضافة المخدوم الجديد: اسم رباعي + تليفونات + الحقول الإجبارية (بتتطبّق على الجداد بس)
const test = require('node:test'), assert = require('node:assert/strict');
const helpers = require('./helpers');

const S = { servees: [{ id: 'old', full_name: 'قديم الاسم', phone: '01000000000' }], profiles: [
  { id: 's1', full_name: 'سمير فؤاد جرجس', role: 'servant', active: true }, { id: 's2', full_name: 'مجدي نبيل', role: 'servant', active: true }] };
const g = helpers.load('app.js', ['normPhone', 'nameParts', 'QUAD_MSG', 'nz', 'nd', 'parseCSV', 'checkNewServee', 'errToast', 'buildImport', 'MISS', 'missingOf'], { S, classServants: () => S.profiles });
const good = { name: 'مينا جورج فهمي سمعان', class_id: 'c1', servant_id: 's1', phone: '', father_phone: '010 1234 5678', mother_phone: '', birth_date: '2012-05-31', address: 'شارع النصر', school: 'مدرسة السلام', confession_father: 'أبونا يوحنا' };
const bad = (patch, re) => { const r = g.checkNewServee({ ...good, ...patch }); assert.ok(r.errors.length, 'المفروض يترفض'); assert.match(r.errors.join('|'), re); };

test('بيانات كاملة بتعدّي وبتتنضّف (تليفون 11 رقم، مسافات الاسم)', () => {
  const r = g.checkNewServee({ ...good, name: '  مينا   جورج فهمي سمعان ' });
  assert.deepEqual([...r.errors], []);
  assert.equal(r.clean.full_name, 'مينا جورج فهمي سمعان');
  assert.equal(r.clean.father_phone, '01012345678');
  assert.equal(r.clean.mother_phone, null);
  assert.equal(r.clean.phone, null, 'تليفون المخدوم اختياري');
});

test('الاسم لازم رباعي', () => {
  bad({ name: 'مينا جورج فهمي' }, /رباعي/);
  bad({ name: '' }, /اسم المخدوم/);
});

test('تليفون الأب أو الأم كفاية، ومحتاج واحد على الأقل', () => {
  assert.deepEqual([...g.checkNewServee({ ...good, father_phone: '', mother_phone: '01112345678' }).errors], []);
  bad({ father_phone: '', mother_phone: '' }, /الأب أو الأم/);
});

test('عدد أرقام التليفون متفحوص (الأب والأم والمخدوم)', () => {
  bad({ father_phone: '0101234567' }, /هاتف الأب غلط/);
  bad({ father_phone: '', mother_phone: '012345678901' }, /هاتف الأم غلط/);
  bad({ phone: '12345' }, /هاتف المخدوم غلط/);
  bad({ father_phone: '01312345678' }, /غلط/);
  assert.deepEqual([...g.checkNewServee({ ...good, father_phone: '+20 101 234 5678' }).errors], []);
});

test('الحقول الإجبارية: فصل، خادم مسئول، ميلاد، عنوان، مدرسة، أب اعتراف', () => {
  bad({ class_id: '' }, /الفصل/);
  bad({ servant_id: '' }, /الخادم المسئول/);
  bad({ birth_date: '' }, /تاريخ الميلاد/);
  bad({ birth_date: '2999-01-01' }, /مش منطقي/);
  bad({ address: ' ' }, /العنوان/);
  bad({ school: '' }, /المدرسة/);
  bad({ confession_father: '' }, /أب الاعتراف/);
  assert.match(g.errToast(['أ', 'ب', 'ج']), /\(\+2 كمان\)/);
});

test('استيراد Excel بعناوين الشيت بتاعك: مرفوض مع السبب، والمقبول بيتربط بالخادم بالاسم', () => {
  const H = ['م', 'الاسم بالكامل', 'المرحله', 'الخادم المسئول', 'رقم هاتف المخدوم', 'رقم هاتف الأب', 'رقم هاتف الأم', 'تاريخ الميلاد', 'العنوان', 'اسم المدرسة التابع لها', 'أب الاعتراف'];
  const ok = ['1', 'مينا جورج فهمي سمعان', 'اولى', 'مجدي نبيل', '', '01012345678', '', '2012-05-31', 'شارع النصر', 'مدرسة السلام', 'أبونا يوحنا'];
  const rows = [H, ok,
    ['2', 'كيرلس مجدي', 'اولى', 'مجدي نبيل', '', '01012345678', '', '2012-05-31', 'x', 'y', 'z'],                 // اسم مش رباعي
    ['3', 'بيشوي عادل ناجي رزق', 'اولى', 'خادم مش موجود', '', '01012345678', '', '2012-05-31', 'x', 'y', 'z'],      // خادم مش موجود
    ['4', 'مارك سمير عادل فوزي', 'اولى', 'سمير فؤاد جرجس', '', '0101', '', '2012-05-31', 'x', 'y', 'z'],            // تليفون ناقص
    ['5', 'جورج مينا سمير نبيل', 'اولى', 'مجدي نبيل', '', '', '01112345678', '', 'x', 'y', ''],                      // ميلاد وأب اعتراف ناقصين
    ['', '', '', '', '', '', '', '', '', '', ''],                                                                      // صف فاضي: بيتتخطّى
    ['7', 'قديم الاسم', 'اولى', 'مجدي نبيل', '', '01012345678', '', '2012-05-31', 'x', 'y', 'z']];                  // مكرر مع مخدوم موجود
  const m = g.buildImport(rows, 'c1');
  assert.equal(m.ok.length, 1);
  assert.equal(m.ok[0].full_name, 'مينا جورج فهمي سمعان');
  assert.equal(m.ok[0].servant_id, 's2');
  assert.equal(m.ok[0].school, 'مدرسة السلام', 'عمود المدرسة ما اتلخبطش مع عمود الاسم');
  assert.equal(m.ok[0].class_id, 'c1');
  assert.equal(m.dup, 1);
  const why = n => (m.rej.find(x => x.row === n) || { why: [] }).why.join('|');
  assert.match(why(3), /رباعي/);
  assert.match(why(4), /مش موجود/);
  assert.match(why(5), /هاتف الأب غلط/);
  assert.match(why(6), /تاريخ الميلاد/);
  assert.match(why(6), /أب الاعتراف/);
  assert.equal(m.rej.length, 4);
});

test('المخدومين القدام: بيبان إيه الناقص في بياناتهم من غير ما نمنع حفظهم', () => {
  assert.deepEqual([...g.missingOf({ full_name: 'قديم' })], ['تليفون الأب أو الأم', 'تاريخ الميلاد', 'العنوان', 'المدرسة', 'أب الاعتراف']);
  assert.deepEqual([...g.missingOf({ mother_phone: '01012345678', birth_date: '2012-01-01', address: 'a', school: 's', confession_father: 'c' })], []);
  const src = require('./helpers').read('app.js');
  // الحفظ بيمنع تليفون غلط لو اتغيّر بس، وماعندوش فحص إجباري على الحقول
  assert.match(src, /if\(x===String\(old\|\|''\)\)return\{val:x\}/);
  assert.doesNotMatch(src.slice(src.indexOf("if(a==='saveServee')"), src.indexOf("if(a==='saveClass')")), /checkNewServee/);
});
