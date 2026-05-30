import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VoiceRecorderButton from "@/components/VoiceRecorderButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus, Check, X, Clock, ShieldCheck, ListChecks, HardHat, Trash2, ClipboardCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

type Vertical = "qualidade" | "checklist" | "qsms" | "vistoria";
type Status = "pendente" | "cumprido" | "cancelado";

const verticais: {
  key: Vertical;
  label: string;
  icon: any;
  coverCol: "cobertura_qualidade" | "cobertura_checklist" | "cobertura_qsms" | "cobertura_vistoria";
  // cores por status (pendente / cumprido / cancelado) específicas da vertical
  styles: { pendente: string; cumprido: string; cancelado: string; dot: string };
}[] = [
  {
    key: "qualidade", label: "Qualidade", icon: ShieldCheck, coverCol: "cobertura_qualidade",
    styles: {
      pendente:  "bg-sky-50 border-sky-300 text-sky-900",
      cumprido:  "bg-sky-600 border-sky-700 text-white",
      cancelado: "bg-sky-50 border-sky-200 text-sky-700 line-through opacity-60",
      dot: "bg-sky-500",
    },
  },
  {
    key: "checklist", label: "Checklist", icon: ListChecks, coverCol: "cobertura_checklist",
    styles: {
      pendente:  "bg-amber-50 border-amber-300 text-amber-900",
      cumprido:  "bg-amber-500 border-amber-600 text-white",
      cancelado: "bg-amber-50 border-amber-200 text-amber-700 line-through opacity-60",
      dot: "bg-amber-500",
    },
  },
  {
    key: "qsms", label: "QSMS", icon: HardHat, coverCol: "cobertura_qsms",
    styles: {
      pendente:  "bg-emerald-50 border-emerald-300 text-emerald-900",
      cumprido:  "bg-emerald-600 border-emerald-700 text-white",
      cancelado: "bg-emerald-50 border-emerald-200 text-emerald-700 line-through opacity-60",
      dot: "bg-emerald-500",
    },
  },
  {
    key: "vistoria", label: "Vistoria", icon: ClipboardCheck, coverCol: "cobertura_vistoria",
    styles: {
      pendente:  "bg-purple-50 border-purple-300 text-purple-900",
      cumprido:  "bg-purple-600 border-purple-700 text-white",
      cancelado: "bg-purple-50 border-purple-200 text-purple-700 line-through opacity-60",
      dot: "bg-purple-500",
    },
  },
];

