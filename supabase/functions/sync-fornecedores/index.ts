// Edge function: sync-fornecedores
// Pagina a API AW check-lista-fornecedor e popula:
//   - fornecedores (upsert por id_fornecedor)
//   - fornecedores_grupos (pivot via codigo de grupos)
//   - fornecedores_disciplinas (pivot via id_disciplina)
//
// Body opcional: { limit?: number, pageSize?: number }
//   - limit: máx. de fornecedores processados (útil para teste com 10)
//   - pageSize: tamanho da página da API (default 50)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const AW_BASE_URL = "https://gateway.athiewohnrath.com.br/aw-api-hub";
const AW_API_KEY = "Y30KrdWrst7kkOIcT5xy3RwtSSNM9h03";

interface ApiGrupo {
  IdAtividadeInspecao: number;
  DescricaoAtividade: string;
  IdSubAtividadeInspecao: number;
  DescricaoSubAtividade: string;
}
interface ApiFornecedor {
  IdFornecedor: number;
  CNPJ?: string;
  NomeFantasia?: string;
  RazaoSocial?: string;
  DataCriacao?: string;
  DataAlteracao?: string;
  Grupos?: ApiGrupo[];
}

function pickNome(f: ApiFornecedor): string {
  const nf = (f.NomeFantasia ?? "").trim();
  const rs = (f.RazaoSocial ?? "").trim();
  return nf.length > 0 ? nf : rs;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let limit: number | null = null;
    let pageSize = 50;
    let paginaInicial = 1;
    let paginaFinal: number | null = null;
    try {
      const body = await req.json();
      if (body?.limit != null) limit = Number(body.limit);
      if (body?.pageSize != null) pageSize = Number(body.pageSize);
      if (body?.paginaInicial != null) paginaInicial = Number(body.paginaInicial);
      if (body?.paginaFinal != null) paginaFinal = Number(body.paginaFinal);
    } catch (_) { /* sem body */ }

    // Pré-carrega mapas auxiliares para os pivots
    const { data: grupos, error: gErr } = await supabase
      .from("grupos").select("id, codigo");
    if (gErr) throw gErr;
    const grupoByCodigo = new Map<string, number>();
    (grupos ?? []).forEach((g: any) => grupoByCodigo.set(String(g.codigo), g.id));

    const { data: disciplinas, error: dErr } = await supabase
      .from("disciplinas").select("id, id_disciplina");
    if (dErr) throw dErr;
    const discByApiId = new Map<number, number>();
    (disciplinas ?? []).forEach((d: any) => discByApiId.set(Number(d.id_disciplina), d.id));

    const errors: { id_fornecedor?: number; error: string }[] = [];
    let totalApi = 0;
    let totalUpserted = 0;
    let totalGrupos = 0;
    let totalDisc = 0;
    let pagina = paginaInicial;

    while (true) {
      const url =
        `${AW_BASE_URL}/check-lista-fornecedor?pagina=${pagina}&tamanhoPagina=${pageSize}`;
      const resp = await fetch(url, {
        headers: { accept: "*/*", "X-Api-Key": AW_API_KEY },
      });
      if (!resp.ok) {
        throw new Error(`AW API falhou [${resp.status}] página ${pagina}: ${await resp.text()}`);
      }
      const data = (await resp.json()) as
        | ApiFornecedor[]
        | { dados?: ApiFornecedor[]; Itens?: ApiFornecedor[]; paginacao?: { totalPaginas?: number } };
      const lista: ApiFornecedor[] = Array.isArray(data)
        ? data
        : ((data as any)?.dados ?? (data as any)?.Itens ?? []);
      const totalPaginas = !Array.isArray(data)
        ? Number((data as any)?.paginacao?.totalPaginas ?? 0)
        : 0;
      if (!lista.length) break;
      totalApi += lista.length;

      // Aplica limite global se informado
      const restante = limit != null ? Math.max(0, limit - totalUpserted) : lista.length;
      const batch = limit != null ? lista.slice(0, restante) : lista;

      // Upsert fornecedores
      const rows = batch
        .filter((f) => f?.IdFornecedor)
        .map((f) => ({
          id_fornecedor: f.IdFornecedor,
          nome: pickNome(f) || `Fornecedor ${f.IdFornecedor}`,
        }));

      if (rows.length) {
        const { data: upserted, error: upErr } = await supabase
          .from("fornecedores")
          .upsert(rows, { onConflict: "id_fornecedor" })
          .select("id, id_fornecedor");
        if (upErr) throw new Error(`Upsert fornecedores: ${upErr.message}`);
        totalUpserted += upserted?.length ?? 0;

        const fornByApiId = new Map<number, number>();
        (upserted ?? []).forEach((r: any) =>
          fornByApiId.set(Number(r.id_fornecedor), r.id),
        );

        // Pivots
        const fgRows: { fornecedor_id: number; grupo_id: number }[] = [];
        const fdRows: { fornecedor_id: number; disciplina_id: number }[] = [];
        const fgSeen = new Set<string>();
        const fdSeen = new Set<string>();

        for (const f of batch) {
          const fornId = fornByApiId.get(Number(f.IdFornecedor));
          if (!fornId || !Array.isArray(f.Grupos)) continue;
          for (const g of f.Grupos) {
            const grupoId = grupoByCodigo.get(String(g.IdAtividadeInspecao));
            if (grupoId) {
              const k = `${fornId}:${grupoId}`;
              if (!fgSeen.has(k)) {
                fgSeen.add(k);
                fgRows.push({ fornecedor_id: fornId, grupo_id: grupoId });
              }
            }
            const discId = discByApiId.get(Number(g.IdSubAtividadeInspecao));
            if (discId) {
              const k = `${fornId}:${discId}`;
              if (!fdSeen.has(k)) {
                fdSeen.add(k);
                fdRows.push({ fornecedor_id: fornId, disciplina_id: discId });
              }
            } else {
              errors.push({
                id_fornecedor: f.IdFornecedor,
                error: `disciplina não encontrada IdSubAtividadeInspecao=${g.IdSubAtividadeInspecao}`,
              });
            }
          }
        }

        if (fgRows.length) {
          const { error: e1 } = await supabase
            .from("fornecedores_grupos")
            .upsert(fgRows, { onConflict: "fornecedor_id,grupo_id", ignoreDuplicates: true });
          if (e1) errors.push({ error: `pivot grupos: ${e1.message}` });
          else totalGrupos += fgRows.length;
        }
        if (fdRows.length) {
          const { error: e2 } = await supabase
            .from("fornecedores_disciplinas")
            .upsert(fdRows, { onConflict: "fornecedor_id,disciplina_id", ignoreDuplicates: true });
          if (e2) errors.push({ error: `pivot disciplinas: ${e2.message}` });
          else totalDisc += fdRows.length;
        }
      }

      if (limit != null && totalUpserted >= limit) break;
      if (totalPaginas && pagina >= totalPaginas) break;
      if (paginaFinal != null && pagina >= paginaFinal) break;
      if (lista.length === 0) break;
      pagina++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        paginas_lidas: pagina,
        fornecedores_api: totalApi,
        fornecedores_upserted: totalUpserted,
        vinculos_grupos: totalGrupos,
        vinculos_disciplinas: totalDisc,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-fornecedores error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
