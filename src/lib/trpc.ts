// Adapter tRPC -> Supabase para a migração faseada do projecto.
// Páginas existentes invocam `trpc.<router>.<proc>.useQuery(...)` ou `.useMutation(...)`
// e este módulo intercepta essas chamadas devolvendo dados reais de Supabase
// via `@tanstack/react-query`.
//
// Procedures suportados (rotas usadas pelas páginas migradas):
//   obras.list, obras.listWithUltimoDesvio, obras.create, obras.update
//   fornecedores.list, fornecedores.create, fornecedores.update
//   desvios.list, desvios.getById, desvios.create, desvios.update
//   grupos.list
//   membros.list
//   historico.addComment
//   planos.create, planos.update
//   fotos.upload
//   plantas.listByObra
//   kpis.get, kpis.fornecedorPerformance
//   notificacoes.list, notificacoes.markAsRead
//
// Procedures não mapeados devolvem dados vazios (sem erro).

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { shouldPersistQuery } from "@/lib/offline-cache";

// ---------- Resolvers ----------

type Resolver = (input: any) => Promise<any>;

const queryResolvers: Record<string, Resolver> = {
  // --- OBRAS ---
  "obras.list": async () => {
    const { data, error } = await supabase.from("obras").select("*").order("codigo");
    if (error) throw error;
    return data || [];
  },
  "obras.listWithUltimoDesvio": async () => {
    const { data: obras, error } = await supabase.from("obras").select("*").order("codigo");
    if (error) throw error;
    const { data: desvios } = await supabase.from("desvios").select("obra_id, data_identificacao").is("deleted_at", null);
    const lastByObra = new Map<number, number>();
    (desvios || []).forEach((d: any) => {
      const cur = lastByObra.get(d.obra_id) ?? 0;
      const dt = Number(d.data_identificacao);
      if (dt > cur) lastByObra.set(d.obra_id, dt);
    });
    return (obras || []).map((o: any) => ({ ...o, ultimoDesvio: lastByObra.get(o.id) ?? null }));
  },

  // --- FORNECEDORES ---
  "fornecedores.list": async () => {
    const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
    if (error) throw error;
    return data || [];
  },

  // --- GRUPOS ---
  "grupos.list": async () => {
    // Sincroniza com a API externa AW (check-lista-atividade-inspecao)
    // e devolve a lista atualizada da tabela grupos.
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "sync-grupos-inspecao",
    );
    if (!fnError && fnData?.grupos) return fnData.grupos;

    // Fallback: lê direto da tabela se a sync falhar
    const { data, error } = await supabase
      .from("grupos")
      .select("*")
      .eq("ativo", 1)
      .order("nome");
    if (error) throw error;
    return data || [];
  },

  // --- MEMBROS ---
  "membros.list": async () => {
    const { data, error } = await supabase
      .from("membros_equipe")
      .select("*")
      .eq("ativo", 1)
      .order("nome");
    if (error) throw error;
    return (data || []).map(mapMembroFromDb);
  },

  // --- DESVIOS ---
  "desvios.list": async (filters: any = {}) => {
    let q = supabase.from("desvios").select("*").is("deleted_at", null).order("data_identificacao", { ascending: false });
    if (filters?.obraId) q = q.eq("obra_id", filters.obraId);
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.severidade) q = q.eq("severidade", filters.severidade);
    if (filters?.origem) q = q.eq("origem", filters.origem);
    if (filters?.tagCritico) q = q.eq("tag_critico", 1);
    if (filters?.tagSegurancaTrabalho) q = q.eq("tag_seguranca_trabalho", 1);
    if (filters?.tagSolicitadoCliente) q = q.eq("tag_solicitado_cliente", 1);
    if (filters?.tagSolicitadoGerenciadora) q = q.eq("tag_solicitado_gerenciadora", 1);
    if (filters?.tagSolicitadoArquitetura) q = q.eq("tag_solicitado_arquitetura", 1);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapDesvioFromDb);
  },
  "desvios.getById": async ({ id }: { id: number }) => {
    const { data: desvio, error } = await supabase.from("desvios").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!desvio) return null;
    const [{ data: fotos }, { data: vinculos }, { data: historico }, { data: aprovacoes }] = await Promise.all([
      supabase.from("fotos_evidencia").select("*").eq("desvio_id", id).order("created_at"),
      supabase.from("plano_desvios" as any).select("plano_id").eq("desvio_id", id),
      supabase.from("historico").select("*").eq("desvio_id", id).order("created_at", { ascending: false }),
      supabase.from("desvio_aprovacoes").select("*").eq("desvio_id", id).order("created_at"),
    ]);
    const planoIds = Array.from(new Set((vinculos || []).map((v: any) => v.plano_id)));
    let planos: any[] = [];
    if (planoIds.length > 0) {
      const { data: planosData } = await supabase.from("planos_acao").select("*").in("id", planoIds).order("created_at");
      planos = planosData || [];
    }
    return {
      ...mapDesvioFromDb(desvio),
      fotos: (fotos || []).map((f: any) => ({ ...f, fileKey: f.file_key })),
      planosAcao: planos.map(mapPlanoFromDb),
      historico: (historico || []).map((h: any) => ({
        ...h,
        userId: h.user_id,
        userName: h.user_name,
        createdAt: new Date(h.created_at).getTime(),
      })),
      aprovacoes: (aprovacoes || []).map((a: any) => ({
        id: a.id,
        tipo: a.tipo,
        decisao: a.decisao,
        aprovadorId: a.aprovador_id,
        aprovadorNome: a.aprovador_nome,
        comentario: a.comentario,
        createdAt: new Date(a.created_at).getTime(),
      })),
    };
  },

  // --- PLANTAS ---
  "plantas.listByObra": async ({ obraId }: { obraId: number }) => {
    const { data, error } = await supabase.from("plantas").select("*").eq("obra_id", obraId).order("ordem");
    if (error) throw error;
    return (data || []).map((p: any) => ({ ...p, fileKey: p.file_key, obraId: p.obra_id, andarId: p.andar_id ?? null }));
  },

  "plantas.listByAndar": async ({ andarId }: { andarId: number }) => {
    const { data, error } = await (supabase.from("plantas") as any).select("*").eq("andar_id", andarId).order("ordem");
    if (error) throw error;
    return (data || []).map((p: any) => ({ ...p, fileKey: p.file_key, obraId: p.obra_id, andarId: p.andar_id }));
  },

  "plantas.semHierarquia": async ({ obraId }: { obraId: number }) => {
    const { data, error } = await (supabase.from("plantas") as any).select("*").eq("obra_id", obraId).is("andar_id", null).order("ordem");
    if (error) throw error;
    return (data || []).map((p: any) => ({ ...p, fileKey: p.file_key, obraId: p.obra_id, andarId: p.andar_id ?? null }));
  },

  // --- EDIFICIOS / ANDARES ---
  "edificios.listByObra": async ({ obraId }: { obraId: number }) => {
    const { data: eds, error } = await supabase.from("edificios" as any).select("*").eq("obra_id", obraId).eq("ativo", 1).order("ordem").order("nome");
    if (error) throw error;
    const ids = (eds || []).map((e: any) => e.id);
    let andares: any[] = [];
    let plantasCount = new Map<number, number>();
    if (ids.length > 0) {
      const { data: ans } = await supabase.from("andares" as any).select("*").in("edificio_id", ids).eq("ativo", 1).order("numero").order("ordem");
      andares = ans || [];
      const andarIds = andares.map(a => a.id);
      if (andarIds.length > 0) {
        const { data: ps } = await (supabase.from("plantas") as any).select("andar_id").in("andar_id", andarIds);
        (ps || []).forEach((p: any) => {
          plantasCount.set(p.andar_id, (plantasCount.get(p.andar_id) || 0) + 1);
        });
      }
    }
    return (eds || []).map((e: any) => ({
      ...e,
      obraId: e.obra_id,
      andares: andares.filter(a => a.edificio_id === e.id).map(a => ({
        ...a,
        edificioId: a.edificio_id,
        plantasCount: plantasCount.get(a.id) || 0,
      })),
    }));
  },
  "edificios.getById": async ({ id }: { id: number }) => {
    const { data, error } = await (supabase.from("edificios" as any) as any).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d: any = data;
    return { ...d, obraId: d.obra_id };
  },
  "andares.getById": async ({ id }: { id: number }) => {
    const { data, error } = await (supabase.from("andares" as any) as any).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d: any = data;
    return { ...d, edificioId: d.edificio_id };
  },

  "plantas.getById": async ({ id }: { id: number }) => {
    const { data, error } = await supabase.from("plantas").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { ...data, fileKey: data.file_key, obraId: data.obra_id };
  },

  "plantas.desviosNaPlanta": async ({ plantaId }: { plantaId: number }) => {
    const { data, error } = await supabase
      .from("desvios")
      .select("*")
      .eq("planta_id", plantaId)
      .is("deleted_at", null)
      .order("data_identificacao", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapDesvioFromDb);
  },

  // --- VERIFICACOES ---
  "verificacoes.list": async (filters: any = {}) => {
    let q = supabase.from("verificacoes").select("*").order("data_vistoria", { ascending: false });
    if (filters?.obraId) q = q.eq("obra_id", filters.obraId);
    if (filters?.categoria) q = q.eq("categoria", filters.categoria);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapVerificacaoFromDb);
  },
  "verificacoes.getById": async ({ id }: { id: number }) => {
    const { data, error } = await supabase.from("verificacoes").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const categoria = (data as any).categoria || "qualidade";
    const [{ data: respostas }, { data: secoes }, { data: itens }, { data: fotos }] = await Promise.all([
      supabase.from("verificacao_respostas").select("*").eq("verificacao_id", id),
      supabase.from("checklist_secoes").select("*").eq("ativo", 1).eq("categoria", categoria).order("ordem"),
      supabase.from("checklist_itens").select("*").eq("ativo", 1).order("ordem"),
      supabase.from("verificacao_resposta_fotos" as any).select("*").eq("verificacao_id", id),
    ]);
    const checklist = (secoes || []).map((s: any) => ({
      ...s,
      itens: (itens || []).filter((i: any) => i.secao_id === s.id),
    }));
    const fotosByItem: Record<number, any[]> = {};
    (fotos || []).forEach((f: any) => {
      (fotosByItem[f.item_id] ||= []).push({ id: f.id, url: f.url, fileKey: f.file_key, descricao: f.descricao });
    });
    return {
      ...mapVerificacaoFromDb(data),
      checklist,
      respostas: (respostas || []).map((r: any) => ({
        id: r.id,
        itemId: r.item_id,
        resposta: r.resposta,
        observacao: r.observacao,
        fotos: fotosByItem[r.item_id] || [],
      })),
    };
  },

  // --- CHECKLIST ---
  "checklist.getCompleto": async (input: any = {}) => {
    let secoesQuery = supabase.from("checklist_secoes").select("*").eq("ativo", 1).order("ordem");
    if (input?.categoria) secoesQuery = secoesQuery.eq("categoria", input.categoria);
    const [{ data: secoes, error: e1 }, { data: itens, error: e2 }] = await Promise.all([
      secoesQuery,
      supabase.from("checklist_itens").select("*").eq("ativo", 1).order("ordem"),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    return (secoes || []).map((s: any) => ({
      ...s,
      itens: (itens || []).filter((i: any) => i.secao_id === s.id),
    }));
  },

  // --- CONFIG FAIXAS ---
  "configFaixas.list": async (input: any = {}) => {
    let q = supabase.from("config_faixas").select("*").order("ordem");
    if (input?.categoria) q = q.eq("categoria", input.categoria);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  // --- LLM (Assistente IA) ---
  "llm.suggestQuestions": async (input: any = {}) => {
    const { data, error } = await supabase.functions.invoke("assistente-ia", {
      body: { mode: "suggest", obraId: input?.obraId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data; // { suggestions: string[] }
  },

  // --- KPIs ---
  "kpis.get": async (filters: any = {}) => {
    let q = supabase.from("desvios").select("status, severidade, origem, tag_critico, tag_seguranca_trabalho, tag_solicitado_cliente, prazo_sugerido, data_fechamento, data_identificacao, obra_id, disciplina, grupo_id, fornecedor_nome").is("deleted_at", null);
    if (filters?.obraId) q = q.eq("obra_id", filters.obraId);
    if (filters?.origem) q = q.eq("origem", filters.origem);
    const { data, error } = await q;
    if (error) throw error;
    // Buscar grupos para mapear grupo_id -> nome
    const { data: grupos } = await supabase.from("grupos").select("id, nome");
    const grupoMap = new Map<number, string>((grupos || []).map((g: any) => [g.id, g.nome]));

    const desvios = data || [];
    const total = desvios.length;
    const abertos = desvios.filter((d: any) => d.status === "aberto").length;
    const emAndamento = desvios.filter((d: any) => d.status === "em_andamento").length;
    const aguardandoAceite = desvios.filter((d: any) => d.status === "aguardando_aceite").length;
    const fechados = desvios.filter((d: any) => d.status === "fechado").length;
    const graves = desvios.filter((d: any) => d.severidade === "grave").length;
    const now = Date.now();
    const atrasados = desvios.filter((d: any) =>
      d.status !== "fechado" && d.status !== "aguardando_aceite" && d.prazo_sugerido && Number(d.prazo_sugerido) < now
    ).length;
    const taxaFechamento = total > 0 ? Math.round((fechados / total) * 100) : 0;

    const porClassificacao = {
      chamado_critico: desvios.filter((d: any) => d.tag_critico === 1).length,
      seguranca_trabalho: desvios.filter((d: any) => d.tag_seguranca_trabalho === 1).length,
      solicitado_cliente: desvios.filter((d: any) => d.tag_solicitado_cliente === 1).length,
    };

    const porSeveridade = {
      leve: desvios.filter((d: any) => d.severidade === "leve").length,
      moderado: desvios.filter((d: any) => d.severidade === "moderado").length,
      grave: desvios.filter((d: any) => d.severidade === "grave").length,
    };

    const porOrigem: Record<string, number> = { qualidade: 0, checklist: 0, qsms: 0, vistoria: 0 };
    desvios.forEach((d: any) => {
      if (d.origem && porOrigem[d.origem] !== undefined) porOrigem[d.origem]++;
    });

    const porGrupo: Record<string, { total: number; abertos: number; fechados: number; graves: number }> = {};
    desvios.forEach((d: any) => {
      const nome = (d.grupo_id && grupoMap.get(d.grupo_id)) || d.disciplina || "Sem grupo";
      const cur = porGrupo[nome] || { total: 0, abertos: 0, fechados: 0, graves: 0 };
      cur.total++;
      if (d.status !== "fechado") cur.abertos++;
      if (d.status === "fechado") cur.fechados++;
      if (d.severidade === "grave") cur.graves++;
      porGrupo[nome] = cur;
    });

    const porFornecedor: Record<string, { total: number; abertos: number; graves: number }> = {};
    desvios.forEach((d: any) => {
      const nome = d.fornecedor_nome || "Sem fornecedor";
      const cur = porFornecedor[nome] || { total: 0, abertos: 0, graves: 0 };
      cur.total++;
      if (d.status !== "fechado") cur.abertos++;
      if (d.severidade === "grave") cur.graves++;
      porFornecedor[nome] = cur;
    });

    return {
      total, abertos, emAndamento, aguardandoAceite, fechados, graves, atrasados, taxaFechamento,
      porClassificacao, porSeveridade, porOrigem, porGrupo, porFornecedor,
      // legacy aliases
      criticos: porClassificacao.chamado_critico,
      segurancaTrabalho: porClassificacao.seguranca_trabalho,
      solicitadoCliente: porClassificacao.solicitado_cliente,
    };
  },
  "kpis.fornecedorPerformance": async (filters: any = {}) => {
    let q = supabase.from("desvios").select("fornecedor_nome, status, severidade, data_identificacao, data_fechamento, obra_id").is("deleted_at", null);
    if (filters?.obraId) q = q.eq("obra_id", filters.obraId);
    const { data, error } = await q;
    if (error) throw error;
    const map = new Map<string, any>();
    (data || []).forEach((d: any) => {
      const nome = d.fornecedor_nome || "Sem fornecedor";
      const cur = map.get(nome) || { nome, totalDesvios: 0, abertos: 0, graves: 0, fechados: 0, _tempos: [] as number[] };
      cur.totalDesvios++;
      if (d.status !== "fechado") cur.abertos++;
      if (d.severidade === "grave") cur.graves++;
      if (d.status === "fechado") {
        cur.fechados++;
        if (d.data_fechamento && d.data_identificacao) {
          const dias = (Number(d.data_fechamento) - Number(d.data_identificacao)) / (1000 * 60 * 60 * 24);
          if (dias >= 0) cur._tempos.push(dias);
        }
      }
      map.set(nome, cur);
    });
    return Array.from(map.values()).map((v: any) => ({
      nome: v.nome,
      totalDesvios: v.totalDesvios,
      abertos: v.abertos,
      graves: v.graves,
      fechados: v.fechados,
      tempoMedioResolucao: v._tempos.length ? Math.round(v._tempos.reduce((a: number, b: number) => a + b, 0) / v._tempos.length) : null,
      taxaFechamento: v.totalDesvios > 0 ? Math.round((v.fechados / v.totalDesvios) * 100) : 0,
    }));
  },

  // --- NOTIFICACOES ---
  "notificacoes.list": async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).map((n: any) => ({
      ...n,
      referenciaTipo: n.referencia_tipo,
      referenciaId: n.referencia_id,
      createdAt: new Date(n.created_at).getTime(),
    }));
  },
  "notificacoes.unreadCount": async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count, error } = await supabase
      .from("notificacoes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("lida", 0);
    if (error) throw error;
    return count || 0;
  },

  // --- PLANTA AMBIENTES ---
  "plantaAmbientes.listByPlanta": async ({ plantaId }: { plantaId: number }) => {
    const { data, error } = await supabase
      .from("planta_ambientes")
      .select("*")
      .eq("planta_id", plantaId)
      .eq("ativo", 1)
      .order("pavimento", { ascending: true })
      .order("numero", { ascending: true })
      .order("nome", { ascending: true });
    if (error) throw error;
    return data || [];
  },
  "plantaAmbientes.listByObra": async ({ obraId }: { obraId: number }) => {
    const { data: plantas } = await supabase.from("plantas").select("id, nome").eq("obra_id", obraId);
    const ids = (plantas || []).map((p: any) => p.id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("planta_ambientes")
      .select("*")
      .in("planta_id", ids)
      .eq("ativo", 1)
      .order("pavimento", { ascending: true })
      .order("numero", { ascending: true })
      .order("nome", { ascending: true });
    if (error) throw error;
    const plantaMap = new Map((plantas || []).map((p: any) => [p.id, p.nome]));
    return (data || []).map((a: any) => ({ ...a, plantaNome: plantaMap.get(a.planta_id) || "" }));
  },

  // --- PLANOS (queries) ---
  "planos.list": async (filters: any = {}) => {
    let q = supabase.from("planos_acao").select("*").order("prazo", { ascending: true, nullsFirst: false });
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.prioridade) q = q.eq("prioridade", filters.prioridade);
    if (filters?.responsavelEmail) q = q.eq("responsavel_email", filters.responsavelEmail);
    const { data: planos, error } = await q;
    if (error) throw error;
    const planoIds = (planos || []).map((p: any) => p.id);
    let vinculos: any[] = [];
    let desviosMap = new Map<number, any>();
    if (planoIds.length > 0) {
      const { data: vincData } = await supabase.from("plano_desvios" as any).select("plano_id, desvio_id").in("plano_id", planoIds);
      vinculos = vincData || [];
      const desvioIds = Array.from(new Set(vinculos.map((v: any) => v.desvio_id)));
      if (desvioIds.length > 0) {
        const { data: desviosData } = await supabase.from("desvios").select("id, descricao, obra_id, origem, severidade, status, deleted_at").in("id", desvioIds);
        (desviosData || []).forEach((d: any) => desviosMap.set(d.id, d));
      }
    }
    const vincByPlano = new Map<number, any[]>();
    vinculos.forEach((v: any) => {
      const arr = vincByPlano.get(v.plano_id) || [];
      const d = desviosMap.get(v.desvio_id);
      if (d) arr.push({ id: d.id, descricao: d.descricao, obraId: d.obra_id, origem: d.origem, severidade: d.severidade, status: d.status });
      vincByPlano.set(v.plano_id, arr);
    });
    let result = (planos || []).map((p: any) => ({
      ...mapPlanoFromDb(p),
      desvios: vincByPlano.get(p.id) || [],
    }));
    if (filters?.obraId) result = result.filter(p => p.obraId === filters.obraId || p.desvios.some((d: any) => d.obraId === filters.obraId));
    if (filters?.vertical) result = result.filter(p => p.vertical === filters.vertical || p.desvios.some((d: any) => d.origem === filters.vertical));
    if (filters?.tipo) result = result.filter(p => p.tipo === filters.tipo);
    if (filters?.atrasados) result = result.filter(p => p.status !== "concluido" && p.prazo && p.prazo < Date.now());
    return result;
  },
  "planos.getById": async ({ id }: { id: number }) => {
    const { data: plano, error } = await supabase.from("planos_acao").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!plano) return null;
    const { data: vinculos } = await supabase.from("plano_desvios" as any).select("desvio_id").eq("plano_id", id);
    const desvioIds = (vinculos || []).map((v: any) => v.desvio_id);
    let desvios: any[] = [];
    if (desvioIds.length > 0) {
      const { data: dData } = await supabase.from("desvios").select("*").in("id", desvioIds);
      desvios = (dData || []).map(mapDesvioFromDb);
    }
    let categoria: any = null;
    if ((plano as any).categoria_id) {
      const { data: c } = await supabase.from("plano_categorias" as any).select("id, nome").eq("id", (plano as any).categoria_id).maybeSingle();
      categoria = c || null;
    }
    let obra: any = null;
    if ((plano as any).obra_id) {
      const { data: o } = await supabase.from("obras").select("id, codigo, nome").eq("id", (plano as any).obra_id).maybeSingle();
      obra = o || null;
    }
    return { ...mapPlanoFromDb(plano), desvios, categoria, obra };
  },
  // --- PLANO CATEGORIAS ---
  "planoCategorias.list": async () => {
    const { data, error } = await supabase.from("plano_categorias" as any).select("*").order("ordem").order("nome");
    if (error) throw error;
    return data || [];
  },

  // --- OCORRENCIAS (queries) ---
  "ocorrencias.list": async (filters: any = {}) => {
    let q = (supabase.from("ocorrencias" as any) as any).select("*").order("data_ocorrencia", { ascending: false });
    if (filters?.obraId) q = q.eq("obra_id", filters.obraId);
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.classificacao) q = q.eq("classificacao", filters.classificacao);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapOcorrenciaFromDb);
  },
  "ocorrencias.getById": async ({ id }: { id: number }) => {
    const { data, error } = await (supabase.from("ocorrencias" as any) as any).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [{ data: comissao }, { data: testemunhas }, { data: cronologia }, { data: causas }, { data: porques }, { data: fotos }, { data: documentos }, { data: planos }] = await Promise.all([
      (supabase.from("ocorrencia_comissao" as any) as any).select("*").eq("ocorrencia_id", id).order("created_at"),
      (supabase.from("ocorrencia_testemunhas" as any) as any).select("*").eq("ocorrencia_id", id).order("created_at"),
      (supabase.from("ocorrencia_cronologia" as any) as any).select("*").eq("ocorrencia_id", id).order("ordem"),
      (supabase.from("ocorrencia_causas" as any) as any).select("*").eq("ocorrencia_id", id).order("created_at"),
      (supabase.from("ocorrencia_porques" as any) as any).select("*").eq("ocorrencia_id", id).order("nivel").order("ordem"),
      (supabase.from("ocorrencia_fotos" as any) as any).select("*").eq("ocorrencia_id", id).order("created_at"),
      (supabase.from("ocorrencia_documentos" as any) as any).select("*").eq("ocorrencia_id", id).order("created_at"),
      (supabase.from("planos_acao" as any) as any).select("*").eq("ocorrencia_id", id).order("created_at"),
    ]);
    return {
      ...mapOcorrenciaFromDb(data),
      comissao: comissao || [],
      testemunhas: testemunhas || [],
      cronologia: cronologia || [],
      causas: causas || [],
      porques: porques || [],
      fotos: (fotos || []).map((f: any) => ({ ...f, fileKey: f.file_key })),
      documentos: (documentos || []).map((d: any) => ({ ...d, fileKey: d.file_key })),
      planosAcao: (planos || []).map(mapPlanoFromDb),
    };
  },
};

