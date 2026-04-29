import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Users, Plus, Search, Pencil, Phone, Mail, Building2,
  HelpCircle, UserCheck, Briefcase, Shield, Layers
} from "lucide-react";

const CARGOS = [
  { value: "avaliador", label: "Avaliador", icon: UserCheck, color: "bg-blue-100 text-blue-700", desc: "Realiza verificações de qualidade em campo" },
  { value: "gerente_obra", label: "Gerente de Obra", icon: Briefcase, color: "bg-emerald-100 text-emerald-700", desc: "Responsável pela execução e gestão operacional" },
  { value: "gerente_contrato", label: "Gerente de Contrato", icon: Shield, color: "bg-purple-100 text-purple-700", desc: "Responsável pela gestão contratual e comercial" },
  { value: "nucleo", label: "Núcleo", icon: Layers, color: "bg-amber-100 text-amber-700", desc: "Equipe de suporte técnico/qualidade" },
  { value: "diretoria", label: "Diretoria", icon: Shield, color: "bg-red-100 text-red-700", desc: "Nível diretivo da organização" },
  { value: "coordenador", label: "Coordenador", icon: Briefcase, color: "bg-cyan-100 text-cyan-700", desc: "Coordena equipes e atividades em campo" },
  { value: "tecnico", label: "Técnico", icon: UserCheck, color: "bg-gray-100 text-gray-700", desc: "Suporte técnico operacional" },
] as const;

type CargoValue = typeof CARGOS[number]["value"];

function getCargoInfo(cargo: string) {
  return CARGOS.find(c => c.value === cargo) || { value: cargo, label: cargo, icon: Users, color: "bg-gray-100 text-gray-700", desc: "" };
}

