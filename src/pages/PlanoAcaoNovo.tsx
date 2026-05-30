import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ObraSelect from "@/components/ObraSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Target, Search, X, Link2, Loader2, Wrench, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const VERTICAL_LABELS: Record<string, string> = {
  qualidade: "Qualidade", checklist: "Checklist", qsms: "QSMS", vistoria: "Vistoria",
};
const VERTICAIS = ["vistoria", "qualidade", "qsms", "checklist"] as const;

export default function PlanoAcaoNovo() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const allowedVerticais = (user?.verticais && user.verticais.length ? user.verticais : ["qualidade", "checklist", "qsms", "vistoria"]) as string[];
  const utils = trpc.useUtils();
  const { data: desvios } = trpc.desvios.list.useQuery();
  const { data: obras } = trpc.obras.list.useQuery();
  const { data: categorias } = trpc.planoCategorias.list.useQuery();

  const [tipo, setTipo] = useState<"corretivo" | "preventivo">("corretivo");
  const [acao, setAcao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [responsavelEmail, setResponsavelEmail] = useState("");
  const [prioridade, setPrioridade] = useState<"baixa" | "normal" | "urgente">("normal");
  const [prazo, setPrazo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [obraFiltro, setObraFiltro] = useState("all");
  const [verticalFiltro, setVerticalFiltro] = useState("all");
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState(false);
  // Preventivo
  const [obraId, setObraId] = useState<string>("");
  const [vertical, setVertical] = useState<string>("");
  const [categoriaId, setCategoriaId] = useState<string>("");

  const create = trpc.planos.create.useMutation();

  const desviosDisponiveis = useMemo(() => {
    let r = (desvios || []).filter((d: any) => d.status !== "fechado");
    if (obraFiltro !== "all") r = r.filter((d: any) => String(d.obraId) === obraFiltro);
    if (verticalFiltro !== "all") r = r.filter((d: any) => d.origem === verticalFiltro);
    if (search) {
      const t = search.toLowerCase();
      r = r.filter((d: any) => d.descricao?.toLowerCase().includes(t) || String(d.id).includes(t));
    }
    return r.slice(0, 80);
  }, [desvios, obraFiltro, verticalFiltro, search]);

  const desviosSelecionadosFull = useMemo(() => {
    return (desvios || []).filter((d: any) => selecionados.includes(d.id));
  }, [desvios, selecionados]);

  const toggle = (id: number) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const salvar = async () => {
    if (!acao.trim()) { toast.error("Descreva a ação"); return; }
    if (!responsavel.trim()) { toast.error("Informe o responsável"); return; }
    if (!prazo) { toast.error("Defina o prazo"); return; }
    if (tipo === "corretivo" && selecionados.length === 0) { toast.error("Vincule ao menos um desvio"); return; }
    if (tipo === "preventivo") {
      if (!obraId) { toast.error("Selecione a obra"); return; }
      if (!vertical) { toast.error("Selecione a vertical"); return; }
      if (!categoriaId) { toast.error("Selecione a categoria"); return; }
    }
    try {
      await create.mutateAsync({
        tipo,
        desvioIds: tipo === "corretivo" ? selecionados : [],
        obraId: tipo === "preventivo" ? Number(obraId) : undefined,
        vertical: tipo === "preventivo" ? vertical : undefined,
        categoriaId: tipo === "preventivo" ? Number(categoriaId) : undefined,
        acao: acao.trim(),
        responsavel: responsavel.trim(),
        responsavelEmail: responsavelEmail.trim() || undefined,
        prioridade,
        prazo: new Date(prazo).getTime(),
        observacoes: observacoes.trim() || undefined,
      });
      utils.planos.list.invalidate();
      toast.success("Plano de ação criado!");
      navigate("/planos-acao");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar plano");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/planos-acao")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-teal-600" /> Novo Plano de Ação
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Vincule desvios e atribua responsável e prazo</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo("corretivo")}
              className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all ${tipo === "corretivo" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}
            >
              <Wrench className={`h-5 w-5 mt-0.5 shrink-0 ${tipo === "corretivo" ? "text-teal-600" : "text-slate-400"}`} />
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-900">Corretivo</p>
                <p className="text-xs text-slate-500 mt-0.5">Vinculado a desvios existentes</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTipo("preventivo")}
              className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all ${tipo === "preventivo" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}
            >
              <ShieldCheck className={`h-5 w-5 mt-0.5 shrink-0 ${tipo === "preventivo" ? "text-blue-600" : "text-slate-400"}`} />
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-900">Preventivo / Avulso</p>
                <p className="text-xs text-slate-500 mt-0.5">Sem desvio vinculado (treinamento, melhoria...)</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {tipo === "preventivo" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Contexto do Plano Preventivo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Obra *</Label>
                <ObraSelect
                  obras={obras}
                  value={obraId}
                  onValueChange={setObraId}
                  placeholder="Selecione"
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <Label className="text-sm">Vertical *</Label>
                <Select value={vertical} onValueChange={setVertical}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {VERTICAIS.map(v => <SelectItem key={v} value={v}>{VERTICAL_LABELS[v]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Categoria *</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(categorias || []).filter((c: any) => c.ativo === 1).map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 mt-1">Categorias podem ser editadas em Parâmetros (admin)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Ação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Ação a ser executada *</Label>
            <Textarea value={acao} onChange={e => setAcao(e.target.value)} rows={3} placeholder="Ex: Refazer pintura da fachada do bloco A..." className="mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Responsável *</Label>
              <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome do responsável" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">E-mail do responsável</Label>
              <Input type="email" value={responsavelEmail} onChange={e => setResponsavelEmail(e.target.value)} placeholder="email@exemplo.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Prioridade</Label>
              <Select value={prioridade} onValueChange={v => setPrioridade(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Prazo *</Label>
              <Input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-sm">Observações</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {tipo === "corretivo" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-teal-600" /> Desvios Vinculados
            <Badge variant="secondary" className="ml-2">{selecionados.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {desviosSelecionadosFull.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {desviosSelecionadosFull.map((d: any) => (
                <span key={d.id} className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs rounded-full pl-2 pr-1 py-1">
                  <span className="font-mono">#{d.id}</span>
                  <span className="max-w-[200px] truncate">{d.descricao}</span>
                  <button onClick={() => toggle(d.id)} className="ml-1 rounded-full hover:bg-teal-100 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setPicker(true)}>
            <Search className="h-4 w-4 mr-2" />
            {selecionados.length === 0 ? "Adicionar desvios..." : "Adicionar mais desvios..."}
          </Button>

          <Dialog open={picker} onOpenChange={setPicker}>
            <DialogContent className="max-w-2xl p-0 gap-0">
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4 text-teal-600" /> Vincular desvios
                  <Badge variant="secondary" className="ml-1">{selecionados.length} selecionado(s)</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="p-3 border-b space-y-2">
                <Input placeholder="Buscar por #id ou descrição..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
                <div className="flex gap-2">
                  <ObraSelect
                    obras={obras}
                    value={obraFiltro}
                    onValueChange={setObraFiltro}
                    allLabel="Todas as obras"
                    placeholder="Obra"
                    className="h-8 text-xs w-full"
                  />
                  <Select value={verticalFiltro} onValueChange={setVerticalFiltro}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vertical" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas verticais</SelectItem>
                      <SelectItem value="vistoria">Vistoria</SelectItem>
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                      <SelectItem value="qsms">QSMS</SelectItem>
                      <SelectItem value="checklist">Checklist</SelectItem>
                      <SelectItem value="vistoria">Vistoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                {desviosDisponiveis.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-400">Nenhum desvio encontrado</div>
                )}
                {desviosDisponiveis.map((d: any) => {
                  const checked = selecionados.includes(d.id);
                  return (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => toggle(d.id)}
                      className={`w-full text-left p-2.5 border-b hover:bg-slate-50 flex items-start gap-3 ${checked ? "bg-teal-50" : ""}`}
                    >
                      <input type="checkbox" checked={checked} readOnly className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs text-slate-500">#{d.id}</span>
                          <Badge variant="outline" className="text-[10px]">{VERTICAL_LABELS[d.origem] || d.origem}</Badge>
                          <Badge variant={d.severidade === "grave" ? "destructive" : "secondary"} className="text-[10px]">{d.severidade}</Badge>
                        </div>
                        <p className="text-sm truncate">{d.descricao}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <DialogFooter className="p-3 border-t">
                <Button variant="outline" onClick={() => setPicker(false)}>Fechar</Button>
                <Button onClick={() => setPicker(false)} className="bg-teal-600 hover:bg-teal-700 text-white">
                  Confirmar ({selecionados.length})
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/planos-acao")}>Cancelar</Button>
        <Button onClick={salvar} disabled={create.isPending} className="bg-teal-600 hover:bg-teal-700 text-white">
          {create.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando</> : "Criar Plano"}
        </Button>
      </div>
    </div>
  );
}