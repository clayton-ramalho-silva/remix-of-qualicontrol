import { useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Faixa fina no topo da tela com o status de conexão:
 *  - Offline → vermelha persistente
 *  - Reconectando (online + queries em fetch) → âmbar
 *  - Voltou online (após estar offline) → verde por 2s, depois some
 */
export default function OfflineIndicator() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [justReconnected, setJustReconnected] = useState(false);
  const fetchingCount = useIsFetching();

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setJustReconnected(true);
      window.setTimeout(() => setJustReconnected(false), 2500);
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !justReconnected) return null;

  let label = "";
  let Icon = WifiOff;
  let color = "";

  if (!online) {
    label = "Você está offline — exibindo dados em cache";
    Icon = WifiOff;
    color = "bg-red-600 text-white";
  } else if (justReconnected && fetchingCount > 0) {
    label = "De volta online — sincronizando...";
    Icon = RefreshCw;
    color = "bg-amber-500 text-white";
  } else {
    label = "Conexão restaurada";
    Icon = CheckCircle2;
    color = "bg-emerald-600 text-white";
  }

  return (
    <div
      className={cn(
        "w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium",
        color
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("h-3.5 w-3.5", justReconnected && fetchingCount > 0 && "animate-spin")} />
      <span>{label}</span>
    </div>
  );
}