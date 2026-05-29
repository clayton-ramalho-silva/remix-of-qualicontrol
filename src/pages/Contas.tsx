import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KeyRound, Loader2, Plus, Search, Shield, Trash2, UserCog, Users } from "lucide-react";

type AppRole = "admin" | "user" | "aprovador_gerenciadora" | "aprovador_arquitetura";
const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "aprovador_gerenciadora", label: "Aprovador Gerenciadora" },
  { value: "aprovador_arquitetura", label: "Aprovador Arquitetura" },
];

type Account = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  roles: AppRole[];
};

export default function Contas() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [fId, setFId] = useState<string | null>(null);
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
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
    setFId(null); setFName(""); setFEmail(""); setFPassword(""); setFRoles(new Set());
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function openEdit(acc: Account) {
    setFId(acc.id);
    setFName(acc.name ?? "");
    setFEmail(acc.email ?? "");
    setFPassword("");
    setFRoles(new Set(acc.roles));
    setEditOpen(true);
  }

  function toggleRole(role: AppRole) {
    setFRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  }

  async function submitCreate() {
    if (!fEmail.trim() || !fPassword.trim()) { toast.error("Email e senha obrigatórios"); return; }
    if (fPassword.length < 6) { toast.error("Senha mínima 6 caracteres"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-accounts", {
      body: {
        action: "create",
        email: fEmail.trim(),
        password: fPassword,
        name: fName.trim() || null,
        roles: [...fRoles],
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((error?.message || (data as any)?.error) ?? "Erro ao criar conta");
      return;
    }
    toast.success("Conta criada");
    setCreateOpen(false);
    resetForm();
    load();
  }

  async function submitEdit() {
    if (!fId) return;
    if (!fEmail.trim()) { toast.error("Email obrigatório"); return; }
    if (fPassword && fPassword.length < 6) { toast.error("Senha mínima 6 caracteres"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-accounts", {
      body: {
        action: "update",
        id: fId,
        email: fEmail.trim(),
        name: fName.trim(),
        password: fPassword || undefined,
        roles: [...fRoles],
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((error?.message || (data as any)?.error) ?? "Erro ao atualizar");
      return;
    }
    toast.success("Conta atualizada");
    setEditOpen(false);
    resetForm();
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
    toast.success("Conta eliminada");
    setDeleteTarget(null);
    load();
  }

  if (authLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Shield className="h-8 w-8 mx-auto mb-2" />
          Acesso restrito a administradores.
        </CardContent>
      </Card>
    );
  }

  const filtered = accounts.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.email ?? "").toLowerCase().includes(q) || (a.name ?? "").toLowerCase().includes(q);
  });

  const formFields = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="acc-name">Nome</Label>
        <Input id="acc-name" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Ex: João Silva" />
      </div>
      <div>
        <Label htmlFor="acc-email">Email</Label>
        <Input id="acc-email" type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="email@empresa.com" />
      </div>
      <div>
        <Label htmlFor="acc-password">{fId ? "Nova palavra-passe (opcional)" : "Palavra-passe"}</Label>
        <Input id="acc-password" type="text" value={fPassword} onChange={(e) => setFPassword(e.target.value)} placeholder="Mín. 6 caracteres" autoComplete="new-password" />
      </div>
      <div>
        <Label>Permissões</Label>
        <div className="space-y-2 mt-2 rounded-md border border-border p-3">
          {ROLE_OPTIONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={fRoles.has(r.value)} onCheckedChange={() => toggleRole(r.value)} />
              <span className="text-sm">{r.label}</span>
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
            Contas
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie as contas de acesso ao sistema</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nova Conta</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Criar nova conta</DialogTitle></DialogHeader>
            {formFields}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={submitCreate} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Nenhuma conta encontrada</div>
          ) : (
            <div className="divide-y">
              {filtered.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-4 gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{acc.name || "(sem nome)"}</span>
                      {acc.roles.includes("admin") && (
                        <Badge variant="default" className="text-[10px]">Admin</Badge>
                      )}
                      {acc.roles.filter((r) => r !== "admin" && r !== "user").map((r) => (
                        <Badge key={r} variant="secondary" className="text-[10px]">
                          {ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{acc.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Último acesso: {acc.last_sign_in_at ? new Date(acc.last_sign_in_at).toLocaleString("pt-BR") : "nunca"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(acc)}>
                      <UserCog className="h-4 w-4 mr-1" />Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={acc.id === user?.id}
                      onClick={() => setDeleteTarget(acc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar conta</DialogTitle></DialogHeader>
          {formFields}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={submitEdit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção remove permanentemente a conta de <strong>{deleteTarget?.email}</strong>. Não pode ser desfeita.
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
