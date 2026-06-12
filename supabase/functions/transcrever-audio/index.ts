// Edge Function: transcrever-audio
// Recebe { audioBase64, mimeType } e retorna { texto } transcrito + limpo (PT-BR).
// Usa Lovable AI Gateway (Gemini 2.5 Flash) para transcrição multimodal e limpeza.

import { requireAuth } from "../_shared/auth.ts";

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

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;


  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const body = await req.json().catch(() => ({}));
    const audioBase64 = String(body.audioBase64 || "");
    const mimeType = String(body.mimeType || "audio/webm");
    const contexto = String(body.contexto || ""); // ex: "descrição de desvio em obra"

    if (!audioBase64) return json({ error: "audioBase64 é obrigatório" }, 400);

    // Mapeia mime real para o "format" aceito pelo gateway
    const mt = mimeType.toLowerCase();
    const audioFormat = mt.includes("mp4") || mt.includes("aac") || mt.includes("m4a")
      ? "mp4"
      : mt.includes("wav")
      ? "wav"
      : mt.includes("ogg")
      ? "ogg"
      : mt.includes("mp3") || mt.includes("mpeg")
      ? "mp3"
      : "webm";

    console.log("transcrever-audio: bytes=", audioBase64.length, "mime=", mimeType, "format=", audioFormat);

    // Etapa 1: transcrição bruta com Gemini multimodal
    const transcResp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "Você transcreve áudios em português brasileiro de profissionais de obra civil. Tarefa: transcrever LITERALMENTE o que foi falado, mantendo termos técnicos (contrapiso, prumo, gesso, drywall, esquadria, etc.), nomes próprios e números exatamente como ditos. NÃO resuma, NÃO traduza, NÃO invente conteúdo. Retorne APENAS o texto falado, sem comentários, sem aspas, sem formatação. Se o áudio estiver vazio ou inaudível, retorne string vazia.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Transcreva LITERALMENTE o áudio em português brasileiro.${contexto ? ` Contexto: ${contexto}.` : ""}`,
              },
              {
                type: "input_audio",
                input_audio: { data: audioBase64, format: audioFormat },
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

    // Etapa 2: APENAS pontuação/capitalização (não altera palavras)
    const cleanResp = await fetch(AI_URL, {
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
              "Você adiciona APENAS pontuação e capitalização a uma transcrição de voz em português brasileiro. REGRAS ESTRITAS: NÃO altere palavras, NÃO remova palavras, NÃO troque sinônimos, NÃO resuma, NÃO reescreva. Apenas: adicionar pontos, vírgulas, pontos de interrogação, capitalizar inícios de frase e nomes próprios óbvios. Mantenha todas as palavras técnicas e números exatamente como vieram. Retorne APENAS o texto, sem aspas, sem comentários.",
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