-- ============================================================
-- الدفعة التانية (كل الباقي مرة واحدة):
--  (1) تقرير الاجتماع لأبونا والأمناء (نص جاهز + إشعار تلقائي بعد كل اجتماع)
--  (5) نقاط الحضور المنتظم + لوحة الشرف الشهرية
--  (6) حضور الخدام بـ QR (كل خادم عنده كود، والأمين/أبونا يمسحه)
--  (7) (ملف المخدوم الشامل والطباعة: في التطبيق بس، مفيش SQL)
--  (8) الفعاليات والرحلات + تسجيل مين جاي + تذكيرات
--  (9) تقييم الفصل الشهري
-- شغّله مرة واحدة في SQL Editor (بعد 14 و22 و23). بيستخدم دوالك: is_admin, kh_role, kh_section,
-- kh_can_class, kh_can_servee, kh_sec_manages, servant_has_class.
-- ============================================================
begin;

-- ---------- أدوات مشتركة ----------
create or replace function public.kh_sec_same_section(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles t, public.profiles me
    where t.id = p_user and t.role = 'secretary'
      and me.id = auth.uid() and me.role = 'secretary'
      and t.section is not distinct from me.section
  );
$$;
revoke all on function public.kh_sec_same_section(uuid) from public, anon;
grant execute on function public.kh_sec_same_section(uuid) to authenticated;

-- غياب متتالي للمخدوم لحد تاريخ معيّن (بنفس منطق التطبيق: اجتماعات الفصل = الأيام اللي اتسجّل فيها حضور لأي حد من الفصل)
create or replace function public.kh_servee_streak(p_servee uuid, p_date date)
returns table (streak integer, last_present date)
language plpgsql stable security definer set search_path = public as $$
declare s public.servees; first_d date; d date; st text; k integer := 0; lp date;
begin
  select * into s from public.servees where id = p_servee;
  if not found or s.class_id is null then streak := 0; last_present := null; return next; return; end if;
  select least((s.created_at at time zone 'Africa/Cairo')::date,
               (select min(att_date) from public.attendance_days where servee_id = s.id)) into first_d;
  for d in
    select distinct a.att_date from public.attendance_days a
    join public.servees x on x.id = a.servee_id
    where x.class_id = s.class_id and a.att_date <= p_date and a.att_date >= first_d
    order by 1 desc
  loop
    select status into st from public.attendance_days where servee_id = s.id and att_date = d;
    if st = 'present' then lp := d; exit; end if;
    k := k + 1;
  end loop;
  streak := k; last_present := lp; return next;
end $$;
revoke all on function public.kh_servee_streak(uuid, date) from public, anon, authenticated;

-- حضور متتالي (عكس اللي فوق)
create or replace function public.kh_calc_streak(p_servee uuid, p_date date) returns integer
language plpgsql stable security definer set search_path = public as $$
declare s public.servees; first_d date; d date; st text; k integer := 0;
begin
  select * into s from public.servees where id = p_servee;
  if not found or s.class_id is null then return 0; end if;
  select least((s.created_at at time zone 'Africa/Cairo')::date,
               (select min(att_date) from public.attendance_days where servee_id = s.id)) into first_d;
  for d in
    select distinct a.att_date from public.attendance_days a
    join public.servees x on x.id = a.servee_id
    where x.class_id = s.class_id and a.att_date <= p_date and a.att_date >= first_d
    order by 1 desc
  loop
    select status into st from public.attendance_days where servee_id = s.id and att_date = d;
    exit when st is distinct from 'present';
    k := k + 1;
  end loop;
  return k;
end $$;
revoke all on function public.kh_calc_streak(uuid, date) from public, anon, authenticated;

-- ============================================================
-- (1) تقرير الاجتماع
-- ============================================================
create table if not exists public.report_log (
  rep_date date not null, scope text not null, sent_at timestamptz not null default now(),
  primary key (rep_date, scope)
);
alter table public.report_log enable row level security;
revoke all on public.report_log from anon, authenticated;

create or replace function public.kh_report_build(p_sec text, p_date date) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  r record; txt text; cls text := ''; late text := ''; tp integer := 0; tn integer := 0;
  n_late integer := 0; n_done integer := 0; n_open integer; n_week integer; ttl text;
