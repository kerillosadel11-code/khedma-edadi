-- ============================================================
-- حذف حساب (خادم / أمين / ولي أمر) نهائياً من التطبيق.
-- الأدمن: أي حساب غير أدمن وغير نفسه. الأمين: الخدام اللي في قسمه بس.
-- شغّله مرة واحدة في SQL Editor.
-- ============================================================
begin;

create or replace function public.kh_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t public.profiles;
begin
  select * into t from public.profiles where id = p_user;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_user = auth.uid() then raise exception 'FORBIDDEN'; end if;
  if (select public.is_admin()) then
    if t.role = 'admin' then raise exception 'FORBIDDEN'; end if;
  elsif public.kh_role() = 'secretary' then
    if t.role <> 'servant' or not public.kh_sec_manages(p_user) then raise exception 'FORBIDDEN'; end if;
  else
    raise exception 'FORBIDDEN';
  end if;

  delete from public.class_servants where servant_id = p_user;
  delete from public.parent_links   where parent_id  = p_user;
  delete from public.profiles       where id = p_user;
  delete from auth.users            where id = p_user;
end $$;

revoke all on function public.kh_delete_user(uuid) from public, anon;
grant execute on function public.kh_delete_user(uuid) to authenticated;

commit;
-- الرجوع: drop function public.kh_delete_user(uuid);
