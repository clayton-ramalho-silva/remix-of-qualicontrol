// Edge function: sync-obra-fornecedores
// Para uma obra (id_projeto), itera todas as disciplinas, busca fornecedores
// via API AW e popula: fornecedores, fornecedores_disciplinas,
// fornecedores_grupos e obras_fornecedores. Enriquece contato para fornecedores
// novos. Roda em background (fire-and-forget).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const AW_BASE_URL = "https://gateway.athiewohnrath.com.br/aw-api-hub";
const AW_API_KEY = Deno.env.get("AW_API_KEY") ?? "";

interface FornecedorApi {
  IdFornecedor: number;
  NomeFantasia: string;
  Cnpj?: string;
}

interface ContatoApi {
  Nome?: string | null;
  Email?: string | null;
  TelefonePrincipal?: string | null;
  CelularPrincipal?: string | null;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function awGet<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${AW_BASE_URL}${path}`, {
      headers: { accept: "*/*", "X-Api-Key": AW_API_KEY },
    });
    if (!r.ok) {
      console.warn(`AW ${path} -> ${r.status}`);
      return null;
    }
    return (await r.json()) as T;
  } catch (e) {
    console.error(`AW ${path} error`, e);
    return null;
  }
}

async function processObra(obraId: number) {
  console.log(`[sync-obra-fornecedores] start obra=${obraId}`);

  const { data: obra, error: obraErr } = await supabase
    .from("obras")
    .select("id, id_projeto")
    .eq("id", obraId)
    .single();
  if (obraErr || !obra?.id_projeto) {
    console.error("Obra sem id_projeto", obraErr);
    return;
  }
  const idProjeto = obra.id_projeto;

  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("id, id_disciplina, id_grupo");
  const { data: grupos } = await supabase
    .from("grupos")
    .select("id, codigo");

  const grupoIdByCodigo = new Map<string, number>();
  (grupos || []).forEach((g) => grupoIdByCodigo.set(String(g.codigo), g.id));

  // Cache existing fornecedores by id_fornecedor
  const { data: existing } = await supabase
    .from("fornecedores")
    .select("id, id_fornecedor");
  const fornByIdApi = new Map<number, number>();
  (existing || []).forEach((f) => {
    if (f.id_fornecedor != null) fornByIdApi.set(Number(f.id_fornecedor), f.id);
  });

  const newFornecedorApiIds = new Set<number>();
  let totalLinked = 0;

  for (const disc of disciplinas || []) {
    const list = await awGet<FornecedorApi[]>(
      `/check-lista-atividade-sub-atividade-fornecedor?idProjeto=${idProjeto}&idSubAtividadeInspecao=${disc.id_disciplina}`,
    );
    if (!list || list.length === 0) continue;

    const grupoLocalId = disc.id_grupo
      ? grupoIdByCodigo.get(String(disc.id_grupo))
      : null;

    for (const f of list) {
      const apiId = Number(f.IdFornecedor);
      if (!apiId) continue;

      let fornId = fornByIdApi.get(apiId);
      if (!fornId) {
        const { data: ins, error: insErr } = await supabase
          .from("fornecedores")
          .insert({
            id_fornecedor: apiId,
            nome: (f.NomeFantasia || "").trim() || `Fornecedor ${apiId}`,
          })
          .select("id")
          .single();
        if (insErr || !ins) {
          console.error("Insert fornecedor falhou", apiId, insErr);
          continue;
        }
        fornId = ins.id;
        fornByIdApi.set(apiId, fornId);
        newFornecedorApiIds.add(apiId);
      }

      // pivots idempotentes
      await supabase
        .from("fornecedores_disciplinas")
        .upsert(
          { fornecedor_id: fornId, disciplina_id: disc.id },
          { onConflict: "fornecedor_id,disciplina_id", ignoreDuplicates: true },
        );

      if (grupoLocalId) {
        await supabase
          .from("fornecedores_grupos")
          .upsert(
            { fornecedor_id: fornId, grupo_id: grupoLocalId },
            { onConflict: "fornecedor_id,grupo_id", ignoreDuplicates: true },
          );
      }

      await supabase
        .from("obras_fornecedores")
        .upsert(
          { obra_id: obraId, fornecedor_id: fornId },
          { onConflict: "obra_id,fornecedor_id", ignoreDuplicates: true },
        );

      totalLinked++;
    }
  }

  // Enriquecer somente fornecedores novos
  for (const apiId of newFornecedorApiIds) {
    const contatos = await awGet<ContatoApi[]>(
      `/check-lista-fornecedor-contato?idFornecedor=${apiId}`,
    );
    const first = contatos && contatos.length > 0 ? contatos[0] : null;
    if (!first) continue;
    const fornId = fornByIdApi.get(apiId);
    if (!fornId) continue;
    await supabase
      .from("fornecedores")
      .update({
        contato: first.Nome?.trim() || null,
        email: first.Email?.trim() || null,
        telefone:
          first.TelefonePrincipal?.trim() ||
          first.CelularPrincipal?.trim() ||
          null,
      })
      .eq("id", fornId);
  }

  console.log(
    `[sync-obra-fornecedores] done obra=${obraId} novos=${newFornecedorApiIds.size} links=${totalLinked}`,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const obraId = Number(body?.obraId);
    if (!obraId || !Number.isFinite(obraId)) {
      return new Response(
        JSON.stringify({ success: false, error: "obraId inválido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    // Fire-and-forget
    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(processObra(obraId));

    return new Response(JSON.stringify({ success: true, started: true }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-obra-fornecedores error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