begin
  for r in
    select c.name, count(distinct sv.id) as n,
           count(distinct sv.id) filter (where a.status = 'present') as p
    from public.classes c
    join public.servees sv on sv.class_id = c.id and sv.active
    left join public.attendance_days a on a.servee_id = sv.id and a.att_date = p_date
    where (p_sec is null or c.section = p_sec)
    group by c.id, c.name
    having count(a.servee_id) > 0
    order by c.name
  loop
    tp := tp + r.p; tn := tn + r.n;
    cls := cls || E'\n• ' || r.name || ': ' || round(100.0 * r.p / greatest(r.n, 1)) || '% (' || r.p || ' من ' || r.n || ')';
  end loop;

  for r in
    select sv.full_name, c.name as cn, st.streak,
           (select p.full_name from public.profiles p where p.id = sv.servant_id) as resp,
           exists (select 1 from public.followups f
                   where f.servee_id = sv.id and f.created_at >= (p_date - 14)::timestamptz
                     and (f.status = 'done' or f.note is null or f.note not like '[تلقائي]%')) as fu_done
    from public.servees sv
    join public.classes c on c.id = sv.class_id
    cross join lateral public.kh_servee_streak(sv.id, p_date) st
    where sv.active and (p_sec is null or c.section = p_sec) and st.streak >= 3
    order by st.streak desc, sv.full_name
  loop
    n_late := n_late + 1;
    if r.fu_done then n_done := n_done + 1; end if;
    late := late || E'\n• ' || r.full_name || ' (' || r.cn || ') غاب ' || r.streak || ' اجتماعات · '
            || case when r.fu_done then '✅ اتفتقد' else '⏳ لسه ما اتفتقدش' end
            || case when r.resp is not null then ' · المسؤول: ' || r.resp else '' end;
  end loop;

  select count(*) into n_open from public.followups f
    join public.servees sv on sv.id = f.servee_id join public.classes c on c.id = sv.class_id
    where f.status = 'open' and (p_sec is null or c.section = p_sec);
  select count(*) into n_week from public.followups f
    join public.servees sv on sv.id = f.servee_id join public.classes c on c.id = sv.class_id
    where f.created_at >= (p_date - 7)::timestamptz and f.note not like '[تلقائي]%'
      and (p_sec is null or c.section = p_sec);

  ttl := case p_sec when 'boys' then ' · خدمة بنين' when 'girls' then ' · خدمة بنات' else '' end;
  txt := '📊 تقرير اجتماع ' || to_char(p_date, 'YYYY-MM-DD') || ttl || E'\n';
  if tn = 0 then
    txt := txt || E'\nمفيش حضور متسجّل للتاريخ ده.';
  else
    txt := txt || E'\nالحضور العام: ' || round(100.0 * tp / tn) || '% (' || tp || ' من ' || tn || ')'
           || E'\n\nحسب الفصل:' || cls;
  end if;
  txt := txt || E'\n\n⚠️ غابوا 3 اجتماعات أو أكتر (' || n_late || '):'
         || case when n_late = 0 then E'\nمفيش حد ✓' else late end
         || E'\n\n📞 الافتقاد: اتفتقد ' || n_done || ' من ' || n_late || ' · لسه ' || (n_late - n_done)
         || E'\nبنود مفتوحة: ' || n_open || ' · افتقادات اتسجّلت آخر 7 أيام: ' || n_week
         || E'\n\nخدمة إعدادي';
  return txt;
end $$;
revoke all on function public.kh_report_build(text, date) from public, anon, authenticated;

create or replace function public.kh_report_text(p_section text default null, p_date date default null)
returns text language plpgsql stable security definer set search_path = public as $$
declare sec text; d date;
begin
  if (select public.is_admin()) then sec := nullif(p_section, '');
  elsif public.kh_role() = 'secretary' then sec := public.kh_section();
  else raise exception 'FORBIDDEN'; end if;
  d := coalesce(p_date, (select max(att_date) from public.attendance_days
                         where att_date <= (now() at time zone 'Africa/Cairo')::date));
  if d is null then return 'مفيش حضور متسجّل لسه.'; end if;
  return public.kh_report_build(sec, d);
