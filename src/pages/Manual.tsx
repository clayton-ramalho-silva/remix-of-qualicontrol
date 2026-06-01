import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BookOpen, Search, LayoutDashboard, ClipboardCheck, HardHat, Siren,
  ListChecks, Target, ShieldCheck, BrainCircuit, FileText, Building2,
  Truck, Users, CalendarDays, Map as MapIcon, WifiOff, Camera, Save,
  LogIn, Smartphone, AlertTriangle,
} from "lucide-react";

type Topico = {
  id: string;
  titulo: string;
  modulo: string;
  icone: any;
  tags: string[];
  passos: { titulo: string; texto: string; dica?: string }[];
  dica?: string;
};

const topicos: Topico[] = [
  // ===== PRIMEIROS PASSOS =====
  {
    id: "login",
    titulo: "Como fazer login",
    modulo: "Primeiros Passos",
    icone: LogIn,
    tags: ["entrar", "acesso", "senha", "login", "email"],
    passos: [
      { titulo: "Abra o sistema", texto: "Acesse o endereço enviado pelo administrador no navegador (Chrome, Safari ou Edge). No celular/tablet, recomendamos adicionar à tela inicial." },
      { titulo: "Digite seu e-mail e senha", texto: "Use o e-mail cadastrado pelo administrador. Se for o primeiro acesso, sua senha foi enviada por e-mail." },
      { titulo: "Esqueci a senha", texto: "Peça ao administrador para redefinir em Usuários → seu nome → Redefinir senha. Por segurança não há recuperação automática por e-mail." },
    ],
    dica: "A senha precisa ter no mínimo 8 caracteres, com letras maiúsculas, minúsculas e números.",
  },
  {
    id: "instalar-pwa",
    titulo: "Instalar no celular/tablet (PWA)",
    modulo: "Primeiros Passos",
    icone: Smartphone,
    tags: ["pwa", "instalar", "app", "celular", "tablet", "icone", "tela inicial"],
    passos: [
      { titulo: "Android/Chrome", texto: "Abra o sistema no Chrome → toque nos 3 pontinhos → 'Adicionar à tela inicial' → Instalar." },
      { titulo: "iPhone/iPad/Safari", texto: "Abra no Safari → toque no botão Compartilhar (quadrado com seta para cima) → 'Adicionar à Tela de Início'." },
      { titulo: "Pronto", texto: "O ícone aparece como um aplicativo. Abra por ele para ter experiência de app, sem barras do navegador." },
    ],
  },
  {
    id: "navegacao",
    titulo: "Entendendo o menu lateral",
    modulo: "Primeiros Passos",
    icone: LayoutDashboard,
    tags: ["menu", "navegacao", "sidebar", "lateral"],
    passos: [
      { titulo: "Menu", texto: "À esquerda ficam todos os módulos (Qualidade, QSMS, Desvios, Planos de Ação, etc.). Clique no ícone para abrir." },
      { titulo: "Recolher", texto: "Clique no ícone de painel no topo do menu para recolher e ganhar espaço na tela." },
      { titulo: "Mobile", texto: "No celular o menu aparece pelo botão ☰ no canto superior esquerdo." },
    ],
  },

  // ===== VISTORIA DE RECEBIMENTO =====
  {
    id: "nova-vistoria",
    titulo: "Criar nova Vistoria de Recebimento",
    modulo: "Vistoria de Recebimento",
    icone: ClipboardCheck,
    tags: ["vistoria", "recebimento", "nova", "criar", "checklist"],
    passos: [
      { titulo: "Acesse o módulo", texto: "Menu lateral → 'Vistoria de Recebimento'." },
      { titulo: "Clique em Nova Verificação", texto: "Botão verde no canto superior direito." },
      { titulo: "Preencha o cabeçalho", texto: "Escolha a obra, a data e o avaliador. Esses campos são obrigatórios." },
      { titulo: "Responda os itens", texto: "Para cada pergunta marque Conforme / Não Conforme / Não Aplicável e adicione fotos se necessário." },
      { titulo: "Finalize", texto: "Clique em Salvar no rodapé. O sistema gera os scores automaticamente." },
    ],
    dica: "Tudo o que você digita é salvo automaticamente como rascunho. Se o tablet desligar, ao reabrir o sistema recupera onde parou.",
  },
  {
    id: "fotos-vistoria",
    titulo: "Adicionar e anotar fotos",
    modulo: "Vistoria de Recebimento",
    icone: Camera,
    tags: ["foto", "imagem", "anotar", "desenhar", "marcar"],
    passos: [
      { titulo: "Tire ou escolha a foto", texto: "Toque no ícone de câmera no item. No celular abre a câmera; no desktop, abre o seletor de arquivos." },
      { titulo: "Anote sobre a foto", texto: "Após enviar, clique no lápis para abrir o editor e desenhar setas/círculos sobre a foto." },
      { titulo: "Remover", texto: "Toque no X no canto da miniatura para excluir uma foto." },
    ],
  },

  // ===== QSMS =====
  {
    id: "qsms-lista",
    titulo: "Checklist QSMS",
    modulo: "QSMS",
    icone: HardHat,
    tags: ["qsms", "seguranca", "saude", "meio ambiente", "checklist"],
    passos: [
      { titulo: "Acesse", texto: "Menu → QSMS → Lista de Verificação." },
      { titulo: "Nova", texto: "Clique em 'Nova Verificação', selecione a obra e responda os itens." },
      { titulo: "Salvar parcial", texto: "Pode usar 'Salvar parcial' a qualquer momento — o registro fica como Rascunho e pode ser retomado depois." },
    ],
  },
  {
    id: "qsms-ocorrencia",
    titulo: "Registrar Ocorrência QSMS",
    modulo: "QSMS",
    icone: Siren,
    tags: ["ocorrencia", "acidente", "incidente", "qsms", "registro"],
    passos: [
      { titulo: "Abrir", texto: "Menu → QSMS → Ocorrências → 'Nova Ocorrência'." },
      { titulo: "Classifique", texto: "Escolha tipo, gravidade, data/hora e descreva o que aconteceu." },
      { titulo: "Evidências", texto: "Adicione fotos do local. Aceita múltiplas imagens." },
      { titulo: "Salvar", texto: "A ocorrência fica disponível para análise e gera notificação aos responsáveis." },
    ],
  },

  // ===== CHECKLISTS =====
  {
    id: "checklist-novo",
    titulo: "Preencher um Checklist",
    modulo: "Checklists",
    icone: ListChecks,
    tags: ["checklist", "lista", "verificacao"],
    passos: [
      { titulo: "Acesse", texto: "Menu → Checklist." },
      { titulo: "Novo", texto: "Clique em 'Novo Checklist', escolha obra, fornecedor e tipo." },
      { titulo: "Salvar parcial", texto: "Use o botão 'Salvar parcial' para guardar como rascunho. Use 'Finalizar' apenas quando terminar." },
      { titulo: "Ver rascunhos", texto: "Na lista, clique em 'Mostrar rascunhos (N)' para listar os pendentes." },
    ],
  },

  // ===== DESVIOS =====
  {
    id: "desvio-novo",
    titulo: "Registrar um Desvio",
    modulo: "Desvios",
    icone: AlertTriangle,
    tags: ["desvio", "nao conformidade", "problema"],
    passos: [
      { titulo: "Abrir", texto: "Menu → Novo Desvio (atalho) ou Desvios → Novo." },
      { titulo: "Descreva", texto: "Selecione a obra, o local (planta opcional), descreva o desvio e classifique severidade." },
      { titulo: "Fotos", texto: "Anexe fotos do problema." },
      { titulo: "Salvar", texto: "O desvio aparece na lista para acompanhamento e pode gerar Plano de Ação." },
    ],
  },

  // ===== PLANOS DE AÇÃO =====
  {
    id: "plano-novo",
    titulo: "Criar Plano de Ação",
    modulo: "Planos de Ação",
    icone: Target,
    tags: ["plano", "acao", "5w2h", "tratativa"],
    passos: [
      { titulo: "Abrir", texto: "Menu → Planos de Ação → Novo." },
      { titulo: "Preencha o 5W2H", texto: "O quê, por quê, quem, onde, quando, como e quanto custa." },
      { titulo: "Responsável", texto: "Defina o responsável e o prazo. A pessoa recebe notificação." },
      { titulo: "Acompanhe", texto: "O badge no menu mostra quantos planos estão pendentes para você." },
    ],
  },

  // ===== APROVAÇÕES =====
  {
    id: "aprovacoes",
    titulo: "Aprovações (Gerenciadora / Arquitetura)",
    modulo: "Aprovações",
    icone: ShieldCheck,
    tags: ["aprovacao", "gerenciadora", "arquitetura", "validar"],
    passos: [
      { titulo: "Acesse", texto: "Menu → Aprovações → escolha Gerenciadora ou Arquitetura Externa." },
      { titulo: "Analise", texto: "Veja os itens pendentes. Clique para abrir detalhes." },
      { titulo: "Aprovar / Reprovar", texto: "Use os botões e adicione justificativa quando reprovar." },
    ],
  },

  // ===== ASSISTENTE IA =====
  {
    id: "assistente",
    titulo: "Usar o Assistente IA",
    modulo: "Assistente IA",
    icone: BrainCircuit,
    tags: ["ia", "assistente", "ai", "perguntar", "chat"],
    passos: [
      { titulo: "Abrir", texto: "Menu → Assistente IA." },
      { titulo: "Pergunte", texto: "Escreva em linguagem natural. Ex: 'Quantos desvios abertos a obra X tem este mês?'" },
      { titulo: "Use as respostas", texto: "O assistente pode listar dados, sugerir tratativas e gerar resumos." },
    ],
  },

  // ===== RELATÓRIO =====
  {
    id: "relatorio",
    titulo: "Gerar Relatório",
    modulo: "Relatório",
    icone: FileText,
    tags: ["relatorio", "pdf", "exportar"],
    passos: [
      { titulo: "Acesse", texto: "Menu → Relatório." },
      { titulo: "Filtre", texto: "Escolha obra, período e tipo de relatório." },
      { titulo: "Exporte", texto: "Clique em 'Gerar' — o sistema produz o PDF para download." },
    ],
  },

  // ===== OBRAS / PLANTAS =====
  {
    id: "obras",
    titulo: "Cadastrar e gerenciar Obras",
    modulo: "Obras",
    icone: Building2,
    tags: ["obra", "cadastro", "edificio", "andar"],
    passos: [
      { titulo: "Lista", texto: "Menu → Obras." },
      { titulo: "Detalhe", texto: "Clique em uma obra para ver edifícios, andares e ambientes." },
      { titulo: "Plantas", texto: "Dentro do andar você acessa as plantas e os pins de localização." },
    ],
  },
  {
    id: "plantas",
    titulo: "Trabalhar com Plantas",
    modulo: "Plantas",
    icone: MapIcon,
    tags: ["planta", "pin", "ambiente", "localizacao"],
    passos: [
      { titulo: "Acessar", texto: "Menu → Plantas → selecione a planta." },
      { titulo: "Pin", texto: "Toque na planta para marcar a localização de um desvio ou item." },
      { titulo: "Ambientes", texto: "Use o botão de ambientes para listar/extrair áreas automaticamente." },
    ],
  },

  // ===== FORNECEDORES / ALOCAÇÃO =====
  {
    id: "fornecedores",
    titulo: "Fornecedores",
    modulo: "Fornecedores",
    icone: Truck,
    tags: ["fornecedor", "empreiteiro", "subcontratado"],
    passos: [
      { titulo: "Lista", texto: "Menu → Fornecedores. Veja todos os fornecedores sincronizados." },
      { titulo: "Detalhe", texto: "Clique para ver atividades, obras associadas e histórico." },
    ],
  },
  {
    id: "alocacao",
    titulo: "Alocação de equipes",
    modulo: "Alocação",
    icone: CalendarDays,
    tags: ["alocacao", "equipe", "calendario", "agenda"],
    passos: [
      { titulo: "Acessar", texto: "Menu → Alocação." },
      { titulo: "Visualize", texto: "Veja por dia/semana quem está alocado em qual obra." },
    ],
  },

  // ===== USUÁRIOS (ADMIN) =====
  {
    id: "usuarios",
    titulo: "Cadastrar usuários (Admin)",
    modulo: "Administração",
    icone: Users,
    tags: ["usuario", "conta", "admin", "cadastro", "senha"],
    passos: [
      { titulo: "Acessar", texto: "Menu → Usuários (visível apenas para administradores)." },
      { titulo: "Novo", texto: "Clique em 'Novo Usuário', informe nome, e-mail e função." },
      { titulo: "Senha", texto: "A senha precisa ter ao menos 8 caracteres, com maiúscula, minúscula e número. Ao criar, comunique a senha ao usuário." },
      { titulo: "Redefinir", texto: "Para resetar, abra o usuário e clique em 'Redefinir senha'." },
    ],
  },

  // ===== AUTO-SAVE / OFFLINE =====
  {
    id: "autosave",
    titulo: "Recuperação automática de rascunhos",
    modulo: "Dicas Importantes",
    icone: Save,
    tags: ["rascunho", "auto save", "recuperar", "perda", "dados"],
    passos: [
      { titulo: "Como funciona", texto: "Enquanto você preenche um formulário (vistoria, ocorrência, checklist), tudo é salvo automaticamente no aparelho a cada alteração." },
      { titulo: "Se algo der errado", texto: "Se a página recarregar (refresh, virar tablet, queda de bateria), basta reabrir a mesma tela — aparece o aviso 'Rascunho recuperado'." },
      { titulo: "Aviso de saída", texto: "Se tentar fechar a aba com dados não salvos, o navegador pergunta antes de sair." },
    ],
    dica: "Para garantir que rascunhos longos não fiquem só no aparelho, em Checklists use o botão 'Salvar parcial' — isso envia para o servidor também.",
  },
  {
    id: "offline",
    titulo: "Trabalhar com internet ruim/offline",
    modulo: "Dicas Importantes",
    icone: WifiOff,
    tags: ["offline", "sem internet", "wifi", "campo"],
    passos: [
      { titulo: "Indicador", texto: "No topo aparece um aviso quando você fica sem conexão." },
      { titulo: "Rascunhos locais", texto: "Mesmo offline, os formulários continuam salvando no aparelho. Volte ao online para enviar." },
      { titulo: "Fotos", texto: "Tire as fotos normalmente — o upload acontece assim que a conexão voltar." },
    ],
  },
];

