// Stub: o componente original usava `streamdown` e o backend tRPC.
// Foi neutralizado durante a migração para Lovable Cloud.
// Para reativar, instala uma lib de streaming (e.g. AI SDK) e
// substitui as chamadas por uma edge function que usa Lovable AI Gateway.
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

// Aceita quaisquer props para retrocompatibilidade com o componente original.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AIChatBox(_props: any) {
  return (
    <Card className="flex h-full min-h-64 flex-col items-center justify-center gap-2 border-dashed p-6 text-center text-muted-foreground">
      <Sparkles className="h-8 w-8" />
      <p className="text-sm font-medium">Assistente em migração</p>
      <p className="text-xs">Será reativado com Lovable AI Gateway.</p>
    </Card>
  );
}