end $$;
revoke all on function public.kh_report_text(text, date) from public, anon;
grant execute on function public.kh_report_text(text, date) to authenticated;

-- إشعار تلقائي بعد كل اجتماع (آخر يوم حضور خلال يومين) لأبونا + أمين كل قسم
create or replace function public.kh_weekly_report_notify() returns integer
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Africa/Cairo')::date; d date; sec text; msg text; n integer := 0;
begin
  select max(att_date) into d from public.attendance_days where att_date between today - 2 and today;
  if d is null then return 0; end if;
  if not exists (select 1 from public.report_log where rep_date = d and scope = 'all') then
    msg := public.kh_report_build(null, d);
    insert into public.notifications (user_id, title, body)
      select id, 'تقرير اجتماع ' || to_char(d, 'YYYY-MM-DD'), msg from public.profiles where role = 'admin' and active;
    insert into public.report_log (rep_date, scope) values (d, 'all'); n := n + 1;
  end if;
  foreach sec in array array['boys', 'girls'] loop
    if not exists (select 1 from public.report_log where rep_date = d and scope = sec) then
      msg := public.kh_report_build(sec, d);
      insert into public.notifications (user_id, title, body)
        select id, 'تقرير اجتماع ' || to_char(d, 'YYYY-MM-DD'), msg
        from public.profiles where role = 'secretary' and section = sec and active;
      insert into public.report_log (rep_date, scope) values (d, sec); n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.kh_weekly_report_notify() from public, anon, authenticated;

-- ============================================================
-- (5) نقاط الحضور المنتظم + لوحة الشرف
--     كل حضور = 1 نقطة، وكل 4 حضور ورا بعض = +5 مكافأة.
-- ============================================================
create table if not exists public.streak_points (
  servee_id uuid not null references public.servees(id) on delete cascade,
  att_date  date not null,
  streak    integer not null,
  points    integer not null,
  primary key (servee_id, att_date)
);
create index if not exists streak_points_date_idx on public.streak_points (att_date);
alter table public.streak_points enable row level security;
revoke all on public.streak_points from anon;
grant select on public.streak_points to authenticated;

drop policy if exists "read streak_points" on public.streak_points;
create policy "read streak_points" on public.streak_points
  for select to authenticated
  using (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = (select auth.uid()) and pl.servee_id = streak_points.servee_id)
    or (select public.is_admin())
    or public.kh_can_servee(servee_id)
  );

create or replace function public.kh_streak_points() returns trigger
language plpgsql security definer set search_path = public as $$
declare k integer;
begin
  if new.status <> 'present' then
    delete from public.streak_points where servee_id = new.servee_id and att_date = new.att_date;
    return new;
  end if;
  k := public.kh_calc_streak(new.servee_id, new.att_date);
  if k < 1 then return new; end if;
  insert into public.streak_points (servee_id, att_date, streak, points)
  values (new.servee_id, new.att_date, k, 1 + case when k % 4 = 0 then 5 else 0 end)
  on conflict (servee_id, att_date) do update set streak = excluded.streak, points = excluded.points;
  return new;
end $$;

create or replace function public.kh_streak_points_del() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.streak_points where servee_id = old.servee_id and att_date = old.att_date;
  return old;
end $$;

drop trigger if exists kh_streak_points on public.attendance_days;
create trigger kh_streak_points after insert or update of status on public.attendance_days
  for each row execute function public.kh_streak_points();
drop trigger if exists kh_streak_points_del on public.attendance_days;
create trigger kh_streak_points_del after delete on public.attendance_days
  for each row execute function public.kh_streak_points_del();

-- حساب النقاط للحضور القديم (شغّلها مرة بعد الملف: select public.kh_rebuild_streak_points();)
create or replace function public.kh_rebuild_streak_points() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; k integer; n integer := 0;
begin
  delete from public.streak_points;
  for r in select servee_id, att_date from public.attendance_days where status = 'present' order by att_date loop
    k := public.kh_calc_streak(r.servee_id, r.att_date);
    if k >= 1 then
      insert into public.streak_points (servee_id, att_date, streak, points)
      values (r.servee_id, r.att_date, k, 1 + case when k % 4 = 0 then 5 else 0 end)
      on conflict do nothing;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.kh_rebuild_streak_points() from public, anon, authenticated;

