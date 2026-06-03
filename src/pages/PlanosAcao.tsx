import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ObraSelect from "@/components/ObraSelect";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Target, Plus, Search, Calendar, AlertTriangle, CheckCircle2,
  Clock, User, Filter, Link2, Flame, ShieldCheck, Trash2,
} from "lucide-react";


const STATUS_COLS: { key: string; label: string; color: string; icon: any }[] = [
  { key: "pendente", label: "Pendente", color: "bg-amber-50 border-amber-200", icon: Clock },
  { key: "em_andamento", label: "Em Andamento", color: "bg-blue-50 border-blue-200", icon: Target },
  { key: "concluido", label: "Concluído", color: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
];

const VERTICAL_COLORS: Record<string, string> = {
  qualidade: "bg-sky-100 text-sky-700 border-sky-200",
  checklist: "bg-violet-100 text-violet-700 border-violet-200",
  qsms: "bg-orange-100 text-orange-700 border-orange-200",
  vistoria: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const VERTICAL_LABELS: Record<string, string> = {
  qualidade: "Qualidade", checklist: "Checklist", qsms: "QSMS", vistoria: "Vistoria",
};

const PRIO_COLORS: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  normal: "bg-slate-100 text-slate-700",
  baixa: "bg-slate-50 text-slate-500",
};

export default function PlanosAcao() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const deleteMutation = trpc.planos.delete.useMutation({
    onSuccess: () => {
      toast.success("Plano excluído");
      setConfirmDeleteId(null);
      utils.planos.list.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao excluir"),
  });

  const [search, setSearch] = useState("");
  const [obraFilter, setObraFilter] = useState("all");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [prioFilter, setPrioFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [meus, setMeus] = useState(false);
  const [atrasados, setAtrasados] = useState(false);

  const { data: obras } = trpc.obras.list.useQuery();
  const { data: planos, isLoading } = trpc.planos.list.useQuery({});

  const filtered = useMemo(() => {
    let r = planos || [];
    if (search) {
      const t = search.toLowerCase();
      r = r.filter((p: any) =>
        p.acao?.toLowerCase().includes(t) ||
        p.responsavel?.toLowerCase().includes(t) ||
        p.desvios?.some((d: any) => d.descricao?.toLowerCase().includes(t))
      );
    }
    if (obraFilter !== "all") r = r.filter((p: any) => String(p.obraId) === obraFilter || p.desvios?.some((d: any) => String(d.obraId) === obraFilter));
    if (verticalFilter !== "all") r = r.filter((p: any) => p.vertical === verticalFilter || p.desvios?.some((d: any) => d.origem === verticalFilter));
    if (prioFilter !== "all") r = r.filter((p: any) => p.prioridade === prioFilter);
    if (tipoFilter !== "all") r = r.filter((p: any) => (p.tipo || "corretivo") === tipoFilter);
    if (meus && user?.email) r = r.filter((p: any) => p.responsavelEmail === user.email);
    if (atrasados) r = r.filter((p: any) => p.status !== "concluido" && p.prazo && p.prazo < Date.now());
    return r;
  }, [planos, search, obraFilter, verticalFilter, prioFilter, tipoFilter, meus, atrasados, user?.email]);

  const kpis = useMemo(() => {
    const all = planos || [];
    const now = Date.now();
    const ativos = all.filter((p: any) => p.status !== "concluido");
    return {
      total: ativos.length,
      vencendo: ativos.filter((p: any) => p.prazo && p.prazo > now && p.prazo - now < 7 * 86400000).length,
      atrasados: ativos.filter((p: any) => p.prazo && p.prazo < now).length,
      concluidos: all.filter((p: any) => p.status === "concluido").length,
    };
  }, [planos]);

  const planosByStatus = useMemo(() => {
    const m: Record<string, any[]> = { pendente: [], em_andamento: [], concluido: [] };
    filtered.forEach((p: any) => {
      const k = m[p.status] ? p.status : "pendente";
      m[k].push(p);
    });
    return m;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-teal-600" />
            Planos de Ação
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Acompanhe e execute as ações para fechar desvios das suas verticais
          </p>
        </div>
        <Button onClick={() => navigate("/planos-acao/novo")} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Novo Plano
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Ativos" value={kpis.total} color="text-slate-900" icon={Target} />
        <KpiCard label="Vencendo em 7 dias" value={kpis.vencendo} color="text-amber-600" icon={Clock} />
        <KpiCard label="Atrasados" value={kpis.atrasados} color="text-red-600" icon={AlertTriangle} clickable onClick={() => setAtrasados(v => !v)} active={atrasados} />
        <KpiCard label="Concluídos" value={kpis.concluidos} color="text-emerald-600" icon={CheckCircle2} />
      </div>

      {/* Filtros */}
      <Card className="shadow-sm border-0">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar ação, responsável, desvio vinculado..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ObraSelect
              obras={obras}
              value={obraFilter}
              onValueChange={setObraFilter}
              allLabel="Todas as obras"
              placeholder="Obra"
              className="w-full sm:w-[200px] sm:shrink-0"
            />
            <Select value={verticalFilter} onValueChange={setVerticalFilter}>
              <SelectTrigger className="w-full sm:w-[180px] sm:shrink-0"><SelectValue placeholder="Vertical">{verticalFilter === "all" ? "Vertical: todas" : undefined}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as verticais</SelectItem>
                <SelectItem value="vistoria">Vistoria</SelectItem>
                <SelectItem value="qualidade">Qualidade</SelectItem>
                <SelectItem value="qsms">QSMS</SelectItem>
                <SelectItem value="checklist">Checklist</SelectItem>
                <SelectItem value="vistoria">Vistoria</SelectItem>
              </SelectContent>
            </Select>
            <Select value={prioFilter} onValueChange={setPrioFilter}>
              <SelectTrigger className="w-full sm:w-[180px] sm:shrink-0"><SelectValue placeholder="Prioridade">{prioFilter === "all" ? "Prioridade: todas" : undefined}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-[160px] sm:shrink-0"><SelectValue placeholder="Tipo">{tipoFilter === "all" ? "Tipo: todos" : undefined}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="corretivo">Corretivo</SelectItem>
                <SelectItem value="preventivo">Preventivo</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button variant={meus ? "default" : "outline"} onClick={() => setMeus(v => !v)} className={meus ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}>
              <User className="h-4 w-4 mr-2" /> Meus Planos
            </Button>
            <Button variant={atrasados ? "default" : "outline"} onClick={() => setAtrasados(v => !v)} className={atrasados ? "bg-red-600 hover:bg-red-700 text-white" : ""}>
              <Flame className="h-4 w-4 mr-2" /> Atrasados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLS.map(col => {
            const items = planosByStatus[col.key] || [];
            const Icon = col.icon;
            return (
              <div key={col.key} className={`rounded-xl border-2 ${col.color} p-3 min-h-[200px]`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-700" />
                    <h3 className="font-semibold text-sm text-slate-900">{col.label}</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="text-center text-xs text-slate-400 py-8">Sem planos</div>
                  )}
                  {items.map((p: any) => <PlanoCard key={p.id} plano={p} onClick={() => navigate(`/planos-acao/${p.id}`)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color, icon: Icon, clickable, onClick, active }: { label: string; value: number; color: string; icon: any; clickable?: boolean; onClick?: () => void; active?: boolean }) {
  return (
    <Card className={`shadow-sm border-0 ${clickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""} ${active ? "ring-2 ring-red-400" : ""}`} onClick={onClick}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color} opacity-30`} />
      </CardContent>
    </Card>
  );
}

function PlanoCard({ plano, onClick }: { plano: any; onClick: () => void }) {
  const overdue = plano.status !== "concluido" && plano.prazo && plano.prazo < Date.now();
  const isPreventivo = plano.tipo === "preventivo";
  const verticaisFromDesvios = (plano.desvios || []).map((d: any) => d.origem);
  const verticais = Array.from(new Set([
    ...(plano.vertical ? [plano.vertical] : []),
    ...verticaisFromDesvios,
  ])).filter(Boolean) as string[];
  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md hover:border-teal-300 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-slate-900 line-clamp-2 flex-1">{plano.acao}</p>
        {plano.prioridade && plano.prioridade !== "normal" && (
          <Badge className={`text-[10px] shrink-0 ${PRIO_COLORS[plano.prioridade] || ""}`}>{plano.prioridade}</Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {isPreventivo && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 border-blue-200 text-blue-700">
            <ShieldCheck className="h-2.5 w-2.5" /> Preventivo
          </span>
        )}
        {verticais.map((v: string) => (
          <span key={v} className={`text-[10px] px-1.5 py-0.5 rounded border ${VERTICAL_COLORS[v] || ""}`}>{VERTICAL_LABELS[v] || v}</span>
        ))}
        {!isPreventivo && plano.desvios && plano.desvios.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
            <Link2 className="h-2.5 w-2.5" /> {plano.desvios.length} desvio{plano.desvios.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1 truncate"><User className="h-3 w-3" /> {plano.responsavel || "—"}</span>
        {plano.prazo && (
          <span className={`flex items-center gap-1 ${overdue ? "text-red-600 font-semibold" : ""}`}>
            <Calendar className="h-3 w-3" />
            {new Date(plano.prazo).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
    </button>
  );
}