import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, Loader2, Mail, Phone, Plus, Search, Shield, Trash2, UserCog, Users,
  UserCheck, Briefcase, Layers,
} from "lucide-react";

type AppRole = "admin" | "user" | "aprovador_gerenciadora" | "aprovador_arquitetura";
const ROLE_OPTIONS: { value: AppRole; label: string; desc: string }[] = [
  { value: "admin", label: "Administrador", desc: "Acesso total ao sistema, incluindo gestão de contas" },
  { value: "aprovador_gerenciadora", label: "Aprovador — Gerenciadora", desc: "Aprova/reprova desvios na fila Gerenciadora" },
  { value: "aprovador_arquitetura", label: "Aprovador — Arquitetura", desc: "Aprova/reprova desvios na fila Arquitetura Externa" },
];

const CARGOS = [
  { value: "avaliador", label: "Avaliador", icon: UserCheck, color: "bg-blue-100 text-blue-700" },
  { value: "gerente_obra", label: "Gerente de Obra", icon: Briefcase, color: "bg-emerald-100 text-emerald-700" },
  { value: "gerente_contrato", label: "Gerente de Contrato", icon: Shield, color: "bg-purple-100 text-purple-700" },
  { value: "nucleo", label: "Núcleo", icon: Layers, color: "bg-amber-100 text-amber-700" },
  { value: "diretoria", label: "Diretoria", icon: Shield, color: "bg-red-100 text-red-700" },
  { value: "coordenador", label: "Coordenador", icon: Briefcase, color: "bg-cyan-100 text-cyan-700" },
  { value: "tecnico", label: "Técnico", icon: UserCheck, color: "bg-gray-100 text-gray-700" },
] as const;
type CargoValue = typeof CARGOS[number]["value"];
const getCargoInfo = (c: string) => CARGOS.find((x) => x.value === c) || { value: c, label: c, icon: Users, color: "bg-gray-100 text-gray-700" };

type Account = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  roles: AppRole[];
  membro_id: number | null;
  telefone: string | null;
  cargo: CargoValue | null;
  obra_ids: number[];
  ativo: number;
};

