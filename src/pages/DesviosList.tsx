import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import {
  Search, Filter, ArrowRight, AlertTriangle, Clock, CheckCircle2,
  FileWarning, UserCheck, ShieldAlert, Tag, Trash2,
} from "lucide-react";

const SEV_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  leve: { label: "Leve", variant: "secondary" },
  moderado: { label: "Moderado", variant: "default" },
  grave: { label: "Grave", variant: "destructive" },
};

const STATUS_BADGE: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  aberto: { label: "Aberto", icon: <FileWarning className="h-3 w-3" />, className: "bg-amber-100 text-amber-700 border-amber-200" },
  em_andamento: { label: "Em Andamento", icon: <Clock className="h-3 w-3" />, className: "bg-blue-100 text-blue-700 border-blue-200" },
  aguardando_aceite: { label: "Aguardando Cliente", icon: <UserCheck className="h-3 w-3" />, className: "bg-purple-100 text-purple-700 border-purple-200" },
  fechado: { label: "Fechado", icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const ORIGEM_BADGE: Record<string, { label: string; className: string }> = {
  qualidade: { label: "Qualidade", className: "bg-sky-50 text-sky-700 border-sky-200" },
  checklist: { label: "Checklist", className: "bg-violet-50 text-violet-700 border-violet-200" },
   qsms: { label: "Inspeção de Segurança", className: "bg-orange-50 text-orange-700 border-orange-200" },
};

export default function DesviosList() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const deleteMutation = trpc.desvios.delete.useMutation({
    onSuccess: () => {
      toast.success("Desvio excluído");
      setConfirmDeleteId(null);
    },
  });

  const [statusFilter, setStatusFilter] = useState(params.get("status") || "all");
  const [sevFilter, setSevFilter] = useState(params.get("severidade") || "all");
  const [discFilter, setDiscFilter] = useState(params.get("disciplina") || "all");
  const [obraFilter, setObraFilter] = useState(params.get("obraId") || "all");
  const [origemFilter, setOrigemFilter] = useState(params.get("origem") || "all");
  const tagParam = params.get("tag");
  const initialTag = tagParam === "chamado_critico" ? "critico" : tagParam === "seguranca_trabalho" ? "seguranca" : tagParam === "solicitado_cliente" ? "cliente" : "all";
  const [tagFilter, setTagFilter] = useState(initialTag);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: obras } = trpc.obras.list.useQuery();

  const filters: any = {};
  if (obraFilter !== "all") filters.obraId = parseInt(obraFilter);
  if (statusFilter !== "all") filters.status = statusFilter;
  if (sevFilter !== "all") filters.severidade = sevFilter;
  if (origemFilter !== "all") filters.origem = origemFilter;
  if (tagFilter === "critico") filters.tagCritico = true;
  if (tagFilter === "seguranca") filters.tagSegurancaTrabalho = true;
  if (tagFilter === "cliente") filters.tagSolicitadoCliente = true;
  if (tagFilter === "gerenciadora") filters.tagSolicitadoGerenciadora = true;
  if (tagFilter === "arquitetura") filters.tagSolicitadoArquitetura = true;

  const { data: desvios, isLoading } = trpc.desvios.list.useQuery(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  const filteredDesvios = useMemo(() => {
    if (!desvios) return [];
    let result = desvios;
    if (discFilter !== "all") result = result.filter(d => d.disciplina === discFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.descricao.toLowerCase().includes(term) ||
        (d.disciplina || "").toLowerCase().includes(term) ||
        (d.fornecedorNome || "").toLowerCase().includes(term) ||
        (d.localizacao || "").toLowerCase().includes(term)
      );
    }
    return result;
  }, [desvios, discFilter, searchTerm]);

  const disciplinas = useMemo(() => {
    if (!desvios) return [];
    return Array.from(new Set(desvios.map(d => d.disciplina))).sort();
  }, [desvios]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Desvios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {filteredDesvios.length} desvio{filteredDesvios.length !== 1 ? "s" : ""} encontrado{filteredDesvios.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-0 bg-card">
        <CardContent className="p-4 space-y-3">
          {/* Search bar - full width */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, grupo, fornecedor, localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          {/* Filter combos - grid 3x2 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select value={obraFilter} onValueChange={setObraFilter}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Obra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as obras</SelectItem>
                {obras?.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.codigo} - {o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="aguardando_aceite">Aguardando Cliente</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Severidade</SelectItem>
                <SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="moderado">Moderado</SelectItem>
                <SelectItem value="grave">Grave</SelectItem>
              </SelectContent>
            </Select>
            <Select value={discFilter} onValueChange={(v) => setDiscFilter(v)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {(disciplinas as string[]).map((d) => (
                  <SelectItem key={String(d)} value={d || "sem-grupo"}>{d || "Sem grupo"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={origemFilter} onValueChange={setOrigemFilter}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Vertical" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vertical</SelectItem>
                <SelectItem value="qualidade">Qualidade</SelectItem>
                <SelectItem value="checklist">Checklist</SelectItem>
                 <SelectItem value="qsms">Inspeção de Segurança</SelectItem>
                <SelectItem value="vistoria">Vistoria</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Classificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Classificação</SelectItem>
                <SelectItem value="critico">Chamado Crítico</SelectItem>
                <SelectItem value="seguranca">Seg. Trabalho</SelectItem>
                <SelectItem value="cliente">Solic. Cliente</SelectItem>
                <SelectItem value="gerenciadora">Solic. Gerenciadora</SelectItem>
                <SelectItem value="arquitetura">Solic. Arquitetura</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredDesvios.length === 0 ? (
        <Card className="shadow-sm border-0">
          <CardContent className="p-12 text-center">
            <Filter className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum desvio encontrado com os filtros selecionados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDesvios.map((desvio: any) => {
            const sev = SEV_BADGE[desvio.severidade];
            const st = STATUS_BADGE[desvio.status] || STATUS_BADGE.aberto;
            const origemBadge = ORIGEM_BADGE[desvio.origem] || ORIGEM_BADGE.qualidade;
            const isOverdue = desvio.status !== "fechado" && desvio.status !== "aguardando_aceite" && desvio.prazoSugerido && desvio.prazoSugerido < Date.now();
            return (
              <Card
                key={desvio.id}
                className="shadow-sm border-0 bg-card hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setLocation(`/desvios/${desvio.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">#{desvio.id}</span>
                        <Badge variant={sev?.variant || "secondary"} className="text-xs">
                          {desvio.severidade === "grave" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {sev?.label}
                        </Badge>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${st.className}`}>
                          {st.icon} {st.label}
                        </span>
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${origemBadge.className}`}>
                          {origemBadge.label}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                            <Clock className="h-3 w-3" /> Atrasado
                          </span>
                        )}
                        {desvio.tagCritico === 1 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                            <ShieldAlert className="h-2.5 w-2.5" /> Crítico
                          </span>
                        )}
                        {desvio.tagSegurancaTrabalho === 1 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                            <AlertTriangle className="h-2.5 w-2.5" /> Segurança
                          </span>
                        )}
                        {desvio.tagSolicitadoCliente === 1 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                            <Tag className="h-2.5 w-2.5" /> Cliente
                          </span>
                        )}
                        {desvio.tagSolicitadoGerenciadora === 1 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                            <Tag className="h-2.5 w-2.5" /> Gerenciadora
                          </span>
                        )}
                        {desvio.tagSolicitadoArquitetura === 1 && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Tag className="h-2.5 w-2.5" /> Arquitetura
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{desvio.descricao}</p>
                      <div className="flex items-center gap-2 sm:gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span>{desvio.disciplina}</span>
                        {desvio.fornecedorNome && (
                          <>
                            <span className="text-border">|</span>
                            <span>{desvio.fornecedorNome}</span>
                          </>
                        )}
                        {desvio.localizacao && (
                          <>
                            <span className="text-border">|</span>
                            <span>{desvio.localizacao}</span>
                          </>
                        )}
                        <span className="text-border">|</span>
                        <span>{new Date(desvio.dataIdentificacao).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-1" />
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(desvio.id);
                        }}
                        title="Excluir desvio"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir desvio #{confirmDeleteId}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. Serão removidos também: fotos de evidência, planos de ação vinculados, aprovações e histórico deste desvio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (confirmDeleteId !== null) deleteMutation.mutate({ id: confirmDeleteId });
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
