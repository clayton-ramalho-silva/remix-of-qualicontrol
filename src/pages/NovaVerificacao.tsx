import { useState, useEffect, useRef } from "react";
import { useDraftAutosave, loadDraft, useDraftId } from "@/hooks/useDraftAutosave";
import DraftRestoredBanner from "@/components/DraftRestoredBanner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VoiceRecorderButton from "@/components/VoiceRecorderButton";
import RespostaFotosUploader, { type RespostaFoto } from "@/components/RespostaFotosUploader";
import VistoriaFotosUploader from "@/components/VistoriaFotosUploader";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ObraSelect from "@/components/ObraSelect";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  ClipboardCheck, Info, CheckCircle2, XCircle, AlertTriangle, MinusCircle,
  Building2, User, Calendar, ChevronDown, ChevronUp, Send
} from "lucide-react";

type Resposta = "AT" | "NAT" | "GR" | "NA";

interface RespostaItem {
  itemId: number;
  resposta: Resposta;
  observacao: string;
  fotos?: RespostaFoto[];
}

type Props = {
  categoria?: string;
  titulo?: string;
  rotaBase?: string;
};

export default function NovaVerificacao({
  categoria = "qualidade",
  titulo = "Nova Verificação de Qualidade",
  rotaBase = "/verificacoes",
}: Props) {
  const [, navigate] = useLocation();
  const { data: obrasAll } = trpc.obras.list.useQuery();
  // Verificação de qualidade só lista obras cobertas pela equipe de Qualidade.
  const obras = obrasAll?.filter((o: any) => Number(o.cobertura_qualidade ?? 0) > 0);
  const { data: checklist, isLoading } = trpc.checklist.getCompleto.useQuery({ categoria });
  const createVerificacao = trpc.verificacoes.create.useMutation();

  const { data: membros } = trpc.membros.list.useQuery();

  const [obraId, setObraId] = useState<number | null>(null);
  const [edificioId, setEdificioId] = useState<number | null>(null);
  const [andarId, setAndarId] = useState<number | null>(null);
  const [avaliadorId, setAvaliadorId] = useState<string>("");

  const [dataVistoria, setDataVistoria] = useState(new Date().toISOString().split("T")[0]);
  const [goNome, setGoNome] = useState<string>("");
  const [gcNome, setGcNome] = useState<string>("");
  const [nucleo, setNucleo] = useState("");
  const [diretoria, setDiretoria] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [respostas, setRespostas] = useState<Record<number, RespostaItem>>({});
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [plantaUrl, setPlantaUrl] = useState<string | null>(null);
  const [plantaFileKey, setPlantaFileKey] = useState<string | null>(null);
  const [uploadingPlanta, setUploadingPlanta] = useState(false);
  const plantaInputRef = useRef<HTMLInputElement>(null);
  const isVistoria = categoria === "vistoria";

  // Auto-save de rascunho — vários rascunhos podem coexistir, identificados
  // pelo parâmetro `?draft=<id>` na URL. Se a URL não trouxer um id, é gerado
  // um novo (o rascunho só é persistido quando o usuário começar a preencher).
  const { key: draftKey, isResumed } = useDraftId(`verificacao:${categoria}`);
  const restoredRef = useRef(false);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (!isResumed) return;
    const d: any = loadDraft(draftKey);
    if (d) {
      if (d.obraId != null) setObraId(d.obraId);
      if (d.edificioId != null) setEdificioId(d.edificioId);
      if (d.andarId != null) setAndarId(d.andarId);
      if (d.avaliadorId) setAvaliadorId(d.avaliadorId);

      if (d.dataVistoria) setDataVistoria(d.dataVistoria);
      if (d.goNome) setGoNome(d.goNome);
      if (d.gcNome) setGcNome(d.gcNome);
      if (d.nucleo) setNucleo(d.nucleo);
      if (d.diretoria) setDiretoria(d.diretoria);
      if (d.observacoes) setObservacoes(d.observacoes);
      if (d.respostas) setRespostas(d.respostas);
      if (d.plantaUrl) setPlantaUrl(d.plantaUrl);
      if (d.plantaFileKey) setPlantaFileKey(d.plantaFileKey);
      setRestoredAt(d.__savedAt ?? Date.now());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const { clearDraft: clearDraftFn, markClean } = useDraftAutosave({
    key: draftKey,
    data: { obraId, edificioId, andarId, avaliadorId, dataVistoria, goNome, gcNome, nucleo, diretoria, observacoes, respostas, plantaUrl, plantaFileKey },

  });

  const handlePlantaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPlanta(true);
    try {
      const file = files[0];
      const compressed = await compressImage(file, { maxDim: 2400, quality: 0.85 });
      const key = `vistoria-plantas/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from("evidencias").upload(key, compressed, {
        contentType: compressed.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      // Remover planta anterior (se houver)
      if (plantaFileKey) {
        supabase.storage.from("evidencias").remove([plantaFileKey]).catch(() => {});
      }
      const { data: pub } = supabase.storage.from("evidencias").getPublicUrl(key);
      setPlantaUrl(pub.publicUrl);
      setPlantaFileKey(key);
      toast.success("Planta da vistoria carregada.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar planta");
    } finally {
      setUploadingPlanta(false);
      if (plantaInputRef.current) plantaInputRef.current.value = "";
    }
  };

  const discardDraft = () => {
    clearDraftFn();
    markClean();
    setRestoredAt(null);
    window.location.reload();
  };

  // Filtrar membros por cargo
  const avaliadores = membros?.filter(m => m.cargo === "avaliador" && m.ativo) || [];

  // Nome resolvido do avaliador
  const avaliadorNome = membros?.find(m => String(m.id) === avaliadorId)?.nome || "";

  // Pré-preencher GO, GC e Núcleo a partir da obra selecionada
  const handleObraChange = (obraIdStr: string) => {
    const newObraId = Number(obraIdStr);
    setObraId(newObraId);
    setEdificioId(null);
    setAndarId(null);
    const obra: any = obrasAll?.find((o: any) => o.id === newObraId);
    setGoNome(obra?.gerente_obra ?? "");
    setGcNome(obra?.gerente_contrato ?? "");
    setNucleo(obra?.nucleo ?? "");
  };

  // Edifícios + andares da obra selecionada
  const { data: edificiosData } = trpc.edificios.listByObra.useQuery(
    { obraId: obraId ?? 0 },
    { enabled: !!obraId }
  );
  const edificios: any[] = (edificiosData as any) || [];
  const andaresDoEdificio: any[] = (edificios.find((e: any) => e.id === edificioId)?.andares) || [];



  const exigeFoto = categoria === "vistoria";

  const setResposta = (itemId: number, resposta: Resposta) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        itemId,
        resposta,
        observacao: prev[itemId]?.observacao || "",
        fotos: prev[itemId]?.fotos || [],
      },
    }));
  };

  const setObsItem = (itemId: number, observacao: string) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        itemId,
        resposta: prev[itemId]?.resposta || "NA",
        observacao,
        fotos: prev[itemId]?.fotos || [],
      },
    }));
  };

  const setFotosItem = (itemId: number, fotos: RespostaFoto[]) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        itemId,
        resposta: prev[itemId]?.resposta || "NA",
        observacao: prev[itemId]?.observacao || "",
        fotos,
      },
    }));
  };

  const toggleSection = (secaoId: number) => {
    setExpandedSections(prev => ({ ...prev, [secaoId]: !prev[secaoId] }));
  };

  const getRespostaStyle = (resp: Resposta, selected: boolean) => {
    const base = "flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ";
    if (!selected) return base + "border-gray-200 text-gray-400 hover:border-gray-300 bg-white";
    switch (resp) {
      case "AT": return base + "border-emerald-500 bg-emerald-50 text-emerald-700";
      case "NAT": return base + "border-amber-500 bg-amber-50 text-amber-700";
      case "GR": return base + "border-red-500 bg-red-50 text-red-700";
      case "NA": return base + "border-slate-400 bg-slate-50 text-slate-600";
    }
  };

  const getSecaoStats = (secaoId: number) => {
    const secao = checklist?.find(s => s.id === secaoId);
    if (!secao) return { total: 0, respondidos: 0, at: 0, nat: 0, gr: 0, na: 0 };
    const itens = secao.itens || [];
    let at = 0, nat = 0, gr = 0, na = 0;
    itens.forEach(item => {
      const r = respostas[item.id]?.resposta;
      if (r === "AT") at++;
      else if (r === "NAT") nat++;
      else if (r === "GR") gr++;
      else if (r === "NA") na++;
    });
    return { total: itens.length, respondidos: at + nat + gr + na, at, nat, gr, na };
  };

  const handleSubmit = async () => {
    if (!obraId) { toast.error("Selecione uma obra"); return; }
    if (!avaliadorId) { toast.error("Selecione o avaliador"); return; }

    const allItems = checklist?.flatMap(s => s.itens) || [];
    const missing = allItems.filter(item => !respostas[item.id]?.resposta);
    if (missing.length > 0) {
      toast.error(`Ainda faltam ${missing.length} itens para responder`);
      return;
    }

    if (exigeFoto) {
      const semFoto = allItems.filter(item => {
        const r = respostas[item.id];
        if (!r || r.resposta === "NA") return false;
        return !(r.fotos && r.fotos.length > 0);
      });
      if (semFoto.length > 0) {
        toast.error(`${semFoto.length} item(ns) sem foto de evidência. Adicione ao menos 1 foto em cada item Atende, Não Atende ou Grave.`);
        return;
      }
    }

    if (isVistoria) {
      if (!plantaUrl) {
        toast.error("Faça upload da planta da vistoria antes de salvar.");
        return;
      }
      const semPin = allItems.some(item => {
        const r = respostas[item.id];
        if (!r || r.resposta === "NA") return false;
        return (r.fotos || []).some(f => f.pinX == null || f.pinY == null);
      });
      if (semPin) {
        toast.error("Há fotos sem pin marcado na planta. Marque o pin em todas as fotos.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await createVerificacao.mutateAsync({
        obraId,
        edificioId: edificioId ?? undefined,
        andarId: andarId ?? undefined,
        categoria,

        avaliador: avaliadorNome,
        dataVistoria: new Date(dataVistoria).getTime(),
        go: goNome || undefined,
        gc: gcNome || undefined,
        nucleo: nucleo || undefined,
        diretoria: diretoria || undefined,
        observacoes: observacoes || undefined,
        plantaUrl: plantaUrl || undefined,
        plantaFileKey: plantaFileKey || undefined,
        respostas: Object.values(respostas).map(r => ({
          itemId: r.itemId,
          resposta: r.resposta,
          observacao: r.observacao || undefined,
          fotos: r.fotos || [],
        })),
      });
      clearDraftFn(); markClean();
      toast.success(`Verificação salva! Score geral: ${result.scores.scoreGeral}% — ${result.scores.statusGeral}`);
      navigate(`${rotaBase}/${result.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar verificação");
    } finally {
      setSubmitting(false);
    }
  };

  const totalItens = checklist?.reduce((sum, s) => sum + (s.itens?.length || 0), 0) || 0;
  const totalRespondidos = Object.values(respostas).filter(r => r.resposta).length;
  const progresso = totalItens > 0 ? Math.round((totalRespondidos / totalItens) * 100) : 0;

  return (
    <div className="space-y-6">
      <DraftRestoredBanner savedAt={restoredAt} onDiscard={discardDraft} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-teal-600" />
            {titulo}
          </h1>
          <p className="text-slate-500 mt-1">Preencha o checklist de verificação conforme inspeção em campo</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2 border-teal-200 bg-teal-50 text-teal-700">
          {totalRespondidos}/{totalItens} ({progresso}%)
        </Badge>
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-teal-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progresso}%` }}
        />
      </div>

      {/* Dados da Verificação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-teal-600" />
            Dados da Verificação
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label className="flex items-center gap-1.5">
              Obra *
              <Tooltip>
                <TooltipTrigger><Info className="h-3.5 w-3.5 text-slate-400" /></TooltipTrigger>
                <TooltipContent>Selecione a obra que será inspecionada nesta verificação</TooltipContent>
              </Tooltip>
            </Label>
            <ObraSelect
              obras={obras}
              value={obraId ? String(obraId) : ""}
              onValueChange={handleObraChange}
              placeholder="Selecione a obra..."
              className="mt-1 w-full"
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">
              Avaliador *
              <Tooltip>
                <TooltipTrigger><Info className="h-3.5 w-3.5 text-slate-400" /></TooltipTrigger>
                <TooltipContent>Selecione o profissional responsável pela inspeção (cadastrado como Avaliador)</TooltipContent>
              </Tooltip>
            </Label>
            <Select value={avaliadorId} onValueChange={setAvaliadorId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o avaliador..." /></SelectTrigger>
              <SelectContent>
                {avaliadores.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                ))}
                {avaliadores.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum avaliador cadastrado em Usuários</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="flex items-center gap-1.5">
              Data da Vistoria *
              <Tooltip>
                <TooltipTrigger><Info className="h-3.5 w-3.5 text-slate-400" /></TooltipTrigger>
                <TooltipContent>Data em que a inspeção foi realizada em campo</TooltipContent>
              </Tooltip>
            </Label>
            <Input className="mt-1" type="date" value={dataVistoria} onChange={e => setDataVistoria(e.target.value)} />
          </div>
          <div>
            <Label>Gerente de Obra (GO)</Label>
            <Input className="mt-1" placeholder="Selecione uma obra..." value={goNome} onChange={e => setGoNome(e.target.value)} />
          </div>
          <div>
            <Label>Gerente de Contrato (GC)</Label>
            <Input className="mt-1" placeholder="Selecione uma obra..." value={gcNome} onChange={e => setGcNome(e.target.value)} />
          </div>
          <div>
            <Label>Núcleo</Label>
            <Input className="mt-1" placeholder="Selecione uma obra..." value={nucleo} onChange={e => setNucleo(e.target.value)} />
          </div>
          <div>
            <Label>Edifício</Label>
            <Select
              value={edificioId ? String(edificioId) : ""}
              onValueChange={(v) => { setEdificioId(v ? Number(v) : null); setAndarId(null); }}
              disabled={!obraId || edificios.length === 0}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={!obraId ? "Selecione a obra primeiro..." : edificios.length === 0 ? "Nenhum edifício cadastrado" : "Selecione o edifício..."} />
              </SelectTrigger>
              <SelectContent>
                {edificios.map((e: any) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.codigo ? `${e.codigo} - ${e.nome}` : e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Andar</Label>
            <Select
              value={andarId ? String(andarId) : ""}
              onValueChange={(v) => setAndarId(v ? Number(v) : null)}
              disabled={!edificioId || andaresDoEdificio.length === 0}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={!edificioId ? "Selecione o edifício primeiro..." : andaresDoEdificio.length === 0 ? "Nenhum andar cadastrado" : "Selecione o andar..."} />
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                {andaresDoEdificio.map((a: any) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.numero != null ? `${a.numero} - ${a.nome}` : a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isVistoria && (
            <div>
              <Label className="flex items-center gap-1.5">
                Planta desta vistoria *
                <Tooltip>
                  <TooltipTrigger><Info className="h-3.5 w-3.5 text-slate-400" /></TooltipTrigger>
                  <TooltipContent>Planta avulsa usada apenas nesta vistoria, para posicionar pins das fotos. Não altera o cadastro da obra.</TooltipContent>
                </Tooltip>
              </Label>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => plantaInputRef.current?.click()}
                  disabled={!obraId || !andarId || uploadingPlanta}
                  title={!obraId || !andarId ? "Selecione obra e andar primeiro" : "Selecionar planta"}
                >
                  {uploadingPlanta ? "Enviando..." : plantaUrl ? "Substituir" : "Selecionar Planta"}
                </Button>
                <input
                  ref={plantaInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePlantaUpload(e.target.files)}
                />
                {plantaUrl && (
                  <>
                    <img src={plantaUrl} alt="Planta da vistoria" className="h-9 w-12 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => {
                        if (plantaFileKey) supabase.storage.from("evidencias").remove([plantaFileKey]).catch(() => {});
                        setPlantaUrl(null); setPlantaFileKey(null);
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </>
                )}
              </div>
            </div>
          )}





        </CardContent>
      </Card>

      {/* Seções do Checklist */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Carregando checklist...</div>
      ) : (
        checklist?.map(secao => {
          const stats = getSecaoStats(secao.id);
          const isExpanded = expandedSections[secao.id] !== false; // default expanded
          return (
            <Card key={secao.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleSection(secao.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                    {secao.numero}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{secao.titulo}</h3>
                    <p className="text-xs text-slate-500">
                      Peso: {secao.peso} | {stats.respondidos}/{stats.total} respondidos
                      {stats.gr > 0 && <span className="text-red-500 ml-2">| {stats.gr} grave(s)</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {stats.at > 0 && <Badge className="bg-emerald-100 text-emerald-700 text-xs">{stats.at} AT</Badge>}
                    {stats.nat > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{stats.nat} NAT</Badge>}
                    {stats.gr > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{stats.gr} GR</Badge>}
                    {stats.na > 0 && <Badge className="bg-slate-100 text-slate-600 text-xs">{stats.na} NA</Badge>}
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </div>
              </div>

              {isExpanded && (
                <CardContent className="border-t pt-4 space-y-4">
                  {secao.itens?.map((item: any) => {
                    const currentResp = respostas[item.id]?.resposta;
                    return (
                      <div key={item.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-3">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-xs">{item.codigo}</Badge>
                          <p className="text-sm text-slate-700 leading-relaxed">{item.descricao}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button className={getRespostaStyle("AT", currentResp === "AT")} onClick={() => setResposta(item.id, "AT")}>
                            <CheckCircle2 className="h-4 w-4" /> Atende
                          </button>
                          <button className={getRespostaStyle("NAT", currentResp === "NAT")} onClick={() => setResposta(item.id, "NAT")}>
                            <XCircle className="h-4 w-4" /> Não Atende
                          </button>
                          <button className={getRespostaStyle("GR", currentResp === "GR")} onClick={() => setResposta(item.id, "GR")}>
                            <AlertTriangle className="h-4 w-4" /> Grave
                          </button>
                          <button className={getRespostaStyle("NA", currentResp === "NA")} onClick={() => setResposta(item.id, "NA")}>
                            <MinusCircle className="h-4 w-4" /> N/A
                          </button>
                        </div>
                        {(currentResp === "NAT" || currentResp === "GR") && (
                          <div className="relative">
                            <Textarea
                              placeholder="Descreva o desvio encontrado... ou clique no microfone para ditar."
                              className="text-sm pr-12"
                              value={respostas[item.id]?.observacao || ""}
                              onChange={e => setObsItem(item.id, e.target.value)}
                            />
                            <div className="absolute top-2 right-2">
                              <VoiceRecorderButton
                                value={respostas[item.id]?.observacao || ""}
                                onAppend={(v) => setObsItem(item.id, v)}
                                contexto={`desvio do item ${item.codigo}: ${item.descricao}`}
                              />
                            </div>
                          </div>
                        )}
                        {exigeFoto && currentResp && currentResp !== "NA" && (
                          isVistoria ? (
                            <VistoriaFotosUploader
                              fotos={respostas[item.id]?.fotos || []}
                              onChange={(f) => setFotosItem(item.id, f)}
                              plantaUrl={plantaUrl}
                              itemCodigo={item.codigo}
                            />
                          ) : (
                            <RespostaFotosUploader
                              fotos={respostas[item.id]?.fotos || []}
                              onChange={(f) => setFotosItem(item.id, f)}
                            />
                          )
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      {/* Observações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Textarea
              placeholder="Registre observações gerais sobre a verificação... ou clique no microfone para ditar."
              rows={4}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="pr-12"
            />
            <div className="absolute top-2 right-2">
              <VoiceRecorderButton
                value={observacoes}
                onAppend={setObservacoes}
                contexto="observações gerais sobre verificação em obra"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão de Envio */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate(rotaBase)}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || progresso < 100}
          className="bg-teal-600 hover:bg-teal-700 text-white px-8"
        >
          {submitting ? "Salvando..." : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Finalizar Verificação
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
