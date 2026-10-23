-- ============================================================
-- المرحلة 11: دعوة ولي الأمر بلينك
-- داخل transaction. شغّله مرة واحدة في SQL Editor، وبعدها انشر دالة accept-invite الجديدة.
-- ============================================================
begin;

-- الدعوة بتتربط بمخدوم
alter table public.invites
  add column if not exists servee_id uuid references public.servees(id) on delete cascade;
create index if not exists invites_servee_idx on public.invites (servee_id);

-- وحّد قيود الدور (لو فيه CHECK قديم بيمنع 'parent')
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.invites'::regclass and contype = 'c' loop
    execute format('alter table public.invites drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.invites
  add constraint invites_role_chk check (role in ('secretary','servant','parent')) not valid;

-- الأمين: يعمل ويشوف ويعدّل دعوات أولياء أمور مخدومين قسمه بس
drop policy if exists "sec invites select parent" on public.invites;
drop policy if exists "sec invites insert parent" on public.invites;
drop policy if exists "sec invites update parent" on public.invites;

create policy "sec invites select parent" on public.invites
  for select to authenticated
  using (kh_role() = 'secretary' and role = 'parent' and servee_id is not null and kh_can_servee(servee_id));

create policy "sec invites insert parent" on public.invites
  for insert to authenticated
  with check (
    kh_role() = 'secretary' and role = 'parent' and servee_id is not null
    and kh_can_servee(servee_id) and created_by = auth.uid()
    and uses = 0 and not revoked and max_uses <= 5
    and expires_at <= (now() + interval '14 days'));

create policy "sec invites update parent" on public.invites
  for update to authenticated
  using (kh_role() = 'secretary' and role = 'parent' and servee_id is not null and kh_can_servee(servee_id))
  with check (
    kh_role() = 'secretary' and role = 'parent' and servee_id is not null
    and kh_can_servee(servee_id) and max_uses <= 5
    and expires_at <= (now() + interval '14 days'));

commit;

-- تحقق:
--   select policyname, cmd from pg_policies where tablename = 'invites' order by 1;
-- الرجوع:
--   begin;
--   drop policy "sec invites select parent" on public.invites; drop policy "sec invites insert parent" on public.invites; drop policy "sec invites update parent" on public.invites;
--   commit;
