import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck, ClipboardList, AlertTriangle, Clock, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const tipoIcons: Record<string, typeof Bell> = {
  plano_criado: ClipboardList,
  prazo_vencendo: Clock,
  plano_atrasado: AlertTriangle,
  status_alterado: ArrowRight,
  verificacao: Check,
  geral: Info,
};

const tipoColors: Record<string, string> = {
  plano_criado: "text-blue-500",
  prazo_vencendo: "text-amber-500",
  plano_atrasado: "text-red-500",
  status_alterado: "text-teal-500",
  verificacao: "text-green-500",
  geral: "text-muted-foreground",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const { data: countData } = trpc.notificacoes.countNaoLidas.useQuery(undefined, {
    refetchInterval: 30000, // Poll every 30s
  });
  const { data: notifs, refetch } = trpc.notificacoes.list.useQuery(undefined, {
    enabled: open,
  });

  const utils = trpc.useUtils();

  const marcarLida = trpc.notificacoes.marcarLida.useMutation({
    onSuccess: () => {
      refetch();
      utils.notificacoes.countNaoLidas.invalidate();
    },
  });
  const marcarTodasLidas = trpc.notificacoes.marcarTodasLidas.useMutation({
    onSuccess: () => {
      refetch();
      utils.notificacoes.countNaoLidas.invalidate();
    },
  });

  const count = countData?.count ?? 0;

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleNotifClick(notif: any) {
    if (!notif.lida) {
      marcarLida.mutate({ id: notif.id });
    }
    if (notif.referenciaId && notif.referenciaTipo === "desvio") {
      setLocation(`/desvios/${notif.referenciaId}`);
      setOpen(false);
    }
  }

  function formatTime(date: string | Date) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}min`;
    if (diffH < 24) return `${diffH}h`;
    if (diffD < 7) return `${diffD}d`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-96 max-h-[480px] bg-popover text-popover-foreground border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Notificações</h3>
            {count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => marcarTodasLidas.mutate()}
                disabled={marcarTodasLidas.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas como lidas
              </Button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {!notifs || notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notifs.map((notif) => {
                const Icon = tipoIcons[notif.tipo] || Bell;
                const iconColor = tipoColors[notif.tipo] || "text-muted-foreground";
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-accent/50 transition-colors flex gap-3 ${
                      !notif.lida ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`shrink-0 mt-0.5 ${iconColor}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!notif.lida ? "font-semibold" : "font-medium"}`}>
                          {notif.titulo}
                        </p>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">
                        {notif.mensagem}
                      </p>
                    </div>
                    {!notif.lida && (
                      <div className="shrink-0 mt-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
