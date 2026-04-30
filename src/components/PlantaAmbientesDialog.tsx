import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Sparkles, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";

type Props = {
  plantaId: number | null;
  plantaNome?: string;
  plantaUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function PlantaAmbientesDialog({ plantaId, plantaNome, plantaUrl, open, onOpenChange }: Props) {
  const utils = trpc.useUtils();
  const { data: ambientes, isLoading, refetch } = trpc.plantaAmbientes.listByPlanta.useQuery(
    { plantaId: plantaId! },
    { enabled: !!plantaId && open, refetchInterval: open ? 4000 : false }
  );

  const reextract = trpc.plantaAmbientes.reextract.useMutation();
  const createAmb = trpc.plantaAmbientes.create.useMutation();
  const updateAmb = trpc.plantaAmbientes.update.useMutation();
  const deleteAmb = trpc.plantaAmbientes.delete.useMutation();
  const markAll = trpc.plantaAmbientes.markAllReviewed.useMutation();

  const [novoNome, setNovoNome] = useState("");
  const [novoPav, setNovoPav] = useState("");
  const [novoNum, setNovoNum] = useState("");

  const handleAdd = async () => {
    if (!novoNome.trim() || !plantaId) return;
    await createAmb.mutateAsync({
      plantaId,
      nome: novoNome.trim(),
      pavimento: novoPav.trim(),
      numero: novoNum.trim(),
    });
    setNovoNome(""); setNovoPav(""); setNovoNum("");
    toast.success("Ambiente adicionado");
    refetch();
  };

  const handleReextract = async () => {
    if (!plantaId) return;
    try {
      toast.loading("Detectando ambientes…", { id: "reext" });
      await reextract.mutateAsync({ plantaId });
      toast.success("Detecção concluída", { id: "reext" });
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Falha na detecção", { id: "reext" });
    }
  };

  const handleConfirm = async () => {
    if (!plantaId) return;
    await markAll.mutateAsync({ plantaId });
    toast.success("Ambientes confirmados");
    onOpenChange(false);
  };

  const list = ambientes || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            Ambientes detectados — {plantaNome}
          </DialogTitle>
          <DialogDescription>
            Revise os ambientes identificados pela IA. Edite, exclua ou adicione manualmente. Os ambientes confirmados aparecerão como sugestão ao registrar desvios.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 flex-1 overflow-hidden">
          {/* Preview da planta */}
          {plantaUrl && (
            <div className="hidden md:flex bg-slate-50 rounded-lg overflow-hidden border items-center justify-center p-2">
              <img src={plantaUrl} alt={plantaNome} className="max-w-full max-h-full object-contain" />
            </div>
          )}

          {/* Lista */}
          <div className="flex flex-col overflow-hidden min-w-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-sm font-medium whitespace-nowrap">
                {list.length} ambiente{list.length === 1 ? "" : "s"}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReextract}
                disabled={reextract.isPending}
                className="whitespace-nowrap"
              >
                {reextract.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Detectar novamente
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
              ) : list.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Nenhum ambiente detectado ainda.
                  <br />
                  Clique em "Detectar novamente" ou adicione manualmente abaixo.
                </div>
              ) : (
                list.map((a: any) => (
                  <AmbienteRow
                    key={a.id}
                    ambiente={a}
                    onUpdate={(patch) => updateAmb.mutateAsync({ id: a.id, ...patch }).then(() => refetch())}
                    onDelete={() => deleteAmb.mutateAsync({ id: a.id }).then(() => refetch())}
                  />
                ))
              )}
            </div>

            {/* Adicionar manual */}
            <div className="border-t pt-3 mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Adicionar manualmente</p>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Nome do ambiente</label>
                  <Input
                    placeholder="ex: Sala de Reunião, Copa, Apto 301"
                    value={novoNome}
                    onChange={e => setNovoNome(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Pavimento</label>
                    <Input
                      placeholder="ex: Térreo"
                      value={novoPav}
                      onChange={e => setNovoPav(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Número</label>
                    <Input
                      placeholder="ex: 301"
                      value={novoNum}
                      onChange={e => setNovoNum(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={!novoNome.trim() || createAmb.isPending}
                    className="h-9"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleConfirm} disabled={markAll.isPending || list.length === 0}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Confirmar todos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AmbienteRow({ ambiente, onUpdate, onDelete }: any) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(ambiente.nome);
  const [pav, setPav] = useState(ambiente.pavimento || "");
  const [num, setNum] = useState(ambiente.numero || "");

  const save = async () => {
    await onUpdate({ nome, pavimento: pav, numero: num, revisado: 1 });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2 p-2 border rounded-lg bg-amber-50/40">
        <Input value={nome} onChange={e => setNome(e.target.value)} className="h-8 text-sm" />
        <Input value={pav} onChange={e => setPav(e.target.value)} className="h-8 text-sm" placeholder="Pavto" />
        <Input value={num} onChange={e => setNum(e.target.value)} className="h-8 text-sm" placeholder="Nº" />
        <Button size="sm" className="h-8 px-2" onClick={save}>OK</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-slate-50 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{ambiente.nome}</span>
          {ambiente.numero && <Badge variant="outline" className="text-[10px] h-5">#{ambiente.numero}</Badge>}
          {ambiente.pavimento && <span className="text-xs text-muted-foreground">{ambiente.pavimento}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {ambiente.origem === "ia" ? "🤖 IA" : "✍️ Manual"}
          </span>
          {ambiente.revisado === 1 && (
            <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" /> revisado
            </span>
          )}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}