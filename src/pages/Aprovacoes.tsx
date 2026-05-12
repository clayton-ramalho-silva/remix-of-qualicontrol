import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ShieldCheck, Check, X, Search, Loader2, CheckCircle2,
  AlertTriangle, MapPin, Calendar, Building2, Image as ImageIcon,
} from "lucide-react";

type TipoAprovacao = "gerenciadora" | "arquitetura";

type Desvio = {
  id: number;
  descricao: string;
  disciplina: string | null;
  fornecedor_nome: string | null;
  severidade: "leve" | "moderado" | "grave";
  status: string;
  localizacao: string | null;
  data_identificacao: number | null;
  obra_id: number;
  tag_solicitado_gerenciadora: number;
  tag_solicitado_arquitetura: number;
};

type Aprovacao = {
  id: number;
  desvio_id: number;
  tipo: TipoAprovacao;
  decisao: "aprovado" | "reprovado";
  aprovador_nome: string | null;
  comentario: string | null;
  created_at: string;
};

const sevColors: Record<string, string> = {
  grave: "bg-red-100 text-red-700 border-red-200",
  moderado: "bg-amber-100 text-amber-700 border-amber-200",
  leve: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const tipoLabels: Record<TipoAprovacao, string> = {
  gerenciadora: "Gerenciadora",
  arquitetura: "Arquitetura Externa",
};

const tipoRoles: Record<TipoAprovacao, string> = {
  gerenciadora: "aprovador_gerenciadora",
  arquitetura: "aprovador_arquitetura",
};

export default function Aprovacoes({ tipo }: { tipo: TipoAprovacao }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [desvios, setDesvios] = useState<Desvio[]>([]);
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [fotosByDesvio, setFotosByDesvio] = useState<Record<number, string[]>>({});
  const [obras, setObras] = useState<Record<number, { codigo: string; nome: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Desvio | null>(null);
  const [reproveOpen, setReproveOpen] = useState(false);
  const [reproveText, setReproveText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canApprove =
    !!user && (user.role === "admin" || user.roles?.includes(tipoRoles[tipo]));

  const tagCol = tipo === "gerenciadora" ? "tag_solicitado_gerenciadora" : "tag_solicitado_arquitetura";

  async function loadAll() {
    setLoading(true);
    const [{ data: desv }, { data: aprov }, { data: obrasData }] = await Promise.all([
      supabase
        .from("desvios")
        .select("*")
        .eq("status", "aguardando_aceite")
        .eq(tagCol, 1)
        .is("deleted_at", null)
        .order("data_identificacao", { ascending: false }),
      supabase.from("desvio_aprovacoes").select("*").eq("tipo", tipo),
      supabase.from("obras").select("id, codigo, nome"),
    ]);
    const desvList = (desv || []) as Desvio[];
    setDesvios(desvList);
    setAprovacoes((aprov || []) as Aprovacao[]);
    const obrasMap: Record<number, { codigo: string; nome: string }> = {};
    (obrasData || []).forEach((o: any) => { obrasMap[o.id] = { codigo: o.codigo, nome: o.nome }; });
    setObras(obrasMap);

    // load opening photos for thumbnails
    if (desvList.length > 0) {
      const ids = desvList.map((d) => d.id);
      const { data: fotos } = await supabase
        .from("fotos_evidencia")
        .select("desvio_id, url, tipo")
        .in("desvio_id", ids);
      const map: Record<number, string[]> = {};
      (fotos || []).forEach((f: any) => {
        if (f.tipo === "fechamento") return;
        if (!map[f.desvio_id]) map[f.desvio_id] = [];
        map[f.desvio_id].push(f.url);
      });
      setFotosByDesvio(map);
    } else {
      setFotosByDesvio({});
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  // Considerar pendentes apenas os que ainda não têm aprovação registrada para este tipo
  const aprovadosIds = useMemo(
    () => new Set(aprovacoes.map((a) => a.desvio_id)),
    [aprovacoes]
  );

  const pendentes = useMemo(() => {
    return desvios
      .filter((d) => !aprovadosIds.has(d.id))
      .filter((d) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          d.descricao?.toLowerCase().includes(q) ||
          d.localizacao?.toLowerCase().includes(q) ||
          d.fornecedor_nome?.toLowerCase().includes(q) ||
          String(d.id).includes(q)
        );
      });
  }, [desvios, aprovadosIds, search]);

  // Aprovações já realizadas (histórico) — exibe abaixo
  const historicoAprovacoes = useMemo(
    () => [...aprovacoes].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20),
    [aprovacoes]
  );

  async function finalizarSeUltima(desvio: Desvio) {
    // Se essa for a última pendência (a outra tag, se ativa, já está aprovada),
    // muda status para fechado.
    const outraTipo: TipoAprovacao = tipo === "gerenciadora" ? "arquitetura" : "gerenciadora";
    const outraAtiva =
      outraTipo === "gerenciadora"
        ? desvio.tag_solicitado_gerenciadora === 1
        : desvio.tag_solicitado_arquitetura === 1;

    let outraOk = true;
    if (outraAtiva) {
      const { data: outraAprov } = await supabase
        .from("desvio_aprovacoes")
        .select("decisao")
        .eq("desvio_id", desvio.id)
        .eq("tipo", outraTipo)
        .order("created_at", { ascending: false })
        .limit(1);
      outraOk = !!outraAprov && outraAprov.length > 0 && outraAprov[0].decisao === "aprovado";
    }

    if (outraOk) {
      await supabase
        .from("desvios")
        .update({ status: "fechado", data_fechamento: Date.now() })
        .eq("id", desvio.id);
    }
  }

  async function aprovar(desvio: Desvio) {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("desvio_aprovacoes").insert({
      desvio_id: desvio.id,
      tipo,
      decisao: "aprovado",
      aprovador_id: user.id,
      aprovador_nome: user.name ?? user.email ?? null,
    });
    if (error) {
      setSubmitting(false);
      toast.error("Erro ao aprovar: " + error.message);
      return;
    }
    await supabase.from("historico").insert({
      desvio_id: desvio.id,
      tipo: "status",
      descricao: `Aprovado — ${tipoLabels[tipo]}`,
      user_id: user.id,
      user_name: user.name ?? user.email ?? null,
    });
    await finalizarSeUltima(desvio);
    setSubmitting(false);
    setSelected(null);
    toast.success("Aprovação registrada");
    loadAll();
  }

  async function reprovar(desvio: Desvio, comentario: string) {
    if (!user) return;
    if (!comentario.trim()) {
      toast.error("Comentário obrigatório ao reprovar");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("desvio_aprovacoes").insert({
      desvio_id: desvio.id,
      tipo,
      decisao: "reprovado",
      aprovador_id: user.id,
      aprovador_nome: user.name ?? user.email ?? null,
      comentario: comentario.trim(),
    });
    if (error) {
      setSubmitting(false);
      toast.error("Erro ao reprovar: " + error.message);
      return;
    }
    await supabase.from("historico").insert({
      desvio_id: desvio.id,
      tipo: "status",
      descricao: `Reprovado — ${tipoLabels[tipo]}: ${comentario.trim()}`,
      user_id: user.id,
      user_name: user.name ?? user.email ?? null,
    });
    await supabase.from("desvios").update({ status: "em_andamento" }).eq("id", desvio.id);
    setSubmitting(false);
    setReproveOpen(false);
    setReproveText("");
    setSelected(null);
    toast.success("Reprovação registrada");
    loadAll();
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Aprovações — {tipoLabels[tipo]}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Desvios em "Aguardando Aceite" que solicitaram aprovação da {tipoLabels[tipo]}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-base px-3 py-1.5">
            {pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}
          </Badge>
          {!canApprove && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-help">Somente leitura</Badge>
              </TooltipTrigger>
              <TooltipContent>
                Você não tem permissão de Aprovador {tipoLabels[tipo]}.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, fornecedor, local ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : pendentes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-semibold">Nenhuma aprovação pendente</p>
            <p className="text-muted-foreground text-sm mt-1">
              Você está em dia com as aprovações da {tipoLabels[tipo]}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendentes.map((d) => {
            const fotos = fotosByDesvio[d.id] || [];
            const obra = obras[d.obra_id];
            return (
              <Card
                key={d.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(d)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">#{d.id}</span>
                        <Badge className={`text-[10px] ${sevColors[d.severidade]}`} variant="outline">
                          {d.severidade}
                        </Badge>
                        {obra && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {obra.codigo}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1.5 line-clamp-2">{d.descricao}</p>
                    </div>
                    {fotos[0] && (
                      <img
                        src={fotos[0]}
                        alt=""
                        className="h-16 w-16 object-cover rounded border shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {d.localizacao && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{d.localizacao}</span>
                    )}
                    {d.data_identificacao && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(Number(d.data_identificacao)).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {d.fornecedor_nome && <span>Fornecedor: {d.fornecedor_nome}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Histórico recente */}
      {historicoAprovacoes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aprovações recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historicoAprovacoes.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 text-sm py-1.5 border-b last:border-b-0 cursor-pointer hover:bg-muted/30 px-2 rounded"
                  onClick={() => setLocation(`/desvios/${a.desvio_id}`)}
                >
                  {a.decisao === "aprovado" ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-mono text-xs text-muted-foreground">#{a.desvio_id}</span>
                  <span className="flex-1 truncate">
                    <span className={a.decisao === "aprovado" ? "text-emerald-700" : "text-red-700"}>
                      {a.decisao === "aprovado" ? "Aprovado" : "Reprovado"}
                    </span>
                    {a.aprovador_nome ? ` por ${a.aprovador_nome}` : ""}
                    {a.comentario ? ` — ${a.comentario}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog detalhe + ações */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Desvio #{selected.id}
                  <Badge className={`text-[10px] ${sevColors[selected.severidade]}`} variant="outline">
                    {selected.severidade}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Aprovação solicitada à {tipoLabels[tipo]}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descrição</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.descricao}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Obra</p>
                    <p className="font-medium">
                      {obras[selected.obra_id]
                        ? `${obras[selected.obra_id].codigo} — ${obras[selected.obra_id].nome}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Local</p>
                    <p className="font-medium">{selected.localizacao || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fornecedor</p>
                    <p className="font-medium">{selected.fornecedor_nome || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Identificação</p>
                    <p className="font-medium">
                      {selected.data_identificacao
                        ? new Date(Number(selected.data_identificacao)).toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  </div>
                </div>
                {(fotosByDesvio[selected.id] || []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> Evidências
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(fotosByDesvio[selected.id] || []).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="h-24 w-32 object-cover rounded border"
                        />
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  variant="link"
                  className="px-0"
                  onClick={() => setLocation(`/desvios/${selected.id}`)}
                >
                  Ver desvio completo →
                </Button>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                {canApprove ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => { setReproveText(""); setReproveOpen(true); }}
                      disabled={submitting}
                    >
                      <X className="h-4 w-4 mr-1.5" /> Reprovar
                    </Button>
                    <Button
                      onClick={() => aprovar(selected)}
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                      Aprovar
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Apenas Aprovadores {tipoLabels[tipo]} podem aprovar/reprovar.
                  </p>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog reprovar */}
      <Dialog open={reproveOpen} onOpenChange={setReproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar desvio #{selected?.id}</DialogTitle>
            <DialogDescription>
              Informe o motivo da reprovação. O desvio voltará ao status "Em Andamento".
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reproveText}
            onChange={(e) => setReproveText(e.target.value)}
            placeholder="Descreva o que precisa ser corrigido..."
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReproveOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => selected && reprovar(selected, reproveText)}
              disabled={submitting || !reproveText.trim()}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Confirmar reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}