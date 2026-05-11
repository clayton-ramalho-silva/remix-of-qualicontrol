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
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const nome = body.nome ? String(body.nome) : undefined;
    const membroId = body.membroId ? Number(body.membroId) : undefined;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email inválido" }, 400);
    if (!password || password.length < 6) return json({ error: "Senha mínima 6 caracteres" }, 400);

    // Try find existing user
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);

    if (existing) {
      userId = existing.id;
      const { error: upErr } = await admin.auth.admin.updateUserById(existing.id, { password });
      if (upErr) return json({ error: upErr.message }, 400);
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: nome ? { name: nome } : undefined,
      });
      if (createErr || !created?.user) return json({ error: createErr?.message ?? "Falha ao criar conta" }, 400);
      userId = created.user.id;
    }

    // Link membro_equipe if provided, or by email
    if (userId) {
      if (membroId) {
        await admin.from("membros_equipe").update({ user_id: userId }).eq("id", membroId);
      } else {
        await admin
          .from("membros_equipe")
          .update({ user_id: userId })
          .ilike("email", email)
          .is("user_id", null);
      }
    }

    return json({ ok: true, userId, created: !existing });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});