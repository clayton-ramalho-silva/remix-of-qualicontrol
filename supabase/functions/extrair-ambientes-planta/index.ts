import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você analisa plantas arquitetônicas (planta baixa) e identifica TODOS os ambientes/cômodos rotulados.

Regras:
- Liste cada ambiente individualmente (não agrupe).
- Se houver múltiplos pavimentos na mesma planta, separe-os.
- Se houver numeração (ex: "Apto 301", "Sala 12"), extraia o número.
- Use o nome exatamente como aparece na legenda da planta.
- Se não conseguir identificar nenhum ambiente, retorne lista vazia.
- NÃO invente ambientes que não estejam claramente rotulados.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { plantaId } = await req.json();
    if (!plantaId) throw new Error("plantaId é obrigatório");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Marca como processando
    await supabase
      .from("plantas")
      .update({ extracao_status: "processando", extracao_erro: null })
      .eq("id", plantaId);

    const { data: planta, error: pErr } = await supabase
      .from("plantas")
      .select("id, url, nome")
      .eq("id", plantaId)
      .single();
    if (pErr || !planta) throw new Error("Planta não encontrada");

    // Chama Lovable AI Gateway com visão
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Identifique todos os ambientes desta planta arquitetônica chamada "${planta.nome}".`,
              },
              { type: "image_url", image_url: { url: planta.url } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "registrar_ambientes",
              description: "Registra a lista de ambientes detectados na planta",
              parameters: {
                type: "object",
                properties: {
                  ambientes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string", description: "Nome do ambiente como aparece na planta" },
                        pavimento: { type: "string", description: "Pavimento/andar (ex: Térreo, 1o Pav, Cobertura). Vazio se não aplicável." },
                        numero: { type: "string", description: "Número do ambiente (ex: 301, 12). Vazio se não houver." },
                      },
                      required: ["nome"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["ambientes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "registrar_ambientes" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) throw new Error("Limite de requisições excedido. Tente novamente em alguns segundos.");
      if (aiResp.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
      throw new Error(`AI gateway erro ${aiResp.status}: ${t}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("IA não retornou tool call estruturado");

    const args = JSON.parse(toolCall.function.arguments);
    const ambientes: Array<{ nome: string; pavimento?: string; numero?: string }> = args.ambientes || [];

    // Limpa ambientes anteriores marcados como IA não revisados (re-extração)
    await supabase
      .from("planta_ambientes")
      .delete()
      .eq("planta_id", plantaId)
      .eq("origem", "ia")
      .eq("revisado", 0);

    if (ambientes.length > 0) {
      const rows = ambientes.map((a) => ({
        planta_id: plantaId,
        nome: a.nome,
        pavimento: a.pavimento || null,
        numero: a.numero || null,
        origem: "ia",
        revisado: 0,
      }));
      const { error: insErr } = await supabase.from("planta_ambientes").insert(rows);
      if (insErr) throw insErr;
    }

    await supabase
      .from("plantas")
      .update({
        extracao_status: "concluido",
        extracao_at: new Date().toISOString(),
        extracao_erro: null,
      })
      .eq("id", plantaId);

    return new Response(
      JSON.stringify({ ok: true, total: ambientes.length, ambientes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("extrair-ambientes-planta erro:", msg);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.plantaId) {
        await supabase
          .from("plantas")
          .update({ extracao_status: "erro", extracao_erro: msg })
          .eq("id", body.plantaId);
      }
    } catch {}
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});