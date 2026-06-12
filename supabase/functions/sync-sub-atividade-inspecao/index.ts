// Edge function: sync-sub-atividade-inspecao
// Proxy para a API externa AW que lista subatividades de inspeção
// para um determinado IdAtividadeInspecao (grupo).

import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const AW_BASE_URL = "https://gateway.athiewohnrath.com.br/aw-api-hub";
const AW_API_KEY = Deno.env.get("AW_API_KEY") ?? "";

interface SubAtividade {
  IdAtividadeInspecao: number;
  DescricaoPai: string;
  IdSubAtividadeInspecao: number;
  SubDescricao: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    let idAtividade: string | null = null;
    const url = new URL(req.url);
    idAtividade = url.searchParams.get("idAtividadeInspecao");

    if (!idAtividade && (req.method === "POST")) {
      try {
        const body = await req.json();
        if (body?.idAtividadeInspecao != null) {
          idAtividade = String(body.idAtividadeInspecao);
        }
      } catch (_) { /* ignore */ }
    }

    if (!idAtividade || !/^\d+$/.test(idAtividade)) {
      return new Response(
        JSON.stringify({ success: false, error: "idAtividadeInspecao inválido ou ausente" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resp = await fetch(
      `${AW_BASE_URL}/check-lista-sub-atividade-inspecao?idAtividadeInspecao=${idAtividade}`,
      { headers: { accept: "*/*", "X-Api-Key": AW_API_KEY } },
    );
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`AW API falhou [${resp.status}]: ${text}`);
    }
    const raw = (await resp.text()).trim();
    const subs = (raw ? JSON.parse(raw) : []) as SubAtividade[];

    const subAtividades = subs
      .map((s) => ({
        id: s.IdSubAtividadeInspecao,
        codigo: String(s.IdSubAtividadeInspecao),
        nome: s.SubDescricao,
        idAtividadeInspecao: s.IdAtividadeInspecao,
        descricaoPai: s.DescricaoPai,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    return new Response(
      JSON.stringify({ success: true, subAtividades }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-sub-atividade-inspecao error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
