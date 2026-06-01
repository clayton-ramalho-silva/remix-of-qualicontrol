import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import DesviosList from "./pages/DesviosList";
import DesvioNovo from "./pages/DesvioNovo";
import DesvioDetalhe from "./pages/DesvioDetalhe";
import Fornecedores from "./pages/Fornecedores";
import Obras from "./pages/Obras";
import Assistente from "./pages/Assistente";
import Relatorio from "./pages/Relatorio";
import Verificacoes from "./pages/Verificacoes";
import NovaVerificacao from "./pages/NovaVerificacao";
import VerificacaoDetalhe from "./pages/VerificacaoDetalhe";
import EditarVerificacao from "./pages/EditarVerificacao";
import Ocorrencias from "./pages/Ocorrencias";
import OcorrenciaNova from "./pages/OcorrenciaNova";
import OcorrenciaDetalhe from "./pages/OcorrenciaDetalhe";
import OcorrenciaEditar from "./pages/OcorrenciaEditar";
import Administracao from "./pages/Administracao";

import Plantas from "./pages/Plantas";
import PlantaView from "./pages/PlantaView";
import Alocacao from "./pages/Alocacao";
import PlanosAcao from "./pages/PlanosAcao";
import PlanoAcaoNovo from "./pages/PlanoAcaoNovo";
import PlanoAcaoDetalhe from "./pages/PlanoAcaoDetalhe";
import ObraDetalhe from "./pages/ObraDetalhe";
import AndarDetalhe from "./pages/AndarDetalhe";
import Aprovacoes from "./pages/Aprovacoes";
import ChecklistList from "./pages/ChecklistList";
import ChecklistEditor from "./pages/ChecklistEditor";
import Sistema from "./pages/Sistema";
import Contas from "./pages/Contas";
import Manual from "./pages/Manual";

function ProtectedShell() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/desvios" component={DesviosList} />
        <Route path="/desvios/novo" component={DesvioNovo} />
        <Route path="/desvios/:id" component={DesvioDetalhe} />
        <Route path="/planos-acao" component={PlanosAcao} />
        <Route path="/planos-acao/novo" component={PlanoAcaoNovo} />
        <Route path="/planos-acao/:id" component={PlanoAcaoDetalhe} />
        <Route path="/aprovacoes/gerenciadora">{() => <Aprovacoes tipo="gerenciadora" />}</Route>
        <Route path="/aprovacoes/arquitetura">{() => <Aprovacoes tipo="arquitetura" />}</Route>
        <Route path="/checklists" component={ChecklistList} />
        <Route path="/checklists/novo" component={ChecklistEditor} />
        <Route path="/checklists/:id" component={ChecklistEditor} />
        <Route path="/fornecedores" component={Fornecedores} />
        <Route path="/obras" component={Obras} />
        <Route path="/obras/:obraId/edificios/:edId/andares/:anId" component={AndarDetalhe} />
        <Route path="/obras/:obraId" component={ObraDetalhe} />
        <Route path="/assistente" component={Assistente} />
        <Route path="/relatorio" component={Relatorio} />
        <Route path="/verificacoes">{() => <Verificacoes />}</Route>
        <Route path="/verificacoes/nova">{() => <NovaVerificacao />}</Route>
        <Route path="/verificacoes/:id/editar">{() => <EditarVerificacao />}</Route>
        <Route path="/verificacoes/:id">{() => <VerificacaoDetalhe />}</Route>
        <Route path="/vistoria-recebimento">
          {() => <Verificacoes categoria="vistoria" titulo="Vistoria de Recebimento" rotaBase="/vistoria-recebimento" />}
        </Route>
        <Route path="/vistoria-recebimento/nova">
          {() => <NovaVerificacao categoria="vistoria" titulo="Nova Vistoria de Recebimento" rotaBase="/vistoria-recebimento" />}
        </Route>
        <Route path="/vistoria-recebimento/:id/editar">
          {() => <EditarVerificacao rotaBase="/vistoria-recebimento" />}
        </Route>
        <Route path="/vistoria-recebimento/:id">
          {() => <VerificacaoDetalhe rotaBase="/vistoria-recebimento" titulo="Vistoria de Recebimento" />}
        </Route>
        <Route path="/qsms/ocorrencias" component={Ocorrencias} />
        <Route path="/qsms/ocorrencias/nova" component={OcorrenciaNova} />
        <Route path="/qsms/ocorrencias/:id/editar" component={OcorrenciaEditar} />
        <Route path="/qsms/ocorrencias/:id" component={OcorrenciaDetalhe} />
        <Route path="/qsms">
          {() => <Verificacoes categoria="qsms" titulo="Verificações QSMS" rotaBase="/qsms" />}
        </Route>
        <Route path="/qsms/nova">
          {() => <NovaVerificacao categoria="qsms" titulo="Nova Verificação QSMS" rotaBase="/qsms" />}
        </Route>
        <Route path="/qsms/:id/editar">
          {() => <EditarVerificacao rotaBase="/qsms" />}
        </Route>
        <Route path="/qsms/:id">
          {() => <VerificacaoDetalhe rotaBase="/qsms" titulo="Verificação QSMS" />}
        </Route>
        <Route path="/plantas" component={Plantas} />
        <Route path="/plantas/:id" component={PlantaView} />
        <Route path="/usuarios" component={Contas} />
        <Route path="/contas" component={Contas} />
        <Route path="/administracao" component={Administracao} />
        <Route path="/alocacao" component={Alocacao} />
        <Route path="/sistema" component={Sistema} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route component={ProtectedShell} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
