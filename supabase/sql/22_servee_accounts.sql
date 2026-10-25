-- ============================================================
-- حساب دخول للمخدوم نفسه (يشوف حضوره ونقاطه والإعلانات والمسابقات).
-- الحساب بيتبنى على نفس نظام ولي الأمر (role = parent + ربط بالمخدوم)،
-- وعمود self_servee_id بيفرّق إن الحساب للمخدوم نفسه.
-- شغّله مرة واحدة في SQL Editor، وبعدها انشر دالة create-user الجديدة.
-- ============================================================
begin;

alter table public.profiles
  add column if not exists self_servee_id uuid references public.servees(id) on delete cascade;
create unique index if not exists profiles_self_servee_uidx
  on public.profiles (self_servee_id) where self_servee_id is not null;

-- المخدوم ما يظهرش كـ«ولي أمر» لنفسه
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
      and p.self_servee_id is distinct from p_servee
    order by p.full_name;
end $function$;

commit;
-- الرجوع: بس لو مفيش حسابات مخدومين: alter table public.profiles drop column self_servee_id;
