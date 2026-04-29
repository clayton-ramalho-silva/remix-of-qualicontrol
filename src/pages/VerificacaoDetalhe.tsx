import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import {
  ClipboardCheck, ArrowLeft, Calendar, User, Building2,
  CheckCircle2, XCircle, AlertTriangle, MinusCircle, Printer
} from "lucide-react";

const statusColors: Record<string, string> = {
  "ÓTIMA": "bg-emerald-100 text-emerald-700",
  "REGULAR": "bg-amber-100 text-amber-700",
  "RUIM": "bg-red-100 text-red-700",
  "CRÍTICO": "bg-red-200 text-red-900",
};

const respIcons: Record<string, any> = {
  "AT": { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Atende" },
  "NAT": { icon: XCircle, color: "text-amber-600", bg: "bg-amber-50", label: "Não Atende" },
  "GR": { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "Grave" },
  "NA": { icon: MinusCircle, color: "text-slate-400", bg: "bg-slate-50", label: "N/A" },
};

export default function VerificacaoDetalhe() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { data: obras } = trpc.obras.list.useQuery();
  const { data, isLoading } = trpc.verificacoes.getById.useQuery(
    { id: Number(params.id) },
    { enabled: !!params.id }
  );

  if (isLoading) return <div className="text-center py-12 text-slate-500">Carregando...</div>;
  if (!data) return <div className="text-center py-12 text-slate-500">Verificação não encontrada</div>;

  const obra = obras?.find(o => o.id === data.obraId);
  const respostaMap = new Map(data.respostas?.map((r: any) => [r.itemId, r]) || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/verificacoes")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-7 w-7 text-teal-600" />
              Verificação #{data.id}
            </h1>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir
        </Button>
      </div>

      {/* Dados Gerais */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase">Obra</p>
              <p className="font-medium text-slate-900">{obra ? `${obra.codigo} — ${obra.nome}` : `Obra #${data.obraId}`}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Avaliador</p>
              <p className="font-medium text-slate-900 flex items-center gap-1"><User className="h-3.5 w-3.5" /> {data.avaliador}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Data da Vistoria</p>
              <p className="font-medium text-slate-900 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {new Date(data.dataVistoria).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Status Geral</p>
              <Badge className={`text-base px-3 py-1 ${statusColors[data.statusGeral || ""] || "bg-slate-100 text-slate-600"}`}>
                {data.statusGeral || "—"}
              </Badge>
            </div>
          </div>
          {(data.go || data.gc || data.nucleo) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              {data.go && <div><p className="text-xs text-slate-400 uppercase">GO</p><p className="text-sm text-slate-700">{data.go}</p></div>}
              {data.gc && <div><p className="text-xs text-slate-400 uppercase">GC</p><p className="text-sm text-slate-700">{data.gc}</p></div>}
              {data.nucleo && <div><p className="text-xs text-slate-400 uppercase">Núcleo</p><p className="text-sm text-slate-700">{data.nucleo}</p></div>}
              {data.diretoria && <div><p className="text-xs text-slate-400 uppercase">Diretoria</p><p className="text-sm text-slate-700">{data.diretoria}</p></div>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Score Geral", score: data.scoreGeral, status: data.statusGeral },
          { label: "Condição de Obra", score: data.scoreCondicao, status: data.statusCondicao },
          { label: "Qualidade de Obra", score: data.scoreQualidade, status: data.statusQualidade },
          { label: "Cronograma", score: data.scoreCronograma, status: data.statusCronograma },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="p-5 text-center">
              <p className="text-xs text-slate-400 uppercase mb-2">{item.label}</p>
              <p className="text-3xl font-bold text-slate-900">{item.score ?? "—"}%</p>
              <Badge className={`mt-2 ${statusColors[item.status || ""] || "bg-slate-100 text-slate-600"}`}>
                {item.status || "—"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Checklist Detalhado */}
      {data.checklist?.map((secao: any) => {
        const secaoRespostas = secao.itens?.map((item: any) => respostaMap.get(item.id)) || [];
        const atCount = secaoRespostas.filter((r: any) => r?.resposta === "AT").length;
        const natCount = secaoRespostas.filter((r: any) => r?.resposta === "NAT").length;
        const grCount = secaoRespostas.filter((r: any) => r?.resposta === "GR").length;
        const naCount = secaoRespostas.filter((r: any) => r?.resposta === "NA").length;

        return (
          <Card key={secao.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                    {secao.numero}
                  </span>
                  {secao.titulo}
                  <span className="text-sm font-normal text-slate-400">(Peso: {secao.peso})</span>
                </CardTitle>
                <div className="flex gap-1">
                  {atCount > 0 && <Badge className="bg-emerald-100 text-emerald-700 text-xs">{atCount} AT</Badge>}
                  {natCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{natCount} NAT</Badge>}
                  {grCount > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{grCount} GR</Badge>}
                  {naCount > 0 && <Badge className="bg-slate-100 text-slate-600 text-xs">{naCount} NA</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {secao.itens?.map((item: any) => {
                const resp = respostaMap.get(item.id) as any;
                const respInfo = resp ? respIcons[resp.resposta] : null;
                const Icon = respInfo?.icon || MinusCircle;
                return (
                  <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg ${respInfo?.bg || "bg-slate-50"}`}>
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${respInfo?.color || "text-slate-300"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 font-mono text-xs">{item.codigo}</Badge>
                        <p className="text-sm text-slate-700">{item.descricao}</p>
                      </div>
                      {resp?.observacao && (
                        <p className="mt-1 text-sm text-slate-500 italic ml-0">Obs: {resp.observacao}</p>
                      )}
                    </div>
                    <Badge className={`shrink-0 ${respInfo?.bg || ""} ${respInfo?.color || ""} border-0`}>
                      {respInfo?.label || "—"}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Observações */}
      {data.observacoes && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Observações Gerais</CardTitle></CardHeader>
          <CardContent><p className="text-slate-700">{data.observacoes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
