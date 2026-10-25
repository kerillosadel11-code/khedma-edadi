#!/usr/bin/env bash
# بيطلّع baseline كامل للـ schema (الجداول والدوال والـ policies والـ triggers) من قاعدة البيانات الحالية،
# عشان تقدر تبني المشروع من الصفر حتى لو ملفات 01-05 و16-19 مش موجودة.
# الاستخدام:  SUPABASE_DB_URL='postgresql://...' ./scripts/dump-schema.sh
# (نفس الرابط اللي بتستخدمه في GitHub Secrets: Session pooler بورت 5432). محتاج pg_dump 17.
# الناتج: supabase/sql/00_baseline_schema.sql  (من غير بيانات). ارفعه على GitHub مرة واحدة.
set -euo pipefail
: "${SUPABASE_DB_URL:?اضبط SUPABASE_DB_URL}"
out="supabase/sql/00_baseline_schema.sql"
pg_dump "$SUPABASE_DB_URL" --schema=public --schema-only --no-owner --no-privileges --no-comments > "$out"
echo "اتكتب $out ($(wc -l < "$out") سطر)"
echo "تذكير: ده schema بس. البيانات والصور ليها نسخها الاحتياطية."
