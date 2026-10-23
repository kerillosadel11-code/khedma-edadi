-- ============================================================
-- المرحلة 10: الافتقاد + التقارير
-- داخل transaction. شغّله مرة واحدة في SQL Editor.
-- جدول followups كان من غير واجهة، فبنوحّد قيمه عشان الواجهة الجديدة تشتغل.
-- ============================================================
begin;

-- شيل أي قيود CHECK قديمة على followups (لو فيه) وحط قيود واضحة
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.followups'::regclass and contype = 'c' loop
    execute format('alter table public.followups drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.followups alter column note drop not null;

alter table public.followups
  add constraint followups_kind_chk   check (kind   in ('call','visit','message','other')) not valid;
alter table public.followups
  add constraint followups_status_chk check (status in ('open','done')) not valid;

create index if not exists followups_servee_idx on public.followups (servee_id, followup_date desc);
create index if not exists attendance_days_date_idx on public.attendance_days (att_date);

commit;

-- تحقق:
--   select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.followups'::regclass and contype = 'c';
-- الرجوع:
--   begin; alter table public.followups drop constraint followups_kind_chk, drop constraint followups_status_chk; commit;
