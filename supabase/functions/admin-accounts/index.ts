import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type AppRole = "admin" | "user" | "aprovador_gerenciadora" | "aprovador_arquitetura";
const VALID_ROLES: AppRole[] = ["admin", "user", "aprovador_gerenciadora", "aprovador_arquitetura"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "list");

    if (action === "list") {
      const all: any[] = [];
      let page = 1;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) return json({ error: error.message }, 400);
        const users = data?.users ?? [];
        all.push(...users);
        if (users.length < 200) break;
        page++;
        if (page > 20) break;
      }
      const ids = all.map((u) => u.id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        admin.from("profiles").select("id, name, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        admin.from("user_roles").select("user_id, role").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));
      const rolesMap = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = rolesMap.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesMap.set(r.user_id, arr);
      });
      const accounts = all.map((u) => ({
        id: u.id,
        email: u.email,
        name: profileMap.get(u.id)?.name ?? u.user_metadata?.name ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        roles: rolesMap.get(u.id) ?? [],
      }));
      accounts.sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""));
      return json({ accounts });
    }

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const name = body.name ? String(body.name).trim() : null;
      const roles: AppRole[] = Array.isArray(body.roles)
        ? body.roles.filter((r: any) => VALID_ROLES.includes(r))
        : [];
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email inválido" }, 400);
      if (!password || password.length < 6) return json({ error: "Senha mínima 6 caracteres" }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: name ? { name } : undefined,
      });
      if (createErr || !created?.user) return json({ error: createErr?.message ?? "Falha ao criar" }, 400);
      const newId = created.user.id;

      // Profile trigger should create profile, but ensure name is set
      if (name) {
        await admin.from("profiles").upsert({ id: newId, name, email });
      }

      if (roles.length > 0) {
        await admin.from("user_roles").insert(roles.map((role) => ({ user_id: newId, role })));
      }

      // Auto-link membro_equipe by email
      await admin
        .from("membros_equipe")
        .update({ user_id: newId })
        .ilike("email", email)
        .is("user_id", null);

      return json({ ok: true, id: newId });
    }

    if (action === "update") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "id obrigatório" }, 400);
      const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
      const password = body.password ? String(body.password) : undefined;
      const name = body.name !== undefined ? String(body.name).trim() : undefined;
      const roles: AppRole[] | undefined = Array.isArray(body.roles)
        ? body.roles.filter((r: any) => VALID_ROLES.includes(r))
        : undefined;

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email inválido" }, 400);
      if (password && password.length < 6) return json({ error: "Senha mínima 6 caracteres" }, 400);

      const updates: any = {};
      if (email) updates.email = email;
      if (password) updates.password = password;
      if (name !== undefined) updates.user_metadata = { name };

      if (Object.keys(updates).length > 0) {
        const { error: upErr } = await admin.auth.admin.updateUserById(id, updates);
        if (upErr) return json({ error: upErr.message }, 400);
      }

      if (name !== undefined || email) {
        const patch: any = {};
        if (name !== undefined) patch.name = name;
        if (email) patch.email = email;
        await admin.from("profiles").update(patch).eq("id", id);
      }

      if (roles) {
        const { data: existing } = await admin.from("user_roles").select("role").eq("user_id", id);
        const current = new Set<string>((existing ?? []).map((r: any) => r.role));
        const next = new Set<string>(roles);
        const toAdd = [...next].filter((r) => !current.has(r));
        const toRemove = [...current].filter((r) => !next.has(r));
        if (toAdd.length > 0) {
          await admin.from("user_roles").insert(toAdd.map((role) => ({ user_id: id, role })));
        }
        for (const role of toRemove) {
          await admin.from("user_roles").delete().eq("user_id", id).eq("role", role);
        }
      }

      return json({ ok: true });
    }

    if (action === "delete") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "id obrigatório" }, 400);
      if (id === callerId) return json({ error: "Não pode eliminar a sua própria conta" }, 400);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Acção desconhecida" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
