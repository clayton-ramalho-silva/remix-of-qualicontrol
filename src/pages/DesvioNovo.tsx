import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  HelpCircle, Upload, X, ArrowLeft, Loader2, MapPin, ClipboardList,
  Camera, CheckCircle2, Save, ChevronDown, ChevronUp, Sparkles, Check,
} from "lucide-react";
import PlantaPinSelector from "@/components/PlantaPinSelector";
import VoiceRecorderButton from "@/components/VoiceRecorderButton";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";

type Foto = { file: File; preview: string };

const HINTS = {
  obra: "Selecione a obra onde a inspeção está sendo realizada.",
  ambiente: "Local específico que está sendo inspecionado. Ex: Banheiro Suíte - Apto 301.",
   vertical: "Tipo de inspeção: Qualidade, Checklist ou Inspeção de Segurança.",
  data: "Data em que a inspeção está sendo realizada.",
  grupo: "Grupo técnico responsável pelo serviço onde o desvio foi identificado.",
  fornecedor: "Fornecedor responsável pela execução do serviço.",
  descricao: "Descreva o desvio observado de forma clara e objetiva.",
  prazo: "Prazo sugerido para correção do desvio.",
};

export default function DesvioNovo() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: obrasAll } = trpc.obras.list.useQuery();
  // O filtro real por vertical é feito abaixo, depois que `vertical` for definido.
  const { data: fornecedoresDb } = trpc.fornecedores.list.useQuery();
  const { data: grupos } = trpc.grupos.list.useQuery();

  const createDesvio = trpc.desvios.create.useMutation();
  const uploadFoto = trpc.fotos.upload.useMutation();

  // ---------- Etapa 1: Contexto ----------
  const [step, setStep] = useState<1 | 2>(1);
  const [contextCollapsed, setContextCollapsed] = useState(false);
  const [obraId, setObraId] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const [vertical, setVertical] = useState<"" | "qualidade" | "checklist" | "qsms">("");
  const coverColByVertical = {
    qualidade: "cobertura_qualidade",
    checklist: "cobertura_checklist",
    qsms: "cobertura_qsms",
  } as const;
  const obras = vertical
    ? obrasAll?.filter((o: any) => Number(o[coverColByVertical[vertical]] ?? 0) > 0)
    : obrasAll;
  const [dataInspecao, setDataInspecao] = useState(new Date().toISOString().split("T")[0]);
  const [plantaId, setPlantaId] = useState<number | null>(null);
  const [pinX, setPinX] = useState<string | null>(null);
  const [pinY, setPinY] = useState<string | null>(null);

  // Ambientes detectados nas plantas da obra
  const { data: ambientesObra } = trpc.plantaAmbientes.listByObra.useQuery(
    { obraId: parseInt(obraId) },
    { enabled: !!obraId }
  );
  const [ambienteOpen, setAmbienteOpen] = useState(false);
  const [ambienteSearch, setAmbienteSearch] = useState("");

  // ---------- Etapa 2: Desvio (form atual + contador) ----------
  const [grupoId, setGrupoId] = useState("");
  const [grupoSearch, setGrupoSearch] = useState("");
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [severidade, setSeveridade] = useState<"leve" | "moderado" | "grave">("moderado");
  const [prazoSugerido, setPrazoSugerido] = useState("");
  const [tagCritico, setTagCritico] = useState(false);
  const [tagDepProjeto, setTagDepProjeto] = useState(false);
  const [tagPendenteGo, setTagPendenteGo] = useState(false);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [registrados, setRegistrados] = useState<{ id: number; descricao: string }[]>([]);

  // ---------- Helpers ----------
  const obraSelecionada = obras?.find(o => String(o.id) === obraId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const novas = Array.from(files).map(file => ({ file, preview: URL.createObjectURL(file) }));
    setFotos(prev => [...prev, ...novas]);
    e.target.value = "";
  };

  const removeFoto = (i: number) => {
    setFotos(prev => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const resetForm = () => {
    setGrupoId("");
    setGrupoSearch("");
    setFornecedorNome("");
    setDescricao("");
    setSeveridade("moderado");
    setPrazoSugerido("");
    setTagCritico(false);
    setTagDepProjeto(false);
    setTagPendenteGo(false);
    fotos.forEach(f => URL.revokeObjectURL(f.preview));
    setFotos([]);
  };

  const iniciarInspecao = () => {
    if (!obraId) { toast.error("Selecione a obra"); return; }
    if (!ambiente.trim()) { toast.error("Informe o ambiente/local"); return; }
    setStep(2);
    setContextCollapsed(true);
  };

  const salvarDesvio = async (continuar: boolean) => {
    if (!grupoId) { toast.error("Selecione o grupo"); return; }
    if (!descricao.trim()) { toast.error("Descreva o desvio"); return; }
    if (!vertical) { toast.error("Selecione a vertical"); return; }
    const grupo = grupos?.find(g => g.id === parseInt(grupoId));

    setSubmitting(true);
    try {
      const result = await createDesvio.mutateAsync({
        obraId: parseInt(obraId),
        disciplina: grupo ? `${grupo.codigo} - ${grupo.nome}` : "",
        grupoId: parseInt(grupoId),
        fornecedorNome: fornecedorNome || undefined,
        descricao,
        localizacao: ambiente,
        severidade,
        origem: vertical,
        tagCritico: tagCritico ? 1 : 0,
        tagSegurancaTrabalho: tagDepProjeto ? 1 : 0,
        tagSolicitadoCliente: tagPendenteGo ? 1 : 0,
        dataIdentificacao: new Date(dataInspecao).getTime(),
        prazoSugerido: prazoSugerido ? new Date(prazoSugerido).getTime() : undefined,
        plantaId: plantaId || undefined,
        pinX: pinX || undefined,
        pinY: pinY || undefined,
      });

      for (const foto of fotos) {
        const base64 = await new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(foto.file);
        });
        await uploadFoto.mutateAsync({
          desvioId: result.id,
          fileBase64: base64,
          fileName: foto.file.name,
          contentType: foto.file.type,
          tipo: "abertura",
        });
      }

      setRegistrados(prev => [...prev, { id: result.id, descricao }]);
      utils.desvios.list.invalidate();
      utils.kpis.get.invalidate();

      if (continuar) {
        toast.success(`Desvio #${registrados.length + 1} registrado. Próximo!`);
        resetForm();
      } else {
        toast.success(`Inspeção concluída: ${registrados.length + 1} desvio(s) registrado(s)`);
        setLocation("/desvios");
      }
    } catch (err) {
      toast.error("Erro ao registrar desvio. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Render ----------
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/desvios")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-600" />
            Modo Inspeção
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Registre múltiplos desvios no mesmo ambiente de forma rápida
          </p>
        </div>
      </div>

      {/* ---------- Etapa 1 ---------- */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-600" />
              Contexto da Inspeção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Obra" hint={HINTS.obra} required>
              <Select value={obraId} onValueChange={setObraId}>
                <SelectTrigger><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                <SelectContent>
                  {obras?.map(o => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.codigo} - {o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Ambiente / Local" hint={HINTS.ambiente} required>
                <AmbienteCombo
                  value={ambiente}
                  onChange={setAmbiente}
                  ambientes={ambientesObra || []}
                  open={ambienteOpen}
                  setOpen={setAmbienteOpen}
                  search={ambienteSearch}
                  setSearch={setAmbienteSearch}
                />
              </Field>

              <Field label="Vertical *" hint={HINTS.vertical} required>
                <Select value={vertical} onValueChange={v => setVertical(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a vertical..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualidade">Qualidade</SelectItem>
                    <SelectItem value="checklist">Checklist</SelectItem>
                     <SelectItem value="qsms">QSMS</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Data da Inspeção" hint={HINTS.data}>
              <Input type="date" value={dataInspecao} onChange={e => setDataInspecao(e.target.value)} />
            </Field>

            {obraId && (
              <PlantaPinSelector
                obraId={parseInt(obraId)}
                plantaId={plantaId}
                pinX={pinX}
                pinY={pinY}
                onChange={({ plantaId: pId, pinX: px, pinY: py }) => {
                  setPlantaId(pId); setPinX(px); setPinY(py);
                }}
              />
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={iniciarInspecao} className="bg-teal-600 hover:bg-teal-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Iniciar Inspeção
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- Etapa 2 ---------- */}
      {step === 2 && (
        <>
          {/* Banner do contexto */}
          <Card className="bg-teal-50/40 border-teal-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-teal-600" />
                  <div className="text-sm">
                    <span className="font-semibold text-slate-900">Contexto da Inspeção</span>
                    <span className="text-slate-500 ml-2">
                      {obraSelecionada?.codigo} - {obraSelecionada?.nome} | {ambiente}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStep(1); setContextCollapsed(false); }}
                >
                  Editar
                  {contextCollapsed ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronUp className="h-4 w-4 ml-1" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Form do desvio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4 text-teal-600" />
                Registrar Desvio
                <span className="text-xs font-normal text-slate-400 ml-2">
                  #{registrados.length + 1} nesta inspeção
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Fotos */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Fotos de Evidência</Label>
                <div className="flex flex-wrap gap-3">
                  {fotos.map((foto, i) => (
                    <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border bg-muted">
                      <img src={foto.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFoto(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <PhotoPickerButton onFiles={handleFileChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Grupo" hint={HINTS.grupo} required>
                  <Select value={grupoId} onValueChange={setGrupoId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o grupo..." /></SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <Input
                          placeholder="Buscar grupo..."
                          value={grupoSearch}
                          onChange={e => setGrupoSearch(e.target.value)}
                          className="h-8 text-sm"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                        />
                      </div>
                      {(grupos || []).filter(g => {
                        if (!grupoSearch) return true;
                        const term = grupoSearch.toLowerCase();
                        return g.nome.toLowerCase().includes(term) || g.codigo.toLowerCase().includes(term);
                      }).slice(0, 50).map(g => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.codigo} - {g.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Fornecedor" hint={HINTS.fornecedor}>
                  <Select value={fornecedorNome} onValueChange={setFornecedorNome}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {fornecedoresDb?.map(f => (
                        <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Descrição" hint={HINTS.descricao} required>
                <div className="relative">
                  <Textarea
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    placeholder="Descreva o que foi observado... ou clique no microfone para ditar."
                    rows={4}
                    className="resize-none pr-12"
                  />
                  <div className="absolute top-2 right-2">
                    <VoiceRecorderButton
                      value={descricao}
                      onAppend={setDescricao}
                      contexto="descrição de desvio em obra civil"
                    />
                  </div>
                </div>
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Severidade" hint="Leve / Moderado / Grave">
                  <Select value={severidade} onValueChange={v => setSeveridade(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="moderado">Moderado</SelectItem>
                      <SelectItem value="grave">Grave</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Prazo Sugerido" hint={HINTS.prazo}>
                  <Input type="date" value={prazoSugerido} onChange={e => setPrazoSugerido(e.target.value)} />
                </Field>
              </div>

              {/* Classificações */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Classificações</Label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={tagCritico} onCheckedChange={c => setTagCritico(!!c)} />
                    <span className="text-sm flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                      Chamado Crítico
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={tagDepProjeto} onCheckedChange={c => setTagDepProjeto(!!c)} />
                    <span className="text-sm flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                      Dep. Definição Projeto/Contratação
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={tagPendenteGo} onCheckedChange={c => setTagPendenteGo(!!c)} />
                    <span className="text-sm flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                      Pendente Agendamento GO
                    </span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumo dos já registrados */}
          {registrados.length > 0 && (
            <Card className="bg-emerald-50/40 border-emerald-200">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-emerald-800 mb-2">
                  Desvios registrados nesta inspeção ({registrados.length})
                </p>
                <ul className="space-y-1">
                  {registrados.map((r, i) => (
                    <li key={r.id} className="text-xs text-emerald-700 flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">#{i + 1} — {r.descricao}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setLocation("/desvios")}>
              Cancelar
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={submitting || registrados.length === 0}
                onClick={() => setLocation("/desvios")}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Concluir Inspeção
              </Button>
              <Button
                disabled={submitting}
                onClick={() => salvarDesvio(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Salvar e Continuar</>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, hint, required, children }: {
  label: string; hint: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  );
}

function AmbienteCombo({
  value, onChange, ambientes, open, setOpen, search, setSearch,
}: {
  value: string;
  onChange: (v: string) => void;
  ambientes: any[];
  open: boolean;
  setOpen: (o: boolean) => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  const formatLabel = (a: any) => {
    const parts = [a.nome];
    if (a.numero) parts.push(`#${a.numero}`);
    const sub = [a.pavimento, a.plantaNome].filter(Boolean).join(" · ");
    return { main: parts.join(" "), sub };
  };

  const term = search.toLowerCase().trim();
  const filtered = (ambientes || []).filter((a: any) => {
    if (!term) return true;
    return (
      a.nome?.toLowerCase().includes(term) ||
      a.numero?.toLowerCase?.().includes(term) ||
      a.pavimento?.toLowerCase?.().includes(term)
    );
  });

  const hasAmbientes = (ambientes || []).length > 0;

  if (!hasAmbientes) {
    return (
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Ex: Banheiro Suíte - Apto 301"
      />
    );
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={value}
              onChange={e => { onChange(e.target.value); setSearch(e.target.value); if (!open) setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Selecione ou digite o ambiente…"
              className="pr-9"
            />
            <Sparkles className="h-3.5 w-3.5 text-violet-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 max-h-72 overflow-y-auto"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-1">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-violet-500" />
              Ambientes detectados ({filtered.length})
            </div>
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                Nenhum ambiente correspondente. Você pode digitar livremente.
              </div>
            ) : (
              filtered.map((a: any) => {
                const { main, sub } = formatLabel(a);
                const label = `${main}${sub ? " — " + sub : ""}`;
                const selected = value === main || value === label;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2"
                    onClick={() => { onChange(main); setOpen(false); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{main}</div>
                      {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
                    </div>
                    {selected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