export default function Contas() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: obras = [] } = trpc.obras.list.useQuery();

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [filterCargo, setFilterCargo] = useState<string>("todos");
  const [filterObra, setFilterObra] = useState<string>("todas");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  // form state
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fTelefone, setFTelefone] = useState("");
  const [fCargo, setFCargo] = useState<CargoValue>("avaliador");
  const [fObras, setFObras] = useState<number[]>([]);
  const [fPassword, setFPassword] = useState("");
  const [fRoles, setFRoles] = useState<Set<AppRole>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-accounts", {
      body: { action: "list" },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast.error((error?.message || (data as any)?.error) ?? "Erro ao carregar contas");
      return;
    }
    setAccounts((data as any).accounts ?? []);
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  function resetForm() {
    setFName(""); setFEmail(""); setFTelefone(""); setFCargo("avaliador");
    setFObras([]); setFPassword(""); setFRoles(new Set());
  }

  function openCreate() {
    resetForm();
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(acc: Account) {
    setEditing(acc);
    setFName(acc.name ?? "");
    setFEmail(acc.email ?? "");
    setFTelefone(acc.telefone ?? "");
    setFCargo((acc.cargo as CargoValue) ?? "avaliador");
    setFObras(acc.obra_ids ?? []);
    setFPassword("");
    setFRoles(new Set(acc.roles));
    setDialogOpen(true);
  }

  function toggleRole(role: AppRole) {
    setFRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  }

  function toggleObra(id: number) {
    setFObras((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submit() {
    if (!fName.trim()) { toast.error("Nome obrigatório"); return; }
    if (!fEmail.trim()) { toast.error("Email obrigatório"); return; }
    if (!editing && !fPassword.trim()) { toast.error("Senha obrigatória para novo usuário"); return; }
    if (fPassword && fPassword.length < 6) { toast.error("Senha mínima 6 caracteres"); return; }

    setSubmitting(true);
    const payload: any = {
      action: editing ? "update" : "create",
      email: fEmail.trim(),
      name: fName.trim(),
      telefone: fTelefone.trim() || null,
      cargo: fCargo,
      obra_ids: fObras,
      roles: [...fRoles],
    };
    if (editing) payload.id = editing.id;
    if (fPassword) payload.password = fPassword;

    const { data, error } = await supabase.functions.invoke("admin-accounts", { body: payload });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((error?.message || (data as any)?.error) ?? "Erro ao guardar");
      return;
    }
    toast.success(editing ? "Usuário atualizado" : "Usuário criado");
    setDialogOpen(false);
    resetForm();
    setEditing(null);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-accounts", {
      body: { action: "delete", id: deleteTarget.id },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((error?.message || (data as any)?.error) ?? "Erro ao eliminar");
      return;
    }
    toast.success("Usuário eliminado");
    setDeleteTarget(null);
    load();
  }

  async function bootstrapAdmins() {
    setBootstrapping(true);
    const { data, error } = await supabase.functions.invoke("admin-accounts", {
      body: { action: "bootstrap_admins" },
    });
    setBootstrapping(false);
    if (error || (data as any)?.error) {
      toast.error((error?.message || (data as any)?.error) ?? "Erro");
      return;
    }
    toast.success("Admins iniciais configurados");
    load();
  }

  const filtered = useMemo(() => accounts.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (a.name ?? "").toLowerCase().includes(q)
      || (a.email ?? "").toLowerCase().includes(q)
      || (a.telefone ?? "").includes(q);
    const matchCargo = filterCargo === "todos" || a.cargo === filterCargo;
    const matchObra = filterObra === "todas" || a.obra_ids?.includes(Number(filterObra));
    return matchSearch && matchCargo && matchObra;
  }), [accounts, search, filterCargo, filterObra]);

  if (authLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Shield className="h-8 w-8 mx-auto mb-2" />
          Apenas administradores podem aceder à gestão de usuários.
        </CardContent>
      </Card>
    );
  }

  const formFields = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="acc-name">Nome completo *</Label>
        <Input id="acc-name" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Ex: João Silva" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="acc-email">Email *</Label>
          <Input id="acc-email" type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="email@empresa.com" />
        </div>
        <div>
          <Label htmlFor="acc-tel">Telefone</Label>
          <Input id="acc-tel" value={fTelefone} onChange={(e) => setFTelefone(e.target.value)} placeholder="(11) 99999-0000" />
        </div>
      </div>

      <div>
        <Label>Cargo *</Label>
        <Select value={fCargo} onValueChange={(v) => setFCargo(v as CargoValue)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CARGOS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <span className="flex items-center gap-2"><c.icon className="h-4 w-4" />{c.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Obras vinculadas</Label>
        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto rounded-md border border-border p-2 mt-1">
          {obras.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggleObra(o.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                fObras.includes(o.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Building2 className="h-3 w-3 inline mr-1" />{o.nome}
            </button>
          ))}
          {obras.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="acc-pw">{editing ? "Nova palavra-passe (deixe vazio para manter)" : "Palavra-passe *"}</Label>
        <Input id="acc-pw" type="text" value={fPassword} onChange={(e) => setFPassword(e.target.value)} placeholder="Mín. 6 caracteres" autoComplete="new-password" />
      </div>

      <div>
        <Label>Permissões especiais</Label>
        <div className="space-y-2 mt-2 rounded-md border border-border p-3">
          {ROLE_OPTIONS.map((r) => (
            <label key={r.value} className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={fRoles.has(r.value)} onCheckedChange={() => toggleRole(r.value)} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Usuários
          </h1>
          <p className="text-muted-foreground mt-1">Gestão unificada de membros da equipe e acessos ao sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={bootstrapAdmins} disabled={bootstrapping}>
            {bootstrapping && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Configurar admins iniciais
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { resetForm(); setEditing(null); } }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle></DialogHeader>
              {formFields}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancelar</Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editing ? "Guardar" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Buscar por nome, email ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterCargo} onValueChange={setFilterCargo}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os cargos</SelectItem>
                {CARGOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterObra} onValueChange={setFilterObra}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as obras</SelectItem>
                {obras.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Nenhum usuário encontrado</div>
          ) : (
            <div className="divide-y">
              {filtered.map((acc) => {
                const cargoInfo = getCargoInfo(acc.cargo ?? "");
                const accObras = obras.filter((o) => acc.obra_ids?.includes(o.id));
                return (
                  <div key={acc.id} className="flex items-center justify-between p-4 gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${cargoInfo.color}`}>
                        <cargoInfo.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{acc.name || "(sem nome)"}</span>
                          {acc.cargo && <Badge variant="secondary" className={`text-xs ${cargoInfo.color}`}>{cargoInfo.label}</Badge>}
                          {acc.roles.includes("admin") && <Badge variant="default" className="text-[10px]">Admin</Badge>}
                          {acc.roles.filter((r) => r !== "admin" && r !== "user").map((r) => (
                            <Badge key={r} variant="outline" className="text-[10px]">
                              {ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-0.5 text-sm text-muted-foreground flex-wrap">
                          {acc.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{acc.email}</span>}
                          {acc.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{acc.telefone}</span>}
                        </div>
                        {accObras.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {accObras.map((o) => (
                              <span key={o.id} className="text-xs bg-muted px-2 py-0.5 rounded-full">{o.nome}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Último acesso: {acc.last_sign_in_at ? new Date(acc.last_sign_in_at).toLocaleString("pt-BR") : "nunca"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(acc)}>
                        <UserCog className="h-4 w-4 mr-1" />Editar
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={acc.id === user?.id}
                        onClick={() => setDeleteTarget(acc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove permanentemente o usuário <strong>{deleteTarget?.email}</strong>, a sua conta de acesso e o registo na equipe. Não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
