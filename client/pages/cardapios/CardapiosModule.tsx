import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Home,
  Store,
  Users,
  Truck,
  List,
  Search,
  Plus,
  Trash2,
  Eye,
  Edit,
  Power,
  Upload,
  Download,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/data-grid";
import { toast } from "@/hooks/use-toast";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Cardapio,
  CardapiosListResponse,
  formatCurrencyBRL,
  getTipoCardapioColor,
  TIPOS_CARDAPIO,
  TipoCardapio,
} from "@shared/cardapios";
import CardapioForm from "./CardapioForm";
import CardapioView from "./CardapioView";
import {
  DeleteAlert,
  BulkDeleteAlert,
} from "@/components/alert-dialog-component";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";

export default function CardapiosModule() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isLoading, getUserRole, hasPayment } = useAuth();
  const { makeRequest } = useAuthenticatedRequest();

  const [activeTab, setActiveTab] = useState<TipoCardapio | "Todos">("Todos");

  const [cardapios, setCardapios] = useState<
    (Cardapio & { qtde_itens: number })[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  const LOCAL_CARDAPIOS = "fm_cardapios";
  const LOCAL_CARDAPIOS_ITENS = "fm_cardapios_itens";
  const readLocalCardapios = (): (Cardapio & { qtde_itens: number })[] => {
    try {
      const raw = localStorage.getItem(LOCAL_CARDAPIOS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const writeLocalCardapios = (list: (Cardapio & { qtde_itens: number })[]) =>
    localStorage.setItem(LOCAL_CARDAPIOS, JSON.stringify(list));
  const readLocalCardapiosItens = (): Record<string, any[]> => {
    try {
      const raw = localStorage.getItem(LOCAL_CARDAPIOS_ITENS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const writeLocalCardapiosItens = (map: Record<string, any[]>) =>
    localStorage.setItem(LOCAL_CARDAPIOS_ITENS, JSON.stringify(map));

  useEffect(() => {
    try {
      localStorage.removeItem(LOCAL_CARDAPIOS);
    } catch {}
  }, []);

  const menuItems = [
    { icon: Home, label: "Dashboard", route: "/dashboard" },
    { icon: Store, label: "Estabelecimentos", route: "/estabelecimentos" },
    { icon: Users, label: "Clientes", route: "/clientes" },
    { icon: Truck, label: "Fornecedores", route: "/fornecedores" },
    { icon: List, label: "Itens", route: "/itens" },
    { icon: Utensils, label: "Cardápios", route: "/cardapios" },
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
      { key: "nome", label: "Nome", sortable: true },
      { key: "qtde_itens", label: "Qtde Itens", sortable: true },
      {
        key: "preco_total_centavos",
        label: "Preço Total",
        sortable: true,
        render: (v: number) => formatCurrencyBRL(v),
      },
      {
        key: "tipo_cardapio",
        label: "Tipo",
        sortable: true,
        render: (value: TipoCardapio) => (
          <Badge className={getTipoCardapioColor(value)}>{value}</Badge>
        ),
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        render: (value: boolean) => (
          <Badge
            className={
              value
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }
          >
            {value ? "Ativo" : "Inativo"}
          </Badge>
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
        render: (_: any, r: Cardapio & { qtde_itens: number }) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleStatus(r)}
              className={`h-8 w-8 p-0 rounded-full border ${r.ativo ? "bg-green-50 hover:bg-green-100 border-green-200" : "bg-gray-50 hover:bg-gray-100 border-gray-200"}`}
              title={r.ativo ? "Desativar" : "Ativar"}
            >
              <Power
                className={`w-4 h-4 ${r.ativo ? "text-green-600" : "text-gray-500"}`}
              />
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

  const loadCardapios = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(searchTerm && { search: searchTerm }),
        ...(activeTab !== "Todos" && { tipo: activeTab }),
      });
      let response: CardapiosListResponse | null = null;
      try {
        response = await makeRequest(`/api/cardapios?${params}`);
      } catch {
        response = null;
      }
      if (response) {
        setCardapios(response.data as (Cardapio & { qtde_itens: number })[]);
        setTotalRecords(response.pagination.total);
      } else {
        const local = readLocalCardapios();
        const filtered = local.filter(
          (c) =>
            (activeTab === "Todos" || c.tipo_cardapio === activeTab) &&
            (!searchTerm ||
              c.nome.toLowerCase().includes(searchTerm.toLowerCase())),
        );
        setCardapios(filtered);
        setTotalRecords(filtered.length);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, activeTab, makeRequest]);

  useEffect(() => {
    if (isLoading) return;
    loadCardapios();
  }, [loadCardapios, isLoading]);

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
  const [currentCardapio, setCurrentCardapio] = useState<Cardapio | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleNew = () => {
    setCurrentCardapio(null);
    setIsEditing(false);
    setShowForm(true);
  };
  const handleEdit = (c: Cardapio) => {
    setCurrentCardapio(c);
    setIsEditing(true);
    setShowView(false);
    setShowForm(true);
  };
  const handleView = (c: Cardapio) => {
    setCurrentCardapio(c);
    setShowView(true);
  };
  const handleDelete = (c: Cardapio) => {
    setCurrentCardapio(c);
    setShowDeleteAlert(true);
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (isEditing && currentCardapio) {
        await makeRequest(`/api/cardapios/${currentCardapio.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast({
          title: "Cardápio atualizado",
          description: "Cardápio atualizado com sucesso",
        });
      } else {
        await makeRequest(`/api/cardapios`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({
          title: "Cardápio criado",
          description: "Cardápio criado com sucesso",
        });
      }
      try {
        localStorage.removeItem(LOCAL_CARDAPIOS);
      } catch {}
      setSelectedIds([]);
      await loadCardapios();
      setShowForm(false);
    } catch (error: any) {
      // local fallback
      const list = readLocalCardapios();
      const now = new Date().toISOString();
      if (isEditing && currentCardapio) {
        const idx = list.findIndex((x) => x.id === currentCardapio.id);
        if (idx >= 0)
          list[idx] = { ...list[idx], ...data, data_atualizacao: now } as any;
        // persist itens locamente se enviados
        if (data.itens) {
          const map = readLocalCardapiosItens();
          map[String(currentCardapio.id)] = data.itens;
          writeLocalCardapiosItens(map);
        }
        toast({
          title: "Cardápio atualizado",
          description: "Cardápio atualizado com sucesso",
        });
      } else {
        const quantidade_total =
          data.itens?.reduce(
            (sum: number, item: any) => sum + item.quantidade,
            0,
          ) || 0;
        const qtde_itens = data.itens?.length || 0;
        const novo: Cardapio & { qtde_itens: number } = {
          id: Date.now(),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          nome: data.nome,
          tipo_cardapio: data.tipo_cardapio,
          quantidade_total,
          preco_itens_centavos: data.preco_itens_centavos || 0,
          margem_lucro_percentual: data.margem_lucro_percentual,
          preco_total_centavos: data.preco_total_centavos,
          descricao: data.descricao,
          ativo: data.ativo ?? true,
          data_cadastro: now,
          data_atualizacao: now,
          qtde_itens,
        } as any;
        list.unshift(novo);
        // salvar itens deste cardápio localmente para visualização
        const map = readLocalCardapiosItens();
        map[String(novo.id)] = data.itens || [];
        writeLocalCardapiosItens(map);
        toast({
          title: "Cardápio criado",
          description: "Cardápio criado com sucesso",
        });
      }
      writeLocalCardapios(list);
      setCardapios(list);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (c: Cardapio) => {
    try {
      await makeRequest(`/api/cardapios/${c.id}/toggle-status`, {
        method: "PATCH",
      });
      toast({
        title: `Cardápio ${c.ativo ? "desativado" : "ativado"}`,
        description: `Cardápio ${c.ativo ? "desativado" : "ativado"} com sucesso`,
      });
      loadCardapios();
    } catch {
      const list = readLocalCardapios();
      const idx = list.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        list[idx].ativo = !list[idx].ativo;
        list[idx].data_atualizacao = new Date().toISOString();
        writeLocalCardapios(list);
        setCardapios(list);
        toast({
          title: "Status atualizado",
          description: "Status atualizado com sucesso",
        });
      }
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!currentCardapio) return;
    try {
      await makeRequest(`/api/cardapios/${currentCardapio.id}`, {
        method: "DELETE",
      });
      toast({
        title: "Cardápio excluído",
        description: "Cardápio excluído com sucesso",
      });
      try {
        localStorage.removeItem(LOCAL_CARDAPIOS);
      } catch {}
      setSelectedIds([]);
      await loadCardapios();
      setShowDeleteAlert(false);
    } catch (error: any) {
      const list = readLocalCardapios().filter(
        (e) => e.id !== currentCardapio.id,
      );
      writeLocalCardapios(list);
      setCardapios(list);
      toast({
        title: "Cardápio excluído",
        description: "Cardápio excluído com sucesso",
      });
      setSelectedIds([]);
      setShowDeleteAlert(false);
    }
  };

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const filteredCardapios = useMemo(() => {
    return cardapios.filter(
      (c) => activeTab === "Todos" || c.tipo_cardapio === activeTab,
    );
  }, [cardapios, activeTab]);

  const getCardapiosWithItemsForExport = async () => {
    const cardapiosToExport = selectedIds.length > 0
      ? filteredCardapios.filter(c => selectedIds.includes(c.id))
      : filteredCardapios;

    const exportData = [];
    for (const cardapio of cardapiosToExport) {
      try {
        const response = await makeRequest(`/api/cardapios/${cardapio.id}`);
        const cardapioDetalhado = response;

        if (cardapioDetalhado.itens && cardapioDetalhado.itens.length > 0) {
          for (const item of cardapioDetalhado.itens) {
            exportData.push({
              nome: cardapio.nome,
              tipo_cardapio: cardapio.tipo_cardapio,
              quantidade_total: cardapio.quantidade_total,
              preco_itens: (cardapio.preco_itens_centavos / 100).toFixed(2),
              margem_lucro: cardapio.margem_lucro_percentual,
              preco_total: (cardapio.preco_total_centavos / 100).toFixed(2),
              descricao: cardapio.descricao || "",
              status: cardapio.ativo ? "Ativo" : "Inativo",
              data_cadastro: new Date(cardapio.data_cadastro).toLocaleDateString("pt-BR"),
              data_atualizacao: new Date(cardapio.data_atualizacao).toLocaleDateString("pt-BR"),
              item_nome: item.item_nome,
              item_quantidade: item.quantidade,
              item_valor_unitario: (item.valor_unitario_centavos / 100).toFixed(2),
            });
          }
        } else {
          // Cardápio sem itens
          exportData.push({
            nome: cardapio.nome,
            tipo_cardapio: cardapio.tipo_cardapio,
            quantidade_total: cardapio.quantidade_total,
            preco_itens: (cardapio.preco_itens_centavos / 100).toFixed(2),
            margem_lucro: cardapio.margem_lucro_percentual,
            preco_total: (cardapio.preco_total_centavos / 100).toFixed(2),
            descricao: cardapio.descricao || "",
            status: cardapio.ativo ? "Ativo" : "Inativo",
            data_cadastro: new Date(cardapio.data_cadastro).toLocaleDateString("pt-BR"),
            data_atualizacao: new Date(cardapio.data_atualizacao).toLocaleDateString("pt-BR"),
            item_nome: "",
            item_quantidade: "",
            item_valor_unitario: "",
          });
        }
      } catch {
        // Fallback to basic data if detailed fetch fails
        exportData.push({
          nome: cardapio.nome,
          tipo_cardapio: cardapio.tipo_cardapio,
          quantidade_total: cardapio.quantidade_total,
          preco_itens: (cardapio.preco_itens_centavos / 100).toFixed(2),
          margem_lucro: cardapio.margem_lucro_percentual,
          preco_total: (cardapio.preco_total_centavos / 100).toFixed(2),
          descricao: cardapio.descricao || "",
          status: cardapio.ativo ? "Ativo" : "Inativo",
          data_cadastro: new Date(cardapio.data_cadastro).toLocaleDateString("pt-BR"),
          data_atualizacao: new Date(cardapio.data_atualizacao).toLocaleDateString("pt-BR"),
          item_nome: "",
          item_quantidade: "",
          item_valor_unitario: "",
        });
      }
    }
    return exportData;
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
              <h2 className="text-2xl font-semibold text-gray-800">
                Cardápios
              </h2>
              <p className="text-gray-600 mt-1">
                Gerencie seus cardápios por tipo.
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="w-full">
              <div className="w-full border-b border-gray-200">
                <div className="flex items-center gap-6">
                  {["Todos", ...TIPOS_CARDAPIO].map((tipo, idx, arr) => (
                    <div key={tipo} className="flex items-center gap-6">
                      <button
                        className={`relative -mb-px pb-2 pt-1 text-base flex items-center gap-2 ${
                          activeTab === tipo
                            ? "text-foodmax-orange"
                            : "text-gray-700 hover:text-gray-900"
                        }`}
                        onClick={() =>
                          setActiveTab(tipo as TipoCardapio | "Todos")
                        }
                      >
                        <span>{tipo}</span>
                        <span
                          className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${activeTab === tipo ? "bg-orange-100 text-foodmax-orange" : "bg-gray-100 text-gray-600"}`}
                        >
                          {tipo === "Todos"
                            ? totalRecords
                            : cardapios.filter((c) => c.tipo_cardapio === tipo)
                                .length}
                        </span>
                        {activeTab === tipo && (
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
                    onClick={() => setShowExport(true)}
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
              data={filteredCardapios}
              loading={loading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              searchTerm={searchTerm}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={filteredCardapios.length}
              onPageChange={handlePageChange}
              showActions={false}
            />
          </div>
        </main>
      </div>

      <CardapioForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setCurrentCardapio(null);
          setIsEditing(false);
        }}
        onSave={handleSave}
        cardapio={currentCardapio}
        isLoading={formLoading}
      />

      <CardapioView
        isOpen={showView}
        onClose={() => {
          setShowView(false);
          setCurrentCardapio(null);
        }}
        onEdit={(c) => handleEdit(c)}
        cardapio={currentCardapio}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={await getCardapiosWithItemsForExport()}
        selectedIds={selectedIds}
        moduleName="Cardápios"
        columns={[
          { key: "nome", label: "Nome" },
          { key: "tipo_cardapio", label: "Tipo de Cardápio" },
          { key: "quantidade_total", label: "Quantidade Total" },
          { key: "preco_itens", label: "Preço dos Itens" },
          { key: "margem_lucro", label: "Margem de Lucro" },
          { key: "preco_total", label: "Preço Total" },
          { key: "descricao", label: "Descrição" },
          { key: "status", label: "Status" },
          { key: "data_cadastro", label: "Data Cadastro" },
          { key: "data_atualizacao", label: "Data Atualização" },
          { key: "item_nome", label: "Item Nome" },
          { key: "item_quantidade", label: "Item Quantidade" },
          { key: "item_valor_unitario", label: "Item Valor Unitario" },
        ]}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName="Cardápios"
        userRole={getUserRole()}
        hasPayment={hasPayment()}
        columns={[
          { key: "nome", label: "Nome", required: true },
          { key: "tipo_cardapio", label: "Tipo de Cardápio", required: true },
          { key: "quantidade_total", label: "Quantidade Total" },
          { key: "preco_itens", label: "Preço dos Itens" },
          { key: "margem_lucro", label: "Margem de Lucro", required: true },
          { key: "preco_total", label: "Preço Total", required: true },
          { key: "descricao", label: "Descrição" },
          { key: "status", label: "Status" },
          { key: "data_cadastro", label: "Data Cadastro" },
          { key: "data_atualizacao", label: "Data Atualização" },
          { key: "item_nome", label: "Item Nome" },
          { key: "item_quantidade", label: "Item Quantidade" },
          { key: "item_valor_unitario", label: "Item Valor Unitario" },
        ]}
        mapHeader={(h) => {
          const n = h.trim().toLowerCase();
          const map: Record<string, string> = {
            nome: "nome",
            "tipo de cardápio": "tipo_cardapio",
            "tipo cardápio": "tipo_cardapio",
            "tipo cardapio": "tipo_cardapio",
            "quantidade total": "quantidade_total",
            "preço dos itens": "preco_itens",
            "preco dos itens": "preco_itens",
            "margem de lucro": "margem_lucro",
            "margem lucro": "margem_lucro",
            "preço total": "preco_total",
            "preco total": "preco_total",
            descricao: "descricao",
            descrição: "descricao",
            status: "status",
            "data cadastro": "data_cadastro",
            "data atualização": "data_atualizacao",
            "data atualizacao": "data_atualizacao",
            "item nome": "item_nome",
            "item quantidade": "item_quantidade",
            "item valor unitario": "item_valor_unitario",
            "item valor unitário": "item_valor_unitario",
          };
          return map[n] || n.replace(/\s+/g, "_");
        }}
        validateRecord={(r) => {
          const errors: string[] = [];
          if (!r.nome) errors.push("Nome é obrigatório");
          const tipo = String(r.tipo_cardapio || "").trim();
          if (!tipo) errors.push("Tipo de Cardápio é obrigatório");
          else if (!TIPOS_CARDAPIO.includes(tipo as any)) errors.push("Tipo inválido");
          if (r.margem_lucro == null || r.margem_lucro === "") errors.push("Margem de Lucro é obrigatória");
          if (r.preco_total == null || r.preco_total === "") errors.push("Preço Total é obrigatório");
          return errors;
        }}
        onImport={async (records) => {
          try {
            // Group records by cardapio (nome + tipo)
            const cardapiosMap = new Map<string, any>();

            for (const r of records) {
              const key = `${r.nome}_${r.tipo_cardapio}`;
              if (!cardapiosMap.has(key)) {
                const parseCentavos = (val: any): number => {
                  if (val === undefined || val === null || val === "") return 0;
                  const s = String(val).replace(",", ".");
                  const n = Number(s);
                  return !isNaN(n) ? Math.round(n * 100) : 0;
                };

                cardapiosMap.set(key, {
                  nome: r.nome,
                  tipo_cardapio: r.tipo_cardapio,
                  quantidade_total: Number(r.quantidade_total) || 0,
                  preco_itens_centavos: parseCentavos(r.preco_itens),
                  margem_lucro_percentual: Number(String(r.margem_lucro || 0).replace(",", ".")) || 0,
                  preco_total_centavos: parseCentavos(r.preco_total),
                  descricao: r.descricao || "",
                  ativo: String(r.status || "Ativo").toLowerCase() === "ativo",
                  itens: [],
                });
              }

              // Add item if provided
              if (r.item_nome) {
                const parseCentavos = (val: any): number => {
                  if (val === undefined || val === null || val === "") return 0;
                  const s = String(val).replace(",", ".");
                  const n = Number(s);
                  return !isNaN(n) ? Math.round(n * 100) : 0;
                };

                cardapiosMap.get(key).itens.push({
                  item_id: 1, // Placeholder - would need item mapping
                  quantidade: Number(r.item_quantidade) || 1,
                  valor_unitario_centavos: parseCentavos(r.item_valor_unitario),
                });
              }
            }

            // Create cardapios via API
            let imported = 0;
            for (const cardapioData of cardapiosMap.values()) {
              try {
                await makeRequest(`/api/cardapios`, {
                  method: "POST",
                  body: JSON.stringify(cardapioData),
                });
                imported++;
              } catch (e) {
                console.error("Error creating cardapio:", e);
              }
            }

            await loadCardapios();
            return { success: true, imported, message: `${imported} cardápio(s) importado(s) com sucesso` } as any;
          } catch (e) {
            console.error("Import error:", e);
            return { success: false, message: "Erro ao importar cardápios" } as any;
          }
        }}
      />

      <DeleteAlert
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleDeleteConfirmed}
        itemName={currentCardapio?.nome}
        isLoading={false}
      />

      <BulkDeleteAlert
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={async () => {
          try {
            await makeRequest(`/api/cardapios/bulk-delete`, {
              method: "POST",
              body: JSON.stringify({ ids: selectedIds }),
            });
            toast({
              title: "Cardápios excluídos",
              description: `${selectedIds.length} registro(s) excluído(s) com sucesso`,
            });
            try {
              localStorage.removeItem(LOCAL_CARDAPIOS);
            } catch {}
            await loadCardapios();
            setSelectedIds([]);
            setShowBulkDelete(false);
          } catch (error: any) {
            const list = readLocalCardapios().filter(
              (e) => !selectedIds.includes(e.id),
            );
            writeLocalCardapios(list);
            setCardapios(list);
            toast({
              title: "Exclusão concluída localmente",
              description: `${selectedIds.length} registro(s) removido(s)`,
            });
            setSelectedIds([]);
            setShowBulkDelete(false);
          }
        }}
        selectedCount={selectedIds.length}
      />
    </div>
  );
}
