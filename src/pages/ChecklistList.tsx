import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Plus, Loader2, Pencil, Printer, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Row = {
  id: number;
  data_vistoria: number;
  metragem_m2: number | null;
  gc: string | null;
  go: string | null;
  condicao: "ruim" | "regular" | "otima";
  total_itens: number;
  status: "rascunho" | "finalizado" | null;
  obra: { codigo: string; nome: string } | null;
};

const condBadge: Record<Row["condicao"], string> = {
  ruim: "bg-red-100 text-red-700 border-red-200",
  regular: "bg-amber-100 text-amber-700 border-amber-200",
  otima: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function ChecklistList() {
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mostrarRascunhos, setMostrarRascunhos] = useState(false);

  async function load() {
    setLoading(true);
    const { data: ents } = await supabase
      .from("checklist_entregas")
      .select("*")
      .order("data_vistoria", { ascending: false });
    const { data: obras } = await supabase.from("obras").select("id, codigo, nome");
    const obraMap: Record<number, { codigo: string; nome: string }> = {};
    (obras || []).forEach((o: any) => (obraMap[o.id] = { codigo: o.codigo, nome: o.nome }));
    setRows(
      ((ents || []) as any[]).map((e) => ({ ...e, obra: obraMap[e.obra_id] || null }))
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const rascunhoCount = rows.filter((r) => r.status === "rascunho").length;
  const visibleRows = mostrarRascunhos ? rows : rows.filter((r) => r.status !== "rascunho");

  async function handleDelete() {
    if (confirmDeleteId === null) return;
    setDeleting(true);
    const { error } = await supabase.from("checklist_entregas").delete().eq("id", confirmDeleteId);
    setDeleting(false);
    if (error) {
      toast.error("Erro ao excluir checklist");
      return;
    }
    toast.success("Checklist excluído");
    setConfirmDeleteId(null);
    load();
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" /> Checklist de Vistoria de Entrega
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Relatórios de entrega de obra por disciplina</p>
        </div>
        <Button onClick={() => navigate("/checklists/novo")}>
          <Plus className="h-4 w-4 mr-1" /> Novo Checklist
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhum checklist cadastrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Obra</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Metragem</th>
                  <th className="text-left p-3">GC / GO</th>
                  <th className="text-left p-3">Condição</th>
                  <th className="text-left p-3">Itens</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/20">
                    <td className="p-3">{r.obra ? `${r.obra.codigo} — ${r.obra.nome}` : "-"}</td>
                    <td className="p-3">{new Date(r.data_vistoria).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3">{r.metragem_m2 ? `${r.metragem_m2} m²` : "-"}</td>
                    <td className="p-3 text-xs">
                      <div>GC: {r.gc || "-"}</div>
                      <div>GO: {r.go || "-"}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={condBadge[r.condicao]}>
                        {r.condicao === "otima" ? "Ótima" : r.condicao === "regular" ? "Regular" : "Ruim"}
                      </Badge>
                    </td>
                    <td className="p-3">{r.total_itens}</td>
                    <td className="p-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/checklists/${r.id}`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/checklists/${r.id}?print=1`)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmDeleteId(r.id)}
                        title="Excluir checklist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. Os itens e fotos vinculados a este checklist também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}