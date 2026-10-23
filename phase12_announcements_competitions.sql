-- ============================================================
-- المرحلة 12: الإعلانات والإشعارات + المسابقات والنقاط
-- داخل transaction. شغّله مرة واحدة في SQL Editor.
-- ============================================================
begin;

-- ---------- 1) الإعلانات ----------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  scope      text not null check (scope in ('class','section','all')),
  class_id   uuid references public.classes(id) on delete set null,
  section    text,
  sent_by    uuid references public.profiles(id) on delete set null default auth.uid(),
  sent_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
revoke all on public.announcements from anon;

drop policy if exists "admin all announcements" on public.announcements;
create policy "admin all announcements" on public.announcements
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "sec own announcements" on public.announcements;
create policy "sec own announcements" on public.announcements
  for select to authenticated
  using (kh_role() = 'secretary' and sent_by = (select auth.uid()));

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- الإرسال بيتم من الدالة دي بس (بتحدد المستلمين من السيرفر)
create or replace function public.kh_announce(
  p_title text, p_body text, p_scope text,
  p_class uuid default null, p_section text default null)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare v_role text := public.kh_role(); v_sec text; n integer; v_title text := left(trim(coalesce(p_title,'')), 100);
        v_body text := nullif(left(trim(coalesce(p_body,'')), 1000), '');
begin
  if v_role not in ('admin','secretary') then raise exception 'FORBIDDEN'; end if;
  if v_title = '' then raise exception 'BAD_TITLE'; end if;

  if p_scope = 'class' then
    if p_class is null or not public.kh_can_class(p_class) then raise exception 'FORBIDDEN'; end if;
  elsif p_scope = 'section' then
    if v_role = 'secretary' then v_sec := public.kh_section(); else v_sec := p_section; end if;
    if v_sec not in ('boys','girls') then raise exception 'BAD_SECTION'; end if;
  elsif p_scope = 'all' then
    if v_role <> 'admin' then raise exception 'FORBIDDEN'; end if;
  else
    raise exception 'BAD_SCOPE';
  end if;

  with targets as (
    select distinct t.u as uid
    from (
      select cs.servant_id as u from public.class_servants cs where p_scope = 'class' and cs.class_id = p_class
      union all
      select pl.parent_id from public.parent_links pl join public.servees s on s.id = pl.servee_id
        where p_scope = 'class' and s.class_id = p_class
      union all
      select cs.servant_id from public.class_servants cs join public.classes c on c.id = cs.class_id
        where p_scope = 'section' and c.section = v_sec
      union all
      select pl.parent_id from public.parent_links pl join public.servees s on s.id = pl.servee_id
        where p_scope = 'section' and s.section = v_sec
      union all
      select p.id from public.profiles p where p_scope = 'section' and p.role = 'secretary' and p.section = v_sec
      union all
      select p.id from public.profiles p where p_scope = 'all'
    ) t
    join public.profiles pr on pr.id = t.u
    where pr.active and t.u is distinct from auth.uid()
  ), ins as (
    insert into public.notifications (user_id, title, body)
    select uid, v_title, v_body from targets
    returning 1)
  select count(*) into n from ins;

  insert into public.announcements (title, body, scope, class_id, section, sent_by, sent_count)
  values (v_title, v_body, p_scope, case when p_scope = 'class' then p_class end,
          case when p_scope = 'section' then v_sec end, auth.uid(), n);
  return n;
end $function$;

revoke all on function public.kh_announce(text, text, text, uuid, text) from public, anon;
grant execute on function public.kh_announce(text, text, text, uuid, text) to authenticated;

-- ---------- 2) المسابقات: القراءة للمسجّلين بس، والأمين يدير مسابقات فصول قسمه ----------
drop policy if exists "all read competitions" on public.competitions;
create policy "all read competitions" on public.competitions
  for select to authenticated using (true);

drop policy if exists "sec competitions" on public.competitions;
create policy "sec competitions" on public.competitions
  for all to authenticated
  using (kh_role() = 'secretary' and class_id is not null and kh_can_class(class_id))
  with check (kh_role() = 'secretary' and class_id is not null and kh_can_class(class_id));

-- ---------- 3) النقاط: حد أقصى 50 للعملية لغير الأدمن + المسابقة لازم تكون لفصل المخدوم ----------
create or replace function public.kh_points_guard() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is not null then
    new.given_by := auth.uid();
    if new.points = 0 or (abs(new.points) > 50 and not public.is_admin()) then
      raise exception 'BAD_POINTS';
    end if;
  end if;
  if new.competition_id is not null and exists (
       select 1 from public.competitions c join public.servees s on s.id = new.servee_id
       where c.id = new.competition_id and c.class_id is not null and c.class_id is distinct from s.class_id) then
    raise exception 'BAD_COMP';
  end if;
  return new;
end $function$;

commit;

-- تحقق:
--   select policyname, cmd from pg_policies where tablename in ('announcements','competitions') order by 1;
-- الرجوع: begin; drop function public.kh_announce(text,text,text,uuid,text); drop table public.announcements;
--   drop policy "sec competitions" on public.competitions; commit;
