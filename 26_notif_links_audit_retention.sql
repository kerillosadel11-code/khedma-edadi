-- ============================================================
-- 26: (1) رابط لكل إشعار يفتح الصفحة المناسبة  (2) سجل العمليات على جداول الحضور والنقاط والمالية
--     (3) تنظيف تلقائي للجداول اللي بتكبر (push_log / notifications / audit_log)
-- شغّله مرة واحدة في SQL Editor. آمن لو اتشغّل تاني.
-- ============================================================
begin;

-- ---------- 1) رابط الإشعار ----------
alter table public.notifications add column if not exists url text;

create or replace function public.kh_notif_url() returns trigger
language plpgsql as $$
begin
  if new.url is null then
    new.url := case
      when new.title like 'محتاج افتقاد%' or new.title like 'للعلم:%' or new.title like 'تذكير افتقاد%' or new.title like 'افتقاد متأخر%' then './#tab=follow'
      when new.title like 'تقرير اجتماع%' then './#tab=rep'
      else './#tab=notif'
    end;
  end if;
  return new;
end $$;
drop trigger if exists kh_notif_url on public.notifications;
create trigger kh_notif_url before insert on public.notifications
  for each row execute function public.kh_notif_url();

-- ---------- 2) سجل العمليات على جداول إضافية (اللي موجودة بس) ----------
do $$
declare t text;
begin
  foreach t in array array['attendance_days','servant_attendance','points','followups','lesson_prep','competitions','duties','finance_tx'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists kh_audit on public.%I', t);
      execute format('create trigger kh_audit after insert or update or delete on public.%I
                      for each row execute function public.kh_audit()', t);
    end if;
  end loop;
end $$;

-- ---------- 3) تنظيف تلقائي ----------
-- بيدوّر على عمود التاريخ في الجدول (created_at أو at أو ts) وبيمسح الأقدم من عدد الأيام ده.
create or replace function public.kh_purge(p_table text, p_days int, p_extra text default null)
returns bigint language plpgsql security definer set search_path to 'public' as $$
declare col text; n bigint;
begin
  if to_regclass('public.' || p_table) is null then return 0; end if;
  select column_name into col from information_schema.columns
   where table_schema = 'public' and table_name = p_table and column_name in ('created_at','at','ts','sent_at')
   order by array_position(array['created_at','at','ts','sent_at'], column_name::text) limit 1;
  if col is null then return 0; end if;
  execute format('delete from public.%I where %I < now() - make_interval(days => $1)%s', p_table, col,
                 case when p_extra is null then '' else ' and (' || p_extra || ')' end) using p_days;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.kh_purge(text, int, text) from public, anon, authenticated;

create or replace function public.kh_cleanup() returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  perform public.kh_purge('push_log', 30);
  perform public.kh_purge('notify_log', 90);
  perform public.kh_purge('notifications', 90, 'is_read');       -- المقروءة بعد 90 يوم
  perform public.kh_purge('notifications', 180);                 -- أي إشعار بعد 6 شهور
  perform public.kh_purge('audit_log', 365);                     -- سجل العمليات سنة
end $$;
revoke all on function public.kh_cleanup() from public, anon, authenticated;

select cron.schedule('kh-cleanup', '30 0 * * *', 'select public.kh_cleanup()');

commit;

-- تحقق:
--   select public.kh_cleanup();
--   select tgname, tgrelid::regclass from pg_trigger where tgname = 'kh_audit' order by 2;
-- الرجوع:
--   select cron.unschedule('kh-cleanup'); drop function public.kh_cleanup(); drop function public.kh_purge(text,int,text);
--   drop trigger if exists kh_notif_url on public.notifications; drop function public.kh_notif_url();
--   (والـ triggers: drop trigger kh_audit on <الجدول>)
