-- ============================================================
-- دعوات واتساب: جدول الدعوات + عمود pending للخدام اللي مستنيين موافقة الأمين
-- داخل transaction. شغّله مرة واحدة في SQL Editor.
-- ============================================================
begin;

alter table public.profiles add column if not exists pending boolean not null default false;

create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null unique,                       -- SHA-256 للتوكن (التوكن نفسه مابيتخزنش)
  role        text not null check (role in ('secretary','servant')),
  section     text check (section in ('boys','girls')),
  class_id    uuid references public.classes(id) on delete cascade,
  created_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz not null,
  max_uses    integer not null default 1 check (max_uses between 1 and 50),
  uses        integer not null default 0,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint invites_shape check (
    (role = 'secretary' and section is not null and class_id is null)
    or (role = 'servant' and class_id is not null))
);

alter table public.invites enable row level security;

drop policy if exists "admin all invites" on public.invites;
create policy "admin all invites" on public.invites
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- الأمين: دعوات خدام لفصول قسمه بس
drop policy if exists "sec invites select" on public.invites;
create policy "sec invites select" on public.invites
  for select to authenticated
  using (public.kh_role() = 'secretary' and role = 'servant' and public.kh_can_class(class_id));

drop policy if exists "sec invites insert" on public.invites;
create policy "sec invites insert" on public.invites
  for insert to authenticated
  with check (
    public.kh_role() = 'secretary' and role = 'servant'
    and public.kh_can_class(class_id)
    and created_by = auth.uid()
    and uses = 0 and not revoked
    and max_uses <= 50
    and expires_at <= now() + interval '14 days');

drop policy if exists "sec invites update" on public.invites;
create policy "sec invites update" on public.invites
  for update to authenticated
  using (public.kh_role() = 'secretary' and role = 'servant' and public.kh_can_class(class_id))
  with check (
    public.kh_role() = 'secretary' and role = 'servant' and public.kh_can_class(class_id)
    and max_uses <= 50 and expires_at <= now() + interval '14 days');

commit;

-- تحقق:  select count(*) from public.invites;   (المفروض 0)
-- الرجوع: begin; drop table public.invites; alter table public.profiles drop column pending; commit;
