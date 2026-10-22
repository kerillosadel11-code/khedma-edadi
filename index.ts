// Supabase Edge Function: create-user
// ينشئ حسابات (أدمن/أمين خدمة/خادم/ولي أمر) ويعمل باسورد مؤقت جديد.
// الصلاحيات بتتحقق من قاعدة البيانات (مش من اللي الموقع بيبعته).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const EMAIL_DOMAIN = "khedma.app";
const SECTIONS = ["boys", "girls"];

class HttpError extends Error {
  constructor(public msg: string, public status = 400) {
    super(msg);
  }
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// نفس منطق الموقع في تنظيف رقم التليفون
function normPhone(raw: unknown): string | null {
  let d = String(raw ?? "")
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
    .replace(/\D/g, "");
  if (d.startsWith("0020")) d = "0" + d.slice(4);
  else if (d.startsWith("20") && d.length === 12) d = "0" + d.slice(2);
  else if (d.length === 10 && d[0] === "1") d = "0" + d;
  return /^01[0125]\d{8}$/.test(d) ? d : null;
}

function genPassword(len = 10): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const limit = 256 - (256 % A.length);
  let out = "";
  while (out.length < len) {
    const b = crypto.getRandomValues(new Uint8Array(len * 2));
    for (const x of b) {
      if (x < limit && out.length < len) out += A[x % A.length];
    }
  }
  return out;
}

// هل الأمين يقدر يدير الحساب ده؟ (خادم/ولي أمر، كل ارتباطاته في قسمه، وعنده ارتباط أو قسمه = قسم الأمين)
async function secretaryManages(admin: any, id: string, sec: string): Promise<boolean> {
  const { data: p } = await admin.from("profiles").select("role,section").eq("id", id).maybeSingle();
  if (!p || !["servant", "parent"].includes(p.role)) return false;
  let secs: (string | null)[] = [];
  if (p.role === "servant") {
    const { data: links } = await admin.from("class_servants").select("class_id").eq("servant_id", id);
    const ids = (links || []).map((l: any) => l.class_id);
    if (ids.length) {
      const { data: cl } = await admin.from("classes").select("id,section").in("id", ids);
      const m = new Map((cl || []).map((c: any) => [c.id, c.section]));
      secs = ids.map((i: string) => (m.get(i) as string) ?? null);
    }
  } else {
    const { data: links } = await admin.from("parent_links").select("servee_id").eq("parent_id", id);
    const ids = (links || []).map((l: any) => l.servee_id);
    if (ids.length) {
      const { data: sv } = await admin.from("servees").select("id,section").in("id", ids);
      const m = new Map((sv || []).map((s: any) => [s.id, s.section]));
      secs = ids.map((i: string) => (m.get(i) as string) ?? null);
    }
  }
  if (secs.some((s) => s !== sec)) return false;
  return secs.length > 0 || p.section === sec;
}

