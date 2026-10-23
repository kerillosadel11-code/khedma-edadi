import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const genPass = () => {
  const a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const r = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(r, (x) => a[x % a.length]).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "لازم تسجّل دخول" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: me } = await admin
      .from("profiles").select("role,active").eq("id", user.id).single();
    if (!me || !me.active || me.role !== "admin") {
      return json({ error: "للأدمن فقط" }, 403);
    }

    const b = await req.json();

    if (b.action === "reset") {
      const { data: u, error: ge } = await admin.auth.admin.getUserById(b.user_id);
      if (ge || !u?.user) return json({ error: "الحساب مش موجود" }, 404);
      const password = genPass();
      const meta = { ...(u.user.user_metadata || {}), must_change: true };
      const { error: ue } = await admin.auth.admin.updateUserById(b.user_id, {
        password,
        user_metadata: meta,
      });
      if (ue) return json({ error: ue.message }, 400);
      const { data: p } = await admin
        .from("profiles").select("full_name").eq("id", b.user_id).single();
      const phone = (u.user.email || "").split("@")[0];
      return json({ name: p?.full_name || phone, login: phone, phone, password });
    }

    const name = String(b.name || "").trim();
    const phone = String(b.phone || "");
    const role = b.role;
    if (!name) return json({ error: "اكتب الاسم" }, 400);
    if (!/^01[0125]\d{8}$/.test(phone)) return json({ error: "رقم التليفون مش صحيح" }, 400);
    if (role !== "servant" && role !== "parent") {
      return json({ error: "الدور غير صحيح" }, 400);
    }
    if (role === "servant" && !b.class_id) return json({ error: "اختار الفصل" }, 400);
    if (role === "parent" && !b.servee_id) return json({ error: "اختار المخدوم" }, 400);

    // القسم بييجي من الفصل أو المخدوم نفسه (مش من الطلب)
    let section: string | null = null;
    if (role === "servant") {
      const { data: cl } = await admin.from("classes").select("section").eq("id", b.class_id).maybeSingle();
      if (!cl) return json({ error: "الفصل مش موجود" }, 400);
      section = cl.section ?? null;
    } else {
      const { data: sv } = await admin.from("servees").select("section").eq("id", b.servee_id).maybeSingle();
      if (!sv) return json({ error: "المخدوم مش موجود" }, 400);
      section = sv.section ?? null;
    }

    const password = genPass();
    const { data: c, error: ce } = await admin.auth.admin.createUser({
      email: phone + "@khedma.app",
      password,
      email_confirm: true,
      user_metadata: { must_change: true, full_name: name },
    });
    if (ce || !c?.user) {
      const m = ce?.message || "Create failed";
      const dup = /already|registered|exists/i.test(m);
      return json({ error: dup ? "الرقم ده مسجّل قبل كده" : m }, 400);
    }
    const id = c.user.id;

    const rollback = async (msg: string) => {
      await admin.auth.admin.deleteUser(id);
      return json({ error: msg }, 400);
    };

    const { error: pe } = await admin
      .from("profiles").upsert({ id, full_name: name, phone, role, section, active: true, pending: false });
    if (pe) return await rollback(pe.message);

    if (role === "servant") {
      const { error } = await admin
        .from("class_servants").insert({ servant_id: id, class_id: b.class_id });
      if (error) return await rollback(error.message);
    } else {
      const { error } = await admin
        .from("parent_links").insert({ parent_id: id, servee_id: b.servee_id });
      if (error) return await rollback(error.message);
    }

    return json({ name, login: phone, phone, password });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});