const mutationResolvers: Record<string, Resolver> = {
  // --- OBRAS ---
  "obras.create": async (input: any) => {
    const { data, error } = await supabase.from("obras").insert({
      codigo: input.codigo,
      nome: input.nome,
      cliente: input.cliente ?? null,
      endereco: input.endereco ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "obras.update": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    if ("codigo" in rest) patch.codigo = rest.codigo;
    if ("nome" in rest) patch.nome = rest.nome;
    if ("cliente" in rest) patch.cliente = rest.cliente ?? null;
    if ("endereco" in rest) patch.endereco = rest.endereco ?? null;
    if ("status" in rest) patch.status = rest.status;
    if ("cobertura" in rest) patch.cobertura = rest.cobertura;
    if ("cobertura_qualidade" in rest) patch.cobertura_qualidade = rest.cobertura_qualidade;
    if ("cobertura_checklist" in rest) patch.cobertura_checklist = rest.cobertura_checklist;
    if ("cobertura_qsms" in rest) patch.cobertura_qsms = rest.cobertura_qsms;
    const { data, error } = await supabase.from("obras").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  // --- FORNECEDORES ---
  "fornecedores.create": async (input: any) => {
    const { data, error } = await supabase.from("fornecedores").insert({
      nome: input.nome,
      disciplina: input.disciplina ?? null,
      contato: input.contato ?? null,
      telefone: input.telefone ?? null,
      email: input.email ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "fornecedores.update": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    ["nome", "disciplina", "contato", "telefone", "email"].forEach(k => {
      if (k in rest) patch[k] = (rest as any)[k] ?? null;
    });
    const { data, error } = await supabase.from("fornecedores").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  // --- DESVIOS ---
  "desvios.create": async (input: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const insertObj: any = {
      obra_id: input.obraId,
      disciplina: input.disciplina ?? null,
      grupo_id: input.grupoId ?? null,
      fornecedor_id: input.fornecedorId ?? null,
      fornecedor_nome: input.fornecedorNome ?? null,
      descricao: input.descricao,
      localizacao: input.localizacao ?? null,
      severidade: input.severidade,
      origem: input.origem ?? "qualidade",
      tag_critico: input.tagCritico ?? 0,
      tag_seguranca_trabalho: input.tagSegurancaTrabalho ?? 0,
      tag_solicitado_cliente: input.tagSolicitadoCliente ?? 0,
      tag_solicitado_gerenciadora: input.tagSolicitadoGerenciadora ?? 0,
      tag_solicitado_arquitetura: input.tagSolicitadoArquitetura ?? 0,
      data_identificacao: input.dataIdentificacao,
      prazo_sugerido: input.prazoSugerido ?? null,
      planta_id: input.plantaId ?? null,
      pin_x: input.pinX ?? null,
      pin_y: input.pinY ?? null,
      created_by_id: user?.id ?? null,
      created_by_name: user?.user_metadata?.name || user?.email || null,
    };
    const { data, error } = await supabase.from("desvios").insert(insertObj).select().single();
    if (error) throw error;
    // historico de criação — fire-and-forget para não atrasar a UX
    supabase.from("historico").insert({
      desvio_id: data.id, tipo: "criacao", descricao: "Desvio criado",
      user_id: user?.id ?? null, user_name: user?.email ?? null,
    }).then(() => {});
    return mapDesvioFromDb(data);
  },
  "desvios.update": async (input: any) => {
    const { id, ...rest } = input;
    // Bloqueia edição de desvio excluído (soft delete)
    {
      const { data: del } = await supabase
        .from("desvios")
        .select("deleted_at")
        .eq("id", id)
        .maybeSingle();
      if ((del as any)?.deleted_at) {
        throw new Error("Desvio excluído — restaure antes de editar.");
      }
    }
    // Trava: não permite fechar enquanto aprovações exigidas estiverem pendentes
    if (rest.status === "fechado") {
      const { data: cur } = await supabase
        .from("desvios")
        .select("tag_solicitado_gerenciadora, tag_solicitado_arquitetura")
        .eq("id", id)
        .maybeSingle();
      const needGer = (cur?.tag_solicitado_gerenciadora ?? 0) === 1;
      const needArq = (cur?.tag_solicitado_arquitetura ?? 0) === 1;
      if (needGer || needArq) {
        const { data: aprov } = await supabase
          .from("desvio_aprovacoes")
          .select("tipo, decisao")
          .eq("desvio_id", id);
        const okGer = (aprov || []).some((a: any) => a.tipo === "gerenciadora" && a.decisao === "aprovado");
        const okArq = (aprov || []).some((a: any) => a.tipo === "arquitetura" && a.decisao === "aprovado");
        if (needGer && !okGer) throw new Error("Aprovação da Gerenciadora pendente — não é possível fechar este desvio.");
        if (needArq && !okArq) throw new Error("Aprovação da Arquitetura Externa pendente — não é possível fechar este desvio.");
      }
    }
    const patch: any = {};
    const map: Record<string, string> = {
      disciplina: "disciplina", grupoId: "grupo_id",
      fornecedorId: "fornecedor_id", fornecedorNome: "fornecedor_nome",
      descricao: "descricao", localizacao: "localizacao",
      severidade: "severidade", origem: "origem", status: "status",
      tagCritico: "tag_critico", tagSegurancaTrabalho: "tag_seguranca_trabalho",
      tagSolicitadoCliente: "tag_solicitado_cliente",
      tagSolicitadoGerenciadora: "tag_solicitado_gerenciadora",
      tagSolicitadoArquitetura: "tag_solicitado_arquitetura",
      prazoSugerido: "prazo_sugerido", dataFechamento: "data_fechamento",
      plantaId: "planta_id", pinX: "pin_x", pinY: "pin_y",
    };
    Object.entries(rest).forEach(([k, v]) => {
      if (k in map) patch[map[k]] = v ?? null;
    });
    if (rest.status === "fechado" && !patch.data_fechamento) patch.data_fechamento = Date.now();
    const { data, error } = await supabase.from("desvios").update(patch).eq("id", id).select().single();
    if (error) throw error;
    // historico de alteração
    const { data: { user } } = await supabase.auth.getUser();
    if (rest.status) {
      await supabase.from("historico").insert({
        desvio_id: id, tipo: "status",
        descricao: `Status alterado para ${rest.status}`,
        user_id: user?.id ?? null, user_name: user?.email ?? null,
      });
    } else {
      await supabase.from("historico").insert({
        desvio_id: id, tipo: "edicao", descricao: "Desvio editado",
        user_id: user?.id ?? null, user_name: user?.email ?? null,
      });
    }
    return mapDesvioFromDb(data);
  },
  "desvios.delete": async ({ id }: { id: number }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Apenas administradores podem excluir desvios");
    // Soft delete — preserva fotos, aprovações, histórico e planos para auditoria.
    const { data: profile } = await supabase.from("profiles").select("name, email").eq("id", user.id).maybeSingle();
    const nome = (profile as any)?.name || (profile as any)?.email || user.email || null;
    const { error } = await supabase
      .from("desvios")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by_id: user.id,
        deleted_by_name: nome,
      } as any)
      .eq("id", id);
    if (!error) {
      await supabase.from("historico").insert({
        desvio_id: id, tipo: "status",
        descricao: "Desvio excluído (soft delete)",
        user_id: user.id, user_name: nome,
      });
    }
    if (error) throw error;
    return { id };
  },

  "desvios.restore": async ({ id }: { id: number }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Apenas administradores podem restaurar desvios");
    const { data: profile } = await supabase.from("profiles").select("name, email").eq("id", user.id).maybeSingle();
    const nome = (profile as any)?.name || (profile as any)?.email || user.email || null;
    const { error } = await supabase
      .from("desvios")
      .update({ deleted_at: null, deleted_by_id: null, deleted_by_name: null } as any)
      .eq("id", id);
    if (error) throw error;
    await supabase.from("historico").insert({
      desvio_id: id, tipo: "status",
      descricao: "Desvio restaurado",
      user_id: user.id, user_name: nome,
    });
    return { id };
  },

  // --- PLANOS ---
  "planos.create": async (input: any) => {
    const tipo = input.tipo === "preventivo" ? "preventivo" : "corretivo";
    const desvioIds: number[] = Array.isArray(input.desvioIds) && input.desvioIds.length > 0
      ? input.desvioIds
      : (input.desvioId ? [input.desvioId] : []);
    if (tipo === "corretivo" && desvioIds.length === 0) {
      throw new Error("Vincule ao menos um desvio");
    }
    if (tipo === "preventivo") {
      if (!input.vertical) throw new Error("Selecione a vertical");
      if (!input.obraId) throw new Error("Selecione a obra");
      if (!input.categoriaId) throw new Error("Selecione a categoria");
    }
    const insertObj: any = {
      desvio_id: tipo === "corretivo" ? desvioIds[0] : null,
      tipo,
      vertical: input.vertical ?? null,
      obra_id: input.obraId ?? null,
      categoria_id: input.categoriaId ?? null,
      acao: input.acao,
      responsavel: input.responsavel,
      responsavel_tipo: input.responsavelTipo ?? "membro",
      responsavel_id: input.responsavelId ?? null,
      responsavel_email: input.responsavelEmail ?? null,
      prioridade: input.prioridade ?? "normal",
      prazo: input.prazo,
      observacoes: input.observacoes ?? null,
    };
    const { data, error } = await supabase.from("planos_acao").insert(insertObj).select().single();
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    if (tipo === "corretivo" && desvioIds.length > 0) {
      const vincPayload = desvioIds.map(did => ({ plano_id: data.id, desvio_id: did }));
      await supabase.from("plano_desvios" as any).insert(vincPayload);
      const histPayload = desvioIds.map(did => ({
        desvio_id: did, tipo: "plano_acao" as const,
        descricao: `Plano de ação criado: ${input.acao}`,
        user_id: user?.id ?? null, user_name: user?.email ?? null,
      }));
      await supabase.from("historico").insert(histPayload);
    }
    return mapPlanoFromDb(data);
  },
  "planos.update": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    ["acao", "responsavel", "prioridade", "status", "observacoes"].forEach(k => {
      if (k in rest) patch[k] = (rest as any)[k];
    });
    if ("prazo" in rest) patch.prazo = rest.prazo;
    const { data, error } = await supabase.from("planos_acao").update(patch).eq("id", id).select().single();
    if (error) throw error;
    // Atualiza vínculos se vieram
    if (Array.isArray(rest.desvioIds)) {
      await supabase.from("plano_desvios" as any).delete().eq("plano_id", id);
      if (rest.desvioIds.length > 0) {
        await supabase.from("plano_desvios" as any).insert(rest.desvioIds.map((did: number) => ({ plano_id: id, desvio_id: did })));
      }
    }
    return mapPlanoFromDb(data);
  },
  "planos.updateStatus": async (input: { id: number; status: string }) => {
    const { data, error } = await supabase.from("planos_acao").update({ status: input.status as any }).eq("id", input.id).select().single();
    if (error) throw error;
    return mapPlanoFromDb(data);
  },
  "planos.delete": async ({ id }: { id: number }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) throw new Error("Apenas administradores podem excluir planos");
    await supabase.from("plano_desvios" as any).delete().eq("plano_id", id);
    const { error } = await supabase.from("planos_acao").delete().eq("id", id);
    if (error) throw error;
    return { id };
  },
  "verificacoes.delete": async ({ id }: { id: number }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) throw new Error("Apenas administradores podem excluir verificações");
    await supabase.from("verificacao_resposta_fotos" as any).delete().eq("verificacao_id", id);
    await supabase.from("verificacao_respostas").delete().eq("verificacao_id", id);
    const { error } = await supabase.from("verificacoes").delete().eq("id", id);
    if (error) throw error;
    return { id };
  },
  "checklistEntregas.delete": async ({ id }: { id: number }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) throw new Error("Apenas administradores podem excluir checklists");
    const { data: itens } = await supabase.from("checklist_entrega_itens" as any).select("id").eq("entrega_id", id);
    const itemIds = (itens || []).map((i: any) => i.id);
    if (itemIds.length) {
      await supabase.from("checklist_entrega_fotos" as any).delete().in("item_id", itemIds);
    }
    await supabase.from("checklist_entrega_itens" as any).delete().eq("entrega_id", id);
    const { error } = await supabase.from("checklist_entregas" as any).delete().eq("id", id);
    if (error) throw error;
    return { id };
  },



  // --- HISTORICO ---
  "historico.addComment": async (input: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("historico").insert({
      desvio_id: input.desvioId, tipo: "comentario",
      descricao: input.texto,
      user_id: user?.id ?? null,
      user_name: user?.user_metadata?.name || user?.email || null,
    }).select().single();
    if (error) throw error;
    return data;
  },

  // --- FOTOS ---
  "fotos.upload": async (input: any) => {
    const bin = Uint8Array.from(atob(input.fileBase64), c => c.charCodeAt(0));
    const ext = input.fileName?.split(".").pop() || "jpg";
    const key = `desvio-${input.desvioId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("evidencias").upload(key, bin, {
      contentType: input.contentType || "image/jpeg",
      upsert: false,
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("evidencias").getPublicUrl(key);
    const { data, error } = await supabase.from("fotos_evidencia").insert({
      desvio_id: input.desvioId,
      tipo: input.tipo ?? "abertura",
      file_key: key,
      url: pub.publicUrl,
      descricao: input.descricao ?? null,
    }).select().single();
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("historico").insert({
      desvio_id: input.desvioId, tipo: "foto",
      descricao: `Foto de ${input.tipo ?? "abertura"} adicionada`,
      user_id: user?.id ?? null, user_name: user?.email ?? null,
    });
    // --- Automação de status com base na 1ª foto ---
    let statusChange: { from: string; to: string } | null = null;
    try {
      const tipo = input.tipo ?? "abertura";
      const { count } = await supabase
        .from("fotos_evidencia")
        .select("id", { count: "exact", head: true })
        .eq("desvio_id", input.desvioId)
        .eq("tipo", tipo);
      const isFirst = (count ?? 0) === 1; // já contém a recém-inserida
      if (isFirst) {
        const { data: desvio } = await supabase
          .from("desvios")
          .select("status, tag_solicitado_gerenciadora, tag_solicitado_arquitetura")
          .eq("id", input.desvioId)
          .maybeSingle();
        if (desvio) {
          let novo: "em_andamento" | "aguardando_aceite" | null = null;
          if (tipo === "abertura" && desvio.status === "aberto") {
            novo = "em_andamento";
          } else if (tipo === "fechamento" && desvio.status === "em_andamento") {
            const needGer = (desvio.tag_solicitado_gerenciadora ?? 0) === 1;
            const needArq = (desvio.tag_solicitado_arquitetura ?? 0) === 1;
            let aprovOk = true;
            if (needGer || needArq) {
              const { data: aprov } = await supabase
                .from("desvio_aprovacoes")
                .select("tipo, decisao")
                .eq("desvio_id", input.desvioId);
              const okGer = (aprov || []).some((a: any) => a.tipo === "gerenciadora" && a.decisao === "aprovado");
              const okArq = (aprov || []).some((a: any) => a.tipo === "arquitetura" && a.decisao === "aprovado");
              aprovOk = (!needGer || okGer) && (!needArq || okArq);
            }
            if (aprovOk) novo = "aguardando_aceite";
          }
          if (novo) {
            const { error: upErr2 } = await supabase
              .from("desvios")
              .update({ status: novo })
              .eq("id", input.desvioId);
            if (!upErr2) {
              statusChange = { from: desvio.status, to: novo };
              await supabase.from("historico").insert({
                desvio_id: input.desvioId,
                tipo: "status",
                de: desvio.status,
                para: novo,
                descricao: `Status alterado automaticamente para ${novo} após 1ª foto de ${tipo}`,
                user_id: user?.id ?? null,
                user_name: user?.email ?? null,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("[fotos.upload] auto-status falhou:", e);
    }
    return { ...data, fileKey: data.file_key, statusChange };
  },

  "fotos.delete": async (input: any) => {
    // Buscar foto para obter file_key e desvio_id
    const { data: foto, error: fErr } = await supabase
      .from("fotos_evidencia").select("*").eq("id", input.id).single();
    if (fErr) throw fErr;
    // Remover do storage (best-effort)
    if (foto?.file_key) {
      await supabase.storage.from("evidencias").remove([foto.file_key]);
    }
    const { error } = await supabase.from("fotos_evidencia").delete().eq("id", input.id);
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("historico").insert({
      desvio_id: foto.desvio_id, tipo: "foto",
      descricao: `Foto de ${foto.tipo ?? "abertura"} removida`,
      user_id: user?.id ?? null, user_name: user?.email ?? null,
    });
    return { ok: true };
  },

  // --- NOTIFICACOES ---
  "notificacoes.markAsRead": async (input: any) => {
    const { error } = await supabase.from("notificacoes").update({ lida: 1 }).eq("id", input.id);
    if (error) throw error;
    return { ok: true };
  },

  // --- MEMBROS ---
  "membros.create": async (input: any) => {
    const { data, error } = await supabase.from("membros_equipe").insert({
      nome: input.nome,
      email: input.email ?? null,
      telefone: input.telefone ?? null,
      cargo: input.cargo,
      obra_ids: input.obraIds ?? null,
    }).select().single();
    if (error) throw error;
    return mapMembroFromDb(data);
  },
  "membros.update": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    if ("nome" in rest) patch.nome = rest.nome;
    if ("email" in rest) patch.email = rest.email ?? null;
    if ("telefone" in rest) patch.telefone = rest.telefone ?? null;
    if ("cargo" in rest) patch.cargo = rest.cargo;
    if ("obraIds" in rest) patch.obra_ids = rest.obraIds ?? null;
    if ("ativo" in rest) patch.ativo = rest.ativo;
    const { data, error } = await supabase.from("membros_equipe").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return mapMembroFromDb(data);
  },

  // --- PLANTAS ---
  "plantas.upload": async (input: any) => {
    const bin = Uint8Array.from(atob(input.fileBase64), c => c.charCodeAt(0));
    const ext = input.fileName?.split(".").pop() || "jpg";
    const key = `obra-${input.obraId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("plantas").upload(key, bin, {
      contentType: input.contentType || "image/jpeg",
      upsert: false,
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("plantas").getPublicUrl(key);
    const insertObj: any = {
      obra_id: input.obraId,
      nome: input.nome,
      file_key: key,
      url: pub.publicUrl,
      ordem: input.ordem ?? 0,
    };
    if (input.andarId) insertObj.andar_id = input.andarId;
    const { data, error } = await (supabase.from("plantas") as any).insert(insertObj).select().single();
    if (error) throw error;
    // Dispara extração de ambientes em background (sem bloquear)
    supabase.functions.invoke("extrair-ambientes-planta", {
      body: { plantaId: data.id },
    }).catch((e) => console.warn("Falha ao iniciar extração de ambientes:", e));
    return { ...data, fileKey: data.file_key, obraId: data.obra_id, andarId: data.andar_id ?? null };
  },
  "plantas.update": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    if ("nome" in rest) patch.nome = rest.nome;
    if ("ordem" in rest) patch.ordem = rest.ordem;
    if ("andarId" in rest) patch.andar_id = rest.andarId ?? null;
    const { data, error } = await (supabase.from("plantas") as any).update(patch).eq("id", id).select().single();
    if (error) throw error;
    return { ...data, fileKey: data.file_key, obraId: data.obra_id, andarId: data.andar_id ?? null };
  },
  "plantas.mover": async (input: { id: number; andarId: number | null }) => {
    const { error } = await (supabase.from("plantas") as any).update({ andar_id: input.andarId }).eq("id", input.id);
    if (error) throw error;
    return { ok: true };
  },
  "plantas.delete": async (input: any) => {
    const { data: planta } = await supabase.from("plantas").select("file_key").eq("id", input.id).maybeSingle();
    if (planta?.file_key) {
      await supabase.storage.from("plantas").remove([planta.file_key]);
    }
    const { error } = await supabase.from("plantas").delete().eq("id", input.id);
    if (error) throw error;
    return { ok: true };
  },

  // --- PLANTA AMBIENTES ---
  "plantaAmbientes.reextract": async ({ plantaId }: { plantaId: number }) => {
    const { data, error } = await supabase.functions.invoke("extrair-ambientes-planta", {
      body: { plantaId },
    });
    if (error) throw error;
    return data;
  },
  "plantaAmbientes.create": async (input: any) => {
    const { data, error } = await supabase.from("planta_ambientes").insert({
      planta_id: input.plantaId,
      nome: input.nome,
      pavimento: input.pavimento || null,
      numero: input.numero || null,
      origem: input.origem || "manual",
      revisado: 1,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "plantaAmbientes.update": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    if ("nome" in rest) patch.nome = rest.nome;
    if ("pavimento" in rest) patch.pavimento = rest.pavimento || null;
    if ("numero" in rest) patch.numero = rest.numero || null;
    if ("revisado" in rest) patch.revisado = rest.revisado ? 1 : 0;
    if ("ativo" in rest) patch.ativo = rest.ativo ? 1 : 0;
    const { data, error } = await supabase.from("planta_ambientes").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "plantaAmbientes.delete": async ({ id }: { id: number }) => {
    const { error } = await supabase.from("planta_ambientes").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  },
  "plantaAmbientes.markAllReviewed": async ({ plantaId }: { plantaId: number }) => {
    const { error } = await supabase
      .from("planta_ambientes")
      .update({ revisado: 1 })
      .eq("planta_id", plantaId);
    if (error) throw error;
    await supabase.from("plantas").update({ extracao_status: "revisado" }).eq("id", plantaId);
    return { ok: true };
  },

  // --- VERIFICACOES ---
  "verificacoes.create": async (input: any) => {
    const respostasArr = input.respostas || [];
    const categoria = input.categoria || "qualidade";
    const { scoreGeral, scoreQualidade, scoreCronograma, scoreCondicao, statusFromScore } =
      await computeVerificacaoScores(respostasArr, categoria);

    const insertObj: any = {
      obra_id: input.obraId,
      edificio_id: input.edificioId ?? null,
      andar_id: input.andarId ?? null,
      avaliador: input.avaliador,
      data_vistoria: input.dataVistoria,
      go: input.go ?? null,
      gc: input.gc ?? null,
      nucleo: input.nucleo ?? null,
      diretoria: input.diretoria ?? null,
      observacoes: input.observacoes ?? null,
      categoria,
      score_geral: scoreGeral,
      score_qualidade: scoreQualidade,
      score_cronograma: scoreCronograma,
      score_condicao: scoreCondicao,
      status_geral: statusFromScore(scoreGeral),
      status_qualidade: statusFromScore(scoreQualidade),
      status_cronograma: statusFromScore(scoreCronograma),
      status_condicao: statusFromScore(scoreCondicao),
    };


    const { data: verif, error } = await supabase.from("verificacoes").insert(insertObj).select().single();
    if (error) throw error;

    if (respostasArr.length > 0) {
      const rows = respostasArr.map((r: any) => ({
        verificacao_id: verif.id,
        item_id: r.itemId,
        resposta: r.resposta,
        observacao: r.observacao ?? null,
      }));
      const { error: rErr } = await supabase.from("verificacao_respostas").insert(rows);
      if (rErr) throw rErr;

      // Persistir fotos por item (vistoria de recebimento)
      const fotoRows: any[] = [];
      respostasArr.forEach((r: any) => {
        (r.fotos || []).forEach((f: any) => {
          if (!f?.url || !f?.fileKey) return;
          fotoRows.push({
            verificacao_id: verif.id,
            item_id: r.itemId,
            url: f.url,
            file_key: f.fileKey,
            descricao: f.descricao ?? null,
          });
        });
      });
      if (fotoRows.length > 0) {
        await supabase.from("verificacao_resposta_fotos" as any).insert(fotoRows);
      }
    }

    return {
      ...mapVerificacaoFromDb(verif),
      scores: {
        scoreGeral,
        scoreQualidade,
        scoreCronograma,
        scoreCondicao,
        statusGeral: statusFromScore(scoreGeral),
      },
    };
  },

  "verificacoes.update": async (input: any) => {
    const { id } = input;
    const respostasArr = input.respostas || [];
    // Buscar categoria existente para usar faixas certas
    const { data: existing } = await supabase.from("verificacoes").select("categoria").eq("id", id).maybeSingle();
    const categoria = (existing as any)?.categoria || "qualidade";
    const { scoreGeral, scoreQualidade, scoreCronograma, scoreCondicao, statusFromScore } =
      await computeVerificacaoScores(respostasArr, categoria);

    const patch: any = {
      score_geral: scoreGeral,
      score_qualidade: scoreQualidade,
      score_cronograma: scoreCronograma,
      score_condicao: scoreCondicao,
      status_geral: statusFromScore(scoreGeral),
      status_qualidade: statusFromScore(scoreQualidade),
      status_cronograma: statusFromScore(scoreCronograma),
      status_condicao: statusFromScore(scoreCondicao),
    };
    ["obraId:obra_id", "avaliador:avaliador", "dataVistoria:data_vistoria",
     "go:go", "gc:gc", "nucleo:nucleo", "diretoria:diretoria", "observacoes:observacoes"
    ].forEach(map => {
      const [k, col] = map.split(":");
      if (k in input && input[k] !== undefined) patch[col] = input[k];
    });

    const { data: verif, error } = await supabase.from("verificacoes").update(patch).eq("id", id).select().single();
    if (error) throw error;

    // Substituir respostas
    await supabase.from("verificacao_respostas").delete().eq("verificacao_id", id);
    await supabase.from("verificacao_resposta_fotos" as any).delete().eq("verificacao_id", id);
    if (respostasArr.length > 0) {
      const rows = respostasArr.map((r: any) => ({
        verificacao_id: id,
        item_id: r.itemId,
        resposta: r.resposta,
        observacao: r.observacao ?? null,
      }));
      const { error: rErr } = await supabase.from("verificacao_respostas").insert(rows);
      if (rErr) throw rErr;

      const fotoRows: any[] = [];
      respostasArr.forEach((r: any) => {
        (r.fotos || []).forEach((f: any) => {
          if (!f?.url || !f?.fileKey) return;
          fotoRows.push({
            verificacao_id: id,
            item_id: r.itemId,
            url: f.url,
            file_key: f.fileKey,
            descricao: f.descricao ?? null,
          });
        });
      });
      if (fotoRows.length > 0) {
        await supabase.from("verificacao_resposta_fotos" as any).insert(fotoRows);
      }
    }

    return {
      ...mapVerificacaoFromDb(verif),
      scores: { scoreGeral, scoreQualidade, scoreCronograma, scoreCondicao, statusGeral: statusFromScore(scoreGeral) },
    };
  },

  // --- CHECKLIST ADMIN ---
  "checklist.updateSecao": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    ["peso", "reincidencia", "titulo", "ordem", "ativo"].forEach(k => {
      if (k in rest) patch[k] = (rest as any)[k];
    });
    const { data, error } = await supabase.from("checklist_secoes").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "checklist.updateItem": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    ["codigo", "descricao", "ordem", "ativo"].forEach(k => {
      if (k in rest) patch[k] = (rest as any)[k];
    });
    const { data, error } = await supabase.from("checklist_itens").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  "checklist.createItem": async (input: any) => {
    const { data, error } = await supabase.from("checklist_itens").insert({
      secao_id: input.secaoId,
      codigo: input.codigo,
      descricao: input.descricao,
      ordem: input.ordem ?? 0,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "checklist.createSecao": async (input: any) => {
    const categoria = input.categoria || "qualidade";
    // próximo numero/ordem dentro da categoria
    const { data: existing } = await supabase
      .from("checklist_secoes")
      .select("numero, ordem")
      .eq("categoria", categoria);
    const maxNumero = (existing || []).reduce((m: number, s: any) => Math.max(m, s.numero || 0), 0);
    const maxOrdem = (existing || []).reduce((m: number, s: any) => Math.max(m, s.ordem || 0), 0);
    const { data, error } = await supabase.from("checklist_secoes").insert({
      titulo: input.titulo,
      peso: input.peso ?? 10,
      reincidencia: input.reincidencia ?? 0,
      numero: input.numero ?? maxNumero + 1,
      ordem: input.ordem ?? maxOrdem + 1,
      categoria,
    }).select().single();
    if (error) throw error;
    return data;
  },

  // --- CONFIG FAIXAS ---
  "configFaixas.update": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    ["minimo", "maximo", "cor", "nome", "ordem"].forEach(k => {
      if (k in rest) patch[k] = (rest as any)[k];
    });
    const { data, error } = await supabase.from("config_faixas").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  // --- LLM (Assistente IA) ---
  "llm.ask": async (input: any) => {
    const { data, error } = await supabase.functions.invoke("assistente-ia", {
      body: { mode: "ask", question: input.question, obraId: input.obraId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data; // { answer: string }
  },

  // --- RELATORIO ---
  "relatorio.generate": async (input: any) => {
    const { data, error } = await supabase.functions.invoke("gerar-relatorio", {
      body: input,
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  // --- PLANO CATEGORIAS (admin) ---
  "planoCategorias.create": async (input: { nome: string; ordem?: number }) => {
    const { data, error } = await supabase.from("plano_categorias" as any).insert({
      nome: input.nome,
      ordem: input.ordem ?? 0,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "planoCategorias.update": async (input: { id: number; nome?: string; ordem?: number; ativo?: number }) => {
    const patch: any = {};
    if (input.nome !== undefined) patch.nome = input.nome;
    if (input.ordem !== undefined) patch.ordem = input.ordem;
    if (input.ativo !== undefined) patch.ativo = input.ativo;
    const { data, error } = await supabase.from("plano_categorias" as any).update(patch).eq("id", input.id).select().single();
    if (error) throw error;
    return data;
  },
  "planoCategorias.delete": async (input: { id: number }) => {
    const { error } = await supabase.from("plano_categorias" as any).delete().eq("id", input.id);
    if (error) throw error;
    return { ok: true };
  },

  // --- EDIFICIOS ---
  "edificios.create": async (input: { obraId: number; nome: string; codigo?: string; ordem?: number }) => {
    const { data, error } = await (supabase.from("edificios" as any) as any).insert({
      obra_id: input.obraId,
      nome: input.nome,
      codigo: input.codigo ?? null,
      ordem: input.ordem ?? 0,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "edificios.update": async (input: { id: number; nome?: string; codigo?: string | null; ordem?: number; ativo?: number }) => {
    const patch: any = {};
    if (input.nome !== undefined) patch.nome = input.nome;
    if (input.codigo !== undefined) patch.codigo = input.codigo;
    if (input.ordem !== undefined) patch.ordem = input.ordem;
    if (input.ativo !== undefined) patch.ativo = input.ativo;
    const { data, error } = await (supabase.from("edificios" as any) as any).update(patch).eq("id", input.id).select().single();
    if (error) throw error;
    return data;
  },
  "edificios.delete": async (input: { id: number }) => {
    const { error } = await (supabase.from("edificios" as any) as any).delete().eq("id", input.id);
    if (error) throw error;
    return { ok: true };
  },

  // --- ANDARES ---
  "andares.create": async (input: { edificioId: number; nome: string; numero?: number; ordem?: number }) => {
    const { data, error } = await (supabase.from("andares" as any) as any).insert({
      edificio_id: input.edificioId,
      nome: input.nome,
      numero: input.numero ?? 0,
      ordem: input.ordem ?? 0,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "andares.update": async (input: { id: number; nome?: string; numero?: number; ordem?: number; ativo?: number }) => {
    const patch: any = {};
    if (input.nome !== undefined) patch.nome = input.nome;
    if (input.numero !== undefined) patch.numero = input.numero;
    if (input.ordem !== undefined) patch.ordem = input.ordem;
    if (input.ativo !== undefined) patch.ativo = input.ativo;
    const { data, error } = await (supabase.from("andares" as any) as any).update(patch).eq("id", input.id).select().single();
    if (error) throw error;
    return data;
  },
  "andares.delete": async (input: { id: number }) => {
    const { error } = await (supabase.from("andares" as any) as any).delete().eq("id", input.id);
    if (error) throw error;
    return { ok: true };
  },

  // --- OCORRENCIAS (mutations) ---
  "ocorrencias.create": async (input: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const now = Date.now();
    const dataOcorrencia = input.dataOcorrencia ?? now;
    const insertObj: any = {
      obra_id: input.obraId,
      data_ocorrencia: dataOcorrencia,
      hora: input.hora ?? null,
      local_ocorrencia: input.local ?? null,
      endereco: input.endereco ?? null,
      cidade: input.cidade ?? null,
      uf: input.uf ?? null,
      empresa_principal: input.empresaPrincipal ?? null,
      cnpj_principal: input.cnpjPrincipal ?? null,
      empresa_subcontratada: input.empresaSubcontratada ?? null,
      cnpj_subcontratada: input.cnpjSubcontratada ?? null,
      acidentado_nome: input.acidentadoNome ?? null,
      acidentado_funcao: input.acidentadoFuncao ?? null,
      acidentado_idade: input.acidentadoIdade ?? null,
      classificacao: input.classificacao,
      descricao_preliminar: input.descricaoPreliminar,
      acao_imediata: input.acaoImediata ?? null,
      responsavel_preenchimento: input.responsavelPreenchimento ?? null,
      responsavel_obra: input.responsavelObra ?? null,
      cat_emitida: input.catEmitida ? 1 : 0,
      cat_numero: input.catNumero ?? null,
      atestado_dias: input.atestadoDias ?? null,
      awfor149_anexada: input.awfor149Anexada ? 1 : 0,
      status: input.status ?? "comunicado",
      prazo_comissao: dataOcorrencia + 24 * 60 * 60 * 1000,
      prazo_investigacao: dataOcorrencia + 7 * 24 * 60 * 60 * 1000,
      prazo_plano: dataOcorrencia + 15 * 24 * 60 * 60 * 1000,
      created_by_id: user?.id ?? null,
      created_by_name: input.createdByName ?? user?.email ?? null,
    };
    const { data, error } = await (supabase.from("ocorrencias" as any) as any).insert(insertObj).select().single();
    if (error) throw error;
    // Fotos iniciais (cena)
    if (Array.isArray(input.fotos) && input.fotos.length > 0) {
      const rows = input.fotos
        .filter((f: any) => f?.url && f?.fileKey)
        .map((f: any) => ({
          ocorrencia_id: (data as any).id,
          file_key: f.fileKey,
          url: f.url,
          descricao: f.descricao ?? null,
          etapa: f.etapa ?? "cena",
        }));
      if (rows.length > 0) await (supabase.from("ocorrencia_fotos" as any) as any).insert(rows);
    }
    return mapOcorrenciaFromDb(data);
  },
  "ocorrencias.update": async (input: any) => {
    const { id } = input;
    const patch: any = {};
    const mapKeys: Array<[string, string]> = [
      ["hora", "hora"], ["local", "local_ocorrencia"], ["endereco", "endereco"],
      ["cidade", "cidade"], ["uf", "uf"],
      ["empresaPrincipal", "empresa_principal"], ["cnpjPrincipal", "cnpj_principal"],
      ["empresaSubcontratada", "empresa_subcontratada"], ["cnpjSubcontratada", "cnpj_subcontratada"],
      ["acidentadoNome", "acidentado_nome"], ["acidentadoFuncao", "acidentado_funcao"], ["acidentadoIdade", "acidentado_idade"],
      ["classificacao", "classificacao"], ["descricaoPreliminar", "descricao_preliminar"], ["acaoImediata", "acao_imediata"],
      ["responsavelPreenchimento", "responsavel_preenchimento"], ["responsavelObra", "responsavel_obra"],
      ["catNumero", "cat_numero"], ["atestadoDias", "atestado_dias"],
      ["status", "status"], ["observacoes", "observacoes"],
      ["dataFechamento", "data_fechamento"],
    ];
    mapKeys.forEach(([k, col]) => { if (k in input) patch[col] = input[k] ?? null; });
    if ("catEmitida" in input) patch.cat_emitida = input.catEmitida ? 1 : 0;
    if ("awfor149Anexada" in input) patch.awfor149_anexada = input.awfor149Anexada ? 1 : 0;
    const { data, error } = await (supabase.from("ocorrencias" as any) as any).update(patch).eq("id", id).select().single();
    if (error) throw error;
    return mapOcorrenciaFromDb(data);
  },
  "ocorrencias.delete": async ({ id }: { id: number }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) throw new Error("Apenas administradores podem excluir ocorrências");
    const { error } = await (supabase.from("ocorrencias" as any) as any).delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  },

  "ocorrencias.addFoto": async (input: any) => {
    const { data, error } = await (supabase.from("ocorrencia_fotos" as any) as any).insert({
      ocorrencia_id: input.ocorrenciaId,
      file_key: input.fileKey,
      url: input.url,
      descricao: input.descricao ?? null,
      etapa: input.etapa ?? "cena",
    }).select().single();
    if (error) throw error;
    return data;
  },
  "ocorrencias.removeFoto": async ({ id }: { id: number }) => {
    const { data: foto } = await (supabase.from("ocorrencia_fotos" as any) as any).select("file_key").eq("id", id).maybeSingle();
    if ((foto as any)?.file_key) {
      await supabase.storage.from("evidencias").remove([(foto as any).file_key]);
    }
    const { error } = await (supabase.from("ocorrencia_fotos" as any) as any).delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  },
  "ocorrencias.addDocumento": async (input: any) => {
    const { data, error } = await (supabase.from("ocorrencia_documentos" as any) as any).insert({
      ocorrencia_id: input.ocorrenciaId,
      file_key: input.fileKey,
      url: input.url,
      tipo: input.tipo ?? "outro",
      descricao: input.descricao ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "ocorrencias.removeDocumento": async ({ id }: { id: number }) => {
    const { data: doc } = await (supabase.from("ocorrencia_documentos" as any) as any).select("file_key").eq("id", id).maybeSingle();
    if ((doc as any)?.file_key) {
      await supabase.storage.from("evidencias").remove([(doc as any).file_key]);
    }
    const { error } = await (supabase.from("ocorrencia_documentos" as any) as any).delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  },
  "ocorrencias.addComissao": async (input: any) => {
    const { data, error } = await (supabase.from("ocorrencia_comissao" as any) as any).insert({
      ocorrencia_id: input.ocorrenciaId,
      nome: input.nome,
      papel: input.papel ?? null,
      is_coordenador: input.isCoordenador ? 1 : 0,
      contato: input.contato ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "ocorrencias.removeComissao": async ({ id }: { id: number }) => {
    const { error } = await (supabase.from("ocorrencia_comissao" as any) as any).delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  },
  "ocorrencias.addTestemunha": async (input: any) => {
    const { data, error } = await (supabase.from("ocorrencia_testemunhas" as any) as any).insert({
      ocorrencia_id: input.ocorrenciaId,
      nome: input.nome,
      identidade: input.identidade ?? null,
      contato: input.contato ?? null,
      depoimento: input.depoimento ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "ocorrencias.removeTestemunha": async ({ id }: { id: number }) => {
    const { error } = await (supabase.from("ocorrencia_testemunhas" as any) as any).delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  },
  "ocorrencias.addCronologia": async (input: any) => {
    const { data, error } = await (supabase.from("ocorrencia_cronologia" as any) as any).insert({
      ocorrencia_id: input.ocorrenciaId,
      etapa: input.etapa,
      momento: input.momento ?? null,
      descricao: input.descricao,
      ordem: input.ordem ?? 0,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "ocorrencias.removeCronologia": async ({ id }: { id: number }) => {
    const { error } = await (supabase.from("ocorrencia_cronologia" as any) as any).delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  },
  "ocorrencias.addCausa": async (input: any) => {
    const { data, error } = await (supabase.from("ocorrencia_causas" as any) as any).insert({
      ocorrencia_id: input.ocorrenciaId,
      tipo: input.tipo,
      categoria: input.categoria ?? null,
      descricao: input.descricao,
    }).select().single();
    if (error) throw error;
    return data;
  },
  "ocorrencias.removeCausa": async ({ id }: { id: number }) => {
    const { error } = await (supabase.from("ocorrencia_causas" as any) as any).delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  },
};

// ---------- Helpers ----------

function mapDesvioFromDb(d: any) {
  return {
    ...d,
    obraId: d.obra_id,
    grupoId: d.grupo_id,
    fornecedorId: d.fornecedor_id,
    fornecedorNome: d.fornecedor_nome,
    tagCritico: d.tag_critico,
    tagSegurancaTrabalho: d.tag_seguranca_trabalho,
    tagSolicitadoCliente: d.tag_solicitado_cliente,
    tagSolicitadoGerenciadora: d.tag_solicitado_gerenciadora,
    tagSolicitadoArquitetura: d.tag_solicitado_arquitetura,
    dataIdentificacao: d.data_identificacao ? Number(d.data_identificacao) : null,
    prazoSugerido: d.prazo_sugerido ? Number(d.prazo_sugerido) : null,
    dataFechamento: d.data_fechamento ? Number(d.data_fechamento) : null,
    plantaId: d.planta_id,
    pinX: d.pin_x,
    pinY: d.pin_y,
    createdById: d.created_by_id,
    createdByName: d.created_by_name,
    deletedAt: d.deleted_at ? new Date(d.deleted_at).getTime() : null,
    deletedById: d.deleted_by_id ?? null,
    deletedByName: d.deleted_by_name ?? null,
  };
}

function mapPlanoFromDb(p: any) {
  return {
    ...p,
    desvioId: p.desvio_id,
    responsavelTipo: p.responsavel_tipo,
    responsavelId: p.responsavel_id,
    responsavelEmail: p.responsavel_email,
    obraId: p.obra_id,
    categoriaId: p.categoria_id,
    tipo: p.tipo ?? "corretivo",
    vertical: p.vertical ?? null,
    prazo: p.prazo ? Number(p.prazo) : null,
    notificadoEm: p.notificado_em ? Number(p.notificado_em) : null,
  };
}

function mapMembroFromDb(m: any) {
  return {
    ...m,
    obraIds: Array.isArray(m.obra_ids) ? m.obra_ids : (m.obra_ids ?? []),
  };
}

async function computeVerificacaoScores(respostasArr: any[], rootCategoria: string = "qualidade") {
  const [{ data: secoes }, { data: itens }, { data: faixas }] = await Promise.all([
    supabase.from("checklist_secoes").select("*").eq("ativo", 1),
    supabase.from("checklist_itens").select("*").eq("ativo", 1),
    supabase.from("config_faixas").select("*").eq("categoria", rootCategoria).order("ordem"),
  ]);
  const respMap = new Map<number, string>(respostasArr.map((r: any) => [r.itemId, r.resposta]));
  const scoreSecao = (secaoId: number) => {
    const its = (itens || []).filter((i: any) => i.secao_id === secaoId);
    const validos = its.filter((i: any) => respMap.get(i.id) && respMap.get(i.id) !== "NA");
    if (validos.length === 0) return null;
    const pontos = validos.reduce((acc: number, i: any) => {
      const r = respMap.get(i.id);
      if (r === "AT") return acc + 1;
      if (r === "NAT") return acc + 0.5;
      return acc;
    }, 0);
    return Math.round((pontos / validos.length) * 100);
  };
  const ponderado = (matcher?: (s: any) => boolean) => {
    const list = (secoes || []).filter((s: any) => !matcher || matcher(s));
    let totalPeso = 0;
    let acc = 0;
    list.forEach((s: any) => {
      const sc = scoreSecao(s.id);
      if (sc != null) {
        acc += sc * (s.peso || 0);
        totalPeso += (s.peso || 0);
      }
    });
    return totalPeso > 0 ? Math.round(acc / totalPeso) : null;
  };
  const norm = (s: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const titleHas = (kw: string) => (s: any) => norm(s.titulo).includes(kw);
  const statusFromScore = (sc: number | null) => {
    if (sc == null) return null;
    const f = (faixas || []).find((x: any) => sc >= x.minimo && sc <= x.maximo);
    return f?.nome || null;
  };
  return {
    scoreGeral: ponderado(),
    scoreQualidade: ponderado(titleHas("qualidade")),
    scoreCronograma: ponderado(titleHas("cronograma")),
    scoreCondicao: ponderado(titleHas("condic")),
    statusFromScore,
  };
}

function mapVerificacaoFromDb(v: any) {
  return {
    ...v,
    obraId: v.obra_id,
    dataVistoria: v.data_vistoria ? Number(v.data_vistoria) : null,
    scoreGeral: v.score_geral,
    scoreQualidade: v.score_qualidade,
    scoreCronograma: v.score_cronograma,
    scoreCondicao: v.score_condicao,
    statusGeral: v.status_geral,
    statusQualidade: v.status_qualidade,
    statusCronograma: v.status_cronograma,
    statusCondicao: v.status_condicao,
  };
}

function mapOcorrenciaFromDb(o: any) {
  return {
    ...o,
    obraId: o.obra_id,
    dataOcorrencia: o.data_ocorrencia ? Number(o.data_ocorrencia) : null,
    prazoComissao: o.prazo_comissao ? Number(o.prazo_comissao) : null,
    prazoInvestigacao: o.prazo_investigacao ? Number(o.prazo_investigacao) : null,
    prazoPlano: o.prazo_plano ? Number(o.prazo_plano) : null,
    dataFechamento: o.data_fechamento ? Number(o.data_fechamento) : null,
    catEmitida: o.cat_emitida === 1,
    awfor149Anexada: o.awfor149_anexada === 1,
    createdById: o.created_by_id,
    createdByName: o.created_by_name,
  };
}

// ---------- Proxy ----------

function makeProcedureProxy(path: string): any {
  return {
    useQuery: (input?: any, options?: UseQueryOptions<any>) => {
      const resolver = queryResolvers[path];
      const queryKey = [path, input ?? null];
      const persist = shouldPersistQuery(queryKey);
      return useQuery({
        queryKey,
        queryFn: async () => (resolver ? resolver(input ?? {}) : null),
        // Queries persistíveis usam o cache mesmo quando offline (em vez de
        // lançar erro). Mutations e queries não-persistíveis continuam padrão.
        networkMode: persist ? "offlineFirst" : "online",
        meta: persist ? { persist: true } : undefined,
        ...(options || {}),
      } as any);
    },
    useMutation: (options: any = {}) => {
      const qc = useQueryClient();
      const resolver = mutationResolvers[path];
      return useMutation({
        mutationFn: async (input: any) => {
          if (!resolver) {
            console.warn(`[trpc-adapter] mutation '${path}' não implementada`);
            return null;
          }
          return resolver(input);
        },
        onSuccess: (data, vars, ctx) => {
          // Invalida domínios afectados.
          const root = path.split(".")[0];
          qc.invalidateQueries({ predicate: (q) => {
            const key = q.queryKey?.[0];
            return typeof key === "string" && key.startsWith(`${root}.`);
          }});
          // Invalida sempre histórico/desvios quando se mexe em desvios/planos/fotos/historico.
          if (["desvios", "planos", "fotos", "historico"].includes(root)) {
            qc.invalidateQueries({ predicate: (q) => {
              const key = q.queryKey?.[0];
              return typeof key === "string" && (key.startsWith("desvios.") || key.startsWith("kpis."));
            }});
          }
          options.onSuccess?.(data, vars, ctx);
        },
        onError: (err: any, vars, ctx) => {
          if (options.onError) options.onError(err, vars, ctx);
          else toast.error(err?.message || `Erro em ${path}`);
        },
      });
    },
    invalidate: () => {
      // usado por utils.<router>.<proc>.invalidate()
      // Não dá para invalidar fora de hooks; devolvemos noop seguro.
      return;
    },
  };
}

const utilsProxy: any = new Proxy({}, {
  get(_t, router: string) {
    return new Proxy({}, {
      get(_t2, proc: string) {
        return {
          invalidate: () => {
            // Retornado como função noop — invalidações reais ocorrem
            // automaticamente no onSuccess das mutações via predicate.
          },
        };
      },
    });
  },
});

export const trpc: any = new Proxy({}, {
  get(_t, key: string) {
    if (key === "useUtils") return () => utilsProxy;
    if (key === "Provider") return ({ children }: any) => children;
    if (key === "createClient") return () => ({});
    // router proxy
    return new Proxy({}, {
      get(_t2, proc: string) {
        return makeProcedureProxy(`${key}.${proc}`);
      },
    });
  },
});
