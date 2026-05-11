import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, MapPin, Building2, User, Clock, AlertTriangle } from "lucide-react";

const CLASSIF_LABELS: Record<string, string> = {
  incidente: "Incidente",
  incidente_ambiental: "Incidente Ambiental",
  aca: "Acidente C/ Afastamento",
  asa: "Acidente S/ Afastamento",
  af: "Acidente Fatal",
  at: "Acidente de Trajeto",
};

const STATUS_LABELS: Record<string, string> = {
  comunicado: "Comunicado",
  em_investigacao: "Em Investigação",
  em_analise: "Em Análise",
  acao_em_andamento: "Plano em Andamento",
  encerrado: "Encerrado",
};

export default function OcorrenciaDetalhe() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/qsms/ocorrencias/:id");
  const id = Number(params?.id);
  const { data: ocorrencia, isLoading } = trpc.ocorrencias.getById.useQuery({ id }, { enabled: !!id });
  const { data: obras } = trpc.obras.list.useQuery();
  const update = trpc.ocorrencias.update.useMutation();

  if (isLoading) return <div className="text-center py-12 text-slate-500">Carregando...</div>;
  if (!ocorrencia) return <div className="text-center py-12 text-slate-500">Ocorrência não encontrada</div>;

  const obra = obras?.find((o: any) => o.id === ocorrencia.obraId);
  const o: any = ocorrencia;

  const prazoBadge = (label: string, prazo: number | null) => {
    if (!prazo) return null;
    const now = Date.now();
    const diff = prazo - now;
    const dias = Math.ceil(diff / (24 * 60 * 60 * 1000));
    let cls = "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (diff < 0) cls = "bg-red-100 text-red-700 border-red-200";
    else if (dias <= 2) cls = "bg-amber-100 text-amber-700 border-amber-200";
    return (
      <Badge className={cls}>
        <Clock className="h-3 w-3 mr-1" />
        {label}: {diff < 0 ? `vencido há ${Math.abs(dias)}d` : `${dias}d restantes`}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/qsms/ocorrencias")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            Ocorrência #{o.id}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">{CLASSIF_LABELS[o.classificacao]}</Badge>
            <Badge className="bg-slate-100 text-slate-700">{STATUS_LABELS[o.status]}</Badge>
          </div>
        </div>
      </div>

      {/* Indicadores de prazo */}
      <div className="flex flex-wrap gap-2">
        {prazoBadge("Comissão (24h)", o.prazoComissao)}
        {prazoBadge("Investigação (7d)", o.prazoInvestigacao)}
        {prazoBadge("Plano (15d)", o.prazoPlano)}
      </div>

      {/* Status workflow */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-500 mr-2">Avançar status:</span>
            {(["comunicado","em_investigacao","em_analise","acao_em_andamento","encerrado"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={o.status === s ? "default" : "outline"}
                onClick={() => update.mutate({ id: o.id, status: s, ...(s === "encerrado" ? { dataFechamento: Date.now() } : {}) })}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="comunicacao">
        <TabsList>
          <TabsTrigger value="comunicacao">Comunicação</TabsTrigger>
          <TabsTrigger value="investigacao">Investigação</TabsTrigger>
          <TabsTrigger value="fotos">Fotos ({o.fotos?.length || 0})</TabsTrigger>
          <TabsTrigger value="planos">Planos de Ação ({o.planosAcao?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="comunicacao" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados gerais</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400" /> <span>{obra ? `${obra.codigo} — ${obra.nome}` : `Obra #${o.obraId}`}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400" /> <span>{o.dataOcorrencia ? new Date(o.dataOcorrencia).toLocaleString("pt-BR") : "—"}</span></div>
              {o.local_ocorrencia && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> <span>{o.local_ocorrencia}</span></div>}
              {o.endereco && <div><span className="text-slate-500">Endereço:</span> {o.endereco} {o.cidade ? `— ${o.cidade}` : ""} {o.uf ? `/${o.uf}` : ""}</div>}
              {o.empresa_principal && <div><span className="text-slate-500">Empresa principal:</span> {o.empresa_principal} {o.cnpj_principal ? `(${o.cnpj_principal})` : ""}</div>}
              {o.empresa_subcontratada && <div><span className="text-slate-500">Subcontratada:</span> {o.empresa_subcontratada} {o.cnpj_subcontratada ? `(${o.cnpj_subcontratada})` : ""}</div>}
              {o.acidentado_nome && <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> <span>{o.acidentado_nome} {o.acidentado_funcao ? `— ${o.acidentado_funcao}` : ""}</span></div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Descrição preliminar</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap">{o.descricao_preliminar}</p></CardContent>
          </Card>
          {o.acao_imediata && (
            <Card>
              <CardHeader><CardTitle className="text-base">Ação imediata</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{o.acao_imediata}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="investigacao" className="pt-4">
          <Card>
            <CardContent className="py-12 text-center text-slate-500 text-sm">
              <p>Aba de investigação (comissão, testemunhas, cronologia, Árvore dos Porquês) — disponível na próxima fase.</p>
              <p className="mt-2 text-xs">Por enquanto, registre as informações em "Descrição preliminar" e adicione fotos / planos de ação.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fotos" className="pt-4">
          <Card>
            <CardContent className="p-4">
              {(!o.fotos || o.fotos.length === 0) ? (
                <p className="text-sm text-slate-500 text-center py-8">Nenhuma foto registrada.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {o.fotos.map((f: any) => (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border">
                      <img src={f.url} alt="" className="w-full h-32 object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planos" className="pt-4">
          <Card>
            <CardContent className="p-4">
              {(!o.planosAcao || o.planosAcao.length === 0) ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  <p>Nenhum plano de ação vinculado.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/planos-acao/novo")}>Criar plano de ação</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {o.planosAcao.map((p: any) => (
                    <div key={p.id} className="border rounded-lg p-3 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/planos-acao/${p.id}`)}>
                      <p className="text-sm font-medium">{p.acao}</p>
                      <p className="text-xs text-slate-500 mt-1">{p.responsavel} • {p.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}