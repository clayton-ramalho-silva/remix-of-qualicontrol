## Reorganizar QSMS no Menu Lateral com Submenu

### Contexto
O item **Ocorrências QSMS** está como entrada independente no menu. A pedido do usuário, ele deve ser agrupado dentro de **QSMS** como submenu colapsável.

### Alterações

#### 1. `src/components/DashboardLayout.tsx`
- Reestruturar a lista `menuItems` para suportar **grupos** com **sub-itens**, usando:
  - `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton` do shadcn sidebar
  - `Collapsible` do Radix para expandir/colapsar o grupo
- Grupo **QSMS** (ícone `HardHat`) conterá:
  - Lista de Verificação → `/qsms` (submenu, ícone `ClipboardCheck`)
  - Ocorrências → `/qsms/ocorrencias` (submenu, ícone `Siren`)
- O grupo QSMS permanece **auto-expandido** quando a rota ativa começar com `/qsms`
- Todos os outros itens do menu permanecem como antes (sem grupo, layout flat)

#### 2. Destaque visual
- O grupo QSMS fica `data-active=true` quando qualquer sub-rota `/qsms/*` estiver ativa
- Sub-item ativo recebe destaque secundário

### O que NÃO muda
- Nenhuma rota é alterada (`/qsms`, `/qsms/nova`, `/qsms/ocorrencias`, `/qsms/ocorrencias/nova`, etc.)
- Nenhum outro item de menu é afetado
- Nenhuma lógica de negócio ou backend é alterada