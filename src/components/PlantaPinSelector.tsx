import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useRef, useCallback } from "react";
import { MapPin, X, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PlantaPinSelectorProps {
  obraId: number | null;
  plantaId: number | null;
  pinX: string | null;
  pinY: string | null;
  onChange: (data: { plantaId: number | null; pinX: string | null; pinY: string | null }) => void;
  readOnly?: boolean;
}

export default function PlantaPinSelector({ obraId, plantaId, pinX, pinY, onChange, readOnly = false }: PlantaPinSelectorProps) {
  const { data: plantas } = trpc.plantas.listByObra.useQuery(
    { obraId: obraId! },
    { enabled: !!obraId }
  );

  const [showPlanta, setShowPlanta] = useState(!!plantaId);
  const imgRef = useRef<HTMLImageElement>(null);

  const selectedPlanta = plantas?.find(p => p.id === plantaId);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange({
      plantaId: plantaId,
      pinX: x.toFixed(4),
      pinY: y.toFixed(4),
    });
  }, [plantaId, onChange, readOnly]);

  if (!obraId) return null;
  if (!plantas || plantas.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Localização na Planta
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px]">
              <p className="text-xs">Selecione uma planta e clique no ponto exato onde o desvio foi identificado. Isso ajuda a localizar o problema na obra.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        {!readOnly && !showPlanta && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowPlanta(true)}
          >
            <MapPin className="h-3 w-3 mr-1" /> Marcar na Planta
          </Button>
        )}
        {!readOnly && showPlanta && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => {
              setShowPlanta(false);
              onChange({ plantaId: null, pinX: null, pinY: null });
            }}
          >
            <X className="h-3 w-3 mr-1" /> Remover
          </Button>
        )}
      </div>

      {(showPlanta || readOnly) && (
        <div className="space-y-2">
          {/* Seletor de planta */}
          {!readOnly && (
            <Select
              value={plantaId ? String(plantaId) : ""}
              onValueChange={(v) => {
                onChange({ plantaId: Number(v), pinX: null, pinY: null });
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione a planta..." />
              </SelectTrigger>
              <SelectContent>
                {plantas.map((planta) => (
                  <SelectItem key={planta.id} value={String(planta.id)}>
                    {planta.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Imagem da planta com PIN */}
          {(selectedPlanta || (readOnly && plantaId)) && (
            <div className="relative">
              {readOnly && selectedPlanta && (
                <p className="text-xs text-muted-foreground mb-1 font-medium">{selectedPlanta.nome}</p>
              )}
              <div
                className={`relative rounded-lg overflow-hidden border bg-slate-50 ${readOnly ? '' : 'cursor-crosshair'}`}
                onClick={handleImageClick}
              >
                <img
                  ref={imgRef}
                  src={selectedPlanta?.url || ""}
                  alt={selectedPlanta?.nome || "Planta"}
                  className="w-full object-contain max-h-[300px]"
                  draggable={false}
                />
                {/* PIN */}
                {pinX && pinY && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${Number(pinX)}%`,
                      top: `${Number(pinY)}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {/* Outer ring */}
                    <div className="w-8 h-8 rounded-full border-3 border-red-500 bg-red-500/20 flex items-center justify-center animate-pulse">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}
                {/* Instruction overlay */}
                {!readOnly && !pinX && !pinY && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <div className="bg-white/90 rounded-lg px-3 py-2 shadow-sm">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        Clique no ponto do desvio
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {pinX && pinY && !readOnly && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  PIN marcado. Clique novamente para reposicionar.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
