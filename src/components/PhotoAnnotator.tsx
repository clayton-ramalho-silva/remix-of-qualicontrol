import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight, Square, Circle as CircleIcon, Type, Undo2, Trash2, X, Check, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Tool = "arrow" | "rect" | "circle" | "text";

type Shape =
  | { type: "arrow"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { type: "rect"; x: number; y: number; w: number; h: number; color: string; width: number }
  | { type: "circle"; x: number; y: number; r: number; color: string; width: number }
  | { type: "text"; x: number; y: number; text: string; color: string; size: number };

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ffffff", "#0f172a"];
const WIDTHS = [3, 6, 10];

type Props = {
  open: boolean;
  src: string;
  onClose: () => void;
  onSave: (blob: Blob) => void | Promise<void>;
};

export default function PhotoAnnotator({ open, src, onClose, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);

  // Carrega imagem
  useEffect(() => {
    if (!open) return;
    setShapes([]);
    setDraft(null);
    setTextInput(null);
    setImgSize(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => toast.error("Falha ao carregar imagem para anotação");
    img.src = src;
  }, [open, src]);

  // Calcula tamanho de exibição (mantém aspect)
  useEffect(() => {
    if (!imgSize || !containerRef.current) return;
    const recalc = () => {
      const el = containerRef.current!;
      const maxW = el.clientWidth;
      const maxH = el.clientHeight;
      const ratio = imgSize.w / imgSize.h;
      let w = maxW;
      let h = maxW / ratio;
      if (h > maxH) { h = maxH; w = maxH * ratio; }
      setDisplaySize({ w: Math.floor(w), h: Math.floor(h) });
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [imgSize]);

  // Desenha
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgSize) return;
    canvas.width = imgSize.w;
    canvas.height = imgSize.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const all = draft ? [...shapes, draft] : shapes;
    for (const s of all) drawShape(ctx, s);
  }, [shapes, draft, imgSize]);

  useEffect(() => { draw(); }, [draw]);

  // Converte coordenadas do evento → coordenadas da imagem
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (textInput) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = getPos(e);
    const scale = imgSize ? imgSize.w / (displaySize?.w || imgSize.w) : 1;
    const strokeW = width * scale;
    if (tool === "text") {
      setTextInput({ x: p.x, y: p.y, value: "" });
      return;
    }
    if (tool === "arrow") setDraft({ type: "arrow", x1: p.x, y1: p.y, x2: p.x, y2: p.y, color, width: strokeW });
    else if (tool === "rect") setDraft({ type: "rect", x: p.x, y: p.y, w: 0, h: 0, color, width: strokeW });
    else if (tool === "circle") setDraft({ type: "circle", x: p.x, y: p.y, r: 0, color, width: strokeW });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draft) return;
    const p = getPos(e);
    if (draft.type === "arrow") setDraft({ ...draft, x2: p.x, y2: p.y });
    else if (draft.type === "rect") setDraft({ ...draft, w: p.x - draft.x, h: p.y - draft.y });
    else if (draft.type === "circle") {
      const r = Math.hypot(p.x - draft.x, p.y - draft.y);
      setDraft({ ...draft, r });
    }
  };

  const onPointerUp = () => {
    if (!draft) return;
    // Ignora se for muito pequeno (clique sem arrasto)
    const minDist = 5;
    let keep = true;
    if (draft.type === "arrow") keep = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > minDist;
    else if (draft.type === "rect") keep = Math.abs(draft.w) > minDist && Math.abs(draft.h) > minDist;
    else if (draft.type === "circle") keep = draft.r > minDist;
    if (keep) setShapes((s) => [...s, draft]);
    setDraft(null);
  };

  const confirmText = () => {
    if (!textInput || !textInput.value.trim()) { setTextInput(null); return; }
    const scale = imgSize ? imgSize.w / (displaySize?.w || imgSize.w) : 1;
    const size = Math.max(14, width * 5) * scale;
    setShapes((s) => [...s, { type: "text", x: textInput.x, y: textInput.y, text: textInput.value, color, size }]);
    setTextInput(null);
  };

  const undo = () => setShapes((s) => s.slice(0, -1));
  const clearAll = () => setShapes([]);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
      if (!blob) throw new Error("Falha ao gerar imagem");
      await onSave(blob);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar anotação");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 gap-0 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b bg-muted/40 flex-wrap">
          <ToolBtn active={tool === "arrow"} onClick={() => setTool("arrow")} icon={<ArrowUpRight className="h-4 w-4" />} label="Seta" />
          <ToolBtn active={tool === "rect"} onClick={() => setTool("rect")} icon={<Square className="h-4 w-4" />} label="Retângulo" />
          <ToolBtn active={tool === "circle"} onClick={() => setTool("circle")} icon={<CircleIcon className="h-4 w-4" />} label="Círculo" />
          <ToolBtn active={tool === "text"} onClick={() => setTool("text")} icon={<Type className="h-4 w-4" />} label="Texto" />

          <div className="mx-2 h-6 w-px bg-border" />

          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-white"}`}
              style={{ backgroundColor: c, boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }}
              aria-label={`Cor ${c}`}
            />
          ))}

          <div className="mx-2 h-6 w-px bg-border" />

          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWidth(w)}
              className={`h-7 w-7 rounded flex items-center justify-center border ${width === w ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"}`}
              aria-label={`Espessura ${w}`}
            >
              <span className="rounded-full bg-foreground" style={{ width: w, height: w }} />
            </button>
          ))}

          <div className="mx-2 h-6 w-px bg-border" />

          <Button type="button" variant="ghost" size="sm" onClick={undo} disabled={shapes.length === 0}>
            <Undo2 className="h-4 w-4 mr-1" /> Desfazer
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={shapes.length === 0}>
            <Trash2 className="h-4 w-4 mr-1" /> Limpar
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || !imgSize}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 min-h-0 bg-slate-900 flex items-center justify-center overflow-hidden p-2 relative">
          {!imgSize && <Loader2 className="h-8 w-8 text-white animate-spin" />}
          {imgSize && displaySize && (
            <div className="relative" style={{ width: displaySize.w, height: displaySize.h }}>
              <canvas
                ref={canvasRef}
                className={`block ${tool === "text" ? "cursor-text" : "cursor-crosshair"}`}
                style={{ width: displaySize.w, height: displaySize.h, touchAction: "none" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              {textInput && (
                <input
                  autoFocus
                  type="text"
                  value={textInput.value}
                  onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmText();
                    else if (e.key === "Escape") setTextInput(null);
                  }}
                  onBlur={confirmText}
                  placeholder="Digite e ENTER"
                  className="absolute bg-white/95 text-slate-900 px-2 py-1 rounded border-2 text-sm outline-none"
                  style={{
                    left: `${(textInput.x / imgSize.w) * 100}%`,
                    top: `${(textInput.y / imgSize.h) * 100}%`,
                    borderColor: color,
                    minWidth: 120,
                  }}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      className="h-8 px-2"
    >
      {icon}
      <span className="ml-1 hidden sm:inline text-xs">{label}</span>
    </Button>
  );
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.type === "arrow") {
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    // ponta
    const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
    const head = s.width * 4;
    ctx.beginPath();
    ctx.moveTo(s.x2, s.y2);
    ctx.lineTo(s.x2 - head * Math.cos(angle - Math.PI / 6), s.y2 - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(s.x2 - head * Math.cos(angle + Math.PI / 6), s.y2 - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  } else if (s.type === "rect") {
    ctx.lineWidth = s.width;
    ctx.strokeRect(s.x, s.y, s.w, s.h);
  } else if (s.type === "circle") {
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (s.type === "text") {
    ctx.font = `bold ${s.size}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "top";
    // halo branco/escuro para contraste
    ctx.lineWidth = Math.max(2, s.size / 8);
    ctx.strokeStyle = s.color === "#ffffff" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)";
    ctx.strokeText(s.text, s.x, s.y);
    ctx.fillStyle = s.color;
    ctx.fillText(s.text, s.x, s.y);
  }
  ctx.restore();
}