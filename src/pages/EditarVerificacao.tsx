import { useState, useEffect, useRef } from "react";
import { useDraftAutosave, loadDraft } from "@/hooks/useDraftAutosave";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import {
  ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, MinusCircle,
  ChevronDown, ChevronUp, Save, ArrowLeft
} from "lucide-react";

type Resposta = "AT" | "NAT" | "GR" | "NA";

type Props = { rotaBase?: string };

export default function EditarVerificacao({ rotaBase = "/verificacoes" }: Props) {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const { data: verificacao, isLoading } = trpc.verificacoes.getById.useQuery({ id }, { enabled: !!id });
  const updateVerificacao = trpc.verificacoes.update.useMutation();

  const [dataVistoria, setDataVistoria] = useState("");
  const [nucleo, setNucleo] = useState("");
  const [diretoria, setDiretoria] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [respostas, setRespostas] = useState<Record<number, { itemId: number; resposta: Resposta; observacao: string; fotos?: RespostaFoto[] }>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [plantaUrl, setPlantaUrl] = useState<string | null>(null);
  const [plantaFileKey, setPlantaFileKey] = useState<string | null>(null);
  const [uploadingPlanta, setUploadingPlanta] = useState(false);
  const plantaInputRef = useRef<HTMLInputElement>(null);

  const isVistoria = (verificacao as any)?.categoria === "vistoria";
  const exigeFoto = (verificacao as any)?.categoria === "vistoria";
  const draftKey = `draft:verificacao-edit:${id}`;
  const restoredRef = useRef(false);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);

  useEffect(() => {
    if (!verificacao) return;
    // 1) carrega defaults do servidor
    setDataVistoria(new Date(verificacao.dataVistoria).toISOString().split("T")[0]);
    setNucleo(verificacao.nucleo || "");
    setDiretoria(verificacao.diretoria || "");
    setObservacoes(verificacao.observacoes || "");
    setPlantaUrl((verificacao as any).plantaUrl || null);
    setPlantaFileKey((verificacao as any).plantaFileKey || null);
    const map: Record<number, any> = {};
    (verificacao.respostas || []).forEach((r: any) => {
      map[r.itemId] = {
        itemId: r.itemId,
        resposta: r.resposta,
        observacao: r.observacao || "",
        fotos: r.fotos || [],
      };
    });
    setRespostas(map);

    // 2) se houver rascunho local mais recente, sobrescreve
    if (!restoredRef.current) {
      const d: any = loadDraft(draftKey);
      const serverTime = new Date((verificacao as any).updatedAt || verificacao.dataVistoria).getTime();
      if (d && (d.__savedAt ?? 0) > serverTime) {
        if (d.dataVistoria) setDataVistoria(d.dataVistoria);
        if (d.nucleo !== undefined) setNucleo(d.nucleo);
        if (d.diretoria !== undefined) setDiretoria(d.diretoria);
        if (d.observacoes !== undefined) setObservacoes(d.observacoes);
        if (d.respostas) setRespostas(d.respostas);
        if (d.plantaUrl !== undefined) setPlantaUrl(d.plantaUrl);
        if (d.plantaFileKey !== undefined) setPlantaFileKey(d.plantaFileKey);
        setRestoredAt(d.__savedAt ?? Date.now());
      }
      restoredRef.current = true;
    }
  }, [verificacao, draftKey]);

  const { clearDraft: clearDraftFn, markClean } = useDraftAutosave({
    key: verificacao ? draftKey : null,
    data: { dataVistoria, nucleo, diretoria, observacoes, respostas, plantaUrl, plantaFileKey },
    enabled: !!verificacao,
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

  const setResposta = (itemId: number, resposta: Resposta) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], itemId, resposta, observacao: prev[itemId]?.observacao || "", fotos: prev[itemId]?.fotos || [] },
    }));
  };
  const setObsItem = (itemId: number, observacao: string) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], itemId, resposta: prev[itemId]?.resposta || "NA", observacao, fotos: prev[itemId]?.fotos || [] },
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

  const getStyle = (resp: Resposta, selected: boolean) => {
    const base = "flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ";
    if (!selected) return base + "border-gray-200 text-gray-400 hover:border-gray-300 bg-white";
    switch (resp) {
      case "AT": return base + "border-emerald-500 bg-emerald-50 text-emerald-700";
      case "NAT": return base + "border-amber-500 bg-amber-50 text-amber-700";
      case "GR": return base + "border-red-500 bg-red-50 text-red-700";
      case "NA": return base + "border-slate-400 bg-slate-50 text-slate-600";
    }
  };

  const handleSubmit = async () => {
    if (exigeFoto) {
      const semFoto = Object.values(respostas).filter(r => r.resposta !== "NA" && !(r.fotos && r.fotos.length > 0));
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
      const semPin = Object.values(respostas).some(r => {
        if (r.resposta === "NA") return false;
        return (r.fotos || []).some((f: any) => f.pinX == null || f.pinY == null);
      });
      if (semPin) {
        toast.error("Há fotos sem pin marcado na planta. Marque o pin em todas as fotos.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const result = await updateVerificacao.mutateAsync({
        id,
        dataVistoria: new Date(dataVistoria).getTime(),
        nucleo: nucleo || null,
        diretoria: diretoria || null,
        observacoes: observacoes || null,
        plantaUrl: plantaUrl || null,
        plantaFileKey: plantaFileKey || null,
        respostas: Object.values(respostas).map(r => ({
          itemId: r.itemId,
          resposta: r.resposta,
          observacao: r.observacao || undefined,
          fotos: r.fotos || [],
        })),
      });
      clearDraftFn(); markClean();
      toast.success(`Verificação atualizada! Score: ${result.scores.scoreGeral}% — ${result.scores.statusGeral}`);
      navigate(`${rotaBase}/${id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !verificacao) {
    return <div className="text-center py-12 text-slate-500">Carregando...</div>;
  }

  const checklist = (verificacao as any).checklist || [];
  const totalItens = checklist.reduce((sum: number, s: any) => sum + (s.itens?.length || 0), 0);
  const totalRespondidos = Object.values(respostas).filter(r => r.resposta).length;
  const progresso = totalItens > 0 ? Math.round((totalRespondidos / totalItens) * 100) : 0;

  return (
    <div className="space-y-6">
      <DraftRestoredBanner savedAt={restoredAt} onDiscard={discardDraft} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`${rotaBase}/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-7 w-7 text-teal-600" />
              Editar Verificação #{id}
            </h1>
            <p className="text-slate-500 mt-1">Avaliador: {verificacao.avaliador}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2 border-teal-200 bg-teal-50 text-teal-700">
          {totalRespondidos}/{totalItens} ({progresso}%)
        </Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Dados</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Data da Vistoria</Label>
            <Input className="mt-1" type="date" value={dataVistoria} onChange={e => setDataVistoria(e.target.value)} />
          </div>
          <div>
            <Label>Núcleo</Label>
            <Input className="mt-1" value={nucleo} onChange={e => setNucleo(e.target.value)} />
          </div>
          <div>
            <Label>Diretoria</Label>
            <Input className="mt-1" value={diretoria} onChange={e => setDiretoria(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isVistoria && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Planta da Vistoria</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => plantaInputRef.current?.click()}
                disabled={uploadingPlanta}
              >
                {uploadingPlanta ? "Enviando..." : plantaUrl ? "Substituir planta" : "Selecionar planta"}
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
                  <img src={plantaUrl} alt="Planta da vistoria" className="h-12 w-16 object-cover rounded border" />
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
              {!plantaUrl && (
                <p className="text-xs text-amber-700">A planta é obrigatória para marcar os pins das fotos.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {checklist.map((secao: any) => {
        const isExp = expanded[secao.id] !== false;
        return (
          <Card key={secao.id} className="overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50"
              onClick={() => setExpanded(p => ({ ...p, [secao.id]: !isExp }))}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                  {secao.numero}
                </div>
                <h3 className="font-semibold text-slate-900">{secao.titulo}</h3>
              </div>
              {isExp ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
            </div>
            {isExp && (
              <CardContent className="border-t pt-4 space-y-4">
                {secao.itens?.map((item: any) => {
                  const cur = respostas[item.id]?.resposta;
                  return (
                    <div key={item.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-xs">{item.codigo}</Badge>
                        <p className="text-sm text-slate-700 leading-relaxed">{item.descricao}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className={getStyle("AT", cur === "AT")} onClick={() => setResposta(item.id, "AT")}>
                          <CheckCircle2 className="h-4 w-4" /> Atende
                        </button>
                        <button className={getStyle("NAT", cur === "NAT")} onClick={() => setResposta(item.id, "NAT")}>
                          <XCircle className="h-4 w-4" /> Não Atende
                        </button>
                        <button className={getStyle("GR", cur === "GR")} onClick={() => setResposta(item.id, "GR")}>
                          <AlertTriangle className="h-4 w-4" /> Grave
                        </button>
                        <button className={getStyle("NA", cur === "NA")} onClick={() => setResposta(item.id, "NA")}>
                          <MinusCircle className="h-4 w-4" /> N/A
                        </button>
                      </div>
                      {(cur === "NAT" || cur === "GR") && (
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
                      {exigeFoto && cur && cur !== "NA" && (
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
      })}

      <Card>
        <CardHeader><CardTitle className="text-lg">Observações Gerais</CardTitle></CardHeader>
        <CardContent>
          <div className="relative">
            <Textarea
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

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate(`${rotaBase}/${id}`)}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="bg-teal-600 hover:bg-teal-700 text-white px-8">
          {submitting ? "Salvando..." : (<><Save className="h-4 w-4 mr-2" /> Salvar Alterações</>)}
        </Button>
      </div>
    </div>
  );
}