export default function Usuarios() {
  const [search, setSearch] = useState("");
  const [filterCargo, setFilterCargo] = useState<string>("todos");
  const [filterObra, setFilterObra] = useState<string>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cargo, setCargo] = useState<CargoValue>("avaliador");
  const [selectedObras, setSelectedObras] = useState<number[]>([]);

  const utils = trpc.useUtils();
  const { data: membros = [], isLoading } = trpc.membros.list.useQuery();
  const { data: obras = [] } = trpc.obras.list.useQuery();

  const createMutation = trpc.membros.create.useMutation({
    onSuccess: () => {
      utils.membros.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success("Membro adicionado com sucesso!");
    },
    onError: () => toast.error("Erro ao adicionar membro"),
  });

  const updateMutation = trpc.membros.update.useMutation({
    onSuccess: () => {
      utils.membros.list.invalidate();
      setEditDialogOpen(false);
      resetForm();
      toast.success("Membro atualizado com sucesso!");
    },
    onError: () => toast.error("Erro ao atualizar membro"),
  });

  function resetForm() {
    setNome(""); setEmail(""); setTelefone("");
    setCargo("avaliador"); setSelectedObras([]); setEditId(null);
  }

  function openEdit(membro: any) {
    setEditId(membro.id);
    setNome(membro.nome);
    setEmail(membro.email || "");
    setTelefone(membro.telefone || "");
    setCargo(membro.cargo);
    setSelectedObras(membro.obraIds || []);
    setEditDialogOpen(true);
  }

  function handleSubmit() {
    if (!nome.trim()) { toast.error("Nome é obrigatório"); return; }
    createMutation.mutate({
      nome: nome.trim(),
      email: email.trim() || undefined,
      telefone: telefone.trim() || undefined,
      cargo,
      obraIds: selectedObras.length > 0 ? selectedObras : undefined,
    });
  }

  function handleUpdate() {
    if (!editId || !nome.trim()) return;
    updateMutation.mutate({
      id: editId,
      nome: nome.trim(),
      email: email.trim() || undefined,
      telefone: telefone.trim() || undefined,
      cargo,
      obraIds: selectedObras.length > 0 ? selectedObras : undefined,
    });
  }

  function toggleObra(obraId: number) {
    setSelectedObras(prev =>
      prev.includes(obraId) ? prev.filter(id => id !== obraId) : [...prev, obraId]
    );
  }

  // Filtros
  const filtered = membros.filter(m => {
    const matchSearch = !search ||
      m.nome.toLowerCase().includes(search.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
      (m.telefone && m.telefone.includes(search));
    const matchCargo = filterCargo === "todos" || m.cargo === filterCargo;
    const matchObra = filterObra === "todas" || (
      (m.obraIds as number[] | null)?.includes(Number(filterObra))
    );
    return matchSearch && matchCargo && matchObra;
  });

  // Contadores por cargo
  const countByCargo = CARGOS.map(c => ({
    ...c,
    count: membros.filter(m => m.cargo === c.value).length,
  }));

  const FormFields = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label htmlFor="nome">Nome completo</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>Nome completo do membro da equipe</TooltipContent>
          </Tooltip>
        </div>
        <Input id="nome" placeholder="Ex: João Silva" value={nome} onChange={e => setNome(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>E-mail profissional para contato e notificações</TooltipContent>
            </Tooltip>
          </div>
          <Input id="email" type="email" placeholder="joao@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Label htmlFor="telefone">Telefone</Label>
          </div>
          <Input id="telefone" placeholder="(11) 99999-0000" value={telefone} onChange={e => setTelefone(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label>Cargo / Função</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">Perfis disponíveis:</p>
              {CARGOS.map(c => (
                <p key={c.value} className="text-xs"><strong>{c.label}:</strong> {c.desc}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        </div>
        <Select value={cargo} onValueChange={v => setCargo(v as CargoValue)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CARGOS.map(c => (
              <SelectItem key={c.value} value={c.value}>
                <span className="flex items-center gap-2">
                  <c.icon className="h-4 w-4" />
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label>Obras vinculadas</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>Selecione as obras em que este membro atua</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap gap-2">
          {obras.map(obra => (
            <button
              key={obra.id}
              type="button"
              onClick={() => toggleObra(obra.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                selectedObras.includes(obra.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Building2 className="h-3 w-3 inline mr-1" />
              {obra.nome}
            </button>
          ))}
          {obras.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Equipe
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os membros da equipe e seus perfis de acesso</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Membro</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Membro da Equipe</DialogTitle>
            </DialogHeader>
            <FormFields />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumo por cargo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {countByCargo.map(c => (
          <Card
            key={c.value}
            className={`cursor-pointer transition-all hover:shadow-md ${filterCargo === c.value ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilterCargo(filterCargo === c.value ? "todos" : c.value)}
          >
            <CardContent className="p-3 text-center">
              <c.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{c.count}</p>
              <p className="text-xs text-muted-foreground truncate">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou telefone..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterCargo} onValueChange={setFilterCargo}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os cargos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os cargos</SelectItem>
                {CARGOS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterObra} onValueChange={setFilterObra}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as obras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as obras</SelectItem>
                {obras.map(o => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de membros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} {filtered.length === 1 ? "membro" : "membros"} encontrado{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum membro encontrado</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(membro => {
                const cargoInfo = getCargoInfo(membro.cargo);
                const obraIds = (membro.obraIds as number[] | null) || [];
                const membroObras = obras.filter(o => obraIds.includes(o.id));
                return (
                  <div key={membro.id} className="flex items-center justify-between py-3 px-2 hover:bg-muted/30 rounded-lg transition-colors">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${cargoInfo.color}`}>
                        <cargoInfo.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{membro.nome}</p>
                          <Badge variant="secondary" className={`text-xs ${cargoInfo.color}`}>
                            {cargoInfo.label}
                          </Badge>
                          {membro.ativo === 0 && (
                            <Badge variant="outline" className="text-xs text-red-500 border-red-200">Inativo</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-0.5 text-sm text-muted-foreground">
                          {membro.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />{membro.email}
                            </span>
                          )}
                          {membro.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />{membro.telefone}
                            </span>
                          )}
                        </div>
                        {membroObras.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <div className="flex gap-1 flex-wrap">
                              {membroObras.map(o => (
                                <span key={o.id} className="text-xs bg-muted px-2 py-0.5 rounded-full">{o.nome}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(membro)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de edição */}
      <Dialog open={editDialogOpen} onOpenChange={v => { setEditDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
          </DialogHeader>
          <FormFields />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
