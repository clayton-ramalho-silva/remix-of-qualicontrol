import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle, CheckCircle2, Clock, FileWarning, TrendingUp,
  ArrowRight, BarChart3, Activity, ClipboardCheck, UserCheck,
  Search, ClipboardList, Wrench, Siren, HardHat, UserRoundCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const SEV_COLORS: Record<string, string> = { leve: "#10b981", moderado: "#f59e0b", grave: "#ef4444" };

type OrigemFilter = "qualidade" | "punch_list" | "pos_obra" | null;

const ORIGENS = [
  {
    key: "qualidade" as const,
    label: "Qualidade",
    icon: Search,
    color: "text-sky-600",
    bgActive: "bg-sky-100 ring-2 ring-sky-400 shadow-md",
    bgInactive: "bg-sky-50/60 hover:bg-sky-100/80",
    iconBg: "bg-sky-500",
    description: "Inspeção de qualidade",
  },
  {
    key: "punch_list" as const,
    label: "Check List",
    icon: ClipboardList,
    color: "text-violet-600",
    bgActive: "bg-violet-100 ring-2 ring-violet-400 shadow-md",
    bgInactive: "bg-violet-50/60 hover:bg-violet-100/80",
    iconBg: "bg-violet-500",
    description: "Pendências de entrega",
  },
  {
    key: "pos_obra" as const,
    label: "Assistência Técnica",
    icon: Wrench,
    color: "text-orange-600",
    bgActive: "bg-orange-100 ring-2 ring-orange-400 shadow-md",
    bgInactive: "bg-orange-50/60 hover:bg-orange-100/80",
    iconBg: "bg-orange-500",
    description: "Assistência técnica",
  },
] as const;

