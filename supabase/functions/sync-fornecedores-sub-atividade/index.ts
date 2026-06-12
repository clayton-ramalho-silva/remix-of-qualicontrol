// Edge function: sync-fornecedores-sub-atividade
// Proxy para a API externa AW que lista fornecedores
// de um projeto + subatividade de inspeção.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const AW_BASE_URL = "https://gateway.athiewohnrath.com.br/aw-api-hub";
const AW_API_KEY = Deno.env.get("AW_API_KEY") ?? "";

interface FornecedorApi {
  IdFornecedor: number;
  NomeFantasia: string;
  Cnpj: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let idProjeto: string | null = null;
    let idSubAtividade: string | null = null;
    const url = new URL(req.url);
    idProjeto = url.searchParams.get("idProjeto");
    idSubAtividade = url.searchParams.get("idSubAtividadeInspecao");

    if ((!idProjeto || !idSubAtividade) && req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.idProjeto != null) idProjeto = String(body.idProjeto);
        if (body?.idSubAtividadeInspecao != null) {
          idSubAtividade = String(body.idSubAtividadeInspecao);
        }
      } catch (_) { /* ignore */ }
    }

    if (!idProjeto || !/^\d+$/.test(idProjeto)) {
      return new Response(
        JSON.stringify({ success: false, error: "idProjeto inválido ou ausente" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!idSubAtividade || !/^\d+$/.test(idSubAtividade)) {
      return new Response(
        JSON.stringify({ success: false, error: "idSubAtividadeInspecao inválido ou ausente" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resp = await fetch(
      `${AW_BASE_URL}/check-lista-atividade-sub-atividade-fornecedor?idProjeto=${idProjeto}&idSubAtividadeInspecao=${idSubAtividade}`,
      { headers: { accept: "*/*", "X-Api-Key": AW_API_KEY } },
    );
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`AW API falhou [${resp.status}]: ${text}`);
    }
    const fornecedores = (await resp.json()) as FornecedorApi[];

    const list = fornecedores
      .map((f) => ({
        id: f.IdFornecedor,
        nome: f.NomeFantasia,
        cnpj: f.Cnpj,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    return new Response(
      JSON.stringify({ success: true, fornecedores: list }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-fornecedores-sub-atividade error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
