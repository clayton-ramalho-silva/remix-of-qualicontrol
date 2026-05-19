// supabase/functions/sync-obras/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // 🗄️ Cliente Supabase (service_role ignora RLS, ideal para sync interno)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🌐 1. Consultar API externa
    console.log("🔄 Consultando API externa...");
    const response = await fetch("https://gateway.athiewohnrath.com.br/aw-api-hub/check-busca-projeto", {
      headers: {
        "accept": "*/*",
        "X-Api-Key": Deno.env.get("EXTERNAL_API_KEY")!,
      },
    });

    if (!response.ok) {
      throw new Error(`API externa retornou: ${response.status}`);
    }

    const externalData = await response.json();
    console.log(`✅ Recebidos ${externalData.length} projetos`);

    // 🔄 2. DE-PARA: Mapeamento final
    console.log("🔄 Transformando dados...");
    const projetosParaGravar = externalData.map((item: any) => ({
      // Identificador único (obrigatório para upsert)
      id_externo: item.IdProjeto,
      
      // Campos principais
      codigo: item.NumeroProjeto,
      nome: item.NomeProjeto,
      cliente: item.Cliente,
      endereco: item.Endereco,
      
      // Endereço detalhado
      cidade: item.Cidade,
      complemento_endereco: item.ComplementoEndereco, // ← underscore no banco
      bairro: item.Bairro,
      cep: item.Cep,
      
      // 📅 Datas do sistema externo (úteis para sync incremental futuro)
      data_criacao_externa: item.DataCriacao ?? null,
      data_atualizacao_externa: item.DataAtualizacao ?? null,
    }));

    // 💾 3. Upsert no banco
    console.log("💾 Gravando com upsert...");
    const { data, error } = await supabase
      .from("obras")
      .upsert(projetosParaGravar, {
        onConflict: "id_externo",  // ← usa a CONSTRAINT UNIQUE criada
        ignoreDuplicates: false,   // false = atualiza se já existir
      })
      .select("id, id_externo, codigo, nome");

    if (error) throw error;

    console.log(`✅ Sucesso: ${data?.length} registros processados`);

    // 📤 Resposta final
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Sincronização concluída",
        total_recebidos: externalData.length,
        total_gravados: data?.length || 0,
        amostra: data?.slice(0, 3) || [],
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );

  } catch (err: any) {
    console.error("🚨 Erro na sync-obras:", err?.message || String(err));
    
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});