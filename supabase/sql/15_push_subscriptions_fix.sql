-- ============================================================
-- المرحلة 15: إصلاح جدول push_subscriptions
-- الخطأ: Could not find the 'auth' column of 'push_subscriptions' in the schema cache
-- الجدول مش متعرّف في أي ملف SQL قبل كده، فبنضمن شكله الصح هنا.
-- آمن لو الجدول موجود (بيضيف الناقص بس). شغّله مرة واحدة في SQL Editor.
-- ============================================================
begin;

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null default '',
  auth       text not null default '',
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions add column if not exists id uuid default gen_random_uuid();
alter table public.push_subscriptions add column if not exists user_id uuid;
alter table public.push_subscriptions add column if not exists endpoint text;
alter table public.push_subscriptions add column if not exists p256dh text;
alter table public.push_subscriptions add column if not exists auth text;
alter table public.push_subscriptions add column if not exists created_at timestamptz default now();

-- التطبيق بيعمل upsert بـ onConflict: 'endpoint' فلازم unique
create unique index if not exists push_subscriptions_endpoint_key on public.push_subscriptions (endpoint);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;

-- كل مستخدم يدير اشتراكات أجهزته بس (send-push بيقرا بـ service role)
drop policy if exists "own push_subscriptions" on public.push_subscriptions;
create policy "own push_subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;

-- يخلّي الـ API يشوف العمود الجديد فورًا (من غير ده الخطأ بيفضل لحد ما الكاش يتحدّث)
notify pgrst, 'reload schema';

-- تحقق:
--   select column_name, is_nullable from information_schema.columns
--   where table_schema='public' and table_name='push_subscriptions' order by ordinal_position;
-- لو ظهر عمود تاني NOT NULL مش من اللي فوق، ابعتهولي.
