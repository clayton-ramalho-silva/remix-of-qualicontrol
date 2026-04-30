// Edge Function: transcrever-audio
// Recebe { audioBase64, mimeType } e retorna { texto } transcrito + limpo (PT-BR).
// Usa Lovable AI Gateway (Gemini 2.5 Flash) para transcrição multimodal e limpeza.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const body = await req.json().catch(() => ({}));
    const audioBase64 = String(body.audioBase64 || "");
    const mimeType = String(body.mimeType || "audio/webm");
    const contexto = String(body.contexto || ""); // ex: "descrição de desvio em obra"

    if (!audioBase64) return json({ error: "audioBase64 é obrigatório" }, 400);

    // Etapa 1: transcrição bruta com Gemini multimodal
    const transcResp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Você transcreve áudios em português brasileiro de profissionais de obra civil. Retorne APENAS o texto falado, sem comentários, sem aspas, sem formatação extra. Se o áudio estiver vazio ou inaudível, retorne string vazia.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Transcreva o áudio a seguir.${contexto ? ` Contexto: ${contexto}.` : ""}`,
              },
              {
                type: "input_audio",
                input_audio: { data: audioBase64, format: mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : "webm" },
              },
            ],
          },
        ],
      }),
    });

    if (transcResp.status === 429) return json({ error: "Limite de requisições. Tente em alguns segundos." }, 429);
    if (transcResp.status === 402) return json({ error: "Créditos da IA esgotados." }, 402);
    if (!transcResp.ok) {
      const t = await transcResp.text();
      console.error("Transcrição erro:", transcResp.status, t);
      return json({ error: "Erro ao transcrever áudio" }, 500);
    }

    const transcJson = await transcResp.json();
    const textoBruto = String(transcJson.choices?.[0]?.message?.content || "").trim();

    if (!textoBruto) return json({ texto: "" });

    // Etapa 2: limpeza/formalização do texto
    const cleanResp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "Você limpa transcrições de voz de profissionais de construção civil. Tarefas: corrigir pontuação e capitalização, remover muletas ('né', 'tipo', 'então', 'hã', 'éh'), remover repetições e gaguejos, manter o conteúdo técnico exatamente como dito, manter termos de obra (ex: contrapiso, prumo, gesso). NÃO invente informação, NÃO resuma, NÃO traduza. Retorne APENAS o texto limpo, sem aspas, sem comentários.",
          },
          { role: "user", content: textoBruto },
        ],
      }),
    });

    if (!cleanResp.ok) {
      // Se falhar a limpeza, devolve o texto bruto mesmo
      console.warn("Limpeza falhou, retornando bruto");
      return json({ texto: textoBruto });
    }

    const cleanJson = await cleanResp.json();
    const textoLimpo = String(cleanJson.choices?.[0]?.message?.content || textoBruto).trim();

    return json({ texto: textoLimpo });
  } catch (e) {
    console.error("transcrever-audio erro:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});