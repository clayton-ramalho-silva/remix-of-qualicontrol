import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { offlinePersister, offlineQueryClient } from "@/lib/offline-cache";

createRoot(document.getElementById("root")!).render(
  <PersistQueryClientProvider
    client={offlineQueryClient}
    persistOptions={{
      persister: offlinePersister,
      // Cache válido por 30 dias no disco.
      maxAge: 1000 * 60 * 60 * 24 * 30,
      // Invalida o cache se subirmos uma nova versão do app.
      buster: "v1",
      dehydrateOptions: {
        // Só persiste queries com sucesso e marcadas como persistíveis.
        shouldDehydrateQuery: (query) => {
          if (query.state.status !== "success") return false;
          return query.meta?.persist === true;
        },
      },
    }}
  >
    <App />
  </PersistQueryClientProvider>
);
