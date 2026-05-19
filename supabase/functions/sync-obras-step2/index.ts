// supabase/functions/sync-obras-step2/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  console.log("🚀 [STEP 2] Função iniciada - De-para");

  try {
    // 🌐 1. Chamar API externa
    console.log("🔄 Consultando API externa...");
    
    const response = await fetch("https://gateway.athiewohnrath.com.br/aw-api-hub/check-busca-projeto", {
      headers: {
        "accept": "*/*",
        "X-Api-Key": Deno.env.get("EXTERNAL_API_KEY")!,
      },
    });

    if (!response.ok) {
      throw new Error(`API retornou: ${response.status}`);
    }

    const externalData = await response.json();
    console.log(`✅ Recebidos ${externalData.length} projetos da API`);

    // 🔄 2. DE-PARA: Transformar campos da API → formato do banco
    console.log("🔄 Fazendo mapeamento de campos (de-para)...");
    
    const projetosTransformados = externalData.map((item: any) => {
      // Mapeamento conforme sua especificação:
      return {
        // Campos existentes no seu banco ← Campo da API
        cliente: item.Cliente,                    // ← Cliente
        codigo: item.NumeroProjeto,               // ← NumeroProjeto
        nome: item.NomeProjeto,                   // ← NomeProjeto
        endereco: item.Endereco,                  // ← Endereco
        
        // Campos novos que você quer adicionar
        id_externo: item.IdProjeto,               // ← IdProjeto (chave única)
        cidade: item.Cidade,                      // ← Cidade
        complementoEndereco: item.ComplementoEndereco, // ← ComplementoEndereco
        bairro: item.Bairro,                      // ← Bairro
        cep: item.Cep,                            // ← Cep        
      };
    });

    // 🔍 Log de amostra para conferência
    console.log("🔍 Amostra do primeiro registro transformado:");
    console.log(JSON.stringify(projetosTransformados[0], null, 2));

    // 📤 Responder com resumo da transformação
    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "De-para realizado com sucesso",
        total_recebidos: externalData.length,
        total_transformados: projetosTransformados.length,
        amostra: projetosTransformados.slice(0, 2) // retorna os 2 primeiros para conferência
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (err: any) {
    console.error("❌ Erro no step 2:", err?.message || String(err));
    
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Erro desconhecido" }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});