// Supabase Edge Function: set-active
// لازم Verify JWT = OFF (بنتحقق من الهوية جوه الكود بنفسنا).
// body: { user_id, active }  -> يوقف أو يفعّل حساب، ويقفل/يفتح دخوله في Supabase Auth كمان
// body: { action: 'sync' }   -> (أدمن بس) يقفل دخول كل الحسابات الموقوفة حالياً
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const BAN = "876000h"; // حوالي 100 سنة
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  constructor(public msg: string, public status = 400) { super(msg); }
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "طلب غير مسموح" }, 405);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) throw new HttpError("لازم تسجّل دخول", 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const opts = { auth: { persistSession: false, autoRefreshToken: false } };
    // عميل بصلاحيات اللي بيطلب (بنستخدمه للتحقق والتعديل، فالسياسات والـ triggers وسجل العمليات كلها بتشتغل)
    const me = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { ...opts, global: { headers: { Authorization: auth } } });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, opts);

    const { data: u } = await me.auth.getUser(auth.slice(7));
    const user = u?.user;
    if (!user) throw new HttpError("الجلسة منتهية، سجّل دخول تاني", 401);

    const { data: role } = await me.rpc("kh_role");
    if (role !== "admin" && role !== "secretary") throw new HttpError("مش مسموح لك", 403);

    let body: any;
    try { body = await req.json(); } catch { throw new HttpError("بيانات غير صحيحة"); }

    // ---- مزامنة: اقفل دخول كل الموقوفين ----
    if (body?.action === "sync") {
      if (role !== "admin") throw new HttpError("للأدمن بس", 403);
      const { data: rows, error } = await admin.from("profiles").select("id").eq("active", false).eq("pending", false);
      if (error) throw error;
      let banned = 0;
      for (const r of rows ?? []) {
        if (r.id === user.id) continue;
        const { error: e } = await admin.auth.admin.updateUserById(r.id, { ban_duration: BAN });
        if (!e) banned++;
      }
      return json({ ok: true, banned });
    }

    const target = String(body?.user_id ?? "");
    if (!UUID.test(target)) throw new HttpError("حساب غير صحيح");
    if (typeof body?.active !== "boolean") throw new HttpError("حالة غير صحيحة");
    const active: boolean = body.active;
    if (target === user.id) throw new HttpError("مينفعش تغيّر حالة حسابك بنفسك");

    if (role === "secretary") {
      const { data: m } = await me.rpc("kh_sec_manages", { p_id: target });
      if (!m) throw new HttpError("الحساب ده مش من قسمك", 403);
    }

    const { data: tp } = await admin.from("profiles").select("role,active").eq("id", target).maybeSingle();
    if (!tp) throw new HttpError("الحساب مش موجود", 404);

    if (!active && tp.role === "admin") {
      const { count } = await admin.from("profiles").select("id", { count: "exact", head: true })
        .eq("role", "admin").eq("active", true).neq("id", target);
      if (!count) throw new HttpError("ده آخر أدمن شغّال، مينفعش يتوقّف");
    }

    const setProfile = async () => {
      const patch = active ? { active: true, pending: false } : { active: false };
      const { data, error } = await me.from("profiles").update(patch).eq("id", target).select("id");
      if (error) throw error;
      if (!data || !data.length) throw new HttpError("مش مسموح لك بتعديل الحساب ده", 403);
    };

    if (active) {
      // افتح الدخول الأول، وبعدين فعّل البروفايل
      const { error } = await admin.auth.admin.updateUserById(target, { ban_duration: "none" });
      if (error) throw new HttpError("تعذّر فتح الدخول للحساب، جرّب تاني", 500);
      await setProfile();
    } else {
      // وقّف البروفايل الأول (بيقفل البيانات فوراً)، وبعدين اقفل الدخول
      await setProfile();
      const { error } = await admin.auth.admin.updateUserById(target, { ban_duration: BAN });
      if (error) {
        console.error("ban failed", error);
        return json({ ok: true, warning: "اتوقّف الحساب، لكن تعذّر قفل الدخول. جرّب زرار المزامنة" });
      }
    }
    return json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.msg }, e.status);
    console.error(e);
    return json({ error: "حصل خطأ غير متوقع، جرّب تاني" }, 500);
  }
});
