import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // Suprime erros de chamadas tRPC ainda não migradas.
      throwOnError: false,
    },
  },
});

// Cliente tRPC stub: aponta para um endpoint inexistente. As chamadas
// vão falhar silenciosamente (retry: false) até serem migradas para Supabase.
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc-disabled",
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
