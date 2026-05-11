import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { MapPin, X, Info, Building2, Layers } from "lucide-react";
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
  const { data: edificios } = trpc.edificios.listByObra.useQuery(
    { obraId: obraId! },
    { enabled: !!obraId }
  );

  const [showPlanta, setShowPlanta] = useState(!!plantaId);
  const imgRef = useRef<HTMLImageElement>(null);

  const selectedPlanta = plantas?.find(p => p.id === plantaId);

  // Estado da cascata
  const [edificioId, setEdificioId] = useState<number | null>(null);
  const [andarId, setAndarId] = useState<number | null>(null);

  // Sincronizar a cascata com a planta atualmente selecionada
  useEffect(() => {
    if (!selectedPlanta || !edificios) return;
    const aId = (selectedPlanta as any).andarId ?? null;
    if (aId) {
      const ed = edificios.find((e: any) => e.andares?.some((a: any) => a.id === aId));
      if (ed) {
        setEdificioId(ed.id);
        setAndarId(aId);
      }
    }
  }, [selectedPlanta, edificios]);

  // Auto-selecionar quando há apenas uma combinação possível
  useEffect(() => {
    if (readOnly || plantaId) return;
    if (!plantas || !edificios) return;

    // Caso 1: 1 edifício + 1 andar + 1 planta
    if (edificios.length === 1) {
      const ed: any = edificios[0];
      const andares = ed.andares || [];
      if (andares.length === 1) {
        const andar = andares[0];
        const plantasDoAndarAuto = plantas.filter((p: any) => p.andarId === andar.id);
        if (plantasDoAndarAuto.length === 1) {
          setEdificioId(ed.id);
          setAndarId(andar.id);
          setShowPlanta(true);
          onChange({ plantaId: plantasDoAndarAuto[0].id, pinX: null, pinY: null });
          return;
        }
      }
    }

    // Caso 2: sem edifícios e 1 planta legada (sem andar)
    if (edificios.length === 0) {
      const legadas = plantas.filter((p: any) => !p.andarId);
      if (legadas.length === 1) {
        setShowPlanta(true);
        onChange({ plantaId: legadas[0].id, pinX: null, pinY: null });
      }
    }
  }, [plantas, edificios, plantaId, readOnly]);

  const andaresDoEdificio = useMemo(() => {
    if (!edificioId || !edificios) return [];
    const ed = edificios.find((e: any) => e.id === edificioId);
    return ed?.andares || [];
  }, [edificioId, edificios]);

  const plantasDoAndar = useMemo(() => {
    if (!plantas) return [];
    if (andarId) return plantas.filter((p: any) => p.andarId === andarId);
    // Sem hierarquia: mostra plantas legadas (sem andar) quando nenhum edifício/andar foi selecionado
    if (!edificioId) return plantas.filter((p: any) => !p.andarId);
    return [];
  }, [plantas, andarId, edificioId]);

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
  const semEdificios = !edificios || edificios.length === 0;
  const semPlantas = !plantas || plantas.length === 0;
  if (semEdificios && semPlantas) return null;

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
          {/* Seletor em cascata: Edifício → Andar → Planta */}
          {!readOnly && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Select
                value={edificioId ? String(edificioId) : ""}
                onValueChange={(v) => {
                  setEdificioId(Number(v));
                  setAndarId(null);
                  onChange({ plantaId: null, pinX: null, pinY: null });
                }}
                disabled={semEdificios}
              >
                <SelectTrigger className="h-9 min-w-0">
                  <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Edifício..." className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {(edificios || []).map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      <span className="block truncate max-w-[260px]" title={e.nome}>{e.nome}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={andarId ? String(andarId) : ""}
                onValueChange={(v) => {
                  setAndarId(Number(v));
                  onChange({ plantaId: null, pinX: null, pinY: null });
                }}
                disabled={!edificioId || andaresDoEdificio.length === 0}
              >
                <SelectTrigger className="h-9 min-w-0">
                  <Layers className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Andar..." className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {andaresDoEdificio.map((a: any) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      <span className="block truncate max-w-[260px]" title={a.nome}>{a.nome}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={plantaId ? String(plantaId) : ""}
                onValueChange={(v) => {
                  onChange({ plantaId: Number(v), pinX: null, pinY: null });
                }}
                disabled={plantasDoAndar.length === 0}
              >
                <SelectTrigger className="h-9 min-w-0">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Planta..." className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {plantasDoAndar.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="block truncate max-w-[260px]" title={p.nome}>{p.nome}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!readOnly && edificioId && andaresDoEdificio.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Este edifício ainda não tem andares cadastrados.</p>
          )}
          {!readOnly && andarId && plantasDoAndar.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Nenhuma planta neste andar.</p>
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
