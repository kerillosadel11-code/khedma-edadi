// Supabase Edge Function: send-push  (Verify JWT = OFF، والحماية بـ x-push-secret)
// بتتنادى من Database Webhook على INSERT في جدول notifications
// وبتسجّل كل محاولة في جدول push_log (ملف 17) عشان فحص الإشعارات في التطبيق يتتبّعها.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const SECRET = Deno.env.get("PUSH_SECRET") ?? "";
let vapidErr = "";
try {
  webpush.setVapidDetails(
    "mailto:" + (Deno.env.get("VAPID_SUBJECT") ?? "admin@khedma.app"),
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );
} catch (e) {
  vapidErr = "مفاتيح VAPID مش متظبطة في Secrets الدالة: " + String((e as any)?.message ?? e).slice(0, 100);
}
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const log = async (row: Record<string, unknown>) => {
  try { await admin.from("push_log").insert(row); } catch (_) { /* التسجيل مش لازم يوقّف الإرسال */ }
};
const hint = (c: number) =>
  c === 401 || c === 403 ? "مفتاح VAPID في الدالة مش مطابق لمفتاح التطبيق"
  : c === 404 || c === 410 ? "الاشتراك منتهي واتمسح، لازم المستخدم يفعّل الإشعارات تاني"
  : c === 413 ? "الرسالة كبيرة"
  : c === 429 ? "ضغط كبير على خدمة الإشعارات"
  : c >= 500 ? "خدمة الإشعارات عند جوجل/آبل مش متاحة مؤقتًا"
  : "خطأ " + c;

Deno.serve(async (req) => {
  let body: any = null;
  try { body = await req.json(); } catch { /* بنتعامل معاه تحت */ }
  const rec = body?.record;

  if (!SECRET || req.headers.get("x-push-secret") !== SECRET) {
    // نسجّل المحاولة بس لو الإشعار حقيقي (عشان ما حدش يبوّظ السجل بطلبات وهمية)
    if (rec?.id && rec?.user_id) {
      const { data } = await admin.from("notifications").select("id").eq("id", rec.id).eq("user_id", rec.user_id).maybeSingle();
      if (data) {
        await log({
          notification_id: String(rec.id), user_id: rec.user_id,
          error: SECRET ? "الهيدر x-push-secret في الـ Webhook مش مطابق لـ PUSH_SECRET" : "PUSH_SECRET مش متظبط في Secrets الدالة",
        });
      }
    }
    return new Response("forbidden", { status: 403 });
  }
  if (!body) return new Response("bad", { status: 400 });
  if (body?.type !== "INSERT" || !rec?.user_id) return new Response("ignored");

  const nid = String(rec.id ?? "");
  if (vapidErr) {
    await log({ notification_id: nid, user_id: rec.user_id, error: vapidErr });
    return new Response("vapid", { status: 500 });
  }

  const { data: subs, error: se } = await admin.from("push_subscriptions").select("*").eq("user_id", rec.user_id);
  if (se) {
    await log({ notification_id: nid, user_id: rec.user_id, error: "تعذّر قراءة اشتراكات الأجهزة: " + se.message });
    return new Response("subs error", { status: 500 });
  }
  if (!subs?.length) {
    await log({ notification_id: nid, user_id: rec.user_id, subs: 0, error: "الحساب ده مفيهوش أي جهاز مفعّل الإشعارات (هيشوف الإشعار جوه التطبيق بس)" });
    return new Response("no subs");
  }

  const payload = JSON.stringify({ title: rec.title ?? "خدمة إعدادي", body: (rec.body ?? "").slice(0, 200) });
  let sent = 0, failed = 0, removed = 0;
  const detail: any[] = [];
  await Promise.all(subs.map(async (s: any) => {
    let host = "؟";
    try { host = new URL(s.endpoint).host; } catch (_) { /* endpoint تالف */ }
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
      sent++; detail.push({ host, status: "ok" });
    } catch (e: any) {
      failed++;
      const code = Number(e?.statusCode) || 0;
      detail.push({ host, status: code, msg: String(e?.body ?? e?.message ?? "").slice(0, 120) });
      if (code === 404 || code === 410) { removed++; await admin.from("push_subscriptions").delete().eq("id", s.id); }
    }
  }));

  const firstBad = detail.find((d) => d.status !== "ok");
  await log({
    notification_id: nid, user_id: rec.user_id, subs: subs.length, sent, failed, removed, detail,
    error: sent === 0 && firstBad ? "فشل الإرسال لكل الأجهزة: " + hint(Number(firstBad.status) || 0) : null,
  });
  return new Response(JSON.stringify({ sent, failed }), { headers: { "Content-Type": "application/json" } });
});
