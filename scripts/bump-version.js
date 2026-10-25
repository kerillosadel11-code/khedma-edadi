// بيرفع رقم النسخة في sw.js و version.json مرة واحدة (بيتنادى من GitHub Action أو يدوي: node scripts/bump-version.js [نص-النسخة])
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const d = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, '');
const ver = process.argv[2] || d;
const swp = path.join(root, 'sw.js');
let sw = fs.readFileSync(swp, 'utf8');
if (!/const V='khedma-[^']*';/.test(sw)) { console.error('مش لاقي سطر const V في sw.js'); process.exit(1); }
sw = sw.replace(/const V='khedma-[^']*';/, `const V='khedma-${ver}';`);
fs.writeFileSync(swp, sw);
fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ v: ver }) + '\n');
console.log('version =', ver);
