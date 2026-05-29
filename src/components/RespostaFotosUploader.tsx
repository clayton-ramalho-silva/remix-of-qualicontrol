import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";

export type RespostaFoto = {
  url: string;
  fileKey: string;
  descricao?: string;
};

type Props = {
  fotos: RespostaFoto[];
  onChange: (fotos: RespostaFoto[]) => void;
  max?: number;
};

export default function RespostaFotosUploader({ fotos, onChange, max }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slotsLeft = max - fotos.length;
    if (slotsLeft <= 0) {
      toast.error(`Máximo de ${max} fotos por item`);
      return;
    }
    const toUpload = Array.from(files).slice(0, slotsLeft);
    setUploading(true);
    try {
      const novos: RespostaFoto[] = [];
      for (const file of toUpload) {
        const compressed = await compressImage(file, { maxDim: 1600, quality: 0.8 });
        const key = `vistoria/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: upErr } = await supabase.storage.from("evidencias").upload(key, compressed, {
          contentType: compressed.type || "image/jpeg",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("evidencias").getPublicUrl(key);
        novos.push({ url: pub.publicUrl, fileKey: key });
      }
      onChange([...fotos, ...novos]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar foto");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remover = (idx: number) => {
    const nova = [...fotos];
    nova.splice(idx, 1);
    onChange(nova);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {fotos.map((f, idx) => (
          <div key={idx} className="relative group">
            <img
              src={f.url}
              alt={`Evidência ${idx + 1}`}
              className="h-16 w-16 object-cover rounded-md border border-slate-200"
            />
            <button
              type="button"
              onClick={() => remover(idx)}
              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remover foto"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {fotos.length < max && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-16 w-16 flex flex-col items-center justify-center gap-1 border-dashed text-slate-500 hover:text-teal-600 hover:border-teal-400"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-5 w-5" />}
            <span className="text-[10px] leading-none">{fotos.length}/{max}</span>
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      {fotos.length === 0 && (
        <p className="text-xs text-amber-700">📸 Foto de evidência obrigatória</p>
      )}
    </div>
  );
}