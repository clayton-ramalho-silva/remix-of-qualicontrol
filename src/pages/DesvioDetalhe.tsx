import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock, FileWarning,
  PlusCircle, MessageSquare, Camera, ClipboardCheck, Edit3,
  Send, Loader2, Image as ImageIcon, Upload, X, Tag, UserCheck, ShieldAlert,
  Zap, ArrowDown, Minus, HelpCircle, Save, MapPin,
} from "lucide-react";
import PlantaPinSelector from "@/components/PlantaPinSelector";

// Grupos carregados do banco de dados (substitui disciplinas fixas)

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  aberto: { label: "Aberto", icon: <FileWarning className="h-4 w-4" />, className: "bg-amber-100 text-amber-700" },
  em_andamento: { label: "Em Andamento", icon: <Clock className="h-4 w-4" />, className: "bg-blue-100 text-blue-700" },
  aguardando_aceite: { label: "Aguardando Aceite", icon: <UserCheck className="h-4 w-4" />, className: "bg-purple-100 text-purple-700" },
  fechado: { label: "Fechado", icon: <CheckCircle2 className="h-4 w-4" />, className: "bg-emerald-100 text-emerald-700" },
};

const ORIGEM_MAP: Record<string, { label: string; className: string }> = {
  qualidade: { label: "Qualidade", className: "bg-sky-100 text-sky-700" },
  checklist: { label: "Check List", className: "bg-violet-100 text-violet-700" },
  qsms: { label: "Assistência Técnica", className: "bg-orange-100 text-orange-700" },
};

const TIMELINE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  criacao: { icon: <PlusCircle className="h-3.5 w-3.5" />, color: "bg-primary text-primary-foreground" },
  status: { icon: <Edit3 className="h-3.5 w-3.5" />, color: "bg-blue-500 text-white" },
  edicao: { icon: <Edit3 className="h-3.5 w-3.5" />, color: "bg-slate-500 text-white" },
  plano_acao: { icon: <ClipboardCheck className="h-3.5 w-3.5" />, color: "bg-emerald-500 text-white" },
  comentario: { icon: <MessageSquare className="h-3.5 w-3.5" />, color: "bg-violet-500 text-white" },
  foto: { icon: <Camera className="h-3.5 w-3.5" />, color: "bg-amber-500 text-white" },
};

