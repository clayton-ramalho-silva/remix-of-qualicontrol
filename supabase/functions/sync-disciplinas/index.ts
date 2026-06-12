// Edge function: sync-disciplinas
// Itera sobre os grupos da tabela `grupos` e popula `disciplinas` com base
// nas subatividades retornadas pela API externa AW para cada grupo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const AW_BASE_URL = "https://gateway.athiewohnrath.com.br/aw-api-hub";
const AW_API_KEY = Deno.env.get("AW_API_KEY") ?? "";

interface SubAtividade {
  IdAtividadeInspecao: number;
  DescricaoPai: string;
  IdSubAtividadeInspecao: number;
  SubDescricao: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: grupos, error: gruposErr } = await supabase
      .from("grupos")
      .select("id, codigo")
      .eq("ativo", 1);
    if (gruposErr) throw gruposErr;
    if (!grupos || grupos.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: "Sem grupos" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let totalSynced = 0;
    const errors: { codigo: string; error: string }[] = [];

    for (const g of grupos) {
      try {
        const resp = await fetch(
          `${AW_BASE_URL}/check-lista-sub-atividade-inspecao?idAtividadeInspecao=${g.codigo}`,
          { headers: { accept: "*/*", "X-Api-Key": AW_API_KEY } },
        );
        if (!resp.ok) {
          errors.push({ codigo: g.codigo, error: `HTTP ${resp.status}` });
          continue;
        }
        const subs = (await resp.json()) as SubAtividade[];
        if (!Array.isArray(subs) || subs.length === 0) continue;

        const rows = subs.map((s) => ({
          nome: s.SubDescricao,
          id_disciplina: s.IdSubAtividadeInspecao,
          id_grupo: g.id,
        }));

        const { error: upErr } = await supabase
          .from("disciplinas")
          .upsert(rows, { onConflict: "id_disciplina" });
        if (upErr) {
          errors.push({ codigo: g.codigo, error: upErr.message });
          continue;
        }
        totalSynced += rows.length;
      } catch (e) {
        errors.push({
          codigo: g.codigo,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        grupos_processados: grupos.length,
        disciplinas_sincronizadas: totalSynced,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-disciplinas error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
