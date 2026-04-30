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
import { Building2, Search, Plus, Pencil, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Obra = {
  id: number;
  codigo: string;
  nome: string;
  cliente: string | null;
  endereco: string | null;
  status: "ativa" | "pausada" | "concluida";
  cobertura: number;
  ultimoDesvio?: number | null;
  ultimaVistoria?: number | null;
  classificacao?: string | null;
  scoreGeral?: number | null;
};

type ObraEditable = Pick<Obra, "codigo" | "nome" | "cliente" | "endereco" | "status" | "cobertura">;

const classificacaoClasses: Record<string, string> = {
  "ÓTIMA": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "EXCELENTE": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "BOM": "border-sky-200 bg-sky-50 text-sky-700",
  "REGULAR": "border-amber-200 bg-amber-50 text-amber-700",
  "RUIM": "border-orange-200 bg-orange-50 text-orange-700",
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

  const obrasFiltradas = useMemo(() => {
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

  const ObraCard = ({ obra }: { obra: Obra }) => (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{obra.codigo}</span>
          <Badge variant={obra.status === "ativa" ? "default" : obra.status === "pausada" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
            {statusLabel[obra.status]}
          </Badge>
          <Badge variant="outline" className={getClassificacaoClassName(obra.classificacao)}>
            {obra.classificacao || "Sem classificação"}
          </Badge>
        </div>

        <div className="min-w-0">
          <p className="truncate font-medium text-sm sm:text-base">{obra.nome}</p>
          {obra.cliente ? <p className="truncate text-xs text-muted-foreground sm:text-sm">{obra.cliente}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Última inspeção: {formatDate(obra.ultimaVistoria)}
          </span>
          <span>Último desvio: {formatDate(obra.ultimoDesvio)}</span>
          <span>Score geral: {obra.scoreGeral != null ? `${obra.scoreGeral}%` : "—"}</span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditObra({ ...obra }); setShowEdit(true); }}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

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
          <p className="text-muted-foreground text-sm mt-1">Visualize as obras com a classificação da última inspeção</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Obra
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar obras..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="font-semibold text-lg">Lista de Obras</h2>
            <p className="text-xs text-muted-foreground mt-1">Cada obra exibe a classificação mais recente registrada</p>
          </div>
          <Badge variant="secondary" className="text-sm">{obrasFiltradas.length}</Badge>
        </div>
        <CardContent className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
          {obrasFiltradas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma obra encontrada</p>
          ) : obrasFiltradas.map((o) => <ObraCard key={o.id} obra={o} />)}
        </CardContent>
      </Card>

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
