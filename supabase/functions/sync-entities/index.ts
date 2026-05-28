import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const AW_BASE_URL = "https://gateway.athiewohnrath.com.br/aw-api-hub";
const AW_API_KEY = "Y30KrdWrst7kkOIcT5xy3RwtSSNM9h03";

function joinEndereco(p: any): string | null {
  const parts = [p.Endereco, p.ComplementoEndereco, p.Bairro, p.Cidade, p.Cep].filter(
    (x) => x && String(x).trim().length > 0
  );
  return parts.length ? parts.join(", ") : null;
}

async function syncObras(supabase: any) {
  const res = await fetch(`${AW_BASE_URL}/check-busca-projeto`, {
    headers: { "X-Api-Key": AW_API_KEY, accept: "*/*" },
  });
  if (!res.ok) throw new Error(`AW API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Resposta inesperada da API");

  const rows = data
    .filter((p: any) => p?.IdProjeto && p?.NumeroProjeto && p?.NomeProjeto)
    .map((p: any) => ({
      id_projeto: p.IdProjeto,
      codigo: String(p.NumeroProjeto),
      nome: String(p.NomeProjeto),
      cliente: p.Cliente ?? null,
      endereco: joinEndereco(p),
      data_criacao: p.DataCriacao ?? null,
      data_atualizacao: p.DataAtualizacao ?? null,
      gerente_obra: p.NomeGO ?? null,
      gerente_contrato: p.DescricaoEquipe ?? null,
      nucleo: p.NomeNucleo ?? null,
    }));

  // Upsert em lotes para evitar payloads enormes
  const batchSize = 500;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("obras")
      .upsert(chunk, { onConflict: "id_projeto" });
    if (error) throw new Error(`Upsert obras: ${error.message}`);
    upserted += chunk.length;
  }

  return { total_api: data.length, upserted };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let entity = "obras";
    try {
      const body = await req.json();
      if (body?.entity) entity = String(body.entity);
    } catch {
      const url = new URL(req.url);
      entity = url.searchParams.get("entity") || entity;
    }

    let result: any;
    switch (entity) {
      case "obras":
        result = await syncObras(supabase);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Entidade não suportada: ${entity}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ entity, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("sync-entities error", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
