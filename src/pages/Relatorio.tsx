import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useRef } from "react";
import {
  FileText, Download, Loader2, BarChart3, AlertTriangle,
  TrendingUp, Printer, BrainCircuit, Search, ClipboardCheck,
  Wrench, Filter, Settings2, Image, Users, Calendar, CheckCircle2,
  Clock, Siren, HardHat, UserCheck, Tag, MapPin,
  ShieldCheck,
} from "lucide-react";
import { Streamdown } from "streamdown";

const statusLabels: Record<string, string> = {
  aberto: "Aberto", em_andamento: "Em Andamento",
  fechado: "Fechado", aguardando_aceite: "Ag. Aceite",
};
const origemLabels: Record<string, string> = {
  qualidade: "Qualidade", checklist: "Checklist", qsms: "QSMS",
};
const sevColors: Record<string, string> = {
  grave: "bg-red-100 text-red-700",
  moderado: "bg-amber-100 text-amber-700",
  leve: "bg-emerald-100 text-emerald-700",
};
const statusColors: Record<string, string> = {
  aberto: "bg-amber-100 text-amber-700",
  em_andamento: "bg-blue-100 text-blue-700",
  fechado: "bg-emerald-100 text-emerald-700",
  aguardando_aceite: "bg-purple-100 text-purple-700",
};