export default function DesvioDetalhe() {
  const params = useParams<{ id: string }>();
  const desvioId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.desvios.getById.useQuery({ id: desvioId });
  const updateDesvio = trpc.desvios.update.useMutation({
    onSuccess: () => {
      utils.desvios.getById.invalidate({ id: desvioId });
      toast.success("Status atualizado!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar status.");
    },
  });
  const addComment = trpc.historico.addComment.useMutation({
    onSuccess: () => { utils.desvios.getById.invalidate({ id: desvioId }); setComment(""); toast.success("Comentário adicionado!"); },
  });
  const createPlano = trpc.planos.create.useMutation({
    onSuccess: () => { utils.desvios.getById.invalidate({ id: desvioId }); setShowPlanoDialog(false); toast.success("Plano de ação criado!"); },
  });
  const updatePlano = trpc.planos.update.useMutation({
    onSuccess: () => { utils.desvios.getById.invalidate({ id: desvioId }); toast.success("Plano atualizado!"); },
  });
  const uploadFoto = trpc.fotos.upload.useMutation({
    onSuccess: () => {
      utils.desvios.getById.invalidate({ id: desvioId });
      setFechamentoFotos([]);
      toast.success("Foto de fechamento enviada!");
    },
  });

  // Queries for responsible selector
  const { data: membros } = trpc.membros.list.useQuery();
  const { data: fornecedoresData } = trpc.fornecedores.list.useQuery();
  const { data: grupos } = trpc.grupos.list.useQuery();

  const [comment, setComment] = useState("");
  const [showPlanoDialog, setShowPlanoDialog] = useState(false);
  const [planoAcao, setPlanoAcao] = useState("");
  const [planoRespTipo, setPlanoRespTipo] = useState<"membro" | "fornecedor">("membro");
  const [planoRespId, setPlanoRespId] = useState<string>("");
  const [planoPrioridade, setPlanoPrioridade] = useState<"urgente" | "normal" | "baixa">("normal");
  const [planoPrazo, setPlanoPrazo] = useState("");
  const [planoObs, setPlanoObs] = useState("");
  const [fechamentoFotos, setFechamentoFotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingFechamento, setUploadingFechamento] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editDisciplina, setEditDisciplina] = useState("");
  const [editFornecedorNome, setEditFornecedorNome] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editLocalizacao, setEditLocalizacao] = useState("");
  const [editSeveridade, setEditSeveridade] = useState("");
  const [editOrigem, setEditOrigem] = useState("");
  const [editTagCritico, setEditTagCritico] = useState(false);
  const [editTagSegurancaTrabalho, setEditTagSegurancaTrabalho] = useState(false);
  const [editTagSolicitadoCliente, setEditTagSolicitadoCliente] = useState(false);
  const [editPrazoSugerido, setEditPrazoSugerido] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editGrupoSearch, setEditGrupoSearch] = useState("");
  const [editPlantaId, setEditPlantaId] = useState<number | null>(null);
  const [editPinX, setEditPinX] = useState<string | null>(null);
  const [editPinY, setEditPinY] = useState<string | null>(null);

  const startEditing = () => {
    if (!data) return;
    setEditDisciplina(data.disciplina || "");
    setEditFornecedorNome(data.fornecedorNome || "");
    setEditDescricao(data.descricao);
    setEditLocalizacao(data.localizacao || "");
    setEditSeveridade(data.severidade);
    setEditOrigem((data as any).origem || "qualidade");
    setEditTagCritico((data as any).tagCritico === 1);
    setEditTagSegurancaTrabalho((data as any).tagSegurancaTrabalho === 1);
    setEditTagSolicitadoCliente((data as any).tagSolicitadoCliente === 1);
    setEditPrazoSugerido(data.prazoSugerido ? new Date(data.prazoSugerido).toISOString().split("T")[0] : "");
    setEditPlantaId((data as any).plantaId || null);
    setEditPinX((data as any).pinX || null);
    setEditPinY((data as any).pinY || null);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editDisciplina || !editDescricao || !editSeveridade) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateDesvio.mutateAsync({
        id: data!.id,
        disciplina: editDisciplina,
        fornecedorNome: editFornecedorNome || undefined,
        descricao: editDescricao,
        localizacao: editLocalizacao || undefined,
        severidade: editSeveridade as any,
        origem: editOrigem as any,
        tagCritico: editTagCritico ? 1 : 0,
        tagSegurancaTrabalho: editTagSegurancaTrabalho ? 1 : 0,
        tagSolicitadoCliente: editTagSolicitadoCliente ? 1 : 0,
        prazoSugerido: editPrazoSugerido ? new Date(editPrazoSugerido).getTime() : undefined,
        plantaId: editPlantaId,
        pinX: editPinX,
        pinY: editPinY,
      });
      setIsEditing(false);
      toast.success("Desvio atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao atualizar desvio.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Resolve responsible name and email from selection
  const getResponsavelInfo = () => {
    const id = parseInt(planoRespId);
    if (isNaN(id)) return { nome: "", email: "", id: undefined };
    if (planoRespTipo === "membro") {
      const m = membros?.find(m => m.id === id);
      return { nome: m?.nome || "", email: m?.email || "", id };
    } else {
      const f = fornecedoresData?.find(f => f.id === id);
      return { nome: f?.nome || "", email: f?.email || "", id };
    }
  };

  const handleFechamentoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFotos = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFechamentoFotos((prev) => [...prev, ...newFotos]);
    e.target.value = "";
  };

  const removeFechamentoFoto = (index: number) => {
    setFechamentoFotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUploadFechamento = async () => {
    if (fechamentoFotos.length === 0) {
      toast.error("Selecione pelo menos uma foto de evidência de fechamento.");
      return;
    }
    setUploadingFechamento(true);
    try {
      for (const foto of fechamentoFotos) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(foto.file);
        });
        await uploadFoto.mutateAsync({
          desvioId,
          fileBase64: base64,
          fileName: foto.file.name,
          contentType: foto.file.type,
          tipo: "fechamento",
        });
      }
    } catch (err) {
      toast.error("Erro ao enviar fotos de fechamento.");
    } finally {
      setUploadingFechamento(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Desvio não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/desvios")}>
          Voltar à lista
        </Button>
      </div>
    );
  }

  const st = STATUS_MAP[data.status] || STATUS_MAP.aberto;
  const isOverdue = data.status !== "fechado" && data.status !== "aguardando_aceite" && data.prazoSugerido && data.prazoSugerido < Date.now();
  const origemInfo = ORIGEM_MAP[(data as any).origem] || ORIGEM_MAP.qualidade;
  const isPunchList = (data as any).origem === "checklist";

  // Separate fotos by type
  const fotosAbertura = data.fotos?.filter((f: any) => !f.tipo || f.tipo === "abertura") || [];
  const fotosFechamento = data.fotos?.filter((f: any) => f.tipo === "fechamento") || [];
  const hasFotosFechamento = fotosFechamento.length > 0;

  // Determine available status transitions
  const getAvailableStatuses = () => {
    const statuses: Array<{ value: string; label: string; icon: React.ReactNode }> = [
      { value: "aberto", label: "Aberto", icon: STATUS_MAP.aberto.icon },
      { value: "em_andamento", label: "Em Andamento", icon: STATUS_MAP.em_andamento.icon },
    ];
    if (isPunchList) {
      statuses.push({ value: "aguardando_aceite", label: "Aguardando Aceite", icon: STATUS_MAP.aguardando_aceite.icon });
    }
    statuses.push({ value: "fechado", label: "Fechado", icon: STATUS_MAP.fechado.icon });
    return statuses;
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "fechado" || newStatus === "aguardando_aceite") {
      if (!hasFotosFechamento) {
        toast.error("É obrigatório anexar pelo menos uma foto de evidência de fechamento antes de alterar para este status.");
        return;
      }
    }
    updateDesvio.mutate({ id: data.id, status: newStatus as any });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/desvios")} className="mt-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight">Desvio #{data.id}</h1>
            <Badge variant={data.severidade === "grave" ? "destructive" : data.severidade === "moderado" ? "default" : "secondary"}>
              {data.severidade === "grave" && <AlertTriangle className="h-3 w-3 mr-1" />}
              {data.severidade.charAt(0).toUpperCase() + data.severidade.slice(1)}
            </Badge>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${origemInfo.className}`}>
              {origemInfo.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full ${st.className}`}>
              {st.icon} {st.label}
            </span>
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                <Clock className="h-3 w-3" /> Atrasado
              </span>
            )}
          </div>
          {/* Tags */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {(data as any).tagCritico === 1 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                <ShieldAlert className="h-3 w-3" /> Chamado Crítico
              </span>
            )}
            {(data as any).tagSegurancaTrabalho === 1 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                <AlertTriangle className="h-3 w-3" /> Segurança do Trabalho
              </span>
            )}
            {(data as any).tagSolicitadoCliente === 1 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                <Tag className="h-3 w-3" /> Solicitado pelo Cliente
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">{data.descricao}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Detalhes</CardTitle>
              {data.status !== "fechado" && !isEditing && (
                <Button size="sm" variant="outline" onClick={startEditing}>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Grupo *</Label>
                      <Select value={editDisciplina} onValueChange={setEditDisciplina}>
                        <SelectTrigger className="mt-1 bg-background">
                          <SelectValue placeholder="Selecione o grupo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 pb-2">
                            <Input
                              placeholder="Buscar grupo..."
                              value={editGrupoSearch}
                              onChange={e => setEditGrupoSearch(e.target.value)}
                              className="h-8 text-sm"
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => e.stopPropagation()}
                            />
                          </div>
                          {(grupos || []).filter(g => {
                            if (!editGrupoSearch) return true;
                            const term = editGrupoSearch.toLowerCase();
                            return g.nome.toLowerCase().includes(term) || g.codigo.toLowerCase().includes(term);
                          }).slice(0, 50).map((g) => (
                            <SelectItem key={g.id} value={`${g.codigo} - ${g.nome}`}>
                              {g.codigo} - {g.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Fornecedor</Label>
                      <Select value={editFornecedorNome} onValueChange={setEditFornecedorNome}>
                        <SelectTrigger className="mt-1 bg-background">
                          <SelectValue placeholder="Selecione ou deixe em branco..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedoresData?.map((f) => (
                            <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Origem *</Label>
                    <Select value={editOrigem} onValueChange={setEditOrigem}>
                      <SelectTrigger className="mt-1 bg-background">
                        <SelectValue placeholder="Selecione a origem..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualidade">Qualidade</SelectItem>
                        <SelectItem value="checklist">Check List</SelectItem>
                        <SelectItem value="qsms">Assistência Técnica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Descrição *</Label>
                    <Textarea
                      value={editDescricao}
                      onChange={(e) => setEditDescricao(e.target.value)}
                      rows={3}
                      className="mt-1 bg-background resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Localização</Label>
                      <Input
                        value={editLocalizacao}
                        onChange={(e) => setEditLocalizacao(e.target.value)}
                        placeholder="Ex: 5º andar, sala de reuniões"
                        className="mt-1 bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Severidade *</Label>
                      <Select value={editSeveridade} onValueChange={setEditSeveridade}>
                        <SelectTrigger className="mt-1 bg-background">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leve">Leve</SelectItem>
                          <SelectItem value="moderado">Moderado</SelectItem>
                          <SelectItem value="grave">Grave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Prazo Sugerido</Label>
                    <Input
                      type="date"
                      value={editPrazoSugerido}
                      onChange={(e) => setEditPrazoSugerido(e.target.value)}
                      className="mt-1 bg-background"
                    />
                  </div>

                  {/* Tags / Classificações */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Classificações</Label>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox checked={editTagCritico} onCheckedChange={(c) => setEditTagCritico(!!c)} />
                        <span className="text-sm flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                          Chamado Crítico
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox checked={editTagSegurancaTrabalho} onCheckedChange={(c) => setEditTagSegurancaTrabalho(!!c)} />
                        <span className="text-sm flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                          Segurança do Trabalho
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox checked={editTagSolicitadoCliente} onCheckedChange={(c) => setEditTagSolicitadoCliente(!!c)} />
                        <span className="text-sm flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                          Solicitado pelo Cliente
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Localização na Planta (edição) */}
                  <PlantaPinSelector
                    obraId={data.obraId}
                    plantaId={editPlantaId}
                    pinX={editPinX}
                    pinY={editPinY}
                    onChange={({ plantaId: pId, pinX: px, pinY: py }) => {
                      setEditPlantaId(pId);
                      setEditPinX(px);
                      setEditPinY(py);
                    }}
                  />

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={savingEdit}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
                      {savingEdit ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Grupo:</span> <span className="font-medium ml-1">{data.disciplina || "—"}</span></div>
                  <div><span className="text-muted-foreground">Fornecedor:</span> <span className="font-medium ml-1">{data.fornecedorNome || "—"}</span></div>
                  <div><span className="text-muted-foreground">Localização:</span> <span className="font-medium ml-1">{data.localizacao || "—"}</span></div>
                  <div><span className="text-muted-foreground">Identificado em:</span> <span className="font-medium ml-1">{new Date(data.dataIdentificacao).toLocaleDateString("pt-BR")}</span></div>
                  <div><span className="text-muted-foreground">Prazo:</span> <span className={`font-medium ml-1 ${isOverdue ? "text-red-600" : ""}`}>{data.prazoSugerido ? new Date(data.prazoSugerido).toLocaleDateString("pt-BR") : "—"}</span></div>
                  <div><span className="text-muted-foreground">Registrado por:</span> <span className="font-medium ml-1">{data.createdByName || "—"}</span></div>
                  <div><span className="text-muted-foreground">Origem:</span> <span className="font-medium ml-1">{origemInfo.label}</span></div>
                  {data.dataFechamento && (
                    <div><span className="text-muted-foreground">Fechado em:</span> <span className="font-medium ml-1">{new Date(data.dataFechamento).toLocaleDateString("pt-BR")}</span></div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Localização na Planta (visualização) */}
          {(data as any).plantaId && (data as any).pinX && (data as any).pinY && (
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Localização na Planta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlantaPinSelector
                  obraId={data.obraId}
                  plantaId={(data as any).plantaId}
                  pinX={(data as any).pinX}
                  pinY={(data as any).pinY}
                  onChange={() => {}}
                  readOnly
                />
              </CardContent>
            </Card>
          )}

          {/* Fotos de Abertura */}
          {fotosAbertura.length > 0 && (
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4 text-amber-500" /> Evidências de Abertura
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {fotosAbertura.map((foto: any) => (
                    <a key={foto.id} href={foto.url} target="_blank" rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden border hover:shadow-md transition-shadow">
                      <img src={foto.url} alt={foto.descricao || "Evidência de abertura"} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fotos de Fechamento */}
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Evidências de Fechamento
                {!hasFotosFechamento && data.status !== "fechado" && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (obrigatório para fechar o desvio)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fotosFechamento.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {fotosFechamento.map((foto: any) => (
                    <a key={foto.id} href={foto.url} target="_blank" rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden border border-emerald-200 hover:shadow-md transition-shadow">
                      <img src={foto.url} alt={foto.descricao || "Evidência de fechamento"} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}

              {/* Upload de fotos de fechamento */}
              {data.status !== "fechado" && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Adicione fotos comprovando a correção do desvio:
                  </p>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {fechamentoFotos.map((foto, i) => (
                      <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border bg-muted">
                        <img src={foto.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFechamentoFoto(i)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-emerald-300/40 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                      <Upload className="h-4 w-4 text-emerald-400" />
                      <span className="text-[9px] text-emerald-500">Adicionar</span>
                      <input type="file" accept="image/*" multiple onChange={handleFechamentoFileChange} className="hidden" />
                    </label>
                  </div>
                  {fechamentoFotos.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={handleUploadFechamento}
                      disabled={uploadingFechamento}
                    >
                      {uploadingFechamento ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                      Enviar {fechamentoFotos.length} foto{fechamentoFotos.length > 1 ? "s" : ""}
                    </Button>
                  )}
                </div>
              )}

              {fotosFechamento.length === 0 && data.status === "fechado" && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma foto de fechamento registrada.</p>
              )}
            </CardContent>
          </Card>

          {/* Planos de Ação */}
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" /> Planos de Ação
              </CardTitle>
              <Dialog open={showPlanoDialog} onOpenChange={(open) => {
                setShowPlanoDialog(open);
                if (!open) { setPlanoAcao(""); setPlanoRespTipo("membro"); setPlanoRespId(""); setPlanoPrioridade("normal"); setPlanoPrazo(""); setPlanoObs(""); }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Novo Plano
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Novo Plano de Ação</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <Label className="text-sm">Ação Corretiva *</Label>
                      <Textarea value={planoAcao} onChange={(e) => setPlanoAcao(e.target.value)}
                        placeholder="Descreva a ação corretiva..." className="mt-1" rows={3} />
                    </div>
                    {/* Prioridade */}
                    <div>
                      <Label className="text-sm">Prioridade *</Label>
                      <div className="flex gap-2 mt-1">
                        {(["urgente", "normal", "baixa"] as const).map((p) => {
                          const isActive = planoPrioridade === p;
                          const styles = {
                            urgente: { bg: isActive ? "bg-red-500 text-white" : "bg-transparent border-red-300 text-red-600 hover:bg-red-50", icon: <Zap className="h-3.5 w-3.5" /> },
                            normal: { bg: isActive ? "bg-blue-500 text-white" : "bg-transparent border-blue-300 text-blue-600 hover:bg-blue-50", icon: <Minus className="h-3.5 w-3.5" /> },
                            baixa: { bg: isActive ? "bg-slate-500 text-white" : "bg-transparent border-slate-300 text-slate-600 hover:bg-slate-50", icon: <ArrowDown className="h-3.5 w-3.5" /> },
                          };
                          const s = styles[p];
                          return (
                            <button key={p} onClick={() => setPlanoPrioridade(p)}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${s.bg}`}>
                              {s.icon} {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Responsável */}
                    <div>
                      <Label className="text-sm">Tipo de Responsável *</Label>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => { setPlanoRespTipo("membro"); setPlanoRespId(""); }}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            planoRespTipo === "membro" ? "bg-primary text-primary-foreground" : "bg-transparent hover:bg-muted"
                          }`}>
                          Equipe AW
                        </button>
                        <button onClick={() => { setPlanoRespTipo("fornecedor"); setPlanoRespId(""); }}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            planoRespTipo === "fornecedor" ? "bg-primary text-primary-foreground" : "bg-transparent hover:bg-muted"
                          }`}>
                          Fornecedor
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Responsável *</Label>
                      <Select value={planoRespId} onValueChange={setPlanoRespId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={planoRespTipo === "membro" ? "Selecione um membro..." : "Selecione um fornecedor..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {planoRespTipo === "membro" ? (
                            (membros || []).filter(m => m.ativo === 1).map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>
                                {m.nome} {m.cargo ? `(${m.cargo})` : ""}
                              </SelectItem>
                            ))
                          ) : (
                            (fornecedoresData || []).map((f) => (
                              <SelectItem key={f.id} value={String(f.id)}>
                                {f.nome} {f.disciplina ? `- ${f.disciplina}` : ""}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Prazo *</Label>
                      <Input type="date" value={planoPrazo} onChange={(e) => setPlanoPrazo(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Observações</Label>
                      <Textarea value={planoObs} onChange={(e) => setPlanoObs(e.target.value)}
                        placeholder="Observações adicionais..." className="mt-1" rows={2} />
                    </div>
                    <Button className="w-full" disabled={!planoAcao || !planoRespId || !planoPrazo || createPlano.isPending}
                      onClick={() => {
                        const resp = getResponsavelInfo();
                        createPlano.mutate({
                          desvioId: data.id,
                          acao: planoAcao,
                          responsavel: resp.nome,
                          responsavelTipo: planoRespTipo,
                          responsavelId: resp.id,
                          responsavelEmail: resp.email || undefined,
                          prioridade: planoPrioridade,
                          prazo: new Date(planoPrazo + "T23:59:59").getTime(),
                          observacoes: planoObs || undefined,
                        });
                      }}>
                      {createPlano.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Criar Plano de Ação
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {data.planos && data.planos.length > 0 ? (
                <div className="space-y-3">
                  {data.planos.map((plano) => {
                    const isAtrasado = plano.status !== "concluido" && plano.prazo < Date.now();
                    const prioridadeStyles: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
                      urgente: { bg: "bg-red-100 text-red-700", icon: <Zap className="h-3 w-3" />, label: "Urgente" },
                      normal: { bg: "bg-blue-100 text-blue-700", icon: <Minus className="h-3 w-3" />, label: "Normal" },
                      baixa: { bg: "bg-slate-100 text-slate-600", icon: <ArrowDown className="h-3 w-3" />, label: "Baixa" },
                    };
                    const prio = prioridadeStyles[(plano as any).prioridade || "normal"] || prioridadeStyles.normal;
                    const tipoResp = (plano as any).responsavelTipo === "fornecedor" ? "Fornecedor" : "Equipe AW";
                    return (
                      <div key={plano.id} className={`p-3 rounded-lg border ${isAtrasado ? "bg-red-50/50 border-red-200" : "bg-muted/50"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{plano.acao}</p>
                              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${prio.bg}`}>
                                {prio.icon} {prio.label}
                              </span>
                              {isAtrasado && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                                  <Clock className="h-3 w-3" /> Atrasado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <UserCheck className="h-3 w-3" /> {plano.responsavel}
                                <span className="text-[10px] text-muted-foreground/70">({tipoResp})</span>
                              </span>
                              <span className={isAtrasado ? "text-red-600 font-medium" : ""}>
                                Prazo: {new Date(plano.prazo).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            {plano.observacoes && <p className="text-xs text-muted-foreground mt-1">{plano.observacoes}</p>}
                          </div>
                          <Select value={plano.status} onValueChange={(val) => {
                            updatePlano.mutate({ id: plano.id, desvioId: data.id, status: val as any });
                          }}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="em_andamento">Em Andamento</SelectItem>
                              <SelectItem value="concluido">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum plano de ação registrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Comentário */}
          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Adicionar um comentário..."
                  rows={2}
                  className="flex-1 resize-none bg-background"
                />
                <Button
                  size="icon"
                  disabled={!comment.trim() || addComment.isPending}
                  onClick={() => addComment.mutate({ desvioId: data.id, descricao: comment })}
                >
                  {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Status & Timeline */}
        <div className="space-y-6">
          {/* Status Actions */}
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Alterar Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {getAvailableStatuses().map((s) => {
                const info = STATUS_MAP[s.value];
                const isActive = data.status === s.value;
                const needsFoto = (s.value === "fechado" || s.value === "aguardando_aceite") && !hasFotosFechamento;
                return (
                  <Button
                    key={s.value}
                    variant={isActive ? "default" : "outline"}
                    className={`w-full justify-start gap-2 ${isActive ? "" : "bg-transparent"}`}
                    size="sm"
                    disabled={isActive || updateDesvio.isPending}
                    onClick={() => handleStatusChange(s.value)}
                    title={needsFoto ? "Envie fotos de fechamento antes de alterar para este status" : ""}
                  >
                    {info.icon} {s.label}
                    {needsFoto && <Camera className="h-3 w-3 ml-auto text-muted-foreground" />}
                  </Button>
                );
              })}
              {!hasFotosFechamento && data.status !== "fechado" && (
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  Envie fotos de fechamento para habilitar o encerramento
                </p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {data.historico && data.historico.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-4">
                    {data.historico.map((item) => {
                      const tl = TIMELINE_ICONS[item.tipo] || TIMELINE_ICONS.edicao;
                      return (
                        <div key={item.id} className="flex gap-3 relative">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${tl.color}`}>
                            {tl.icon}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <p className="text-xs font-medium">{item.descricao}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                              {item.userName && <span>{item.userName}</span>}
                              <span>{new Date(item.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sem histórico.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
