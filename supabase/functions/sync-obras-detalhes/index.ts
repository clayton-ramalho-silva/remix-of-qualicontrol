// supabase/functions/sync-obras-detalhes/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🔍 1. Buscar obras para processar (com ID INTERNO e EXTERNO)
    const { data: obras, error: obrasError } = await supabase
      .from("obras")
      .select("id, id_externo")  // ✅ Busca ambos: id interno e id_externo
      .not("id_externo", "is", null);

    if (obrasError) throw obrasError;
    console.log(`📋 Processando ${obras?.length || 0} obras...`);

    // 🗺️ Criar mapa: id_externo (API) → id interno (banco)
    const obraIdMap = new Map<number, number>();
    if (obras) {
      for (const obra of obras) {
        obraIdMap.set(obra.id_externo, obra.id);  // chave: externo, valor: interno
      }
    }

    let totalEdificios = 0;
    let totalAndares =  0;
    const erros: string[] = [];

    // 🔄 2. Iterar sobre cada obra
    for (const obra of obras) {
      const idProjetoExterno = obra.id_externo;
      const obraIdInterno = obra.id;  // ✅ ID INTERNO para usar como chave estrangeira

      // Pular se não achou o mapeamento (segurança)
      if (!obraIdInterno) {
        console.warn(`⚠️ Obra id_externo=${idProjetoExterno} sem ID interno encontrado`);
        continue;
      }

      try {
        // 🌐 Chamar API externa
        const response = await fetch(
          `https://gateway.athiewohnrath.com.br/aw-api-hub/check-lista-edificio-andar-projeto?idProjeto=${idProjetoExterno}`,
          {
            headers: {
              "accept": "*/*",
              "X-Api-Key": Deno.env.get("EXTERNAL_API_KEY")!,
            },
          }
        );

        if (!response.ok) {
          console.warn(`⚠️ API retornou ${response.status} para obra ${idProjetoExterno}`);
          continue;
        }

        const responseText = await response.text();
        if (!responseText?.trim()) {
          console.log(`ℹ️ Resposta vazia para obra ${idProjetoExterno}`);
          continue;
        }

        let detalhes;
        try {
          detalhes = JSON.parse(responseText);
        } catch (e: any) {
          console.warn(`⚠️ JSON inválido para obra ${idProjetoExterno}: ${e.message}`);
          continue;
        }

        if (!Array.isArray(detalhes) || detalhes.length === 0) continue;

        // 🏢 3. Processar EDIFÍCIOS (deduplicados) - CORREÇÃO AQUI ✅
        const edificiosMap = new Map();
        for (const item of detalhes) {
          if (!edificiosMap.has(item.IdEdificio)) {
            edificiosMap.set(item.IdEdificio, {
              id_externo: Number(item.IdEdificio),
              obra_id: obraIdInterno,  // ✅ CORREÇÃO: usa ID INTERNO da tabela obras
              nome: item.NomeEdificio,
              codigo: String(item.IdEdificio),
            });
          }
        }

        if (edificiosMap.size > 0) {
          const { error: edifError } = await supabase
            .from("edificios")
            .upsert(Array.from(edificiosMap.values()), {
              onConflict: "obra_id,id_externo",
            });

          if (edifError) {
            console.error(`❌ Erro edifícios obra ${idProjetoExterno}:`, edifError.message);
            erros.push(`Edifícios ${idProjetoExterno}: ${edifError.message}`);
          } else {
            totalEdificios += edificiosMap.size;
          }
        }

        // 🗺️ 4. Mapear ID Externo do edifício → ID Interno do banco
        const { data: edifList } = await supabase
          .from("edificios")
          .select("id, id_externo")
          .eq("obra_id", obraIdInterno);  // ✅ Filtra pelo ID INTERNO da obra

        const edificioInternoMap = new Map<string, number>();
        if (edifList) {
          for (const ed of edifList) {
            edificioInternoMap.set(String(ed.id_externo), ed.id);
          }
        }

        // 🏢 5. Processar ANDARES
        const andaresParaGravar = detalhes
          .map((item: any) => {
            const edificioId = edificioInternoMap.get(String(item.IdEdificio));
            
            if (!edificioId) {
              console.warn(`⚠️ Edifício IdEdificio=${item.IdEdificio} não encontrado para obra ${idProjetoExterno}`);
              return null;
            }

            return {
              id_externo: Number(item.IdPavimento),
              edificio_id: edificioId,
              nome: item.NomePavimento,
              numero: String(item.IdPavimento),
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        if (andaresParaGravar.length > 0) {
          const { error: andarError } = await supabase
            .from("andares")
            .upsert(andaresParaGravar, {
              onConflict: "edificio_id,id_externo",
            });

          if (andarError) {
            console.error(`❌ Erro andares obra ${idProjetoExterno}:`, andarError.message);
            erros.push(`Andares ${idProjetoExterno}: ${andarError.message}`);
          } else {
            totalAndares += andaresParaGravar.length;
          }
        }

        // ⏱️ Delay para rate limiting
        await new Promise(r => setTimeout(r, 150));

      } catch (err: any) {
        console.error(`❌ Erro ao processar obra ${idProjetoExterno}:`, err?.message);
        erros.push(`Obra ${idProjetoExterno}: ${err?.message}`);
      }
    }

    // 📤 Resposta final
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Sincronização de detalhes concluída",
        total_obras_processadas: obras?.length || 0,
        total_edificios_gravados: totalEdificios,
        total_andares_gravados: totalAndares,
        erros: erros.length > 0 ? erros : undefined,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );

  } catch (err: any) {
    console.error("🚨 Erro crítico:", err?.message);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});