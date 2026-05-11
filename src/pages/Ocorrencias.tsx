import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Siren, Plus, Calendar, Building2, AlertTriangle, Clock } from "lucide-react";

const CLASSIF_LABELS: Record<string, string> = {
  incidente: "Incidente",
  incidente_ambiental: "Incidente Ambiental",
  aca: "Acidente C/ Afastamento",
  asa: "Acidente S/ Afastamento",
  af: "Acidente Fatal",
  at: "Acidente de Trajeto",
};

const CLASSIF_COLORS: Record<string, string> = {
  incidente: "bg-blue-100 text-blue-700 border-blue-200",
  incidente_ambiental: "bg-emerald-100 text-emerald-700 border-emerald-200",
  aca: "bg-orange-100 text-orange-700 border-orange-200",
  asa: "bg-amber-100 text-amber-700 border-amber-200",
  af: "bg-red-200 text-red-900 border-red-300",
  at: "bg-violet-100 text-violet-700 border-violet-200",
};

const STATUS_LABELS: Record<string, string> = {
  comunicado: "Comunicado",
  em_investigacao: "Em Investigação",
  em_analise: "Em Análise",
  acao_em_andamento: "Plano em Andamento",
  encerrado: "Encerrado",
};

const STATUS_COLORS: Record<string, string> = {
  comunicado: "bg-slate-100 text-slate-700 border-slate-200",
  em_investigacao: "bg-amber-100 text-amber-700 border-amber-200",
  em_analise: "bg-blue-100 text-blue-700 border-blue-200",
  acao_em_andamento: "bg-violet-100 text-violet-700 border-violet-200",
  encerrado: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function Ocorrencias() {
  const [, navigate] = useLocation();
  const { data: obras } = trpc.obras.list.useQuery();
  const [obraFilter, setObraFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: ocorrencias, isLoading } = trpc.ocorrencias.list.useQuery({
    ...(obraFilter !== "all" ? { obraId: Number(obraFilter) } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  });

  const getObraNome = (obraId: number) => {
    const o = obras?.find((x: any) => x.id === obraId);
    return o ? `${o.codigo} — ${o.nome}` : `Obra #${obraId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Siren className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600 shrink-0" />
            <span className="truncate">Investigação e Análise de Ocorrências</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">AWPRO 012 — Comunicação, investigação e análise de incidentes</p>
        </div>
        <Button onClick={() => navigate("/qsms/ocorrencias/nova")} className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Nova Ocorrência
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={obraFilter} onValueChange={setObraFilter}>
          <SelectTrigger className="w-full sm:w-[300px]"><SelectValue placeholder="Filtrar por obra..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as obras</SelectItem>
            {obras?.map((o: any) => (
              <SelectItem key={o.id} value={String(o.id)}>{o.codigo} — {o.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Status..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Carregando ocorrências...</div>
      ) : !ocorrencias?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Siren className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">Nenhuma ocorrência registrada</h3>
            <p className="text-slate-400 mt-1 text-sm">Clique em "Nova Ocorrência" para registrar uma comunicação inicial.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ocorrencias.map((o: any) => {
            const atrasado = o.status !== "encerrado" && o.prazoInvestigacao && o.prazoInvestigacao < Date.now();
            return (
              <Card key={o.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/qsms/ocorrencias/${o.id}`)}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 truncate max-w-full flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            {getObraNome(o.obraId)}
                          </h3>
                          <Badge className={CLASSIF_COLORS[o.classificacao] || "bg-slate-100"}>
                            {CLASSIF_LABELS[o.classificacao] || o.classificacao}
                          </Badge>
                          <Badge className={STATUS_COLORS[o.status] || "bg-slate-100"}>
                            {STATUS_LABELS[o.status] || o.status}
                          </Badge>
                          {atrasado && (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              <Clock className="h-3 w-3 mr-1" /> Prazo de investigação vencido
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{o.descricao_preliminar}</p>
                        <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {o.dataOcorrencia ? new Date(o.dataOcorrencia).toLocaleDateString("pt-BR") : "—"}
                            {o.hora ? ` ${o.hora}` : ""}
                          </span>
                          {o.local_ocorrencia && <span className="truncate max-w-[200px]">📍 {o.local_ocorrencia}</span>}
                          {o.acidentado_nome && <span className="truncate max-w-[200px]">👤 {o.acidentado_nome}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}