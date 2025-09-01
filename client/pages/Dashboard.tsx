import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Users,
  ShoppingCart,
  AlertTriangle,
  Truck,
  Package,
  Star,
  ShoppingBag,
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
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Estabelecimento } from "@shared/estabelecimentos";

export default function Dashboard() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPayment } = useAuth();
  const { makeRequest } = useAuthenticatedRequest();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [selectedEst, setSelectedEst] = useState<string>("todos");
  const [recentPedidos, setRecentPedidos] = useState<any[]>([]);
  const [recentClientes, setRecentClientes] = useState<any[]>([]);
  const [cards, setCards] = useState({ pedidosTotal: 0, pedidosCount: 0, entregasTotal: 0, entregasCount: 0, abastecTotal: 0, abastecCount: 0, clientesTotal: 0, clientesAtivos: 0 });
  const displayName = useMemo(() => {
    try {
      const n = localStorage.getItem("fm_user_name");
      if (n && n.trim()) return n.trim();
    } catch {}
    return user?.email ? user.email.split("@")[0] : "Usuário";
  }, [user?.email]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const params = new URLSearchParams({ page: "1", limit: "200" });
        const resp = await makeRequest(`/api/estabelecimentos?${params}`);
        const list: Estabelecimento[] = (resp?.data || []) as any;
        list.sort((a, b) => (a.data_cadastro < b.data_cadastro ? 1 : -1));
        setEstabelecimentos(list);
      } catch {
        setEstabelecimentos([]);
      }

      try {
        const pedidosResp = await makeRequest(`/api/pedidos?page=1&limit=100`);
        const pedidos = Array.isArray(pedidosResp?.data) ? pedidosResp.data : [];
        setRecentPedidos(pedidos);
      } catch {
        setRecentPedidos([]);
      }
      try {
        const clientesResp = await makeRequest(`/api/clientes?page=1&limit=100`);
        const clientes = Array.isArray(clientesResp?.data) ? clientesResp.data : [];
        setRecentClientes(clientes);
      } catch {
        setRecentClientes([]);
      }
    };
    loadData();
  }, [makeRequest]);

  useEffect(() => {
    // recompute cards when selectedEst or lists change
    const filtroEst = (arr: any[]) =>
      selectedEst === "todos" ? arr : arr.filter((x) => String(x.estabelecimento_id) === selectedEst);
    const now = new Date();
    const isSameMonth = (d: string) => {
      const dt = new Date(d);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    };
    const pedidosFiltered = filtroEst(recentPedidos);
    const pedidosFinalizadosMes = pedidosFiltered.filter((p) => p.status === "Finalizado" && isSameMonth(p.data_cadastro));
    const pedidosTotal = pedidosFinalizadosMes.reduce((sum, p) => sum + (p.valor_total_centavos || 0), 0) / 100;
    const pedidosCount = pedidosFinalizadosMes.length;

    const clientesFiltered = filtroEst(recentClientes);
    const clientesAtivos = clientesFiltered.filter((c) => c.ativo).length;

    setCards({
      pedidosTotal,
      pedidosCount,
      entregasTotal: 0,
      entregasCount: 0,
      abastecTotal: 0,
      abastecCount: 0,
      clientesTotal: clientesFiltered.length,
      clientesAtivos,
    });
  }, [selectedEst, recentPedidos, recentClientes]);

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
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 mr-3 rounded-lg border bg-white"
                  aria-label="Abrir menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold text-gray-800">Olá, {displayName}</h2>
              </div>
              {estabelecimentos.length > 0 && (
                <Select value={selectedEst} onValueChange={setSelectedEst}>
                  <SelectTrigger className="w-full md:w-64 bg-gray-100">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos Estabelecimentos</SelectItem>
                    {estabelecimentos.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {(() => {
              const hasPay = hasPayment();
              const cadastro = user?.data_cadastro ? new Date(user.data_cadastro) : null;
              const today = new Date();
              let show = false;
              let title = "Você está no Plano Grátis.";
              let desc = "Aproveite todos os recursos nesse período de teste.";
              let btnText = "Assinar Plano Completo";
              let btnHref = "/PagamentoPlano";

              if (!hasPay && cadastro) {
                const diffDays = Math.floor((today.getTime() - cadastro.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays === 4) {
                  title = "Falta 1 dia para terminar o plano grátis.";
                  desc = "Assine agora e continue utilizando todos os recursos.";
                }
                show = true;
              } else if (hasPay) {
                let payDate: Date | null = null;
                try {
                  const raw = localStorage.getItem("fm_user_payment_date");
                  if (raw) payDate = new Date(raw);
                } catch {}
                const base = payDate || cadastro;
                if (base) {
                  const diffDays = Math.floor((today.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
                  if (diffDays === 29) {
                    title = "Falta 1 dia para terminar seu plano pago.";
                    desc = "Renove agora e continue utilizando todos os recursos.";
                    btnText = "Renovar Plano";
                    btnHref = "/RenovarPlano";
                    show = true;
                  }
                }
              }

              return show ? (
                <Alert className="mb-6 border-yellow-300 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <span className="text-yellow-800 font-medium">{title}</span>
                      <br />
                      <span className="text-gray-600 text-sm">{desc}</span>
                    </div>
                    <Link to={btnHref} className="w-full md:w-auto">
                      <Button className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg">
                        <Star className="w-4 h-4 mr-2 text-yellow-400" fill="currentColor" />
                        {btnText}
                      </Button>
                    </Link>
                  </AlertDescription>
                </Alert>
              ) : null;
            })()}

            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pedidos</p>
                    <p className="text-2xl font-bold text-gray-800">R$ {cards.pedidosTotal.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{cards.pedidosCount} pedidos</p>
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
                    <p className="text-2xl font-bold text-gray-800">{cards.clientesTotal}</p>
                    <p className="text-xs text-gray-500">{cards.clientesAtivos} clientes ativos</p>
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
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <ShoppingBag className="w-5 h-5 mr-2 text-black" />
                    Pedidos Recentes
                  </h4>
                  <Link to="/pedidos" className="text-sm text-black hover:underline">
                    Ver mais →
                  </Link>
                </div>
                {(() => {
                  const filtro = selectedEst === "todos" ? recentPedidos : recentPedidos.filter((p) => String(p.estabelecimento_id) === selectedEst);
                  const ordered = [...filtro].sort((a,b)=> (a.data_cadastro < b.data_cadastro ? 1 : -1)).slice(0,5);
                  if (ordered.length === 0) return (
                    <div className="text-center py-8 text-gray-500">Nenhum pedido encontrado</div>
                  );
                  return (
                    <div className="space-y-3">
                      {ordered.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-gray-600">{String(p.codigo||"").slice(0,2)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{p.codigo}</p>
                              <p className="text-sm text-gray-500">{new Date(p.data_cadastro).toLocaleString("pt-BR")}</p>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-800">R$ {(p.valor_total_centavos/100).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Clientes Recentes */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Clientes Recentes
                  </h4>
                  <Link to="/clientes" className="text-sm text-black hover:underline">
                    Ver mais →
                  </Link>
                </div>
                {(() => {
                  const filtro = selectedEst === "todos" ? recentClientes : recentClientes.filter((c) => String(c.estabelecimento_id) === selectedEst);
                  const ordered = [...filtro].sort((a,b)=> (a.data_cadastro < b.data_cadastro ? 1 : -1)).slice(0,5);
                  if (ordered.length === 0) return (
                    <div className="text-center py-8 text-gray-500">Nenhum cliente encontrado</div>
                  );
                  return (
                    <div className="space-y-3">
                      {ordered.map((c) => (
                        <div key={c.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-gray-600">{String(c.nome||"?").charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{c.nome}</p>
                            <p className="text-sm text-gray-500">{c.email || c.telefone || "-"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
