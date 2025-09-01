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
  ShoppingBag,
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
  TIPOS_PEDIDO,
  STATUS_PEDIDO,
} from "@shared/pedidos";
import PedidoForm from "./PedidoForm";
import PedidoView from "./PedidoView";
import {
  BulkDeleteAlert,
  DeleteAlert,
} from "@/components/alert-dialog-component";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";

export default function PedidosModule() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, getUserRole, hasPayment } = useAuth();
  const { makeRequest } = useAuthenticatedRequest();

  const tabs: (StatusPedido | "Todos")[] = [
    "Todos",
    "Pendente",
    "Finalizado",
    "Cancelado",
  ];
  const [activeTab, setActiveTab] = useState<StatusPedido | "Todos">("Todos");

  type TabState = { search: string; page: number };
  const [tabState, setTabState] = useState<Record<string, TabState>>({
    Todos: { search: "", page: 1 },
    Pendente: { search: "", page: 1 },
    Finalizado: { search: "", page: 1 },
    Cancelado: { search: "", page: 1 },
  });
  const currentSearch = tabState[activeTab]?.search ?? "";
  const currentPage = tabState[activeTab]?.page ?? 1;
  const setCurrentSearch = (val: string) =>
    setTabState((s) => ({
      ...s,
      [activeTab]: { ...s[activeTab], search: val, page: 1 },
    }));
  const setCurrentPage = (page: number) =>
    setTabState((s) => ({ ...s, [activeTab]: { ...s[activeTab], page } }));

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [totalCounts, setTotalCounts] = useState<Record<string, number>>({
    Todos: 0,
    Pendente: 0,
    Finalizado: 0,
    Cancelado: 0,
  });
  const pageSize = 10;

  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);

  const [estabelecimentosMap, setEstabelecimentosMap] = useState<
    Map<number, string>
  >(new Map());

  const LOCAL_PEDIDOS = "fm_pedidos";
  const readLocalPedidos = (): Pedido[] => {
    try {
      const raw = localStorage.getItem(LOCAL_PEDIDOS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const writeLocalPedidos = (list: Pedido[]) =>
    localStorage.setItem(LOCAL_PEDIDOS, JSON.stringify(list));

  const menuItems = [
    { icon: Home, label: "Dashboard", route: "/dashboard" },
    { icon: Store, label: "Estabelecimentos", route: "/estabelecimentos" },
    { icon: Users, label: "Clientes", route: "/clientes" },
    { icon: Truck, label: "Fornecedores", route: "/fornecedores" },
    { icon: List, label: "Itens", route: "/itens" },
    { icon: Utensils, label: "Cardápios", route: "/cardapios" },
    { icon: ShoppingBag, label: "Pedidos", route: "/pedidos" },
  ];
  const renderMenuItem = (item: any, index: number) => {
    const isActive = location.pathname === item.route;
    return (
      <Link
        key={index}
        to={item.route}
        className={`w-full flex items-center px-4 py-2 text-left transition-colors ${isActive ? "bg-orange-50 text-foodmax-orange border-r-4 border-foodmax-orange" : "text-gray-700 hover:bg-gray-100"}`}
      >
        <item.icon className={`w-4 h-4 ${item.label === "Pedidos" ? "text-gray-700" : ""}`} />
        {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
      </Link>
    );
  };

  const gridColumns = useMemo(
    () => [
      {
        key: "estabelecimento_nome",
        label: "Estabelecimento",
        sortable: false,
        render: (v: any, r: any) => r.estabelecimento_nome || "-",
      },
      { key: "codigo", label: "Código", sortable: true },
      {
        key: "tipo_pedido",
        label: "Tipo",
        sortable: true,
        render: (v: any) => (
          <Badge className={getTipoPedidoColor(v)}>{v}</Badge>
        ),
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
        render: (v: string | null) =>
          v ? new Date(v).toLocaleString("pt-BR") : "-",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v: any) => (
          <Badge className={getStatusPedidoColor(v)}>{v}</Badge>
        ),
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

  const enrichWithEstabelecimentoNome = (list: Pedido[]) => {
    if (!estabelecimentosMap || estabelecimentosMap.size === 0)
      return list as any;
    return list.map((p: any) => ({
      ...p,
      estabelecimento_nome:
        p.estabelecimento_nome ||
        estabelecimentosMap.get(p.estabelecimento_id) ||
        p.estabelecimento_nome,
    }));
  };

  const loadEstabelecimentosMap = useCallback(async () => {
    try {
      const resp = await makeRequest(`/api/estabelecimentos?page=1&limit=1000`);
      const map = new Map<number, string>();
      if (Array.isArray(resp?.data)) {
        resp.data.forEach((e: any) => map.set(e.id, e.nome));
      } else {
        try {
          const local = JSON.parse(
            localStorage.getItem("fm_estabelecimentos") || "[]",
          );
          (local || []).forEach((e: any) => map.set(e.id, e.nome));
        } catch {}
      }
      setEstabelecimentosMap(map);
    } catch {}
  }, [makeRequest]);

  const loadCounts = useCallback(async () => {
    try {
      const requests = [
        makeRequest(`/api/pedidos?page=1&limit=1`),
        makeRequest(`/api/pedidos?page=1&limit=1&status=Pendente`),
        makeRequest(`/api/pedidos?page=1&limit=1&status=Finalizado`),
        makeRequest(`/api/pedidos?page=1&limit=1&status=Cancelado`),
      ];
      let [allResp, pendResp, finResp, cancResp] = await Promise.all(
        requests.map((p) => p.catch(() => null)),
      );

      if (allResp || pendResp || finResp || cancResp) {
        setTotalCounts({
          Todos: allResp?.pagination?.total || 0,
          Pendente: pendResp?.pagination?.total || 0,
          Finalizado: finResp?.pagination?.total || 0,
          Cancelado: cancResp?.pagination?.total || 0,
        });
        return;
      }

      const local = readLocalPedidos();
      setTotalCounts({
        Todos: local.length,
        Pendente: local.filter((p) => p.status === "Pendente").length,
        Finalizado: local.filter((p) => p.status === "Finalizado").length,
        Cancelado: local.filter((p) => p.status === "Cancelado").length,
      });
    } catch {}
  }, [makeRequest]);

  const loadPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(currentSearch && { search: currentSearch }),
        ...(activeTab !== "Todos" && { status: activeTab }),
      });
      let response: PedidosListResponse | null = null;
      try {
        response = await makeRequest(`/api/pedidos?${params}`);
      } catch {
        response = null;
      }
      if (response) {
        const data = enrichWithEstabelecimentoNome(response.data as any);
        setPedidos(data as any);
      } else {
        const local = readLocalPedidos();
        const filtered = local
          .filter((p) => activeTab === "Todos" || p.status === activeTab)
          .filter(
            (p) =>
              !currentSearch ||
              p.codigo.toLowerCase().includes(currentSearch.toLowerCase()),
          );
        setPedidos(enrichWithEstabelecimentoNome(filtered) as any);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, activeTab, makeRequest, estabelecimentosMap]);

  useEffect(() => {
    loadEstabelecimentosMap();
    loadCounts();
  }, [loadEstabelecimentosMap, loadCounts]);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const handleSearch = (value: string) => {
    setCurrentSearch(value);
  };
  const handlePageChange = (page: number) => setCurrentPage(page);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [currentPedido, setCurrentPedido] = useState<Pedido | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

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

  const refreshAfterMutation = async () => {
    await Promise.all([loadPedidos(), loadCounts()]);
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (isEditing && currentPedido) {
        await makeRequest(`/api/pedidos/${currentPedido.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast({
          title: "Pedido atualizado",
          description: "Pedido atualizado com sucesso",
        });
      } else {
        await makeRequest(`/api/pedidos`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({
          title: "Pedido criado",
          description: "Pedido criado com sucesso",
        });
      }
      setSelectedIds([]);
      await refreshAfterMutation();
      setShowForm(false);
    } catch (error: any) {
      const list = readLocalPedidos();
      const now = new Date().toISOString();
      if (isEditing && currentPedido) {
        const idx = list.findIndex((x) => x.id === currentPedido.id);
        if (idx >= 0)
          list[idx] = { ...list[idx], ...data, data_atualizacao: now } as any;
        toast({
          title: "Pedido atualizado",
          description: "Pedido atualizado (local)",
        });
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
      setPedidos(enrichWithEstabelecimentoNome(list) as any);
      await loadCounts();
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleFinalize = async (p: Pedido) => {
    try {
      await makeRequest(`/api/pedidos/${p.id}/finalizar`, { method: "PATCH" });
      toast({
        title: "Pedido finalizado",
        description: "Status alterado para Finalizado",
      });
      await refreshAfterMutation();
    } catch {
      const list = readLocalPedidos();
      const idx = list.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        list[idx].status = "Finalizado" as any;
        list[idx].data_hora_finalizado = new Date().toISOString();
        writeLocalPedidos(list);
        setPedidos(enrichWithEstabelecimentoNome(list) as any);
        toast({
          title: "Pedido finalizado",
          description: "Status alterado (local)",
        });
        await loadCounts();
      }
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!currentPedido) return;
    try {
      await makeRequest(`/api/pedidos/${currentPedido.id}`, {
        method: "DELETE",
      });
      toast({
        title: "Pedido excluído",
        description: "Pedido excluído com sucesso",
      });
      setSelectedIds([]);
      await refreshAfterMutation();
      setShowDeleteAlert(false);
    } catch (error: any) {
      const list = readLocalPedidos().filter((e) => e.id !== currentPedido.id);
      writeLocalPedidos(list);
      setPedidos(enrichWithEstabelecimentoNome(list) as any);
      toast({
        title: "Pedido excluído",
        description: "Pedido excluído (local)",
      });
      setSelectedIds([]);
      await loadCounts();
      setShowDeleteAlert(false);
    }
  };

  const filteredPedidos = useMemo(() => {
    return pedidos.filter(
      (p) => activeTab === "Todos" || p.status === activeTab,
    );
  }, [pedidos, activeTab]);

  const getAllPedidosForExport = async (): Promise<any[]> => {
    try {
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      const resp = await makeRequest(`/api/pedidos?${params}`);
      const data = Array.isArray(resp?.data) ? resp.data : [];
      return enrichWithEstabelecimentoNome(data as any);
    } catch {
      return enrichWithEstabelecimentoNome(readLocalPedidos() as any);
    }
  };

  const handleImportPedidos = async (records: any[]) => {
    try {
      const estMap = estabelecimentosMap;
      const now = new Date().toISOString();
      const valid: Pedido[] = [];
      for (const r of records) {
        const nomeEst = String(
          r.estabelecimento_nome || r.estabelecimento || "",
        ).trim();
        const estId = nomeEst
          ? Array.from(estMap.entries()).find(
              ([, nome]) => nome.toLowerCase() === nomeEst.toLowerCase(),
            )?.[0]
          : Number(r.estabelecimento_id || r.id_estabelecimento || 0);
        if (!estId) continue;

        const tipo = String(r.tipo_pedido || "").trim() as any;
        if (!TIPOS_PEDIDO.includes(tipo)) continue;
        const status = String(r.status || "Pendente").trim() as any;
        if (!STATUS_PEDIDO.includes(status)) continue;

        const valor = Number(
          String(r.valor_total || r.valor_total_centavos || 0)
            .toString()
            .replace(/\./g, "")
            .replace(/,/g, "."),
        );
        const valor_centavos = Number.isFinite(valor)
          ? Math.round(
              String(r.valor_total).includes(",") ||
                String(r.valor_total).includes(".")
                ? valor * 100
                : Number(r.valor_total_centavos || valor),
            )
          : 0;

        const novo: Pedido = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          estabelecimento_id: estId,
          cliente_id: null,
          codigo:
            String(r.codigo || "").trim() ||
            `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          tipo_pedido: tipo,
          valor_total_centavos: valor_centavos,
          data_hora_finalizado: r.data_hora_finalizado
            ? new Date(r.data_hora_finalizado).toISOString()
            : null,
          observacao: r.observacao || null,
          status: status,
          data_cadastro: now,
          data_atualizacao: now,
        } as any;
        (novo as any).estabelecimento_nome = estMap.get(estId);
        valid.push(novo);
      }

      if (valid.length === 0) {
        return {
          success: true,
          imported: 0,
          message: "Nenhum registro válido",
        } as any;
      }

      const existing = readLocalPedidos();
      const merged = [...valid, ...existing];
      writeLocalPedidos(merged);
      setPedidos(enrichWithEstabelecimentoNome(merged) as any);
      await loadCounts();
      return {
        success: true,
        imported: valid.length,
        message: `${valid.length} pedido(s) importado(s) (local)`,
      } as any;
    } catch (e) {
      return {
        success: false,
        imported: 0,
        message: "Erro ao importar",
      } as any;
    }
  };

  return (
    <div className="flex h-screen bg-foodmax-gray-bg">
      <div
        className={`${sidebarOpen ? "w-64" : "w-16"} bg-white shadow-lg transition-all duration-300 flex flex-col h-full`}
      >
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
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
          {sidebarOpen && (
            <div className="px-4 py-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                PRINCIPAL
              </span>
            </div>
          )}
          <nav className="mt-2 pb-4">
            {menuItems.map((item, index) => renderMenuItem(item, index))}
          </nav>
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
              <p className="text-gray-600 mt-1">
                Gerencie os pedidos por status.
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="w-full">
              <div className="w-full border-b border-gray-200">
                <div className="flex items-center gap-6">
                  {tabs.map((st) => (
                    <div key={st} className="flex items-center gap-6">
                      <button
                        className={`relative -mb-px pb-2 pt-1 text-base flex items-center gap-2 ${
                          activeTab === (st as any)
                            ? "text-foodmax-orange"
                            : "text-gray-700 hover:text-gray-900"
                        }`}
                        onClick={() => setActiveTab(st as any)}
                      >
                        <span>{st}</span>
                        <span
                          className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${
                            activeTab === (st as any)
                              ? "bg-orange-100 text-foodmax-orange"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {totalCounts[st] ?? 0}
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
                    value={currentSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="foodmax-input pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDelete(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Selecionados ({selectedIds.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImport(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const data = await getAllPedidosForExport();
                      setExportData(data);
                      setShowExport(true);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                  <Button
                    onClick={handleNew}
                    className="bg-foodmax-orange text-white hover:bg-orange-600"
                  >
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
              searchTerm={currentSearch}
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

      <ExportModal
        isOpen={showExport}
        onClose={() => {
          setShowExport(false);
          setExportData([]);
        }}
        data={exportData}
        selectedIds={selectedIds}
        moduleName="Pedidos"
        columns={[
          { key: "estabelecimento_nome", label: "Estabelecimento" },
          { key: "codigo", label: "Código" },
          { key: "tipo_pedido", label: "Tipo de Pedido" },
          { key: "valor_total_centavos", label: "Valor Total (centavos)" },
          { key: "status", label: "Status" },
          { key: "data_hora_finalizado", label: "Data/Hora Finalizado" },
          { key: "data_cadastro", label: "Data Cadastro" },
          { key: "data_atualizacao", label: "Data Atualização" },
        ]}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName="Pedidos"
        userRole={getUserRole()}
        hasPayment={hasPayment()}
        columns={[
          {
            key: "estabelecimento_nome",
            label: "Estabelecimento",
            required: true,
          },
          { key: "codigo", label: "Código", required: false },
          { key: "tipo_pedido", label: "Tipo de Pedido", required: true },
          { key: "valor_total", label: "Valor Total" },
          { key: "valor_total_centavos", label: "Valor Total (centavos)" },
          { key: "status", label: "Status" },
          { key: "data_hora_finalizado", label: "Data/Hora Finalizado" },
          { key: "observacao", label: "Observação" },
        ]}
        mapHeader={(h) => {
          const n = h.trim().toLowerCase();
          const map: Record<string, string> = {
            estabelecimento: "estabelecimento_nome",
            "estabelecimento nome": "estabelecimento_nome",
            código: "codigo",
            codigo: "codigo",
            tipo: "tipo_pedido",
            "tipo de pedido": "tipo_pedido",
            valor: "valor_total",
            "valor total": "valor_total",
            "valor total (centavos)": "valor_total_centavos",
            status: "status",
            observação: "observacao",
            observacao: "observacao",
            "data/hora finalizado": "data_hora_finalizado",
          };
          return map[n] || n.replace(/\s+/g, "_");
        }}
        validateRecord={(r) => {
          const errors: string[] = [];
          if (!r.estabelecimento_nome && !r.estabelecimento_id)
            errors.push("Estabelecimento é obrigatório");
          const tipo = String(r.tipo_pedido || "").trim();
          if (!tipo) errors.push("Tipo de Pedido é obrigatório");
          else if (!TIPOS_PEDIDO.includes(tipo as any))
            errors.push(`Tipo inválido: '${tipo}'`);
          const status = String(r.status || "Pendente").trim();
          if (status && !STATUS_PEDIDO.includes(status as any))
            errors.push(`Status inválido: '${status}'`);
          return errors;
        }}
        onImport={handleImportPedidos}
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
            await refreshAfterMutation();
            setSelectedIds([]);
            setShowBulkDelete(false);
          } catch (error: any) {
            const list = readLocalPedidos().filter(
              (e) => !selectedIds.includes(e.id),
            );
            writeLocalPedidos(list);
            setPedidos(enrichWithEstabelecimentoNome(list) as any);
            toast({
              title: "Exclusão concluída localmente",
              description: `${selectedIds.length} registro(s) removido(s)`,
            });
            setSelectedIds([]);
            await loadCounts();
            setShowBulkDelete(false);
          }
        }}
        selectedCount={selectedIds.length}
      />
    </div>
  );
}
