import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Map, Upload, Trash2, Pencil, Eye, Loader2, ImageIcon, Layers, Sparkles, Info, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import PlantaAmbientesDialog from "@/components/PlantaAmbientesDialog";

export default function Plantas() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const { data: obras, isLoading: obrasLoading } = trpc.obras.list.useQuery();
  const [selectedObraId, setSelectedObraId] = useState<number | null>(null);
  const { data: plantas, isLoading: plantasLoading } = trpc.plantas.listByObra.useQuery(
    { obraId: selectedObraId! },
    { enabled: !!selectedObraId }
  );

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadNome, setUploadNome] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewNome, setPreviewNome] = useState("");

  // Ambientes dialog
  const [ambientesPlanta, setAmbientesPlanta] = useState<{ id: number; nome: string; url: string } | null>(null);

  const uploadPlanta = trpc.plantas.upload.useMutation({
    onSuccess: () => {
      utils.plantas.listByObra.invalidate({ obraId: selectedObraId! });
      setShowUpload(false);
      setUploadNome("");
      setUploadFile(null);
      setUploadPreview(null);
      toast.success("Planta cadastrada com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao fazer upload: " + err.message);
    },
  });

  const updatePlanta = trpc.plantas.update.useMutation({
    onSuccess: () => {
      utils.plantas.listByObra.invalidate({ obraId: selectedObraId! });
      setEditId(null);
      setEditNome("");
      toast.success("Planta atualizada!");
    },
  });

  const deletePlanta = trpc.plantas.delete.useMutation({
    onSuccess: () => {
      utils.plantas.listByObra.invalidate({ obraId: selectedObraId! });
      toast.success("Planta removida!");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens PNG ou JPG são aceitas.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
    // Suggest name from filename
    if (!uploadNome) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setUploadNome(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadNome || !selectedObraId) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await uploadPlanta.mutateAsync({
          obraId: selectedObraId,
          nome: uploadNome,
          fileBase64: base64,
          fileName: uploadFile.name,
          contentType: uploadFile.type,
        });
        setUploading(false);
      };
      reader.readAsDataURL(uploadFile);
    } catch {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner: a gestão agora vive em Obras */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium">A gestão de plantas agora fica dentro de cada Obra.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Use a hierarquia <strong>Obra › Edifício › Andar › Planta</strong> para organizar melhor.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/obras")}>
          Ir para Obras <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Plantas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as plantas baixas das obras para localização de desvios
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ObraSelect
            obras={obras}
            value={selectedObraId ? String(selectedObraId) : ""}
            onValueChange={(v) => setSelectedObraId(Number(v))}
            placeholder="Selecione a obra"
            className="w-[220px]"
          />
          {selectedObraId && (
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-1.5" /> Nova Planta
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!selectedObraId ? (
        <Card className="shadow-sm border-0">
          <CardContent className="p-12 text-center">
            <Map className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Selecione uma obra para visualizar e gerenciar suas plantas.</p>
          </CardContent>
        </Card>
      ) : plantasLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : !plantas || plantas.length === 0 ? (
        <Card className="shadow-sm border-0">
          <CardContent className="p-12 text-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma planta cadastrada para esta obra.</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-1.5" /> Fazer Upload
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantas.map((planta) => (
            <Card key={planta.id} className="shadow-sm border-0 bg-card overflow-hidden group hover:shadow-md transition-all">
              {/* Thumbnail */}
              <div className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer"
                onClick={() => { setPreviewUrl(planta.url); setPreviewNome(planta.nome); }}>
                <img
                  src={planta.url}
                  alt={planta.nome}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              {/* Info */}
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {editId === planta.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editNome) {
                            updatePlanta.mutate({ id: planta.id, nome: editNome });
                          }
                          if (e.key === "Escape") { setEditId(null); }
                        }}
                      />
                      <Button size="sm" variant="ghost" className="h-8 px-2"
                        onClick={() => { if (editNome) updatePlanta.mutate({ id: planta.id, nome: editNome }); }}>
                        OK
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-medium text-sm">{planta.nome}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(planta.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => navigate(`/plantas/${planta.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-violet-600 hover:text-violet-700"
                          title={`Ambientes (${(planta as any).extracao_status || "pendente"})`}
                          onClick={() => setAmbientesPlanta({ id: planta.id, nome: planta.nome, url: planta.url })}>
                          <Sparkles className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => { setEditId(planta.id); setEditNome(planta.nome); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Remover esta planta?")) deletePlanta.mutate({ id: planta.id });
                          }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload de Planta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm">Nome da Planta *</Label>
              <Input
                value={uploadNome}
                onChange={(e) => setUploadNome(e.target.value)}
                placeholder="Ex: Térreo, 1o Andar, Cobertura..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Imagem da Planta (PNG/JPG, máx. 10MB) *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
              />
              {uploadPreview ? (
                <div className="mt-2 relative rounded-lg overflow-hidden border bg-slate-50">
                  <img src={uploadPreview} alt="Preview" className="w-full h-48 object-contain" />
                  <Button
                    size="sm" variant="outline"
                    className="absolute bottom-2 right-2 h-7 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <div
                  className="mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para selecionar a imagem</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PNG ou JPG, máximo 10MB</p>
                </div>
              )}
            </div>
            <Button
              className="w-full"
              disabled={!uploadFile || !uploadNome || uploading}
              onClick={handleUpload}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? "Enviando..." : "Fazer Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewNome}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="overflow-auto max-h-[75vh]">
              <img src={previewUrl} alt={previewNome} className="w-full object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PlantaAmbientesDialog
        plantaId={ambientesPlanta?.id ?? null}
        plantaNome={ambientesPlanta?.nome}
        plantaUrl={ambientesPlanta?.url}
        open={!!ambientesPlanta}
        onOpenChange={(o) => { if (!o) setAmbientesPlanta(null); }}
      />
    </div>
  );
}
