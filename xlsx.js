/* قراءة ملفات Excel (.xlsx) وتحميل نموذج Excel فاضي لاستيراد المخدومين — من غير أي مكتبة خارجية.
   بيتحمّل بعد app.js. القراءة بتستخدم DecompressionStream الموجود في المتصفحات الحديثة. */
(function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;
  const td = new TextDecoder('utf-8'), te = new TextEncoder();

  /* ---------- قراءة ---------- */
  async function inflate(u8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('NO_DECOMP');
    const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  function unzipIndex(buf) {
    const u = new Uint8Array(buf), dv = new DataView(buf);
    let e = -1;
    for (let i = u.length - 22; i >= Math.max(0, u.length - 65600); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('NOT_ZIP');
    const n = dv.getUint16(e + 10, true), files = {};
    let p = dv.getUint32(e + 16, true);
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('NOT_ZIP');
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true),
        el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true),
        name = td.decode(u.subarray(p + 46, p + 46 + nl));
      files[name] = { method, csize, off };
      p += 46 + nl + el + cl;
    }
    return { u, dv, files };
  }
  async function entryText(z, name) {
    const f = z.files[name];
    if (!f) return null;
    const o = f.off, start = o + 30 + z.dv.getUint16(o + 26, true) + z.dv.getUint16(o + 28, true);
    const raw = z.u.subarray(start, start + f.csize);
    return td.decode(f.method === 0 ? raw : await inflate(raw));
  }
  const unesc = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const textOf = x => {
    x = x.replace(/<rPh[\s\S]*?<\/rPh>/g, '');
    let o = '', m; const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    while ((m = re.exec(x))) o += m[1];
    return unesc(o);
  };
  const colIdx = ref => { const m = /^([A-Z]+)/i.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1].toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const attr = (a, k) => { const m = new RegExp('(?:^|\\s)' + k + '="([^"]*)"').exec(a); return m ? unesc(m[1]) : ''; };

  async function xlsxRows(buf) {
    const z = unzipIndex(buf);
    let path = 'xl/worksheets/sheet1.xml';
    const wb = await entryText(z, 'xl/workbook.xml'), rel = await entryText(z, 'xl/_rels/workbook.xml.rels');
    if (wb && rel) {
      const sh = /<sheet\b([^>]*)\/?>/.exec(wb), rid = sh ? attr(sh[1], 'r:id') : '';
      const re = /<Relationship\b([^>]*)\/?>/g; let m;
      while (rid && (m = re.exec(rel))) if (attr(m[1], 'Id') === rid) { const t = attr(m[1], 'Target'); path = t.startsWith('/') ? t.slice(1) : 'xl/' + t; break; }
    }
    const sx = await entryText(z, path);
    if (sx == null) throw new Error('NO_SHEET');
    const ss = [], sst = await entryText(z, 'xl/sharedStrings.xml');
    if (sst) { const re = /<si\b[^>]*>([\s\S]*?)<\/si>/g; let m; while ((m = re.exec(sst))) ss.push(textOf(m[1])); }
    const rows = [], rr = /<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g; let rm;
    while ((rm = rr.exec(sx))) {
      const r = []; if (!rm[1]) continue;
      const cr = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let cm, pos = 0;
      while ((cm = cr.exec(rm[1]))) {
        const a = cm[1], body = cm[2] || '', t = attr(a, 't');
        let i = colIdx(attr(a, 'r')); if (i < 0) i = pos; pos = i + 1;
        const v = /<v>([\s\S]*?)<\/v>/.exec(body);
        let val = '';
        if (t === 's') val = v ? (ss[+v[1]] || '') : '';
        else if (t === 'inlineStr') val = textOf(body);
        else if (v) val = unesc(v[1]);
        if (t === 'b') val = val === '1' ? 'TRUE' : 'FALSE';
        while (r.length < i) r.push('');
        r[i] = String(val).trim();
      }
      if (r.some(x => x)) rows.push(r);
    }
    return rows;
  }

  /* ---------- كتابة (نموذج فاضي) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zipStore(files) {
    const parts = [], cen = []; let off = 0;
    for (const [name, text] of files) {
      const nb = te.encode(name), d = te.encode(text), c = crc32(d);
      const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint32(14, c, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true); lh.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(lh.buffer), nb, d);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint32(16, c, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
      cen.push(new Uint8Array(ch.buffer), nb);
      off += 30 + nb.length + d.length;
    }
    const cs = cen.reduce((s, x) => s + x.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const HEAD = ['الاسم (ثنائي)', 'الخادم المسئول', 'رقم هاتف المخدوم (اختياري)', 'رقم هاتف الأب', 'رقم هاتف الأم', 'تاريخ الميلاد (مثال 2012-05-31)', 'العنوان', 'اسم المدرسة التابع لها', 'أب الاعتراف', 'ملاحظات (اختياري)'];
  function xlsxTemplate() {
    const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n', NS = 'http://schemas.openxmlformats.org/';
    const cells = HEAD.map((h, i) => `<c r="${'ABCDEFGHIJ'[i]}1" s="2" t="inlineStr"><is><t>${h}</t></is></c>`).join('');
    return zipStore([
      ['[Content_Types].xml', X + `<Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
      ['_rels/.rels', X + `<Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', X + `<workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><sheets><sheet name="المخدومين" sheetId="1" r:id="rId1"/></sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', X + `<Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', X + `<styleSheet xmlns="${NS}spreadsheetml/2006/main"><fonts count="2"><font><sz val="12"/><name val="Arial"/></font><font><b/><sz val="12"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3E3BD"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
      ['xl/worksheets/sheet1.xml', X + `<worksheet xmlns="${NS}spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols><col min="1" max="1" width="30" style="1" customWidth="1"/><col min="2" max="2" width="22" style="1" customWidth="1"/><col min="3" max="3" width="18" style="1" customWidth="1"/><col min="4" max="4" width="18" style="1" customWidth="1"/><col min="5" max="5" width="18" style="1" customWidth="1"/><col min="6" max="6" width="26" style="1" customWidth="1"/><col min="7" max="7" width="28" style="1" customWidth="1"/><col min="8" max="8" width="26" style="1" customWidth="1"/><col min="9" max="9" width="20" style="1" customWidth="1"/><col min="10" max="10" width="24" style="1" customWidth="1"/></cols><sheetData><row r="1">${cells}</row></sheetData></worksheet>`]
    ]);
  }
  function xlsxDownloadTemplate() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(xlsxTemplate()); a.download = 'نموذج-استيراد-المخدومين.xlsx';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  W.xlsxRows = xlsxRows; W.xlsxTemplate = xlsxTemplate; W.xlsxDownloadTemplate = xlsxDownloadTemplate;
  if (typeof document !== 'undefined') document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-x="tpl"]');
    if (b) { e.preventDefault(); xlsxDownloadTemplate(); }
  });
})();
