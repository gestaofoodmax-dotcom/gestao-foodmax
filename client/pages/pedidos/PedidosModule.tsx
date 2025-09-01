import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Home,
  Store,
  Users,
  Truck,
  List,
  Utensils,
  Search,
  Plus,
  Trash2,
  Eye,
  Edit,
  CheckCircle2,
  ShoppingCart,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/data-grid";
import { toast } from "@/hooks/use-toast";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Pedido,
  PedidosListResponse,
  StatusPedido,
  getStatusPedidoColor,
  getTipoPedidoColor,
  formatCurrencyBRL,
} from "@shared/pedidos";
import PedidoForm from "./PedidoForm";
import PedidoView from "./PedidoView";
import { BulkDeleteAlert, DeleteAlert } from "@/components/alert-dialog-component";

export default function PedidosModule() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { makeRequest } = useAuthenticatedRequest();

  const [activeTab, setActiveTab] = useState<StatusPedido | "Todos">("Todos");

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  const LOCAL_PEDIDOS = "fm_pedidos";
  const readLocalPedidos = (): Pedido[] => {
    try {
      const raw = localStorage.getItem(LOCAL_PEDIDOS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const writeLocalPedidos = (list: Pedido[]) => localStorage.setItem(LOCAL_PEDIDOS, JSON.stringify(list));

  const menuItems = [
    { icon: Home, label: "Dashboard", route: "/dashboard" },
    { icon: Store, label: "Estabelecimentos", route: "/estabelecimentos" },
    { icon: Users, label: "Clientes", route: "/clientes" },
    { icon: Truck, label: "Fornecedores", route: "/fornecedores" },
    { icon: List, label: "Itens", route: "/itens" },
    { icon: Utensils, label: "Cardápios", route: "/cardapios" },
    { icon: ShoppingCart, label: "Pedidos", route: "/pedidos" },
  ];
  const renderMenuItem = (item: any, index: number) => {
    const isActive = location.pathname === item.route;
    return (
      <Link
        key={index}
        to={item.route}
        className={`w-full flex items-center px-4 py-2 text-left transition-colors ${isActive ? "bg-orange-50 text-foodmax-orange border-r-4 border-foodmax-orange" : "text-gray-700 hover:bg-gray-100"}`}
      >
        <item.icon className="w-4 h-4" />
        {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
      </Link>
    );
  };

  const gridColumns = useMemo(
    () => [
      { key: "estabelecimento_nome", label: "Estabelecimento", sortable: false },
      { key: "codigo", label: "Código", sortable: true },
      {
        key: "tipo_pedido",
        label: "Tipo",
        sortable: true,
        render: (v: any) => <Badge className={getTipoPedidoColor(v)}>{v}</Badge>,
      },
      {
        key: "valor_total_centavos",
        label: "Valor Total",
        sortable: true,
        render: (v: number) => formatCurrencyBRL(v),
      },
      {
        key: "data_hora_finalizado",
        label: "Data/Hora Finalizado",
        sortable: true,
        render: (v: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "-"),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v: any) => <Badge className={getStatusPedidoColor(v)}>{v}</Badge>,
      },
      {
        key: "data_cadastro",
        label: "Data Cadastro",
        sortable: true,
        render: (v: string) => new Date(v).toLocaleDateString("pt-BR"),
      },
      {
        key: "acoes",
        label: "Ações",
        render: (_: any, r: Pedido) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFinalize(r)}
              className="h-8 w-8 p-0 rounded-full border bg-green-50 hover:bg-green-100 border-green-200"
              title="Finalizar"
            >
              <CheckCircle2 className="w-4 h-4 text-green-700" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleView(r)}
              className="h-8 w-8 p-0 rounded-full border bg-blue-50 hover:bg-blue-100 border-blue-200"
              title="Visualizar"
            >
              <Eye className="w-4 h-4 text-blue-700" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(r)}
              className="h-8 w-8 p-0 rounded-full border bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
              title="Editar"
            >
              <Edit className="w-4 h-4 text-yellow-700" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(r)}
              className="h-8 w-8 p-0 rounded-full border bg-red-50 hover:bg-red-100 border-red-200"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4 text-red-700" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const loadPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(searchTerm && { search: searchTerm }),
        ...(activeTab !== "Todos" && { status: activeTab }),
      });
      let response: PedidosListResponse | null = null;
      try {
        response = await makeRequest(`/api/pedidos?${params}`);
      } catch {
        response = null;
      }
      if (response) {
        setPedidos(response.data as any);
        setTotalRecords(response.pagination.total);
      } else {
        const local = readLocalPedidos();
        const filtered = local.filter(
          (p) => activeTab === "Todos" || p.status === activeTab,
        ).filter((p) => !searchTerm || p.codigo.toLowerCase().includes(searchTerm.toLowerCase()));
        setPedidos(filtered);
        setTotalRecords(filtered.length);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, activeTab, makeRequest]);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, [activeTab]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const handlePageChange = (page: number) => setCurrentPage(page);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [currentPedido, setCurrentPedido] = useState<Pedido | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleNew = () => {
    setCurrentPedido(null);
    setIsEditing(false);
    setShowForm(true);
  };
  const handleEdit = (p: Pedido) => {
    setCurrentPedido(p);
    setIsEditing(true);
    setShowView(false);
    setShowForm(true);
  };
  const handleView = (p: Pedido) => {
    setCurrentPedido(p);
    setShowView(true);
  };
  const handleDelete = (p: Pedido) => {
    setCurrentPedido(p);
    setShowDeleteAlert(true);
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (isEditing && currentPedido) {
        await makeRequest(`/api/pedidos/${currentPedido.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast({ title: "Pedido atualizado", description: "Pedido atualizado com sucesso" });
      } else {
        await makeRequest(`/api/pedidos`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({ title: "Pedido criado", description: "Pedido criado com sucesso" });
      }
      setSelectedIds([]);
      await loadPedidos();
      setShowForm(false);
    } catch (error: any) {
      const list = readLocalPedidos();
      const now = new Date().toISOString();
      if (isEditing && currentPedido) {
        const idx = list.findIndex((x) => x.id === currentPedido.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...data, data_atualizacao: now } as any;
        toast({ title: "Pedido atualizado", description: "Pedido atualizado (local)" });
      } else {
        const novo: Pedido = {
          id: Date.now(),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          estabelecimento_id: data.estabelecimento_id,
          cliente_id: data.cliente_id ?? null,
          codigo: data.codigo,
          tipo_pedido: data.tipo_pedido,
          valor_total_centavos: data.valor_total_centavos,
          data_hora_finalizado: data.data_hora_finalizado ?? null,
          observacao: data.observacao || null,
          status: data.status || "Pendente",
          data_cadastro: now,
          data_atualizacao: now,
        } as any;
        list.unshift(novo);
        toast({ title: "Pedido criado", description: "Pedido criado (local)" });
      }
      writeLocalPedidos(list);
      setPedidos(list);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleFinalize = async (p: Pedido) => {
    try {
      await makeRequest(`/api/pedidos/${p.id}/finalizar`, { method: "PATCH" });
      toast({ title: "Pedido finalizado", description: "Status alterado para Finalizado" });
      loadPedidos();
    } catch {
      const list = readLocalPedidos();
      const idx = list.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        list[idx].status = "Finalizado" as any;
        list[idx].data_hora_finalizado = new Date().toISOString();
        writeLocalPedidos(list);
        setPedidos(list);
        toast({ title: "Pedido finalizado", description: "Status alterado (local)" });
      }
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!currentPedido) return;
    try {
      await makeRequest(`/api/pedidos/${currentPedido.id}`, { method: "DELETE" });
      toast({ title: "Pedido excluído", description: "Pedido excluído com sucesso" });
      setSelectedIds([]);
      await loadPedidos();
      setShowDeleteAlert(false);
    } catch (error: any) {
      const list = readLocalPedidos().filter((e) => e.id !== currentPedido.id);
      writeLocalPedidos(list);
      setPedidos(list);
      toast({ title: "Pedido excluído", description: "Pedido excluído (local)" });
      setSelectedIds([]);
      setShowDeleteAlert(false);
    }
  };

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter((p) => activeTab === "Todos" || p.status === activeTab);
  }, [pedidos, activeTab]);

  return (
    <div className="flex h-screen bg-foodmax-gray-bg">
      <div className={`${sidebarOpen ? "w-64" : "w-16"} bg-white shadow-lg transition-all duration-300 flex flex-col h-full`}>
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-foodmax-red rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                {sidebarOpen && (
                  <div className="ml-3">
                    <h1 className="font-bold text-lg text-gray-800">FoodMax</h1>
                  </div>
                )}
              </div>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100">
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
          {sidebarOpen && (
            <div className="px-4 py-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">PRINCIPAL</span>
            </div>
          )}
          <nav className="mt-2 pb-4">{menuItems.map((item, index) => renderMenuItem(item, index))}</nav>
        </div>
        <div className="bg-white border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center px-4 py-4">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">A</span>
            </div>
            {sidebarOpen && (
              <div className="ml-3 flex-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Ana</p>
                  <p className="text-xs text-gray-500">Administrador</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex items-center gap-1 text-sm text-gray-700 hover:text-foodmax-orange"
                  title="Sair"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-foodmax-gray-bg px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Pedidos</h2>
              <p className="text-gray-600 mt-1">Gerencie os pedidos por status.</p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="w-full">
              <div className="w-full border-b border-gray-200">
                <div className="flex items-center gap-6">
                  {["Todos", "Pendente", "Finalizado", "Cancelado"].map((st) => (
                    <div key={st} className="flex items-center gap-6">
                      <button
                        className={`relative -mb-px pb-2 pt-1 text-base flex items-center gap-2 ${
                          activeTab === (st as any) ? "text-foodmax-orange" : "text-gray-700 hover:text-gray-900"
                        }`}
                        onClick={() => setActiveTab(st as any)}
                      >
                        <span>{st}</span>
                        <span
                          className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${
                            activeTab === (st as any) ? "bg-orange-100 text-foodmax-orange" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {st === "Todos" ? totalRecords : pedidos.filter((p) => p.status === st).length}
                        </span>
                        {activeTab === (st as any) && (
                          <span className="absolute -bottom-[1px] left-0 right-0 h-[3px] bg-foodmax-orange" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar registros..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="foodmax-input pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => setShowBulkDelete(true)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Selecionados ({selectedIds.length})
                    </Button>
                  )}
                  <Button onClick={handleNew} className="bg-foodmax-orange text-white hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo
                  </Button>
                </div>
              </div>
            </div>

            <DataGrid
              columns={gridColumns}
              data={filteredPedidos}
              loading={loading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              searchTerm={searchTerm}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={filteredPedidos.length}
              onPageChange={handlePageChange}
              showActions={false}
            />
          </div>
        </main>
      </div>

      <PedidoForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setCurrentPedido(null);
          setIsEditing(false);
        }}
        onSave={handleSave}
        pedido={currentPedido}
        isLoading={formLoading}
      />

      <PedidoView
        isOpen={showView}
        onClose={() => {
          setShowView(false);
          setCurrentPedido(null);
        }}
        onEdit={(p) => handleEdit(p as any)}
        pedido={currentPedido as any}
      />

      <DeleteAlert
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleDeleteConfirmed}
        itemName={currentPedido?.codigo}
        isLoading={false}
      />

      <BulkDeleteAlert
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={async () => {
          try {
            await makeRequest(`/api/pedidos/bulk-delete`, {
              method: "POST",
              body: JSON.stringify({ ids: selectedIds }),
            });
            toast({
              title: "Pedidos excluídos",
              description: `${selectedIds.length} registro(s) excluído(s) com sucesso`,
            });
            await loadPedidos();
            setSelectedIds([]);
            setShowBulkDelete(false);
          } catch (error: any) {
            const list = readLocalPedidos().filter((e) => !selectedIds.includes(e.id));
            writeLocalPedidos(list);
            setPedidos(list);
            toast({ title: "Exclusão concluída localmente", description: `${selectedIds.length} registro(s) removido(s)` });
            setSelectedIds([]);
            setShowBulkDelete(false);
          }
        }}
        selectedCount={selectedIds.length}
      />
    </div>
  );
}
