-- اختبارات أمان أساسية بـ pgTAP.  التشغيل:  supabase test db   (أو من SQL Editor بعد create extension pgtap)
-- مبنية على الدوال والجداول اللي في 08_security_hardening.sql و26_notif_links_audit_retention.sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- دوال الحضور مقفولة على غير المسجّلين
select ok(not has_function_privilege('anon', 'public.kh_checkin(text,date)', 'execute'), 'anon مايقدرش kh_checkin');
select ok(not has_function_privilege('anon', 'public.kh_mark(uuid,date,text)', 'execute'), 'anon مايقدرش kh_mark');
select ok(not has_function_privilege('anon', 'public.kh_mark_rest(uuid,date)', 'execute'), 'anon مايقدرش kh_mark_rest');
select ok(has_function_privilege('authenticated', 'public.kh_mark(uuid,date,text)', 'execute'), 'المسجّل يقدر kh_mark');

-- تاريخ مستقبلي مرفوض (الفحص بيتم قبل أي حاجة تانية)
select throws_ok($$select public.kh_mark(gen_random_uuid(), (now() at time zone 'Africa/Cairo')::date + 30, 'present')$$, 'BAD_DATE', 'kh_mark يرفض تاريخ مستقبلي');
select throws_ok($$select public.kh_checkin('x', (now() at time zone 'Africa/Cairo')::date + 30)$$, 'BAD_DATE', 'kh_checkin يرفض تاريخ مستقبلي');

-- سجل العمليات: RLS شغّال، والمستخدمين العاديين مايقدروش يكتبوا فيه
select ok((select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass), 'RLS على audit_log');
select ok(not has_table_privilege('authenticated', 'public.audit_log', 'insert'), 'مفيش insert على audit_log للمستخدمين');
select ok(not has_function_privilege('authenticated', 'public.kh_audit()', 'execute'), 'kh_audit مقفولة');

-- الـ triggers الأساسية موجودة
select ok(exists(select 1 from pg_trigger where tgname = 'kh_audit' and tgrelid = 'public.servees'::regclass), 'audit على servees');
select ok(exists(select 1 from pg_trigger where tgname = 'kh_notif_url' and tgrelid = 'public.notifications'::regclass), 'trigger رابط الإشعار');

select * from finish();
rollback;
