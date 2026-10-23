# خدمة إعدادي

PWA عربي (RTL) على Supabase، مستضاف على Cloudflare Workers.

## الهيكل
- `index.html` `sw.js` `manifest.json`: التطبيق نفسه (بيتنشر على Cloudflare).
- `supabase/sql/`: ملفات SQL بالترتيب (06 ثم 07 ... ثم 12). كل ملف بيتنفّذ مرة واحدة في SQL Editor.
- `supabase/functions/`: دوال Edge (ببقى النشر من لوحة Supabase، Verify JWT = OFF للتنين):
  - `accept-invite`: قبول الدعوات (أمين / خادم / ولي أمر).
  - `set-active`: إيقاف وتفعيل الحسابات وقفل الدخول.
- `.github/workflows/backup.yml`: نسخة احتياطية أسبوعية مشفّرة (محتاجة Secrets: SUPABASE_DB_URL و BACKUP_PASSPHRASE).
- `scripts/verify-backup.sh`: فحص نسخة احتياطية.

## بعد أي تعديل على التطبيق
غيّر رقم النسخة في `sw.js` (`khedma-vN`) عشان الموبايلات تاخد الجديد.