create or replace function public.kh_honor_board(p_month date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m0 date := date_trunc('month', coalesce(p_month, current_date))::date; m1 date; out jsonb;
begin
  m1 := (m0 + interval '1 month')::date;
  select coalesce(jsonb_agg(x.j order by x.pct desc nulls last, x.nm), '[]'::jsonb) into out from (
    select c2.name as nm,
      case when c2.meetings * c2.n = 0 then null else round(100.0 * c2.pres / (c2.meetings * c2.n)) end as pct,
      jsonb_build_object(
        'class_id', c2.id, 'class_name', c2.name, 'meetings', c2.meetings, 'members', c2.n,
        'att_pct', case when c2.meetings * c2.n = 0 then null else round(100.0 * c2.pres / (c2.meetings * c2.n)) end,
        'top', (select coalesce(jsonb_agg(jsonb_build_object('name', t.full_name, 'pts', t.pts) order by t.pts desc, t.full_name), '[]'::jsonb)
                from (select v.full_name, sum(sp.points) as pts
                      from public.streak_points sp join public.servees v on v.id = sp.servee_id
                      where v.class_id = c2.id and v.active and sp.att_date >= m0 and sp.att_date < m1
                      group by v.id, v.full_name order by sum(sp.points) desc, v.full_name limit 3) t)
      ) as j
    from (
      select c.id, c.name,
        (select count(distinct a.att_date) from public.attendance_days a join public.servees v on v.id = a.servee_id
          where v.class_id = c.id and a.att_date >= m0 and a.att_date < m1) as meetings,
        (select count(*) from public.servees v where v.class_id = c.id and v.active) as n,
        (select count(*) from public.attendance_days a join public.servees v on v.id = a.servee_id
          where v.class_id = c.id and v.active and a.status = 'present' and a.att_date >= m0 and a.att_date < m1) as pres
      from public.classes c where public.kh_can_class(c.id)
    ) c2
  ) x;
  return out;
end $$;
revoke all on function public.kh_honor_board(date) from public, anon;
grant execute on function public.kh_honor_board(date) to authenticated;

-- ============================================================
-- (6) حضور الخدام بـ QR
-- ============================================================
alter table public.profiles add column if not exists qr_code text;
create unique index if not exists profiles_qr_uidx on public.profiles (qr_code) where qr_code is not null;

create or replace function public.kh_my_qr() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  select qr_code into c from public.profiles where id = auth.uid();
  if c is null then
    c := substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 16);
    update public.profiles set qr_code = c where id = auth.uid();
  end if;
  return c;
end $$;
revoke all on function public.kh_my_qr() from public, anon;
grant execute on function public.kh_my_qr() to authenticated;

