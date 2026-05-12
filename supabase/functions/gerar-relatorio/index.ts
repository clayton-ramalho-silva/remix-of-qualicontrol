// Edge Function: gerar-relatorio
// Recebe filtros + flags de exibição, agrega dados de Supabase e devolve
// estrutura consumida por src/pages/Relatorio.tsx (formato="pdf").
// Opcionalmente chama Lovable AI para gerar análise executiva.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cfg = await req.json();
    const {
      obraId,
      dataInicial,
      dataFinal,
      origens,
      fornecedorNome,
      tagCritico,
      tagSegurancaTrabalho,
      tagSolicitadoCliente,
      tagSolicitadoGerenciadora,
      tagSolicitadoArquitetura,
      formato = "pdf",
      incluirAnalise = false,
    } = cfg;

    // ---- Query desvios ----
    let q = supabase.from("desvios").select("*").order("data_identificacao", { ascending: false });
    if (obraId) q = q.eq("obra_id", obraId);
    if (dataInicial) q = q.gte("data_identificacao", dataInicial);
    if (dataFinal) q = q.lte("data_identificacao", dataFinal);
    if (origens && origens.length > 0) q = q.in("origem", origens);
    if (fornecedorNome) q = q.eq("fornecedor_nome", fornecedorNome);
    if (tagCritico === "sim") q = q.eq("tag_critico", 1);
    else if (tagCritico === "nao") q = q.eq("tag_critico", 0);
    if (tagSegurancaTrabalho === "sim") q = q.eq("tag_seguranca_trabalho", 1);
    else if (tagSegurancaTrabalho === "nao") q = q.eq("tag_seguranca_trabalho", 0);
    if (tagSolicitadoCliente === "sim") q = q.eq("tag_solicitado_cliente", 1);
    else if (tagSolicitadoCliente === "nao") q = q.eq("tag_solicitado_cliente", 0);
    if (tagSolicitadoGerenciadora === "sim") q = q.eq("tag_solicitado_gerenciadora", 1);
    else if (tagSolicitadoGerenciadora === "nao") q = q.eq("tag_solicitado_gerenciadora", 0);
    if (tagSolicitadoArquitetura === "sim") q = q.eq("tag_solicitado_arquitetura", 1);
    else if (tagSolicitadoArquitetura === "nao") q = q.eq("tag_solicitado_arquitetura", 0);
    const { data: desviosRaw, error } = await q;
    if (error) throw error;
    const desvios = desviosRaw || [];
    const ids = desvios.map((d: any) => d.id);

    // ---- KPIs ----
    const now = Date.now();
    const total = desvios.length;
    const abertos = desvios.filter((d: any) => d.status === "aberto").length;
    const emAndamento = desvios.filter((d: any) => d.status === "em_andamento").length;
    const aguardandoAceite = desvios.filter((d: any) => d.status === "aguardando_aceite").length;
    const fechados = desvios.filter((d: any) => d.status === "fechado").length;
    const atrasados = desvios.filter(
      (d: any) =>
        d.status !== "fechado" &&
        d.status !== "aguardando_aceite" &&
        d.prazo_sugerido &&
        Number(d.prazo_sugerido) < now
    ).length;
    const graves = desvios.filter((d: any) => d.severidade === "grave").length;
    const taxaFechamento = total > 0 ? Math.round((fechados / total) * 100) : 0;
    const kpis = { total, abertos, emAndamento, aguardandoAceite, fechados, atrasados, graves, taxaFechamento };

    // ---- Por disciplina/grupo ----
    const porDisciplina: Record<string, any> = {};
    desvios.forEach((d: any) => {
      const k = d.disciplina || "Sem disciplina";
      if (!porDisciplina[k]) {
        porDisciplina[k] = { total: 0, abertos: 0, emAndamento: 0, aguardandoAceite: 0, fechados: 0, atrasados: 0, graves: 0 };
      }
      const g = porDisciplina[k];
      g.total++;
      if (d.status === "aberto") g.abertos++;
      if (d.status === "em_andamento") g.emAndamento++;
      if (d.status === "aguardando_aceite") g.aguardandoAceite++;
      if (d.status === "fechado") g.fechados++;
      if (
        d.status !== "fechado" &&
        d.status !== "aguardando_aceite" &&
        d.prazo_sugerido &&
        Number(d.prazo_sugerido) < now
      ) g.atrasados++;
      if (d.severidade === "grave") g.graves++;
    });

    // ---- Performance fornecedores ----
    const fornMap = new Map<string, any>();
    desvios.forEach((d: any) => {
      const k = d.fornecedor_nome || "Sem fornecedor";
      const cur = fornMap.get(k) || { nome: k, total: 0, abertos: 0, fechados: 0, graves: 0 };
      cur.total++;
      if (d.status !== "fechado") cur.abertos++;
      if (d.status === "fechado") cur.fechados++;
      if (d.severidade === "grave") cur.graves++;
      fornMap.set(k, cur);
    });
    const performance = Array.from(fornMap.values())
      .map((f: any) => ({
        ...f,
        taxaFechamento: f.total > 0 ? Math.round((f.fechados / f.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ---- Fotos, planos, plantas (uma query cada) ----
    const [{ data: fotosAll }, { data: planosAll }, { data: plantasAll }] = await Promise.all([
      ids.length > 0
        ? supabase.from("fotos_evidencia").select("desvio_id, tipo, url").in("desvio_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length > 0
        ? supabase.from("planos_acao").select("desvio_id, acao, responsavel, prioridade, status").in("desvio_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("plantas").select("id, nome, url"),
    ]);

    const fotosMap = new Map<number, { abertura: string[]; fechamento: string[] }>();
    (fotosAll || []).forEach((f: any) => {
      const cur = fotosMap.get(f.desvio_id) || { abertura: [], fechamento: [] };
      if (f.tipo === "fechamento") cur.fechamento.push(f.url);
      else cur.abertura.push(f.url);
      fotosMap.set(f.desvio_id, cur);
    });
    const planosMap = new Map<number, any[]>();
    (planosAll || []).forEach((p: any) => {
      const arr = planosMap.get(p.desvio_id) || [];
      arr.push(p);
      planosMap.set(p.desvio_id, arr);
    });
    const plantaById = new Map<number, any>();
    (plantasAll || []).forEach((p: any) => plantaById.set(p.id, p));

    // Aprovações
    const { data: aprovAll } = ids.length > 0
      ? await supabase.from("desvio_aprovacoes").select("*").in("desvio_id", ids)
      : { data: [] as any[] };
    const aprovMap = new Map<number, any[]>();
    (aprovAll || []).forEach((a: any) => {
      const arr = aprovMap.get(a.desvio_id) || [];
      arr.push({
        tipo: a.tipo,
        decisao: a.decisao,
        aprovador_nome: a.aprovador_nome,
        comentario: a.comentario,
        created_at: a.created_at,
      });
      aprovMap.set(a.desvio_id, arr);
    });

    const desviosOut = desvios.map((d: any) => {
      const fotos = fotosMap.get(d.id) || { abertura: [], fechamento: [] };
      const planta = d.planta_id ? plantaById.get(d.planta_id) : null;
      return {
        id: d.id,
        descricao: d.descricao,
        disciplina: d.disciplina || "—",
        fornecedor: d.fornecedor_nome,
        severidade: d.severidade,
        status: d.status,
        origem: d.origem,
        localizacao: d.localizacao,
        dataIdentificacao: d.data_identificacao ? Number(d.data_identificacao) : null,
        prazoSugerido: d.prazo_sugerido ? Number(d.prazo_sugerido) : null,
        dataFechamento: d.data_fechamento ? Number(d.data_fechamento) : null,
        tagCritico: d.tag_critico,
        tagSegurancaTrabalho: d.tag_seguranca_trabalho,
        tagSolicitadoCliente: d.tag_solicitado_cliente,
        tagSolicitadoGerenciadora: d.tag_solicitado_gerenciadora,
        tagSolicitadoArquitetura: d.tag_solicitado_arquitetura,
        fotosAbertura: fotos.abertura,
        fotosFechamento: fotos.fechamento,
        planos: planosMap.get(d.id) || [],
        plantaId: d.planta_id,
        plantaNome: planta?.nome,
        plantaUrl: planta?.url,
        pinX: d.pin_x,
        pinY: d.pin_y,
        aprovacoes: aprovMap.get(d.id) || [],
      };
    });

    // ---- Obra info ----
    let obraInfo: any = null;
    if (obraId) {
      const { data: obra } = await supabase
        .from("obras")
        .select("id, codigo, nome, cliente, endereco")
        .eq("id", obraId)
        .maybeSingle();
      obraInfo = obra;
    }

    // ---- Excel ----
    if (formato === "excel") {
      const wb = XLSX.utils.book_new();
      const kpisRows = [
        ["Indicador", "Valor"],
        ["Total", kpis.total],
        ["Abertos", kpis.abertos],
        ["Em andamento", kpis.emAndamento],
        ["Aguardando aceite", kpis.aguardandoAceite],
        ["Fechados", kpis.fechados],
        ["Atrasados", kpis.atrasados],
        ["Graves", kpis.graves],
        ["Taxa de fechamento (%)", kpis.taxaFechamento],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpisRows), "KPIs");

      const fmtDate = (ts: number | null) =>
        ts ? new Date(ts).toISOString().slice(0, 10) : "";
      const desviosRows = [
        [
          "ID", "Descrição", "Disciplina", "Fornecedor", "Severidade",
          "Status", "Origem", "Localização", "Data identificação",
          "Prazo sugerido", "Data fechamento", "Crítico",
          "Segurança", "Solicitado cliente", "Solic. Gerenciadora", "Solic. Arquitetura", "Planta",
        ],
        ...desviosOut.map((d: any) => [
          d.id, d.descricao, d.disciplina, d.fornecedor, d.severidade,
          d.status, d.origem, d.localizacao,
          fmtDate(d.dataIdentificacao), fmtDate(d.prazoSugerido), fmtDate(d.dataFechamento),
          d.tagCritico ? "Sim" : "Não",
          d.tagSegurancaTrabalho ? "Sim" : "Não",
          d.tagSolicitadoCliente ? "Sim" : "Não",
          d.tagSolicitadoGerenciadora ? "Sim" : "Não",
          d.tagSolicitadoArquitetura ? "Sim" : "Não",
          d.plantaNome || "",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(desviosRows), "Desvios");

      const discRows = [
        ["Disciplina", "Total", "Abertos", "Em andamento", "Ag. aceite", "Fechados", "Atrasados", "Graves"],
        ...Object.entries(porDisciplina).map(([k, v]: any) => [
          k, v.total, v.abertos, v.emAndamento, v.aguardandoAceite, v.fechados, v.atrasados, v.graves,
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(discRows), "Por disciplina");

      const perfRows = [
        ["Fornecedor", "Total", "Abertos", "Fechados", "Graves", "Taxa fechamento (%)"],
        ...performance.map((f: any) => [f.nome, f.total, f.abertos, f.fechados, f.graves, f.taxaFechamento]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(perfRows), "Fornecedores");

      const buf = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const excelUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${buf}`;
      return json({ formato: "excel", excelUrl, kpis, obraInfo, config: cfg, dataGeracao: Date.now() });
    }

    // ---- Análise IA opcional ----
    let analise: string | null = null;
    if (incluirAnalise) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          const topForn = performance.slice(0, 5).map((f) => `${f.nome} (${f.total} desvios, ${f.taxaFechamento}% fech.)`).join("; ");
          const topDisc = Object.entries(porDisciplina)
            .sort(([, a]: any, [, b]: any) => b.total - a.total)
            .slice(0, 5)
            .map(([n, v]: any) => `${n} (${v.total})`)
            .join("; ");
          const ctx = `${obraInfo ? `Obra: ${obraInfo.codigo} — ${obraInfo.nome}` : "Todas as obras"}
KPIs: ${JSON.stringify(kpis)}
Top disciplinas: ${topDisc || "—"}
Top fornecedores: ${topForn || "—"}`;
          const aiResp = await fetch(AI_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content:
                    "Você é um gerente de qualidade. Produza uma análise executiva em markdown (3-5 parágrafos curtos, com bullets). Destaque riscos, fornecedores críticos, ações sugeridas. Seja direto.",
                },
                { role: "user", content: ctx },
              ],
            }),
          });
          if (aiResp.ok) {
            const ai = await aiResp.json();
            analise = ai.choices?.[0]?.message?.content || null;
          } else {
            console.warn("Análise IA falhou:", aiResp.status, await aiResp.text());
          }
        } catch (e) {
          console.warn("Análise IA erro:", e);
        }
      }
    }

    return json({
      formato,
      kpis,
      obraInfo,
      desvios: desviosOut,
      porDisciplina,
      performance,
      analise,
      config: cfg,
      dataGeracao: Date.now(),
    });
  } catch (e) {
    console.error("gerar-relatorio error", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});