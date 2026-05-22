// Edge function: sync-grupos-inspecao
// Busca grupos (atividades de inspeção) da API externa AW e sincroniza
// com a tabela public.grupos. Retorna a lista atualizada.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const AW_BASE_URL = "https://gateway.athiewohnrath.com.br/aw-api-hub";
const AW_API_KEY = "Y30KrdWrst7kkOIcT5xy3RwtSSNM9h03";

interface AtividadeInspecao {
  IdAtividadeInspecao: number;
  Descricao: string;
  DataCriacao?: string;
  DataAlteracao?: string;
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

    // 1) Buscar API externa
    const resp = await fetch(`${AW_BASE_URL}/check-lista-atividade-inspecao`, {
      headers: { accept: "*/*", "X-Api-Key": AW_API_KEY },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`AW API falhou [${resp.status}]: ${text}`);
    }
    const atividades = (await resp.json()) as AtividadeInspecao[];

    // 2) De-para → grupos
    const rows = atividades.map((a) => ({
      id: a.IdAtividadeInspecao,
      codigo: String(a.IdAtividadeInspecao),
      nome: a.Descricao,
      ativo: 1,
    }));

    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from("grupos")
        .upsert(rows, { onConflict: "id" });
      if (upsertErr) throw upsertErr;
    }

    // 3) Retornar lista atualizada
    const { data, error } = await supabase
      .from("grupos")
      .select("*")
      .eq("ativo", 1)
      .order("nome");
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, synced: rows.length, grupos: data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-grupos-inspecao error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
