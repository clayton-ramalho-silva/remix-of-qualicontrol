// Edge Function: assistente-ia
// Suporta dois modos:
//   { mode: "suggest", obraId? } -> { suggestions: string[] }
//   { mode: "ask", question, obraId? } -> { answer: string }
// Usa Lovable AI Gateway (LOVABLE_API_KEY) com contexto agregado dos desvios.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function buildContext(supabase: any, obraId?: number) {
  let q = supabase
    .from("desvios")
    .select(
      "id, descricao, severidade, status, origem, disciplina, fornecedor_nome, data_identificacao, prazo_sugerido, data_fechamento, tag_critico, tag_seguranca_trabalho, obra_id"
    )
    .order("data_identificacao", { ascending: false })
    .limit(200);
  if (obraId) q = q.eq("obra_id", obraId);
  const { data: desvios } = await q;

  const list = desvios || [];
  const total = list.length;
  const abertos = list.filter((d: any) => d.status !== "fechado").length;
  const fechados = list.filter((d: any) => d.status === "fechado").length;
  const graves = list.filter((d: any) => d.severidade === "grave").length;
  const criticos = list.filter((d: any) => d.tag_critico === 1).length;
  const now = Date.now();
  const atrasados = list.filter(
    (d: any) =>
      d.status !== "fechado" && d.prazo_sugerido && Number(d.prazo_sugerido) < now
  ).length;

  const porFornecedor = new Map<string, number>();
  list.forEach((d: any) => {
    const k = d.fornecedor_nome || "Sem fornecedor";
    porFornecedor.set(k, (porFornecedor.get(k) || 0) + 1);
  });

  let obraInfo = "";
  if (obraId) {
    const { data: obra } = await supabase
      .from("obras")
      .select("codigo, nome, cliente")
      .eq("id", obraId)
      .maybeSingle();
    if (obra) obraInfo = `Obra: ${obra.codigo} — ${obra.nome}${obra.cliente ? ` (${obra.cliente})` : ""}`;
  } else {
    obraInfo = "Escopo: todas as obras";
  }

  const topForn = Array.from(porFornecedor.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n, c]) => `  - ${n}: ${c} desvios`)
    .join("\n");

  const sample = list
    .slice(0, 25)
    .map(
      (d: any) =>
        `#${d.id} [${d.severidade}/${d.status}] ${d.disciplina || "-"} | ${
          d.fornecedor_nome || "-"
        } | ${(d.descricao || "").slice(0, 120)}`
    )
    .join("\n");

  return `${obraInfo}
KPIs: total=${total}, abertos=${abertos}, fechados=${fechados}, graves=${graves}, criticos=${criticos}, atrasados=${atrasados}
Top fornecedores por nº de desvios:
${topForn || "  (sem dados)"}
Amostra de desvios (até 25):
${sample || "(sem desvios)"}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;


  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const mode = body.mode;
    const obraId = body.obraId ? Number(body.obraId) : undefined;

    const context = await buildContext(supabase, obraId);

    if (mode === "suggest") {
      const aiResp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente de qualidade na construção civil. Sugira perguntas analíticas curtas (máx 12 palavras) que o usuário poderia fazer com base no contexto fornecido. Responda EXCLUSIVAMENTE chamando a tool suggest_questions.",
            },
            { role: "user", content: `Contexto:\n${context}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_questions",
                description: "Retorna 4 perguntas sugeridas",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 3,
                      maxItems: 5,
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "suggest_questions" } },
        }),
      });

      if (aiResp.status === 429) return json({ error: "Rate limit. Tente novamente em instantes." }, 429);
      if (aiResp.status === 402) return json({ error: "Créditos esgotados no workspace de Lovable AI." }, 402);
      if (!aiResp.ok) {
        const t = await aiResp.text();
        console.error("AI error", aiResp.status, t);
        return json({ error: "Erro no gateway de IA" }, 500);
      }

      const data = await aiResp.json();
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      let suggestions: string[] = [];
      try {
        suggestions = JSON.parse(args || "{}").suggestions || [];
      } catch {
        suggestions = [];
      }
      if (suggestions.length === 0) {
        suggestions = [
          "Quais fornecedores têm mais desvios graves?",
          "Quantos desvios estão atrasados?",
          "Qual disciplina concentra mais problemas?",
          "Qual a taxa de fechamento atual?",
        ];
      }
      return json({ suggestions });
    }

    if (mode === "ask") {
      const question = String(body.question || "").trim();
      if (!question) return json({ error: "question é obrigatório" }, 400);

      const aiResp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content:
                "Você é um analista de qualidade na construção civil. Responda a pergunta do usuário usando APENAS o contexto fornecido. Seja conciso, use markdown e bullets quando útil. Se faltar dado, diga claramente.",
            },
            { role: "user", content: `Contexto:\n${context}\n\nPergunta: ${question}` },
          ],
        }),
      });

      if (aiResp.status === 429) return json({ error: "Rate limit. Tente novamente em instantes." }, 429);
      if (aiResp.status === 402) return json({ error: "Créditos esgotados no workspace de Lovable AI." }, 402);
      if (!aiResp.ok) {
        const t = await aiResp.text();
        console.error("AI error", aiResp.status, t);
        return json({ error: "Erro no gateway de IA" }, 500);
      }

      const data = await aiResp.json();
      const answer = data.choices?.[0]?.message?.content || "Sem resposta.";
      return json({ answer });
    }

    return json({ error: "mode inválido (use 'suggest' ou 'ask')" }, 400);
  } catch (e) {
    console.error("assistente-ia error", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});