import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ObraSelect from "@/components/ObraSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useDraftAutosave, loadDraft } from "@/hooks/useDraftAutosave";

const CLASSIFICACOES = [
  { value: "incidente", label: "Incidente (quase acidente)" },
  { value: "incidente_ambiental", label: "Incidente Ambiental" },
  { value: "asa", label: "Acidente Sem Afastamento (ASA)" },
  { value: "aca", label: "Acidente Com Afastamento (ACA)" },
  { value: "af", label: "Acidente Fatal (AF)" },
  { value: "at", label: "Acidente de Trajeto (AT)" },
];

const schema = z.object({
  obraId: z.number().int().positive("Selecione a obra"),
  dataOcorrencia: z.string().min(1, "Informe a data"),
  classificacao: z.string().min(1, "Selecione a classificação"),
  descricaoPreliminar: z.string().trim().min(1, "Descreva a ocorrência").max(5000),
});

export default function OcorrenciaEditar() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/qsms/ocorrencias/:id/editar");
  const id = Number((params as any)?.id);
  const { data: ocorrencia, isLoading } = trpc.ocorrencias.getById.useQuery({ id }, { enabled: !!id });
  const { data: obras } = trpc.obras.list.useQuery();
  const update = trpc.ocorrencias.update.useMutation();
  const utils = trpc.useUtils();

  const [obraId, setObraId] = useState<string>("");
  const [dataOcorrencia, setDataOcorrencia] = useState<string>("");
  const [hora, setHora] = useState<string>("");
  const [local, setLocal] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [empresaPrincipal, setEmpresaPrincipal] = useState("");
  const [cnpjPrincipal, setCnpjPrincipal] = useState("");
  const [empresaSubcontratada, setEmpresaSubcontratada] = useState("");
  const [cnpjSubcontratada, setCnpjSubcontratada] = useState("");
  const [acidentadoNome, setAcidentadoNome] = useState("");
  const [acidentadoFuncao, setAcidentadoFuncao] = useState("");
  const [acidentadoIdade, setAcidentadoIdade] = useState<string>("");
  const [classificacao, setClassificacao] = useState<string>("");
  const [descricaoPreliminar, setDescricaoPreliminar] = useState("");
  const [acaoImediata, setAcaoImediata] = useState("");
  const [responsavelPreenchimento, setResponsavelPreenchimento] = useState("");
  const [responsavelObra, setResponsavelObra] = useState("");
  const [catNumero, setCatNumero] = useState("");
  const [atestadoDias, setAtestadoDias] = useState<string>("");
  const [catEmitida, setCatEmitida] = useState(false);
  const [awfor149Anexada, setAwfor149Anexada] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  const draftKey = id ? `draft:ocorrencia-edit:${id}` : null;
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!ocorrencia) return;
    const o: any = ocorrencia;
    setObraId(String(o.obraId ?? ""));
    if (o.dataOcorrencia) {
      const d = new Date(o.dataOcorrencia);
      setDataOcorrencia(d.toISOString().slice(0, 10));
    }
    setHora(o.hora || "");
    setLocal(o.local_ocorrencia || "");
    setEndereco(o.endereco || "");
    setCidade(o.cidade || "");
    setUf(o.uf || "");
    setEmpresaPrincipal(o.empresa_principal || "");
    setCnpjPrincipal(o.cnpj_principal || "");
    setEmpresaSubcontratada(o.empresa_subcontratada || "");
    setCnpjSubcontratada(o.cnpj_subcontratada || "");
    setAcidentadoNome(o.acidentado_nome || "");
    setAcidentadoFuncao(o.acidentado_funcao || "");
    setAcidentadoIdade(o.acidentado_idade != null ? String(o.acidentado_idade) : "");
    setClassificacao(o.classificacao || "");
    setDescricaoPreliminar(o.descricao_preliminar || "");
    setAcaoImediata(o.acao_imediata || "");
    setResponsavelPreenchimento(o.responsavel_preenchimento || "");
    setResponsavelObra(o.responsavel_obra || "");
    setCatNumero(o.cat_numero || "");
    setAtestadoDias(o.atestado_dias != null ? String(o.atestado_dias) : "");
    setCatEmitida(!!o.cat_emitida);
    setAwfor149Anexada(!!o.awfor149_anexada);
    setObservacoes(o.observacoes || "");

    // Restaura rascunho local mais recente que o servidor
    if (!restoredRef.current && draftKey) {
      const d: any = loadDraft(draftKey);
      const serverTime = new Date(o.updated_at || o.created_at || o.dataOcorrencia || 0).getTime();
      if (d && (d.__savedAt ?? 0) > serverTime) {
        if (d.obraId !== undefined) setObraId(d.obraId);
        if (d.dataOcorrencia) setDataOcorrencia(d.dataOcorrencia);
        if (d.hora !== undefined) setHora(d.hora);
        if (d.local !== undefined) setLocal(d.local);
        if (d.endereco !== undefined) setEndereco(d.endereco);
        if (d.cidade !== undefined) setCidade(d.cidade);
        if (d.uf !== undefined) setUf(d.uf);
        if (d.empresaPrincipal !== undefined) setEmpresaPrincipal(d.empresaPrincipal);
        if (d.cnpjPrincipal !== undefined) setCnpjPrincipal(d.cnpjPrincipal);
        if (d.empresaSubcontratada !== undefined) setEmpresaSubcontratada(d.empresaSubcontratada);
        if (d.cnpjSubcontratada !== undefined) setCnpjSubcontratada(d.cnpjSubcontratada);
        if (d.acidentadoNome !== undefined) setAcidentadoNome(d.acidentadoNome);
        if (d.acidentadoFuncao !== undefined) setAcidentadoFuncao(d.acidentadoFuncao);
        if (d.acidentadoIdade !== undefined) setAcidentadoIdade(d.acidentadoIdade);
        if (d.classificacao !== undefined) setClassificacao(d.classificacao);
        if (d.descricaoPreliminar !== undefined) setDescricaoPreliminar(d.descricaoPreliminar);
        if (d.acaoImediata !== undefined) setAcaoImediata(d.acaoImediata);
        if (d.responsavelPreenchimento !== undefined) setResponsavelPreenchimento(d.responsavelPreenchimento);
        if (d.responsavelObra !== undefined) setResponsavelObra(d.responsavelObra);
        if (d.catNumero !== undefined) setCatNumero(d.catNumero);
        if (d.atestadoDias !== undefined) setAtestadoDias(d.atestadoDias);
        if (typeof d.catEmitida === "boolean") setCatEmitida(d.catEmitida);
        if (typeof d.awfor149Anexada === "boolean") setAwfor149Anexada(d.awfor149Anexada);
        if (d.observacoes !== undefined) setObservacoes(d.observacoes);
        setTimeout(() => toast.success("Rascunho recuperado", { description: "Continuamos de onde você parou." }), 100);
      }
      restoredRef.current = true;
    }
  }, [ocorrencia, draftKey]);

  const { clearDraft: clearDraftFn, markClean } = useDraftAutosave({
    key: ocorrencia ? draftKey : null,
    data: {
      obraId, dataOcorrencia, hora, local, endereco, cidade, uf,
      empresaPrincipal, cnpjPrincipal, empresaSubcontratada, cnpjSubcontratada,
      acidentadoNome, acidentadoFuncao, acidentadoIdade,
      classificacao, descricaoPreliminar, acaoImediata,
      responsavelPreenchimento, responsavelObra,
      catNumero, atestadoDias, catEmitida, awfor149Anexada, observacoes,
    },
    enabled: !!ocorrencia,
  });

  async function salvar() {
    const parsed = schema.safeParse({
      obraId: Number(obraId),
      dataOcorrencia,
      classificacao,
      descricaoPreliminar,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Verifique os campos obrigatórios");
      return;
    }

    setSalvando(true);
    try {
      const dt = new Date(`${dataOcorrencia}T${hora || "00:00"}:00`).getTime();
      await update.mutateAsync({
        id,
        dataOcorrencia: dt,
        hora,
        local, endereco, cidade, uf,
        empresaPrincipal, cnpjPrincipal,
        empresaSubcontratada, cnpjSubcontratada,
        acidentadoNome, acidentadoFuncao,
        acidentadoIdade: acidentadoIdade ? Number(acidentadoIdade) : null,
        classificacao,
        descricaoPreliminar,
        acaoImediata,
        responsavelPreenchimento, responsavelObra,
        catNumero,
        atestadoDias: atestadoDias ? Number(atestadoDias) : null,
        catEmitida,
        awfor149Anexada,
        observacoes,
      } as any);
      await utils.ocorrencias.getById.invalidate({ id });
      await utils.ocorrencias.list.invalidate();
      toast.success("Ocorrência atualizada");
      navigate(`/qsms/ocorrencias/${id}`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  if (isLoading) return <div className="text-center py-12 text-slate-500">Carregando...</div>;
  if (!ocorrencia) return <div className="text-center py-12 text-slate-500">Ocorrência não encontrada</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/qsms/ocorrencias/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Editar Ocorrência #{id}</h1>
          <p className="text-sm text-slate-500">Atualize os dados da comunicação inicial (AWFOR 094)</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Obra *</Label>
            <ObraSelect
              obras={obras as any}
              value={obraId}
              onValueChange={setObraId}
              placeholder="Selecione a obra..."
              className="w-full"
            />
          </div>
          <div>
            <Label>Data *</Label>
            <Input type="date" value={dataOcorrencia} onChange={(e) => setDataOcorrencia(e.target.value)} />
          </div>
          <div>
            <Label>Hora</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Local da ocorrência</Label>
            <Input value={local} onChange={(e) => setLocal(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Endereço</Label>
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div>
            <Label>UF</Label>
            <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} maxLength={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Empresas envolvidas</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div><Label>Empresa Principal</Label><Input value={empresaPrincipal} onChange={(e) => setEmpresaPrincipal(e.target.value)} /></div>
          <div><Label>CNPJ</Label><Input value={cnpjPrincipal} onChange={(e) => setCnpjPrincipal(e.target.value)} /></div>
          <div><Label>Empresa Subcontratada</Label><Input value={empresaSubcontratada} onChange={(e) => setEmpresaSubcontratada(e.target.value)} /></div>
          <div><Label>CNPJ</Label><Input value={cnpjSubcontratada} onChange={(e) => setCnpjSubcontratada(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Acidentado (quando houver)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <div><Label>Nome</Label><Input value={acidentadoNome} onChange={(e) => setAcidentadoNome(e.target.value)} /></div>
          <div><Label>Função</Label><Input value={acidentadoFuncao} onChange={(e) => setAcidentadoFuncao(e.target.value)} /></div>
          <div><Label>Idade</Label><Input type="number" value={acidentadoIdade} onChange={(e) => setAcidentadoIdade(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Classificação e descrição</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Classificação *</Label>
            <Select value={classificacao} onValueChange={setClassificacao}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {CLASSIFICACOES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição preliminar *</Label>
            <Textarea value={descricaoPreliminar} onChange={(e) => setDescricaoPreliminar(e.target.value)} rows={5} />
          </div>
          <div>
            <Label>Ação imediata</Label>
            <Textarea value={acaoImediata} onChange={(e) => setAcaoImediata(e.target.value)} rows={4} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">CAT e atestado</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div><Label>Número da CAT</Label><Input value={catNumero} onChange={(e) => setCatNumero(e.target.value)} /></div>
          <div><Label>Dias de atestado</Label><Input type="number" value={atestadoDias} onChange={(e) => setAtestadoDias(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={catEmitida} onCheckedChange={(v) => setCatEmitida(!!v)} /> CAT emitida
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={awfor149Anexada} onCheckedChange={(v) => setAwfor149Anexada(!!v)} /> AWFOR 149 anexada
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Responsáveis e observações</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div><Label>Responsável pelo preenchimento</Label><Input value={responsavelPreenchimento} onChange={(e) => setResponsavelPreenchimento(e.target.value)} /></div>
          <div><Label>Responsável pela obra</Label><Input value={responsavelObra} onChange={(e) => setResponsavelObra(e.target.value)} /></div>
          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={() => navigate(`/qsms/ocorrencias/${id}`)}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando} className="bg-orange-600 hover:bg-orange-700 text-white">
          {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
