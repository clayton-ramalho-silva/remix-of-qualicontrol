// Stub: o componente Map original usava Google Maps JS API.
// Foi neutralizado durante a migração para Lovable Cloud.
// Substitui por uma implementação alternativa (Leaflet, Mapbox) ou
// reativa Google Maps configurando a chave VITE_GOOGLE_MAPS_API_KEY e
// instalando @types/google.maps.
import { MapPin } from "lucide-react";

export type MapViewProps = {
  initialCenter?: { lat: number; lng: number };
  className?: string;
};

export default function MapView({ className }: MapViewProps) {
  return (
    <div className={`flex h-full min-h-64 w-full items-center justify-center rounded-md border border-dashed bg-muted/40 text-muted-foreground ${className ?? ""}`}>
      <div className="flex flex-col items-center gap-2 p-6 text-center">
        <MapPin className="h-8 w-8" />
        <p className="text-sm font-medium">Mapa indisponível</p>
        <p className="text-xs">Configure uma chave de Google Maps para ativar.</p>
      </div>
    </div>
  );
}
