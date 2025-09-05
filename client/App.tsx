import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import EstabelecimentosModule from "./pages/estabelecimentos/EstabelecimentosModule";
import ClientesModule from "./pages/clientes/ClientesModule";
import FornecedoresModule from "./pages/fornecedores/FornecedoresModule";
import ItensModule from "./pages/itens/ItensModule";
import CardapiosModule from "./pages/cardapios/CardapiosModule";
import PedidosModule from "./pages/pedidos/PedidosModule";
import AbastecimentosModule from "./pages/abastecimentos/AbastecimentosModule";
import MinhaConta from "./pages/MinhaConta";
import PagamentoPlano from "./pages/PagamentoPlano";
import RenovarPlano from "./pages/RenovarPlano";
import EntregasModule from "./pages/entregas/EntregasModule";
import FinanceiroModule from "./pages/financeiro/FinanceiroModule";
import RelatoriosModule from "./pages/relatorios/RelatoriosModule";
import ComunicacoesModule from "./pages/comunicacoes/ComunicacoesModule";
import ConfiguracoesModule from "./pages/configuracoes/ConfiguracoesModule";
import SuportesModule from "./pages/suportes/SuportesModule";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-foodmax-gray-bg">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/estabelecimentos"
              element={<EstabelecimentosModule />}
            />
            <Route path="/clientes" element={<ClientesModule />} />
            <Route path="/fornecedores" element={<FornecedoresModule />} />
            <Route path="/itens" element={<ItensModule />} />
            <Route path="/cardapios" element={<CardapiosModule />} />
            <Route path="/pedidos" element={<PedidosModule />} />
            <Route path="/abastecimentos" element={<AbastecimentosModule />} />
            <Route path="/entregas" element={<EntregasModule />} />
            <Route path="/financeiro" element={<FinanceiroModule />} />
            <Route path="/relatorios" element={<RelatoriosModule />} />
            <Route path="/comunicacoes" element={<ComunicacoesModule />} />
            <Route path="/suportes" element={<SuportesModule />} />
            <Route path="/configuracoes" element={<ConfiguracoesModule />} />
            <Route path="/minha-conta" element={<MinhaConta />} />
            <Route path="/PagamentoPlano" element={<PagamentoPlano />} />
            <Route path="/RenovarPlano" element={<RenovarPlano />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