create or replace function public.kh_servant_checkin(p_code text, p_date date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.profiles; was text; is_adm boolean := (select public.is_admin());
begin
  if not (is_adm or public.kh_role() = 'secretary') then raise exception 'FORBIDDEN'; end if;
  if p_date > (now() at time zone 'Africa/Cairo')::date then raise exception 'BAD_DATE'; end if;
  select * into t from public.profiles where qr_code = trim(p_code) and active;
  if not found or t.role not in ('servant', 'secretary') then raise exception 'NOT_FOUND'; end if;
  if not is_adm then
    if t.role = 'servant' and not public.kh_sec_manages(t.id) then raise exception 'FORBIDDEN'; end if;
    if t.role = 'secretary' and not public.kh_sec_same_section(t.id) then raise exception 'FORBIDDEN'; end if;
  end if;
  select status into was from public.servant_attendance where servant_id = t.id and att_date = p_date;
  insert into public.servant_attendance (servant_id, att_date, status) values (t.id, p_date, 'present')
    on conflict (servant_id, att_date) do update set status = 'present';
  return jsonb_build_object('name', t.full_name, 'role', t.role, 'already', coalesce(was = 'present', false));
end $$;
revoke all on function public.kh_servant_checkin(text, date) from public, anon;
grant execute on function public.kh_servant_checkin(text, date) to authenticated;

-- الأمين يسجّل حضور الأمناء في قسمه (وبيشوف حضوره هو)
drop policy if exists "sec secretary_attendance" on public.servant_attendance;
create policy "sec secretary_attendance" on public.servant_attendance
  for all to authenticated
  using (public.kh_role() = 'secretary' and public.kh_sec_same_section(servant_id))
  with check (public.kh_role() = 'secretary' and public.kh_sec_same_section(servant_id));
drop policy if exists "secretary own attendance" on public.servant_attendance;
create policy "secretary own attendance" on public.servant_attendance
  for select to authenticated using (servant_id = (select auth.uid()));

-- ============================================================
-- (8) الفعاليات والرحلات
-- ============================================================
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  kind       text not null default 'other' check (kind in ('trip', 'retreat', 'conference', 'other')),
  event_date date not null,
  event_time text,
  place      text,
  note       text,
  scope      text not null check (scope in ('class', 'section', 'all')),
  class_id   uuid references public.classes(id) on delete cascade,
  section    text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (scope <> 'class' or class_id is not null),
  check (scope <> 'section' or section in ('boys', 'girls'))
);
create index if not exists events_date_idx on public.events (event_date);
alter table public.events enable row level security;
revoke all on public.events from anon;

drop policy if exists "read events" on public.events;
create policy "read events" on public.events for select to authenticated using (true);
drop policy if exists "admin all events" on public.events;
create policy "admin all events" on public.events for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "sec events" on public.events;
create policy "sec events" on public.events for all to authenticated
  using (public.kh_role() = 'secretary' and (
          (scope = 'section' and section = public.kh_section())
       or (scope = 'class' and public.kh_can_class(class_id))))
  with check (public.kh_role() = 'secretary' and (
          (scope = 'section' and section = public.kh_section())
       or (scope = 'class' and public.kh_can_class(class_id))));

create table if not exists public.event_rsvps (
  event_id   uuid not null references public.events(id) on delete cascade,
  servee_id  uuid not null references public.servees(id) on delete cascade,
  status     text not null check (status in ('going', 'not_going')),
  by_user    uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (event_id, servee_id)
);
alter table public.event_rsvps enable row level security;
revoke all on public.event_rsvps from anon;
grant select on public.event_rsvps to authenticated;
drop policy if exists "read event_rsvps" on public.event_rsvps;
create policy "read event_rsvps" on public.event_rsvps for select to authenticated
  using (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = (select auth.uid()) and pl.servee_id = event_rsvps.servee_id)
    or (select public.is_admin()) or public.kh_can_servee(servee_id));

create or replace function public.kh_rsvp(p_event uuid, p_servee uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not ((select public.is_admin()) or public.kh_can_servee(p_servee)
          or exists (select 1 from public.parent_links pl where pl.parent_id = auth.uid() and pl.servee_id = p_servee)) then
    raise exception 'FORBIDDEN';
  end if;
  if not exists (select 1 from public.events where id = p_event) then raise exception 'NOT_FOUND'; end if;
  if p_status = 'clear' then
    delete from public.event_rsvps where event_id = p_event and servee_id = p_servee;
  elsif p_status in ('going', 'not_going') then
    insert into public.event_rsvps (event_id, servee_id, status, by_user) values (p_event, p_servee, p_status, auth.uid())
      on conflict (event_id, servee_id) do update set status = excluded.status, by_user = auth.uid(), updated_at = now();
  else raise exception 'BAD_STATUS'; end if;
end $$;
revoke all on function public.kh_rsvp(uuid, uuid, text) from public, anon;
grant execute on function public.kh_rsvp(uuid, uuid, text) to authenticated;

-- إشعار لأولياء الأمور (وحسابات المخدومين) لما فعالية جديدة تتضاف
create or replace function public.kh_event_notify_new() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, title, body)
  select distinct pl.parent_id, 'فعالية جديدة: ' || new.title,
         to_char(new.event_date, 'YYYY-MM-DD') || coalesce(' · ' || new.event_time, '') || coalesce(' · ' || new.place, '')
         || '. افتح «الفعاليات» وسجّل جاي ولا لأ.'
  from public.parent_links pl
  join public.servees sv on sv.id = pl.servee_id and sv.active
  join public.classes c on c.id = sv.class_id
  join public.profiles pr on pr.id = pl.parent_id and pr.active
  where new.scope = 'all'
     or (new.scope = 'section' and c.section = new.section)
     or (new.scope = 'class' and sv.class_id = new.class_id);
  return new;
