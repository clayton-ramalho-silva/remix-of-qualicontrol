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

type Cargo = "avaliador" | "gerente_obra" | "gerente_contrato" | "nucleo" | "diretoria" | "coordenador" | "tecnico";
const VALID_CARGOS: Cargo[] = ["avaliador", "gerente_obra", "gerente_contrato", "nucleo", "diretoria", "coordenador", "tecnico"];

type Vertical = "qualidade" | "checklist" | "qsms" | "vistoria";
const VALID_VERTICAIS: Vertical[] = ["qualidade", "checklist", "qsms", "vistoria"];

const BOOTSTRAP_ADMINS = [
  { email: "flavio@marcasite.com.br", name: "Flavio" },
  { email: "cecilio.perez@awnet.com.br", name: "Cecilio Perez" },
  { email: "clayton@agenciamore.com.br", name: "Clayton Silva" },
];
const BOOTSTRAP_PASSWORD = "123@ano2026";

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

    async function listAllAuthUsers() {
      const all: any[] = [];
      let page = 1;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw new Error(error.message);
        const users = data?.users ?? [];
        all.push(...users);
        if (users.length < 200) break;
        page++;
        if (page > 20) break;
      }
      return all;
    }

    if (action === "list") {
      const all = await listAllAuthUsers();
      const ids = all.map((u) => u.id);
      const safeIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
      const [{ data: profiles }, { data: roles }, { data: membros }] = await Promise.all([
        admin.from("profiles").select("id, name, email").in("id", safeIds),
        admin.from("user_roles").select("user_id, role").in("user_id", safeIds),
        admin.from("membros_equipe").select("id, user_id, nome, email, telefone, cargo, obra_ids, verticais, ativo").in("user_id", safeIds),
      ]);
      const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));
      const rolesMap = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = rolesMap.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesMap.set(r.user_id, arr);
      });
      const membroMap = new Map<string, any>((membros ?? []).map((m: any) => [m.user_id, m]));
      const accounts = all.map((u) => {
        const m = membroMap.get(u.id);
        return {
          id: u.id,
          email: u.email,
          name: profileMap.get(u.id)?.name ?? m?.nome ?? u.user_metadata?.name ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          roles: rolesMap.get(u.id) ?? [],
          membro_id: m?.id ?? null,
          telefone: m?.telefone ?? null,
          cargo: m?.cargo ?? null,
          obra_ids: Array.isArray(m?.obra_ids) ? m.obra_ids : [],
          verticais: Array.isArray(m?.verticais)
            ? (m.verticais as any[]).filter((x: any) => VALID_VERTICAIS.includes(x))
            : VALID_VERTICAIS.slice(),
          ativo: m?.ativo ?? 1,
        };
      });
      accounts.sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""));
      return json({ accounts });
    }

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const name = body.name ? String(body.name).trim() : null;
      const telefone = body.telefone ? String(body.telefone).trim() : null;
      const cargo = body.cargo && VALID_CARGOS.includes(body.cargo) ? (body.cargo as Cargo) : null;
      const obraIds: number[] = Array.isArray(body.obra_ids)
        ? body.obra_ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n))
        : [];
      const verticais: Vertical[] = Array.isArray(body.verticais)
        ? (body.verticais as any[]).filter((v: any): v is Vertical => VALID_VERTICAIS.includes(v))
        : VALID_VERTICAIS.slice();
      const roles: AppRole[] = Array.isArray(body.roles)
        ? body.roles.filter((r: any) => VALID_ROLES.includes(r))
        : [];

      if (!name) return json({ error: "Nome obrigatório" }, 400);
      if (!cargo) return json({ error: "Cargo obrigatório" }, 400);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email inválido" }, 400);
      if (!password || password.length < 6) return json({ error: "Senha mínima 6 caracteres" }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created?.user) return json({ error: createErr?.message ?? "Falha ao criar" }, 400);
      const newId = created.user.id;

      await admin.from("profiles").upsert({ id: newId, name, email });

      if (roles.length > 0) {
        await admin.from("user_roles").insert(roles.map((role) => ({ user_id: newId, role })));
      }

      // Auto-link or create membro_equipe
      const { data: existingMembro } = await admin
        .from("membros_equipe")
        .select("id")
        .or(`user_id.eq.${newId},and(user_id.is.null,email.ilike.${email})`)
        .maybeSingle();

      if (existingMembro?.id) {
        await admin
          .from("membros_equipe")
          .update({
            user_id: newId,
            nome: name,
            email,
            telefone,
            cargo,
            obra_ids: obraIds,
            verticais,
            ativo: 1,
          })
          .eq("id", existingMembro.id);
      } else {
        await admin.from("membros_equipe").insert({
          user_id: newId,
          nome: name,
          email,
          telefone,
          cargo,
          obra_ids: obraIds,
          verticais,
          ativo: 1,
        });
      }

      return json({ ok: true, id: newId });
    }

    if (action === "update") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "id obrigatório" }, 400);
      const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
      const password = body.password ? String(body.password) : undefined;
      const name = body.name !== undefined ? String(body.name).trim() : undefined;
      const telefone = body.telefone !== undefined ? (body.telefone ? String(body.telefone).trim() : null) : undefined;
      const cargo = body.cargo !== undefined && VALID_CARGOS.includes(body.cargo) ? (body.cargo as Cargo) : undefined;
      const obraIds: number[] | undefined = Array.isArray(body.obra_ids)
        ? body.obra_ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n))
        : undefined;
      const verticais: Vertical[] | undefined = Array.isArray(body.verticais)
        ? (body.verticais as any[]).filter((v: any): v is Vertical => VALID_VERTICAIS.includes(v))
        : undefined;
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

      // Sync membro_equipe
      const { data: existingMembro } = await admin
        .from("membros_equipe")
        .select("id")
        .eq("user_id", id)
        .maybeSingle();

      const membroPatch: any = {};
      if (name !== undefined) membroPatch.nome = name;
      if (email) membroPatch.email = email;
      if (telefone !== undefined) membroPatch.telefone = telefone;
      if (cargo !== undefined) membroPatch.cargo = cargo;
      if (obraIds !== undefined) membroPatch.obra_ids = obraIds;

      if (existingMembro?.id) {
        if (Object.keys(membroPatch).length > 0) {
          await admin.from("membros_equipe").update(membroPatch).eq("id", existingMembro.id);
        }
      } else if (name || cargo) {
        // Create new membro row if minimal fields available
        await admin.from("membros_equipe").insert({
          user_id: id,
          nome: name ?? "Sem nome",
          email: email ?? null,
          telefone: telefone ?? null,
          cargo: cargo ?? "tecnico",
          obra_ids: obraIds ?? [],
          ativo: 1,
        });
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
      // Remove membro_equipe row (or unlink) — simpler: delete row tied to this user
      await admin.from("membros_equipe").delete().eq("user_id", id);
      await admin.from("user_roles").delete().eq("user_id", id);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "bootstrap_admins") {
      const all = await listAllAuthUsers();
      const results: any[] = [];
      for (const a of BOOTSTRAP_ADMINS) {
        const existing = all.find((u) => (u.email ?? "").toLowerCase() === a.email);
        let uid: string;
        if (existing) {
          uid = existing.id;
          const { error: upErr } = await admin.auth.admin.updateUserById(uid, {
            password: BOOTSTRAP_PASSWORD,
            email_confirm: true,
          });
          if (upErr) { results.push({ email: a.email, ok: false, error: upErr.message }); continue; }
        } else {
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email: a.email,
            password: BOOTSTRAP_PASSWORD,
            email_confirm: true,
            user_metadata: { name: a.name },
          });
          if (createErr || !created?.user) {
            results.push({ email: a.email, ok: false, error: createErr?.message ?? "falha criar" });
            continue;
          }
          uid = created.user.id;
        }

        await admin.from("profiles").upsert({ id: uid, name: a.name, email: a.email });
        // Ensure admin role
        await admin
          .from("user_roles")
          .upsert({ user_id: uid, role: "admin" }, { onConflict: "user_id,role" });

        results.push({ email: a.email, ok: true, id: uid, created: !existing });
      }
      return json({ ok: true, results });
    }

    return json({ error: "Acção desconhecida" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
