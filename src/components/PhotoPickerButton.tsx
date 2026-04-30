import { useRef } from "react";
import { Camera, Image as ImageIcon, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PhotoPickerButtonProps {
  onFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  multiple?: boolean;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  label?: string;
}

/**
 * Botão de upload de foto que oferece duas opções:
 * - Tirar foto (abre a câmera direto, inclusive offline em PWAs/mobile)
 * - Escolher da galeria
 */
export function PhotoPickerButton({
  onFiles,
  multiple = true,
  className = "w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/40 hover:bg-primary/5",
  iconClassName = "h-5 w-5 text-muted-foreground/50",
  labelClassName = "text-[10px] text-muted-foreground/50",
  label = "Foto",
}: PhotoPickerButtonProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={className}>
            <Upload className={iconClassName} />
            <span className={labelClassName}>{label}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4 mr-2" />
            Tirar foto
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => galleryRef.current?.click()}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Escolher da galeria
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        onChange={(e) => {
          onFiles(e);
          if (cameraRef.current) cameraRef.current.value = "";
        }}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          onFiles(e);
          if (galleryRef.current) galleryRef.current.value = "";
        }}
        className="hidden"
      />
    </>
  );
}