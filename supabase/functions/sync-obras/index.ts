// supabase/functions/sync-obras/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
};

serve(async (req) => {
  // === CORS pre-flight ===
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // === Autenticação simplificada: apenas X-Api-Key ===
    const apiKey = req.headers.get("X-Api-Key");
    const expectedKey = Deno.env.get("INTERNAL_API_KEY");
    
    if (expectedKey && apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. X-Api-Key inválido." }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // === Cliente Supabase (service_role para operações internas) ===
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // === Consumir API externa ===
    console.log("🔄 Buscando projetos na API externa...");
    const externalRes = await fetch(
      "https://gateway.athiewohnrath.com.br/aw-api-hub/check-busca-projeto",
      {
        headers: {
          "accept": "*/*",
          "X-Api-Key": Deno.env.get("EXTERNAL_API_KEY")!,
        },
      }
    );

    if (!externalRes.ok) {
      const errorText = await externalRes.text().catch(() => "sem detalhes");
      throw new Error(`API externa falhou: ${externalRes.status} - ${errorText}`);
    }

    const externalData = await externalRes.json();
    console.log(`✅ Recebidos ${externalData.length} projetos`);

    // === Mapeamento de-para ===
    const projetosParaGravar = externalData.map((p: any) => ({
      id_externo: p.IdProjeto,
      codigo: p.NumeroProjeto,
      nome: p.NomeProjeto,
      cliente: p.Cliente,
      endereco: p.Endereco,
      cidade: p.Cidade,
      complementoEndereco: p.ComplementoEndereco,
      bairro: p.Bairro,
      cep: p.Cep,
      status_externo: p.DescricaoStatus, // campo extra para auditoria
      sincronizado_em: new Date().toISOString(),
    }));

    // === Upsert no banco ===
    console.log("💾 Gravando no Supabase...");
    const { data, error } = await supabase
      .from("obras") // ← confirme o nome da sua tabela
      .upsert(projetosParaGravar, {
        onConflict: "id_externo", // ← requer UNIQUE index em id_externo
      })
      .select("id, id_externo, codigo, nome");

    if (error) throw error;

    console.log(`✅ Sucesso: ${data?.length} registros sincronizados`);

    return new Response(
      JSON.stringify({
        success: true,
        total_recebidos: externalData.length,
        total_gravados: data?.length || 0,
        amostra: data?.slice(0, 3) || [],
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("🚨 Erro na sync-obras:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});