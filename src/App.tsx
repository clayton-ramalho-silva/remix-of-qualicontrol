import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
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
import Administracao from "./pages/Administracao";
import Usuarios from "./pages/Usuarios";
import Plantas from "./pages/Plantas";
import PlantaView from "./pages/PlantaView";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/desvios" component={DesviosList} />
        <Route path="/desvios/novo" component={DesvioNovo} />
        <Route path="/desvios/:id" component={DesvioDetalhe} />
        <Route path="/fornecedores" component={Fornecedores} />
        <Route path="/obras" component={Obras} />
        <Route path="/assistente" component={Assistente} />
        <Route path="/relatorio" component={Relatorio} />
        <Route path="/verificacoes" component={Verificacoes} />
        <Route path="/verificacoes/nova" component={NovaVerificacao} />
        <Route path="/verificacoes/:id" component={VerificacaoDetalhe} />
        <Route path="/plantas" component={Plantas} />
        <Route path="/plantas/:id" component={PlantaView} />
        <Route path="/usuarios" component={Usuarios} />
        <Route path="/administracao" component={Administracao} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
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
