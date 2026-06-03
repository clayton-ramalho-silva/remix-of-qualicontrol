import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, XCircle, ImagePlus, Printer, Loader2, FileEdit,
} from "lucide-react";
import FotosDesvioPicker, { type FotoEscolhida } from "@/components/checklist/FotosDesvioPicker";
import { useDraftAutosave, loadDraft, clearDraft as clearDraftKey, useDraftId } from "@/hooks/useDraftAutosave";
import DraftRestoredBanner from "@/components/DraftRestoredBanner";

type Avaliacao = "ok" | "atencao" | "critico";
type Condicao = "ruim" | "regular" | "otima";

type Foto = {
  id?: number;
  foto_evidencia_id: number | null;
  url: string;
  legenda: string;
  ordem: number;
};

type Item = {
  id?: number;
  disciplina_id: number | null;
  disciplina_nome: string;
  fornecedor_id: number | null;
  fornecedor_nome: string;
  equipe_nome: string;
  avaliacao: Avaliacao;
  comentarios: string;
  ordem: number;
  fotos: Foto[];
  expanded?: boolean;
};

const condicoes: { val: Condicao; label: string; cls: string }[] = [
  { val: "ruim", label: "RUIM", cls: "bg-red-500 hover:bg-red-600 text-white" },
  { val: "regular", label: "REGULAR", cls: "bg-amber-500 hover:bg-amber-600 text-white" },
  { val: "otima", label: "ÓTIMA", cls: "bg-emerald-500 hover:bg-emerald-600 text-white" },
];

const avalConfig: Record<Avaliacao, { label: string; icon: any; cls: string; print: string }> = {
  ok: { label: "OK", icon: CheckCircle2, cls: "text-emerald-600", print: "✓" },
  atencao: { label: "Atenção", icon: AlertTriangle, cls: "text-amber-500", print: "!" },
  critico: { label: "Crítico", icon: XCircle, cls: "text-red-600", print: "✗" },
};

