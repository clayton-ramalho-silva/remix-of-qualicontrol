import { useEffect, useRef, useState, useCallback } from "react";

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
