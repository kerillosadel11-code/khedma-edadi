-- ترقية فصل: نقل المخدومين النشطين من فصل لفصل في نفس القسم (أدمن، أو أمين قسمه)
create or replace function public.kh_promote_class(p_from uuid, p_to uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare a public.classes; b public.classes; me public.profiles; n integer;
begin
  select * into me from public.profiles where id = auth.uid() and active;
  select * into a from public.classes where id = p_from;
  select * into b from public.classes where id = p_to;
  if me.id is null or a.id is null or b.id is null or p_from = p_to then raise exception 'NOT_FOUND'; end if;
  if a.section is distinct from b.section then raise exception 'FORBIDDEN'; end if;
  if not (me.role = 'admin' or (me.role = 'secretary' and me.section = a.section)) then
    raise exception 'FORBIDDEN';
  end if;
  update public.servees set class_id = p_to where class_id = p_from and active;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.kh_promote_class(uuid, uuid) from public, anon;
grant execute on function public.kh_promote_class(uuid, uuid) to authenticated;
