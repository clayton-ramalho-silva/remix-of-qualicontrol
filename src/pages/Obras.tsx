import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search, Plus, Pencil, Calendar, Loader2, ArrowLeftRight, Bookmark, BookmarkCheck, BookmarkX, ShieldCheck, ListChecks, HardHat, Layers } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Vertical = "qualidade" | "checklist" | "qsms";

const verticais: { key: Vertical; label: string; icon: any; coverCol: "cobertura_qualidade" | "cobertura_checklist" | "cobertura_qsms"; color: string }[] = [
  { key: "qualidade", label: "Qualidade", icon: ShieldCheck, coverCol: "cobertura_qualidade", color: "text-sky-600" },
  { key: "checklist", label: "Checklist", icon: ListChecks, coverCol: "cobertura_checklist", color: "text-amber-600" },
  { key: "qsms",      label: "QSMS",      icon: HardHat,    coverCol: "cobertura_qsms",      color: "text-emerald-600" },
];

type Obra = {
  id: number;
  codigo: string;
  nome: string;
  cliente: string | null;
  endereco: string | null;
  status: "ativa" | "pausada" | "concluida";
  cobertura: number;
  cobertura_qualidade: number;
  cobertura_checklist: number;
  cobertura_qsms: number;
  marcacao: "na_fila" | "descartada" | null;
  ultimoDesvio?: number | null;
  ultimaVistoria?: number | null;
  classificacao?: string | null;
  scoreGeral?: number | null;
};

type ObraEditable = Pick<Obra, "codigo" | "nome" | "cliente" | "endereco" | "status" | "cobertura" | "marcacao">;

const classificacaoClasses: Record<string, string> = {
  "ÓTIMA": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "EXCELENTE": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "BOM": "border-sky-200 bg-sky-50 text-sky-700",
  "REGULAR": "border-amber-200 bg-amber-50 text-amber-700",
  "RUIM": "border-red-200 bg-red-50 text-red-700",
  "CRÍTICO": "border-red-300 bg-red-100 text-red-900",
  "CRITICO": "border-red-300 bg-red-100 text-red-900",
};

const statusLabel: Record<Obra["status"], string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  concluida: "Concluída",
};

const getClassificacaoClassName = (classificacao?: string | null) => {
  if (!classificacao) return "border-border bg-muted text-muted-foreground";
  return classificacaoClasses[classificacao.trim().toUpperCase()] || "border-border bg-muted text-muted-foreground";
};