async function createUser(admin: any, me: any, body: any) {
  const name = String(body.name ?? "").trim();
  if (!name) throw new HttpError("اكتب اسم المستخدم");
  const phone = normPhone(body.phone);
  if (!phone) throw new HttpError("رقم التليفون مش صحيح (مثال: 01012345678)");

  const role = String(body.role ?? "");
  const allowed = me.role === "admin" ? ["admin", "secretary", "servant", "parent"] : ["servant", "parent"];
  if (!allowed.includes(role)) {
    throw new HttpError(
      me.role === "admin" ? "الدور غير صحيح" : "الأمين ينشئ حساب خادم أو ولي أمر بس",
      403,
    );
  }

  let section: string | null = null;
  let classId: string | null = null;
  let serveeId: string | null = null;

  if (role === "secretary") {
    section = String(body.section ?? "");
    if (!SECTIONS.includes(section)) throw new HttpError("اختار قسم أمين الخدمة (بنين أو بنات)");
  } else if (role === "servant") {
    classId = body.class_id ? String(body.class_id) : null;
    if (!classId) throw new HttpError("اختار فصل الخادم");
    const { data: c } = await admin.from("classes").select("id,section").eq("id", classId).maybeSingle();
    if (!c) throw new HttpError("الفصل مش موجود");
    if (me.role === "secretary" && c.section !== me.section) throw new HttpError("الفصل ده مش في قسمك", 403);
    section = c.section ?? null;
  } else if (role === "parent") {
    serveeId = body.servee_id ? String(body.servee_id) : null;
    if (!serveeId) throw new HttpError("اختار المخدوم");
    const { data: s } = await admin.from("servees").select("id,section").eq("id", serveeId).maybeSingle();
    if (!s) throw new HttpError("المخدوم مش موجود");
    if (me.role === "secretary" && s.section !== me.section) throw new HttpError("المخدوم ده مش في قسمك", 403);
    section = s.section ?? null;
  }

  const email = `${phone}@${EMAIL_DOMAIN}`;
  const password = genPassword();
  const { data: cu, error: ce } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, must_change: true },
  });
  if (ce || !cu?.user) {
    const m = (ce?.message || "").toLowerCase();
    if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
      throw new HttpError("الرقم ده مسجّل قبل كده");
    }
    console.error("createUser failed", ce);
    throw new HttpError("تعذّر إنشاء الحساب، جرّب تاني");
  }
  const uid = cu.user.id;

  try {
    // الـ trigger on_auth_user_created بيعمل صف profiles، فبنعمل upsert عليه
    const { error: pe } = await admin
      .from("profiles")
      .upsert({ id: uid, full_name: name, phone, role, section, active: true }, { onConflict: "id" });
    if (pe) throw pe;

    if (role === "servant") {
      const { error } = await admin.from("class_servants").insert({ servant_id: uid, class_id: classId });
      if (error) throw error;
    } else if (role === "parent") {
      const { error } = await admin.from("parent_links").insert({ parent_id: uid, servee_id: serveeId });
      if (error) throw error;
    }
  } catch (e) {
    console.error("setup failed, rolling back", e);
    await admin.auth.admin.deleteUser(uid); // rollback: يمسح الحساب (والـ profile بيتمسح معاه)
    throw new HttpError("حصل خطأ أثناء إعداد الحساب ومافيش حاجة اتحفظت. جرّب تاني");
  }

  return { name, login: phone, password, phone, role };
}

async function resetPassword(admin: any, me: any, body: any) {
  const id = String(body.user_id ?? "");
  if (!id) throw new HttpError("الحساب غير محدد");
  const { data: t } = await admin.from("profiles").select("id,full_name,phone,role").eq("id", id).maybeSingle();
  if (!t) throw new HttpError("الحساب مش موجود", 404);
  if (me.role === "secretary" && !(await secretaryManages(admin, id, me.section))) {
    throw new HttpError("الحساب ده مش من حسابات قسمك", 403);
  }

  const { data: gu } = await admin.auth.admin.getUserById(id);
  if (!gu?.user) throw new HttpError("الحساب مش موجود", 404);
  const password = genPassword();
  const { error } = await admin.auth.admin.updateUserById(id, {
    password,
    user_metadata: { ...(gu.user.user_metadata || {}), must_change: true },
  });
  if (error) {
    console.error("reset failed", error);
    throw new HttpError("تعذّر عمل باسورد جديد، جرّب تاني");
  }
  const email = gu.user.email || "";
  const login = email.endsWith("@" + EMAIL_DOMAIN) ? email.split("@")[0] : email;
  return { name: t.full_name || "", login, password, phone: t.phone || null };
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
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError("لازم تسجّل دخول الأول", 401);
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) throw new HttpError("الجلسة انتهت، سجّل دخول تاني", 401);

    // الدور والقسم من قاعدة البيانات، مش من الطلب
    const { data: me } = await admin
      .from("profiles")
      .select("id,role,section,active")
      .eq("id", u.user.id)
      .maybeSingle();
    if (!me || !me.active || !["admin", "secretary"].includes(me.role)) {
      throw new HttpError("مش مسموح لك بالعملية دي", 403);
    }
    if (me.role === "secretary" && !SECTIONS.includes(me.section)) {
      throw new HttpError("حساب أمين الخدمة مالوش قسم، كلّم أبونا", 403);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new HttpError("بيانات غير صحيحة");
    }

    if (body?.action === "reset") return json(await resetPassword(admin, me, body));
    return json(await createUser(admin, me, body));
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.msg }, e.status);
    console.error(e);
    return json({ error: "حصل خطأ غير متوقع، جرّب تاني" }, 500);
  }
});
