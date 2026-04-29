import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Truck, PlusCircle, Trophy, AlertTriangle, Clock, TrendingDown,
  TrendingUp, Loader2, Medal, Search, Pencil, Mail, Phone, User,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function Fornecedores() {
  const utils = trpc.useUtils();
  const { data: fornecedores, isLoading: fornLoading } = trpc.fornecedores.list.useQuery();
  const [selectedObraId, setSelectedObraId] = useState<string>("all");
  const { data: obras } = trpc.obras.list.useQuery();
  const obraIdNum = selectedObraId === "all" ? undefined : parseInt(selectedObraId);
  const { data: performance, isLoading: perfLoading } = trpc.kpis.fornecedorPerformance.useQuery(
    obraIdNum ? { obraId: obraIdNum } : undefined
  );

  // Filtro de busca
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog de criação
  const [showDialog, setShowDialog] = useState(false);
  const [nome, setNome] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // Dialog de edição
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editDisciplina, setEditDisciplina] = useState("");
  const [editContato, setEditContato] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const createFornecedor = trpc.fornecedores.create.useMutation({
    onSuccess: () => {
      utils.fornecedores.list.invalidate();
      setShowDialog(false);
      setNome(""); setDisciplina(""); setContato(""); setTelefone(""); setEmail("");
      toast.success("Fornecedor cadastrado com sucesso!");
    },
    onError: () => toast.error("Erro ao cadastrar fornecedor"),
  });

  const updateFornecedor = trpc.fornecedores.update.useMutation({
    onSuccess: () => {
      utils.fornecedores.list.invalidate();
      setShowEditDialog(false);
      setEditId(null);
      toast.success("Fornecedor atualizado com sucesso!");
    },
    onError: () => toast.error("Erro ao atualizar fornecedor"),
  });

  const openEditDialog = (f: NonNullable<typeof fornecedores>[number]) => {
    setEditId(f.id);
    setEditNome(f.nome);
    setEditDisciplina(f.disciplina || "");
    setEditContato(f.contato || "");
    setEditTelefone(f.telefone || "");
    setEditEmail((f as any).email || "");
    setShowEditDialog(true);
  };

  // Filtrar fornecedores
  const filteredFornecedores = useMemo(() => {
    if (!fornecedores) return [];
    if (!searchTerm.trim()) return fornecedores;
    const term = searchTerm.toLowerCase();
    return fornecedores.filter(f =>
      f.nome.toLowerCase().includes(term) ||
      (f.disciplina && f.disciplina.toLowerCase().includes(term)) ||
      (f.contato && f.contato.toLowerCase().includes(term)) ||
      ((f as any).email && (f as any).email.toLowerCase().includes(term))
    );
  }, [fornecedores, searchTerm]);

  const ranking = useMemo(() => {
    if (!performance) return [];
    return performance.sort((a, b) => b.totalDesvios - a.totalDesvios);
  }, [performance]);

  const chartData = useMemo(() => {
    if (!ranking) return [];
    return ranking.slice(0, 10).map(r => ({
      name: r.nome.length > 18 ? r.nome.substring(0, 18) + "..." : r.nome,
      total: r.totalDesvios,
      abertos: r.abertos,
      graves: r.graves,
      fechados: r.fechados,
    }));
  }, [ranking]);

  const isLoading = fornLoading || perfLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Fornecedores
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastro, performance e ranking de fornecedores
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedObraId} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Filtrar por obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {obras?.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.codigo} - {o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-1.5" /> Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Fornecedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-sm">Nome *</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do fornecedor" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Disciplina</Label>
                  <Input value={disciplina} onChange={(e) => setDisciplina(e.target.value)} placeholder="Ex: Marcenaria, Pintura" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> E-mail</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="fornecedor@empresa.com" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Contato</Label>
                    <Input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Nome do contato" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone</Label>
                    <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" className="mt-1" />
                  </div>
                </div>
                <Button className="w-full" disabled={!nome || createFornecedor.isPending}
                  onClick={() => createFornecedor.mutate({
                    nome,
                    disciplina: disciplina || undefined,
                    contato: contato || undefined,
                    telefone: telefone || undefined,
                    email: email || undefined,
                  })}>
                  {createFornecedor.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Cadastrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de Fornecedores com Filtro */}
      <Card className="shadow-sm border-0 bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Cadastro de Fornecedores
              {fornecedores && (
                <Badge variant="secondary" className="ml-1 font-normal">{fornecedores.length}</Badge>
              )}
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, disciplina, e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {fornLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : filteredFornecedores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchTerm ? "Nenhum fornecedor encontrado para esta busca." : "Nenhum fornecedor cadastrado."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">Nome</th>
                    <th className="text-left py-3 px-2 font-medium">Disciplina</th>
                    <th className="text-left py-3 px-2 font-medium">E-mail</th>
                    <th className="text-left py-3 px-2 font-medium">Contato</th>
                    <th className="text-left py-3 px-2 font-medium">Telefone</th>
                    <th className="text-center py-3 px-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFornecedores.map((f) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 font-medium">{f.nome}</td>
                      <td className="py-3 px-2">
                        {f.disciplina ? (
                          <Badge variant="outline" className="font-normal">{f.disciplina}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {(f as any).email ? (
                          <a href={`mailto:${(f as any).email}`} className="text-primary hover:underline flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {(f as any).email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2">{f.contato || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-3 px-2">{f.telefone || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-3 px-2 text-center">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(f)} className="h-8 w-8 p-0">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm">Nome *</Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome do fornecedor" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Disciplina</Label>
              <Input value={editDisciplina} onChange={(e) => setEditDisciplina(e.target.value)} placeholder="Ex: Marcenaria, Pintura" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> E-mail</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="fornecedor@empresa.com" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Contato</Label>
                <Input value={editContato} onChange={(e) => setEditContato(e.target.value)} placeholder="Nome do contato" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone</Label>
                <Input value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} placeholder="(11) 99999-9999" className="mt-1" />
              </div>
            </div>
            <Button className="w-full" disabled={!editNome || updateFornecedor.isPending}
              onClick={() => {
                if (editId === null) return;
                updateFornecedor.mutate({
                  id: editId,
                  nome: editNome,
                  disciplina: editDisciplina || undefined,
                  contato: editContato || undefined,
                  telefone: editTelefone || undefined,
                  email: editEmail || undefined,
                });
              }}>
              {updateFornecedor.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chart */}
      <Card className="shadow-sm border-0 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Ranking de Desvios por Fornecedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px]" />
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhum dado de performance disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="abertos" name="Abertos" fill="#f59e0b" stackId="a" />
                <Bar dataKey="fechados" name="Fechados" fill="#10b981" stackId="a" />
                <Bar dataKey="graves" name="Graves" fill="#ef4444" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Ranking Table */}
      <Card className="shadow-sm border-0 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Medal className="h-4 w-4 text-primary" /> Tabela de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum fornecedor com desvios registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">#</th>
                    <th className="text-left py-3 px-2 font-medium">Fornecedor</th>
                    <th className="text-center py-3 px-2 font-medium">Total</th>
                    <th className="text-center py-3 px-2 font-medium">Abertos</th>
                    <th className="text-center py-3 px-2 font-medium">Graves</th>
                    <th className="text-center py-3 px-2 font-medium">Fechados</th>
                    <th className="text-center py-3 px-2 font-medium">Tempo Médio</th>
                    <th className="text-center py-3 px-2 font-medium">Taxa Fech.</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.nome} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="py-3 px-2 font-medium">{r.nome}</td>
                      <td className="py-3 px-2 text-center">{r.totalDesvios}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={r.abertos > 0 ? "text-amber-600 font-medium" : ""}>{r.abertos}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={r.graves > 0 ? "text-red-600 font-medium" : ""}>{r.graves}</span>
                      </td>
                      <td className="py-3 px-2 text-center text-emerald-600">{r.fechados}</td>
                      <td className="py-3 px-2 text-center">
                        {r.tempoMedioResolucao ? `${r.tempoMedioResolucao}d` : "—"}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 ${r.taxaFechamento >= 70 ? "text-emerald-600" : r.taxaFechamento >= 40 ? "text-amber-600" : "text-red-600"}`}>
                          {r.taxaFechamento >= 70 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {r.taxaFechamento}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
