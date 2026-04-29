import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { HelpCircle, Upload, X, PlusCircle, ArrowLeft, Loader2, Tag } from "lucide-react";
import PlantaPinSelector from "@/components/PlantaPinSelector";

// Grupos carregados do banco de dados (substitui disciplinas fixas)

const FIELD_HINTS: Record<string, string> = {
  disciplina: "Selecione a disciplina técnica relacionada ao desvio encontrado. Ex: Marcenaria, Pintura, Drywall.",
  fornecedor: "Informe o fornecedor responsável pela execução do serviço onde o desvio foi identificado.",
  descricao: "Descreva o desvio de forma clara e objetiva. Inclua o que foi observado, onde exatamente e qual o impacto.",
  localizacao: "Indique a localização exata na obra. Ex: 5º andar, sala de reuniões, banheiro masculino.",
  severidade: "Leve: desvio estético ou menor. Moderado: impacta qualidade mas não compromete segurança. Grave: risco à segurança ou entrega.",
  dataIdentificacao: "Data em que o desvio foi identificado em campo durante a vistoria.",
  prazo: "Prazo sugerido para correção do desvio. Considere a complexidade e o impacto no cronograma.",
  origem: "Qualidade: desvio identificado durante vistoria de qualidade. Check List: item pendente para entrega ao cliente. Assistência Técnica: desvio identificado após a entrega da obra.",
  tags: "Marque as classificações aplicáveis ao desvio. Essas tags ajudam a priorizar e filtrar os desvios.",
};

