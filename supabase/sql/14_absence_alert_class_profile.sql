-- ============================================================
-- المرحلة 14: تنبيه الغياب المتتالي + بيانات «فصلي» + ملف المخدوم
-- داخل transaction. شغّله مرة واحدة في SQL Editor (بعد 13).
--
-- 1) تريجر على attendance_days: لما مخدوم يتسجّل غايب وبقى غايب 3 اجتماعات
--    ورا بعض (بنفس منطق التطبيق: اجتماعات الفصل = الأيام اللي اتسجّل فيها حضور
--    لأي حد من الفصل)، بيعمل أوتوماتيك:
--      - بند افتقاد مفتوح (followups: call / open / ملاحظة تبدأ بـ [تلقائي])
--      - إشعار لخدام الفصل وأمين خدمة القسم (والإشعار بيوصل Push تلقائي
--        لأن webhook جدول notifications شغّال على send-push)
--    ومش بيتكرر لنفس المخدوم قبل 21 يوم.
-- 2) kh_class_servants: زمايل الخادم في الفصل (اسم + تليفون) للخدام.
-- 3) kh_servee_parents: أولياء الأمور المربوطين بالمخدوم (اسم + تليفون).
-- ============================================================
begin;

-- ---------- 1) تنبيه الغياب المتتالي ----------
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
begin
  if new.status <> 'absent' then return new; end if;

  select * into s from public.servees where id = new.servee_id;
  if not found or not s.active or s.class_id is null then return new; end if;

  -- تسجيل غياب لتاريخ قديم (فيه اجتماع أحدث للفصل) ما يفتحش تنبيه جديد
  if exists (
    select 1 from public.attendance_days a
    join public.servees x on x.id = a.servee_id
    where x.class_id = s.class_id and a.att_date > new.att_date
  ) then return new; end if;

  -- أول يوم يتحسب للمخدوم: الأقدم بين تاريخ إضافته وأول تسجيل له
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

  -- ما نكررش لنفس المخدوم خلال 21 يوم
  if exists (
    select 1 from public.followups f
    where f.servee_id = s.id and f.note like '[تلقائي]%'
      and f.followup_date >= new.att_date - 21
  ) then return new; end if;

  select * into c from public.classes where id = s.class_id;
  select max(a.att_date) into last_d from public.attendance_days a
    where a.servee_id = s.id and a.status = 'present';

  -- بند افتقاد مفتوح (يتسجّل باسم اللي سجّل الغياب)
  if actor is not null then
    insert into public.followups (servee_id, servant_id, kind, status, note, followup_date)
    values (s.id, actor, 'call', 'open',
            '[تلقائي] غاب ' || streak || ' اجتماعات ورا بعض', new.att_date);
  end if;

  msg := s.full_name || ' (' || coalesce(c.name, '') || ') غاب ' || streak
         || ' اجتماعات ورا بعض'
         || case when last_d is not null then ' · آخر حضور ' || last_d::text else '' end
         || '. افتح «الافتقاد» وتواصل معاه.';

  -- إشعار لخدام الفصل + أمين خدمة القسم
  insert into public.notifications (user_id, title, body)
  select distinct u.uid, 'محتاج افتقاد: ' || s.full_name, msg
  from (
    select cs.servant_id as uid from public.class_servants cs where cs.class_id = s.class_id
    union
    select p.id from public.profiles p
      where p.role = 'secretary' and c.section is not null and p.section = c.section
  ) u
  join public.profiles pr on pr.id = u.uid
  where pr.active;

  return new;
end $function$;

drop trigger if exists kh_absence_alert on public.attendance_days;
create trigger kh_absence_alert
  after insert or update of status on public.attendance_days
  for each row when (new.status = 'absent')
  execute function public.kh_absence_alert();

-- ---------- 2) زمايل الخادم في الفصل ----------
create or replace function public.kh_class_servants(p_class uuid)
returns table (id uuid, name text, phone text, contact_phone text)
language plpgsql security definer set search_path to 'public' as $function$
begin
  if p_class is null or not public.kh_can_class(p_class) then raise exception 'FORBIDDEN'; end if;
  return query
    select p.id, p.full_name, p.phone, p.contact_phone
    from public.class_servants cs
    join public.profiles p on p.id = cs.servant_id
    where cs.class_id = p_class and p.active
    order by p.full_name;
end $function$;

-- ---------- 3) أولياء أمور المخدوم ----------
create or replace function public.kh_servee_parents(p_servee uuid)
returns table (name text, phone text, contact_phone text)
language plpgsql security definer set search_path to 'public' as $function$
begin
  if p_servee is null or not public.kh_can_servee(p_servee) then raise exception 'FORBIDDEN'; end if;
  return query
    select p.full_name, p.phone, p.contact_phone
    from public.parent_links l
    join public.profiles p on p.id = l.parent_id
    where l.servee_id = p_servee and p.active
    order by p.full_name;
end $function$;

revoke all on function public.kh_class_servants(uuid) from public, anon;
revoke all on function public.kh_servee_parents(uuid) from public, anon;
grant execute on function public.kh_class_servants(uuid) to authenticated;
grant execute on function public.kh_servee_parents(uuid) to authenticated;

commit;

-- تحقق:
--   select tgname from pg_trigger where tgrelid = 'public.attendance_days'::regclass and not tgisinternal;
--   (لازم تلاقي kh_absence_alert)
-- الرجوع:
--   begin;
--   drop trigger kh_absence_alert on public.attendance_days;
--   drop function public.kh_absence_alert();
--   drop function public.kh_class_servants(uuid);
--   drop function public.kh_servee_parents(uuid);
--   commit;
