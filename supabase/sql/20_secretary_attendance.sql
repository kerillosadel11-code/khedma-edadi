-- ============================================================
-- حضور أمناء الخدمة: الأمين يسجّل حضور الأمناء في قسمه (والأدمن عنده صلاحية أصلاً)
-- شغّله مرة واحدة في SQL Editor.
-- ============================================================
begin;

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

drop policy if exists "sec secretary_attendance" on public.servant_attendance;
create policy "sec secretary_attendance" on public.servant_attendance
  for all to authenticated
  using (public.kh_role() = 'secretary' and public.kh_sec_same_section(servant_id))
  with check (public.kh_role() = 'secretary' and public.kh_sec_same_section(servant_id));

-- الأمين يشوف حضوره هو
drop policy if exists "secretary own attendance" on public.servant_attendance;
create policy "secretary own attendance" on public.servant_attendance
  for select to authenticated using (servant_id = (select auth.uid()));

commit;
-- الرجوع: drop policy "sec secretary_attendance" on public.servant_attendance; drop policy "secretary own attendance" on public.servant_attendance; drop function public.kh_sec_same_section(uuid);
