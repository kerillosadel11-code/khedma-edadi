-- ============================================================
-- المرحلة 8: تقوية الأمان + سجل العمليات
-- داخل transaction. شغّله مرة واحدة في SQL Editor.
-- مبني على تعريفات دوالك الفعلية (kh_checkin, kh_mark, kh_mark_rest).
-- ============================================================
begin;

-- ---------- 1) دوال الحضور: ممنوع على غير المسجّلين + ممنوع تاريخ مستقبلي ----------
create or replace function public.kh_checkin(p_code text, p_date date)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare s public.servees; cn text; was text;
begin
  if p_date > (now() at time zone 'Africa/Cairo')::date then raise exception 'BAD_DATE'; end if;
  select * into s from public.servees where code = trim(p_code);
  if not found then raise exception 'NOT_FOUND'; end if;
  if not public.kh_can_servee(s.id) then raise exception 'FORBIDDEN'; end if;
  if not s.active then raise exception 'INACTIVE'; end if;
  select status into was from public.attendance_days
    where servee_id = s.id and att_date = p_date;
  insert into public.attendance_days (servee_id, att_date, status, marked_by)
    values (s.id, p_date, 'present', auth.uid())
    on conflict (servee_id, att_date)
    do update set status = 'present', marked_by = auth.uid();
  select name into cn from public.classes where id = s.class_id;
  return jsonb_build_object(
    'name', s.full_name, 'photo_path', s.photo_path,
    'class_name', cn, 'already', coalesce(was = 'present', false));
end $function$;

create or replace function public.kh_mark(p_servee uuid, p_date date, p_status text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare act boolean;
begin
  if p_date > (now() at time zone 'Africa/Cairo')::date then raise exception 'BAD_DATE'; end if;
  select active into act from public.servees where id = p_servee;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not public.kh_can_servee(p_servee) then raise exception 'FORBIDDEN'; end if;
  if not act then raise exception 'INACTIVE'; end if;
  if p_status = 'clear' then
    delete from public.attendance_days where servee_id = p_servee and att_date = p_date;
  elsif p_status in ('present','absent') then
    insert into public.attendance_days (servee_id, att_date, status, marked_by)
      values (p_servee, p_date, p_status, auth.uid())
      on conflict (servee_id, att_date)
      do update set status = excluded.status, marked_by = auth.uid();
  else
    raise exception 'BAD_STATUS';
  end if;
end $function$;

create or replace function public.kh_mark_rest(p_class uuid, p_date date)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare n integer;
begin
  if p_date > (now() at time zone 'Africa/Cairo')::date then raise exception 'BAD_DATE'; end if;
  if p_class is null or not public.kh_can_class(p_class) then
    raise exception 'FORBIDDEN';
  end if;
  with ins as (
    insert into public.attendance_days (servee_id, att_date, status, marked_by)
    select s.id, p_date, 'absent', auth.uid() from public.servees s
    where s.class_id = p_class and s.active
    on conflict (servee_id, att_date) do nothing
    returning 1)
  select count(*) into n from ins;
  return n;
end $function$;

-- الدوال دي كانت قابلة للاستدعاء من غير تسجيل دخول (anon). نقفلها.
revoke all on function public.kh_checkin(text, date)        from public, anon;
revoke all on function public.kh_mark(uuid, date, text)     from public, anon;
revoke all on function public.kh_mark_rest(uuid, date)      from public, anon;
grant execute on function public.kh_checkin(text, date)     to authenticated;
grant execute on function public.kh_mark(uuid, date, text)  to authenticated;
grant execute on function public.kh_mark_rest(uuid, date)   to authenticated;

-- ---------- 2) النقاط والافتقاد: الهوية من السيرفر مش من الطلب ----------
create or replace function public.kh_points_guard() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null then new.given_by := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists kh_points_guard on public.points;
create trigger kh_points_guard before insert on public.points
  for each row execute function public.kh_points_guard();

create or replace function public.kh_followups_guard() returns trigger
language plpgsql as $$
begin
  -- الخادم العادي ما يقدرش يسجّل افتقاد باسم خادم تاني
  if auth.uid() is not null and public.kh_role() = 'servant' then
    new.servant_id := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists kh_followups_guard on public.followups;
create trigger kh_followups_guard before insert or update on public.followups
  for each row execute function public.kh_followups_guard();

-- ---------- 3) الجلسات: الخادم يقرا ويضيف ويعدّل بس (من غير حذف) ----------
drop policy if exists "servant sessions" on public.sessions;
drop policy if exists "servant sessions select" on public.sessions;
drop policy if exists "servant sessions insert" on public.sessions;
drop policy if exists "servant sessions update" on public.sessions;
create policy "servant sessions select" on public.sessions
  for select to authenticated using ((select public.servant_has_class(class_id)));
create policy "servant sessions insert" on public.sessions
  for insert to authenticated with check ((select public.servant_has_class(class_id)));
create policy "servant sessions update" on public.sessions
  for update to authenticated
  using ((select public.servant_has_class(class_id)))
  with check ((select public.servant_has_class(class_id)));

-- ---------- 4) سجل العمليات (للأدمن بس) ----------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid,
  table_name  text not null,
  op          text not null,
  row_id      text,
  old_row     jsonb,
  new_row     jsonb
);
create index if not exists audit_log_at_idx    on public.audit_log (at desc);
create index if not exists audit_log_table_idx on public.audit_log (table_name, at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

drop policy if exists "admin read audit_log" on public.audit_log;
create policy "admin read audit_log" on public.audit_log
  for select to authenticated using ((select public.is_admin()));

create or replace function public.kh_audit() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare r jsonb;
begin
  if tg_op = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
  insert into public.audit_log (actor, table_name, op, row_id, old_row, new_row)
  values (
    auth.uid(), tg_table_name, tg_op, r->>'id',
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $function$;
revoke all on function public.kh_audit() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','servees','classes','class_servants','parent_links','invites'] loop
    execute format('drop trigger if exists kh_audit on public.%I', t);
    execute format('create trigger kh_audit after insert or update or delete on public.%I
                    for each row execute function public.kh_audit()', t);
  end loop;
end $$;

commit;

-- تحقق:
--   select count(*) from public.audit_log;   -- بيزيد مع كل تعديل على الجداول دي
-- الرجوع:
--   begin;
--   drop trigger if exists kh_audit on public.profiles; (وكذلك servees, classes, class_servants, parent_links, invites)
--   drop table public.audit_log; drop function public.kh_audit();
--   drop trigger if exists kh_points_guard on public.points; drop function public.kh_points_guard();
--   drop trigger if exists kh_followups_guard on public.followups; drop function public.kh_followups_guard();
--   commit;
