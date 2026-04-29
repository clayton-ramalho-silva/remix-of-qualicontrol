import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

export default function NovaVerificacao() {
  const [, navigate] = useLocation();
  const { data: obras } = trpc.obras.list.useQuery();
  const { data: checklist, isLoading } = trpc.checklist.getCompleto.useQuery();
  const createVerificacao = trpc.verificacoes.create.useMutation();

  const { data: membros } = trpc.membros.list.useQuery();

  const [obraId, setObraId] = useState<number | null>(null);
  const [avaliadorId, setAvaliadorId] = useState<string>("");
  const [dataVistoria, setDataVistoria] = useState(new Date().toISOString().split("T")[0]);
  const [goId, setGoId] = useState<string>("");
  const [gcId, setGcId] = useState<string>("");

  // Filtrar membros por cargo
  const avaliadores = membros?.filter(m => m.cargo === "avaliador" && m.ativo) || [];
  const gerentesObra = membros?.filter(m => m.cargo === "gerente_obra" && m.ativo) || [];
  const gerentesContrato = membros?.filter(m => m.cargo === "gerente_contrato" && m.ativo) || [];

  // Nomes resolvidos
  const avaliadorNome = membros?.find(m => String(m.id) === avaliadorId)?.nome || "";
  const goNome = membros?.find(m => String(m.id) === goId)?.nome || "";
  const gcNome = membros?.find(m => String(m.id) === gcId)?.nome || "";

  // Pré-preencher GO e GC ao selecionar obra
  const handleObraChange = (obraIdStr: string) => {
    const newObraId = Number(obraIdStr);
    setObraId(newObraId);

    // Encontrar GO vinculado à obra
    const goMembro = gerentesObra.find(m => m.obraIds?.includes(newObraId));
    if (goMembro) {
      setGoId(String(goMembro.id));
    }

    // Encontrar GC vinculado à obra
    const gcMembro = gerentesContrato.find(m => m.obraIds?.includes(newObraId));
    if (gcMembro) {
      setGcId(String(gcMembro.id));
    }
  };
  const [nucleo, setNucleo] = useState("");
  const [diretoria, setDiretoria] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [respostas, setRespostas] = useState<Record<number, RespostaItem>>({});
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const setResposta = (itemId: number, resposta: Resposta) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], itemId, resposta, observacao: prev[itemId]?.observacao || "" },
    }));
  };

  const setObsItem = (itemId: number, observacao: string) => {
    setRespostas(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], itemId, resposta: prev[itemId]?.resposta || "NA", observacao },
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

    setSubmitting(true);
    try {
      const result = await createVerificacao.mutateAsync({
        obraId,
        avaliador: avaliadorNome,
        dataVistoria: new Date(dataVistoria).getTime(),
        go: goNome || undefined,
        gc: gcNome || undefined,
        nucleo: nucleo || undefined,
        diretoria: diretoria || undefined,
        observacoes: observacoes || undefined,
        respostas: Object.values(respostas).map(r => ({
          itemId: r.itemId,
          resposta: r.resposta,
          observacao: r.observacao || undefined,
        })),
      });
      toast.success(`Verificação salva! Score geral: ${result.scores.scoreGeral}% — ${result.scores.statusGeral}`);
      navigate(`/verificacoes/${result.id}`);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-teal-600" />
            Nova Verificação de Qualidade
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
            <Select onValueChange={handleObraChange}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
              <SelectContent>
                {obras?.map(o => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.codigo} — {o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select value={goId} onValueChange={setGoId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o GO..." /></SelectTrigger>
              <SelectContent>
                {gerentesObra.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                ))}
                {gerentesObra.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum Gerente de Obra cadastrado em Usuários</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Gerente de Contrato (GC)</Label>
            <Select value={gcId} onValueChange={setGcId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o GC..." /></SelectTrigger>
              <SelectContent>
                {gerentesContrato.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                ))}
                {gerentesContrato.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum Gerente de Contrato cadastrado em Usuários</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Núcleo</Label>
            <Input className="mt-1" placeholder="Ex: Interiores..." value={nucleo} onChange={e => setNucleo(e.target.value)} />
          </div>
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
                          <Textarea
                            placeholder="Descreva o desvio encontrado..."
                            className="text-sm"
                            value={respostas[item.id]?.observacao || ""}
                            onChange={e => setObsItem(item.id, e.target.value)}
                          />
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
          <Textarea
            placeholder="Registre observações gerais sobre a verificação..."
            rows={4}
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Botão de Envio */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate("/verificacoes")}>Cancelar</Button>
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
