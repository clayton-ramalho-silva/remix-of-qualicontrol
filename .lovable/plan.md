
# Investigação e Análise de Ocorrências (QSMS)

Novo módulo dentro de QSMS para registrar, investigar e acompanhar incidentes/acidentes conforme AWPRO 012 e AWFOR 094.

## 1. Conceito

Diferente de "Verificações QSMS" (checklist de inspeção do dia a dia), este é um **processo de ocorrência reativa**: começa com a comunicação imediata e evolui por etapas (classificação → investigação → causas → plano de ação → encerramento) com prazos da norma (24h para constituir comissão, 7 dias para investigação, 15 dias para evidências do plano).

## 2. Estrutura de menu

- Sidebar continua com **QSMS** (lista de verificações).
- Adicionar item **"Ocorrências QSMS"** logo abaixo (ícone `AlertOctagon` ou `Siren`), com rotas:
  - `/qsms/ocorrencias` — lista
  - `/qsms/ocorrencias/nova` — comunicação inicial (campos do AWFOR 094 página 1)
  - `/qsms/ocorrencias/:id` — detalhe com abas (Comunicação · Investigação · Causas · Plano de Ação · Encerramento · Anexos)
- Em **Administração**, adicionar dentro do vertical QSMS uma aba "Categorias de Ocorrência" (para tipos customizáveis se necessário; classificações padrão vêm fixas).

## 3. Fluxo (espelhando AWFOR 094 + AWPRO 012)

```text
[Nova ocorrência]
  └─ Comunicação imediata (página 1 do AWFOR 094)
      ├─ Obra, data/hora, local, endereço
      ├─ Empresa principal / Subcontratada (CNPJ)
      ├─ Acidentado (quando houver)
      ├─ Classificação: Incidente | Incidente Ambiental | ACA | ASA | AF | AT
      ├─ Descrição preliminar
      ├─ Ação imediata
      └─ Responsável pelo preenchimento + Responsável pela obra
        ↓ status: comunicado
[Investigação] (até 7 dias)
  ├─ Comissão (lista de membros: QSMS, CIPA, testemunhas, coordenador)
  ├─ Cronologia dos fatos
  ├─ Testemunhas (nome, identidade, contato)
  ├─ Evidências fotográficas
  └─ CAT emitida? / AWFOR-149 anexada?
        ↓ status: em_investigacao
[Análise de Causas]
  ├─ Árvore dos Porquês (5 níveis livres)
  ├─ Causas imediatas (ato/condição abaixo dos padrões)
  └─ Causas básicas/raiz (fatores pessoais / de trabalho)
        ↓ status: em_analise
[Plano de Ação]
  └─ Reusa planos_acao existentes (vertical=qsms, ligados à ocorrência)
        ↓ status: acao_em_andamento
[Encerramento]
  ├─ Evidências do plano (até 15 dias)
  └─ Assinaturas + data fechamento
        ↓ status: encerrado
```

## 4. Modelo de dados

Tabelas novas (categoria reutiliza o vertical `qsms`):

- **`ocorrencias`** — registro principal
  - obra_id, data_ocorrencia, hora, local, endereco, cidade, uf
  - empresa_principal, cnpj_principal, empresa_subcontratada, cnpj_sub
  - acidentado_nome, acidentado_funcao, acidentado_idade
  - classificacao (enum: incidente, incidente_ambiental, aca, asa, af, at)
  - descricao_preliminar, acao_imediata
  - responsavel_preenchimento, responsavel_obra
  - cat_emitida (bool), cat_numero, atestado_dias
  - awfor149_anexada (bool)
  - status (enum: comunicado, em_investigacao, em_analise, acao_em_andamento, encerrado)
  - prazo_comissao (24h), prazo_investigacao (7d), prazo_plano (15d) — calculados
  - created_by_id/nome
- **`ocorrencia_comissao`** — membros (nome, papel, é_coordenador)
- **`ocorrencia_testemunhas`** — nome, identidade, contato, depoimento
- **`ocorrencia_cronologia`** — etapa, momento, descrição, ordem
- **`ocorrencia_causas`** — tipo (imediata/basica), categoria (ato/condicao/fator_pessoal/fator_trabalho), descricao
- **`ocorrencia_porques`** — pergunta, resposta, nível (1–5), parent_id
- **`ocorrencia_fotos`** — file_key, url, descrição, etapa (cena/simulacao/evidencia/plano)
- **`ocorrencia_documentos`** — file_key, tipo (CAT, atestado, AWFOR149, memorando, outro)

Planos de ação existentes ganham um link opcional `ocorrencia_id` (ou reusa `desvio_id` via desvio gerado automaticamente — ver abaixo). Recomendação: adicionar coluna `ocorrencia_id` em `planos_acao`.

Todas com RLS `authenticated` (igual padrão do projeto).

## 5. Reuso do que já existe

- **Storage** `evidencias` para fotos/documentos (mesmo bucket, prefixo `ocorrencias/`).
- **Compressão** via `src/lib/image-compress.ts` (já implementado).
- **Planos de Ação**: gerados a partir da ocorrência, com `vertical='qsms'` e `ocorrencia_id`. Aparecem em `/planos-acao`.
- **Notificações**: alertas automáticos de prazos (24h comissão, 7d investigação, 15d plano) usando a tabela `notificacoes`.
- **Relatório**: incluir contagem de ocorrências por classificação no Dashboard QSMS.

## 6. Telas (componentes novos)

- `src/pages/Ocorrencias.tsx` — lista filtrável por obra/classificação/status.
- `src/pages/OcorrenciaNova.tsx` — wizard de comunicação inicial (AWFOR 094 pág. 1).
- `src/pages/OcorrenciaDetalhe.tsx` — abas:
  - **Comunicação** (read-only após salvar)
  - **Investigação** (comissão + cronologia + testemunhas + fotos)
  - **Causas** (Árvore dos Porquês + causas imediatas/básicas)
  - **Plano de Ação** (lista planos vinculados + criar novo)
  - **Encerramento** (checklist de evidências + assinaturas)
  - **Anexos** (CAT, atestado, AWFOR-149, memorando da comissão)
- `src/components/ArvorePorques.tsx` — componente para os 5 porquês em árvore.
- Indicador visual de prazos (verde/amarelo/vermelho conforme proximidade).

## 7. Exportação

Botão "Exportar AWFOR 094" no detalhe — gera PDF preenchido com todos os campos da investigação (estrutura do XLSX original, mantendo identidade visual A|W).

## 8. Entregas em fases

1. **Fase 1 (mínimo viável)** — Tabelas + tela de Comunicação Inicial + lista + detalhe básico (Investigação simples + fotos). Permite registrar ocorrências hoje.
2. **Fase 2** — Comissão, testemunhas, Árvore dos Porquês, causas estruturadas, vínculo com planos de ação.
3. **Fase 3** — Notificações de prazo, exportação PDF AWFOR 094, dashboard QSMS de estatísticas (taxas de frequência/gravidade, planilha de indicadores 5º dia útil).

## Detalhes técnicos

- Migrations: criar 7 tabelas + 2 enums (`classificacao_ocorrencia`, `status_ocorrencia`) + RLS `authenticated all`.
- Adicionar `ocorrencia_id bigint` em `planos_acao`.
- tRPC routers novos: `ocorrencias.*` (list, get, create, update, addMembro, addTestemunha, addCausa, addPorque, addFoto, addDocumento, close).
- Reusar `PhotoPickerButton` e padrão de upload compressed do DesvioNovo.
- `App.tsx` registra as 3 rotas; `DashboardLayout` adiciona o item de menu.
