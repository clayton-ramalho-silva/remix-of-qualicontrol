import { Button } from "@/components/ui/button";
import { History, X } from "lucide-react";

interface Props {
  /** Timestamp (ms) em que o rascunho foi salvo pela última vez */
  savedAt: number | null;
  /** Descarta o rascunho recuperado e recarrega a página em branco */
  onDiscard?: () => void;
  className?: string;
}

function formatBR(ts: number) {
  try {
    const d = new Date(ts);
    const data = d.toLocaleDateString("pt-BR");
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${data} às ${hora}`;
  } catch {
    return "—";
  }
}

/**
 * Aviso fixo no topo do formulário informando que o conteúdo foi restaurado
 * a partir de um rascunho automático (localStorage), incluindo a data/hora
 * em que o preenchimento foi interrompido.
 */
export default function DraftRestoredBanner({ savedAt, onDiscard, className = "" }: Props) {
  if (!savedAt) return null;
  return (
    <div
      role="status"
      className={
        "flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm " +
        className
      }
    >
      <History className="h-5 w-5 mt-0.5 shrink-0 text-amber-600" />
      <div className="flex-1">
        <p className="font-semibold">Rascunho recuperado</p>
        <p className="text-amber-800">
          O preenchimento foi interrompido em <span className="font-medium">{formatBR(savedAt)}</span>.
          Os dados foram restaurados automaticamente — você pode continuar de onde parou.
        </p>
      </div>
      {onDiscard && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
        >
          <X className="h-4 w-4 mr-1" /> Descartar
        </Button>
      )}
    </div>
  );
}
