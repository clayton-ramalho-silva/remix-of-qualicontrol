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
    const { data: desvios } = await supabase.from("desvios").select("obra_id, data_identificacao");
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
    const { data, error } = await supabase
      .from("grupos")
      .select("*")
      .eq("ativo", 1)
      .order("codigo");
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
    let q = supabase.from("desvios").select("*").order("data_identificacao", { ascending: false });
    if (filters?.obraId) q = q.eq("obra_id", filters.obraId);
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.severidade) q = q.eq("severidade", filters.severidade);
    if (filters?.origem) q = q.eq("origem", filters.origem);
    if (filters?.tagCritico) q = q.eq("tag_critico", 1);
    if (filters?.tagSegurancaTrabalho) q = q.eq("tag_seguranca_trabalho", 1);
    if (filters?.tagSolicitadoCliente) q = q.eq("tag_solicitado_cliente", 1);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapDesvioFromDb);
  },
  "desvios.getById": async ({ id }: { id: number }) => {
    const { data: desvio, error } = await supabase.from("desvios").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!desvio) return null;
    const [{ data: fotos }, { data: planos }, { data: historico }] = await Promise.all([
      supabase.from("fotos_evidencia").select("*").eq("desvio_id", id).order("created_at"),
      supabase.from("planos_acao").select("*").eq("desvio_id", id).order("created_at"),
      supabase.from("historico").select("*").eq("desvio_id", id).order("created_at", { ascending: false }),
    ]);
    return {
      ...mapDesvioFromDb(desvio),
      fotos: (fotos || []).map((f: any) => ({ ...f, fileKey: f.file_key })),
      planosAcao: (planos || []).map(mapPlanoFromDb),
      historico: (historico || []).map((h: any) => ({
        ...h,
        userId: h.user_id,
        userName: h.user_name,
        createdAt: new Date(h.created_at).getTime(),
      })),
    };
  },

  // --- PLANTAS ---
  "plantas.listByObra": async ({ obraId }: { obraId: number }) => {
    const { data, error } = await supabase.from("plantas").select("*").eq("obra_id", obraId).order("ordem");
    if (error) throw error;
    return (data || []).map((p: any) => ({ ...p, fileKey: p.file_key, obraId: p.obra_id }));
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
    const [{ data: respostas }, { data: secoes }, { data: itens }, { data: fotos }] = await Promise.all([
      supabase.from("verificacao_respostas").select("*").eq("verificacao_id", id),
      supabase.from("checklist_secoes").select("*").eq("ativo", 1).order("ordem"),
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
    let q = supabase.from("desvios").select("status, severidade, origem, tag_critico, tag_seguranca_trabalho, tag_solicitado_cliente, prazo_sugerido, data_fechamento, data_identificacao, obra_id, disciplina, grupo_id, fornecedor_nome");
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

    const porOrigem: Record<string, number> = { qualidade: 0, checklist: 0, qsms: 0 };
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
    let q = supabase.from("desvios").select("fornecedor_nome, status, severidade, data_identificacao, data_fechamento, obra_id");
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
    // historico de criação
    await supabase.from("historico").insert({
      desvio_id: data.id, tipo: "criacao", descricao: "Desvio criado",
      user_id: user?.id ?? null, user_name: user?.email ?? null,
    });
    return mapDesvioFromDb(data);
  },
  "desvios.update": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    const map: Record<string, string> = {
      disciplina: "disciplina", grupoId: "grupo_id",
      fornecedorId: "fornecedor_id", fornecedorNome: "fornecedor_nome",
      descricao: "descricao", localizacao: "localizacao",
      severidade: "severidade", origem: "origem", status: "status",
      tagCritico: "tag_critico", tagSegurancaTrabalho: "tag_seguranca_trabalho",
      tagSolicitadoCliente: "tag_solicitado_cliente",
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

  // --- PLANOS ---
  "planos.create": async (input: any) => {
    const { data, error } = await supabase.from("planos_acao").insert({
      desvio_id: input.desvioId,
      acao: input.acao,
      responsavel: input.responsavel,
      responsavel_tipo: input.responsavelTipo ?? "membro",
      responsavel_id: input.responsavelId ?? null,
      responsavel_email: input.responsavelEmail ?? null,
      prioridade: input.prioridade ?? "normal",
      prazo: input.prazo,
      observacoes: input.observacoes ?? null,
    }).select().single();
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("historico").insert({
      desvio_id: input.desvioId, tipo: "plano_acao",
      descricao: `Plano de ação criado: ${input.acao}`,
      user_id: user?.id ?? null, user_name: user?.email ?? null,
    });
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
    return mapPlanoFromDb(data);
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
    return { ...data, fileKey: data.file_key };
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
    const { data, error } = await supabase.from("plantas").insert({
      obra_id: input.obraId,
      nome: input.nome,
      file_key: key,
      url: pub.publicUrl,
      ordem: input.ordem ?? 0,
    }).select().single();
    if (error) throw error;
    // Dispara extração de ambientes em background (sem bloquear)
    supabase.functions.invoke("extrair-ambientes-planta", {
      body: { plantaId: data.id },
    }).catch((e) => console.warn("Falha ao iniciar extração de ambientes:", e));
    return { ...data, fileKey: data.file_key, obraId: data.obra_id };
  },
  "plantas.update": async (input: any) => {
    const { id, ...rest } = input;
    const patch: any = {};
    if ("nome" in rest) patch.nome = rest.nome;
    if ("ordem" in rest) patch.ordem = rest.ordem;
    const { data, error } = await supabase.from("plantas").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return { ...data, fileKey: data.file_key, obraId: data.obra_id };
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
    if (respostasArr.length > 0) {
      const rows = respostasArr.map((r: any) => ({
        verificacao_id: id,
        item_id: r.itemId,
        resposta: r.resposta,
        observacao: r.observacao ?? null,
      }));
      const { error: rErr } = await supabase.from("verificacao_respostas").insert(rows);
      if (rErr) throw rErr;
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
    dataIdentificacao: d.data_identificacao ? Number(d.data_identificacao) : null,
    prazoSugerido: d.prazo_sugerido ? Number(d.prazo_sugerido) : null,
    dataFechamento: d.data_fechamento ? Number(d.data_fechamento) : null,
    plantaId: d.planta_id,
    pinX: d.pin_x,
    pinY: d.pin_y,
    createdById: d.created_by_id,
    createdByName: d.created_by_name,
  };
}

function mapPlanoFromDb(p: any) {
  return {
    ...p,
    desvioId: p.desvio_id,
    responsavelTipo: p.responsavel_tipo,
    responsavelId: p.responsavel_id,
    responsavelEmail: p.responsavel_email,
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
  const ponderado = (categoria?: string) => {
    const list = (secoes || []).filter((s: any) =>
      !categoria || s.categoria === categoria
    );
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
  const statusFromScore = (sc: number | null) => {
    if (sc == null) return null;
    const f = (faixas || []).find((x: any) => sc >= x.minimo && sc <= x.maximo);
    return f?.nome || null;
  };
  return {
    scoreGeral: ponderado(),
    scoreQualidade: ponderado("qualidade"),
    scoreCronograma: ponderado("cronograma"),
    scoreCondicao: ponderado("condicao"),
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

// ---------- Proxy ----------

function makeProcedureProxy(path: string): any {
  return {
    useQuery: (input?: any, options?: UseQueryOptions<any>) => {
      const resolver = queryResolvers[path];
      return useQuery({
        queryKey: [path, input ?? null],
        queryFn: async () => (resolver ? resolver(input ?? {}) : null),
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
