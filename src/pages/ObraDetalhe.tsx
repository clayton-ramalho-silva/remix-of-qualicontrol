import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, Plus, ChevronRight, Layers, Trash2, Pencil, Map as MapIcon, MoveRight } from "lucide-react";
import { toast } from "sonner";

export default function ObraDetalhe() {
  const [, params] = useRoute<{ obraId: string }>("/obras/:obraId");
  const [, navigate] = useLocation();
  const obraId = params?.obraId ? Number(params.obraId) : 0;

  const { data: obras } = trpc.obras.list.useQuery();
  const obra = obras?.find((o: any) => o.id === obraId);
  const { data: edificios, isLoading: loadingEd, refetch: refetchEd } = trpc.edificios.listByObra.useQuery({ obraId }, { enabled: obraId > 0 });
  const { data: avulsas, refetch: refetchAv } = trpc.plantas.semHierarquia.useQuery({ obraId }, { enabled: obraId > 0 });

  const createEdificio = trpc.edificios.create.useMutation({
    onSuccess: () => { refetchEd(); toast.success("Edifício criado"); },
  });
  const updateEdificio = trpc.edificios.update.useMutation({ onSuccess: () => refetchEd() });
  const deleteEdificio = trpc.edificios.delete.useMutation({
    onSuccess: () => { refetchEd(); refetchAv(); toast.success("Edifício removido"); },
  });
  const createAndar = trpc.andares.create.useMutation({ onSuccess: () => { refetchEd(); toast.success("Andar criado"); } });
  const updateAndar = trpc.andares.update.useMutation({ onSuccess: () => refetchEd() });
  const deleteAndar = trpc.andares.delete.useMutation({ onSuccess: () => { refetchEd(); refetchAv(); toast.success("Andar removido"); } });
  const moverPlanta = trpc.plantas.mover.useMutation({
    onSuccess: () => { refetchEd(); refetchAv(); toast.success("Planta movida"); },
  });

  // Edifício dialog
  const [edDialog, setEdDialog] = useState<{ id?: number; nome: string; codigo: string } | null>(null);
  // Andar dialog
  const [anDialog, setAnDialog] = useState<{ id?: number; edificioId: number; nome: string; numero: string } | null>(null);
  // Mover planta
  const [moverDialog, setMoverDialog] = useState<{ plantaId: number; nome: string; andarId?: number } | null>(null);

  const handleQuickEdificio = () => {
    createEdificio.mutate({ obraId, nome: "Principal", ordem: 0 });
  };

  if (!obra && obras) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Obra não encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/obras")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/obras")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Obras
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> {obra?.nome || "..."}
          </h1>
          <p className="text-xs text-muted-foreground">{obra?.codigo} · {obra?.cliente || "—"}</p>
        </div>
      </div>

      <Tabs defaultValue="estrutura">
        <TabsList>
          <TabsTrigger value="estrutura">Estrutura</TabsTrigger>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
        </TabsList>

        <TabsContent value="estrutura" className="space-y-4 mt-4">
          {/* Edifícios */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> Edifícios
                </h2>
                <div className="flex gap-2">
                  {(!edificios || edificios.length === 0) && (
                    <Button size="sm" variant="outline" onClick={handleQuickEdificio}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Criar "Principal"
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setEdDialog({ nome: "", codigo: "" })}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Novo Edifício
                  </Button>
                </div>
              </div>

              {loadingEd ? (
                <Skeleton className="h-24" />
              ) : !edificios || edificios.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Nenhum edifício cadastrado. Crie "Principal" em 1 clique para obras simples.
                </p>
              ) : (
                <div className="space-y-3">
                  {edificios.map((ed: any) => (
                    <div key={ed.id} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-sm truncate">{ed.nome}</span>
                          {ed.codigo && <Badge variant="outline" className="text-[10px]">{ed.codigo}</Badge>}
                          <Badge variant="secondary" className="text-[10px]">{ed.andares.length} andar(es)</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={() => setAnDialog({ edificioId: ed.id, nome: "", numero: "" })}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Andar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => setEdDialog({ id: ed.id, nome: ed.nome, codigo: ed.codigo || "" })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                            onClick={() => {
                              if (confirm(`Remover edifício "${ed.nome}"? Andares serão removidos junto.`)) {
                                deleteEdificio.mutate({ id: ed.id });
                              }
                            }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {ed.andares.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">Nenhum andar. Use "+ Andar" para criar.</p>
                      ) : (
                        <div className="divide-y">
                          {ed.andares.map((an: any) => (
                            <div key={an.id} className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors">
                              <button
                                className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                onClick={() => navigate(`/obras/${obraId}/edificios/${ed.id}/andares/${an.id}`)}
                              >
                                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm truncate">{an.nome}</span>
                                <Badge variant="outline" className="text-[10px]">{an.plantasCount} planta(s)</Badge>
                                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                              </button>
                              <div className="flex items-center gap-1 ml-2">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                  onClick={() => setAnDialog({ id: an.id, edificioId: ed.id, nome: an.nome, numero: String(an.numero || 0) })}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                                  onClick={() => {
                                    if (confirm(`Remover andar "${an.nome}"?`)) deleteAndar.mutate({ id: an.id });
                                  }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plantas sem hierarquia */}
          {avulsas && avulsas.length > 0 && (
            <Card className="border-amber-200/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <MapIcon className="h-4 w-4 text-amber-600" /> Plantas sem hierarquia ({avulsas.length})
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">Plantas legadas ainda não vinculadas a um andar.</p>
                <div className="space-y-1.5">
                  {avulsas.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded border bg-card">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={p.url} alt={p.nome} className="h-8 w-10 object-cover rounded" />
                        <span className="text-sm truncate">{p.nome}</span>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => setMoverDialog({ plantaId: p.id, nome: p.nome })}>
                        <MoveRight className="h-3.5 w-3.5 mr-1" /> Mover p/ andar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="p-6 grid sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Status</p><p className="font-medium capitalize">{obra?.status}</p></div>
              <div><p className="text-muted-foreground text-xs">Endereço</p><p className="font-medium">{obra?.endereco || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-medium">{obra?.cliente || "—"}</p></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edifício Dialog */}
      <Dialog open={!!edDialog} onOpenChange={(o) => !o && setEdDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{edDialog?.id ? "Editar Edifício" : "Novo Edifício"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input value={edDialog?.nome || ""} onChange={(e) => setEdDialog(d => d ? { ...d, nome: e.target.value } : d)}
                placeholder="Ex: Torre A, Bloco Norte, Principal" />
            </div>
            <div>
              <Label className="text-xs">Código (opcional)</Label>
              <Input value={edDialog?.codigo || ""} onChange={(e) => setEdDialog(d => d ? { ...d, codigo: e.target.value } : d)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdDialog(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (!edDialog?.nome) { toast.error("Nome obrigatório"); return; }
              if (edDialog.id) {
                updateEdificio.mutate({ id: edDialog.id, nome: edDialog.nome, codigo: edDialog.codigo || null });
              } else {
                createEdificio.mutate({ obraId, nome: edDialog.nome, codigo: edDialog.codigo || undefined });
              }
              setEdDialog(null);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Andar Dialog */}
      <Dialog open={!!anDialog} onOpenChange={(o) => !o && setAnDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{anDialog?.id ? "Editar Andar" : "Novo Andar"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input value={anDialog?.nome || ""} onChange={(e) => setAnDialog(d => d ? { ...d, nome: e.target.value } : d)}
                placeholder="Ex: Térreo, 1º Andar, Cobertura, Subsolo" />
            </div>
            <div>
              <Label className="text-xs">Número (para ordenação)</Label>
              <Input type="number" value={anDialog?.numero || ""} onChange={(e) => setAnDialog(d => d ? { ...d, numero: e.target.value } : d)}
                placeholder="0=Térreo, -1=Subsolo, 1, 2, 3..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAnDialog(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (!anDialog?.nome) { toast.error("Nome obrigatório"); return; }
              const numero = Number(anDialog.numero) || 0;
              if (anDialog.id) {
                updateAndar.mutate({ id: anDialog.id, nome: anDialog.nome, numero });
              } else {
                createAndar.mutate({ edificioId: anDialog.edificioId, nome: anDialog.nome, numero });
              }
              setAnDialog(null);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mover Planta */}
      <Dialog open={!!moverDialog} onOpenChange={(o) => !o && setMoverDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mover "{moverDialog?.nome}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Selecione o andar de destino</Label>
            <Select value={moverDialog?.andarId ? String(moverDialog.andarId) : ""}
              onValueChange={(v) => setMoverDialog(d => d ? { ...d, andarId: Number(v) } : d)}>
              <SelectTrigger><SelectValue placeholder="Andar..." /></SelectTrigger>
              <SelectContent>
                {(edificios || []).flatMap((ed: any) =>
                  ed.andares.map((an: any) => (
                    <SelectItem key={an.id} value={String(an.id)}>{ed.nome} › {an.nome}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoverDialog(null)}>Cancelar</Button>
            <Button disabled={!moverDialog?.andarId} onClick={() => {
              if (!moverDialog?.andarId) return;
              moverPlanta.mutate({ id: moverDialog.plantaId, andarId: moverDialog.andarId });
              setMoverDialog(null);
            }}>Mover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}