end $$;
drop trigger if exists kh_event_notify_new on public.events;
create trigger kh_event_notify_new after insert on public.events
  for each row execute function public.kh_event_notify_new();

create table if not exists public.event_reminder_log (
  event_id text not null, lvl integer not null, sent_at timestamptz not null default now(),
  primary key (event_id, lvl)
);
alter table public.event_reminder_log enable row level security;
revoke all on public.event_reminder_log from anon, authenticated;

create or replace function public.kh_event_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Africa/Cairo')::date; e record; lv integer; n integer := 0;
begin
  for e in select * from public.events where event_date in (today + 1, today + 3) loop
    lv := case when e.event_date = today + 1 then 1 else 3 end;
    if exists (select 1 from public.event_reminder_log where event_id = e.id::text and lvl = lv) then continue; end if;
    insert into public.notifications (user_id, title, body)
    select distinct pl.parent_id,
           'تذكير: ' || e.title || case when lv = 1 then ' بكرة' else ' بعد 3 أيام' end,
           to_char(e.event_date, 'YYYY-MM-DD') || coalesce(' · ' || e.event_time, '') || coalesce(' · ' || e.place, '')
           || '. لو لسه ما سجّلتش جاي ولا لأ افتح «الفعاليات».'
    from public.parent_links pl
    join public.servees sv on sv.id = pl.servee_id and sv.active
    join public.classes c on c.id = sv.class_id
    join public.profiles pr on pr.id = pl.parent_id and pr.active
    where (e.scope = 'all' or (e.scope = 'section' and c.section = e.section)
           or (e.scope = 'class' and sv.class_id = e.class_id))
      and not exists (select 1 from public.event_rsvps r
                      where r.event_id = e.id and r.servee_id = sv.id and r.status = 'not_going');
    insert into public.event_reminder_log (event_id, lvl) values (e.id::text, lv);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.kh_event_reminders() from public, anon, authenticated;

