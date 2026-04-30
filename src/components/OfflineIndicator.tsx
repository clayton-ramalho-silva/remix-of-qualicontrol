import { useEffect, useRef, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { CloudOff, RefreshCw, CheckCircle2, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { shouldPersistQuery } from "@/lib/offline-cache";

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
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fetchingCount = useIsFetching();
  const queryClient = useQueryClient();
  const wasOffline = useRef(!online);

  // Conta quantas queries persistidas estão "stale" (precisam atualizar)
  const computePending = () => {
    const cache = queryClient.getQueryCache();
    const stale = cache
      .getAll()
      .filter(
        (q) =>
          shouldPersistQuery(q.queryKey) &&
          (q.isStale() || q.state.status === "error")
      );
    setPendingCount(stale.length);
  };

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      if (wasOffline.current) {
        setJustReconnected(true);
        computePending();
      }
      wasOffline.current = false;
    };
    const handleOffline = () => {
      setOnline(false);
      wasOffline.current = true;
      setJustReconnected(false);
      setShowSuccess(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando termina o fetching durante uma sincronização disparada,
  // mostra "sincronizado" por 2s e some
  useEffect(() => {
    if (syncing && fetchingCount === 0) {
      setSyncing(false);
      setShowSuccess(true);
      setPendingCount(0);
      const t = window.setTimeout(() => {
        setShowSuccess(false);
        setJustReconnected(false);
      }, 2000);
      return () => window.clearTimeout(t);
    }
  }, [syncing, fetchingCount]);

  const handleSync = async () => {
    setSyncing(true);
    await queryClient.invalidateQueries({
      predicate: (q) => shouldPersistQuery(q.queryKey),
    });
  };

  // Nada a exibir
  if (online && !justReconnected && !showSuccess) return null;

  // OFFLINE — banner amarelo degradê com aviso elegante
  if (!online) {
    return (
      <div
        className="relative w-full overflow-hidden border-b border-amber-300/60 bg-gradient-to-r from-amber-100 via-amber-200 to-yellow-300 text-amber-950 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.6),transparent_60%)] pointer-events-none" />
        <div className="relative flex items-center justify-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-600" />
          </div>
          <CloudOff className="h-4 w-4 shrink-0" />
          <span className="truncate">
            Você está offline — usando dados em cache
          </span>
        </div>
      </div>
    );
  }

  // RECONECTADO — sincronizando ativamente
  if (syncing || fetchingCount > 0) {
    return (
      <div
        className="relative w-full overflow-hidden border-b border-sky-300/60 bg-gradient-to-r from-sky-100 via-sky-200 to-cyan-200 text-sky-950 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="relative flex items-center justify-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium">
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
          <span>Sincronizando dados...</span>
        </div>
      </div>
    );
  }

  // RECONECTADO — sucesso (some sozinho)
  if (showSuccess) {
    return (
      <div
        className="relative w-full overflow-hidden border-b border-emerald-300/60 bg-gradient-to-r from-emerald-100 via-emerald-200 to-teal-200 text-emerald-950 shadow-sm animate-in fade-in slide-in-from-top-2"
        role="status"
        aria-live="polite"
      >
        <div className="relative flex items-center justify-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Tudo sincronizado</span>
        </div>
      </div>
    );
  }

  // RECONECTADO — botão para forçar sincronização manual
  return (
    <div
      className="relative w-full overflow-hidden border-b border-amber-300/60 bg-gradient-to-r from-amber-50 via-yellow-100 to-amber-200 text-amber-950 shadow-sm animate-in fade-in slide-in-from-top-2"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.5),transparent_60%)] pointer-events-none" />
      <div className="relative flex items-center justify-center gap-3 px-4 py-2 text-xs sm:text-sm font-medium flex-wrap">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 shrink-0" />
          <span>
            Conexão restaurada
            {pendingCount > 0 ? (
              <>
                {" — "}
                <strong className="font-semibold">{pendingCount}</strong>{" "}
                {pendingCount === 1 ? "item" : "itens"} para sincronizar
              </>
            ) : null}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSync}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-amber-900 px-3 py-1 text-[11px] font-semibold text-amber-50 shadow-sm",
            "hover:bg-amber-950 active:scale-95 transition-all"
          )}
        >
          <RefreshCw className="h-3 w-3" />
          Sincronizar agora
        </button>
      </div>
    </div>
  );
}