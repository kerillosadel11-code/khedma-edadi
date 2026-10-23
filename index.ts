// Supabase Edge Function: accept-invite  (لازم Verify JWT = OFF لأن الشخص لسه معندوش حساب)
// action 'peek'  : يتأكد من اللينك ويرجّع نوع الدعوة (من غير ما يعمل حاجة)
// action 'accept': ينشئ الحساب بالدور والقسم والفصل اللي في الدعوة نفسها، مش من الطلب
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const EMAIL_DOMAIN = "khedma.app";
const BAD = "الدعوة غير صالحة أو منتهية، اطلب لينك جديد";

class HttpError extends Error {
  constructor(public msg: string, public status = 400) { super(msg); }
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function normPhone(raw: unknown): string | null {
  let d = String(raw ?? "")
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x660))
    .replace(/[\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
    .replace(/\D/g, "");
  if (d.startsWith("0020")) d = "0" + d.slice(4);
  else if (d.startsWith("20") && d.length === 12) d = "0" + d.slice(2);
  else if (d.length === 10 && d[0] === "1") d = "0" + d;
  return /^01[0125]\d{8}$/.test(d) ? d : null;
}

async function sha256(t: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function loadInvite(admin: any, token: unknown) {
  const t = String(token ?? "");
  if (!/^[0-9a-f]{32,128}$/i.test(t)) throw new HttpError(BAD);
  const { data: inv } = await admin.from("invites").select("*").eq("token_hash", await sha256(t.toLowerCase())).maybeSingle();
  if (!inv || inv.revoked || inv.uses >= inv.max_uses || new Date(inv.expires_at).getTime() < Date.now()) {
    throw new HttpError(BAD);
  }
  let className: string | null = null;
  let serveeName: string | null = null;
  let section: string | null = inv.section ?? null;
  if (inv.role === "parent") {
    const { data: s } = await admin.from("servees").select("full_name,section,active").eq("id", inv.servee_id).maybeSingle();
    if (!s || !s.active) throw new HttpError(BAD);
    serveeName = s.full_name;
    section = s.section ?? section;
  }
  if (inv.role === "servant") {
    const { data: c } = await admin.from("classes").select("name,section").eq("id", inv.class_id).maybeSingle();
    if (!c) throw new HttpError(BAD);
    className = c.name;
    section = c.section ?? section;
  }
  // لو اللي عمل الدعوة اتوقّف أو مابقاش له صلاحية، الدعوة تبطل
  const { data: by } = await admin.from("profiles").select("role,active,section").eq("id", inv.created_by).maybeSingle();
  if (!by || !by.active) throw new HttpError(BAD);
  if (inv.role === "secretary" && by.role !== "admin") throw new HttpError(BAD);
  if (inv.role === "servant" && !(by.role === "admin" || (by.role === "secretary" && by.section === section))) {
    throw new HttpError(BAD);
  }
  if (inv.role === "parent" && !(by.role === "admin" || (by.role === "secretary" && by.section === section))) {
    throw new HttpError(BAD);
  }
  return { inv, className, section, serveeName };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "طلب غير مسموح" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    let body: any;
    try { body = await req.json(); } catch { throw new HttpError("بيانات غير صحيحة"); }

    const { inv, className, section, serveeName } = await loadInvite(admin, body?.token);

    if (body?.action === "peek") {
      return json({ role: inv.role, section, class_name: className, servee_name: serveeName });
    }
    if (body?.action !== "accept") throw new HttpError("طلب غير صحيح");

    const name = String(body.name ?? "").trim();
    if (!name) throw new HttpError("اكتب اسمك");
    const phone = normPhone(body.phone);
    if (!phone) throw new HttpError("رقم التليفون مش صحيح (مثال: 01012345678)");
    const password = String(body.password ?? "");
    if (password.length < 8) throw new HttpError("الباسورد لازم يكون 8 حروف على الأقل");

    // حجز استخدام من الدعوة (لو اتستخدمت في نفس اللحظة، الحجز يفشل)
    const { data: claimed } = await admin.from("invites")
      .update({ uses: inv.uses + 1 })
      .eq("id", inv.id).eq("uses", inv.uses).eq("revoked", false)
      .select("id");
    if (!claimed || !claimed.length) throw new HttpError(BAD);

    const release = async () => {
      const { data: cur } = await admin.from("invites").select("uses").eq("id", inv.id).maybeSingle();
      if (cur) await admin.from("invites").update({ uses: Math.max(cur.uses - 1, 0) }).eq("id", inv.id);
    };

    const { data: cu, error: ce } = await admin.auth.admin.createUser({
      email: `${phone}@${EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (ce || !cu?.user) {
      await release();
      const m = (ce?.message || "").toLowerCase();
      if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
        throw new HttpError("الرقم ده مسجّل قبل كده، ادخل بيه من صفحة الدخول");
      }
      console.error("createUser failed", ce);
      throw new HttpError("تعذّر إنشاء الحساب، جرّب تاني");
    }
    const uid = cu.user.id;

    try {
      // الأمين وولي الأمر: شغّالين على طول (اللي عمل الدعوة هو الضامن). الخادم: في انتظار موافقة أمين الخدمة
      const isServant = inv.role === "servant";
      const auto = !isServant;
      const { error: pe } = await admin.from("profiles").upsert(
        { id: uid, full_name: name, phone, role: inv.role, section, active: auto, pending: !auto },
        { onConflict: "id" },
      );
      if (pe) throw pe;
      if (isServant) {
        const { error } = await admin.from("class_servants").insert({ servant_id: uid, class_id: inv.class_id });
        if (error) throw error;
      }
      if (inv.role === "parent") {
        const { error } = await admin.from("parent_links").insert({ parent_id: uid, servee_id: inv.servee_id });
        if (error) throw error;
      }
    } catch (e) {
      console.error("setup failed, rolling back", e);
      await admin.auth.admin.deleteUser(uid);
      await release();
      throw new HttpError("حصل خطأ أثناء إعداد الحساب ومافيش حاجة اتحفظت. جرّب تاني");
    }

    return json({ ok: true, role: inv.role, login: phone, pending: inv.role === "servant" });
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.msg }, e.status);
    console.error(e);
    return json({ error: "حصل خطأ غير متوقع، جرّب تاني" }, 500);
  }
});