-- ============================================================
-- (9) تقييم الفصل الشهري
-- ============================================================
create table if not exists public.class_reviews (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes(id) on delete cascade,
  month          date not null,
  improved       text,
  needs_followup text,
  notes          text,
  author         uuid references public.profiles(id) on delete set null,
  reviewed       boolean not null default false,
  reviewed_by    uuid references public.profiles(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (class_id, month)
);

create or replace function public.kh_class_review_guard() returns trigger
language plpgsql as $$
declare mgr boolean := (select public.is_admin()) or public.kh_role() = 'secretary';
begin
  new.month := date_trunc('month', new.month)::date;
  if tg_op = 'INSERT' then
    if not mgr then new.reviewed := false; end if;
    new.author := coalesce(auth.uid(), new.author);
  else
    if not mgr then
      new.reviewed := old.reviewed;
      if (new.improved, new.needs_followup, new.notes) is distinct from (old.improved, old.needs_followup, old.notes) then
        new.reviewed := false;
      end if;
    end if;
    new.author := coalesce(auth.uid(), old.author);
  end if;
  if new.reviewed then
    if tg_op = 'INSERT' or not old.reviewed then new.reviewed_by := auth.uid(); new.reviewed_at := now();
    else new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at; end if;
  else
    new.reviewed_by := null; new.reviewed_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists kh_class_review_guard on public.class_reviews;
create trigger kh_class_review_guard before insert or update on public.class_reviews
  for each row execute function public.kh_class_review_guard();

alter table public.class_reviews enable row level security;
revoke all on public.class_reviews from anon;
drop policy if exists "admin all class_reviews" on public.class_reviews;
create policy "admin all class_reviews" on public.class_reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "sec class_reviews" on public.class_reviews;
create policy "sec class_reviews" on public.class_reviews for all to authenticated
  using (public.kh_role() = 'secretary' and public.kh_can_class(class_id))
  with check (public.kh_role() = 'secretary' and public.kh_can_class(class_id));
drop policy if exists "servant class_reviews select" on public.class_reviews;
create policy "servant class_reviews select" on public.class_reviews for select to authenticated
  using ((select public.servant_has_class(class_id)));
drop policy if exists "servant class_reviews insert" on public.class_reviews;
create policy "servant class_reviews insert" on public.class_reviews for insert to authenticated
  with check ((select public.servant_has_class(class_id)));
drop policy if exists "servant class_reviews update" on public.class_reviews;
create policy "servant class_reviews update" on public.class_reviews for update to authenticated
  using ((select public.servant_has_class(class_id))) with check ((select public.servant_has_class(class_id)));

create table if not exists public.review_reminder_log (
  month date not null, lvl integer not null, class_id text not null default '',
  primary key (month, lvl, class_id)
);
alter table public.review_reminder_log enable row level security;
revoke all on public.review_reminder_log from anon, authenticated;

-- يوم 25: تذكير للخدام اللي فصلهم لسه ما كتبش تقييم الشهر. يوم 28: ملخص للأمناء بالفصول المتأخرة.
create or replace function public.kh_review_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Africa/Cairo')::date; m0 date := date_trunc('month', (now() at time zone 'Africa/Cairo'))::date;
  c record; n integer := 0; names text; sec text;
begin
  if extract(day from today) = 25 then
    for c in select id, name from public.classes cl
             where not exists (select 1 from public.class_reviews r where r.class_id = cl.id and r.month = m0)
    loop
      if exists (select 1 from public.review_reminder_log where month = m0 and lvl = 1 and class_id = c.id::text) then continue; end if;
      insert into public.notifications (user_id, title, body)
        select distinct cs.servant_id, 'تقييم الشهر لفصل ' || c.name,
               'لسه ما كتبتوش تقييم الشهر لفصل ' || c.name || '. افتح «تقييم الفصل» واكتب إيه اتحسن ومين محتاج متابعة.'
        from public.class_servants cs join public.profiles p on p.id = cs.servant_id and p.active
        where cs.class_id = c.id;
      insert into public.review_reminder_log (month, lvl, class_id) values (m0, 1, c.id::text);
      n := n + 1;
    end loop;
  elsif extract(day from today) = 28 then
    foreach sec in array array['boys', 'girls'] loop
      if exists (select 1 from public.review_reminder_log where month = m0 and lvl = 2 and class_id = sec) then continue; end if;
      select string_agg(cl.name, '، ' order by cl.name) into names from public.classes cl
        where cl.section = sec and not exists (select 1 from public.class_reviews r where r.class_id = cl.id and r.month = m0);
      if names is not null then
        insert into public.notifications (user_id, title, body)
          select p.id, 'فصول لسه ما كتبتش تقييم الشهر', names
          from public.profiles p where p.role = 'secretary' and p.section = sec and p.active;
        n := n + 1;
      end if;
      insert into public.review_reminder_log (month, lvl, class_id) values (m0, 2, sec);
    end loop;
  end if;
  return n;
end $$;
revoke all on function public.kh_review_reminders() from public, anon, authenticated;

commit;

-- ---------- الجدولة (pg_cron لازم يكون متفعّل: Database ← Extensions) ----------
select cron.schedule('kh-weekly-report',   '0 17 * * *', 'select public.kh_weekly_report_notify()');
select cron.schedule('kh-event-reminders', '15 5 * * *', 'select public.kh_event_reminders()');
select cron.schedule('kh-review-reminders','20 5 * * *', 'select public.kh_review_reminders()');

-- بعد التشغيل شغّل مرة واحدة عشان تتحسب نقاط الحضور القديم:
--   select public.kh_rebuild_streak_points();
-- اختبار سريع:
--   select public.kh_report_text();           -- تقرير آخر اجتماع (لازم تكون داخل بحساب أدمن، من التطبيق أسهل)
--   select public.kh_weekly_report_notify();
-- الرجوع: بيتعمل drop للجداول والدوال الجديدة (events, event_rsvps, class_reviews, streak_points, ...) والـ cron.unschedule للتلات وظايف.
