import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Home,
  Store,
  Users,
  Truck,
  List,
  LogOut,
  Search,
  Plus,
  Download,
  Upload,
  Trash2,
  Eye,
  Edit,
  Power,
  ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/data-grid";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";
import {
  AlertDialogComponent,
  DeleteAlert,
  BulkDeleteAlert,
  PaymentRequiredAlert,
} from "@/components/alert-dialog-component";
import { toast } from "@/hooks/use-toast";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Cliente,
  ClienteFormData,
  ClientesListResponse,
  CLIENTE_EXPORT_COLUMNS,
  CLIENTE_IMPORT_COLUMNS,
  formatTelefone,
  formatEndereco,
} from "@shared/clientes";
import { Estabelecimento } from "@shared/estabelecimentos";
import { ClienteForm } from "./ClienteForm";
import { ClienteView } from "./ClienteView";

export default function ClientesModule() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, getUserRole, hasPayment, isLoading } = useAuth();
  const { makeRequest } = useAuthenticatedRequest();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  const userRole = getUserRole();
  const hasPaymentPlan = hasPayment();

  const LOCAL_KEY = "fm_clientes";
  const readLocal = (): Cliente[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as Cliente[]) : [];
    } catch {
      return [];
    }
  };
  const writeLocal = (list: Cliente[]) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  };

  // Always clear caches when entering this page
  useEffect(() => {
    try {
      localStorage.removeItem("fm_clientes");
      localStorage.removeItem("fm_estabelecimentos");
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

  const loadEstabelecimentos = useCallback(async () => {
    try {
      let data: Estabelecimento[] = [];
      try {
        const params = new URLSearchParams({ page: "1", limit: "200" });
        const res = await makeRequest(`/api/estabelecimentos?${params}`);
        data = (res.data || []) as Estabelecimento[];
      } catch {
        data = [];
      }
      data.sort((a, b) => (a.data_cadastro < b.data_cadastro ? 1 : -1));
      setEstabelecimentos(data);
    } catch (e) {
      console.error(e);
    }
  }, [makeRequest]);

  const loadClientes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(searchTerm && { search: searchTerm }),
      });
      let response: ClientesListResponse | null = null;
      try {
        response = await makeRequest(`/api/clientes?${params}`);
      } catch {
        response = null;
      }
      if (response) {
        setClientes(response.data);
        setTotalRecords(response.pagination.total);
      } else {
        setClientes([]);
        setTotalRecords(0);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, makeRequest]);

  useEffect(() => {
    if (isLoading) return;
    loadEstabelecimentos();
    loadClientes();
  }, [loadClientes, loadEstabelecimentos, isLoading]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleNew = () => {
    setCurrentPage(1);
    setCurrentCliente(null);
    setIsEditing(false);
    setShowForm(true);
  };
  const handleEdit = (c: Cliente) => {
    setCurrentCliente(c);
    setIsEditing(true);
    setShowView(false);
    setShowForm(true);
  };
  const handleView = (c: Cliente) => {
    setCurrentCliente(c);
    setShowView(true);
  };
  const handleDelete = (c: Cliente) => {
    setCurrentCliente(c);
    setShowDeleteAlert(true);
  };
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione pelo menos um cliente para excluir",
        variant: "destructive",
      });
      return;
    }
    setShowBulkDeleteAlert(true);
  };

  const handleToggleStatus = async (c: Cliente) => {
    try {
      await makeRequest(`/api/clientes/${c.id}/toggle-status`, {
        method: "PATCH",
      });
      toast({
        title: `Cliente ${c.ativo ? "desativado" : "ativado"}`,
        description: `Cliente ${c.ativo ? "desativado" : "ativado"} com sucesso`,
      });
      loadClientes();
    } catch (error: any) {
      const list = readLocal();
      const idx = list.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        list[idx].ativo = !list[idx].ativo;
        list[idx].data_atualizacao = new Date().toISOString();
        writeLocal(list);
        setClientes(list);
        toast({ title: "Status atualizado" });
      } else {
        toast({
          title: "Erro ao alterar status",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const [currentCliente, setCurrentCliente] = useState<Cliente | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showBulkDeleteAlert, setShowBulkDeleteAlert] = useState(false);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);

  const handleSave = async (data: ClienteFormData) => {
    setFormLoading(true);
    try {
      if (isEditing && currentCliente) {
        await makeRequest(`/api/clientes/${currentCliente.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast({
          title: "Cliente atualizado",
          description: "Cliente atualizado com sucesso",
        });
      } else {
        await makeRequest(`/api/clientes`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({
          title: "Cliente criado",
          description: "Cliente criado com sucesso",
        });
      }
      setShowForm(false);
      setCurrentCliente(null);
      setIsEditing(false);
      setSelectedIds([]);
      loadClientes();
    } catch (error: any) {
      const list = readLocal();
      if (isEditing && currentCliente) {
        const idx = list.findIndex((x) => x.id === currentCliente.id);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            ...data,
            endereco: {
              ...(list[idx].endereco || {}),
              cep: data.cep,
              endereco: data.endereco,
              cidade: data.cidade,
              uf: data.uf,
              pais: data.pais || "Brasil",
            },
            data_atualizacao: new Date().toISOString(),
          } as any;
        }
        toast({ title: "Cliente atualizado" });
      } else {
        const now = new Date().toISOString();
        const novo: Cliente = {
          id: Date.now(),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          estabelecimento_id: data.estabelecimento_id,
          nome: data.nome,
          genero: data.genero,
          profissao: data.profissao,
          email: data.email || undefined,
          ddi: data.ddi,
          telefone: data.telefone,
          ativo: data.ativo ?? true,
          aceita_promocao_email: data.aceita_promocao_email ?? false,
          data_cadastro: now,
          data_atualizacao: now,
          endereco:
            data.cep || data.endereco || data.cidade
              ? {
                  id: Date.now(),
                  cliente_id: 0,
                  cep: data.cep,
                  endereco: data.endereco,
                  cidade: data.cidade,
                  uf: data.uf,
                  pais: data.pais || "Brasil",
                  data_cadastro: now,
                  data_atualizacao: now,
                }
              : undefined,
        } as any;
        list.unshift(novo);
        toast({ title: "Cliente criado" });
      }
      writeLocal(list);
      setClientes(list);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!currentCliente) return;
    setDeleteLoading(true);
    try {
      await makeRequest(`/api/clientes/${currentCliente.id}`, {
        method: "DELETE",
      });
      toast({
        title: "Cliente excluído",
        description: "Cliente excluído com sucesso",
      });
      setShowDeleteAlert(false);
      setCurrentCliente(null);
      setSelectedIds([]);
      await loadClientes();
    } catch (error: any) {
      toast({
        title: "Não foi possível excluir",
        description:
          error?.message ||
          "Existem dependências com outros módulos. Remova-as antes de excluir.",
        variant: "destructive",
      });
      await loadClientes();
      setShowDeleteAlert(false);
      setCurrentCliente(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmBulkDelete = async () => {
    setDeleteLoading(true);
    try {
      await makeRequest(`/api/clientes/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds }),
      });
      toast({
        title: "Clientes excluídos",
        description: `${selectedIds.length} cliente(s) excluído(s) com sucesso`,
      });
      setShowBulkDeleteAlert(false);
      setSelectedIds([]);
      await loadClientes();
    } catch (error: any) {
      toast({
        title: "Não foi possível excluir algum(ns) registro(s)",
        description:
          error?.message ||
          "Existem dependências com outros módulos. Remova-as antes de excluir.",
        variant: "destructive",
      });
      await loadClientes();
      setShowBulkDeleteAlert(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const onlyDigits = (v: any) => String(v || "").replace(/\D/g, "");
  const toBool = (v: any): boolean | undefined => {
    if (typeof v === "boolean") return v;
    if (v == null || v === "") return undefined;
    const s = String(v).trim().toLowerCase();
    if (["1", "true", "ativo", "yes", "sim"].includes(s)) return true;
    if (["0", "false", "inativo", "no", "nao", "não"].includes(s)) return false;
    return undefined;
  };

  const handleImport = async (records: any[]) => {
    // Records are already validated and processed by ImportModal
    console.log("Processing import records:", records);

    try {
      const response = await makeRequest(`/api/clientes/import`, {
        method: "POST",
        body: JSON.stringify({ records }),
      });
      loadClientes();
      return response;
    } catch (error: any) {
      console.log("API failed, using local storage fallback", error);

      // Fallback to local storage
      const list = readLocal();
      const now = new Date().toISOString();

      const mapped = records.map((r: any, i: number) => ({
        id: Date.now() + i,
        id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
        estabelecimento_id:
          Number(r.estabelecimento_id) || Number(r.id_estabelecimento) || 1,
        nome: r.nome || "",
        genero: r.genero,
        profissao: r.profissao,
        email: r.email,
        ddi: r.ddi || "+55",
        telefone: r.telefone || "",
        ativo: r.ativo ?? true,
        aceita_promocao_email: r.aceita_promocao_email ?? false,
        data_cadastro: now,
        data_atualizacao: now,
        endereco:
          r.cep || r.endereco || r.cidade
            ? {
                id: Date.now() + i,
                cliente_id: 0,
                cep: r.cep,
                endereco: r.endereco,
                cidade: r.cidade,
                uf: r.uf,
                pais: r.pais || "Brasil",
                data_cadastro: now,
                data_atualizacao: now,
              }
            : undefined,
      })) as Cliente[];

      console.log("Mapped records for local storage:", mapped);

      const merged = [...mapped, ...list];
      writeLocal(merged);
      setClientes(merged);

      return {
        success: true,
        message: "Importação concluída",
        imported: mapped.length,
        errors: [],
      };
    }
  };

  const gridColumns = useMemo(() => {
    return [
      {
        key: "estabelecimento_nome",
        label: "Estabelecimento",
        sortable: true,
      },
      {
        key: "nome",
        label: "Nome",
        sortable: true,
        render: (value: string, record: Cliente) => (
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-xs text-gray-500">{record.email || "-"}</div>
          </div>
        ),
      },
      {
        key: "telefone",
        label: "Telefone",
        sortable: true,
        render: (v: string, r: Cliente) => formatTelefone(r.ddi, r.telefone),
      },
      {
        key: "endereco_completo",
        label: "Cidade/UF",
        sortable: true,
        render: (v: any, r: Cliente) => formatEndereco(r.endereco),
      },
      {
        key: "aceita_promocoes_tag",
        label: "Aceita Promoções",
        sortable: true,
        render: (v: any, r: Cliente) => (
          <Badge
            className={`${r.aceita_promocao_email ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-700 border border-gray-200"}`}
          >
            {r.aceita_promocao_email ? "Sim" : "Não"}
          </Badge>
        ),
      },
      {
        key: "ativo",
        label: "Status",
        sortable: true,
        render: (value: boolean) => (
          <Badge
            className={`${value ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
          >
            {value ? "Ativo" : "Inativo"}
          </Badge>
        ),
      },
      {
        key: "data_cadastro",
        label: "Data Cadastro",
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString("pt-BR"),
      },
      {
        key: "acoes",
        label: "Ações",
        render: (_: any, r: Cliente) => (
          <div className="flex items-center justify-center gap-2">
            <a
              href={`http://wa.me/${r.ddi}${r.telefone}`}
              target="_blank"
              rel="noreferrer"
              title="WhatsApp"
              className="h-8 w-8 inline-flex items-center justify-center rounded-full border bg-gray-50 hover:bg-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
                className="w-4 h-4 text-gray-700 fill-current"
                aria-hidden="true"
              >
                <path d="M380.9 97.1C339 55.2 283.2 32 224.5 32 106 32 9.4 128.6 9.4 247.1c0 38.1 9.9 75.3 28.6 108.2L0 480l127.5-33.5c31.3 17.1 66.6 26.1 102.5 26.1h.1c118.5 0 215.1-96.6 215.1-215.1 0-58.7-23.2-114.5-64.2-156.4zM224.1 438.6h-.1c-32.1 0-63.5-8.6-90.8-24.8l-6.5-3.9-75.6 19.9 20.2-73.6-4.1-6.7c-17.5-28.6-26.8-61.6-26.8-95.4 0-99.2 80.8-180 180-180 48.1 0 93.3 18.7 127.3 52.7 34 34 52.7 79.2 52.7 127.3-.1 99.1-80.9 179.9-180 179.9zm99.5-138.7c-5.5-2.8-32.7-16.1-37.7-17.9-5-1.9-8.6-2.8-12.2 2.8-3.6 5.5-14 17.9-17.2 21.5-3.2 3.6-6.4 4.1-11.9 1.4-32.7-16.1-54-28.8-75.5-65.1-5.7-9.8 5.7-9.1 16.1-30.3 1.8-3.6.9-6.6-.5-9.4-1.4-2.8-12.2-29.5-16.8-40.4-4.4-10.6-8.9-9.1-12.2-9.3-3.1-.2-6.6-.2-10.1-.2-3.6 0-9.3 1.3-14.1 6.6-4.8 5.3-18.5 18.1-18.5 44.2s18.9 51.3 21.5 54.9c2.6 3.6 37.2 56.8 90.2 79.7 12.6 5.4 22.4 8.6 30 11 12.6 4 24.1 3.4 33.1 2.1 10.1-1.5 32.7-13.3 37.3-26.2 4.6-12.9 4.6-24 3.2-26.3-1.3-2.3-5-3.6-10.5-6.4z" />
              </svg>
            </a>
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
    ];
  }, []);

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
            {menuItems.map((item, i) => renderMenuItem(item, i))}
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
                  <LogOut className="w-4 h-4" />
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
              <h2 className="text-2xl font-semibold text-gray-800">Clientes</h2>
              <p className="text-gray-600 mt-1">
                Gerencie todos os clientes cadastrados no sistema.
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
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
                      onClick={handleBulkDelete}
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
              data={clientes.map((c) => ({
                ...c,
                endereco_completo: formatEndereco(c.endereco),
                estabelecimento_nome:
                  estabelecimentos.find((e) => e.id === c.estabelecimento_id)
                    ?.nome ||
                  c["estabelecimento_nome"] ||
                  "-",
              }))}
              loading={loading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              searchTerm={searchTerm}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onPageChange={handlePageChange}
              showActions={false}
            />
          </div>
        </main>
      </div>

      <ClienteForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setCurrentCliente(null);
          setIsEditing(false);
        }}
        onSave={handleSave}
        cliente={currentCliente}
        isLoading={formLoading}
      />

      <ClienteView
        isOpen={showView}
        onClose={() => {
          setShowView(false);
          setCurrentCliente(null);
        }}
        onEdit={handleEdit}
        cliente={currentCliente}
        estabelecimentoNome={
          currentCliente
            ? estabelecimentos.find(
                (e) => e.id === currentCliente.estabelecimento_id,
              )?.nome || null
            : null
        }
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={clientes.map((cliente) => ({
          estabelecimento_nome:
            estabelecimentos.find((e) => e.id === cliente.estabelecimento_id)
              ?.nome ||
            cliente["estabelecimento_nome"] ||
            "N/A",
          nome: cliente.nome,
          genero: cliente.genero || "",
          profissao: cliente.profissao || "",
          email: cliente.email || "",
          ddi: cliente.ddi,
          telefone: cliente.telefone,
          cep: cliente.endereco?.cep || "",
          endereco: cliente.endereco?.endereco || "",
          cidade: cliente.endereco?.cidade || "",
          uf: cliente.endereco?.uf || "",
          pais: cliente.endereco?.pais || "",
          aceita_promocao_email: cliente.aceita_promocao_email ? "Sim" : "Não",
          ativo: cliente.ativo ? "Ativo" : "Inativo",
          data_cadastro: cliente.data_cadastro,
        }))}
        selectedIds={selectedIds}
        moduleName="Clientes"
        columns={CLIENTE_EXPORT_COLUMNS}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName="Clientes"
        columns={CLIENTE_IMPORT_COLUMNS.map((c) => ({
          ...c,
          required: ["id_estabelecimento", "nome"].includes(c.key),
        }))}
        onImport={handleImport}
        userRole={userRole}
        hasPayment={hasPaymentPlan}
        mapHeader={(header) => {
          const map: Record<string, string> = {
            // Establishment mappings (including exact header from CSV)
            "Estabelecimento Nome": "id_estabelecimento",
            "Nome Estabelecimento": "id_estabelecimento",
            Estabelecimento: "id_estabelecimento",
            "Id Estabelecimento": "id_estabelecimento",
            "ID Estabelecimento": "id_estabelecimento",
            // Basic fields
            Nome: "nome",
            Gênero: "genero",
            Genero: "genero",
            Profissão: "profissao",
            Profissao: "profissao",
            Email: "email",
            // Contact fields
            DDI: "ddi",
            Ddi: "ddi",
            Telefone: "telefone",
            // Address fields
            CEP: "cep",
            Cep: "cep",
            Endereço: "endereco",
            Endereco: "endereco",
            Cidade: "cidade",
            UF: "uf",
            Uf: "uf",
            País: "pais",
            Pais: "pais",
            // Boolean fields (exact match from CSV)
            "Aceita Promocao Email": "aceita_promocao_email",
            "Aceita Promoção por Email": "aceita_promocao_email",
            "Aceita Promocao por Email": "aceita_promocao_email",
            "Aceita Promoção Email": "aceita_promocao_email",
            "Aceita Promoção": "aceita_promocao_email",
            "Aceita Promocao": "aceita_promocao_email",
            // Status fields
            Ativo: "ativo",
            Status: "ativo",
            "Data de Cadastro": "data_cadastro",
            "Data Cadastro": "data_cadastro",
          };

          const mapped =
            map[header] || header.toLowerCase().replace(/\s+/g, "_");
          console.log(`Header mapping: "${header}" -> "${mapped}"`);
          return mapped;
        }}
        validateRecord={(record, index) => {
          const errors: string[] = [];
          const required = ["id_estabelecimento", "nome"];

          console.log(`Validating record ${index + 1}:`, record);

          // Normalize scientific notation from Excel (e.g., 1.1E+12)
          const normalizeSci = (v: any): string => {
            if (v == null || v === "") return "";
            const s = String(v).trim().replace(",", ".");
            const m = s.match(/^(\d+)(?:[\.](\d*))?[eE]\+(\d+)$/);
            if (!m) return s;
            const int = m[1];
            const frac = m[2] || "";
            const exp = parseInt(m[3], 10);
            const digits = int + frac;
            const zeros = Math.max(exp - frac.length, 0);
            return digits + "0".repeat(zeros);
          };

          // Normalize boolean values
          const normalizeBool = (v: any): boolean | undefined => {
            if (v == null || v === "") return undefined;
            const s = String(v).trim().toLowerCase();
            if (["1", "true", "ativo", "sim", "yes", "s"].includes(s))
              return true;
            if (["0", "false", "inativo", "nao", "não", "no", "n"].includes(s))
              return false;
            return undefined;
          };

          // Normalize text fields first
          [
            "nome",
            "genero",
            "profissao",
            "endereco",
            "cidade",
            "uf",
            "pais",
            "id_estabelecimento",
          ].forEach((field) => {
            if (record[field] != null && record[field] !== "") {
              record[field] = String(record[field]).trim();
            }
          });

          // Check required fields (only establishment and name are truly required)
          required.forEach((k) => {
            if (!record[k] || record[k] === "") {
              const fieldName =
                k === "id_estabelecimento" ? "Estabelecimento" : k;
              errors.push(`${fieldName} é obrigatório`);
            }
          });

          // Validate and normalize email (only if provided)
          if (record.email && record.email.trim() !== "") {
            const email = String(record.email).trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              errors.push("Email inválido");
            } else {
              record.email = email;
            }
          }

          // Validate and normalize telefone (make it optional for now)
          if (record.telefone && record.telefone.trim() !== "") {
            const cleaned = normalizeSci(record.telefone);
            const digits = cleaned.replace(/\D/g, "");
            if (digits.length < 8 || digits.length > 15) {
              console.warn(
                `Telefone "${record.telefone}" -> "${digits}" has ${digits.length} digits`,
              );
              // Don't fail, just normalize
            }
            record.telefone = digits;
          } else {
            // Provide default if missing
            record.telefone = "000000000";
          }

          // Normalize DDI (provide default if missing)
          if (record.ddi && record.ddi.trim() !== "") {
            let cleaned = normalizeSci(record.ddi);
            cleaned = cleaned.replace(/\D/g, "");
            if (cleaned.length >= 1) {
              if (!cleaned.startsWith("55")) cleaned = "55";
              record.ddi = "+" + cleaned;
            } else {
              record.ddi = "+55";
            }
          } else {
            record.ddi = "+55";
          }

          // Validate and normalize CEP (optional)
          if (record.cep && record.cep.trim() !== "") {
            const cleaned = normalizeSci(record.cep);
            const digits = cleaned.replace(/\D/g, "");
            if (digits.length !== 8) {
              console.warn(
                `CEP "${record.cep}" -> "${digits}" has ${digits.length} digits, expected 8`,
              );
              // Don't fail validation, just warn
            }
            record.cep = digits || undefined;
          }

          // Normalize UF to uppercase
          if (record.uf && record.uf.trim() !== "") {
            record.uf = String(record.uf).trim().toUpperCase().slice(0, 2);
          }

          // Normalize boolean fields
          record.ativo = normalizeBool(record.ativo) ?? true;
          record.aceita_promocao_email =
            normalizeBool(record.aceita_promocao_email) ?? false;

          console.log(
            `Record ${index + 1} after validation:`,
            record,
            "Errors:",
            errors,
          );
          return errors;
        }}
        onGetRelatedId={async (fieldName, value) => {
          if (fieldName === "id_estabelecimento") {
            if (!value || String(value).trim() === "") {
              console.log("Empty establishment value, using fallback");
              return estabelecimentos[0]?.id || 1;
            }

            const searchValue = String(value).trim();
            console.log(`Resolving establishment: "${searchValue}"`);
            console.log(
              "Available establishments:",
              estabelecimentos.map((e) => e.nome),
            );

            // First try exact match (case insensitive)
            const byName = estabelecimentos.find(
              (e) => e.nome?.trim().toLowerCase() === searchValue.toLowerCase(),
            );
            if (byName) {
              console.log(
                `Found exact match: ${byName.nome} (ID: ${byName.id})`,
              );
              return byName.id;
            }

            // Try partial match
            const partialMatch = estabelecimentos.find(
              (e) =>
                e.nome
                  ?.trim()
                  .toLowerCase()
                  .includes(searchValue.toLowerCase()) ||
                searchValue
                  .toLowerCase()
                  .includes(e.nome?.trim().toLowerCase() || ""),
            );
            if (partialMatch) {
              console.log(
                `Found partial match: ${partialMatch.nome} (ID: ${partialMatch.id})`,
              );
              return partialMatch.id;
            }

            // If not found locally, try API search
            try {
              const params = new URLSearchParams({
                page: "1",
                limit: "200",
                search: searchValue,
              });
              const res = await makeRequest(`/api/estabelecimentos?${params}`);
              const found = (res?.data || []).find(
                (e: any) =>
                  e.nome?.trim().toLowerCase() === searchValue.toLowerCase(),
              );
              if (found) {
                console.log(`Found via API: ${found.nome} (ID: ${found.id})`);
                return found.id;
              }
            } catch (error) {
              console.error("Error searching establishments via API:", error);
            }

            // Use fallback to first available establishment
            const fallback =
              estabelecimentos.find((e) => e.ativo) || estabelecimentos[0];
            if (fallback) {
              console.warn(
                `Estabelecimento "${searchValue}" não encontrado. Usando fallback: ${fallback.nome} (ID: ${fallback.id})`,
              );
              return fallback.id;
            }

            console.warn(`No establishments available, using ID 1 as fallback`);
            return 1;
          }
          return null;
        }}
      />

      <DeleteAlert
        isOpen={showDeleteAlert}
        onClose={() => {
          setShowDeleteAlert(false);
          setCurrentCliente(null);
        }}
        onConfirm={confirmDelete}
        itemName={currentCliente?.nome}
        isLoading={deleteLoading}
      />
      <BulkDeleteAlert
        isOpen={showBulkDeleteAlert}
        onClose={() => {
          setShowBulkDeleteAlert(false);
        }}
        onConfirm={confirmBulkDelete}
        selectedCount={selectedIds.length}
        isLoading={deleteLoading}
      />
      <PaymentRequiredAlert
        isOpen={showPaymentAlert}
        onClose={() => setShowPaymentAlert(false)}
      />
    </div>
  );
}
