// Supabase Edge Function: send-push  (Verify JWT = OFF، والحماية بـ x-push-secret)
// بتتنادى من Database Webhook على INSERT في جدول notifications
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const SECRET = Deno.env.get("PUSH_SECRET") ?? "";
webpush.setVapidDetails(
  "mailto:" + (Deno.env.get("VAPID_SUBJECT") ?? "admin@khedma.app"),
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get("x-push-secret") !== SECRET) return new Response("forbidden", { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return new Response("bad", { status: 400 }); }
  const rec = body?.record;
  if (body?.type !== "INSERT" || !rec?.user_id) return new Response("ignored");

  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", rec.user_id);
  if (!subs?.length) return new Response("no subs");

  const payload = JSON.stringify({ title: rec.title ?? "خدمة إعدادي", body: (rec.body ?? "").slice(0, 200) });
  let sent = 0;
  await Promise.all(subs.map(async (s: any) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
    }
  }));
  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
