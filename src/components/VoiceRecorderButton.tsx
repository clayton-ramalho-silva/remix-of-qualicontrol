import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  /** Texto atual do campo. A transcrição é anexada ao final. */
  value: string;
  /** Callback chamado com o NOVO texto completo (atual + transcrição). */
  onAppend: (novoTexto: string) => void;
  /** Contexto opcional para melhorar a transcrição (ex.: "descrição de desvio em obra"). */
  contexto?: string;
  /** Tamanho do botão. */
  size?: "sm" | "icon";
  className?: string;
  disabled?: boolean;
};

function formatSec(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}

export default function VoiceRecorderButton({
  value,
  onAppend,
  contexto,
  size = "icon",
  className,
  disabled,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    if (disabled || processing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Escolhe melhor mime suportado (prioriza opus para qualidade de voz)
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
      ];
      const mime = candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const recOpts: MediaRecorderOptions = { audioBitsPerSecond: 64000 };
      if (mime) recOpts.mimeType = mime;
      const rec = new MediaRecorder(stream, recOpts);
      recRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => handleStop(rec.mimeType || mime || "audio/webm");
      rec.start();

      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s >= 120) {
            // limite de 2 min — para automaticamente
            stop();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  };

  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {}
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  };

  const handleStop = async (mimeType: string) => {
    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];
    if (blob.size < 1000) {
      toast.error("Áudio muito curto. Grave por pelo menos 1 segundo.");
      return;
    }
    setProcessing(true);
    try {
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] || "");
        };
        reader.onerror = () => reject(new Error("Falha ao ler áudio"));
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke("transcrever-audio", {
        body: { audioBase64, mimeType, contexto },
      });
      if (error) throw error;
      const texto = String((data as any)?.texto || "").trim();
      if (!texto) {
        toast.error("Não foi possível transcrever. Tente falar mais perto do microfone.");
        return;
      }
      const novo = value && value.trim().length > 0 ? `${value.trim()} ${texto}` : texto;
      onAppend(novo);
      toast.success("Transcrição adicionada");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao transcrever áudio");
    } finally {
      setProcessing(false);
    }
  };

  const isRec = recording;
  const label = processing
    ? "Transcrevendo..."
    : isRec
    ? `Gravando ${formatSec(seconds)} — clique para parar`
    : "Gravar voz e transcrever";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isRec ? "destructive" : "outline"}
          size={size}
          disabled={disabled || processing}
          onClick={isRec ? stop : start}
          className={cn(
            "shrink-0",
            isRec && "animate-pulse",
            className
          )}
          aria-label={label}
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRec ? (
            <span className="flex items-center gap-1.5">
              <Square className="h-3.5 w-3.5 fill-current" />
              <span className="text-xs tabular-nums">{formatSec(seconds)}</span>
            </span>
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}