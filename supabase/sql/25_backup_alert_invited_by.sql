-- ============================================================
-- (1) تنبيه نتيجة النسخة الاحتياطية الأسبوعية لأبونا (نجحت / فشلت) كإشعار في التطبيق.
-- (2) تسجيل مين عمل لينك الدعوة لكل حساب اتسجّل بنفسه (invited_by) وإظهاره في «المستخدمين».
-- شغّله مرة واحدة في SQL Editor.
-- السر اللي تحت لازم يتحط كمان في GitHub كـ Secret باسم BACKUP_REPORT_SECRET (نفس القيمة بالظبط).
-- ============================================================
begin;

create table if not exists public.backup_config (id integer primary key check (id = 1), secret text not null);
alter table public.backup_config enable row level security;
revoke all on public.backup_config from anon, authenticated;
insert into public.backup_config (id, secret) values (1, 'hGfbf8vZWa8_YAvGBO5iXSxMt5W_Q516L0_inDNHnds')
  on conflict (id) do update set secret = excluded.secret;

create table if not exists public.backup_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  ok boolean not null,
  msg text
);
alter table public.backup_log enable row level security;
revoke all on public.backup_log from anon, authenticated;
grant select on public.backup_log to authenticated;
drop policy if exists "admin read backup_log" on public.backup_log;
create policy "admin read backup_log" on public.backup_log for select to authenticated
  using ((select public.is_admin()));

create or replace function public.kh_backup_report(p_secret text, p_ok boolean, p_msg text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select secret from public.backup_config where id = 1) then
    raise exception 'FORBIDDEN';
  end if;
  insert into public.backup_log (ok, msg) values (p_ok, left(p_msg, 500));
  insert into public.notifications (user_id, title, body)
  select id,
         case when p_ok then '✅ النسخة الاحتياطية الأسبوعية نجحت' else '⚠️ النسخة الاحتياطية الأسبوعية فشلت' end,
         case when p_ok then 'اتحفظت نسخة مشفّرة من البيانات. تلاقيها في GitHub ← Actions ← آخر تشغيل ← db-backup.'
              else 'افتح GitHub ← Actions ← Weekly DB backup وشوف سبب الفشل، وبعدين شغّله تاني بزرار Run workflow.' end
  from public.profiles where role = 'admin' and active;
end $$;
revoke all on function public.kh_backup_report(text, boolean, text) from public;
grant execute on function public.kh_backup_report(text, boolean, text) to anon, authenticated;

-- مين عمل لينك الدعوة
alter table public.profiles add column if not exists invited_by uuid references public.profiles(id) on delete set null;

commit;
-- الرجوع: drop function public.kh_backup_report(text,boolean,text); drop table public.backup_log; drop table public.backup_config;
--         alter table public.profiles drop column invited_by;
