// بيطلّع دوال محددة من app.js من غير ما يشغّل التطبيق كله (الملف مش module)
const fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function extract(src, name) {
  let m = src.match(new RegExp('^function ' + name + '\\(', 'm'));
  if (m) {
    let i = src.indexOf('{', m.index), d = 0, j = i;
    for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; }
    return src.slice(m.index, j + 1);
  }
  m = src.match(new RegExp('^const ' + name + '=', 'm'));
  if (!m) throw new Error('مش لاقي ' + name);
  // الدوال/الثوابت دي في app.js سطر واحد
  const e = src.indexOf('\n', m.index);
  return src.slice(m.index, e);
}
function load(file, names, globals = {}) {
  const src = read(file), ctx = vm.createContext({ ...globals });
  vm.runInContext(names.map(n => extract(src, n)).join('\n') + '\n' + names.map(n => `this.${n}=${n};`).join(''), ctx);
  return ctx;
}
module.exports = { read, load, extract };
