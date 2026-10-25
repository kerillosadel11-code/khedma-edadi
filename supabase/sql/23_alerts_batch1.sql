-- ============================================================
-- دفعة التنبيهات:
--  (2) خادم مسؤول واحد: تنبيه الغياب بيروح له هو، والباقي (خدام الفصل + الأمين) بيوصلهم «للعلم».
--      لو المخدوم ملوش خادم مسؤول، التنبيه بيروح لكل خدام الفصل + الأمين زي الأول.
--  (3) تذكير الافتقاد المتأخر: بند افتقاد مفتوح 3 أيام من غير تسجيل بعده ← تذكير للمسؤول،
--      وبعد 7 أيام ← للأمين كمان. كل تذكير بيتبعت مرة واحدة بس.
--  (4) تهنئة عيد الميلاد: قبلها بيوم للخادم المسؤول (ومعاها رسالة واتساب جاهزة)، ويوم العيد لأولياء الأمور.
-- شغّله مرة واحدة في SQL Editor (بعد 14، ويفضّل بعد 22).
-- التذكيرات والتهاني بتتبعت كل يوم الساعة 8 الصبح تقريباً بتوقيت مصر من pg_cron
-- (لازم تكون Extension pg_cron متفعّلة من Database ← Extensions).
-- ============================================================
begin;

-- ---------- (2) تنبيه الغياب بخادم مسؤول ----------
create or replace function public.kh_absence_alert() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare
  th      constant integer := 3;
  s       public.servees;
  c       public.classes;
  first_d date;
  d       date;
  st      text;
  streak  integer := 0;
  actor   uuid := auth.uid();
  last_d  date;
  msg     text;
  rid     uuid;
  rname   text;
begin
  if new.status <> 'absent' then return new; end if;

  select * into s from public.servees where id = new.servee_id;
  if not found or not s.active or s.class_id is null then return new; end if;

  if exists (
    select 1 from public.attendance_days a
    join public.servees x on x.id = a.servee_id
    where x.class_id = s.class_id and a.att_date > new.att_date
  ) then return new; end if;

  select least((s.created_at at time zone 'Africa/Cairo')::date,
               (select min(att_date) from public.attendance_days where servee_id = s.id))
    into first_d;

  for d in
    select distinct a.att_date
    from public.attendance_days a
    join public.servees x on x.id = a.servee_id
    where x.class_id = s.class_id and a.att_date <= new.att_date and a.att_date >= first_d
    order by a.att_date desc
  loop
    select status into st from public.attendance_days where servee_id = s.id and att_date = d;
    exit when st = 'present';
    streak := streak + 1;
  end loop;

  if streak < th then return new; end if;

  if exists (
    select 1 from public.followups f
    where f.servee_id = s.id and f.note like '[تلقائي]%'
      and f.followup_date >= new.att_date - 21
  ) then return new; end if;

  select * into c from public.classes where id = s.class_id;
  select max(a.att_date) into last_d from public.attendance_days a
    where a.servee_id = s.id and a.status = 'present';

  -- الخادم المسؤول (لو موجود ومفعّل)
  select p.id, p.full_name into rid, rname
    from public.profiles p where p.id = s.servant_id and p.active;

  if coalesce(rid, actor) is not null then
    insert into public.followups (servee_id, servant_id, kind, status, note, followup_date)
    values (s.id, coalesce(rid, actor), 'call', 'open',
            '[تلقائي] غاب ' || streak || ' اجتماعات ورا بعض', new.att_date);
  end if;

  msg := s.full_name || ' (' || coalesce(c.name, '') || ') غاب ' || streak
         || ' اجتماعات ورا بعض'
         || case when last_d is not null then ' · آخر حضور ' || last_d::text else '' end;

  if rid is not null then
    -- المسؤول: تنبيه مطلوب منه تصرّف
    insert into public.notifications (user_id, title, body)
    values (rid, 'محتاج افتقاد: ' || s.full_name, msg || '. أنت المسؤول عن افتقاده، افتح «الافتقاد» وتواصل معاه.');
    -- الباقي: للعلم بس
    insert into public.notifications (user_id, title, body)
    select distinct u.uid, 'للعلم: ' || s.full_name || ' غايب', msg || '. الخادم المسؤول عن افتقاده: ' || rname || '.'
    from (
      select cs.servant_id as uid from public.class_servants cs where cs.class_id = s.class_id
      union
      select p.id from public.profiles p
        where p.role = 'secretary' and c.section is not null and p.section = c.section
    ) u
    join public.profiles pr on pr.id = u.uid
    where pr.active and u.uid <> rid;
  else
    insert into public.notifications (user_id, title, body)
    select distinct u.uid, 'محتاج افتقاد: ' || s.full_name, msg || '. افتح «الافتقاد» وتواصل معاه.'
    from (
      select cs.servant_id as uid from public.class_servants cs where cs.class_id = s.class_id
      union
      select p.id from public.profiles p
        where p.role = 'secretary' and c.section is not null and p.section = c.section
    ) u
    join public.profiles pr on pr.id = u.uid
    where pr.active;
  end if;

  return new;
