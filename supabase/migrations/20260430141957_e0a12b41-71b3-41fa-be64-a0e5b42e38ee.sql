
-- Apaga itens das seções de vistoria existentes
DELETE FROM public.checklist_itens
WHERE secao_id IN (SELECT id FROM public.checklist_secoes WHERE categoria='vistoria');

-- Apaga as seções de vistoria existentes
DELETE FROM public.checklist_secoes WHERE categoria='vistoria';

-- Recria as 4 seções
WITH novas AS (
  INSERT INTO public.checklist_secoes (categoria, numero, titulo, peso, reincidencia, ordem, ativo)
  VALUES
    ('vistoria', 1, 'Acompanhamento',          10, 0, 1, 1),
    ('vistoria', 2, 'Condição de Obra',        10, 0, 2, 1),
    ('vistoria', 3, 'Qualidade dos Serviços',  10, 0, 3, 1),
    ('vistoria', 4, 'Cronograma',              10, 0, 4, 1)
  RETURNING id, numero
)
INSERT INTO public.checklist_itens (secao_id, codigo, descricao, ordem, ativo)
SELECT n.id, x.codigo, x.descricao, x.ordem, 1
FROM novas n
JOIN (VALUES
  -- Seção 1
  (1, '1.1', 'Engenheiro de Instalações presente na obra', 1),
  (1, '1.2', 'Mestre de Obras presente na obra', 2),
  (1, '1.3', 'Técnico de Segurança presente na obra', 3),
  -- Seção 2
  (2, '2.1', 'Limpeza geral da obra', 1),
  (2, '2.2', 'Proteção de materiais instalados', 2),
  (2, '2.3', 'Organização do canteiro', 3),
  (2, '2.4', 'Sinalização de segurança adequada', 4),
  (2, '2.5', 'Descarte correto de resíduos', 5),
  -- Seção 3
  (3, '3.1', 'Alinhamento de paredes e divisórias', 1),
  (3, '3.2', 'Nivelamento de pisos', 2),
  (3, '3.3', 'Acabamento de pintura', 3),
  (3, '3.4', 'Instalações elétricas conforme projeto', 4),
  (3, '3.5', 'Instalações hidráulicas sem vazamentos', 5),
  (3, '3.6', 'Esquadrias e vidros instalados corretamente', 6),
  -- Seção 4
  (4, '4.1', 'Cronograma atualizado e visível', 1),
  (4, '4.2', 'Atividades dentro do prazo previsto', 2),
  (4, '4.3', 'Entregas parciais conforme planejado', 3)
) AS x(numero, codigo, descricao, ordem) ON x.numero = n.numero;
