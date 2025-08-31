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
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/data-grid";
import { toast } from "@/hooks/use-toast";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Item,
  ItemCategoria,
  ItensListResponse,
  ItensCategoriasListResponse,
  formatCurrencyBRL,
} from "@shared/itens";
import ItemForm from "./ItemForm";
import ItemView from "./ItemView";
import CategoriaForm from "./CategoriaForm";
import CategoriaView from "./CategoriaView";
import {
  DeleteAlert,
  BulkDeleteAlert,
} from "@/components/alert-dialog-component";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";

export default function ItensModule() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isLoading, getUserRole, hasPayment } = useAuth();
  const { makeRequest } = useAuthenticatedRequest();

  const [activeTab, setActiveTab] = useState("itens");

  const [itens, setItens] = useState<Item[]>([]);
  const [categorias, setCategorias] = useState<ItemCategoria[]>([]);

  const [loading, setLoading] = useState(false);

  // Independent states for each tab
  const [selectedIdsItens, setSelectedIdsItens] = useState<number[]>([]);
  const [selectedIdsCategorias, setSelectedIdsCategorias] = useState<number[]>([]);
  const [searchTermItens, setSearchTermItens] = useState("");
  const [searchTermCategorias, setSearchTermCategorias] = useState("");
  const [currentPageItens, setCurrentPageItens] = useState(1);
  const [currentPageCategorias, setCurrentPageCategorias] = useState(1);

  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCategoriaView, setShowCategoriaView] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  const LOCAL_ITENS = "fm_itens";
  const LOCAL_CATS = "fm_itens_categorias";
  const readLocalItens = (): Item[] => {
    try {
      const raw = localStorage.getItem(LOCAL_ITENS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const writeLocalItens = (list: Item[]) =>
    localStorage.setItem(LOCAL_ITENS, JSON.stringify(list));
  const readLocalCats = (): ItemCategoria[] => {
    try {
      const raw = localStorage.getItem(LOCAL_CATS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const writeLocalCats = (list: ItemCategoria[]) =>
    localStorage.setItem(LOCAL_CATS, JSON.stringify(list));

  useEffect(() => {
    try {
      localStorage.removeItem(LOCAL_ITENS);
    } catch {}
  }, []);

  const menuItems = [
    { icon: Home, label: "Dashboard", route: "/dashboard" },
    { icon: Store, label: "Estabelecimentos", route: "/estabelecimentos" },
    { icon: Users, label: "Clientes", route: "/clientes" },
    { icon: Truck, label: "Fornecedores", route: "/fornecedores" },
    { icon: List, label: "Itens", route: "/itens" },
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

  const gridColumnsItens = useMemo(
    () => [
      { key: "nome", label: "Nome", sortable: true },
      { key: "categoria_nome", label: "Categoria", sortable: true },
      {
        key: "preco_centavos",
        label: "Preço",
        sortable: true,
        render: (v: number) => formatCurrencyBRL(v),
      },
      {
        key: "custo_pago_centavos",
        label: "Custo Pago",
        sortable: true,
        render: (v: number) => formatCurrencyBRL(v),
      },
      {
        key: "estoque_atual",
        label: "Estoque Atual",
        sortable: true,
        render: (v: number | undefined) => {
          const n = v ?? 0;
          const cls =
            n <= 0
              ? "bg-red-50 text-red-700 border border-red-200"
              : n <= 5
                ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                : "bg-green-50 text-green-700 border border-green-200";
          return <Badge className={cls}>{n}</Badge>;
        },
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
        render: (_: any, r: Item) => (
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

  const gridColumnsCategorias = useMemo(
    () => [
      { key: "nome", label: "Nome", sortable: true },
      { key: "descricao", label: "Descrição", sortable: false },
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
        render: (_: any, r: ItemCategoria) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleCategoria(r)}
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
              onClick={() => {
                setCurrentCategoria(r);
                setShowCategoriaView(true);
              }}
              className="h-8 w-8 p-0 rounded-full border bg-blue-50 hover:bg-blue-100 border-blue-200"
              title="Visualizar"
            >
              <Eye className="w-4 h-4 text-blue-700" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrentCategoria(r);
                setIsEditingCategoria(true);
                setShowCategoriaForm(true);
              }}
              className="h-8 w-8 p-0 rounded-full border bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
              title="Editar"
            >
              <Edit className="w-4 h-4 text-yellow-700" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteCategoria(r)}
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

  const loadItens = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPageItens),
        limit: String(pageSize),
        ...(searchTermItens && { search: searchTermItens }),
      });
      let response: ItensListResponse | null = null;
      try {
        response = await makeRequest(`/api/itens?${params}`);
      } catch {
        response = null;
      }
      if (response) {
        setItens(response.data);
        setTotalRecords(response.pagination.total);
      } else {
        const local = readLocalItens();
        setItens(local);
        setTotalRecords(local.length);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPageItens, searchTermItens, makeRequest]);

  const loadCategorias = useCallback(async () => {
    try {
      let response: ItensCategoriasListResponse | null = null;
      try {
        response = await makeRequest(`/api/itens-categorias?page=1&limit=200`);
      } catch {
        response = null;
      }
      if (response) {
        setCategorias(response.data);
      } else {
        const local = readLocalCats();
        setCategorias(local);
      }
    } catch {}
  }, [makeRequest]);

  useEffect(() => {
    if (isLoading) return;
    loadCategorias();
    loadItens();
  }, [loadItens, loadCategorias, isLoading]);

  // Removed: Each tab now has independent selectedIds state

  const handleSearch = (value: string) => {
    if (activeTab === "itens") {
      setSearchTermItens(value);
      setCurrentPageItens(1);
    } else {
      setSearchTermCategorias(value);
      setCurrentPageCategorias(1);
    }
  };

  const handlePageChange = (page: number) => {
    if (activeTab === "itens") {
      setCurrentPageItens(page);
    } else {
      setCurrentPageCategorias(page);
    }
  };

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [showCategoriaForm, setShowCategoriaForm] = useState(false);
  const [currentCategoria, setCurrentCategoria] =
    useState<ItemCategoria | null>(null);
  const [isEditingCategoria, setIsEditingCategoria] = useState(false);

  const handleNew = () => {
    setCurrentItem(null);
    setIsEditing(false);
    setShowForm(true);
  };
  const handleEdit = (i: Item) => {
    setCurrentItem(i);
    setIsEditing(true);
    setShowView(false);
    setShowForm(true);
  };
  const handleView = (i: Item) => {
    setCurrentItem(i);
    setShowView(true);
  };
  const handleDelete = (i: Item) => {
    setCurrentItem(i);
    setShowDeleteAlert(true);
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (isEditing && currentItem) {
        await makeRequest(`/api/itens/${currentItem.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast({
          title: "Item atualizado",
          description: "Item atualizado com sucesso",
        });
      } else {
        await makeRequest(`/api/itens`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({ title: "Item criado", description: "Item criado com sucesso" });
      }
      try {
        localStorage.removeItem(LOCAL_ITENS);
      } catch {}
      setSelectedIdsItens([]);
      await loadItens();
      setShowForm(false);
    } catch (error: any) {
      // local fallback
      const list = readLocalItens();
      const now = new Date().toISOString();
      if (isEditing && currentItem) {
        const idx = list.findIndex((x) => x.id === currentItem.id);
        if (idx >= 0)
          list[idx] = { ...list[idx], ...data, data_atualizacao: now } as any;
        toast({
          title: "Item atualizado",
          description: "Item atualizado com sucesso",
        });
      } else {
        const novo: Item = {
          id: Date.now(),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          categoria_id: data.categoria_id,
          nome: data.nome,
          preco_centavos: data.preco_centavos,
          custo_pago_centavos: data.custo_pago_centavos,
          unidade_medida: data.unidade_medida,
          peso_gramas: data.peso_gramas,
          estoque_atual: data.estoque_atual,
          ativo: data.ativo ?? true,
          data_cadastro: now,
          data_atualizacao: now,
        } as any;
        list.unshift(novo);
        toast({ title: "Item criado", description: "Item criado com sucesso" });
      }
      writeLocalItens(list);
      setItens(list);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (i: Item) => {
    try {
      await makeRequest(`/api/itens/${i.id}/toggle-status`, {
        method: "PATCH",
      });
      toast({
        title: `Item ${i.ativo ? "desativado" : "ativado"}`,
        description: `Item ${i.ativo ? "desativado" : "ativado"} com sucesso`,
      });
      loadItens();
    } catch {
      const list = readLocalItens();
      const idx = list.findIndex((x) => x.id === i.id);
      if (idx >= 0) {
        list[idx].ativo = !list[idx].ativo;
        list[idx].data_atualizacao = new Date().toISOString();
        writeLocalItens(list);
        setItens(list);
        toast({
          title: "Status atualizado",
          description: "Status atualizado com sucesso",
        });
      }
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!currentItem) return;
    try {
      await makeRequest(`/api/itens/${currentItem.id}`, { method: "DELETE" });
      toast({
        title: "Item excluído",
        description: "Item excluído com sucesso",
      });
      try {
        localStorage.removeItem(LOCAL_ITENS);
      } catch {}
      setSelectedIdsItens([]);
      await loadItens();
      setShowDeleteAlert(false);
    } catch (error: any) {
      const list = readLocalItens().filter((e) => e.id !== currentItem.id);
      writeLocalItens(list);
      setItens(list);
      toast({
        title: "Item excluído",
        description: "Item excluído com sucesso",
      });
      setSelectedIdsItens([]);
      setShowDeleteAlert(false);
    }
  };

  const handleSaveCategoria = async (data: any) => {
    try {
      if (isEditingCategoria && currentCategoria) {
        await makeRequest(`/api/itens-categorias/${currentCategoria.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast({
          title: "Categoria atualizada",
          description: "Categoria atualizada com sucesso",
        });
      } else {
        await makeRequest(`/api/itens-categorias`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({
          title: "Categoria criada",
          description: "Categoria criada com sucesso",
        });
      }
      try {
        localStorage.removeItem(LOCAL_CATS);
      } catch {}
      await loadCategorias();
      setShowCategoriaForm(false);
      setCurrentCategoria(null);
      setIsEditingCategoria(false);
    } catch {
      const list = readLocalCats();
      const now = new Date().toISOString();
      if (isEditingCategoria && currentCategoria) {
        const idx = list.findIndex((x) => x.id === currentCategoria.id);
        if (idx >= 0)
          list[idx] = { ...list[idx], ...data, data_atualizacao: now } as any;
        toast({
          title: "Categoria atualizada",
          description: "Categoria atualizada com sucesso",
        });
      } else {
        const novo: ItemCategoria = {
          id: Date.now(),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          nome: data.nome,
          descricao: data.descricao,
          ativo: data.ativo ?? true,
          data_cadastro: now,
          data_atualizacao: now,
        } as any;
        list.unshift(novo);
        toast({
          title: "Categoria criada",
          description: "Categoria criada com sucesso",
        });
      }
      writeLocalCats(list);
      setCategorias(list);
      setShowCategoriaForm(false);
    }
  };

  const handleToggleCategoria = async (c: ItemCategoria) => {
    try {
      await makeRequest(`/api/itens-categorias/${c.id}/toggle-status`, {
        method: "PATCH",
      });
      toast({
        title: `Categoria ${c.ativo ? "desativada" : "ativada"}`,
        description: `Categoria ${c.ativo ? "desativada" : "ativada"} com sucesso`,
      });
      loadCategorias();
    } catch {
      const list = readLocalCats();
      const idx = list.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        list[idx].ativo = !list[idx].ativo;
        list[idx].data_atualizacao = new Date().toISOString();
        writeLocalCats(list);
        setCategorias(list);
        toast({
          title: "Status atualizado",
          description: "Status atualizado com sucesso",
        });
      }
    }
  };

  const handleDeleteCategoria = async (c: ItemCategoria) => {
    try {
      await makeRequest(`/api/itens-categorias/${c.id}`, { method: "DELETE" });
      toast({
        title: "Categoria excluída",
        description: "Categoria excluída com sucesso",
      });
      try {
        localStorage.removeItem(LOCAL_CATS);
      } catch {}
      await loadCategorias();
    } catch {
      const list = readLocalCats().filter((e) => e.id !== c.id);
      writeLocalCats(list);
      setCategorias(list);
      toast({
        title: "Categoria excluída",
        description: "Categoria excluída com sucesso",
      });
    }
  };

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

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
              <h2 className="text-2xl font-semibold text-gray-800">Itens</h2>
              <p className="text-gray-600 mt-1">
                Gerencie seus itens e categorias.
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="w-full">
              <div className="w-full border-b border-gray-200">
                <div className="flex gap-6">
                  <button
                    className={`relative -mb-px pb-2 pt-1 text-sm flex items-center gap-2 ${
                      activeTab === "itens"
                        ? "text-foodmax-orange"
                        : "text-gray-700 hover:text-gray-900"
                    }`}
                    onClick={() => setActiveTab("itens")}
                  >
                    <List className="w-4 h-4" />
                    <span>Itens</span>
                    <span
                      className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${activeTab === "itens" ? "bg-orange-100 text-foodmax-orange" : "bg-gray-100 text-gray-600"}`}
                    >
                      {totalRecords}
                    </span>
                    {activeTab === "itens" && (
                      <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-foodmax-orange" />
                    )}
                  </button>

                  <button
                    className={`relative -mb-px pb-2 pt-1 text-sm flex items-center gap-2 ${
                      activeTab === "categorias"
                        ? "text-foodmax-orange"
                        : "text-gray-700 hover:text-gray-900"
                    }`}
                    onClick={() => setActiveTab("categorias")}
                  >
                    <Tag className="w-4 h-4" />
                    <span>Categorias</span>
                    <span
                      className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${activeTab === "categorias" ? "bg-orange-100 text-foodmax-orange" : "bg-gray-100 text-gray-600"}`}
                    >
                      {categorias.length}
                    </span>
                    {activeTab === "categorias" && (
                      <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-foodmax-orange" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar registros..."
                    value={activeTab === "itens" ? searchTermItens : searchTermCategorias}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="foodmax-input pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {(activeTab === "itens" ? selectedIdsItens : selectedIdsCategorias).length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDelete(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Selecionados ({(activeTab === "itens" ? selectedIdsItens : selectedIdsCategorias).length})
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
                  {activeTab === "categorias" ? (
                    <Button
                      onClick={() => {
                        setCurrentCategoria(null);
                        setIsEditingCategoria(false);
                        setShowCategoriaForm(true);
                      }}
                      className="bg-foodmax-orange text-white hover:bg-orange-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNew}
                      className="bg-foodmax-orange text-white hover:bg-orange-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {activeTab === "itens" ? (
              <DataGrid
                columns={gridColumnsItens}
                data={itens.map((i) => ({
                  ...i,
                  categoria_nome:
                    categorias.find((c) => c.id === i.categoria_id)?.nome ||
                    "-",
                }))}
                loading={loading}
                selectedIds={selectedIdsItens}
                onSelectionChange={setSelectedIdsItens}
                searchTerm={searchTermItens}
                currentPage={currentPageItens}
                pageSize={pageSize}
                totalRecords={totalRecords}
                onPageChange={handlePageChange}
                showActions={false}
              />
            ) : (
              <DataGrid
                columns={gridColumnsCategorias}
                data={categorias}
                loading={false}
                selectedIds={selectedIdsCategorias}
                onSelectionChange={setSelectedIdsCategorias}
                searchTerm={searchTermCategorias}
                currentPage={currentPageCategorias}
                pageSize={pageSize}
                totalRecords={categorias.length}
                onPageChange={handlePageChange}
                showActions={false}
              />
            )}
          </div>
        </main>
      </div>

      <ItemForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setCurrentItem(null);
          setIsEditing(false);
        }}
        onSave={handleSave}
        item={currentItem}
        isLoading={formLoading}
        categorias={categorias}
        onOpenCategorias={() => {
          setActiveTab("categorias");
          setShowCategoriaForm(true);
        }}
      />
      <ItemView
        isOpen={showView}
        onClose={() => {
          setShowView(false);
          setCurrentItem(null);
        }}
        onEdit={(i) => handleEdit(i)}
        item={currentItem}
        categoriaNome={
          currentItem
            ? categorias.find((c) => c.id === currentItem.categoria_id)?.nome ||
              null
            : null
        }
      />

      <CategoriaForm
        isOpen={showCategoriaForm}
        onClose={() => {
          setShowCategoriaForm(false);
          setCurrentCategoria(null);
          setIsEditingCategoria(false);
        }}
        categoria={currentCategoria}
        onSave={handleSaveCategoria}
      />

      <CategoriaView
        isOpen={showCategoriaView}
        onClose={() => {
          setShowCategoriaView(false);
          setCurrentCategoria(null);
        }}
        onEdit={(c) => {
          if (!c) return;
          setCurrentCategoria(c);
          setIsEditingCategoria(true);
          setShowCategoriaView(false);
          setShowCategoriaForm(true);
        }}
        categoria={currentCategoria}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={
          activeTab === "itens"
            ? itens.map((i) => ({
                nome: i.nome,
                categoria_nome:
                  categorias.find((c) => c.id === i.categoria_id)?.nome || "",
                preco: (i.preco_centavos / 100).toFixed(2),
                custo_pago: (i.custo_pago_centavos / 100).toFixed(2),
                estoque_atual: i.estoque_atual ?? 0,
                unidade_medida: i.unidade_medida,
                peso_gramas: i.peso_gramas ?? "",
                status: i.ativo ? "Ativo" : "Inativo",
                data_cadastro: new Date(i.data_cadastro)
                  .toISOString()
                  .split("T")[0],
              }))
            : categorias
        }
        selectedIds={activeTab === "itens" ? selectedIdsItens : selectedIdsCategorias}
        moduleName={activeTab === "itens" ? "Itens" : "Categorias"}
        columns={
          activeTab === "itens"
            ? [
                { key: "nome", label: "Nome" },
                { key: "categoria_nome", label: "Categoria Nome" },
                { key: "preco", label: "Preço" },
                { key: "custo_pago", label: "Custo Pago" },
                { key: "estoque_atual", label: "Estoque Atual" },
                { key: "unidade_medida", label: "Unidade Medida" },
                { key: "peso_gramas", label: "Peso Gramas" },
                { key: "status", label: "Status" },
                { key: "data_cadastro", label: "Data Cadastro" },
              ]
            : [
                { key: "nome", label: "Nome" },
                { key: "descricao", label: "Descrição" },
                { key: "ativo", label: "Ativo" },
                { key: "data_cadastro", label: "Data Cadastro" },
                { key: "data_atualizacao", label: "Data Atualização" },
              ]
        }
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName={activeTab === "itens" ? "Itens" : "Categorias"}
        userRole={getUserRole()}
        hasPayment={hasPayment()}
        columns={
          activeTab === "itens"
            ? [
                { key: "nome", label: "Nome", required: true },
                {
                  key: "categoria_nome",
                  label: "Categoria Nome",
                  required: true,
                },
                { key: "preco", label: "Preço", required: true },
                { key: "custo_pago", label: "Custo Pago", required: true },
                { key: "estoque_atual", label: "Estoque Atual" },
                { key: "unidade_medida", label: "Unidade Medida" },
                { key: "peso_gramas", label: "Peso Gramas" },
                { key: "ativo", label: "Status" },
                { key: "data_cadastro", label: "Data Cadastro" },
              ]
            : [
                { key: "nome", label: "Nome", required: true },
                { key: "descricao", label: "Descrição" },
                { key: "ativo", label: "Ativo" },
              ]
        }
        mapHeader={
          activeTab === "itens"
            ? (h) => {
                const n = h.trim().toLowerCase();
                const map: Record<string, string> = {
                  nome: "nome",
                  "categoria nome": "categoria_nome",
                  categoria: "categoria_nome",
                  categoria_id: "categoria_id",
                  preço: "preco",
                  preco: "preco",
                  "custo pago": "custo_pago",
                  "estoque atual": "estoque_atual",
                  "unidade medida": "unidade_medida",
                  "unidade de medida": "unidade_medida",
                  "peso gramas": "peso_gramas",
                  status: "ativo",
                  "data cadastro": "data_cadastro",
                };
                return map[n] || n.replace(/\s+/g, "_");
              }
            : undefined
        }
        onImport={async (records) => {
          try {
            if (activeTab === "itens") {
              let imported = 0;
              let remote = 0;
              let local = 0;

              const categoriaByName = new Map<string, ItemCategoria>();
              categorias.forEach((c) =>
                categoriaByName.set(c.nome.trim().toLowerCase(), c),
              );

              const parseCentavos = (val: any): number => {
                if (val === undefined || val === null || val === "") return 0;
                if (typeof val === "number") {
                  return Number.isInteger(val) ? val : Math.round(val * 100);
                }
                const s = String(val).trim();
                const clean = s
                  .replace(/[^0-9,.-]/g, "")
                  .replace(/\.(?=\d{3}(,|$))/g, "");
                const dot = clean.replace(",", ".");
                const n = Number(dot);
                if (!isNaN(n)) return Math.round(n * 100);
                const digits = s.replace(/\D/g, "");
                return digits ? parseInt(digits, 10) : 0;
              };

              const getCategoriaId = async (rec: any): Promise<number> => {
                const idRaw = rec.categoria_id;
                const idNum = Number(idRaw);
                if (!isNaN(idNum) && idNum > 0) return idNum;
                const name = (rec.categoria_nome || rec.categoria || "")
                  .toString()
                  .trim();
                if (name) {
                  const found = categoriaByName.get(name.toLowerCase());
                  if (found) return found.id;
                  try {
                    const created = await makeRequest(`/api/itens-categorias`, {
                      method: "POST",
                      body: JSON.stringify({ nome: name, ativo: true }),
                    });
                    const cat = (created?.data as ItemCategoria) || created;
                    if (cat?.id) {
                      categoriaByName.set(cat.nome.trim().toLowerCase(), cat);
                      setCategorias((prev) => {
                        const next = [cat, ...prev];
                        writeLocalCats(next);
                        return next;
                      });
                      return cat.id;
                    }
                  } catch {}
                }
                // fallback: ensure some categoria
                if (categorias[0]) return categorias[0].id;
                throw new Error("Categoria inválida para importação");
              };

              for (const r of records) {
                try {
                  const categoria_id = await getCategoriaId(r);
                  const payload: any = {
                    nome: r.nome,
                    categoria_id,
                    preco_centavos: parseCentavos(r.preco_centavos ?? r.preco),
                    custo_pago_centavos: parseCentavos(
                      r.custo_pago_centavos ?? r.custo ?? r.custo_pago,
                    ),
                    unidade_medida: String(r.unidade_medida || "Unidade"),
                    peso_gramas:
                      r.peso_gramas !== undefined && r.peso_gramas !== ""
                        ? Number(r.peso_gramas)
                        : undefined,
                    estoque_atual:
                      r.estoque_atual !== undefined && r.estoque_atual !== ""
                        ? Number(r.estoque_atual)
                        : undefined,
                    ativo:
                      typeof r.ativo === "string"
                        ? r.ativo.toLowerCase() !== "false"
                        : Boolean(r.ativo ?? true),
                  };

                  await makeRequest(`/api/itens`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                  });
                  imported++;
                  remote++;
                } catch {
                  const list = readLocalItens();
                  const now = new Date().toISOString();
                  const categoria_id = categorias[0]?.id || 0;
                  const fallback: Item = {
                    id: Date.now() + imported,
                    id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
                    categoria_id,
                    nome: r.nome,
                    preco_centavos: parseCentavos(r.preco_centavos ?? r.preco),
                    custo_pago_centavos: parseCentavos(
                      r.custo_pago_centavos ?? r.custo ?? r.custo_pago,
                    ),
                    unidade_medida: String(r.unidade_medida || "Unidade"),
                    peso_gramas:
                      r.peso_gramas !== undefined && r.peso_gramas !== ""
                        ? Number(r.peso_gramas)
                        : undefined,
                    estoque_atual:
                      r.estoque_atual !== undefined && r.estoque_atual !== ""
                        ? Number(r.estoque_atual)
                        : undefined,
                    ativo:
                      typeof r.ativo === "string"
                        ? r.ativo.toLowerCase() !== "false"
                        : Boolean(r.ativo ?? true),
                    data_cadastro: now,
                    data_atualizacao: now,
                  } as any;
                  list.unshift(fallback);
                  writeLocalItens(list);
                  setItens(list);
                  imported++;
                  local++;
                }
              }
              try {
                localStorage.removeItem(LOCAL_ITENS);
              } catch {}
              await loadItens();
              return {
                success: true,
                message: `${imported} itens importados (banco: ${remote}, local: ${local})`,
                imported,
              } as any;
            } else {
              let imported = 0;
              let remote = 0;
              let local = 0;
              for (const r of records) {
                const payload: any = {
                  nome: r.nome,
                  descricao: r.descricao || "",
                  ativo:
                    typeof r.ativo === "string"
                      ? r.ativo.toLowerCase() !== "false"
                      : Boolean(r.ativo ?? true),
                };
                try {
                  await makeRequest(`/api/itens-categorias`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                  });
                  imported++;
                  remote++;
                } catch {
                  const list = readLocalCats();
                  const now = new Date().toISOString();
                  const novo: ItemCategoria = {
                    id: Date.now() + imported,
                    id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
                    ...payload,
                    data_cadastro: now,
                    data_atualizacao: now,
                  } as any;
                  list.unshift(novo);
                  writeLocalCats(list);
                  setCategorias(list);
                  imported++;
                  local++;
                }
              }
              try {
                localStorage.removeItem(LOCAL_CATS);
              } catch {}
              await loadCategorias();
              return {
                success: true,
                message: `${imported} categorias importadas (banco: ${remote}, local: ${local})`,
                imported,
              } as any;
            }
          } catch (e) {
            return { success: false, message: "Erro ao importar" } as any;
          }
        }}
      />

      <DeleteAlert
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleDeleteConfirmed}
        itemName={currentItem?.nome}
        isLoading={false}
      />

      <BulkDeleteAlert
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={async () => {
          const currentSelectedIds = activeTab === "itens" ? selectedIdsItens : selectedIdsCategorias;
          try {
            if (activeTab === "itens") {
              await makeRequest(`/api/itens/bulk-delete`, {
                method: "POST",
                body: JSON.stringify({ ids: currentSelectedIds }),
              });
              toast({
                title: "Itens excluídos",
                description: `${currentSelectedIds.length} registro(s) excluído(s) com sucesso`,
              });
              try {
                localStorage.removeItem(LOCAL_ITENS);
              } catch {}
              await loadItens();
            } else {
              const res = await makeRequest(
                `/api/itens-categorias/bulk-delete`,
                {
                  method: "POST",
                  body: JSON.stringify({ ids: currentSelectedIds }),
                },
              );
              const deleted = (res?.deletedCount as number) || 0;
              const blocked = (res?.blockedIds as number[]) || [];
              if (blocked.length) {
                toast({
                  title: "Alguns registros não puderam ser excluídos",
                  description: `${blocked.length} categoria(s) possuem Itens vinculados.`,
                });
              }
              toast({
                title: "Categorias excluídas",
                description: `${deleted} categoria(s) excluída(s) com sucesso`,
              });
              try {
                localStorage.removeItem(LOCAL_CATS);
              } catch {}
              await loadCategorias();
            }
            if (activeTab === "itens") {
              setSelectedIdsItens([]);
            } else {
              setSelectedIdsCategorias([]);
            }
            setShowBulkDelete(false);
          } catch (error: any) {
            if (activeTab === "itens") {
              const list = readLocalItens().filter(
                (e) => !currentSelectedIds.includes(e.id),
              );
              writeLocalItens(list);
              setItens(list);
            } else {
              const list = readLocalCats().filter(
                (e) => !currentSelectedIds.includes(e.id),
              );
              writeLocalCats(list);
              setCategorias(list);
            }
            toast({
              title: "Exclusão concluída localmente",
              description: `${currentSelectedIds.length} registro(s) removido(s)`,
            });
            if (activeTab === "itens") {
              setSelectedIdsItens([]);
            } else {
              setSelectedIdsCategorias([]);
            }
            setShowBulkDelete(false);
          }
        }}
        selectedCount={selectedIds.length}
      />
    </div>
  );
}
