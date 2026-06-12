import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2, MapPin, Eye, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import type { RespostaFoto } from "@/components/RespostaFotosUploader";
import VistoriaPlantaDialog from "@/components/VistoriaPlantaDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  fotos: RespostaFoto[];
  onChange: (fotos: RespostaFoto[]) => void;
  plantaUrl: string | null;
  itemCodigo?: string;
  max?: number;
};

export default function VistoriaFotosUploader({ fotos, onChange, plantaUrl, itemCodigo, max }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFoto, setPendingFoto] = useState<RespostaFoto | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const confirmedRef = useRef(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!plantaUrl) {
      toast.error("Faça o upload da planta da vistoria antes de adicionar fotos.");
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      return;
    }
    const slotsLeft = typeof max === "number" ? max - fotos.length : files.length;
    if (typeof max === "number" && slotsLeft <= 0) {
      toast.error(`Máximo de ${max} fotos por item`);
      return;
    }
    const file = files[0];
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxDim: 1600, quality: 0.8 });
      const key = `vistoria/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error: upErr } = await supabase.storage.from("evidencias").upload(key, compressed, {
        contentType: compressed.type || "image/jpeg",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("evidencias").getPublicUrl(key);
      confirmedRef.current = false;
      setPendingFoto({ url: pub.publicUrl, fileKey: key });
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar foto");
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const remover = (idx: number) => {
    const nova = [...fotos];
    nova.splice(idx, 1);
    onChange(nova);
  };

  const confirmPin = (pin: { x: number; y: number }) => {
    if (editingIdx != null) {
      const nova = [...fotos];
      nova[editingIdx] = { ...nova[editingIdx], pinX: pin.x, pinY: pin.y };
      onChange(nova);
      confirmedRef.current = true;
      setEditingIdx(null);
    } else if (pendingFoto) {
      onChange([...fotos, { ...pendingFoto, pinX: pin.x, pinY: pin.y }]);
      confirmedRef.current = true;
      setPendingFoto(null);
    }
  };

  const cancelPin = () => {
    if (confirmedRef.current) {
      // fechamento após confirmar — não descartar
      confirmedRef.current = false;
      setPendingFoto(null);
      setEditingIdx(null);
      return;
    }
    if (pendingFoto) {
      supabase.storage.from("evidencias").remove([pendingFoto.fileKey]).catch(() => {});
      setPendingFoto(null);
      toast.info("Foto descartada (pin obrigatório na vistoria).");
    }
    setEditingIdx(null);
  };

  const fotosComPin = fotos.filter(f => f.pinX != null && f.pinY != null);

  const updateDescricao = (idx: number, descricao: string) => {
    const nova = [...fotos];
    nova[idx] = { ...nova[idx], descricao };
    onChange(nova);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 flex-wrap">
        {fotos.map((f, idx) => (
          <div key={idx} className="flex flex-col gap-1 w-[140px]">
            <div className="relative group">
              <img
                src={f.url}
                alt={`Evidência ${idx + 1}`}
                className="h-[110px] w-[140px] object-cover rounded-md border border-slate-200"
              />
              {/* Número da foto/pin */}
              <span className="absolute -top-2 -left-2 bg-red-600 text-white text-[11px] font-bold rounded-full h-6 w-6 flex items-center justify-center shadow ring-2 ring-white">
                {idx + 1}
              </span>
              {f.pinX != null && f.pinY != null && (
                <MapPin className="absolute -bottom-1 -left-1 h-4 w-4 text-red-600 fill-red-500 drop-shadow" />
              )}
              <button
                type="button"
                onClick={() => remover(idx)}
                className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remover foto"
              >
                <X className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setEditingIdx(idx)}
                className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 bg-black/50 text-white text-[10px] py-1 rounded-b-md transition-opacity"
                title="Reposicionar pin"
              >
                <MapPin className="h-3 w-3" /> Reposicionar
              </button>
            </div>
            <textarea
              value={f.descricao || ""}
              onChange={(e) => updateDescricao(idx, e.target.value)}
              placeholder={`Descrição do pin ${idx + 1}`}
              rows={2}
              className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:border-teal-400 focus:outline-none resize-none"
            />
          </div>
        ))}
        {(typeof max !== "number" || fotos.length < max) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading || !plantaUrl}
            className="h-[110px] w-[140px] flex flex-col items-center justify-center gap-1 border-dashed text-slate-500 hover:text-teal-600 hover:border-teal-400"
            title={!plantaUrl ? "Faça upload da planta primeiro" : "Adicionar foto"}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-6 w-6" />}
            <span className="text-[11px] leading-none">Adicionar foto</span>
            <span className="text-[10px] text-slate-400">{typeof max === "number" ? `${fotos.length}/${max}` : fotos.length}</span>
          </Button>
        )}
      </div>
      {fotosComPin.length > 0 && plantaUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setViewOpen(true)}
          className="h-9 gap-1.5 text-teal-700 border-teal-300 hover:bg-teal-50"
        >
          <Eye className="h-4 w-4" /> Ver pins na planta ({fotosComPin.length})
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      {fotos.length === 0 && (
        <p className="text-xs text-amber-700">📸 Foto + pin na planta obrigatórios</p>
      )}
      {!plantaUrl && (
        <p className="text-xs text-red-600">Faça upload da planta da vistoria no topo do formulário.</p>
      )}

      {/* Dialog: marcar pin (após upload ou ao reposicionar) */}
      {plantaUrl && (pendingFoto || editingIdx != null) && (
        <VistoriaPlantaDialog
          open={true}
          onOpenChange={(v) => { if (!v) cancelPin(); }}
          plantaUrl={plantaUrl}
          mode="place"
          initialPin={
            editingIdx != null && fotos[editingIdx]?.pinX != null && fotos[editingIdx]?.pinY != null
              ? { x: fotos[editingIdx].pinX as number, y: fotos[editingIdx].pinY as number }
              : null
          }
          onConfirm={confirmPin}
        />
      )}

      {/* Dialog: ver pins do item */}
      {plantaUrl && viewOpen && (
        <VistoriaPlantaDialog
          open={viewOpen}
          onOpenChange={setViewOpen}
          plantaUrl={plantaUrl}
          mode="view"
          fotos={fotosComPin}
          itemCodigo={itemCodigo}
        />
      )}
    </div>
  );
}
