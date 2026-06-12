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
const AW_API_KEY = Deno.env.get("AW_API_KEY") ?? "";

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

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Helper: lê grupos existentes do banco (fallback quando a API externa falha)
  const readGruposFromDb = async () => {
    const { data, error } = await supabase
      .from("grupos")
      .select("*")
      .eq("ativo", 1)
      .order("nome");
    if (error) throw error;
    return data ?? [];
  };

  try {
    // 1) Buscar API externa — com timeout para evitar travar a função
    let atividades: AtividadeInspecao[] | null = null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const resp = await fetch(`${AW_BASE_URL}/check-lista-atividade-inspecao`, {
        headers: { accept: "*/*", "X-Api-Key": AW_API_KEY },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`AW API falhou [${resp.status}]: ${text}`);
      }
      atividades = (await resp.json()) as AtividadeInspecao[];
    } catch (extErr: unknown) {
      // Falha de rede/TLS na API externa — não derruba o endpoint.
      const msg = extErr instanceof Error ? extErr.message : String(extErr);
      console.warn("AW API indisponível, usando fallback do banco:", msg);
      const grupos = await readGruposFromDb();
      return new Response(
        JSON.stringify({
          success: true,
          synced: 0,
          fallback: true,
          warning: "API externa indisponível — exibindo grupos já sincronizados",
          grupos,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) De-para → grupos (id é auto-incremento; usamos `codigo` como chave de conflito)
    const rows = (atividades ?? []).map((a) => ({
      codigo: String(a.IdAtividadeInspecao),
      nome: a.Descricao,
      ativo: 1,
    }));

    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from("grupos")
        .upsert(rows, { onConflict: "codigo" });
      if (upsertErr) throw upsertErr;
    }

    // 3) Retornar lista atualizada
    const grupos = await readGruposFromDb();
    return new Response(
      JSON.stringify({ success: true, synced: rows.length, grupos }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-grupos-inspecao error:", message);
    // Última tentativa: devolver o que tiver em banco com fallback=true
    try {
      const grupos = await readGruposFromDb();
      return new Response(
        JSON.stringify({ success: false, error: message, fallback: true, grupos }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: message, fallback: true, grupos: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }
});
