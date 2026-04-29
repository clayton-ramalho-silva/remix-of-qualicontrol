// Stub do cliente tRPC durante a migração para Lovable Cloud.
// Todas as chamadas devem ser progressivamente substituídas por
// chamadas diretas ao Supabase (`@/integrations/supabase/client`).
// Por agora, este stub evita erros de compilação mantendo a UI montável.
import { createTRPCReact } from "@trpc/react-query";

// Tipo permissivo: aceita qualquer caminho de chamada (`trpc.foo.bar.useQuery(...)`).
// O cliente real é criado em main.tsx mas as chamadas devolvem dados vazios.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<any>();
