import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { MapPin, X, Info, Building2, Layers, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
  const transformRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<{ startX: number; startY: number; offX: number; offY: number; moved: boolean } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  // Reset zoom/pan ao trocar de planta
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [plantaId]);

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

  const setPinFromClient = useCallback((clientX: number, clientY: number) => {
    if (readOnly || !transformRef.current) return;
    const rect = transformRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    onChange({ plantaId, pinX: x.toFixed(4), pinY: y.toFixed(4) });
  }, [plantaId, onChange, readOnly]);

  const clampOffset = useCallback((x: number, y: number, z: number, containerW: number, containerH: number) => {
    // Limita pan para imagem não sair completamente do container
    const maxX = (containerW * (z - 1)) / 2;
    const maxY = (containerH * (z - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const zoomAt = useCallback((newZoom: number, clientX?: number, clientY?: number) => {
    const container = transformRef.current?.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const z = Math.max(1, Math.min(5, newZoom));
    setZoom((prevZ) => {
      setOffset((prev) => {
        // Mantém o ponto sob o cursor fixo
        const cx = clientX !== undefined ? clientX - rect.left - rect.width / 2 : 0;
        const cy = clientY !== undefined ? clientY - rect.top - rect.height / 2 : 0;
        const ratio = z / prevZ;
        const nx = cx - (cx - prev.x) * ratio;
        const ny = cy - (cy - prev.y) * ratio;
        return clampOffset(z === 1 ? 0 : nx, z === 1 ? 0 : ny, z, rect.width, rect.height);
      });
      return z;
    });
  }, [clampOffset]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    zoomAt(zoom * delta, e.clientX, e.clientY);
  }, [zoom, zoomAt, readOnly]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offX: offset.x,
      offY: offset.y,
      moved: false,
    };
  }, [offset, readOnly]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const s = dragStateRef.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && Math.hypot(dx, dy) < 5) return;
    s.moved = true;
    if (zoom <= 1) return;
    const container = transformRef.current?.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setOffset(clampOffset(s.offX + dx, s.offY + dy, zoom, rect.width, rect.height));
  }, [zoom, clampOffset]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const s = dragStateRef.current;
    dragStateRef.current = null;
    if (!s || s.moved) return;
    setPinFromClient(e.clientX, e.clientY);
  }, [setPinFromClient]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), zoom };
      dragStateRef.current = null;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      dragStateRef.current = { startX: t.clientX, startY: t.clientY, offX: offset.x, offY: offset.y, moved: false };
    }
  }, [zoom, offset, readOnly]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomAt((pinchRef.current.zoom * newDist) / pinchRef.current.dist, cx, cy);
    } else if (e.touches.length === 1 && dragStateRef.current) {
      const s = dragStateRef.current;
      const t = e.touches[0];
      const dx = t.clientX - s.startX;
      const dy = t.clientY - s.startY;
      if (!s.moved && Math.hypot(dx, dy) < 5) return;
      s.moved = true;
      if (zoom <= 1) return;
      const container = transformRef.current?.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setOffset(clampOffset(s.offX + dx, s.offY + dy, zoom, rect.width, rect.height));
    }
  }, [zoom, zoomAt, clampOffset]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    pinchRef.current = null;
    const s = dragStateRef.current;
    dragStateRef.current = null;
    if (!s || s.moved) return;
    const t = e.changedTouches[0];
    if (t) setPinFromClient(t.clientX, t.clientY);
  }, [setPinFromClient]);

  const resetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

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
                className={`relative rounded-lg overflow-hidden border bg-slate-50 select-none ${
                  readOnly ? '' : zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
                }`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { dragStateRef.current = null; }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'none' }}
              >
                <div
                  ref={transformRef}
                  className="relative origin-center"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transition: dragStateRef.current ? 'none' : 'transform 0.1s ease-out',
                  }}
                >
                  <img
                    ref={imgRef}
                    src={selectedPlanta?.url || ""}
                    alt={selectedPlanta?.nome || "Planta"}
                    className="w-full object-contain max-h-[300px] pointer-events-none"
                    draggable={false}
                  />
                  {/* PIN */}
                  {pinX && pinY && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${Number(pinX)}%`,
                        top: `${Number(pinY)}%`,
                        transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                      }}
                    >
                      <div className="w-8 h-8 rounded-full border-3 border-red-500 bg-red-500/20 flex items-center justify-center animate-pulse">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                      </div>
                    </div>
                  )}
                </div>
                {/* Instruction overlay */}
                {!readOnly && !pinX && !pinY && zoom === 1 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                    <div className="bg-white/90 rounded-lg px-3 py-2 shadow-sm">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        Clique no ponto do desvio
                      </p>
                    </div>
                  </div>
                )}
                {/* Toolbar de zoom */}
                {!readOnly && (
                  <div className="absolute top-2 right-2 flex flex-col gap-1 bg-white/95 rounded-md shadow-md border p-1 z-10">
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); zoomAt(zoom * 1.3); }}
                      title="Aproximar"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); zoomAt(zoom / 1.3); }}
                      title="Afastar"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); resetView(); }}
                      title="Resetar"
                      disabled={zoom === 1 && offset.x === 0 && offset.y === 0}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <div className="text-[9px] text-center text-muted-foreground font-mono">
                      {Math.round(zoom * 100)}%
                    </div>
                  </div>
                )}
              </div>
              {pinX && pinY && !readOnly && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  PIN marcado. Use zoom para precisão; clique novamente para reposicionar.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
