import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ObraSelect from "@/components/ObraSelect";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import DraftsInProgress from "@/components/DraftsInProgress";
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

type Props = {
  categoria?: string;
  titulo?: string;
  rotaBase?: string;
};

export default function Verificacoes({
  categoria = "qualidade",
  titulo = "Verificações de Qualidade",
  rotaBase = "/verificacoes",
}: Props) {
  const [, navigate] = useLocation();
  const { data: obras } = trpc.obras.list.useQuery();
  const [obraFilter, setObraFilter] = useState<string>("all");
  const [mostrarRascunhos, setMostrarRascunhos] = useState(false);
  const { data: verificacoes, isLoading } = trpc.verificacoes.list.useQuery({
    ...(obraFilter !== "all" ? { obraId: Number(obraFilter) } : {}),
    categoria,
  });

  const getObraNome = (obraId: number) => {
    const obra = obras?.find(o => o.id === obraId);
    return obra ? `${obra.codigo} — ${obra.nome}` : `Obra #${obraId}`;
  };

  const rascunhoCount = (verificacoes || []).filter((v: any) => v.status === "rascunho").length;
  const visiveis = (verificacoes || []).filter((v: any) =>
    mostrarRascunhos ? true : v.status !== "rascunho"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7 text-teal-600 shrink-0" />
            <span className="truncate">{titulo}</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Histórico de vistorias e checklists preenchidos</p>
        </div>
        <Button onClick={() => navigate(`${rotaBase}/nova`)} className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Nova Verificação
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <ObraSelect
          obras={obras}
          value={obraFilter}
          onValueChange={setObraFilter}
          allLabel="Todas as obras"
          placeholder="Filtrar por obra..."
          className="w-full sm:w-[300px]"
        />
        {rascunhoCount > 0 && (
          <Button
            variant={mostrarRascunhos ? "default" : "outline"}
            size="sm"
            onClick={() => setMostrarRascunhos((v) => !v)}
          >
            {mostrarRascunhos ? "Ocultar rascunhos" : `Mostrar rascunhos (${rascunhoCount})`}
          </Button>
        )}
      </div>

      {/* Lista de Verificações */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Carregando verificações...</div>
      ) : !visiveis.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">
              {verificacoes?.length ? "Nenhuma verificação finalizada" : "Nenhuma verificação encontrada"}
            </h3>
            <p className="text-slate-400 mt-1">
              {verificacoes?.length
                ? 'Clique em "Mostrar rascunhos" para ver as parciais.'
                : 'Clique em "Nova Verificação" para iniciar o primeiro checklist'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {visiveis.map((v: any) => (
            <Card key={v.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`${rotaBase}/${v.id}`)}>
              <CardContent className="p-4 sm:p-6 overflow-hidden">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate max-w-full">{getObraNome(v.obraId)}</h3>
                        {v.status === "rascunho" && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Rascunho</Badge>
                        )}
                        <Badge className={statusColors[v.statusGeral || ""] || "bg-slate-100 text-slate-600"}>
                          {statusIcon(v.statusGeral)} {v.statusGeral || "—"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 mt-1 text-xs sm:text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(v.dataVistoria).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[140px]">
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate">{v.avaliador}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
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
