import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft, Target, Calendar, User, AlertTriangle, CheckCircle2,
  Clock, Link2, Mail, FileText, ExternalLink, ShieldCheck, Wrench, Building2, Tag,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
};
const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  em_andamento: "bg-blue-100 text-blue-700",
  concluido: "bg-emerald-100 text-emerald-700",
};
const VERTICAL_LABELS: Record<string, string> = {
  qualidade: "Qualidade", checklist: "Checklist", qsms: "QSMS", vistoria: "Vistoria",
};

export default function PlanoAcaoDetalhe() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const id = Number(params.id);
  const { data: plano, isLoading } = trpc.planos.getById.useQuery({ id }, { enabled: !!id });
  const updateStatus = trpc.planos.updateStatus.useMutation();

  if (isLoading) return <div className="text-center py-12 text-slate-500">Carregando...</div>;
  if (!plano) return <div className="text-center py-12 text-slate-500">Plano não encontrado</div>;

  const overdue = plano.status !== "concluido" && plano.prazo && plano.prazo < Date.now();
  const canEdit = !!user?.email && (plano.responsavelEmail === user.email);

  const changeStatus = async (s: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: s });
      utils.planos.getById.invalidate({ id });
      utils.planos.list.invalidate();
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/planos-acao")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-teal-600" /> Plano de Ação #{plano.id}
            {plano.tipo === "preventivo" ? (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><ShieldCheck className="h-3 w-3" /> Preventivo</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><Wrench className="h-3 w-3" /> Corretivo</Badge>
            )}
          </h1>
        </div>
        <Badge className={STATUS_COLORS[plano.status] || ""}>{STATUS_LABELS[plano.status] || plano.status}</Badge>
      </div>

      {plano.tipo === "preventivo" && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase mb-1 flex items-center gap-1"><Building2 className="h-3 w-3" /> Obra</p>
                <p>{plano.obra ? `${plano.obra.codigo} - ${plano.obra.nome}` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase mb-1">Vertical</p>
                <p>{VERTICAL_LABELS[plano.vertical] || plano.vertical || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase mb-1 flex items-center gap-1"><Tag className="h-3 w-3" /> Categoria</p>
                <p>{plano.categoria?.nome || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base text-slate-900">{plano.acao}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1">Responsável</p>
              <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-400" />{plano.responsavel}</p>
              {plano.responsavelEmail && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="h-3 w-3" />{plano.responsavelEmail}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1">Prazo</p>
              <p className={`flex items-center gap-1.5 ${overdue ? "text-red-600 font-semibold" : ""}`}>
                <Calendar className="h-3.5 w-3.5" />
                {plano.prazo ? new Date(plano.prazo).toLocaleDateString("pt-BR") : "—"}
                {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1">Prioridade</p>
              <p className="capitalize">{plano.prioridade}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1">Status</p>
              {canEdit ? (
                <Select value={plano.status} onValueChange={changeStatus}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={STATUS_COLORS[plano.status] || ""}>{STATUS_LABELS[plano.status] || plano.status}</Badge>
              )}
            </div>
          </div>

          {plano.observacoes && (
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> Observações</p>
              <p className="text-sm bg-slate-50 rounded-md p-3 whitespace-pre-wrap">{plano.observacoes}</p>
            </div>
          )}

          {!canEdit && (
            <p className="text-xs text-slate-400 italic">Somente o responsável atribuído pode alterar o status deste plano.</p>
          )}
        </CardContent>
      </Card>

      {plano.tipo !== "preventivo" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-teal-600" /> Desvios Vinculados
            <Badge variant="secondary">{plano.desvios?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!plano.desvios || plano.desvios.length === 0) ? (
            <p className="text-sm text-slate-400 text-center py-6">Nenhum desvio vinculado</p>
          ) : (
            <div className="space-y-2">
              {plano.desvios.map((d: any) => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/desvios/${d.id}`)}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 rounded-lg p-3 border border-slate-200 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-slate-500">#{d.id}</span>
                        <Badge variant="outline" className="text-[10px]">{VERTICAL_LABELS[d.origem] || d.origem}</Badge>
                        <Badge variant={d.severidade === "grave" ? "destructive" : "secondary"} className="text-[10px]">{d.severidade}</Badge>
                        <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                      </div>
                      <p className="text-sm">{d.descricao}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-teal-600 shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}