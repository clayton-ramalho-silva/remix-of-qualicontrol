import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { ClipboardList, Plus, Calendar, User, Building2, TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";

const statusColors: Record<string, string> = {
  "ÓTIMA": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "REGULAR": "bg-amber-100 text-amber-700 border-amber-200",
  "RUIM": "bg-red-100 text-red-700 border-red-200",
  "CRÍTICO": "bg-red-200 text-red-900 border-red-300",
};

const statusIcon = (status: string | null) => {
  if (!status) return <Minus className="h-4 w-4" />;
  if (status === "ÓTIMA") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (status === "REGULAR") return <Minus className="h-4 w-4 text-amber-600" />;
  return <TrendingDown className="h-4 w-4 text-red-600" />;
};

export default function Verificacoes() {
  const [, navigate] = useLocation();
  const { data: obras } = trpc.obras.list.useQuery();
  const [obraFilter, setObraFilter] = useState<string>("all");
  const { data: verificacoes, isLoading } = trpc.verificacoes.list.useQuery(
    obraFilter !== "all" ? { obraId: Number(obraFilter) } : undefined
  );

  const getObraNome = (obraId: number) => {
    const obra = obras?.find(o => o.id === obraId);
    return obra ? `${obra.codigo} — ${obra.nome}` : `Obra #${obraId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-teal-600" />
            Verificações de Qualidade
          </h1>
          <p className="text-slate-500 mt-1">Histórico de verificações e checklists preenchidos</p>
        </div>
        <Button onClick={() => navigate("/verificacoes/nova")} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Nova Verificação
        </Button>
      </div>

      {/* Filtro */}
      <div className="flex gap-4">
        <Select value={obraFilter} onValueChange={setObraFilter}>
          <SelectTrigger className="w-[300px]"><SelectValue placeholder="Filtrar por obra..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as obras</SelectItem>
            {obras?.map(o => (
              <SelectItem key={o.id} value={String(o.id)}>{o.codigo} — {o.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Verificações */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Carregando verificações...</div>
      ) : !verificacoes?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">Nenhuma verificação encontrada</h3>
            <p className="text-slate-400 mt-1">Clique em "Nova Verificação" para iniciar o primeiro checklist</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {verificacoes.map(v => (
            <Card key={v.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/verificacoes/${v.id}`)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 text-teal-600">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{getObraNome(v.obraId)}</h3>
                        <Badge className={statusColors[v.statusGeral || ""] || "bg-slate-100 text-slate-600"}>
                          {statusIcon(v.statusGeral)} {v.statusGeral || "—"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(v.dataVistoria).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {v.avaliador}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Scores */}
                    <div className="hidden md:flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-slate-400 uppercase">Geral</p>
                        <p className="text-xl font-bold text-slate-900">{v.scoreGeral ?? "—"}%</p>
                      </div>
                      <div className="w-px h-10 bg-slate-200" />
                      <div className="text-center">
                        <p className="text-xs text-slate-400 uppercase">Condição</p>
                        <p className="text-lg font-semibold text-slate-700">{v.scoreCondicao ?? "—"}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400 uppercase">Qualidade</p>
                        <p className="text-lg font-semibold text-slate-700">{v.scoreQualidade ?? "—"}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400 uppercase">Cronograma</p>
                        <p className="text-lg font-semibold text-slate-700">{v.scoreCronograma ?? "—"}%</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0">
                      <Eye className="h-4 w-4 mr-1" /> Ver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