export default function Home() {
  const [selectedObraId, setSelectedObraId] = useState<string>("all");
  const [selectedOrigem, setSelectedOrigem] = useState<OrigemFilter>(null);
  const [, setLocation] = useLocation();

  const { data: obras, isLoading: obrasLoading } = trpc.obras.list.useQuery();
  const obraIdNum = selectedObraId === "all" ? undefined : parseInt(selectedObraId);

  // KPIs sem filtro de origem (para mostrar contagens nos ícones)
  const { data: kpisAll, isLoading: kpisAllLoading } = trpc.kpis.get.useQuery(
    obraIdNum ? { obraId: obraIdNum } : undefined
  );

  // KPIs com filtro de origem (para os cards e gráficos)
  const { data: kpisFiltered, isLoading: kpisFilteredLoading } = trpc.kpis.get.useQuery(
    { obraId: obraIdNum, origem: selectedOrigem ?? undefined },
    { enabled: true }
  );

  const kpis = kpisFiltered;
  const kpisLoading = kpisFilteredLoading;

  const disciplinaData = useMemo(() => {
    if (!kpis?.porGrupo) return [];
    return Object.entries(kpis.porGrupo).map(([name, val]) => {
      const v = val as { total: number; abertos: number; fechados: number; graves: number };
      return { name, total: v.total, abertos: v.abertos, fechados: v.fechados, graves: v.graves };
    }).sort((a, b) => b.total - a.total);
  }, [kpis]);

  const fornecedorData = useMemo(() => {
    if (!kpis?.porFornecedor) return [];
    return Object.entries(kpis.porFornecedor).map(([name, raw]) => {
      const val = raw as { total: number; abertos: number; graves: number };
      return {
        name: name.length > 18 ? name.substring(0, 18) + "…" : name,
        fullName: name,
        total: val.total, abertos: val.abertos, graves: val.graves,
      };
    }).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [kpis]);

  const sevData = useMemo(() => {
    if (!kpis?.porSeveridade) return [];
    return [
      { name: "Leve", value: kpis.porSeveridade.leve, color: SEV_COLORS.leve },
      { name: "Moderado", value: kpis.porSeveridade.moderado, color: SEV_COLORS.moderado },
      { name: "Grave", value: kpis.porSeveridade.grave, color: SEV_COLORS.grave },
    ].filter(d => d.value > 0);
  }, [kpis]);

  const sevTotal = useMemo(() => sevData.reduce((s, d) => s + d.value, 0), [sevData]);

  const navigateToDesvios = (filters: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    if (obraIdNum) params.set("obraId", String(obraIdNum));
    if (selectedOrigem) params.set("origem", selectedOrigem);
    setLocation(`/desvios?${params.toString()}`);
  };

  const toggleOrigem = (origem: OrigemFilter) => {
    setSelectedOrigem(prev => prev === origem ? null : origem);
  };

  const isLoading = obrasLoading || kpisLoading || kpisAllLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard AW Check</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral dos desvios e indicadores de qualidade
          </p>
        </div>
        <Select value={selectedObraId} onValueChange={setSelectedObraId}>
          <SelectTrigger className="w-[240px] bg-card">
            <SelectValue placeholder="Filtrar por obra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as obras</SelectItem>
            {obras?.map((obra) => (
              <SelectItem key={obra.id} value={String(obra.id)}>
                {obra.codigo} - {obra.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vertical Filter Icons */}
      <Card className="shadow-sm border-0 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Filtrar por Vertical
            </span>
            {selectedOrigem && (
              <button
                onClick={() => setSelectedOrigem(null)}
                className="text-xs text-primary hover:underline"
              >
                Limpar filtro
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {ORIGENS.map((o) => {
              const Icon = o.icon;
              const isActive = selectedOrigem === o.key;
              const origemCount = kpisAll?.porOrigem?.[o.key] ?? 0;
              return (
                <button
                  key={o.key}
                  onClick={() => toggleOrigem(o.key)}
                  className={`relative p-5 rounded-xl transition-all duration-200 text-center group ${
                    isActive ? o.bgActive : o.bgInactive
                  }`}
                >
                  <div className="flex flex-col items-center gap-2.5">
                    <div className={`p-3 rounded-xl ${o.iconBg} text-white shadow-sm transition-transform ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${o.color}`}>{o.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>
                    </div>
                    <div className={`text-2xl font-bold ${o.color}`}>
                      {origemCount}
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <KpiCard
            title="Total"
            value={kpis?.total ?? 0}
            icon={<BarChart3 className="h-4 w-4" />}
            color="text-foreground"
            bgColor="bg-secondary"
            onClick={() => navigateToDesvios({})}
          />
          <KpiCard
            title="Abertos"
            value={kpis?.abertos ?? 0}
            icon={<FileWarning className="h-4 w-4" />}
            color="text-amber-600"
            bgColor="bg-amber-50"
            onClick={() => navigateToDesvios({ status: "aberto" })}
          />
          <KpiCard
            title="Em Andamento"
            value={kpis?.emAndamento ?? 0}
            icon={<Activity className="h-4 w-4" />}
            color="text-blue-600"
            bgColor="bg-blue-50"
            onClick={() => navigateToDesvios({ status: "em_andamento" })}
          />
          <KpiCard
            title="Ag. Aceite"
            value={kpis?.aguardandoAceite ?? 0}
            icon={<UserCheck className="h-4 w-4" />}
            color="text-purple-600"
            bgColor="bg-purple-50"
            onClick={() => navigateToDesvios({ status: "aguardando_aceite" })}
          />
          <KpiCard
            title="Fechados"
            value={kpis?.fechados ?? 0}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
            onClick={() => navigateToDesvios({ status: "fechado" })}
          />
          <KpiCard
            title="Atrasados"
            value={kpis?.atrasados ?? 0}
            icon={<Clock className="h-4 w-4" />}
            color="text-red-600"
            bgColor="bg-red-50"
            onClick={() => navigateToDesvios({ status: "aberto" })}
          />
          <KpiCard
            title="Taxa Fech."
            value={`${kpis?.taxaFechamento ?? 0}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            color="text-primary"
            bgColor="bg-primary/5"
          />
        </div>
      )}

      {/* Classificações Ativas */}
      {!isLoading && (kpis?.porClassificacao?.chamado_critico || kpis?.porClassificacao?.seguranca_trabalho || kpis?.porClassificacao?.solicitado_cliente) ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { tag: "chamado_critico", label: "Chamado Crítico", icon: Siren, count: kpis?.porClassificacao?.chamado_critico ?? 0, colors: { bg: "bg-red-50/80 hover:bg-red-100", border: "border-red-100 hover:border-red-200", iconBg: "bg-red-500", title: "text-red-500", value: "text-red-700", arrow: "text-red-300" } },
            { tag: "seguranca_trabalho", label: "Dep. Definição Projeto/Contratação", icon: HardHat, count: kpis?.porClassificacao?.seguranca_trabalho ?? 0, colors: { bg: "bg-amber-50/80 hover:bg-amber-100", border: "border-amber-100 hover:border-amber-200", iconBg: "bg-amber-500", title: "text-amber-600", value: "text-amber-700", arrow: "text-amber-300" } },
            { tag: "solicitado_cliente", label: "Pendente Agendamento GO", icon: UserRoundCheck, count: kpis?.porClassificacao?.solicitado_cliente ?? 0, colors: { bg: "bg-blue-50/80 hover:bg-blue-100", border: "border-blue-100 hover:border-blue-200", iconBg: "bg-blue-500", title: "text-blue-500", value: "text-blue-700", arrow: "text-blue-300" } },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tag}
                onClick={() => navigateToDesvios({ tag: item.tag })}
                className={`group relative flex items-center gap-3 p-3 sm:p-4 rounded-xl ${item.colors.bg} border ${item.colors.border} transition-all duration-200 hover:shadow-sm`}
              >
                <div className={`p-2 sm:p-2.5 rounded-lg ${item.colors.iconBg} text-white shadow-sm group-hover:scale-105 transition-transform shrink-0`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="text-left min-w-0">
                  <p className={`text-[10px] sm:text-xs font-medium ${item.colors.title} uppercase tracking-wide truncate`}>{item.label}</p>
                  <p className={`text-lg sm:text-xl font-bold ${item.colors.value}`}>{item.count}</p>
                </div>
                <ArrowRight className={`h-4 w-4 ${item.colors.arrow} ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0`} />
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Desvios por Grupo - Horizontal Bars */}
        <Card className="lg:col-span-2 shadow-sm border-0 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Desvios por Grupo
              {selectedOrigem && (
                <Badge variant="outline" className="text-xs ml-1">
                  {ORIGENS.find(o => o.key === selectedOrigem)?.label}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px]" />
            ) : disciplinaData.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum desvio registrado{selectedOrigem ? " nesta vertical" : " ainda"}
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {disciplinaData.map((item) => {
                  const maxVal = disciplinaData[0]?.total || 1;
                  const pct = (item.total / maxVal) * 100;
                  return (
                    <button
                      key={item.name}
                      className="w-full text-left group"
                      onClick={() => navigateToDesvios({ disciplina: item.name })}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">
                            <span className="font-semibold text-foreground">{item.total}</span> total
                          </span>
                          {item.abertos > 0 && (
                            <span className="text-amber-600 font-medium">{item.abertos} abertos</span>
                          )}
                          {item.graves > 0 && (
                            <span className="text-red-500 font-medium">{item.graves} graves</span>
                          )}
                        </div>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full flex rounded-full overflow-hidden transition-all group-hover:opacity-90">
                          {item.fechados > 0 && (
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${(item.fechados / item.total) * pct}%` }}
                            />
                          )}
                          {(item.total - item.fechados - item.graves) > 0 && (
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${((item.total - item.fechados - item.graves) / item.total) * pct}%` }}
                            />
                          )}
                          {item.graves > 0 && (
                            <div
                              className="h-full bg-red-500"
                              style={{ width: `${(item.graves / item.total) * pct}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Fechados
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Abertos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Graves
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Severidade - Donut with center label */}
        <Card className="shadow-sm border-0 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Por Severidade
              {selectedOrigem && (
                <Badge variant="outline" className="text-xs ml-1">
                  {ORIGENS.find(o => o.key === selectedOrigem)?.label}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px]" />
            ) : sevData.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum desvio registrado
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <ResponsiveContainer width={240} height={240}>
                    <PieChart>
                      <Pie
                        data={sevData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {sevData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          fontSize: "13px",
                        }}
                        formatter={(value: number, name: string) => [`${value} desvios`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-foreground">{sevTotal}</span>
                    <span className="text-xs text-muted-foreground">desvios</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 w-full mt-4">
                  {sevData.map((item) => (
                    <button
                      key={item.name}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                      onClick={() => navigateToDesvios({ severidade: item.name.toLowerCase() })}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{item.value}</span>
                        <span className="text-xs text-muted-foreground">
                          ({Math.round((item.value / sevTotal) * 100)}%)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fornecedores Chart */}
      <Card className="shadow-sm border-0 bg-card">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Desvios por Fornecedor
            {selectedOrigem && (
              <Badge variant="outline" className="text-xs ml-1">
                {ORIGENS.find(o => o.key === selectedOrigem)?.label}
              </Badge>
            )}
          </CardTitle>
          <button
            onClick={() => setLocation("/fornecedores")}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Ver ranking completo <ArrowRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px]" />
          ) : fornecedorData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhum fornecedor com desvios{selectedOrigem ? " nesta vertical" : ""}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(280, fornecedorData.length * 44)}>
              <BarChart data={fornecedorData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={140}
                  tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                  }}
                  formatter={(value: number, name: string) => [`${value}`, name]}
                />
                <Bar dataKey="total" name="Total" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={20} />
                <Bar dataKey="graves" name="Graves" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const statusColors: Record<string, string> = {
  "ÓTIMA": "bg-emerald-100 text-emerald-700",
  "REGULAR": "bg-amber-100 text-amber-700",
  "RUIM": "bg-red-100 text-red-700",
  "CRÍTICO": "bg-red-200 text-red-900",
};

function LastVerificacaoCard({ obraId }: { obraId?: number }) {
  const [, setLocation] = useLocation();
  const { data: verificacoes, isLoading } = trpc.verificacoes.list.useQuery(
    obraId ? { obraId } : undefined
  );
  const { data: obras } = trpc.obras.list.useQuery();

  const ultima = verificacoes?.[0];
  const obraNome = ultima ? obras?.find(o => o.id === ultima.obraId)?.nome : undefined;

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (!ultima) return null;

  const scores = [
    { label: "Geral", score: ultima.scoreGeral, status: ultima.statusGeral },
    { label: "Condição", score: ultima.scoreCondicao, status: ultima.statusCondicao },
    { label: "Qualidade", score: ultima.scoreQualidade, status: ultima.statusQualidade },
    { label: "Cronograma", score: ultima.scoreCronograma, status: ultima.statusCronograma },
  ];

  return (
    <Card className="shadow-sm border-0 bg-card">
      <CardContent className="p-5">
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-teal-600 shrink-0" />
              <h3 className="font-semibold text-foreground">Última Verificação</h3>
            </div>
            <button
              onClick={() => setLocation(`/verificacoes/${ultima.id}`)}
              className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              Ver detalhes <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {obraNome && (
              <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                {obraNome}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(ultima.dataVistoria).toLocaleDateString("pt-BR")}
            </span>
            <Badge className={statusColors[ultima.statusGeral || ""] || "bg-slate-100 text-slate-600"}>
              {ultima.statusGeral || "—"}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scores.map((s) => (
            <div key={s.label} className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-foreground">{s.score ?? "—"}%</p>
              <Badge className={`mt-1 text-xs ${statusColors[s.status || ""] || "bg-slate-100 text-slate-600"}`}>
                {s.status || "—"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  title, value, icon, color, bgColor, onClick,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`shadow-sm border-0 bg-card transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <div className={`p-1.5 rounded-lg ${bgColor} ${color}`}>
            {icon}
          </div>
        </div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
