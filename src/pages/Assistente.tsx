import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect } from "react";
import { BrainCircuit, Send, Loader2, Lightbulb, Sparkles, MessageSquare } from "lucide-react";
import { Streamdown } from "streamdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Assistente() {
  const [selectedObraId, setSelectedObraId] = useState<string>("all");
  const { data: obras } = trpc.obras.list.useQuery();
  const obraIdNum = selectedObraId === "all" ? undefined : parseInt(selectedObraId);

  const { data: suggestionsData, isLoading: sugLoading } = trpc.llm.suggestQuestions.useQuery(
    obraIdNum ? { obraId: obraIdNum } : undefined
  );

  const askMutation = trpc.llm.ask.useMutation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (question?: string) => {
    const q = question || input.trim();
    if (!q) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);

    try {
      const result = await askMutation.mutateAsync({
        question: q,
        obraId: obraIdNum,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente." },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" /> Assistente IA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Faça perguntas sobre os dados de qualidade e receba análises inteligentes
          </p>
        </div>
        <Select value={selectedObraId} onValueChange={setSelectedObraId}>
          <SelectTrigger className="w-[220px] bg-card">
            <SelectValue placeholder="Contexto da obra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as obras</SelectItem>
            {obras?.map((o) => (
              <SelectItem key={o.id} value={String(o.id)}>{o.codigo} - {o.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Suggested Questions */}
      <Card className="shadow-sm border-0 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Perguntas Sugeridas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sugLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-48 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestionsData?.suggestions?.map((s: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  disabled={askMutation.isPending}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border bg-background hover:bg-primary/5 hover:border-primary/30 transition-colors text-left disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3 text-primary shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="shadow-sm border-0 bg-card">
        <CardContent className="p-0">
          {/* Messages */}
          <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Olá! Sou o QualiControl AI</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Posso analisar os dados de qualidade das suas obras, identificar tendências,
                  sugerir ações corretivas e responder perguntas sobre desvios e fornecedores.
                </p>
                <p className="text-xs text-muted-foreground/60 mt-3">
                  Clique em uma pergunta sugerida acima ou digite sua própria pergunta.
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3"
                    : "bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3"
                    }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none text-foreground">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {askMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando dados...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Faça uma pergunta sobre os dados de qualidade..."
                rows={2}
                className="flex-1 resize-none bg-background"
                disabled={askMutation.isPending}
              />
              <Button
                size="icon"
                className="h-auto"
                disabled={!input.trim() || askMutation.isPending}
                onClick={() => handleSend()}
              >
                {askMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground/50 mt-2">
              O assistente analisa os dados reais do sistema para fornecer respostas contextualizadas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
