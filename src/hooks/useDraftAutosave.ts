import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Parse a draft key like `draft:<scope>:<draftId>`.
 * The scope itself may contain colons (e.g. `verificacao:qualidade`),
 * so the draftId is everything after the LAST colon.
 */
function parseDraftKey(key: string): { scope: string; draftId: string } | null {
  if (!key.startsWith("draft:")) return null;
  const rest = key.slice("draft:".length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon < 0) return null;
  return { scope: rest.slice(0, lastColon), draftId: rest.slice(lastColon + 1) };
}

/** Debounced backend upsert tracker (per-key). */
const remoteTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function pushDraftRemote(key: string, dataObj: any) {
  const parsed = parseDraftKey(key);
  if (!parsed) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { __savedAt, ...cleanData } = dataObj || {};
    await supabase.from("user_drafts").upsert(
      {
        user_id: user.id,
        scope: parsed.scope,
        draft_id: parsed.draftId,
        data: cleanData,
        saved_at: new Date(__savedAt ?? Date.now()).toISOString(),
      },
      { onConflict: "user_id,scope,draft_id" }
    );
  } catch (e) {
    console.warn("remote draft push failed", e);
  }
}

function scheduleRemotePush(key: string, dataObj: any, delayMs = 1500) {
  const existing = remoteTimers.get(key);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    remoteTimers.delete(key);
    pushDraftRemote(key, dataObj);
  }, delayMs);
  remoteTimers.set(key, t);
}

async function deleteDraftRemote(key: string) {
  const parsed = parseDraftKey(key);
  if (!parsed) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("user_drafts")
      .delete()
      .eq("user_id", user.id)
      .eq("scope", parsed.scope)
      .eq("draft_id", parsed.draftId);
  } catch (e) {
    console.warn("remote draft delete failed", e);
  }
}

/**
 * Puxa todos os rascunhos do usuário autenticado e os hidrata em localStorage.
 * Para cada rascunho remoto, se a versão local for mais antiga (ou inexistente),
 * sobrescreve. Se a local for mais nova, faz push para o servidor.
 * Deve ser chamado logo após o usuário estar autenticado.
 */
export async function syncDraftsFromBackend(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data, error } = await supabase
      .from("user_drafts")
      .select("scope, draft_id, data, saved_at")
      .eq("user_id", user.id);
    if (error || !data) return 0;
    let hydrated = 0;
    for (const row of data) {
      const key = `draft:${row.scope}:${row.draft_id}`;
      const remoteSavedAt = row.saved_at ? new Date(row.saved_at).getTime() : 0;
      let localSavedAt = 0;
      try {
        const raw = localStorage.getItem(key);
        if (raw) localSavedAt = JSON.parse(raw)?.__savedAt ?? 0;
      } catch { /* ignore */ }
      if (remoteSavedAt >= localSavedAt) {
        const payload = { ...(row.data as any), __savedAt: remoteSavedAt || Date.now() };
        try {
          localStorage.setItem(key, JSON.stringify(payload));
          hydrated++;
        } catch { /* ignore */ }
      } else {
        // local é mais novo — manda pro servidor
        try {
          const raw = localStorage.getItem(key);
          if (raw) pushDraftRemote(key, JSON.parse(raw));
        } catch { /* ignore */ }
      }
    }
    return hydrated;
  } catch (e) {
    console.warn("syncDraftsFromBackend failed", e);
    return 0;
  }
}

/** Gera um id curto e único para identificar um rascunho. */
export function newDraftId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

/**
 * Hook que obtém (ou gera) o id do rascunho atual a partir do parâmetro `?draft=`
 * da URL. Se a URL não trouxer um id, gera um novo e o injeta na URL via
 * `history.replaceState`, de modo que reloads continuem o mesmo rascunho.
 *
 * Retorna a chave de localStorage pronta no formato `draft:<scope>:<id>`.
 */
export function useDraftId(scope: string): { draftId: string; key: string; isResumed: boolean } {
  const initial = useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const fromUrl = sp.get("draft");
      if (fromUrl) return { id: fromUrl, resumed: true };
    } catch { /* ignore */ }
    return { id: newDraftId(), resumed: false };
  }, []);
  const idRef = useRef(initial.id);
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("draft") !== idRef.current) {
        sp.set("draft", idRef.current);
        const qs = sp.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
      }
    } catch { /* ignore */ }
  }, []);
  return { draftId: idRef.current, key: `draft:${scope}:${idRef.current}`, isResumed: initial.resumed };
}