const modulosOrdem = [
  "Primeiros Passos",
  "Vistoria de Recebimento",
  "QSMS",
  "Checklists",
  "Desvios",
  "Planos de Ação",
  "Aprovações",
  "Assistente IA",
  "Relatório",
  "Obras",
  "Plantas",
  "Fornecedores",
  "Alocação",
  "Administração",
  "Dicas Importantes",
];

export default function Manual() {
  const [busca, setBusca] = useState("");
  const [moduloAtivo, setModuloAtivo] = useState<string>("Todos");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return topicos.filter((t) => {
      if (moduloAtivo !== "Todos" && t.modulo !== moduloAtivo) return false;
      if (!termo) return true;
      const haystack = [
        t.titulo,
        t.modulo,
        ...t.tags,
        ...t.passos.flatMap((p) => [p.titulo, p.texto]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(termo);
    });
  }, [busca, moduloAtivo]);

  const agrupados = useMemo(() => {
    const map = new Map<string, Topico[]>();
    for (const t of filtrados) {
      if (!map.has(t.modulo)) map.set(t.modulo, []);
      map.get(t.modulo)!.push(t);
    }
    return modulosOrdem
      .filter((m) => map.has(m))
      .map((m) => ({ modulo: m, itens: map.get(m)! }));
  }, [filtrados]);

  const modulosDisponiveis = ["Todos", ...modulosOrdem];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Manual de Uso</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Guia rápido para usar o sistema. Pesquise abaixo ou filtre por módulo.
          </p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar dúvida... (ex: foto, rascunho, senha, plano)"
          className="pl-9 h-11"
        />
      </div>

      {/* Filtros por módulo */}
      <div className="flex flex-wrap gap-2">
        {modulosDisponiveis.map((m) => (
          <button
            key={m}
            onClick={() => setModuloAtivo(m)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              moduloAtivo === m
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Resultado vazio */}
      {!agrupados.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-slate-600">Nenhum tópico encontrado</h3>
            <p className="text-sm text-slate-400 mt-1">Tente outra palavra-chave ou limpe os filtros.</p>
          </CardContent>
        </Card>
      )}

      {/* Tópicos agrupados */}
      <div className="space-y-6">
        {agrupados.map(({ modulo, itens }) => (
          <section key={modulo}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {modulo}
              </h2>
              <Badge variant="outline" className="text-[10px]">{itens.length}</Badge>
            </div>
            <Card>
              <CardContent className="p-0">
                <Accordion type="multiple" className="divide-y">
                  {itens.map((t) => {
                    const Icon = t.icone;
                    return (
                      <AccordionItem key={t.id} value={t.id} className="border-0 px-4">
                        <AccordionTrigger className="py-4 hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-slate-800">{t.titulo}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-5 pl-12 pr-2 space-y-3">
                          <ol className="space-y-3">
                            {t.passos.map((p, i) => (
                              <li key={i} className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                                  {i + 1}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800">{p.titulo}</p>
                                  <p className="text-sm text-slate-600 mt-0.5">{p.texto}</p>
                                </div>
                              </li>
                            ))}
                          </ol>
                          {t.dica && (
                            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-900">
                              <strong className="font-semibold">Dica:</strong> {t.dica}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </section>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center pt-6">
        Não encontrou o que procurava? Use o Assistente IA no menu lateral.
      </p>
    </div>
  );
}