function groupByAmbiente(desvios: any[]): { nome: string; items: any[] }[] {
  const map = new Map<string, any[]>();
  for (const d of desvios) {
    const key = (d.localizacao && String(d.localizacao).trim()) || "__sem__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  const namedKeys = Array.from(map.keys()).filter(k => k !== "__sem__").sort((a, b) => a.localeCompare(b, "pt-BR"));
  const result = namedKeys.map(k => ({ nome: k, items: map.get(k)! }));
  if (map.has("__sem__")) result.push({ nome: "Sem ambiente definido", items: map.get("__sem__")! });
  return result;
}

function isAtrasado(d: any): boolean {
  return !!d?.prazoSugerido && d.status !== "fechado" && d.prazoSugerido < Date.now();
}
function diasAtraso(d: any): number {
  if (!isAtrasado(d)) return 0;
  return Math.floor((Date.now() - d.prazoSugerido) / 86400000);
}

export default function Relatorio() {
  const { data: obras } = trpc.obras.list.useQuery();
  const { data: fornecedores } = trpc.fornecedores.list.useQuery();
  const reportRef = useRef<HTMLDivElement>(null);

  // Seção 1 — Filtros principais
  const [obraId, setObraId] = useState<string>("all");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  // Seção 2 — Verticais
  const [origemQualidade, setOrigemQualidade] = useState(true);
  const [origemPunchList, setOrigemPunchList] = useState(true);
  const [origemPosObra, setOrigemPosObra] = useState(true);

  // Seção 3 — Filtros adicionais
  const [fornecedorNome, setFornecedorNome] = useState<string>("all");
  const [tagCritico, setTagCritico] = useState<"sim" | "nao" | "todos">("todos");
  const [tagSeguranca, setTagSeguranca] = useState<"sim" | "nao" | "todos">("todos");
  const [tagSolicitado, setTagSolicitado] = useState<"sim" | "nao" | "todos">("todos");
  const [tagGerenciadora, setTagGerenciadora] = useState<"sim" | "nao" | "todos">("todos");
  const [tagArquitetura, setTagArquitetura] = useState<"sim" | "nao" | "todos">("todos");

  // Seção 4 — Conteúdo
  const [mostrarFornecedores, setMostrarFornecedores] = useState(true);
  const [mostrarResponsaveis, setMostrarResponsaveis] = useState(true);
  const [mostrarVertical, setMostrarVertical] = useState(true);
  const [mostrarDataPrevista, setMostrarDataPrevista] = useState(true);
  const [mostrarDataCriacao, setMostrarDataCriacao] = useState(true);
  const [mostrarDataFinalizacao, setMostrarDataFinalizacao] = useState(true);
  const [mostrarAbertos, setMostrarAbertos] = useState(true);
  const [mostrarEmAndamento, setMostrarEmAndamento] = useState(true);
  const [mostrarAguardandoAceite, setMostrarAguardandoAceite] = useState(true);
  const [mostrarFechados, setMostrarFechados] = useState(true);
  const [mostrarAtrasados, setMostrarAtrasados] = useState(true);
  const [mostrarTabelaGrupos, setMostrarTabelaGrupos] = useState(true);
  const [mostrarFotos, setMostrarFotos] = useState(true);
  const [mostrarLocalizacaoPlanta, setMostrarLocalizacaoPlanta] = useState(true);
  const [mostrarTagsClassificacao, setMostrarTagsClassificacao] = useState(true);
  const [mostrarSeveridade, setMostrarSeveridade] = useState(true);
  const [incluirAnalise, setIncluirAnalise] = useState(true);
  const [agruparPorAmbiente, setAgruparPorAmbiente] = useState(false);
  const [mostrarAprovacoes, setMostrarAprovacoes] = useState(true);
  const [mostrarDetalhamento, setMostrarDetalhamento] = useState(true);
  const [destaqueAtrasos, setDestaqueAtrasos] = useState(true);

  // Seção 5 — Formato
  const [formato, setFormato] = useState<"pdf" | "excel">("pdf");

  const generateMutation = trpc.relatorio.generate.useMutation();

  const handleGenerate = () => {
    const origens: ("qualidade" | "checklist" | "qsms")[] = [];
    if (origemQualidade) origens.push("qualidade");
    if (origemPunchList) origens.push("checklist");
    if (origemPosObra) origens.push("qsms");

    generateMutation.mutate({
      obraId: obraId === "all" ? undefined : parseInt(obraId),
      dataInicial: dataInicial ? new Date(dataInicial).getTime() : undefined,
      dataFinal: dataFinal ? new Date(dataFinal + "T23:59:59").getTime() : undefined,
      origens: origens.length === 3 ? undefined : origens,
      fornecedorNome: fornecedorNome === "all" ? undefined : fornecedorNome,
      tagCritico,
      tagSegurancaTrabalho: tagSeguranca,
      tagSolicitadoCliente: tagSolicitado,
      tagSolicitadoGerenciadora: tagGerenciadora,
      tagSolicitadoArquitetura: tagArquitetura,
      mostrarFornecedores,
      mostrarResponsaveis,
      mostrarVertical,
      mostrarDataPrevista,
      mostrarDataCriacao,
      mostrarDataFinalizacao,
      mostrarAbertos,
      mostrarEmAndamento,
      mostrarAguardandoAceite,
      mostrarFechados,
      mostrarAtrasados,
      mostrarTabelaDisciplinas: mostrarTabelaGrupos,
      mostrarFotos,
      mostrarLocalizacaoPlanta,
      mostrarTagsClassificacao,
      mostrarSeveridade,
      incluirAnalise,
      mostrarAprovacoes,
      mostrarDetalhamento,
      formato,
    });
  };

  const handlePrint = () => {
    if (!data || data.formato !== "pdf") return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const kpis = data.kpis;
    const origens = data.config?.origens;
    const obraInfo = data.obraInfo;
    const desvios = data.desvios || [];
    const porGrupo = data.porDisciplina || {};
    const performance = data.performance || [];
    const analise = data.analise;
    const cfg = data.config || {};

    const sevBadge = (s: string) => {
      const m: Record<string, string> = { grave: "background:#fef2f2;color:#dc2626;border:1px solid #fecaca", moderado: "background:#fffbeb;color:#d97706;border:1px solid #fde68a", leve: "background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0" };
      return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600;${m[s] || ''}">${s}</span>`;
    };
    const atrasoBadgePdf = (d: any) => {
      if (!destaqueAtrasos || !isAtrasado(d)) return "";
      const dias = diasAtraso(d);
      return `<span style="display:inline-block;padding:2px 6px;border-radius:10px;font-size:9px;font-weight:700;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;margin-left:4px">⚠ ATRASO ${dias}d</span>`;
    };
    const stBadge = (s: string) => {
      const m: Record<string, string> = { aberto: "background:#fffbeb;color:#d97706;border:1px solid #fde68a", em_andamento: "background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe", fechado: "background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0", aguardando_aceite: "background:#faf5ff;color:#9333ea;border:1px solid #e9d5ff" };
      const labels: Record<string, string> = { aberto: "Aberto", em_andamento: "Em Andamento", fechado: "Fechado", aguardando_aceite: "Ag. Aceite" };
      return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600;${m[s] || ''}">${labels[s] || s}</span>`;
    };
    const fmtDate = (ts: number | null) => ts ? new Date(ts).toLocaleDateString("pt-BR") : "—";
    const oLabels: Record<string, string> = { qualidade: "Qualidade", checklist: "Checklist", qsms: "QSMS" };

    // Build KPI cards HTML
    const kpiItems = kpis ? [
      { label: "Total", value: kpis.total, color: "#0f172a" },
      { label: "Abertos", value: kpis.abertos, color: "#d97706" },
      { label: "Em Andamento", value: kpis.emAndamento, color: "#2563eb" },
      { label: "Ag. Aceite", value: kpis.aguardandoAceite, color: "#9333ea" },
      { label: "Fechados", value: kpis.fechados, color: "#16a34a" },
      { label: "Atrasados", value: kpis.atrasados, color: "#dc2626" },
      { label: "Taxa Fech.", value: `${kpis.taxaFechamento}%`, color: "#0d9488" },
    ] : [];
    const kpiHtml = kpiItems.map(k => `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 6px;text-align:center;"><div style="font-size:22px;font-weight:700;color:${k.color}">${k.value}</div><div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">${k.label}</div></div>`).join("");

    // Tabela por Disciplina
    let discHtml = "";
    if (cfg.mostrarTabelaDisciplinas && Object.keys(porGrupo).length > 0) {
      const rows = Object.entries(porGrupo).map(([disc, v]: [string, any]) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-weight:500">${disc}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600">${v.total}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:#d97706">${v.abertos}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:#2563eb">${v.emAndamento}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:#9333ea">${v.aguardandoAceite}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:#16a34a">${v.fechados}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:#dc2626">${v.atrasados}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center">${v.graves}</td></tr>`
      ).join("");
      discHtml = `<div style="margin-top:24px;page-break-inside:avoid"><h2 style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #0d9488">Resumo por Grupo</h2><table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:#f1f5f9"><th style="text-align:left;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Grupo</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Total</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Abertos</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Em And.</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Ag. Aceite</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Fechados</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Atrasados</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Graves</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    // Performance Fornecedores
    let perfHtml = "";
    if (cfg.mostrarFornecedores && performance.length > 0) {
      const rows = performance.map((f: any) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-weight:500">${f.nome}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center">${f.total}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center">${f.abertos}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center">${f.fechados}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center">${f.graves}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600">${f.taxaFechamento}%</td></tr>`
      ).join("");
      perfHtml = `<div style="margin-top:24px;page-break-inside:avoid"><h2 style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #0d9488">Performance de Fornecedores</h2><table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:#f1f5f9"><th style="text-align:left;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Fornecedor</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Total</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Abertos</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Fechados</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Graves</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Taxa Fech.</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    // Índice de Desvios
    let indexHtml = "";
    if (desvios.length > 0) {
      const thForn = cfg.mostrarFornecedores ? `<th style="text-align:left;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Fornecedor</th>` : "";
      const thPrazo = cfg.mostrarDataPrevista ? `<th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Data Prevista</th>` : "";
      const thData = cfg.mostrarDataCriacao !== false ? `<th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Data</th>` : "";
      const thVert = cfg.mostrarVertical ? `<th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Vertical</th>` : "";
      const thSev = cfg.mostrarSeveridade !== false ? `<th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Severidade</th>` : "";
      const thAprov = cfg.mostrarAprovacoes !== false ? `<th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Aprovações</th>` : "";
      const buildRow = (d: any) => {
        const tdForn = cfg.mostrarFornecedores ? `<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9">${d.fornecedor || "—"}</td>` : "";
        const tdPrazo = cfg.mostrarDataPrevista ? `<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:center;white-space:nowrap">${fmtDate(d.prazoSugerido)}${atrasoBadgePdf(d)}</td>` : "";
        const tdData = cfg.mostrarDataCriacao !== false ? `<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:#64748b;vertical-align:top">${fmtDate(d.dataIdentificacao)}</td>` : "";
        const tdVert = cfg.mostrarVertical ? `<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:top">${oLabels[d.origem] || d.origem}</td>` : "";
        const tdSev = cfg.mostrarSeveridade !== false ? `<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:top">${sevBadge(d.severidade)}</td>` : "";
        let tdAprov = "";
        if (cfg.mostrarAprovacoes !== false) {
          const badges = (d.aprovacoes || []).map((a: any) => {
            const letra = a.tipo === "gerenciadora" ? "G" : "A";
            const sym = a.decisao === "aprovado" ? "✓" : "✗";
            const style = a.decisao === "aprovado"
              ? "background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0"
              : "background:#fef2f2;color:#dc2626;border:1px solid #fecaca";
            return `<span style="display:inline-block;padding:1px 5px;border-radius:4px;margin:1px;font-size:9px;font-weight:600;${style}">${letra}${sym}</span>`;
          }).join("");
          tdAprov = `<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:top">${badges || '<span style="color:#cbd5e1">—</span>'}</td>`;
        }
        const atrasado = destaqueAtrasos && isAtrasado(d);
        const rowBg = atrasado ? "background:#fef2f2;" : "";
        const firstCellShadow = atrasado ? "box-shadow:inset 3px 0 0 #dc2626;" : "";
        return `<tr style="${rowBg}"><td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-family:monospace;vertical-align:top;${firstCellShadow}"><a href="#desvio-${d.id}" style="color:#0d9488;text-decoration:none;font-weight:600">#${d.id}</a></td><td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top">${d.disciplina}</td>${tdForn}<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;white-space:normal;word-break:break-word;vertical-align:top">${d.descricao}</td>${tdSev}<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:top">${stBadge(d.status)}</td>${tdVert}${tdData}${tdPrazo}${tdAprov}</tr>`;
      };
      const tableHead = `<thead><tr style="background:#f1f5f9"><th style="text-align:left;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">#</th><th style="text-align:left;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Grupo</th>${thForn}<th style="text-align:left;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Descrição</th>${thSev}<th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #e2e8f0">Status</th>${thVert}${thData}${thPrazo}${thAprov}</tr></thead>`;
      if (agruparPorAmbiente) {
        const groups = groupByAmbiente(desvios);
        const blocks = groups.map((g, i) => {
          const rows = g.items.map(buildRow).join("");
          return `<div style="margin-top:${i === 0 ? 12 : 18}px;page-break-inside:avoid"><h3 style="font-size:12px;font-weight:600;color:#0f172a;background:#ecfeff;border-left:3px solid #0d9488;padding:5px 10px;margin-bottom:6px;border-radius:3px">${g.nome} <span style="color:#64748b;font-weight:500">— ${g.items.length} desvio${g.items.length > 1 ? "s" : ""}</span></h3><table style="width:100%;border-collapse:collapse;font-size:10px">${tableHead}<tbody>${rows}</tbody></table></div>`;
        }).join("");
        indexHtml = `<div style="margin-top:28px;page-break-before:always"><h2 style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #0d9488">Índice de Desvios por Ambiente (${desvios.length})</h2>${blocks}</div>`;
      } else {
        const rows = desvios.map(buildRow).join("");
        indexHtml = `<div style="margin-top:28px;page-break-before:always"><h2 style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #0d9488">Índice de Desvios (${desvios.length})</h2><table style="width:100%;border-collapse:collapse;font-size:10px">${tableHead}<tbody>${rows}</tbody></table></div>`;
      }
    }

    // Detalhamento dos Desvios
    let detailHtml = "";
    if (desvios.length > 0 && cfg.mostrarDetalhamento !== false) {
      const buildCard = (d: any) => {
        const tags: string[] = [];
        if (cfg.mostrarTagsClassificacao !== false) {
          if (d.tagCritico === 1) tags.push(`<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca">Crítico</span>`);
          if (d.tagSegurancaTrabalho === 1) tags.push(`<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;background:#fffbeb;color:#d97706;border:1px solid #fde68a">Segurança</span>`);
          if (d.tagSolicitadoCliente === 1) tags.push(`<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe">Solic. Cliente</span>`);
          if (d.tagSolicitadoGerenciadora === 1) tags.push(`<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;background:#faf5ff;color:#7e22ce;border:1px solid #e9d5ff">Solic. Gerenciadora</span>`);
          if (d.tagSolicitadoArquitetura === 1) tags.push(`<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;background:#fffbeb;color:#b45309;border:1px solid #fde68a">Solic. Arquitetura</span>`);
        }

        let metaItems = [
          `<div><strong>Grupo:</strong> ${d.disciplina}</div>`,
          `<div><strong>Local:</strong> ${d.localizacao || "—"}</div>`,
          `<div><strong>Identificação:</strong> ${fmtDate(d.dataIdentificacao)}</div>`,
        ];
        if (cfg.mostrarVertical) metaItems.splice(1, 0, `<div><strong>Vertical:</strong> ${oLabels[d.origem] || d.origem}</div>`);
        if (cfg.mostrarFornecedores) metaItems.splice(1, 0, `<div><strong>Fornecedor:</strong> ${d.fornecedor || "—"}</div>`);
        if (cfg.mostrarDataPrevista) metaItems.push(`<div><strong>Data Prevista:</strong> ${fmtDate(d.prazoSugerido)}</div>`);
        if (cfg.mostrarDataFinalizacao) metaItems.push(`<div><strong>Fechamento:</strong> ${fmtDate(d.dataFechamento)}</div>`);

        // Planos de ação
        let planosHtml = "";
        if (cfg.mostrarResponsaveis && d.planos && d.planos.length > 0) {
          const pItems = d.planos.map((p: any) => {
            const dotColor = p.status === "concluido" ? "#16a34a" : p.status === "em_andamento" ? "#2563eb" : "#d97706";
            const prioHtml = p.prioridade ? ` <span style="font-size:9px;padding:1px 5px;border-radius:4px;${p.prioridade === 'urgente' ? 'background:#fef2f2;color:#dc2626' : p.prioridade === 'baixa' ? 'background:#f1f5f9;color:#475569' : 'background:#eff6ff;color:#2563eb'}">${p.prioridade}</span>` : "";
            return `<div style="display:flex;align-items:center;gap:6px;font-size:10px;background:#f8fafc;border-radius:4px;padding:4px 8px;margin-bottom:3px"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${dotColor};flex-shrink:0"></span><strong>${p.acao}</strong> — ${p.responsavel}${prioHtml}</div>`;
          }).join("");
          planosHtml = `<div style="margin-top:8px"><div style="font-size:10px;font-weight:600;margin-bottom:4px">Planos de Ação:</div>${pItems}</div>`;
        }

        // Fotos
        let fotosHtml = "";
        if (cfg.mostrarFotos) {
          const aberturaImgs = (d.fotosAbertura || []).map((url: string, i: number) => `<img src="${url}" alt="Abertura ${i+1}" style="width:130px;height:100px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0" />`).join("");
          const fechamentoImgs = (d.fotosFechamento || []).map((url: string, i: number) => `<img src="${url}" alt="Fechamento ${i+1}" style="width:130px;height:100px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0" />`).join("");
          if (aberturaImgs || fechamentoImgs) {
            fotosHtml = `<div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:10px">`;
            if (aberturaImgs) fotosHtml += `<div><div style="font-size:9px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:4px">Evidências Abertura</div><div style="display:flex;gap:6px;flex-wrap:wrap">${aberturaImgs}</div></div>`;
            if (fechamentoImgs) fotosHtml += `<div><div style="font-size:9px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:4px">Evidências Fechamento</div><div style="display:flex;gap:6px;flex-wrap:wrap">${fechamentoImgs}</div></div>`;
            fotosHtml += `</div>`;
          }
        }

        // Localização na Planta
        let plantaHtml = "";
        if (d.plantaUrl && d.pinX && d.pinY) {
          const px = Number(d.pinX);
          const py = Number(d.pinY);
          plantaHtml = `<div style="margin-top:10px">
            <div style="font-size:9px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:4px">Localização na Planta${d.plantaNome ? ` — ${d.plantaNome}` : ""}</div>
            <div style="position:relative;display:inline-block;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;max-width:350px">
              <img src="${d.plantaUrl}" alt="Planta" style="width:100%;display:block" />
              <div style="position:absolute;left:${px}%;top:${py}%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;border:3px solid #ef4444;background:rgba(239,68,68,0.25)"></div>
              <div style="position:absolute;left:${px}%;top:${py}%;transform:translate(-50%,-50%);width:8px;height:8px;border-radius:50%;background:#ef4444"></div>
            </div>
          </div>`;
        }

        return `<div id="desvio-${d.id}" style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px;page-break-inside:avoid">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:13px;font-weight:600"><span style="color:#94a3b8;margin-right:6px">#${d.id}</span>Desvio</div>
            <div style="display:flex;gap:6px;align-items:center">${atrasoBadgePdf(d)} ${cfg.mostrarSeveridade !== false ? sevBadge(d.severidade) : ""} ${stBadge(d.status)}</div>
          </div>
          <div style="font-size:11px;color:#1e293b;background:#f8fafc;border-left:3px solid #0d9488;padding:6px 10px;border-radius:4px;margin-bottom:8px;white-space:pre-wrap;word-break:break-word"><strong style="color:#0f172a">Descrição:</strong> ${d.descricao}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px 12px;font-size:10px;color:#475569;margin-bottom:6px">${metaItems.join("")}</div>
          ${tags.length > 0 ? `<div style="display:flex;gap:4px;margin-bottom:6px">${tags.join("")}</div>` : ""}
          ${cfg.mostrarAprovacoes !== false && d.aprovacoes && d.aprovacoes.length > 0 ? `<div style="margin-top:6px;font-size:10px"><strong>Aprovações:</strong> ${d.aprovacoes.map((a: any) => `<span style="display:inline-block;padding:2px 6px;border-radius:4px;margin-right:4px;${a.decisao === 'aprovado' ? 'background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0' : 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca'}">${a.tipo === 'gerenciadora' ? 'Gerenciadora' : 'Arquitetura'} ${a.decisao === 'aprovado' ? '✓' : '✗'}${a.aprovador_nome ? ' — ' + a.aprovador_nome : ''}${a.comentario ? ' (' + a.comentario + ')' : ''}</span>`).join("")}</div>` : ""}
          ${planosHtml}
          ${fotosHtml}
          ${plantaHtml}
        </div>`;
      };
      if (agruparPorAmbiente) {
        const groups = groupByAmbiente(desvios);
        const blocks = groups.map((g, i) => {
          const cards = g.items.map(buildCard).join("");
          return `<div style="${i === 0 ? "" : "page-break-before:always;"}margin-top:${i === 0 ? 12 : 0}px"><h3 style="font-size:13px;font-weight:700;color:#0f172a;background:#ecfeff;border-left:4px solid #0d9488;padding:8px 12px;margin-bottom:12px;border-radius:4px">Ambiente: ${g.nome} <span style="color:#64748b;font-weight:500;font-size:11px">— ${g.items.length} desvio${g.items.length > 1 ? "s" : ""}</span></h3>${cards}</div>`;
        }).join("");
        detailHtml = `<div style="margin-top:28px;page-break-before:always"><h2 style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #0d9488">Detalhamento dos Desvios por Ambiente</h2>${blocks}</div>`;
      } else {
        const items = desvios.map(buildCard).join("");
        detailHtml = `<div style="margin-top:28px;page-break-before:always"><h2 style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #0d9488">Detalhamento dos Desvios</h2>${items}</div>`;
      }
    }

    // Análise IA
    let analiseHtml = "";
    if (analise) {
      const formatted = analise.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n- /g, '<br/>• ').replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
      analiseHtml = `<div style="margin-top:28px;page-break-before:always"><h2 style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #0d9488">Análise Executiva (IA)</h2><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:11px;line-height:1.7;color:#334155">${formatted}</div></div>`;
    }

    // Itens em Atraso (seção dedicada)
    let atrasoHtml = "";
    if (destaqueAtrasos) {
      const atrasados = (desvios as any[]).filter(isAtrasado).sort((a, b) => a.prazoSugerido - b.prazoSugerido);
      if (atrasados.length > 0) {
        const rows = atrasados.map((d) => {
          const dias = diasAtraso(d);
          const fornCol = cfg.mostrarFornecedores ? `<td style="padding:6px 8px;border-bottom:1px solid #fecaca">${d.fornecedor || "—"}</td>` : "";
          return `<tr style="background:#fff5f5"><td style="padding:6px 8px;border-bottom:1px solid #fecaca;font-family:monospace;font-weight:600"><a href="#desvio-${d.id}" style="color:#dc2626;text-decoration:none">#${d.id}</a></td><td style="padding:6px 8px;border-bottom:1px solid #fecaca">${d.disciplina}</td>${fornCol}<td style="padding:6px 8px;border-bottom:1px solid #fecaca;word-break:break-word">${d.descricao}</td><td style="padding:6px 8px;border-bottom:1px solid #fecaca;text-align:center;color:#64748b;white-space:nowrap">${fmtDate(d.prazoSugerido)}</td><td style="padding:6px 8px;border-bottom:1px solid #fecaca;text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:#dc2626;color:#fff">${dias}d</span></td></tr>`;
        }).join("");
        const fornHead = cfg.mostrarFornecedores ? `<th style="text-align:left;padding:8px;font-weight:600;border-bottom:2px solid #fecaca">Fornecedor</th>` : "";
        atrasoHtml = `<div style="margin-top:20px;page-break-inside:avoid;border:1px solid #fecaca;border-radius:8px;padding:14px;background:#fff;border-left:4px solid #dc2626">
          <h2 style="font-size:14px;font-weight:700;color:#dc2626;margin-bottom:10px;display:flex;align-items:center;gap:6px">⚠ Itens em Atraso (${atrasados.length})</h2>
          <table style="width:100%;border-collapse:collapse;font-size:10px">
            <thead><tr style="background:#fef2f2"><th style="text-align:left;padding:8px;font-weight:600;border-bottom:2px solid #fecaca">#</th><th style="text-align:left;padding:8px;font-weight:600;border-bottom:2px solid #fecaca">Grupo</th>${fornHead}<th style="text-align:left;padding:8px;font-weight:600;border-bottom:2px solid #fecaca">Descrição</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #fecaca">Data Prevista</th><th style="text-align:center;padding:8px;font-weight:600;border-bottom:2px solid #fecaca">Dias em atraso</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      }
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório de Desvios</title>
  <style>
    @page { size: A4; margin: 18mm 15mm 18mm 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', 'Inter', -apple-system, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.5; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    table { width: 100%; border-collapse: collapse; }
    img { max-width: 100%; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <!-- Capa -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #0d9488;padding-bottom:20px;margin-bottom:28px">
    <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663403343148/3awzRPTf7NtQjpo8LEDXgX/Logo%20athie%20l%20wohnrath_Black_c476567f.png" alt="athie|wohnrath" style="height:52px;object-fit:contain" crossorigin="anonymous" />
    <div style="text-align:right">
      <div style="font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px">Relatório de Desvios${obraInfo ? ` — ${obraInfo.codigo} ${obraInfo.nome}` : " — Todas as Obras"}</div>
      ${origens && origens.length > 0 && origens.length < 3 ? `<div style="font-size:11px;color:#64748b;margin-top:4px">Verticais: ${origens.map((o: string) => oLabels[o] || o).join(", ")}</div>` : ""}
      <div style="font-size:10px;color:#94a3b8;margin-top:6px">Gerado em ${new Date(data.dataGeracao || Date.now()).toLocaleDateString("pt-BR")} às ${new Date(data.dataGeracao || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
    </div>
  </div>

  <!-- KPIs -->
  ${kpis ? `<div style="margin-bottom:20px"><h2 style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #0d9488">Indicadores</h2><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px">${kpiHtml}</div></div>` : ""}

  ${atrasoHtml}
  ${discHtml}
  ${perfHtml}
  ${indexHtml}
  ${detailHtml}
  ${analiseHtml}

  <!-- Rodapé -->
  <div style="text-align:center;color:#94a3b8;font-size:9px;margin-top:40px;padding-top:14px;border-top:1px solid #e2e8f0">
    Relatório gerado automaticamente em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    // Wait for images to load before printing (with guard against double-print)
    const imgs = printWindow.document.querySelectorAll("img");
    let loaded = 0;
    const total = imgs.length;
    let printed = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      setTimeout(() => printWindow.print(), 300);
    };
    if (total === 0) { doPrint(); return; }
    fallbackTimer = setTimeout(doPrint, 5000);
    imgs.forEach((img) => {
      if (img.complete) { loaded++; if (loaded >= total) doPrint(); }
      else {
        img.onload = () => { loaded++; if (loaded >= total) doPrint(); };
        img.onerror = () => { loaded++; if (loaded >= total) doPrint(); };
      }
    });
  };

  const data = generateMutation.data;
  const isPdfData = data && data.formato === "pdf";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Exportar Relatório
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure os filtros e opções para gerar um relatório personalizado
        </p>
      </div>

      {/* Formulário de Configuração */}
      <Card className="shadow-sm border-0 bg-card">
        <CardContent className="p-6 space-y-6">

          {/* Seção 1 — Filtros Principais */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-primary" /> Filtros Principais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Obra</Label>
                <Select value={obraId} onValueChange={setObraId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione a obra" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as obras</SelectItem>
                    {obras?.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.codigo} - {o.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Data Inicial</Label>
                <input
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Data Final</Label>
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Seção 2 — Verticais */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" /> Vertical / Origem
            </h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={origemQualidade} onCheckedChange={(v) => setOrigemQualidade(!!v)} />
                <Search className="h-4 w-4 text-teal-600" />
                <span className="text-sm">Qualidade</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={origemPunchList} onCheckedChange={(v) => setOrigemPunchList(!!v)} />
                <ClipboardCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Checklist</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={origemPosObra} onCheckedChange={(v) => setOrigemPosObra(!!v)} />
                <Wrench className="h-4 w-4 text-violet-600" />
                <span className="text-sm">QSMS</span>
              </label>
            </div>
          </div>

          <Separator />

          {/* Seção 3 — Filtros Adicionais */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Settings2 className="h-4 w-4 text-primary" /> Filtros Adicionais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Fornecedor</Label>
                <Select value={fornecedorNome} onValueChange={setFornecedorNome}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {fornecedores?.map((f) => (
                      <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 flex items-center gap-1">
                  <Siren className="h-3 w-3 text-red-500" /> Chamado Crítico
                </Label>
                <Select value={tagCritico} onValueChange={(v) => setTagCritico(v as any)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 flex items-center gap-1">
                  <HardHat className="h-3 w-3 text-amber-500" /> Seg. Trabalho
                </Label>
                <Select value={tagSeguranca} onValueChange={(v) => setTagSeguranca(v as any)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-blue-500" /> Solic. Cliente
                </Label>
                <Select value={tagSolicitado} onValueChange={(v) => setTagSolicitado(v as any)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-purple-500" /> Solic. Gerenciadora
                </Label>
                <Select value={tagGerenciadora} onValueChange={(v) => setTagGerenciadora(v as any)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-amber-500" /> Solic. Arquitetura
                </Label>
                <Select value={tagArquitetura} onValueChange={(v) => setTagArquitetura(v as any)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Seção 4 — Conteúdo do Relatório */}
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" /> Conteúdo do Relatório
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarFornecedores} onCheckedChange={(v) => setMostrarFornecedores(!!v)} />
                <Users className="h-3.5 w-3.5 text-muted-foreground" /> Mostra fornecedores
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarResponsaveis} onCheckedChange={(v) => setMostrarResponsaveis(!!v)} />
                <Users className="h-3.5 w-3.5 text-muted-foreground" /> Mostra responsáveis
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarVertical} onCheckedChange={(v) => setMostrarVertical(!!v)} />
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" /> Mostra vertical
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarDataPrevista} onCheckedChange={(v) => setMostrarDataPrevista(!!v)} />
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Mostra data prevista
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarDataCriacao} onCheckedChange={(v) => setMostrarDataCriacao(!!v)} />
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Mostra data de criação
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarDataFinalizacao} onCheckedChange={(v) => setMostrarDataFinalizacao(!!v)} />
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Mostra data de finalização
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarAbertos} onCheckedChange={(v) => setMostrarAbertos(!!v)} />
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Mostra desvios abertos
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarEmAndamento} onCheckedChange={(v) => setMostrarEmAndamento(!!v)} />
                <Clock className="h-3.5 w-3.5 text-blue-500" /> Mostra em andamento
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarAguardandoAceite} onCheckedChange={(v) => setMostrarAguardandoAceite(!!v)} />
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-500" /> Mostra ag. aceite
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarFechados} onCheckedChange={(v) => setMostrarFechados(!!v)} />
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Mostra fechados
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarAtrasados} onCheckedChange={(v) => setMostrarAtrasados(!!v)} />
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Mostra atrasados
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarTabelaGrupos} onCheckedChange={(v) => setMostrarTabelaGrupos(!!v)} />
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" /> Tabela de grupos
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarFotos} onCheckedChange={(v) => setMostrarFotos(!!v)} />
                <Image className="h-3.5 w-3.5 text-muted-foreground" /> Mostra fotos de evidência
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarLocalizacaoPlanta} onCheckedChange={(v) => setMostrarLocalizacaoPlanta(!!v)} />
                <Search className="h-3.5 w-3.5 text-muted-foreground" /> Localização na planta
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarTagsClassificacao} onCheckedChange={(v) => setMostrarTagsClassificacao(!!v)} />
                <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Tags de classificação
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarSeveridade} onCheckedChange={(v) => setMostrarSeveridade(!!v)} />
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" /> Mostra severidade
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={agruparPorAmbiente} onCheckedChange={(v) => setAgruparPorAmbiente(!!v)} />
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Agrupar por ambiente
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarAprovacoes} onCheckedChange={(v) => setMostrarAprovacoes(!!v)} />
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Mostrar aprovações
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={mostrarDetalhamento} onCheckedChange={(v) => setMostrarDetalhamento(!!v)} />
                <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Detalhamento dos desvios
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={destaqueAtrasos} onCheckedChange={(v) => setDestaqueAtrasos(!!v)} />
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> Destacar itens em atraso
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox checked={incluirAnalise} onCheckedChange={(v) => setIncluirAnalise(!!v)} />
                <BrainCircuit className="h-3.5 w-3.5 text-primary" /> Incluir análise IA
              </label>
            </div>
          </div>

          <Separator />

          {/* Seção 5 — Formato e Botão */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="formato"
                  checked={formato === "pdf"}
                  onChange={() => setFormato("pdf")}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">Exportar como PDF</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="formato"
                  checked={formato === "excel"}
                  onChange={() => setFormato("excel")}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">Exportar como Excel</span>
              </label>
            </div>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} size="lg">
              {generateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando...</>
              ) : (
                <><Download className="h-4 w-4 mr-2" /> Exportar</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Excel download */}
      {data && data.formato === "excel" && "excelUrl" in data && (
        <Card className="shadow-sm border-0 bg-card">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-semibold mb-2">Excel gerado com sucesso!</p>
            <Button asChild size="lg">
              <a href={(data as any).excelUrl} download>
                <Download className="h-4 w-4 mr-2" /> Baixar Excel
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PDF Preview */}
      {isPdfData && (
        <>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Imprimir / PDF
            </Button>
          </div>

          <Card className="shadow-sm border-0 bg-card">
            <CardContent className="p-8" ref={reportRef}>
              {/* Header */}
              <div className="report-header flex items-start justify-between border-b-2 border-primary pb-5 mb-6">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663403343148/3awzRPTf7NtQjpo8LEDXgX/Logo%20athie%20l%20wohnrath_Black_c476567f.png"
                  alt="athie|wohnrath"
                  className="h-14 object-contain"
                />
                <div className="text-right">
                  <h1 className="text-xl font-bold text-foreground">
                    Relatório de Desvios
                    {data.obraInfo ? ` — ${data.obraInfo.codigo} ${data.obraInfo.nome}` : " — Todas as Obras"}
                  </h1>
                  {data.config?.origens && data.config.origens.length > 0 && data.config.origens.length < 3 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Verticais: {data.config.origens.map((o: string) => origemLabels[o] || o).join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Gerado em {new Date(data.dataGeracao || Date.now()).toLocaleDateString("pt-BR")} às {new Date(data.dataGeracao || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {/* KPIs */}
              {data.kpis && (
                <div className="section mb-6">
                  <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Indicadores
                  </h2>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                    {[
                      { label: "Total", value: data.kpis.total, color: "text-foreground" },
                      { label: "Abertos", value: data.kpis.abertos, color: "text-amber-600" },
                      { label: "Em Andamento", value: data.kpis.emAndamento, color: "text-blue-600" },
                      { label: "Ag. Aceite", value: data.kpis.aguardandoAceite, color: "text-purple-600" },
                      { label: "Fechados", value: data.kpis.fechados, color: "text-emerald-600" },
                      { label: "Atrasados", value: data.kpis.atrasados, color: "text-red-600" },
                      { label: "Taxa Fech.", value: `${data.kpis.taxaFechamento}%`, color: "text-primary" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="kpi-card border rounded-lg p-3 text-center">
                        <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Itens em Atraso */}
              {destaqueAtrasos && data.desvios && (() => {
                const atrasados = (data.desvios as any[]).filter(isAtrasado).sort((a, b) => a.prazoSugerido - b.prazoSugerido);
                if (atrasados.length === 0) return null;
                return (
                  <div className="section mb-6 border border-red-200 border-l-4 border-l-red-600 rounded-lg p-4 bg-red-50/40">
                    <h2 className="text-base font-bold text-red-700 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Itens em Atraso ({atrasados.length})
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-red-100/60">
                            <th className="text-left py-2 px-2 font-semibold">#</th>
                            <th className="text-left py-2 px-2 font-semibold">Grupo</th>
                            {data.config?.mostrarFornecedores && <th className="text-left py-2 px-2 font-semibold">Fornecedor</th>}
                            <th className="text-left py-2 px-2 font-semibold">Descrição</th>
                            <th className="text-center py-2 px-2 font-semibold">Data Prevista</th>
                            <th className="text-center py-2 px-2 font-semibold">Dias em atraso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {atrasados.map((d: any) => (
                            <tr key={d.id} className="border-b border-red-100">
                              <td className="py-1.5 px-2 font-mono font-semibold text-red-700">#{d.id}</td>
                              <td className="py-1.5 px-2">{d.disciplina}</td>
                              {data.config?.mostrarFornecedores && <td className="py-1.5 px-2">{d.fornecedor || "—"}</td>}
                              <td className="py-1.5 px-2 whitespace-normal break-words min-w-[200px]">{d.descricao}</td>
                              <td className="py-1.5 px-2 text-center text-muted-foreground whitespace-nowrap">{new Date(d.prazoSugerido).toLocaleDateString("pt-BR")}</td>
                              <td className="py-1.5 px-2 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">{diasAtraso(d)}d</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Tabela por Disciplina */}
              {data.config?.mostrarTabelaDisciplinas && data.porDisciplina && Object.keys(data.porDisciplina).length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="section mb-6">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                       <BarChart3 className="h-4 w-4 text-primary" /> Resumo por Grupo
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left py-2 px-2 font-semibold">Grupo</th>
                            <th className="text-center py-2 px-2 font-semibold">Total</th>
                            <th className="text-center py-2 px-2 font-semibold">Abertos</th>
                            <th className="text-center py-2 px-2 font-semibold">Em And.</th>
                            <th className="text-center py-2 px-2 font-semibold">Ag. Aceite</th>
                            <th className="text-center py-2 px-2 font-semibold">Fechados</th>
                            <th className="text-center py-2 px-2 font-semibold">Atrasados</th>
                            <th className="text-center py-2 px-2 font-semibold">Graves</th>
                            <th className="text-center py-2 px-2 font-semibold">Crítico</th>
                            <th className="text-center py-2 px-2 font-semibold">Seg. Trab.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(data.porDisciplina).map(([disc, vals]: [string, any]) => (
                            <tr key={disc} className="border-b border-muted/30">
                              <td className="py-1.5 px-2 font-medium">{disc}</td>
                              <td className="py-1.5 px-2 text-center font-semibold">{vals.total}</td>
                              <td className="py-1.5 px-2 text-center text-amber-600">{vals.abertos}</td>
                              <td className="py-1.5 px-2 text-center text-blue-600">{vals.emAndamento}</td>
                              <td className="py-1.5 px-2 text-center text-purple-600">{vals.aguardandoAceite}</td>
                              <td className="py-1.5 px-2 text-center text-emerald-600">{vals.fechados}</td>
                              <td className="py-1.5 px-2 text-center text-red-600">{vals.atrasados}</td>
                              <td className="py-1.5 px-2 text-center">{vals.graves}</td>
                              <td className="py-1.5 px-2 text-center">{vals.critico}</td>
                              <td className="py-1.5 px-2 text-center">{vals.seguranca}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Performance Fornecedores */}
              {data.config?.mostrarFornecedores && data.performance && data.performance.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="section mb-6">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" /> Performance de Fornecedores
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left py-2 px-3 font-semibold">Fornecedor</th>
                            <th className="text-center py-2 px-3 font-semibold">Total</th>
                            <th className="text-center py-2 px-3 font-semibold">Abertos</th>
                            <th className="text-center py-2 px-3 font-semibold">Fechados</th>
                            <th className="text-center py-2 px-3 font-semibold">Graves</th>
                            <th className="text-center py-2 px-3 font-semibold">Taxa Fech.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.performance.map((f: any) => (
                            <tr key={f.nome} className="border-b border-muted/30">
                              <td className="py-2 px-3 font-medium">{f.nome}</td>
                              <td className="py-2 px-3 text-center">{f.total}</td>
                              <td className="py-2 px-3 text-center">{f.abertos}</td>
                              <td className="py-2 px-3 text-center">{f.fechados}</td>
                              <td className="py-2 px-3 text-center">{f.graves}</td>
                              <td className="py-2 px-3 text-center">{f.taxaFechamento}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Índice de Desvios */}
              {data.desvios && data.desvios.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="section mb-6">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {agruparPorAmbiente ? `Índice de Desvios por Ambiente (${data.desvios.length})` : `Índice de Desvios (${data.desvios.length})`}
                    </h2>
                    {(() => {
                      const groups = agruparPorAmbiente
                        ? groupByAmbiente(data.desvios)
                        : [{ nome: "", items: data.desvios as any[] }];
                      const colCount = 6
                        + (data.config?.mostrarFornecedores ? 1 : 0)
                        + (data.config?.mostrarSeveridade !== false ? 1 : 0)
                        + (data.config?.mostrarVertical ? 1 : 0)
                        + (data.config?.mostrarDataPrevista ? 1 : 0);
                      void colCount;
                      return (
                        <div className="overflow-x-auto space-y-4">
                          {groups.map((g, gi) => (
                            <div key={gi}>
                              {agruparPorAmbiente && (
                                <div className="text-xs font-semibold text-foreground bg-primary/5 border-l-4 border-primary px-3 py-1.5 mb-2 rounded">
                                  {g.nome} <span className="text-muted-foreground font-normal">— {g.items.length} desvio{g.items.length > 1 ? "s" : ""}</span>
                                </div>
                              )}
                              <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left py-2 px-2 font-semibold">#</th>
                            <th className="text-left py-2 px-2 font-semibold">Grupo</th>                        {data.config?.mostrarFornecedores && <th className="text-left py-2 px-2 font-semibold">Fornecedor</th>}
                            <th className="text-left py-2 px-2 font-semibold">Descrição</th>
                            {data.config?.mostrarSeveridade !== false && <th className="text-center py-2 px-2 font-semibold">Severidade</th>}
                            <th className="text-center py-2 px-2 font-semibold">Status</th>
                            {data.config?.mostrarVertical && <th className="text-center py-2 px-2 font-semibold">Vertical</th>}
                            {data.config?.mostrarDataCriacao !== false && <th className="text-center py-2 px-2 font-semibold">Data</th>}
                            {data.config?.mostrarDataPrevista && <th className="text-center py-2 px-2 font-semibold">Data Prevista</th>}
                            {data.config?.mostrarAprovacoes !== false && <th className="text-center py-2 px-2 font-semibold">Aprovações</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((d: any) => (
                            <tr key={d.id} className={`border-b border-muted/30 ${destaqueAtrasos && isAtrasado(d) ? "bg-red-50" : ""}`}>
                              <td className={`py-1.5 px-2 font-mono text-muted-foreground ${destaqueAtrasos && isAtrasado(d) ? "border-l-[3px] border-l-red-600" : ""}`}>{d.id}</td>
                              <td className="py-1.5 px-2">{d.disciplina}</td>
                              {data.config?.mostrarFornecedores && <td className="py-1.5 px-2">{d.fornecedor || "—"}</td>}
                              <td className="py-1.5 px-2 whitespace-normal break-words min-w-[200px]">{d.descricao}</td>
                              {data.config?.mostrarSeveridade !== false && (
                                <td className="py-1.5 px-2 text-center">
                                  <span className={`badge inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${sevColors[d.severidade] || ""}`}>
                                    {d.severidade}
                                  </span>
                                </td>
                              )}
                              <td className="py-1.5 px-2 text-center">
                                <span className={`badge inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[d.status] || ""}`}>
                                  {statusLabels[d.status] || d.status}
                                </span>
                              </td>
                              {data.config?.mostrarVertical && <td className="py-1.5 px-2 text-center text-xs">{origemLabels[d.origem] || d.origem}</td>}
                              {data.config?.mostrarDataCriacao !== false && (
                                <td className="py-1.5 px-2 text-center text-muted-foreground">
                                  {d.dataIdentificacao ? new Date(d.dataIdentificacao).toLocaleDateString("pt-BR") : "—"}
                                </td>
                              )}
                              {data.config?.mostrarDataPrevista && (
                                <td className="py-1.5 px-2 text-center text-muted-foreground whitespace-nowrap">
                                  {d.prazoSugerido ? new Date(d.prazoSugerido).toLocaleDateString("pt-BR") : "—"}
                                  {destaqueAtrasos && isAtrasado(d) && (
                                    <span className="ml-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white align-middle">
                                      {diasAtraso(d)}d
                                    </span>
                                  )}
                                </td>
                              )}
                              {data.config?.mostrarAprovacoes !== false && (
                                <td className="py-1.5 px-2 text-center">
                                  {(d.aprovacoes && d.aprovacoes.length > 0) ? (
                                    <span className="inline-flex flex-wrap gap-1 justify-center">
                                      {d.aprovacoes.map((a: any, i: number) => (
                                        <span
                                          key={i}
                                          className={`badge inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${a.decisao === "aprovado" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                                          title={`${a.tipo === "gerenciadora" ? "Gerenciadora" : "Arquitetura"} ${a.decisao}${a.aprovador_nome ? " — " + a.aprovador_nome : ""}${a.comentario ? " (" + a.comentario + ")" : ""}`}
                                        >
                                          {a.tipo === "gerenciadora" ? "G" : "A"}{a.decisao === "aprovado" ? "✓" : "✗"}
                                        </span>
                                      ))}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* Detalhe de cada desvio */}
              {data.desvios && data.desvios.length > 0 && data.config?.mostrarDetalhamento !== false && (
                <>
                  <Separator className="my-6" />
                  <div className="section">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      {agruparPorAmbiente ? "Detalhamento dos Desvios por Ambiente" : "Detalhamento dos Desvios"}
                    </h2>
                    {(() => {
                      const groups = agruparPorAmbiente
                        ? groupByAmbiente(data.desvios)
                        : [{ nome: "", items: data.desvios as any[] }];
                      return (
                        <div className="space-y-6">
                          {groups.map((g, gi) => (
                            <div key={gi} className="space-y-4">
                              {agruparPorAmbiente && (
                                <div className="text-sm font-bold text-foreground bg-primary/5 border-l-4 border-primary px-3 py-2 rounded">
                                  Ambiente: {g.nome} <span className="text-muted-foreground font-normal text-xs">— {g.items.length} desvio{g.items.length > 1 ? "s" : ""}</span>
                                </div>
                              )}
                              {g.items.map((d: any) => (
                        <div key={d.id} className="desvio-detail border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                              <span className="text-muted-foreground">#{d.id}</span>
                              Desvio
                            </h3>
                            <div className="flex gap-1.5 items-center">
                              {destaqueAtrasos && isAtrasado(d) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                                  <AlertTriangle className="h-3 w-3" /> EM ATRASO • {diasAtraso(d)}d
                                </span>
                              )}
                              {data.config?.mostrarSeveridade !== false && (
                                <span className={`badge inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${sevColors[d.severidade] || ""}`}>
                                  {d.severidade}
                                </span>
                              )}
                              <span className={`badge inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[d.status] || ""}`}>
                                {statusLabels[d.status] || d.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs bg-muted/40 border-l-2 border-primary px-3 py-2 rounded mb-3 whitespace-pre-wrap break-words">
                            <span className="font-semibold text-foreground">Descrição: </span>
                            {d.descricao}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground mb-3">
                            <div><span className="font-medium text-foreground">Grupo:</span> {d.disciplina}</div>
                            {data.config?.mostrarFornecedores && <div><span className="font-medium text-foreground">Fornecedor:</span> {d.fornecedor || "—"}</div>}
                            {data.config?.mostrarVertical && <div><span className="font-medium text-foreground">Vertical:</span> {origemLabels[d.origem] || d.origem}</div>}
                            <div><span className="font-medium text-foreground">Local:</span> {d.localizacao || "—"}</div>
                            <div><span className="font-medium text-foreground">Identificação:</span> {d.dataIdentificacao ? new Date(d.dataIdentificacao).toLocaleDateString("pt-BR") : "—"}</div>
                            {data.config?.mostrarDataPrevista && <div><span className="font-medium text-foreground">Data Prevista:</span> {d.prazoSugerido ? new Date(d.prazoSugerido).toLocaleDateString("pt-BR") : "—"}</div>}
                            {data.config?.mostrarDataFinalizacao && <div><span className="font-medium text-foreground">Fechamento:</span> {d.dataFechamento ? new Date(d.dataFechamento).toLocaleDateString("pt-BR") : "—"}</div>}
                            {data.config?.mostrarTagsClassificacao !== false && (d.tagCritico || d.tagSegurancaTrabalho || d.tagSolicitadoCliente || d.tagSolicitadoGerenciadora || d.tagSolicitadoArquitetura) && (
                              <div className="flex gap-1 items-center flex-wrap">
                                {d.tagCritico === 1 && <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-100 text-red-700">Crítico</span>}
                                {d.tagSegurancaTrabalho === 1 && <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">Segurança</span>}
                                {d.tagSolicitadoCliente === 1 && <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 text-blue-700">Solic. Cliente</span>}
                                {d.tagSolicitadoGerenciadora === 1 && <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-100 text-purple-700">Solic. Gerenciadora</span>}
                                {d.tagSolicitadoArquitetura === 1 && <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">Solic. Arquitetura</span>}
                              </div>
                            )}
                          </div>
                          {data.config?.mostrarAprovacoes !== false && d.aprovacoes && d.aprovacoes.length > 0 && (
                            <div className="text-xs mb-3 flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-foreground">Aprovações:</span>
                              {d.aprovacoes.map((a: any, i: number) => (
                                <span
                                  key={i}
                                  className={`inline-block px-2 py-0.5 rounded border text-[10px] font-medium ${a.decisao === "aprovado" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                                  title={a.comentario || ""}
                                >
                                  {a.tipo === "gerenciadora" ? "Gerenciadora" : "Arquitetura"} {a.decisao === "aprovado" ? "✓" : "✗"}
                                  {a.aprovador_nome ? ` — ${a.aprovador_nome}` : ""}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Planos de ação */}
                          {data.config?.mostrarResponsaveis && d.planos && d.planos.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold mb-1">Planos de Ação:</p>
                              <div className="space-y-1">
                                {d.planos.map((p: any, i: number) => (
                                  <div key={i} className="text-xs bg-muted/30 rounded px-2 py-1 flex items-center gap-2">
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${p.status === "concluido" ? "bg-emerald-500" : p.status === "em_andamento" ? "bg-blue-500" : "bg-amber-500"}`} />
                                    <span className="font-medium">{p.acao}</span>
                                    <span className="text-muted-foreground">— {p.responsavel}</span>
                                    {p.prioridade && <span className={`text-[9px] px-1 rounded ${p.prioridade === "urgente" ? "bg-red-100 text-red-700" : p.prioridade === "baixa" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-600"}`}>{p.prioridade}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fotos */}
                          {data.config?.mostrarFotos && (d.fotosAbertura?.length > 0 || d.fotosFechamento?.length > 0) && (
                            <div className="flex flex-wrap gap-4">
                              {d.fotosAbertura?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Evidências Abertura</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {d.fotosAbertura.map((url: string, i: number) => (
                                      <img key={i} src={url} alt={`Abertura ${i + 1}`} className="w-[100px] h-[75px] object-cover rounded border" />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {d.fotosFechamento?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Evidências Fechamento</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {d.fotosFechamento.map((url: string, i: number) => (
                                      <img key={i} src={url} alt={`Fechamento ${i + 1}`} className="w-[100px] h-[75px] object-cover rounded border" />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Localização na Planta */}
                          {data.config?.mostrarLocalizacaoPlanta && d.plantaUrl && d.pinX && d.pinY && !isNaN(Number(d.pinX)) && !isNaN(Number(d.pinY)) && Number(d.pinX) >= 0 && Number(d.pinX) <= 100 && Number(d.pinY) >= 0 && Number(d.pinY) <= 100 && (
                            <div className="mt-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                                Localização na Planta{d.plantaNome ? ` — ${d.plantaNome}` : ""}
                              </p>
                              <div className="relative inline-block border rounded-md overflow-hidden" style={{ maxWidth: 280 }}>
                                <img src={d.plantaUrl} alt="Planta" className="w-full block" />
                                <div
                                  className="absolute"
                                  style={{
                                    left: `${Number(d.pinX)}%`,
                                    top: `${Number(d.pinY)}%`,
                                    transform: "translate(-50%, -50%)",
                                    width: 20,
                                    height: 20,
                                    borderRadius: "50%",
                                    border: "3px solid #ef4444",
                                    background: "rgba(239,68,68,0.25)",
                                  }}
                                />
                                <div
                                  className="absolute"
                                  style={{
                                    left: `${Number(d.pinX)}%`,
                                    top: `${Number(d.pinY)}%`,
                                    transform: "translate(-50%, -50%)",
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: "#ef4444",
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* Análise IA */}
              {data.analise && (
                <>
                  <Separator className="my-6" />
                  <div className="section">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-primary" /> Análise Executiva (IA)
                    </h2>
                    <div className="analise bg-muted/30 border rounded-lg p-4">
                      <div className="prose prose-sm max-w-none text-foreground">
                        <Streamdown>{data.analise}</Streamdown>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!data && !generateMutation.isPending && (
        <Card className="shadow-sm border-0 bg-card">
          <CardContent className="p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Configure os filtros acima e clique em "Exportar" para gerar o relatório.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              O relatório incluirá KPIs, tabela por disciplina, performance de fornecedores, detalhamento dos desvios com fotos e análise IA.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