export default function Obras() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const { data: obrasResumo, isLoading } = useQuery({
    queryKey: ["obras", "with-resumo"],
    queryFn: async (): Promise<Obra[]> => {
      const [obrasResult, desviosResult, verificacoesResult] = await Promise.all([
        supabase.from("obras").select("*").order("codigo"),
        supabase.from("desvios").select("obra_id, data_identificacao"),
        supabase
          .from("verificacoes")
          .select("obra_id, data_vistoria, status_geral, score_geral")
          .order("data_vistoria", { ascending: false }),
      ]);

      if (obrasResult.error) throw obrasResult.error;
      if (desviosResult.error) throw desviosResult.error;
      if (verificacoesResult.error) throw verificacoesResult.error;

      const lastByObra = new Map<number, number>();
      (desviosResult.data || []).forEach((d: any) => {
        const cur = lastByObra.get(d.obra_id) ?? 0;
        const dataIdentificacao = Number(d.data_identificacao);
        if (dataIdentificacao > cur) lastByObra.set(d.obra_id, dataIdentificacao);
      });

      const ultimaVerificacaoByObra = new Map<number, { data_vistoria: number | null; status_geral: string | null; score_geral: number | null }>();
      (verificacoesResult.data || []).forEach((v: any) => {
        if (!ultimaVerificacaoByObra.has(v.obra_id)) {
          ultimaVerificacaoByObra.set(v.obra_id, {
            data_vistoria: v.data_vistoria ? Number(v.data_vistoria) : null,
            status_geral: v.status_geral,
            score_geral: v.score_geral,
          });
        }
      });

      return (obrasResult.data || []).map((o: any) => {
        const ultimaVerificacao = ultimaVerificacaoByObra.get(o.id);
        return {
          ...o,
          marcacao: o.marcacao ?? null,
          ultimoDesvio: lastByObra.get(o.id) ?? null,
          ultimaVistoria: ultimaVerificacao?.data_vistoria ?? null,
          classificacao: ultimaVerificacao?.status_geral ?? null,
          scoreGeral: ultimaVerificacao?.score_geral ?? null,
        };
      });
    },
  });

  const updateObra = useMutation({
    mutationFn: async (input: { id: number } & Partial<ObraEditable>) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("obras").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["obras"] }),
    onError: (e: any) => toast.error(e.message || "Erro ao actualizar obra"),
  });

  const createObra = useMutation({
    mutationFn: async (input: { codigo: string; nome: string; cliente?: string; endereco?: string }) => {
      const { error } = await supabase.from("obras").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["obras"] });
      toast.success("Obra criada com sucesso");
      setShowCreate(false);
      setNewObra({ codigo: "", nome: "", cliente: "", endereco: "" });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar obra"),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editObra, setEditObra] = useState<any>(null);
  const [newObra, setNewObra] = useState({ codigo: "", nome: "", cliente: "", endereco: "" });
  const [filtroGerais, setFiltroGerais] = useState<"todas" | "na_fila" | "sem" | "descartada">("todas");
  const [vertical, setVertical] = useState<Vertical>("qualidade");
  const verticalAtiva = verticais.find((v) => v.key === vertical)!;
  const coverFor = (o: Obra) => Number((o as any)[verticalAtiva.coverCol] ?? 0);

  const obrasFiltradasBase = useMemo(() => {
    if (!obrasResumo) return [] as Obra[];
    const term = searchTerm.toLowerCase();
    return obrasResumo.filter((o) =>
      !term ||
      o.nome.toLowerCase().includes(term) ||
      o.codigo.toLowerCase().includes(term) ||
      (o.cliente || "").toLowerCase().includes(term) ||
      (o.classificacao || "sem classificação").toLowerCase().includes(term)
    );
  }, [obrasResumo, searchTerm]);

  const gerais = useMemo(() => obrasFiltradasBase.filter((o) => !coverFor(o)), [obrasFiltradasBase, vertical]);
  const cobertas = useMemo(() => obrasFiltradasBase.filter((o) => !!coverFor(o)), [obrasFiltradasBase, vertical]);

  const counts = useMemo(() => ({
    todas: gerais.length,
    na_fila: gerais.filter((o) => o.marcacao === "na_fila").length,
    sem: gerais.filter((o) => !o.marcacao).length,
    descartada: gerais.filter((o) => o.marcacao === "descartada").length,
  }), [gerais]);

  const geraisFiltradas = useMemo(() => {
    if (filtroGerais === "todas") return gerais;
    if (filtroGerais === "sem") return gerais.filter((o) => !o.marcacao);
    return gerais.filter((o) => o.marcacao === filtroGerais);
  }, [gerais, filtroGerais]);

  const toggleCobertura = (obra: Obra) => {
    const atual = coverFor(obra);
    const next = atual ? 0 : 1;
    updateObra.mutate(
      { id: obra.id, [verticalAtiva.coverCol]: next } as any,
      {
        onSuccess: () => toast.success(`${atual ? "Removida de" : "Adicionada às"} Cobertas — ${verticalAtiva.label}`),
      }
    );
  };

  const setMarcacao = (obra: Obra, marcacao: Obra["marcacao"]) => {
    const next = obra.marcacao === marcacao ? null : marcacao;
    updateObra.mutate({ id: obra.id, marcacao: next });
  };

  const handleCreate = () => {
    if (!newObra.codigo || !newObra.nome) { toast.error("Preencha código e nome"); return; }
    createObra.mutate({
      codigo: newObra.codigo,
      nome: newObra.nome,
      cliente: newObra.cliente || undefined,
      endereco: newObra.endereco || undefined,
    });
  };

  const handleEdit = () => {
    if (!editObra) return;
    updateObra.mutate({
      id: editObra.id,
      codigo: editObra.codigo,
      nome: editObra.nome,
      cliente: editObra.cliente || null,
      endereco: editObra.endereco || null,
      status: editObra.status,
    });
    setShowEdit(false);
    toast.success("Obra atualizada");
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const markStyles = {
    na_fila: { wrap: "border-amber-300 bg-amber-50/60", icon: "text-amber-600" },
    descartada: { wrap: "border-red-200 bg-red-50/40 opacity-70", icon: "text-red-600" },
    none: { wrap: "border-border bg-card", icon: "text-muted-foreground" },
  } as const;

  const ObraCard = ({ obra, side }: { obra: Obra; side: "gerais" | "cobertas" }) => {
    const mk = obra.marcacao === "na_fila" ? markStyles.na_fila : obra.marcacao === "descartada" ? markStyles.descartada : markStyles.none;
    return (
      <div className={`group relative flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-accent/20 ${mk.wrap}`}>
        <div className="flex items-start gap-2">
          {side === "gerais" && (
            <button
              type="button"
              onClick={() => setMarcacao(obra, obra.marcacao === "descartada" ? "descartada" : "na_fila")}
              className={`mt-0.5 ${mk.icon}`}
              title="Alternar marcação"
            >
              {obra.marcacao === "na_fila" ? <BookmarkCheck className="h-4 w-4" /> : obra.marcacao === "descartada" ? <BookmarkX className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{obra.codigo}</span>
              <Badge variant={obra.status === "ativa" ? "default" : obra.status === "pausada" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                {statusLabel[obra.status]}
              </Badge>
              <Badge variant="outline" className={getClassificacaoClassName(obra.classificacao)}>
                {obra.classificacao || "Sem classificação"}
              </Badge>
              {side === "gerais" && obra.marcacao === "na_fila" && (
                <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0">Na fila</Badge>
              )}
              {side === "gerais" && obra.marcacao === "descartada" && (
                <Badge variant="outline" className="border-red-300 bg-red-100 text-red-800 text-[10px] px-1.5 py-0">Descartada</Badge>
              )}
            </div>
            <p className={`mt-1 truncate font-medium text-sm ${obra.marcacao === "descartada" ? "line-through" : ""}`}>{obra.nome}</p>
            {obra.cliente ? <p className="truncate text-xs text-muted-foreground">{obra.cliente}</p> : null}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Última inspeção: {formatDate(obra.ultimaVistoria)}</span>
              <span>Último desvio: {formatDate(obra.ultimoDesvio)}</span>
              <span>Score: {obra.scoreGeral != null ? `${obra.scoreGeral}%` : "—"}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edifícios e plantas"
              onClick={() => navigate(`/obras/${obra.id}`)}>
              <Layers className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title={side === "gerais" ? `Cobrir em ${verticalAtiva.label}` : `Remover de ${verticalAtiva.label}`} onClick={() => toggleCobertura(obra)}>
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditObra({ ...obra }); setShowEdit(true); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {side === "gerais" && (
          <div className="flex items-center gap-1 pl-6">
            <Button size="sm" variant={obra.marcacao === "na_fila" ? "default" : "ghost"} className="h-6 px-2 text-[10px]" onClick={() => setMarcacao(obra, "na_fila")}>Na fila</Button>
            <Button size="sm" variant={obra.marcacao === "descartada" ? "destructive" : "ghost"} className="h-6 px-2 text-[10px]" onClick={() => setMarcacao(obra, "descartada")}>Descartar</Button>
            {obra.marcacao && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-muted-foreground" onClick={() => setMarcacao(obra, obra.marcacao)}>Limpar</Button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-48" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-96 bg-muted rounded animate-pulse" />
          <div className="h-96 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Obras
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Cobertura por vertical — cada equipe escolhe quais obras cobre</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Obra
        </Button>
      </div>

      <div className="inline-flex rounded-lg border bg-card p-1 gap-1">
        {verticais.map((v) => {
          const Icon = v.icon;
          const active = vertical === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => setVertical(v.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Icon className={`h-4 w-4 ${active ? "" : v.color}`} />
              {v.label}
            </button>
          );
        })}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar obras..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-amber-200/60">
          <div className="border-b border-amber-200/60 bg-amber-50/60 p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-600" />
                <h2 className="font-semibold text-lg">Obras Gerais — {verticalAtiva.label}</h2>
              </div>
              <Badge variant="secondary" className="text-sm">{gerais.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Obras ainda não cobertas pela equipe de {verticalAtiva.label}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {([
                { k: "todas", label: "Todas", count: counts.todas },
                { k: "na_fila", label: "Na fila", count: counts.na_fila },
                { k: "sem", label: "Sem marcação", count: counts.sem },
                { k: "descartada", label: "Descartadas", count: counts.descartada },
              ] as const).map((t) => (
                <Button
                  key={t.k}
                  size="sm"
                  variant={filtroGerais === t.k ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs rounded-full"
                  onClick={() => setFiltroGerais(t.k)}
                >
                  {t.label} <span className="ml-1 opacity-70">({t.count})</span>
                </Button>
              ))}
            </div>
          </div>
          <CardContent className="p-3 space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
            {geraisFiltradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma obra encontrada</p>
            ) : geraisFiltradas.map((o) => <ObraCard key={o.id} obra={o} side="gerais" />)}
          </CardContent>
        </Card>

        <Card className="border-emerald-200/60">
          <div className="border-b border-emerald-200/60 bg-emerald-50/60 p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold text-lg">Obras Cobertas — {verticalAtiva.label}</h2>
              </div>
              <Badge variant="secondary" className="text-sm">{cobertas.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Obras que a equipe de {verticalAtiva.label} está atendendo</p>
          </div>
          <CardContent className="p-3 space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
            {cobertas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma obra coberta</p>
            ) : cobertas.map((o) => <ObraCard key={o.id} obra={o} side="cobertas" />)}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Legenda:</span>
        <span className="flex items-center gap-1"><Bookmark className="h-3.5 w-3.5" /> Sem marcação</span>
        <span className="flex items-center gap-1"><BookmarkCheck className="h-3.5 w-3.5 text-amber-600" /> Na fila</span>
        <span className="flex items-center gap-1"><BookmarkX className="h-3.5 w-3.5 text-red-600" /> Descartada</span>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Obra</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código *</Label><Input value={newObra.codigo} onChange={e => setNewObra({ ...newObra, codigo: e.target.value })} placeholder="Ex: 4707/25" className="mt-1" /></div>
              <div><Label>Nome *</Label><Input value={newObra.nome} onChange={e => setNewObra({ ...newObra, nome: e.target.value })} placeholder="Ex: Frec Funchal 641" className="mt-1" /></div>
            </div>
            <div><Label>Cliente</Label><Input value={newObra.cliente} onChange={e => setNewObra({ ...newObra, cliente: e.target.value })} className="mt-1" /></div>
            <div><Label>Endereço</Label><Input value={newObra.endereco} onChange={e => setNewObra({ ...newObra, endereco: e.target.value })} className="mt-1" /></div>
            <Button className="w-full" disabled={!newObra.codigo || !newObra.nome || createObra.isPending} onClick={handleCreate}>
              {createObra.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Obra
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Obra</DialogTitle></DialogHeader>
          {editObra && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Código</Label><Input value={editObra.codigo} onChange={e => setEditObra({ ...editObra, codigo: e.target.value })} className="mt-1" /></div>
                <div><Label>Nome</Label><Input value={editObra.nome} onChange={e => setEditObra({ ...editObra, nome: e.target.value })} className="mt-1" /></div>
              </div>
              <div><Label>Cliente</Label><Input value={editObra.cliente || ""} onChange={e => setEditObra({ ...editObra, cliente: e.target.value })} className="mt-1" /></div>
              <div><Label>Endereço</Label><Input value={editObra.endereco || ""} onChange={e => setEditObra({ ...editObra, endereco: e.target.value })} className="mt-1" /></div>
              <div>
                <Label>Status</Label>
                <Select value={editObra.status} onValueChange={v => setEditObra({ ...editObra, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={updateObra.isPending} onClick={handleEdit}>
                {updateObra.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
