-- ============================================================
-- المرحلة 7: حضور الخدام + تحضير الدرس
-- داخل transaction. شغّله مرة واحدة في SQL Editor.
-- بيستخدم دوالك الموجودة: is_admin, kh_role, kh_can_class, kh_sec_manages, servant_has_class
-- مفيش أي جدول قديم بيتغيّر.
-- ============================================================
begin;

-- ---------- 1) حضور الخدام (حضور فقط: حاضر / غايب / معتذر) ----------
create table if not exists public.servant_attendance (
  id          uuid primary key default gen_random_uuid(),
  servant_id  uuid not null references public.profiles(id) on delete cascade,
  att_date    date not null,
  status      text not null check (status in ('present','absent','excused')),
  marked_by   uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (servant_id, att_date)
);
create index if not exists servant_attendance_date_idx on public.servant_attendance (att_date);

create or replace function public.kh_servant_att_guard() returns trigger
language plpgsql as $$
begin
  new.marked_by := auth.uid();   -- بيتسجّل من السيرفر، مش من الطلب
  return new;
end $$;

drop trigger if exists kh_servant_att_guard on public.servant_attendance;
create trigger kh_servant_att_guard before insert or update on public.servant_attendance
  for each row execute function public.kh_servant_att_guard();

alter table public.servant_attendance enable row level security;
revoke all on public.servant_attendance from anon;

drop policy if exists "admin all servant_attendance" on public.servant_attendance;
create policy "admin all servant_attendance" on public.servant_attendance
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- الأمين: خدام قسمه بس
drop policy if exists "sec servant_attendance" on public.servant_attendance;
create policy "sec servant_attendance" on public.servant_attendance
  for all to authenticated
  using (public.kh_role() = 'secretary' and public.kh_sec_manages(servant_id))
  with check (public.kh_role() = 'secretary' and public.kh_sec_manages(servant_id));

-- الخادم: يشوف حضوره هو بس (قراءة فقط)
drop policy if exists "servant own servant_attendance" on public.servant_attendance;
create policy "servant own servant_attendance" on public.servant_attendance
  for select to authenticated
  using (servant_id = (select auth.uid()));

-- ---------- 2) تحضير الدرس ----------
create table if not exists public.lesson_prep (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  prep_date   date not null,                       -- تاريخ الدرس
  topic       text,
  notes       text,
  status      text not null default 'todo' check (status in ('todo','doing','ready')),
  approved    boolean not null default false,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (class_id, prep_date)
);
create index if not exists lesson_prep_date_idx on public.lesson_prep (prep_date desc);

-- الاعتماد للأمين/الأدمن بس. وأي تعديل في المحتوى من خادم بيلغي الاعتماد.
create or replace function public.kh_lesson_prep_guard() returns trigger
language plpgsql as $$
declare mgr boolean := (select public.is_admin()) or public.kh_role() = 'secretary';
begin
  if tg_op = 'INSERT' then
    if not mgr then new.approved := false; end if;
    new.created_by := coalesce(new.created_by, auth.uid());
  else
    if not mgr then
      new.approved := old.approved;
      if (new.topic, new.notes, new.status) is distinct from (old.topic, old.notes, old.status) then
        new.approved := false;
      end if;
    end if;
  end if;

  if new.approved then
    if tg_op = 'INSERT' or not old.approved then
      new.approved_by := auth.uid();
      new.approved_at := now();
    else
      new.approved_by := old.approved_by;
      new.approved_at := old.approved_at;
    end if;
  else
    new.approved_by := null;
    new.approved_at := null;
  end if;

  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists kh_lesson_prep_guard on public.lesson_prep;
create trigger kh_lesson_prep_guard before insert or update on public.lesson_prep
  for each row execute function public.kh_lesson_prep_guard();

alter table public.lesson_prep enable row level security;
revoke all on public.lesson_prep from anon;

drop policy if exists "admin all lesson_prep" on public.lesson_prep;
create policy "admin all lesson_prep" on public.lesson_prep
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "sec lesson_prep" on public.lesson_prep;
create policy "sec lesson_prep" on public.lesson_prep
  for all to authenticated
  using (public.kh_role() = 'secretary' and public.kh_can_class(class_id))
  with check (public.kh_role() = 'secretary' and public.kh_can_class(class_id));

-- الخادم: يقرا ويكتب تحضير فصوله (من غير حذف)
drop policy if exists "servant lesson_prep select" on public.lesson_prep;
create policy "servant lesson_prep select" on public.lesson_prep
  for select to authenticated
  using ((select public.servant_has_class(class_id)));

drop policy if exists "servant lesson_prep insert" on public.lesson_prep;
create policy "servant lesson_prep insert" on public.lesson_prep
  for insert to authenticated
  with check ((select public.servant_has_class(class_id)));

drop policy if exists "servant lesson_prep update" on public.lesson_prep;
create policy "servant lesson_prep update" on public.lesson_prep
  for update to authenticated
  using ((select public.servant_has_class(class_id)))
  with check ((select public.servant_has_class(class_id)));

commit;

-- تحقق:  select count(*) from public.servant_attendance;  select count(*) from public.lesson_prep;  (المفروض 0 و 0)
-- الرجوع: begin; drop table public.servant_attendance; drop table public.lesson_prep;
--         drop function public.kh_servant_att_guard(); drop function public.kh_lesson_prep_guard(); commit;
