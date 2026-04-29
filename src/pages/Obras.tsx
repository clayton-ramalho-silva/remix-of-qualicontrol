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
import { Building2, Search, Plus, Pencil, ArrowRight, ArrowLeft, Calendar, Loader2 } from "lucide-react";
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
};

export default function Obras() {
  const qc = useQueryClient();

  const { data: obrasWithDesvio, isLoading } = useQuery({
    queryKey: ["obras", "with-ultimo-desvio"],
    queryFn: async (): Promise<Obra[]> => {
      const { data: obras, error } = await supabase.from("obras").select("*").order("codigo");
      if (error) throw error;
      const { data: desvios } = await supabase.from("desvios").select("obra_id, data_identificacao");
      const lastByObra = new Map<number, number>();
      (desvios || []).forEach((d: any) => {
        const cur = lastByObra.get(d.obra_id) ?? 0;
        if (d.data_identificacao > cur) lastByObra.set(d.obra_id, d.data_identificacao);
      });
      return (obras || []).map((o: any) => ({ ...o, ultimoDesvio: lastByObra.get(o.id) ?? null }));
    },
  });

  const updateObra = useMutation({
    mutationFn: async (input: { id: number } & Partial<Omit<Obra, "ultimoDesvio">>) => {
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

  const { gerais, cobertas } = useMemo(() => {
    if (!obrasWithDesvio) return { gerais: [] as Obra[], cobertas: [] as Obra[] };
    const term = searchTerm.toLowerCase();
    const filtered = obrasWithDesvio.filter((o) =>
      !term || o.nome.toLowerCase().includes(term) || o.codigo.toLowerCase().includes(term)
    );
    return {
      gerais: filtered.filter((o) => o.cobertura === 0),
      cobertas: filtered.filter((o) => o.cobertura === 1),
    };
  }, [obrasWithDesvio, searchTerm]);

  const handleMoveToCobertas = (id: number) => { updateObra.mutate({ id, cobertura: 1 }); toast.success("Obra movida para Cobertas"); };
  const handleMoveToGerais = (id: number) => { updateObra.mutate({ id, cobertura: 0 }); toast.success("Obra movida para Gerais"); };

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

  const ObraCard = ({ obra, side }: { obra: Obra; side: "gerais" | "cobertas" }) => (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{obra.codigo}</span>
          <Badge variant={obra.status === "ativa" ? "default" : obra.status === "pausada" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
            {obra.status === "ativa" ? "Ativa" : obra.status === "pausada" ? "Pausada" : "Concluída"}
          </Badge>
        </div>
        <p className="font-medium text-sm truncate mt-0.5">{obra.nome}</p>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Último desvio: {formatDate(obra.ultimoDesvio)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditObra({ ...obra }); setShowEdit(true); }}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {side === "gerais" ? (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleMoveToCobertas(obra.id)} title="Mover para Cobertas">
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => handleMoveToGerais(obra.id)} title="Mover para Gerais">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
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
          <p className="text-muted-foreground text-sm mt-1">Gerencie a cobertura das obras — mova entre Gerais e Cobertas</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Obra
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar obras..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-orange-200 dark:border-orange-900">
          <div className="p-4 border-b bg-orange-50 dark:bg-orange-950/30 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-600" />
                <h2 className="font-semibold text-lg">Obras Gerais</h2>
              </div>
              <Badge variant="secondary" className="text-sm">{gerais.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Obras disponíveis no portfólio</p>
          </div>
          <CardContent className="p-3 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
            {gerais.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">{searchTerm ? "Nenhuma obra encontrada" : "Todas as obras estão cobertas"}</p>
            ) : gerais.map((o) => <ObraCard key={o.id} obra={o} side="gerais" />)}
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-900">
          <div className="p-4 border-b bg-emerald-50 dark:bg-emerald-950/30 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold text-lg">Obras Cobertas</h2>
              </div>
              <Badge variant="secondary" className="text-sm">{cobertas.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Obras que estamos atendendo</p>
          </div>
          <CardContent className="p-3 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
            {cobertas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">{searchTerm ? "Nenhuma obra encontrada" : "Nenhuma obra coberta ainda. Mova obras da coluna Gerais."}</p>
            ) : cobertas.map((o) => <ObraCard key={o.id} obra={o} side="cobertas" />)}
          </CardContent>
        </Card>
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
