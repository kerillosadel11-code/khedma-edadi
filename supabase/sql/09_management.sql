-- ============================================================
-- المرحلة 9: إدارة البيانات (أرشفة بدل حذف + صلاحيات الأمين الناقصة)
-- داخل transaction. شغّله مرة واحدة في SQL Editor.
-- ============================================================
begin;

-- ---------- 1) أرشفة المخدوم ----------
alter table public.servees
  add column if not exists archived_at    timestamptz,
  add column if not exists archive_reason text;

-- ---------- 2) الأمين: يقرا ويضيف ويعدّل مخدومين قسمه، لكن الحذف النهائي للأدمن بس ----------
drop policy if exists "sec servees all"    on public.servees;
drop policy if exists "sec servees select" on public.servees;
drop policy if exists "sec servees insert" on public.servees;
drop policy if exists "sec servees update" on public.servees;

create policy "sec servees select" on public.servees
  for select to authenticated
  using (kh_role() = 'secretary' and section = (select kh_section()));

create policy "sec servees insert" on public.servees
  for insert to authenticated
  with check (kh_role() = 'secretary' and section = (select kh_section()));

create policy "sec servees update" on public.servees
  for update to authenticated
  using (kh_role() = 'secretary' and section = (select kh_section()))
  with check (kh_role() = 'secretary' and section = (select kh_section()));

-- ---------- 3) الأمين: النقاط والافتقاد لمخدومين قسمه ----------
drop policy if exists "sec points read"   on public.points;
drop policy if exists "sec points insert" on public.points;
create policy "sec points read" on public.points
  for select to authenticated
  using (kh_role() = 'secretary' and kh_can_servee(servee_id));
create policy "sec points insert" on public.points
  for insert to authenticated
  with check (kh_role() = 'secretary' and kh_can_servee(servee_id));

drop policy if exists "sec followups" on public.followups;
create policy "sec followups" on public.followups
  for all to authenticated
  using (kh_role() = 'secretary' and kh_can_servee(servee_id))
  with check (kh_role() = 'secretary' and kh_can_servee(servee_id));

-- ---------- 4) فهرس للبحث بالاسم ----------
create index if not exists servees_name_idx on public.servees (full_name);

commit;

-- تحقق:
--   select policyname, cmd from pg_policies where tablename = 'servees' order by 1;
--   (لازم تلاقي sec servees select/insert/update ومفيش sec servees all)
-- الرجوع:
--   begin;
--   drop policy "sec servees select" on public.servees; drop policy "sec servees insert" on public.servees; drop policy "sec servees update" on public.servees;
--   create policy "sec servees all" on public.servees for all to authenticated
--     using (kh_role() = 'secretary' and section = (select kh_section()));
--   drop policy "sec points read" on public.points; drop policy "sec points insert" on public.points; drop policy "sec followups" on public.followups;
--   commit;
