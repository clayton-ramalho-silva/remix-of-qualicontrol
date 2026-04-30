// Configuração do cache offline (Fase B — leitura offline).
//
// Estratégia:
// - Persistimos no IndexedDB (via idb-keyval) somente as queries marcadas com
//   `meta: { persist: true }` em src/lib/trpc.ts.
// - Quando o app abre, o React Query hidrata o cache do disco antes de montar
//   a árvore. Resultado: telas com dados cacheados aparecem imediatamente,
//   mesmo sem internet.
// - Quando online, o React Query revalida em background (stale-while-revalidate)
//   e atualiza a UI silenciosamente.
// - Sem service worker — preserva o preview da Lovable.

import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

const CACHE_KEY = "qualicontrol-rq-cache-v1";

// Adapter idb-keyval -> AsyncStorage (a interface que o persister espera).
const idbStorage = {
  getItem: async (key: string) => (await get<string>(key)) ?? null,
  setItem: async (key: string, value: string) => {
    await set(key, value);
  },
  removeItem: async (key: string) => {
    await del(key);
  },
};

export const offlinePersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: CACHE_KEY,
  // throttle pra não escrever no IndexedDB a cada keystroke.
  throttleTime: 1500,
});

// QueryClient com defaults amigáveis ao offline.
export const offlineQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      throwOnError: false,
      // Considera dados frescos por 30s (mesmo comportamento anterior),
      // mas mantém em cache por 30 dias pra sobreviver a refreshes/aberturas
      // do app sem sinal.
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 30,
      // Quando voltar online, revalida.
      refetchOnReconnect: true,
      // No mobile o app fica em background; ao voltar, queremos dados frescos.
      refetchOnWindowFocus: true,
    },
  },
});

// Filtro: só persiste as queries que o avaliador precisa em obra.
// (Queries não persistidas continuam funcionando online normalmente.)
export const shouldPersistQuery = (queryKey: unknown): boolean => {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false;
  const root = String(queryKey[0]);
  // Lista branca explícita — qualquer rota nova precisa ser adicionada aqui
  // pra ficar disponível offline.
  return [
    "obras.list",
    "obras.listWithUltimoDesvio",
    "membros.list",
    "fornecedores.list",
    "grupos.list",
    "desvios.list",
    "desvios.getById",
    "verificacoes.list",
    "verificacoes.getById",
    "checklist.getCompleto",
    "configFaixas.list",
    "plantas.listByObra",
    "plantaAmbientes.listByObra",
  ].includes(root);
};

// Limpa o cache offline (útil em logout).
export async function clearOfflineCache() {
  try {
    await del(CACHE_KEY);
  } catch {
    // ignore
  }
}