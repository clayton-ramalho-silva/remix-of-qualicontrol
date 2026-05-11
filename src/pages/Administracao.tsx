import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Settings, Scale, Layers, Palette, Info, Save, Plus, Edit2,
  CheckCircle2, XCircle, AlertTriangle, MinusCircle, Tag, Trash2
} from "lucide-react";

export default function Administracao() {
  const utils = trpc.useUtils();
  const [categoria, setCategoria] = useState<string>("qualidade");
  const { data: checklist, isLoading: loadingChecklist } = trpc.checklist.getCompleto.useQuery({ categoria });
  const { data: faixas, isLoading: loadingFaixas } = trpc.configFaixas.list.useQuery({ categoria });

  const updateSecao = trpc.checklist.updateSecao.useMutation({
    onSuccess: () => { utils.checklist.getCompleto.invalidate(); toast.success("Seção atualizada!"); },
  });
  const updateItem = trpc.checklist.updateItem.useMutation({
    onSuccess: () => { utils.checklist.getCompleto.invalidate(); toast.success("Item atualizado!"); },
  });
  const createItem = trpc.checklist.createItem.useMutation({
    onSuccess: () => { utils.checklist.getCompleto.invalidate(); toast.success("Item criado!"); setNewItemDialog(false); },
  });
  const updateFaixa = trpc.configFaixas.update.useMutation({
    onSuccess: () => { utils.configFaixas.list.invalidate(); toast.success("Faixa atualizada!"); },
  });
  const createSecao = trpc.checklist.createSecao.useMutation({
    onSuccess: () => { utils.checklist.getCompleto.invalidate(); toast.success("Seção criada!"); setNewSecaoTitulo(""); },
  });

  // State for editing
  const [editingSecao, setEditingSecao] = useState<number | null>(null);
  const [secaoForm, setSecaoForm] = useState({ peso: 0, reincidencia: 0 });
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({ descricao: "", codigo: "" });
  const [editingFaixa, setEditingFaixa] = useState<number | null>(null);
  const [faixaForm, setFaixaForm] = useState({ minimo: 0, maximo: 0, cor: "" });
  const [newItemDialog, setNewItemDialog] = useState(false);
  const [newItemSecaoId, setNewItemSecaoId] = useState<number | null>(null);
  const [newItemForm, setNewItemForm] = useState({ codigo: "", descricao: "" });
  const [newSecaoTitulo, setNewSecaoTitulo] = useState("");

  const startEditSecao = (secao: any) => {
    setEditingSecao(secao.id);
    setSecaoForm({ peso: secao.peso, reincidencia: secao.reincidencia });
  };

  const saveSecao = (id: number) => {
    updateSecao.mutate({ id, peso: secaoForm.peso, reincidencia: secaoForm.reincidencia });
    setEditingSecao(null);
  };

  const startEditItem = (item: any) => {
    setEditingItem(item.id);
    setItemForm({ descricao: item.descricao, codigo: item.codigo });
  };

  const saveItem = (id: number) => {
    updateItem.mutate({ id, descricao: itemForm.descricao, codigo: itemForm.codigo });
    setEditingItem(null);
  };

  const startEditFaixa = (faixa: any) => {
    setEditingFaixa(faixa.id);
    setFaixaForm({ minimo: faixa.minimo, maximo: faixa.maximo, cor: faixa.cor });
  };

  const saveFaixa = (id: number) => {
    updateFaixa.mutate({ id, minimo: faixaForm.minimo, maximo: faixaForm.maximo, cor: faixaForm.cor });
    setEditingFaixa(null);
  };

  const openNewItemDialog = (secaoId: number) => {
    setNewItemSecaoId(secaoId);
    setNewItemForm({ codigo: "", descricao: "" });
    setNewItemDialog(true);
  };

  const handleCreateItem = () => {
    if (!newItemSecaoId || !newItemForm.codigo || !newItemForm.descricao) {
      toast.error("Preencha todos os campos");
      return;
    }
    const secao = checklist?.find(s => s.id === newItemSecaoId);
    const maxOrdem = secao?.itens?.reduce((max: number, i: any) => Math.max(max, i.ordem), 0) || 0;
    createItem.mutate({
      secaoId: newItemSecaoId,
      codigo: newItemForm.codigo,
      descricao: newItemForm.descricao,
      ordem: maxOrdem + 1,
    });
  };

  const totalPeso = checklist?.reduce((sum, s) => sum + s.peso, 0) || 0;

  // --- Categorias de Plano ---
  const { data: planoCategorias } = trpc.planoCategorias.list.useQuery();
  const createCategoria = trpc.planoCategorias.create.useMutation({
    onSuccess: () => { utils.planoCategorias.list.invalidate(); toast.success("Categoria criada!"); setNovaCategoria(""); },
    onError: (e: any) => toast.error(e?.message || "Erro ao criar"),
  });
  const updateCategoria = trpc.planoCategorias.update.useMutation({
    onSuccess: () => { utils.planoCategorias.list.invalidate(); toast.success("Categoria atualizada!"); setEditCatId(null); },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });
  const deleteCategoria = trpc.planoCategorias.delete.useMutation({
    onSuccess: () => { utils.planoCategorias.list.invalidate(); toast.success("Categoria removida!"); },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover"),
  });
  const [novaCategoria, setNovaCategoria] = useState("");
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editCatNome, setEditCatNome] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="h-7 w-7 text-teal-600" />
          Parâmetros
        </h1>
        <p className="text-slate-500 mt-1">Configure pesos, itens do checklist e faixas de classificação</p>
      </div>

      {/* Seletor de categoria/vertical */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Vertical:</span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {[
            { id: "qualidade", label: "Qualidade" },
            { id: "vistoria", label: "Vistoria de Recebimento" },
            { id: "qsms", label: "QSMS" },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setCategoria(opt.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                categoria === opt.id
                  ? "bg-teal-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="pesos">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="pesos" className="flex items-center gap-1.5">
            <Scale className="h-4 w-4" /> Pesos
          </TabsTrigger>
          <TabsTrigger value="itens" className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" /> Itens
          </TabsTrigger>
          <TabsTrigger value="faixas" className="flex items-center gap-1.5">
            <Palette className="h-4 w-4" /> Faixas
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-1.5">
            <Tag className="h-4 w-4" /> Categorias
          </TabsTrigger>
        </TabsList>

        {/* Tab: Pesos por Seção */}
        <TabsContent value="pesos" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-teal-600" />
                Pesos por Seção
              </CardTitle>
              <CardDescription>
                Configure o peso de cada seção do checklist e o fator de reincidência.
                O peso total atual é <strong>{totalPeso}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingChecklist ? (
                <p className="text-slate-500">Carregando...</p>
              ) : (
                checklist?.map(secao => (
                  <div key={secao.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold shrink-0">
                      {secao.numero}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{secao.titulo}</h4>
                      <p className="text-xs text-slate-500">{secao.itens?.length || 0} itens</p>
                    </div>
                    {editingSecao === secao.id ? (
                      <div className="flex items-center gap-3">
                        <div>
                          <Label className="text-xs">Peso</Label>
                          <Input
                            type="number"
                            min={0}
                            className="w-20 h-8"
                            value={secaoForm.peso}
                            onChange={e => setSecaoForm(p => ({ ...p, peso: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            Reincidência %
                            <Tooltip>
                              <TooltipTrigger><Info className="h-3 w-3 text-slate-400" /></TooltipTrigger>
                              <TooltipContent>Percentual de penalidade aplicado quando um item é reincidente entre verificações</TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-20 h-8"
                            value={secaoForm.reincidencia}
                            onChange={e => setSecaoForm(p => ({ ...p, reincidencia: Number(e.target.value) }))}
                          />
                        </div>
                        <Button size="sm" onClick={() => saveSecao(secao.id)} className="bg-teal-600 hover:bg-teal-700 text-white">
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSecao(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <div className="text-center">
                          <p className="text-xs text-slate-400">Peso</p>
                          <p className="text-lg font-bold text-slate-900">{secao.peso}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-400">Reincid.</p>
                          <p className="text-lg font-bold text-slate-900">{secao.reincidencia}%</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => startEditSecao(secao)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Itens do Checklist */}
        <TabsContent value="itens" className="space-y-4 mt-4">
          {/* Criar nova seção */}
          <Card className="border-dashed">
            <CardContent className="p-4 flex items-center gap-2">
              <Input
                placeholder="Título da nova seção (ex: Estrutura, Acabamento...)"
                value={newSecaoTitulo}
                onChange={e => setNewSecaoTitulo(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (!newSecaoTitulo.trim()) { toast.error("Informe o título"); return; }
                  createSecao.mutate({ titulo: newSecaoTitulo.trim(), categoria });
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1" /> Nova Seção
              </Button>
            </CardContent>
          </Card>

          {checklist?.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">
              Nenhuma seção cadastrada para esta vertical. Crie a primeira acima.
            </p>
          )}
          {checklist?.map(secao => (
            <Card key={secao.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                      {secao.numero}
                    </span>
                    {secao.titulo}
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => openNewItemDialog(secao.id)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Novo Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {secao.itens?.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    {editingItem === item.id ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            className="w-20"
                            value={itemForm.codigo}
                            onChange={e => setItemForm(p => ({ ...p, codigo: e.target.value }))}
                            placeholder="Código"
                          />
                          <div className="flex gap-2 ml-auto">
                            <Button size="sm" onClick={() => saveItem(item.id)} className="bg-teal-600 hover:bg-teal-700 text-white">
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>Cancelar</Button>
                          </div>
                        </div>
                        <Textarea
                          value={itemForm.descricao}
                          onChange={e => setItemForm(p => ({ ...p, descricao: e.target.value }))}
                          rows={2}
                        />
                      </div>
                    ) : (
                      <>
                        <Badge variant="outline" className="shrink-0 font-mono text-xs mt-0.5">{item.codigo}</Badge>
                        <p className="text-sm text-slate-700 flex-1">{item.descricao}</p>
                        <Button size="sm" variant="ghost" className="shrink-0" onClick={() => startEditItem(item)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Dialog para novo item */}
          <Dialog open={newItemDialog} onOpenChange={setNewItemDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Item do Checklist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Código</Label>
                  <Input
                    placeholder="Ex: 2.15"
                    value={newItemForm.codigo}
                    onChange={e => setNewItemForm(p => ({ ...p, codigo: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descreva o item de verificação..."
                    rows={3}
                    value={newItemForm.descricao}
                    onChange={e => setNewItemForm(p => ({ ...p, descricao: e.target.value }))}
                  />
                </div>
                <Button onClick={handleCreateItem} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab: Faixas de Classificação */}
        <TabsContent value="faixas" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-teal-600" />
                Faixas de Classificação
              </CardTitle>
              <CardDescription>
                Configure as faixas percentuais que determinam a classificação da verificação (ÓTIMA, REGULAR, RUIM, CRÍTICO).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingFaixas ? (
                <p className="text-slate-500">Carregando...</p>
              ) : (
                faixas?.map(faixa => (
                  <div key={faixa.id} className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-white">
                    <div
                      className="w-10 h-10 rounded-full border-2"
                      style={{ backgroundColor: faixa.cor, borderColor: faixa.cor }}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{faixa.nome}</h4>
                    </div>
                    {editingFaixa === faixa.id ? (
                      <div className="flex items-center gap-3">
                        <div>
                          <Label className="text-xs">Mínimo %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-20 h-8"
                            value={faixaForm.minimo}
                            onChange={e => setFaixaForm(p => ({ ...p, minimo: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Máximo %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-20 h-8"
                            value={faixaForm.maximo}
                            onChange={e => setFaixaForm(p => ({ ...p, maximo: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cor</Label>
                          <Input
                            type="color"
                            className="w-12 h-8 p-0.5"
                            value={faixaForm.cor}
                            onChange={e => setFaixaForm(p => ({ ...p, cor: e.target.value }))}
                          />
                        </div>
                        <Button size="sm" onClick={() => saveFaixa(faixa.id)} className="bg-teal-600 hover:bg-teal-700 text-white">
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingFaixa(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-slate-400">Faixa</p>
                          <p className="text-sm font-semibold text-slate-700">{faixa.minimo}% — {faixa.maximo}%</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => startEditFaixa(faixa)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Categorias de Plano de Ação */}
        <TabsContent value="categorias" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-teal-600" />
                Categorias de Plano de Ação (Preventivos)
              </CardTitle>
              <CardDescription>
                Categorias usadas em planos preventivos / avulsos. Adicione, renomeie ou desative conforme necessário.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da nova categoria"
                  value={novaCategoria}
                  onChange={e => setNovaCategoria(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && novaCategoria.trim()) createCategoria.mutate({ nome: novaCategoria.trim() }); }}
                />
                <Button
                  onClick={() => novaCategoria.trim() && createCategoria.mutate({ nome: novaCategoria.trim() })}
                  className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                  disabled={createCategoria.isPending || !novaCategoria.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {(planoCategorias || []).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">Nenhuma categoria cadastrada</p>
                )}
                {(planoCategorias || []).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                    {editCatId === c.id ? (
                      <>
                        <Input
                          autoFocus
                          value={editCatNome}
                          onChange={e => setEditCatNome(e.target.value)}
                          className="flex-1 h-8"
                        />
                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => updateCategoria.mutate({ id: c.id, nome: editCatNome.trim() })}>
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditCatId(null)}>Cancelar</Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="font-mono text-xs">#{c.id}</Badge>
                        <span className={`flex-1 text-sm ${c.ativo === 0 ? "text-slate-400 line-through" : "text-slate-900"}`}>{c.nome}</span>
                        {c.ativo === 0 && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                        <Button size="sm" variant="outline" onClick={() => { setEditCatId(c.id); setEditCatNome(c.nome); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCategoria.mutate({ id: c.id, ativo: c.ativo === 1 ? 0 : 1 })}
                          title={c.ativo === 1 ? "Desativar" : "Ativar"}
                        >
                          {c.ativo === 1 ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => { if (confirm(`Excluir categoria "${c.nome}"?`)) deleteCategoria.mutate({ id: c.id }); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
