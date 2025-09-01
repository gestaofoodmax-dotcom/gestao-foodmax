import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Users,
  ShoppingCart,
  AlertTriangle,
  Truck,
  Package,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className="flex h-screen bg-foodmax-gray-bg">
      <Sidebar
        open={sidebarOpen}
        onToggle={(next) =>
          setSidebarOpen(typeof next === "boolean" ? next : !sidebarOpen)
        }
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-foodmax-gray-bg px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 mr-3 rounded-lg border bg-white"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-800">
                Olá, {user?.email ? user.email.split("@")[0] : "Usuário"}
              </h2>
            </div>

            <div className="flex items-center">
              <Select defaultValue="todos">
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos Estabelecimentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Estabelecimentos</SelectItem>
                  <SelectItem value="estabelecimento1">
                    Estabelecimento 1
                  </SelectItem>
                  <SelectItem value="estabelecimento2">
                    Estabelecimento 2
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Warning Alert */}
            <Alert className="mb-6 border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <span className="text-yellow-800 font-medium">
                    Falta 1 dia para terminar o plano grátis.
                  </span>
                  <br />
                  <span className="text-gray-600 text-sm">
                    Assine agora e continue utilizando todos os recursos.
                  </span>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg">
                  🟢 Assinar Plano Completo
                </Button>
              </AlertDescription>
            </Alert>

            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pedidos</p>
                    <p className="text-2xl font-bold text-gray-800">R$ 0,00</p>
                    <p className="text-xs text-gray-500">0 pedidos</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Entregas</p>
                    <p className="text-2xl font-bold text-gray-800">R$ 0,00</p>
                    <p className="text-xs text-gray-500">0 entregas</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Abastecimentos</p>
                    <p className="text-2xl font-bold text-gray-800">R$ 0,00</p>
                    <p className="text-xs text-gray-500">0 abastecimentos</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Clientes</p>
                    <p className="text-2xl font-bold text-gray-800">0</p>
                    <p className="text-xs text-gray-500">clientes ativos</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pedidos Recentes */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Pedidos Recentes
                  </h4>
                  <button className="text-sm text-gray-800 hover:text-gray-900">
                    Ver mais →
                  </button>
                </div>
                <div className="text-center py-8 text-gray-500">
                  Nenhum pedido encontrado
                </div>
              </div>

              {/* Clientes Recentes */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Clientes Recentes
                  </h4>
                  <button className="text-sm text-gray-800 hover:text-gray-900">
                    Ver mais →
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center p-3 hover:bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-gray-600">
                        PS
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Pedro Silva</p>
                      <p className="text-sm text-gray-500">pedro@pedro.com</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 hover:bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-gray-600">
                        R
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Ricardo</p>
                      <p className="text-sm text-gray-500">123123123</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 hover:bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-gray-600">
                        B
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Bruna</p>
                      <p className="text-sm text-gray-500">bruna@bruna.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
