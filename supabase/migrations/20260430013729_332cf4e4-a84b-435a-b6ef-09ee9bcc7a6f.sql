-- Limpar respostas e itens/seções antigos
DELETE FROM public.verificacao_respostas;
DELETE FROM public.checklist_itens;
DELETE FROM public.checklist_secoes;

-- Inserir as 4 seções
INSERT INTO public.checklist_secoes (numero, titulo, peso, reincidencia, ordem, ativo, categoria) VALUES
  (1, 'Acompanhamento',         0,  0, 1, 1, 'acompanhamento'),
  (2, 'Condição de Obra',       10, 5, 2, 1, 'condicao'),
  (3, 'Qualidade dos Serviços', 10, 5, 3, 1, 'qualidade'),
  (4, 'Cronograma',             10, 0, 4, 1, 'cronograma');

-- Itens — Acompanhamento (3)
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'AC.01', 'Reunião semanal de obra realizada com ata registrada', 1, 1 FROM public.checklist_secoes WHERE numero=1;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'AC.02', 'Diário de obra atualizado e assinado pelo responsável técnico', 2, 1 FROM public.checklist_secoes WHERE numero=1;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'AC.03', 'Equipe de fiscalização presente em campo conforme escala', 3, 1 FROM public.checklist_secoes WHERE numero=1;

-- Itens — Condição de Obra (5)
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'CO.01', 'Canteiro organizado, limpo e com circulação desobstruída', 1, 1 FROM public.checklist_secoes WHERE numero=2;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'CO.02', 'Uso correto de EPIs por todos os colaboradores em campo', 2, 1 FROM public.checklist_secoes WHERE numero=2;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'CO.03', 'Sinalização de segurança e isolamento de áreas de risco adequados', 3, 1 FROM public.checklist_secoes WHERE numero=2;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'CO.04', 'Armazenamento e proteção de materiais conforme especificação', 4, 1 FROM public.checklist_secoes WHERE numero=2;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'CO.05', 'Instalações provisórias (água, energia, sanitários) em condições de uso', 5, 1 FROM public.checklist_secoes WHERE numero=2;

-- Itens — Qualidade dos Serviços (6)
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'QS.01', 'Execução de estrutura e alvenaria conforme projeto e normas', 1, 1 FROM public.checklist_secoes WHERE numero=3;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'QS.02', 'Instalações elétricas e hidráulicas executadas conforme projeto', 2, 1 FROM public.checklist_secoes WHERE numero=3;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'QS.03', 'Impermeabilização e revestimentos sem falhas aparentes', 3, 1 FROM public.checklist_secoes WHERE numero=3;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'QS.04', 'Acabamentos (pintura, piso, esquadrias) dentro do padrão de qualidade', 4, 1 FROM public.checklist_secoes WHERE numero=3;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'QS.05', 'Materiais utilizados conforme memorial descritivo e amostras aprovadas', 5, 1 FROM public.checklist_secoes WHERE numero=3;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'QS.06', 'Ensaios e testes (concreto, estanqueidade, etc.) realizados e aprovados', 6, 1 FROM public.checklist_secoes WHERE numero=3;

-- Itens — Cronograma (3)
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'CR.01', 'Avanço físico em conformidade com o cronograma planejado', 1, 1 FROM public.checklist_secoes WHERE numero=4;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'CR.02', 'Marcos contratuais (entregas parciais) cumpridos no prazo', 2, 1 FROM public.checklist_secoes WHERE numero=4;
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT id, 'CR.03', 'Replanejamentos formalizados quando necessários, com aprovação da fiscalização', 3, 1 FROM public.checklist_secoes WHERE numero=4;