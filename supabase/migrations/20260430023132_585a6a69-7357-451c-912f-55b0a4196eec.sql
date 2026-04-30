-- Renomear valores do enum origem_desvio
ALTER TYPE public.origem_desvio RENAME VALUE 'punch_list' TO 'checklist';
ALTER TYPE public.origem_desvio RENAME VALUE 'pos_obra' TO 'qsms';