end $function$;

-- ---------- (3) تذكير الافتقاد المتأخر ----------
create table if not exists public.followup_reminders (
  followup_id text not null,
  level       integer not null,
  sent_at     timestamptz not null default now(),
  primary key (followup_id, level)
);
alter table public.followup_reminders enable row level security;
revoke all on public.followup_reminders from anon, authenticated;

create or replace function public.kh_followup_reminders() returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare
  today date := (now() at time zone 'Africa/Cairo')::date;
  f record; s public.servees; c public.classes;
  lvl integer; days integer; n integer := 0; rname text;
begin
  for f in
    select fu.* from public.followups fu
    where fu.status = 'open' and fu.followup_date <= today - 3
      and not exists (  -- لو اتسجّل أي افتقاد بعده يبقى اتعامل معاه
        select 1 from public.followups o
        where o.servee_id = fu.servee_id and o.id <> fu.id and o.created_at > fu.created_at)
  loop
    days := today - f.followup_date;
    select * into s from public.servees where id = f.servee_id;
    if not found or not s.active then continue; end if;
    select * into c from public.classes where id = s.class_id;
    select p.full_name into rname from public.profiles p where p.id = s.servant_id and p.active;

    for lvl in 1..2 loop
      if (lvl = 1 and days < 3) or (lvl = 2 and days < 7) then continue; end if;
      if exists (select 1 from public.followup_reminders r where r.followup_id = f.id::text and r.level = lvl) then continue; end if;

      if lvl = 1 then
        insert into public.notifications (user_id, title, body)
        select distinct u.uid, 'تذكير افتقاد: ' || s.full_name,
               'بند الافتقاد مفتوح من ' || days || ' أيام من غير ما يتسجّل اتصال أو زيارة. افتح «الافتقاد» وسجّل.'
        from (
          select s.servant_id as uid where s.servant_id is not null
          union
          select cs.servant_id from public.class_servants cs
            where cs.class_id = s.class_id and s.servant_id is null
        ) u join public.profiles pr on pr.id = u.uid where pr.active;
      else
        insert into public.notifications (user_id, title, body)
        select distinct u.uid, 'افتقاد متأخر: ' || s.full_name,
               'بند الافتقاد مفتوح من ' || days || ' أيام.'
               || case when rname is not null then ' الخادم المسؤول: ' || rname || '.' else '' end
        from (
          select p.id as uid from public.profiles p
            where p.role = 'secretary' and c.section is not null and p.section = c.section
          union
          select s.servant_id where s.servant_id is not null
        ) u join public.profiles pr on pr.id = u.uid where pr.active;
      end if;

      insert into public.followup_reminders (followup_id, level) values (f.id::text, lvl);
      n := n + 1;
    end loop;
  end loop;
  return n;
end $function$;

-- ---------- (4) تهنئة عيد الميلاد ----------
create table if not exists public.birthday_log (
  servee_id text not null,
  yr        integer not null,
  kind      text not null,
  sent_at   timestamptz not null default now(),
  primary key (servee_id, yr, kind)
);
alter table public.birthday_log enable row level security;
revoke all on public.birthday_log from anon, authenticated;

create or replace function public.kh_birthday_alerts() returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare
  d date := (now() at time zone 'Africa/Cairo')::date;
  cur_yr integer := extract(year from (now() at time zone 'Africa/Cairo'))::integer;
  s record; n integer := 0; fn text; yrs integer;
