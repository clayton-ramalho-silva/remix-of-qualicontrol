import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, X, ZoomIn } from "lucide-react";
import type { RespostaFoto } from "@/components/RespostaFotosUploader";

type Mode = "place" | "view";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plantaUrl: string;
  mode: Mode;
  /** placement mode: pin atual da foto */
  initialPin?: { x: number; y: number } | null;
  onConfirm?: (pin: { x: number; y: number }) => void;
  /** view mode: fotos com pin para exibir */
  fotos?: RespostaFoto[];
  itemCodigo?: string;
};

export default function VistoriaPlantaDialog({
  open, onOpenChange, plantaUrl, mode, initialPin, onConfirm, fotos = [], itemCodigo,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(initialPin ?? null);
  const [zoomFoto, setZoomFoto] = useState<RespostaFoto | null>(null);

  useEffect(() => {
    if (open) setPin(initialPin ?? null);
  }, [open, initialPin]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "place") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPin({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-teal-600" />
              {mode === "place"
                ? "Marque o local exato da foto na planta"
                : `Pins na planta${itemCodigo ? ` — Item ${itemCodigo}` : ""}`}
            </DialogTitle>
          </DialogHeader>

          <div
            ref={containerRef}
            onClick={handleClick}
            className={`relative w-full overflow-hidden rounded-md border bg-slate-50 ${
              mode === "place" ? "cursor-crosshair" : ""
            }`}
            style={{ maxHeight: "70vh" }}
          >
            <img src={plantaUrl} alt="Planta" className="w-full h-auto block select-none" draggable={false} />

            {/* Pin atual em modo place */}
            {mode === "place" && pin && (
              <div
                className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
                style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              >
                <MapPin className="h-8 w-8 text-red-600 drop-shadow-lg fill-red-500" />
              </div>
            )}

            {/* Pins em modo view */}
            {mode === "view" && fotos.map((f, idx) => {
              if (f.pinX == null || f.pinY == null) return null;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setZoomFoto(f); }}
                  className="absolute -translate-x-1/2 -translate-y-full group"
                  style={{ left: `${f.pinX * 100}%`, top: `${f.pinY * 100}%` }}
                  title={f.descricao || `Foto ${idx + 1}`}
                >
                  <div className="relative">
                    <img
                      src={f.url}
                      alt={`Foto ${idx + 1}`}
                      className="h-16 w-16 object-cover rounded-md border-2 border-red-500 shadow-lg group-hover:scale-110 transition-transform"
                    />
                    {/* Número do pin */}
                    <span className="absolute -top-2 -left-2 bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow ring-2 ring-white">
                      {idx + 1}
                    </span>
                    <MapPin className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-5 w-5 text-red-600 fill-red-500 drop-shadow" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-md transition-opacity">
                      <ZoomIn className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {mode === "place" && (
            <p className="text-xs text-muted-foreground">
              Clique na planta para posicionar o pin. {pin ? "Pin marcado." : "Nenhum pin marcado."}
            </p>
          )}

          {/* Legenda de pins (modo view) */}
          {mode === "view" && fotos.some(f => f.pinX != null) && (
            <div className="mt-2 max-h-40 overflow-auto rounded-md border bg-slate-50 p-2 space-y-1">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Legenda dos pins</p>
              {fotos.filter(f => f.pinX != null).map((f, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setZoomFoto(f)}
                  className="w-full flex items-start gap-2 text-left p-1.5 rounded hover:bg-white transition-colors"
                >
                  <span className="shrink-0 bg-red-600 text-white text-[11px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs text-slate-700 flex-1">
                    {f.descricao || <em className="text-slate-400">Sem descrição</em>}
                  </span>
                </button>
              ))}
            </div>
          )}

          <DialogFooter>
            {mode === "place" ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button
                  disabled={!pin}
                  onClick={() => { if (pin) { onConfirm?.(pin); onOpenChange(false); } }}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Confirmar pin
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox foto */}
      <Dialog open={!!zoomFoto} onOpenChange={(v) => !v && setZoomFoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Foto da evidência</DialogTitle></DialogHeader>
          {zoomFoto && (
            <div className="space-y-3">
              <img src={zoomFoto.url} alt="Evidência ampliada" className="w-full h-auto rounded-md" />
              {zoomFoto.descricao && (
                <p className="text-sm text-slate-700 bg-slate-50 border-l-4 border-teal-500 p-3 rounded">
                  {zoomFoto.descricao}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