/**
 * Auto-save de rascunho em localStorage.
 *
 * - Grava `data` em `localStorage[key]` com debounce.
 * - Mostra aviso nativo do navegador (beforeunload) enquanto houver alterações
 *   não salvas no backend (`dirty = true`).
 * - Ignora propriedades não serializáveis (File/Blob).
 *
 * Uso:
 *   const { dirty, markClean, clearDraft } = useDraftAutosave({
 *     key: `draft:vistoria:${obraId}:${data}:${categoria}`,
 *     data: { respostas, score, ... },
 *     enabled: !!obraId,
 *   });
 *
 *   // ao finalizar com sucesso no backend:
 *   clearDraft();
 *   markClean();
 */
export interface DraftAutosaveOptions<T> {
  key: string | null;
  data: T;
  enabled?: boolean;
  debounceMs?: number;
  /** Se o JSON resultante for vazio/igual ao initial, não grava */
  isEmpty?: (data: T) => boolean;
}

function safeStringify(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
    if (typeof File !== "undefined" && v instanceof File) return undefined;
    if (typeof Blob !== "undefined" && v instanceof Blob) return undefined;
    if (v instanceof Map) return Array.from(v.entries());
    if (v instanceof Set) return Array.from(v.values());
    return v;
  });
}

export function loadDraft<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export function listDrafts(prefix: string): { key: string; savedAt: number }[] {
  const out: { key: string; savedAt: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const raw = localStorage.getItem(k);
        let savedAt = 0;
        try { savedAt = JSON.parse(raw || "{}")?.__savedAt ?? 0; } catch { /* ignore */ }
        out.push({ key: k, savedAt });
      }
    }
  } catch { /* ignore */ }
  return out;
}

export function useDraftAutosave<T>(opts: DraftAutosaveOptions<T>) {
  const { key, data, enabled = true, debounceMs = 600, isEmpty } = opts;
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const firstRunRef = useRef(true);

  const persistNow = useCallback(() => {
    if (!enabled || !key) return;
    try {
      if (isEmpty && isEmpty(data)) {
        localStorage.removeItem(key);
        return;
      }
      const dataStr = safeStringify(data);
      // Compara apenas o CONTEÚDO com o que já está em disco (ignora __savedAt).
      // Se nada mudou de fato, NÃO regrava — isso preserva o __savedAt original
      // (o momento em que o usuário realmente parou de preencher) mesmo que a
      // restauração re-aplique o mesmo estado e dispare o autosave.
      let existingDataStr = "";
      try {
        const existingRaw = localStorage.getItem(key);
        if (existingRaw) {
          const parsed = JSON.parse(existingRaw);
          delete parsed.__savedAt;
          existingDataStr = JSON.stringify(parsed);
        }
      } catch { /* ignore */ }
      if (dataStr === existingDataStr) {
        lastSavedRef.current = dataStr;
        return;
      }
      if (dataStr === lastSavedRef.current) return;
      const payload = JSON.stringify({ ...JSON.parse(dataStr), __savedAt: Date.now() });
      localStorage.setItem(key, payload);
      lastSavedRef.current = dataStr;
    } catch (e) {
      // quota exceeded ou similar — silencia (foto não está aqui)
      console.warn("draft autosave failed", e);
    }
  }, [enabled, key, data, isEmpty]);

  // Debounced auto-save quando data muda
  useEffect(() => {
    if (!enabled || !key) return;
    if (firstRunRef.current) {
      firstRunRef.current = false;
      // marca lastSaved com o conteúdo inicial pra não disparar dirty no mount
      lastSavedRef.current = safeStringify(data);
      return;
    }
    setDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(persistNow, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeStringify(data as unknown), enabled, key]);

  // beforeunload — só enquanto dirty
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      // grava na hora antes de sair (síncrono)
      persistNow();
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, persistNow]);

  const markClean = useCallback(() => setDirty(false), []);
  const clear = useCallback(() => {
    if (key) clearDraft(key);
    lastSavedRef.current = "";
    setDirty(false);
  }, [key]);

  return { dirty, markClean, clearDraft: clear, persistNow };
}