begin
  -- بكرة: للخادم المسؤول (أو خدام الفصل لو مفيش مسؤول)
  for s in
    select sv.* from public.servees sv
    where sv.active and sv.birth_date is not null
      and to_char(sv.birth_date, 'MM-DD') = to_char(d + 1, 'MM-DD')
      and not exists (select 1 from public.birthday_log b where b.servee_id = sv.id::text and b.yr = cur_yr and b.kind = 'servant')
  loop
    fn := split_part(s.full_name, ' ', 1);
    yrs := extract(year from age(d + 1, s.birth_date))::integer;
    insert into public.notifications (user_id, title, body)
    select distinct u.uid, 'بكرة عيد ميلاد ' || s.full_name,
           'بكرة عيد ميلاد ' || s.full_name || ' (' || yrs || ' سنة). رسالة جاهزة تبعتها له: «كل سنة وانت طيب يا ' || fn
           || '، ربنا يفرّح قلبك ويحفظك ويبارك في حياتك. خدمة إعدادي»'
    from (
      select s.servant_id as uid where s.servant_id is not null
      union
      select cs.servant_id from public.class_servants cs
        where cs.class_id = s.class_id and s.servant_id is null
    ) u join public.profiles pr on pr.id = u.uid where pr.active;
    insert into public.birthday_log (servee_id, yr, kind) values (s.id::text, cur_yr, 'servant');
    n := n + 1;
  end loop;

  -- النهاردة: أولياء الأمور (والمخدوم نفسه لو عنده حساب)
  for s in
    select sv.* from public.servees sv
    where sv.active and sv.birth_date is not null
      and to_char(sv.birth_date, 'MM-DD') = to_char(d, 'MM-DD')
      and not exists (select 1 from public.birthday_log b where b.servee_id = sv.id::text and b.yr = cur_yr and b.kind = 'parent')
  loop
    fn := split_part(s.full_name, ' ', 1);
    insert into public.notifications (user_id, title, body)
    select pl.parent_id,
           case when to_jsonb(pr)->>'self_servee_id' = s.id::text then 'كل سنة وانت طيب يا ' || fn || ' 🎂'
                else 'النهاردة عيد ميلاد ' || fn || ' 🎂' end,
           case when to_jsonb(pr)->>'self_servee_id' = s.id::text
                then 'خدمة إعدادي كلها بتتمنالك سنة مليانة فرح وبركة. ربنا يحفظك.'
                else 'كل سنة وابنكم ' || fn || ' طيب، ربنا يحفظه ويبارك في حياته. خدمة إعدادي بتهنّيكم.' end
    from public.parent_links pl join public.profiles pr on pr.id = pl.parent_id
    where pl.servee_id = s.id and pr.active;
    insert into public.birthday_log (servee_id, yr, kind) values (s.id::text, cur_yr, 'parent');
    n := n + 1;
  end loop;
  return n;
end $function$;

revoke all on function public.kh_followup_reminders() from public, anon, authenticated;
revoke all on function public.kh_birthday_alerts() from public, anon, authenticated;

commit;

-- ---------- الجدولة اليومية (5 صباحاً UTC = 8 صباحاً صيفي / 7 شتوي بتوقيت مصر) ----------
-- لو pg_cron مش متفعّل هيطلع خطأ هنا: فعّله من Database ← Extensions وشغّل السطرين دول لوحدهم.
select cron.schedule('kh-followup-reminders', '0 5 * * *', 'select public.kh_followup_reminders()');
select cron.schedule('kh-birthday-alerts',    '5 5 * * *', 'select public.kh_birthday_alerts()');

-- اختبار يدوي (بيرجّع عدد التنبيهات اللي اتبعتت):
--   select public.kh_followup_reminders();
--   select public.kh_birthday_alerts();
-- الرجوع:
--   select cron.unschedule('kh-followup-reminders'); select cron.unschedule('kh-birthday-alerts');
--   drop function public.kh_followup_reminders(); drop function public.kh_birthday_alerts();
--   drop table public.followup_reminders; drop table public.birthday_log;
--   (ودالة kh_absence_alert القديمة ترجع بإعادة تشغيل ملف 14)
