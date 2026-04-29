// Stub do cliente tRPC durante a migração para Lovable Cloud.
// Tipo `any` deliberado: as chamadas `trpc.foo.bar.useQuery(...)` espalhadas
// pelas páginas continuam a compilar, mas devolvem dados vazios em runtime
// (o cliente real aponta para um endpoint inexistente em main.tsx).
// À medida que as páginas migram, substituir as chamadas por chamadas
// directas ao Supabase via `@/integrations/supabase/client`.
import { createTRPCReact } from "@trpc/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTRPCReact<any>();
