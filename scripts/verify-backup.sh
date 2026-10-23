#!/usr/bin/env bash
# فحص نسخة احتياطية: بيفك التشفير وبيعرض عدد الصفوف في كل جدول مهم.
# الاستخدام:  ./scripts/verify-backup.sh backup-2026-10-30.tar.gpg
# محتاج: gpg و pg_restore (postgresql-client) على جهازك.
set -euo pipefail
f="${1:?usage: verify-backup.sh <backup.tar.gpg>}"
read -rsp "Passphrase: " P; echo
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
printf %s "$P" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 -d "$f" | tar -xC "$tmp"

tables=(profiles servees classes class_servants parent_links attendance_days servant_attendance lesson_prep followups points competitions invites notifications announcements audit_log)
missing=0
printf '%-22s %s\n' "الجدول" "عدد الصفوف"
for t in "${tables[@]}"; do
  if ! pg_restore --list "$tmp/public.dump" | grep -q " TABLE public $t "; then
    printf '%-22s %s\n' "$t" "ناقص!"; missing=1; continue
  fi
  n="$(pg_restore -f - --data-only -t "$t" "$tmp/public.dump" 2>/dev/null \
      | awk -v pat="^COPY public\\\\.$t " '$0 ~ pat {c=1; next} c && $0=="\\." {c=0} c {n++} END {print n+0}')"
  printf '%-22s %s\n' "$t" "$n"
done
u="$(pg_restore -f - --data-only -n auth -t users "$tmp/auth.dump" 2>/dev/null | awk '/^COPY auth\.users /{c=1;next} c&&$0=="\\."{c=0} c{n++} END{print n+0}')"
printf '%-22s %s\n' "auth.users" "$u"
[ "$missing" = 0 ] && echo "✓ النسخة سليمة ومقروءة" || { echo "✗ فيه جداول ناقصة"; exit 1; }
