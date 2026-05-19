import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(message: string, status = 500) {
  return json({ error: message }, status);
}

type ExternalObra = {
  IdProjeto: number;
  NumeroProjeto: string;
  NomeProjeto: string;
  MetragemAbsoluta: number;
  IdStatus: number;
  DescricaoStatus: string;
  IdEquipeProjeto: number;
  DescricaoEquipe: string;
  IdContaNegocio: number;
  UnidadeNegocio: string;
};

type SyncResult = {
  total: number;
  updated: number;
  inserted: number;
  skipped: number;
};

function normalizeExternalObra(item: ExternalObra) {
  const codigo = String(item.NumeroProjeto || "").trim();
  const nome = String(item.NomeProjeto || "").trim() || codigo;
  const cliente = item.UnidadeNegocio ? String(item.UnidadeNegocio).trim() : null;
  return { codigo, nome, cliente };
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function syncObras(supabase: any, rows: ExternalObra[]): Promise<SyncResult> {
  const normalized = rows
    .map(normalizeExternalObra)
    .filter((item) => item.codigo.length > 0);

  const uniqueByCodigo = new Map<string, { codigo: string; nome: string; cliente: string | null }>();
  normalized.forEach((item) => {
    uniqueByCodigo.set(item.codigo, item);
  });

  const codigoList = Array.from(uniqueByCodigo.keys());
  const { data: existingData, error: fetchError } = await supabase
    .from("obras")
    .select("id, codigo")
    .in("codigo", codigoList);

  if (fetchError) {
    throw fetchError;
  }

  const existingByCodigo = new Map<string, { id: number; codigo: string }>();
  (existingData || []).forEach((row: any) => {
    existingByCodigo.set(row.codigo, row);
  });

  const updates: Array<{ codigo: string; nome: string; cliente: string | null }> = [];
  const inserts: Array<{ codigo: string; nome: string; cliente: string | null }> = [];

  for (const item of uniqueByCodigo.values()) {
    if (existingByCodigo.has(item.codigo)) {
      updates.push(item);
    } else {
      inserts.push(item);
    }
  }

  let updated = 0;
  let inserted = 0;

  for (const batch of chunk(updates, 50)) {
    const promises = batch.map((item) =>
      supabase
        .from("obras")
        .update({ nome: item.nome, cliente: item.cliente })
        .eq("codigo", item.codigo)
    );
    const results = await Promise.all(promises);
    results.forEach((result) => {
      if (!result.error) updated += 1;
    });
  }

  for (const batch of chunk(inserts, 50)) {
    const { error: insertError } = await supabase.from("obras").insert(batch);
    if (insertError) {
      throw insertError;
    }
    inserted += batch.length;
  }

  return {
    total: uniqueByCodigo.size,
    updated,
    inserted,
    skipped: uniqueByCodigo.size - updated - inserted,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return error("Method not allowed", 405);

  const syncSecret = Deno.env.get("SYNC_OBRAS_SECRET");
  const receivedSecret = req.headers.get("x-sync-secret");
  if (syncSecret && receivedSecret !== syncSecret) {
    return error("Unauthorized", 401);
  }

  const apiKey = Deno.env.get("AW_API_KEY");
  const apiUrl = Deno.env.get("AW_API_URL") ?? "https://gateway.athiewohnrath.com.br/aw-api-hub/check-busca-projeto";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey) return error("AW_API_KEY is required", 500);
  if (!supabaseUrl) return error("SUPABASE_URL is required", 500);
  if (!supabaseKey) return error("SUPABASE_SERVICE_ROLE_KEY is required", 500);

  const response = await fetch(apiUrl, {
    headers: {
      accept: "application/json",
      "X-Api-Key": apiKey,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    return error(`External API returned ${response.status}: ${body}`, response.status);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return error("External API response must be an array", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const result = await syncObras(supabase, payload);
    return json({ success: true, ...result });
  } catch (err: any) {
    return error(err?.message || "Sync failed", 500);
  }
});
