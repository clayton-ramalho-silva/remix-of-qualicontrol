// supabase/functions/sync-obras-step1/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  console.log("🚀 [STEP 1] Função iniciada!");

  // 🔐 Validação simples (opcional)
  
  const apiKey = req.headers.get("X-Api-Key");
  const expected = Deno.env.get("INTERNAL_API_KEY");
  if (expected && apiKey !== expected) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), { 
      status: 401, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    // 🌐 1. Chamar API externa
    console.log("🔄 Consultando API externa...");
    // 🔄 Antes do fetch da API externa, adicione:
    console.log("🔑 EXTERNAL_API_KEY presente:", !!Deno.env.get("EXTERNAL_API_KEY"));
    console.log("🔑 Primeiro chars da chave:", Deno.env.get("EXTERNAL_API_KEY")?.substring(0, 8) + "...");

    console.log("🌐 Chamando API externa...");
    console.log("🌐 URL:", "https://gateway.athiewohnrath.com.br/aw-api-hub/check-busca-projeto");
    
    const response = await fetch("https://gateway.athiewohnrath.com.br/aw-api-hub/check-busca-projeto", {
        headers: {
            "accept": "*/*",
            "X-Api-Key": Deno.env.get("EXTERNAL_API_KEY")!,  // ← esta é a chave que está indo
        },
    });

    console.log("📡 Resposta da API externa - Status:", response.status);
    console.log("📡 Resposta da API externa - Headers:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
    const errorText = await response.text().catch(() => "sem corpo");
    console.log("❌ Corpo do erro da API externa:", errorText.substring(0, 200));
    throw new Error(`API retornou: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    
    // ✅ 2. Mostrar no console.log (isso aparece no dashboard do Supabase)
    console.log("✅ API respondida com sucesso!");
    console.log("📊 Quantidade de obras recebidas:", Array.isArray(data) ? data.length : "N/A");
    
    // 🔍 Mostrar amostra dos dados (primeiro item)
    if (Array.isArray(data) && data.length > 0) {
      console.log("🔍 Amostra do primeiro registro:", JSON.stringify(data[0], null, 2));
    }

    // 📤 Responder para quem chamou
    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "Consulta realizada. Verifique os logs para detalhes.",
        count: Array.isArray(data) ? data.length : 0 
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (err: any) {
    console.error("❌ Erro:", err?.message || String(err));
    
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Erro desconhecido" }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});