type Alocacao = {
  id: number;
  membro_id: number;
  obra_id: number;
  vertical: Vertical;
  data: string;
  status: Status;
  observacao: string | null;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function fmtMonth(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, c => c.toUpperCase());
}
function toIsoDate(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function buildMonthGrid(refDate: Date): Date[] {
  const first = startOfMonth(refDate);
  const startWeekday = first.getDay(); // 0=Dom
  const start = new Date(first); start.setDate(first.getDate() - startWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
}

const statusMeta: Record<Status, { icon: any; label: string }> = {
  pendente:  { icon: Clock, label: "Pendente" },
  cumprido:  { icon: Check, label: "Cumprido" },
  cancelado: { icon: X,     label: "Cancelado" },
};

export default function Alocacao() {
  const qc = useQueryClient();
  const [vertical, setVertical] = useState<Vertical>("qualidade");
  const [refDate, setRefDate] = useState(() => startOfMonth(new Date()));
  const [filterMembro, setFilterMembro] = useState<string>("all");
  const [filterObra, setFilterObra] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Alocacao> & { _isNew?: boolean } | null>(null);

  const verticalAtiva = verticais.find(v => v.key === vertical)!;

  const { data: obrasAll } = trpc.obras.list.useQuery();
  const { data: membros } = trpc.membros.list.useQuery();

  const obrasCobertas = useMemo(
    () => (obrasAll || []).filter((o: any) => Number(o[verticalAtiva.coverCol] ?? 0) > 0),
    [obrasAll, vertical]
  );
  const obraById = useMemo(() => new Map<number, any>((obrasAll || []).map((o: any) => [o.id, o])), [obrasAll]);
  const membroById = useMemo(() => new Map<number, any>((membros || []).map((m: any) => [m.id, m])), [membros]);

  // Range do mês visível (com slack pra cobrir as 6 semanas exibidas)
  const grid = useMemo(() => buildMonthGrid(refDate), [refDate]);
  const rangeStart = grid[0];
  const rangeEnd = grid[grid.length - 1];

  const { data: alocacoes } = useQuery({
    queryKey: ["alocacoes", vertical, toIsoDate(rangeStart), toIsoDate(rangeEnd)],
    queryFn: async (): Promise<Alocacao[]> => {
      const { data, error } = await supabase
        .from("alocacoes")
        .select("*")
        .eq("vertical", vertical)
        .gte("data", toIsoDate(rangeStart))
        .lte("data", toIsoDate(rangeEnd))
        .order("data");
      if (error) throw error;
      return (data || []) as Alocacao[];
    },
  });

  // Atividade real para decidir "cumprido": verificações (Qualidade) ou desvios (Checklist/QSMS)
  const startMs = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime();
  const endMs   = new Date(rangeEnd.getFullYear(),   rangeEnd.getMonth(),   rangeEnd.getDate(), 23, 59, 59).getTime();

  const { data: atividade } = useQuery({
    queryKey: ["alocacoes-atividade", vertical, startMs, endMs],
    queryFn: async (): Promise<Set<string>> => {
      // Set de chaves "obraId|YYYY-MM-DD" indicando que houve atividade compatível
      const set = new Set<string>();
      const toKey = (obraId: number, ts: number) => `${obraId}|${toIsoDate(new Date(ts))}`;
      if (vertical === "qualidade") {
        const { data, error } = await supabase
          .from("verificacoes")
          .select("obra_id, data_vistoria")
          .gte("data_vistoria", startMs)
          .lte("data_vistoria", endMs);
        if (error) throw error;
        (data || []).forEach((v: any) => set.add(toKey(v.obra_id, Number(v.data_vistoria))));
      } else {
        const { data, error } = await supabase
          .from("desvios")
          .select("obra_id, data_identificacao, origem")
          .eq("origem", vertical)
          .gte("data_identificacao", startMs)
          .lte("data_identificacao", endMs);
        if (error) throw error;
        (data || []).forEach((d: any) => set.add(toKey(d.obra_id, Number(d.data_identificacao))));
      }
      return set;
    },
  });

  // Calcula status efetivo: cancelado manual prevalece; senão, cumprido se houve atividade; senão, pendente.
  const effectiveStatus = (a: Alocacao): Status => {
    if (a.status === "cancelado") return "cancelado";
    if (atividade?.has(`${a.obra_id}|${a.data}`)) return "cumprido";
    return "pendente";
  };

  const filtered = useMemo(() => {
    return (alocacoes || []).filter(a =>
      (filterMembro === "all" || String(a.membro_id) === filterMembro) &&
      (filterObra === "all" || String(a.obra_id) === filterObra)
    );
  }, [alocacoes, filterMembro, filterObra]);

  const byDay = useMemo(() => {
    const m = new Map<string, Alocacao[]>();
    filtered.forEach(a => {
      const k = a.data;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    });
    return m;
  }, [filtered]);

  // KPIs do mês visível (apenas dias do mês de refDate)
  const monthOnly = useMemo(
    () => filtered.filter(a => new Date(a.data + "T12:00:00").getMonth() === refDate.getMonth()),
    [filtered, refDate]
  );
  const kpis = {
    total: monthOnly.length,
    pendentes: monthOnly.filter(a => effectiveStatus(a) === "pendente").length,
    cumpridos: monthOnly.filter(a => effectiveStatus(a) === "cumprido").length,
    cancelados: monthOnly.filter(a => effectiveStatus(a) === "cancelado").length,
  };

  const upsert = useMutation({
    mutationFn: async (input: Partial<Alocacao> & { id?: number }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("alocacoes").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("alocacoes").insert({
          membro_id: input.membro_id,
          obra_id: input.obra_id,
          vertical,
          data: input.data,
          status: input.status ?? "pendente",
          observacao: input.observacao ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alocacoes"] });
      setEditing(null);
      toast.success("Alocação salva");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("alocacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alocacoes"] });
      setEditing(null);
      toast.success("Alocação excluída");
    },
  });

  const today = toIsoDate(new Date());

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Alocação de Equipe
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Planeje as visitas da equipe às obras cobertas</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ _isNew: true, data: today, status: "pendente" })}>
          <Plus className="h-4 w-4 mr-1" /> Nova Alocação
        </Button>
      </div>

      {/* Switcher de vertical */}
      <div className="inline-flex rounded-lg border bg-card p-1 gap-1">
        {verticais.map(v => {
          const Icon = v.icon;
          const active = vertical === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => { setVertical(v.key); setFilterObra("all"); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Icon className="h-4 w-4" />
              {v.label}
            </button>
          );
        })}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-sky-600">{kpis.total}</div><div className="text-xs text-muted-foreground mt-1">Total</div></CardContent></Card>
        <Card className="border-amber-200"><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-amber-600">{kpis.pendentes}</div><div className="text-xs text-muted-foreground mt-1">Pendentes</div></CardContent></Card>
        <Card className="border-emerald-200"><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-emerald-600">{kpis.cumpridos}</div><div className="text-xs text-muted-foreground mt-1">Cumpridos</div></CardContent></Card>
        <Card className="border-red-200"><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-red-600">{kpis.cancelados}</div><div className="text-xs text-muted-foreground mt-1">Cancelados</div></CardContent></Card>
      </div>

      {/* Navegação + filtros */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setRefDate(addMonths(refDate, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="font-semibold text-lg min-w-[180px] text-center">{fmtMonth(refDate)}</div>
          <Button variant="outline" size="icon" onClick={() => setRefDate(addMonths(refDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setRefDate(startOfMonth(new Date()))}>Hoje</Button>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterMembro} onValueChange={setFilterMembro}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Todos os membros" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os membros</SelectItem>
              {(membros || []).map((m: any) => (<SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterObra} onValueChange={setFilterObra}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Todas as obras" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {obrasCobertas.map((o: any) => (<SelectItem key={o.id} value={String(o.id)}>{o.codigo} — {o.nome}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendário */}
      <Card>
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {WEEKDAYS.map(w => (<div key={w} className="p-2 text-center text-xs font-medium text-muted-foreground">{w}</div>))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d, i) => {
            const iso = toIsoDate(d);
            const inMonth = d.getMonth() === refDate.getMonth();
            const isToday = iso === today;
            const events = byDay.get(iso) || [];
            return (
              <div
                key={i}
                className={`min-h-[110px] border-r border-b p-1.5 ${inMonth ? "bg-background" : "bg-muted/20"} ${isToday ? "bg-primary/5" : ""}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("[data-event]")) return;
                  if (!inMonth) return;
                  setEditing({ _isNew: true, data: iso, status: "pendente" });
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${isToday ? "bg-primary text-primary-foreground rounded px-1.5" : inMonth ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {d.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {events.slice(0, 4).map(ev => {
                    const eff = effectiveStatus(ev);
                    const vSty = verticais.find(x => x.key === ev.vertical)!.styles;
                    const wrap = vSty[eff];
                    const meta = statusMeta[eff];
                    const Icon = meta.icon;
                    const membro = membroById.get(ev.membro_id);
                    const obra = obraById.get(ev.obra_id);
                    const obraLabel = obra ? `${obra.codigo} — ${obra.nome}` : "Obra ?";
                    const membroLabel = membro?.nome ?? "Membro ?";
                    return (
                      <Tooltip key={ev.id}>
                        <TooltipTrigger asChild>
                          <button
                            data-event
                            onClick={() => setEditing(ev)}
                            className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded border ${wrap} flex items-center gap-1 truncate hover:brightness-95`}
                          >
                            <Icon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{membroLabel} → {obra?.codigo ?? "?"}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1 text-xs">
                            <div className="font-semibold flex items-center gap-1.5">
                              <span className={`inline-block h-2 w-2 rounded-full ${verticais.find(x => x.key === ev.vertical)!.styles.dot}`} />
                              {verticais.find(x => x.key === ev.vertical)!.label} · {meta.label}
                            </div>
                            <div><span className="text-muted-foreground">Membro:</span> {membroLabel}</div>
                            <div><span className="text-muted-foreground">Obra:</span> {obraLabel}</div>
                            {obra?.cliente && <div><span className="text-muted-foreground">Cliente:</span> {obra.cliente}</div>}
                            <div><span className="text-muted-foreground">Data:</span> {new Date(ev.data + "T12:00:00").toLocaleDateString("pt-BR")}</div>
                            {ev.observacao && <div className="pt-1 border-t border-border/40"><span className="text-muted-foreground">Obs:</span> {ev.observacao}</div>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {events.length > 4 && (<div className="text-[10px] text-muted-foreground pl-1">+{events.length - 4}</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {editing?._isNew ? "Nova alocação" : "Editar alocação"}
              <Badge variant="outline" className="ml-auto">{verticalAtiva.label}</Badge>
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Membro *</Label>
                <Select value={editing.membro_id ? String(editing.membro_id) : ""} onValueChange={v => setEditing({ ...editing, membro_id: Number(v) })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o membro" /></SelectTrigger>
                  <SelectContent>
                    {(membros || []).map((m: any) => (<SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Obra *</Label>
                <Select value={editing.obra_id ? String(editing.obra_id) : ""} onValueChange={v => setEditing({ ...editing, obra_id: Number(v) })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                  <SelectContent>
                    {obrasCobertas.length === 0 && (<div className="px-2 py-3 text-xs text-muted-foreground">Nenhuma obra coberta em {verticalAtiva.label}</div>)}
                    {obrasCobertas.map((o: any) => (<SelectItem key={o.id} value={String(o.id)}>{o.codigo} — {o.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={editing.data ?? ""} onChange={e => setEditing({ ...editing, data: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status ?? "pendente"} onValueChange={v => setEditing({ ...editing, status: v as Status })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="cumprido">Cumprido</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Observação</Label>
                <div className="relative mt-1">
                  <Textarea
                    value={editing.observacao ?? ""}
                    onChange={e => setEditing({ ...editing, observacao: e.target.value })}
                    className="pr-12"
                    rows={3}
                  />
                  <div className="absolute top-2 right-2">
                    <VoiceRecorderButton
                      value={editing.observacao ?? ""}
                      onAppend={(novo) => setEditing({ ...editing, observacao: novo })}
                      contexto="observação sobre alocação de equipe em obra"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex sm:justify-between gap-2">
            <div>
              {editing && !editing._isNew && editing.id && (
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove.mutate(editing.id!)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button
                onClick={() => {
                  if (!editing?.membro_id || !editing?.obra_id || !editing?.data) {
                    toast.error("Preencha membro, obra e data"); return;
                  }
                  upsert.mutate(editing as any);
                }}
                disabled={upsert.isPending}
              >
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}