import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, ArrowRight, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listDrafts, loadDraft, clearDraft as clearDraftKey } from "@/hooks/useDraftAutosave";

export interface DraftEntry {
  key: string;
  draftId: string;
  savedAt: number;
  data: any;
}

interface Props {
  /** Prefixo da chave em localStorage, ex.: `draft:verificacao:qualidade`. */
  scope: string;
  /** Rota base do formulário "novo", ex.: `/verificacoes/nova`. */
  novaRoute: string;
  /** Renderiza um resumo (obra, descrição etc.) a partir do payload do rascunho. */
  renderSummary?: (data: any) => React.ReactNode;
  /** Título da seção. */
  title?: string;
  className?: string;
}

function formatBR(ts: number) {
  try {
    const d = new Date(ts);
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "—";
  }
}

export default function DraftsInProgress({
  scope,
  novaRoute,
  renderSummary,
  title = "Rascunhos em andamento",
  className = "",
}: Props) {
  const [, navigate] = useLocation();
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () => {
    const prefix = `draft:${scope}:`;
    const items = listDrafts(prefix)
      .map((it) => {
        const data = loadDraft<any>(it.key);
        if (!data) return null;
        const draftId = it.key.slice(prefix.length);
        return { key: it.key, draftId, savedAt: it.savedAt, data } as DraftEntry;
      })
      .filter((x): x is DraftEntry => !!x)
      .sort((a, b) => b.savedAt - a.savedAt);
    setEntries(items);
  };

  useEffect(() => {
    load();
    // recarrega ao focar a janela (ex.: voltou do formulário)
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  if (entries.length === 0) return null;

  const handleResume = (draftId: string) => {
    const sep = novaRoute.includes("?") ? "&" : "?";
    navigate(`${novaRoute}${sep}draft=${encodeURIComponent(draftId)}`);
  };

  const handleDelete = (key: string) => {
    clearDraftKey(key);
    setConfirmDelete(null);
    load();
  };

  return (
    <Card className={`border-amber-200 bg-amber-50/40 ${className}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-900">
          <History className="h-4 w-4" />
          <h3 className="text-sm font-semibold">{title}</h3>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            {entries.length}
          </Badge>
        </div>
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={e.key}
              className="flex items-center gap-3 rounded-md border border-amber-200 bg-background p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {renderSummary ? renderSummary(e.data) : "Rascunho sem dados resumíveis"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Interrompido em {formatBR(e.savedAt)}
                </p>
              </div>
              <Button size="sm" variant="default" onClick={() => handleResume(e.draftId)}>
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(e.key)}
                title="Descartar rascunho"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente este rascunho local. Os dados preenchidos serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); if (confirmDelete) handleDelete(confirmDelete); }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
