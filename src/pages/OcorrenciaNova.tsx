import { useState, useEffect, useRef } from "react";
import { useDraftAutosave, loadDraft, clearDraft as clearDraftKey } from "@/hooks/useDraftAutosave";
import DraftRestoredBanner from "@/components/DraftRestoredBanner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ObraSelect from "@/components/ObraSelect";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { ArrowLeft, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Foto = { id: string; file?: File; previewUrl: string; fileKey?: string; publicUrl?: string; status: "uploading" | "done" | "error" };

const CLASSIFICACOES = [
  { value: "incidente", label: "Incidente (quase acidente)" },
  { value: "incidente_ambiental", label: "Incidente Ambiental" },
  { value: "asa", label: "Acidente Sem Afastamento (ASA)" },
  { value: "aca", label: "Acidente Com Afastamento (ACA)" },
  { value: "af", label: "Acidente Fatal (AF)" },
  { value: "at", label: "Acidente de Trajeto (AT)" },
];

export default function OcorrenciaNova() {
  const [, navigate] = useLocation();
  const { data: obras } = trpc.obras.list.useQuery();
  const create = trpc.ocorrencias.create.useMutation();

  const [obraId, setObraId] = useState<string>("");
  const today = new Date();
  const [dataOcorrencia, setDataOcorrencia] = useState<string>(today.toISOString().slice(0, 10));
  const [hora, setHora] = useState<string>(today.toTimeString().slice(0, 5));
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
  const [classificacao, setClassificacao] = useState<string>("");
  const [descricaoPreliminar, setDescricaoPreliminar] = useState("");
  const [acaoImediata, setAcaoImediata] = useState("");
  const [responsavelPreenchimento, setResponsavelPreenchimento] = useState("");
  const [responsavelObra, setResponsavelObra] = useState("");
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Auto-save de rascunho — UMA única "vaga" para Nova Ocorrência.
  // Fotos já uploaded (com fileKey/publicUrl) são preservadas.
  const draftKey = `draft:ocorrencia:nova`;
  const restoredRef = useRef(false);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    let d: any = loadDraft(draftKey);
    // Migração: consome rascunhos antigos com chave `draft:ocorrencia:<obra>:<data>:<hora>`
    if (!d) {
      try {
        let best: any = null;
        const legacy: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("draft:ocorrencia:") && k !== draftKey && !k.startsWith("draft:ocorrencia-edit:")) {
            legacy.push(k);
            const dd: any = loadDraft(k);
            if (dd && (!best || (dd.__savedAt ?? 0) > (best.__savedAt ?? 0))) best = dd;
          }
        }
        if (best) d = best;
        legacy.forEach(clearDraftKey);
      } catch { /* ignore */ }
    }
    if (d) {
      if (d.obraId) setObraId(d.obraId);
      if (d.dataOcorrencia) setDataOcorrencia(d.dataOcorrencia);
      if (d.hora) setHora(d.hora);
      if (d.local) setLocal(d.local);
      if (d.endereco) setEndereco(d.endereco);
      if (d.cidade) setCidade(d.cidade);
      if (d.uf) setUf(d.uf);
      if (d.empresaPrincipal) setEmpresaPrincipal(d.empresaPrincipal);
      if (d.cnpjPrincipal) setCnpjPrincipal(d.cnpjPrincipal);
      if (d.empresaSubcontratada) setEmpresaSubcontratada(d.empresaSubcontratada);
      if (d.cnpjSubcontratada) setCnpjSubcontratada(d.cnpjSubcontratada);
      if (d.acidentadoNome) setAcidentadoNome(d.acidentadoNome);
      if (d.acidentadoFuncao) setAcidentadoFuncao(d.acidentadoFuncao);
      if (d.classificacao) setClassificacao(d.classificacao);
      if (d.descricaoPreliminar) setDescricaoPreliminar(d.descricaoPreliminar);
      if (d.acaoImediata) setAcaoImediata(d.acaoImediata);
      if (d.responsavelPreenchimento) setResponsavelPreenchimento(d.responsavelPreenchimento);
      if (d.responsavelObra) setResponsavelObra(d.responsavelObra);
      if (Array.isArray(d.fotos)) {
        setFotos(d.fotos.filter((f: any) => f.status === "done" && f.fileKey && f.publicUrl));
      }
      setRestoredAt(d.__savedAt ?? Date.now());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { clearDraft: clearDraftFn, markClean } = useDraftAutosave({
    key: draftKey,
    data: {
      obraId, dataOcorrencia, hora, local, endereco, cidade, uf,
      empresaPrincipal, cnpjPrincipal, empresaSubcontratada, cnpjSubcontratada,
      acidentadoNome, acidentadoFuncao, classificacao, descricaoPreliminar,
      acaoImediata, responsavelPreenchimento, responsavelObra,
      // só persiste fotos já enviadas
      fotos: fotos.filter(f => f.status === "done").map(f => ({ id: f.id, fileKey: f.fileKey, publicUrl: f.publicUrl, previewUrl: f.publicUrl, status: "done" })),
    },
  });

  const discardDraft = () => {
    clearDraftFn();
    markClean();
    setRestoredAt(null);
    window.location.reload();
  };

  async function uploadFoto(f: Foto) {
    if (!f.file) return;
    try {
      const compressed = await compressImage(f.file);
      const key = `ocorrencias/tmp/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage.from("evidencias").upload(key, compressed, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("evidencias").getPublicUrl(key);
      setFotos((prev) => prev.map((x) => x.id === f.id ? { ...x, fileKey: key, publicUrl: data.publicUrl, status: "done" } : x));
    } catch (e: any) {
      console.error(e);
      setFotos((prev) => prev.map((x) => x.id === f.id ? { ...x, status: "error" } : x));
    }
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const novos: Foto[] = files.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
    }));
    setFotos((prev) => [...prev, ...novos]);
    novos.forEach(uploadFoto);
  }

  function removeFoto(id: string) {
    setFotos((prev) => prev.filter((x) => x.id !== id));
  }

  async function salvar() {
    if (!obraId) return toast.error("Selecione a obra");
    if (!classificacao) return toast.error("Selecione a classificação");
    if (!descricaoPreliminar.trim()) return toast.error("Descreva a ocorrência");
    if (fotos.some((f) => f.status === "uploading")) {
      return toast.message("Aguarde o upload das fotos terminar…");
    }

    setSalvando(true);
    try {
      // Combinar data + hora em timestamp
      const dt = new Date(`${dataOcorrencia}T${hora || "00:00"}:00`).getTime();
      const fotosOk = fotos.filter((f) => f.status === "done" && f.fileKey && f.publicUrl).map((f) => ({
        fileKey: f.fileKey, url: f.publicUrl, etapa: "cena",
      }));
      const res: any = await create.mutateAsync({
        obraId: Number(obraId),
        dataOcorrencia: dt,
        hora,
        local, endereco, cidade, uf,
        empresaPrincipal, cnpjPrincipal,
        empresaSubcontratada, cnpjSubcontratada,
        acidentadoNome, acidentadoFuncao,
        classificacao,
        descricaoPreliminar,
        acaoImediata,
        responsavelPreenchimento, responsavelObra,
        fotos: fotosOk,
      });
      clearDraftFn(); markClean();
      toast.success("Ocorrência registrada");
      navigate(`/qsms/ocorrencias/${res.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <DraftRestoredBanner savedAt={restoredAt} onDiscard={discardDraft} />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/qsms/ocorrencias")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Nova Ocorrência (AWFOR 094)</h1>
          <p className="text-sm text-slate-500">Comunicação inicial — preencher imediatamente após o evento</p>
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
            <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: 3º pavimento, área de carga…" />
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
          <div>
            <Label>Empresa Principal</Label>
            <Input value={empresaPrincipal} onChange={(e) => setEmpresaPrincipal(e.target.value)} />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={cnpjPrincipal} onChange={(e) => setCnpjPrincipal(e.target.value)} />
          </div>
          <div>
            <Label>Empresa Subcontratada</Label>
            <Input value={empresaSubcontratada} onChange={(e) => setEmpresaSubcontratada(e.target.value)} />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={cnpjSubcontratada} onChange={(e) => setCnpjSubcontratada(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Acidentado (quando houver)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Nome</Label>
            <Input value={acidentadoNome} onChange={(e) => setAcidentadoNome(e.target.value)} />
          </div>
          <div>
            <Label>Função</Label>
            <Input value={acidentadoFuncao} onChange={(e) => setAcidentadoFuncao(e.target.value)} />
          </div>
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
            <Label>Descrição preliminar da ocorrência *</Label>
            <Textarea value={descricaoPreliminar} onChange={(e) => setDescricaoPreliminar(e.target.value)} rows={5} placeholder="Descreva o que aconteceu, baseado em fatos reais…" />
          </div>
          <div>
            <Label>Ação imediata</Label>
            <Textarea value={acaoImediata} onChange={(e) => setAcaoImediata(e.target.value)} rows={4} placeholder="O que foi feito imediatamente para conter / mitigar?" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Evidências fotográficas</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {fotos.map((f) => (
              <div key={f.id} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                {f.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                )}
                {f.status === "error" && (
                  <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center text-white text-xs font-semibold">Erro</div>
                )}
                <button type="button" onClick={() => removeFoto(f.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <PhotoPickerButton onFiles={handleFiles} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Responsáveis</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Responsável pelo preenchimento</Label>
            <Input value={responsavelPreenchimento} onChange={(e) => setResponsavelPreenchimento(e.target.value)} />
          </div>
          <div>
            <Label>Responsável pela obra</Label>
            <Input value={responsavelObra} onChange={(e) => setResponsavelObra(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={() => navigate("/qsms/ocorrencias")}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando} className="bg-orange-600 hover:bg-orange-700 text-white">
          {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Registrar Ocorrência
        </Button>
      </div>
    </div>
  );
}