import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ImageIcon } from "lucide-react";

export type FotoEscolhida = {
  foto_evidencia_id: number;
  url: string;
  legenda: string;
};

type DesvioFotos = {
  desvioId: number;
  descricao: string;
  disciplina: string | null;
  fornecedorNome: string | null;
  fotos: { id: number; url: string }[];
};

export default function FotosDesvioPicker({
  open,
  onOpenChange,
  obraId,
  selectedIds,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  obraId: number | null;
  selectedIds: Set<number>;
  onConfirm: (fotos: FotoEscolhida[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<DesvioFotos[]>([]);
  const [picked, setPicked] = useState<Map<number, FotoEscolhida>>(new Map());

  useEffect(() => {
    if (!open || !obraId) return;
    setPicked(new Map());
    (async () => {
      setLoading(true);
      const { data: desvios } = await supabase
        .from("desvios")
        .select("id, descricao, disciplina, fornecedor_nome")
        .eq("obra_id", obraId)
        .order("id", { ascending: false });
      const ids = (desvios || []).map((d: any) => d.id);
      let fotosByDesvio: Record<number, { id: number; url: string }[]> = {};
      if (ids.length > 0) {
        const { data: fotos } = await supabase
          .from("fotos_evidencia")
          .select("id, desvio_id, url, tipo")
          .in("desvio_id", ids);
        (fotos || []).forEach((f: any) => {
          if (f.tipo === "fechamento") return;
          if (!fotosByDesvio[f.desvio_id]) fotosByDesvio[f.desvio_id] = [];
          fotosByDesvio[f.desvio_id].push({ id: f.id, url: f.url });
        });
      }
      const list: DesvioFotos[] = (desvios || [])
        .map((d: any) => ({
          desvioId: d.id,
          descricao: d.descricao,
          disciplina: d.disciplina,
          fornecedorNome: d.fornecedor_nome,
          fotos: fotosByDesvio[d.id] || [],
        }))
        .filter((g) => g.fotos.length > 0);
      setGroups(list);
      setLoading(false);
    })();
  }, [open, obraId]);

  function toggle(fotoId: number, url: string, legenda: string) {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(fotoId)) next.delete(fotoId);
      else next.set(fotoId, { foto_evidencia_id: fotoId, url, legenda });
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> Selecionar fotos dos desvios
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma foto de abertura encontrada para essa obra.
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.desvioId} className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  #{g.desvioId} · {g.disciplina || "-"} · {g.fornecedorNome || "-"}
                </div>
                <div className="text-sm font-medium mb-2 line-clamp-2">{g.descricao}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {g.fotos.map((f) => {
                    const already = selectedIds.has(f.id);
                    const checked = picked.has(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`relative block border-2 rounded overflow-hidden cursor-pointer ${
                          checked ? "border-primary" : already ? "border-emerald-400" : "border-transparent"
                        }`}
                      >
                        <img src={f.url} alt="" className="w-full h-24 object-cover" />
                        <div className="absolute top-1 left-1 bg-white/90 rounded p-0.5">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(f.id, f.url, g.descricao)}
                          />
                        </div>
                        {already && !checked && (
                          <div className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[10px] text-center py-0.5">
                            já adicionada
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              onConfirm(Array.from(picked.values()));
              onOpenChange(false);
            }}
            disabled={picked.size === 0}
          >
            Adicionar {picked.size > 0 ? `(${picked.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}