export default function ChecklistEditor() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const search = useSearch();
  const isEdit = !!params.id;
  const id = params.id ? Number(params.id) : null;
  const printOnLoad = new URLSearchParams(search).get("print") === "1";

  // Cabeçalho
  const [obraId, setObraId] = useState<string>("");
  const [dataVistoria, setDataVistoria] = useState(new Date().toISOString().split("T")[0]);
  const [metragem, setMetragem] = useState<string>("");
  const [gc, setGc] = useState("");
  const [go, setGo] = useState("");
  const [condicao, setCondicao] = useState<Condicao>("regular");
  const [totalItens, setTotalItens] = useState<string>("");

  const [items, setItems] = useState<Item[]>([]);
  const [obras, setObras] = useState<{ id: number; codigo: string; nome: string; gerente_obra?: string | null; gerente_contrato?: string | null; nucleo?: string | null }[]>([]);
  const [disciplinas, setDisciplinas] = useState<{ id: number; nome: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: number; nome: string }[]>([]);
  const [equipesByForn, setEquipesByForn] = useState<Record<string, string[]>>({});
  // Desvios da obra selecionada: usados para limitar disciplinas e fornecedores
  const [desviosObra, setDesviosObra] = useState<{ disciplina: string | null; fornecedor_id: number | null; fornecedor_nome: string | null }[]>([]);

  const [pickerForItem, setPickerForItem] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const printRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const serverLoadedAtRef = useRef(0);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);

  // Chave do rascunho local: edit usa id; novo usa id único via `?draft=`.
  const novoDraft = useDraftId("checklist:novo");
  const draftKey = isEdit
    ? `draft:checklist-edit:${id}`
    : novoDraft.key;

  // Total de itens = total de desvios da obra selecionada
  useEffect(() => {
    if (!obraId) { setTotalItens(""); setDesviosObra([]); return; }
    (async () => {
      const { data, error } = await supabase
        .from("desvios")
        .select("disciplina, fornecedor_id, fornecedor_nome")
        .eq("obra_id", Number(obraId))
        .is("deleted_at", null);
      if (!error) {
        setTotalItens(String((data || []).length));
        setDesviosObra((data || []) as any[]);
      }
    })();
  }, [obraId]);

  // Disciplinas presentes nos desvios da obra (match por nome, case-insensitive)
  const disciplinasFiltradas = (() => {
    if (!obraId) return disciplinas;
    const nomes = new Set(
      desviosObra
        .map((d) => (d.disciplina || "").trim().toLowerCase())
        .filter(Boolean)
    );
    return disciplinas.filter((d) => nomes.has(d.nome.trim().toLowerCase()));
  })();

  // Fornecedores por disciplina (a partir dos desvios da obra)
  const fornecedoresPorDisciplina = (() => {
    const map = new Map<string, { id: number | null; nome: string }[]>();
    desviosObra.forEach((d) => {
      const key = (d.disciplina || "").trim().toLowerCase();
      if (!key || !d.fornecedor_nome) return;
      if (!map.has(key)) map.set(key, []);
      const list = map.get(key)!;
      if (!list.some((f) => f.nome.toLowerCase() === d.fornecedor_nome!.toLowerCase())) {
        list.push({ id: d.fornecedor_id, nome: d.fornecedor_nome });
      }
    });
    return map;
  })();

  // Auto-popular GC/GO a partir da obra selecionada (quando vazios)
  useEffect(() => {
    if (!obraId) return;
    const o = obras.find((x) => String(x.id) === obraId);
    if (!o) return;
    setGc((prev) => prev || o.gerente_contrato || "");
    setGo((prev) => prev || o.gerente_obra || "");
  }, [obraId, obras]);

  // Load lookups
  useEffect(() => {
    (async () => {
      const [obrasRes, discRes, fornRes, feRes] = await Promise.all([
        supabase.from("obras").select("id, codigo, nome, gerente_obra, gerente_contrato, nucleo").order("codigo"),
        supabase.from("checklist_disciplinas").select("id, nome").eq("ativo", 1).order("ordem"),
        supabase.from("fornecedores").select("id, nome").order("nome"),
        supabase.from("checklist_fornecedor_equipe").select("fornecedor_nome, nome_equipe"),
      ]);
      // só obras com desvios
      const { data: dist } = await supabase.from("desvios").select("obra_id");
      const comDesvio = new Set((dist || []).map((d: any) => d.obra_id));
      setObras(((obrasRes.data || []) as any[]).filter((o) => comDesvio.has(o.id)));
      setDisciplinas((discRes.data || []) as any[]);
      setFornecedores((fornRes.data || []) as any[]);
      const map: Record<string, string[]> = {};
      (feRes.data || []).forEach((r: any) => {
        const k = r.fornecedor_nome.toLowerCase();
        if (!map[k]) map[k] = [];
        if (!map[k].includes(r.nome_equipe)) map[k].push(r.nome_equipe);
      });
      setEquipesByForn(map);
    })();
  }, []);

  // Load entrega if editing
  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      setLoading(true);
      const { data: ent } = await supabase.from("checklist_entregas").select("*").eq("id", id).single();
      if (ent) {
        setObraId(String((ent as any).obra_id));
        setDataVistoria(new Date((ent as any).data_vistoria).toISOString().split("T")[0]);
        setMetragem((ent as any).metragem_m2 ? String((ent as any).metragem_m2) : "");
        setGc((ent as any).gc || "");
        setGo((ent as any).go || "");
        setCondicao((ent as any).condicao);
        setTotalItens(String((ent as any).total_itens || ""));
        serverLoadedAtRef.current = new Date((ent as any).updated_at || (ent as any).created_at || (ent as any).data_vistoria || 0).getTime();
      }
      const { data: its } = await supabase
        .from("checklist_entrega_itens").select("*").eq("entrega_id", id).order("ordem");
      const itemIds = (its || []).map((i: any) => i.id);
      let fotosByItem: Record<number, Foto[]> = {};
      if (itemIds.length > 0) {
        const { data: ftos } = await supabase
          .from("checklist_entrega_fotos").select("*").in("item_id", itemIds).order("ordem");
        (ftos || []).forEach((f: any) => {
          if (!fotosByItem[f.item_id]) fotosByItem[f.item_id] = [];
          fotosByItem[f.item_id].push({
            id: f.id, foto_evidencia_id: f.foto_evidencia_id,
            url: f.url, legenda: f.legenda || "", ordem: f.ordem,
          });
        });
      }
      setItems((its || []).map((i: any) => ({
        id: i.id,
        disciplina_id: i.disciplina_id,
        disciplina_nome: i.disciplina_nome,
        fornecedor_id: i.fornecedor_id,
        fornecedor_nome: i.fornecedor_nome || "",
        equipe_nome: i.equipe_nome || "",
        avaliacao: i.avaliacao,
        comentarios: i.comentarios || "",
        ordem: i.ordem,
        fotos: fotosByItem[i.id] || [],
      })));

      // Restaura rascunho local mais recente que o servidor
      if (!restoredRef.current) {
        const d: any = loadDraft(`draft:checklist-edit:${id}`);
        if (d && (d.__savedAt ?? 0) > serverLoadedAtRef.current) {
          if (d.obraId !== undefined) setObraId(d.obraId);
          if (d.dataVistoria) setDataVistoria(d.dataVistoria);
          if (d.metragem !== undefined) setMetragem(d.metragem);
          if (d.gc !== undefined) setGc(d.gc);
          if (d.go !== undefined) setGo(d.go);
          if (d.condicao) setCondicao(d.condicao);
          if (d.totalItens !== undefined) setTotalItens(d.totalItens);
          if (Array.isArray(d.items)) setItems(d.items);
          setRestoredAt(d.__savedAt ?? Date.now());
        }
        restoredRef.current = true;
      }
      setLoading(false);
    })();
  }, [isEdit, id]);

  // Restauração de rascunho em modo NOVO — só restaura quando vier `?draft=<id>`.
  useEffect(() => {
    if (isEdit) return;
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (!novoDraft.isResumed) return;
    const best: any = loadDraft(draftKey);
    if (best) {
      if (best.obraId !== undefined) setObraId(best.obraId);
      if (best.dataVistoria) setDataVistoria(best.dataVistoria);
      if (best.metragem !== undefined) setMetragem(best.metragem);
      if (best.gc !== undefined) setGc(best.gc);
      if (best.go !== undefined) setGo(best.go);
      if (best.condicao) setCondicao(best.condicao);
      if (best.totalItens !== undefined) setTotalItens(best.totalItens);
      if (Array.isArray(best.items)) setItems(best.items);
      setRestoredAt(best.__savedAt ?? Date.now());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save em localStorage
  const { clearDraft: clearDraftFn, markClean } = useDraftAutosave({
    key: draftKey,
    data: { obraId, dataVistoria, metragem, gc, go, condicao, totalItens, items },
    enabled: !loading,
  });

  const discardDraft = () => {
    clearDraftFn();
    markClean();
    setRestoredAt(null);
    window.location.reload();
  };

  // Print on load
  useEffect(() => {
    if (printOnLoad && !loading) {
      setTimeout(() => window.print(), 600);
    }
  }, [printOnLoad, loading]);

  const obraSel = useMemo(
    () => obras.find((o) => String(o.id) === obraId) || null,
    [obras, obraId]
  );

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        disciplina_id: null, disciplina_nome: "",
        fornecedor_id: null, fornecedor_nome: "",
        equipe_nome: "", avaliacao: "ok", comentarios: "",
        ordem: prev.length, fotos: [], expanded: false,
      },
    ]);
  }

  function updItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function suggestEquipes(fornecedor_nome: string): string[] {
    return equipesByForn[fornecedor_nome.toLowerCase()] || [];
  }

  async function handleSave(opts?: { status?: "rascunho" | "finalizado" }): Promise<number | null> {
    const status = opts?.status ?? "finalizado";
    const isDraft = status === "rascunho";
    if (!obraId) { toast.error("Selecione uma obra"); return null; }
    if (isDraft) setSavingDraft(true); else setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        obra_id: Number(obraId),
        data_vistoria: new Date(dataVistoria).getTime(),
        metragem_m2: metragem ? Number(metragem) : null,
        gc: gc || null, go: go || null,
        condicao,
        total_itens: totalItens ? Number(totalItens) : 0,
        status,
      };
      let entregaId = id;
      if (isEdit && id) {
        await supabase.from("checklist_entregas").update(payload).eq("id", id);
      } else {
        payload.created_by_id = user?.id || null;
        payload.created_by_name = user?.user_metadata?.name || user?.email || null;
        const { data, error } = await supabase.from("checklist_entregas").insert(payload).select("id").single();
        if (error) throw error;
        entregaId = (data as any).id;
      }
      // Wipe & reinsert itens (simples)
      await supabase.from("checklist_entrega_itens").delete().eq("entrega_id", entregaId!);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const { data: ins, error } = await supabase
          .from("checklist_entrega_itens")
          .insert({
            entrega_id: entregaId!,
            disciplina_id: it.disciplina_id,
            disciplina_nome: it.disciplina_nome,
            fornecedor_id: it.fornecedor_id,
            fornecedor_nome: it.fornecedor_nome || null,
            equipe_nome: it.equipe_nome || null,
            avaliacao: it.avaliacao,
            comentarios: it.comentarios || null,
            ordem: i,
          })
          .select("id").single();
        if (error) throw error;
        const newItemId = (ins as any).id;
        if (it.fotos.length > 0) {
          await supabase.from("checklist_entrega_fotos").insert(
            it.fotos.map((f, fi) => ({
              item_id: newItemId,
              foto_evidencia_id: f.foto_evidencia_id,
              url: f.url,
              legenda: f.legenda || null,
              ordem: fi,
            }))
          );
        }
        // Aprende relação fornecedor↔equipe
        if (it.fornecedor_nome && it.equipe_nome) {
          await supabase.from("checklist_fornecedor_equipe").upsert(
            {
              fornecedor_id: it.fornecedor_id,
              fornecedor_nome: it.fornecedor_nome,
              nome_equipe: it.equipe_nome,
              disciplina: it.disciplina_nome || null,
            },
            { onConflict: "fornecedor_nome,nome_equipe" }
          );
        }
      }
      if (isDraft) {
        toast.success("Rascunho salvo no servidor", { description: "Você pode continuar depois." });
        // Acabou de criar via "Salvar parcial" → redireciona pro modo edit
        if (!isEdit && entregaId) navigate(`/checklists/${entregaId}`);
      } else {
        clearDraftFn(); markClean();
        toast.success("Checklist salvo!");
        if (!isEdit && entregaId) navigate(`/checklists/${entregaId}`);
      }
      return entregaId;
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
      return null;
    } finally {
      if (isDraft) setSavingDraft(false); else setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <DraftRestoredBanner savedAt={restoredAt} onDiscard={discardDraft} className="print:hidden" />
      {/* Header bar — hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/checklists")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit ? `Checklist #${id}` : "Novo Checklist de Vistoria"}
          </h1>
        </div>
        <div className="flex gap-2">
          {isEdit && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleSave({ status: "rascunho" })}
            disabled={saving || savingDraft}
            title="Salva no servidor como rascunho — não aparece na lista principal"
          >
            <FileEdit className="h-4 w-4 mr-1" /> {savingDraft ? "Salvando..." : "Salvar parcial"}
          </Button>
          <Button onClick={() => handleSave({ status: "finalizado" })} disabled={saving || savingDraft}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Form — hidden on print */}
      <Card className="print:hidden">
        <CardHeader><CardTitle className="text-lg">Cabeçalho</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>Obra</Label>
            <Select value={obraId} onValueChange={setObraId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a obra (com desvios)" /></SelectTrigger>
              <SelectContent>
                {obras.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.codigo} — {o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data da Vistoria</Label>
            <Input className="mt-1" type="date" value={dataVistoria} onChange={(e) => setDataVistoria(e.target.value)} />
          </div>
          <div>
            <Label>Metragem (m²)</Label>
            <Input className="mt-1" type="number" value={metragem} onChange={(e) => setMetragem(e.target.value)} />
          </div>
          <div>
            <Label>GC (Gerente de Contrato)</Label>
            <Input className="mt-1" value={gc} onChange={(e) => setGc(e.target.value)} />
          </div>
          <div>
            <Label>GO (Gerente de Obra)</Label>
            <Input className="mt-1" value={go} onChange={(e) => setGo(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Condição da Obra</Label>
            <div className="flex gap-2 mt-1">
              {condicoes.map((c) => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => setCondicao(c.val)}
                  className={`px-4 py-2 rounded text-sm font-bold border-2 transition ${
                    condicao === c.val
                      ? c.cls + " border-transparent"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Total de Itens</Label>
            <Input
              className="mt-1 bg-muted"
              type="number"
              value={totalItens}
              readOnly
              title="Calculado automaticamente: total de desvios da obra"
            />
            <p className="text-xs text-muted-foreground mt-1">Calculado automaticamente a partir dos desvios da obra</p>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Grid — hidden on print (we have dedicated print view) */}
      <Card className="print:hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Resumo por Disciplina</CardTitle>
          <Button size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Disciplina</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Adicione disciplinas para avaliar.
            </p>
          )}
          {items.map((it, idx) => {
            const sugs = suggestEquipes(it.fornecedor_nome);
            const fornsDaDisc =
              fornecedoresPorDisciplina.get((it.disciplina_nome || "").trim().toLowerCase()) || [];
            return (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-3 items-start bg-muted/20">
                  <div className="col-span-12 md:col-span-3">
                    <Label className="text-xs">Disciplina</Label>
                    <Select
                      value={it.disciplina_id ? String(it.disciplina_id) : ""}
                      onValueChange={(v) => {
                        const d = disciplinas.find((x) => String(x.id) === v);
                        updItem(idx, {
                          disciplina_id: d?.id || null,
                          disciplina_nome: d?.nome || "",
                          // limpa fornecedor ao trocar disciplina
                          fornecedor_id: null,
                          fornecedor_nome: "",
                        });
                      }}
                      disabled={!obraId}
                    >
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue placeholder={obraId ? "—" : "Selecione a obra"} />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplinasFiltradas.length === 0 ? (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            Nenhuma disciplina vinculada aos desvios desta obra
                          </div>
                        ) : (
                          disciplinasFiltradas.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-12 md:col-span-2">
                    <Label className="text-xs">Fornecedor</Label>
                    <Input
                      list={`fornlist-${idx}`}
                      className="mt-1 h-9"
                      placeholder={it.disciplina_nome ? (fornsDaDisc.length ? "Selecione" : "Sem fornecedor") : "Escolha a disciplina"}
                      disabled={!it.disciplina_nome}
                      value={it.fornecedor_nome}
                      onChange={(e) => {
                        const v = e.target.value;
                        const match =
                          fornsDaDisc.find((f) => f.nome.toLowerCase() === v.toLowerCase()) ||
                          fornecedores.find((f) => f.nome.toLowerCase() === v.toLowerCase());
                        updItem(idx, { fornecedor_nome: v, fornecedor_id: match?.id || null });
                      }}
                    />
                    <datalist id={`fornlist-${idx}`}>
                      {fornsDaDisc.map((f) => <option key={`${f.id}-${f.nome}`} value={f.nome} />)}
                    </datalist>
                  </div>
                  <div className="col-span-12 md:col-span-2">
                    <Label className="text-xs">Equipe Alocada</Label>
                    <Input
                      list={`equipelist-${idx}`}
                      className="mt-1 h-9"
                      value={it.equipe_nome}
                      onChange={(e) => updItem(idx, { equipe_nome: e.target.value })}
                    />
                    <datalist id={`equipelist-${idx}`}>
                      {sugs.map((s) => <option key={s} value={s} />)}
                    </datalist>
                    {sugs.length > 0 && it.equipe_nome === "" && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sugs.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"
                            onClick={() => updItem(idx, { equipe_nome: s })}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Label className="text-xs">Avaliação</Label>
                    <div className="flex gap-1 mt-1">
                      {(Object.keys(avalConfig) as Avaliacao[]).map((a) => {
                        const C = avalConfig[a];
                        const Icon = C.icon;
                        const active = it.avaliacao === a;
                        return (
                          <button
                            key={a}
                            type="button"
                            title={C.label}
                            onClick={() => updItem(idx, { avaliacao: a })}
                            className={`p-1.5 rounded border-2 ${active ? "border-current " + C.cls : "border-transparent text-muted-foreground"}`}
                          >
                            <Icon className="h-5 w-5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <Label className="text-xs">Comentários</Label>
                    <Textarea
                      className="mt-1 min-h-[36px] text-sm"
                      rows={2}
                      value={it.comentarios}
                      onChange={(e) => updItem(idx, { comentarios: e.target.value })}
                    />
                  </div>
                  <div className="col-span-12 flex items-center justify-between mt-1">
                    <Button size="sm" variant="outline" onClick={() => updItem(idx, { expanded: !it.expanded })}>
                      {it.expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      Fotos ({it.fotos.length})
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {it.expanded && (
                  <div className="p-3 border-t bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Fotos da página de detalhe (escolha entre os desvios desta obra)
                      </div>
                      <Button
                        size="sm" variant="outline"
                        disabled={!obraId}
                        onClick={() => setPickerForItem(idx)}
                      >
                        <ImagePlus className="h-4 w-4 mr-1" /> Escolher fotos
                      </Button>
                    </div>
                    {it.fotos.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">Nenhuma foto.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {it.fotos.map((f, fi) => (
                          <div key={fi} className="border rounded p-1 space-y-1">
                            <img src={f.url} alt="" className="w-full h-24 object-cover rounded" />
                            <Textarea
                              rows={2}
                              className="text-xs"
                              value={f.legenda}
                              onChange={(e) => {
                                const fotos = [...it.fotos];
                                fotos[fi] = { ...f, legenda: e.target.value };
                                updItem(idx, { fotos });
                              }}
                            />
                            <Button
                              size="sm" variant="ghost" className="w-full h-7"
                              onClick={() => {
                                const fotos = it.fotos.filter((_, i) => i !== fi);
                                updItem(idx, { fotos });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* PRINT VIEW */}
      <div ref={printRef} className="hidden print:block print-report">
        <PrintReport
          obraLabel={obraSel ? `${obraSel.codigo} - ${obraSel.nome}` : ""}
          dataVistoria={dataVistoria}
          metragem={metragem}
          gc={gc} go={go} condicao={condicao}
          totalItens={totalItens}
          items={items}
        />
      </div>

      {/* Picker dialog */}
      <FotosDesvioPicker
        open={pickerForItem !== null}
        onOpenChange={(v) => { if (!v) setPickerForItem(null); }}
        obraId={obraId ? Number(obraId) : null}
        selectedIds={new Set(
          pickerForItem !== null
            ? items[pickerForItem].fotos.map((f) => f.foto_evidencia_id).filter((x): x is number => !!x)
            : []
        )}
        onConfirm={(escolhidas: FotoEscolhida[]) => {
          if (pickerForItem === null) return;
          const idx = pickerForItem;
          const cur = items[idx].fotos;
          const existingIds = new Set(cur.map((f) => f.foto_evidencia_id));
          const novas = escolhidas
            .filter((e) => !existingIds.has(e.foto_evidencia_id))
            .map((e, i): Foto => ({
              foto_evidencia_id: e.foto_evidencia_id,
              url: e.url, legenda: e.legenda, ordem: cur.length + i,
            }));
          updItem(idx, { fotos: [...cur, ...novas] });
        }}
      />

      {/* Print CSS */}
      <style>{`
        @media print {
          body { background: white; }
          .print-report { font-family: Arial, sans-serif; color: #000; font-size: 11px; }
          .print-report table { border-collapse: collapse; width: 100%; }
          .print-report th, .print-report td { border: 1px solid #999; padding: 4px 6px; vertical-align: top; }
          .print-report .header-table th { background: #1e3a8a; color: white; font-weight: bold; }
          .print-report .resumo th { background: #1e3a8a; color: white; }
          .page-break { page-break-after: always; }
          .detalhe-page { page-break-before: always; }
        }
      `}</style>
    </div>
  );
}

// ===== Print sub-component =====
function PrintReport(props: {
  obraLabel: string; dataVistoria: string; metragem: string;
  gc: string; go: string; condicao: Condicao; totalItens: string;
  items: Item[];
}) {
  const condLabel = props.condicao === "otima" ? "Ótima" : props.condicao === "regular" ? "Regular" : "Ruim";
  const dataBR = props.dataVistoria ? new Date(props.dataVistoria).toLocaleDateString("pt-BR") : "";

  const Header = () => (
    <table className="header-table" style={{ marginBottom: 8 }}>
      <tbody>
        <tr>
          <th style={{ width: "12%" }}>Obra:</th>
          <th>{props.obraLabel}</th>
          <th style={{ width: "18%" }}>Condição da Obra</th>
          <th style={{ width: "12%" }}>{condLabel}</th>
        </tr>
        <tr>
          <td><b>Data Vistoria:</b></td>
          <td>{dataBR}</td>
          <td><b>Metragem (m²):</b></td>
          <td>{props.metragem || "-"}</td>
        </tr>
        <tr>
          <td><b>GC:</b></td>
          <td>{props.gc || "-"}</td>
          <td><b>GO:</b></td>
          <td>{props.go || "-"}</td>
        </tr>
        <tr>
          <td></td><td></td>
          <td><b>Total Itens:</b></td>
          <td><b>{props.totalItens || "0"}</b></td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div>
      {/* PAGE 1 — Resumo */}
      <Header />
      <h2 style={{ textAlign: "center", margin: "8px 0" }}>RESUMO</h2>
      <table className="resumo">
        <thead>
          <tr>
            <th>Disciplina</th>
            <th>Fornecedor</th>
            <th>Equipe Alocada</th>
            <th style={{ width: 60 }}>Aval.</th>
            <th>Comentários</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((it, i) => (
            <tr key={i}>
              <td><b>{it.disciplina_nome}</b></td>
              <td>{it.fornecedor_nome}</td>
              <td>{it.equipe_nome}</td>
              <td style={{ textAlign: "center", fontSize: 16, fontWeight: "bold",
                color: it.avaliacao === "ok" ? "#059669" : it.avaliacao === "atencao" ? "#d97706" : "#dc2626" }}>
                {avalConfig[it.avaliacao].print}
              </td>
              <td>{it.comentarios}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PAGES with photos */}
      {props.items.filter((it) => it.fotos.length > 0).map((it, i) => (
        <div key={i} className="detalhe-page">
          <Header />
          <h2 style={{ textTransform: "uppercase", margin: "8px 0 2px" }}>{it.disciplina_nome}</h2>
          <h3 style={{ textTransform: "uppercase", margin: "0 0 8px", color: "#555" }}>
            {it.fornecedor_nome}{it.equipe_nome ? ` — ${it.equipe_nome}` : ""}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {it.fotos.map((f, fi) => (
              <div key={fi} style={{ textAlign: "center" }}>
                <img src={f.url} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "cover", border: "1px solid #ccc" }} />
                <div style={{ fontSize: 10, marginTop: 4, fontWeight: "bold", textTransform: "uppercase" }}>
                  {f.legenda}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}