export default function DesvioNovo() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: obras } = trpc.obras.list.useQuery();
  const { data: fornecedoresDb } = trpc.fornecedores.list.useQuery();

  const { data: grupos } = trpc.grupos.list.useQuery();
  const [obraId, setObraId] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [grupoSearch, setGrupoSearch] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [severidade, setSeveridade] = useState("");
  const [origem, setOrigem] = useState("qualidade");
  const [tagCritico, setTagCritico] = useState(false);
  const [tagSegurancaTrabalho, setTagSegurancaTrabalho] = useState(false);
  const [tagSolicitadoCliente, setTagSolicitadoCliente] = useState(false);
  const [dataIdentificacao, setDataIdentificacao] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [prazoSugerido, setPrazoSugerido] = useState("");
  const [fotos, setFotos] = useState<{ file: File; preview: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [plantaId, setPlantaId] = useState<number | null>(null);
  const [pinX, setPinX] = useState<string | null>(null);
  const [pinY, setPinY] = useState<string | null>(null);

  const createDesvio = trpc.desvios.create.useMutation();
  const uploadFoto = trpc.fotos.upload.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFotos = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFotos((prev) => [...prev, ...newFotos]);
    e.target.value = "";
  };

  const removeFoto = (index: number) => {
    setFotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraId || !grupoId || !descricao || !severidade || !dataIdentificacao) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const selectedGrupo = grupos?.find(g => g.id === parseInt(grupoId));
    setSubmitting(true);
    try {
      const result = await createDesvio.mutateAsync({
        obraId: parseInt(obraId),
        disciplina: selectedGrupo ? `${selectedGrupo.codigo} - ${selectedGrupo.nome}` : "",
        grupoId: parseInt(grupoId),
        fornecedorNome: fornecedorNome || undefined,
        descricao,
        localizacao: localizacao || undefined,
        severidade: severidade as "leve" | "moderado" | "grave",
        origem: origem as "qualidade" | "punch_list" | "pos_obra",
        tagCritico: tagCritico ? 1 : 0,
        tagSegurancaTrabalho: tagSegurancaTrabalho ? 1 : 0,
        tagSolicitadoCliente: tagSolicitadoCliente ? 1 : 0,
        dataIdentificacao: new Date(dataIdentificacao).getTime(),
        prazoSugerido: prazoSugerido ? new Date(prazoSugerido).getTime() : undefined,
        plantaId: plantaId || undefined,
        pinX: pinX || undefined,
        pinY: pinY || undefined,
      });

      // Upload fotos (tipo: abertura)
      for (const foto of fotos) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
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

      toast.success("Desvio registrado com sucesso!");
      utils.desvios.list.invalidate();
      utils.kpis.get.invalidate();
      setLocation(`/desvios/${result.id}`);
    } catch (err) {
      toast.error("Erro ao registrar desvio. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/desvios")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Desvio</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Registre um desvio de qualidade identificado em campo
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-sm border-0 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Informações do Desvio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Obra */}
            <FieldWithHint label="Obra" hint="Selecione a obra onde o desvio foi identificado." required>
              <Select value={obraId} onValueChange={setObraId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a obra..." />
                </SelectTrigger>
                <SelectContent>
                  {obras?.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.codigo} - {o.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWithHint>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Grupo */}
              <FieldWithHint label="Grupo" hint="Selecione o grupo técnico relacionado ao desvio encontrado." required>
                <Select value={grupoId} onValueChange={setGrupoId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione o grupo..." />
                  </SelectTrigger>
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
                    }).slice(0, 50).map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.codigo} - {g.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWithHint>

              {/* Fornecedor */}
              <FieldWithHint label="Fornecedor" hint={FIELD_HINTS.fornecedor}>
                <Select value={fornecedorNome} onValueChange={setFornecedorNome}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione ou deixe em branco..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedoresDb?.map((f) => (
                      <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWithHint>
            </div>

            {/* Origem */}
            <FieldWithHint label="Origem" hint={FIELD_HINTS.origem} required>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a origem..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualidade">Qualidade</SelectItem>
                  <SelectItem value="punch_list">Check List</SelectItem>
                  <SelectItem value="pos_obra">Assistência Técnica</SelectItem>
                </SelectContent>
              </Select>
            </FieldWithHint>

            {/* Descrição */}
            <FieldWithHint label="Descrição do Desvio" hint={FIELD_HINTS.descricao} required>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o que foi observado em campo..."
                rows={4}
                className="bg-background resize-none"
              />
            </FieldWithHint>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Localização */}
              <FieldWithHint label="Localização na Obra" hint={FIELD_HINTS.localizacao}>
                <Input
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  placeholder="Ex: 5º andar, sala de reuniões"
                  className="bg-background"
                />
              </FieldWithHint>

              {/* Severidade */}
              <FieldWithHint label="Severidade" hint={FIELD_HINTS.severidade} required>
                <Select value={severidade} onValueChange={setSeveridade}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="moderado">Moderado</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                  </SelectContent>
                </Select>
              </FieldWithHint>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Data Identificação */}
              <FieldWithHint label="Data de Identificação" hint={FIELD_HINTS.dataIdentificacao} required>
                <Input
                  type="date"
                  value={dataIdentificacao}
                  onChange={(e) => setDataIdentificacao(e.target.value)}
                  className="bg-background"
                />
              </FieldWithHint>

              {/* Prazo */}
              <FieldWithHint label="Prazo Sugerido" hint={FIELD_HINTS.prazo}>
                <Input
                  type="date"
                  value={prazoSugerido}
                  onChange={(e) => setPrazoSugerido(e.target.value)}
                  className="bg-background"
                />
              </FieldWithHint>
            </div>

            {/* Tags / Classificações */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Classificações</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">{FIELD_HINTS.tags}</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={tagCritico}
                    onCheckedChange={(checked) => setTagCritico(!!checked)}
                  />
                  <span className="text-sm flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                    Chamado Crítico
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={tagSegurancaTrabalho}
                    onCheckedChange={(checked) => setTagSegurancaTrabalho(!!checked)}
                  />
                  <span className="text-sm flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                    Segurança do Trabalho
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={tagSolicitadoCliente}
                    onCheckedChange={(checked) => setTagSolicitadoCliente(!!checked)}
                  />
                  <span className="text-sm flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                    Solicitado pelo Cliente
                  </span>
                </label>
              </div>
            </div>

            {/* Localização na Planta */}
            {obraId && (
              <PlantaPinSelector
                obraId={parseInt(obraId)}
                plantaId={plantaId}
                pinX={pinX}
                pinY={pinY}
                onChange={({ plantaId: pId, pinX: px, pinY: py }) => {
                  setPlantaId(pId);
                  setPinX(px);
                  setPinY(py);
                }}
              />
            )}

            {/* Fotos */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-sm font-medium">Fotos de Evidência (Abertura)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Adicione fotos que evidenciem o desvio encontrado. Fotos ajudam na análise e no acompanhamento da correção.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap gap-3">
                {fotos.map((foto, i) => (
                  <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border bg-muted">
                    <img src={foto.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFoto(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground/50">Adicionar</span>
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => setLocation("/desvios")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" />
                Registrar Desvio
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FieldWithHint({
  label, hint, required, children,
}: {
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
