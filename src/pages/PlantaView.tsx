import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, MapPin } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const SEVERITY_COLORS: Record<string, string> = {
  leve: "#22c55e",
  moderado: "#f59e0b",
  grave: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em Andamento",
  fechado: "Fechado",
  aguardando_aceite: "Ag. Aceite",
};

export default function PlantaView() {
  const [, params] = useRoute("/plantas/:id");
  const [, navigate] = useLocation();
  const plantaId = params?.id ? Number(params.id) : 0;

  const { data: planta, isLoading: plantaLoading } = trpc.plantas.getById.useQuery(
    { id: plantaId },
    { enabled: plantaId > 0 }
  );
  const { data: desviosNaPlanta, isLoading: desviosLoading } = trpc.plantas.desviosNaPlanta.useQuery(
    { plantaId },
    { enabled: plantaId > 0 }
  );

  const [hoveredDesvio, setHoveredDesvio] = useState<number | null>(null);
  const [selectedDesvio, setSelectedDesvio] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (plantaLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  if (!planta) {
    return (
      <Card className="shadow-sm border-0">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Planta não encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/plantas")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const selectedDev = desviosNaPlanta?.find(d => d.id === selectedDesvio);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/plantas")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> {planta.nome}
          </h1>
          {desviosNaPlanta && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {desviosNaPlanta.length} desvio(s) marcado(s) nesta planta
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Planta com PINs */}
        <div className="lg:col-span-3">
          <Card className="shadow-sm border-0 overflow-hidden">
            <CardContent className="p-0">
              <div ref={containerRef} className="relative bg-slate-100 overflow-auto" style={{ maxHeight: "75vh" }}>
                <img
                  src={planta.url}
                  alt={planta.nome}
                  className="w-full object-contain"
                  draggable={false}
                />
                {/* PINs dos desvios */}
                {desviosNaPlanta?.map((desvio) => {
                  const x = Number(desvio.pinX);
                  const y = Number(desvio.pinY);
                  const isHovered = hoveredDesvio === desvio.id;
                  const isSelected = selectedDesvio === desvio.id;
                  const color = SEVERITY_COLORS[desvio.severidade] || "#6366f1";
                  const isClosed = desvio.status === "fechado";

                  return (
                    <div
                      key={desvio.id}
                      className="absolute cursor-pointer transition-all duration-200"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: isHovered || isSelected ? 50 : 10,
                      }}
                      onMouseEnter={() => setHoveredDesvio(desvio.id)}
                      onMouseLeave={() => setHoveredDesvio(null)}
                      onClick={() => setSelectedDesvio(desvio.id === selectedDesvio ? null : desvio.id)}
                    >
                      {/* Círculo do PIN */}
                      <div
                        className="flex items-center justify-center rounded-full border-2 border-white shadow-lg font-bold text-white text-[10px] leading-none"
                        style={{
                          width: isHovered || isSelected ? 32 : 26,
                          height: isHovered || isSelected ? 32 : 26,
                          backgroundColor: isClosed ? "#94a3b8" : color,
                          boxShadow: isHovered || isSelected
                            ? `0 0 0 4px ${color}40, 0 2px 8px rgba(0,0,0,0.3)`
                            : "0 2px 4px rgba(0,0,0,0.3)",
                        }}
                      >
                        {desvio.id}
                      </div>
                      {/* Tooltip on hover */}
                      {(isHovered || isSelected) && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-white rounded-lg shadow-xl border p-2.5 min-w-[200px] max-w-[280px] z-50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-semibold text-xs">#{desvio.id}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1" style={{ borderColor: color, color }}>
                              {desvio.severidade}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {STATUS_LABELS[desvio.status] || desvio.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{desvio.descricao}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{desvio.disciplina}</p>
                          <Button
                            size="sm" variant="link" className="h-5 p-0 text-[11px] mt-1"
                            onClick={(e) => { e.stopPropagation(); navigate(`/desvios/${desvio.id}`); }}
                          >
                            Ver detalhes →
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista lateral de desvios */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">Desvios nesta Planta</h3>
              {desviosLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : !desviosNaPlanta || desviosNaPlanta.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Nenhum desvio marcado nesta planta.
                </p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {desviosNaPlanta.map((desvio) => {
                    const color = SEVERITY_COLORS[desvio.severidade] || "#6366f1";
                    const isSelected = selectedDesvio === desvio.id;
                    return (
                      <div
                        key={desvio.id}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted/50"
                        }`}
                        onMouseEnter={() => setHoveredDesvio(desvio.id)}
                        onMouseLeave={() => setHoveredDesvio(null)}
                        onClick={() => setSelectedDesvio(desvio.id === selectedDesvio ? null : desvio.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                            style={{ backgroundColor: desvio.status === "fechado" ? "#94a3b8" : color }}
                          >
                            {desvio.id}
                          </div>
                          <span className="text-xs font-medium truncate">{desvio.disciplina}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 ml-7">{desvio.descricao}</p>
                        <div className="flex items-center gap-1 mt-1 ml-7">
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1" style={{ borderColor: color, color }}>
                            {desvio.severidade}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                            {STATUS_LABELS[desvio.status] || desvio.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legenda */}
          <Card className="shadow-sm border-0 mt-3">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">Legenda</h3>
              <div className="space-y-1.5">
                {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
                  <div key={sev} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }} />
                    <span className="text-xs capitalize">{sev}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: "#94a3b8" }} />
                  <span className="text-xs">Fechado</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
