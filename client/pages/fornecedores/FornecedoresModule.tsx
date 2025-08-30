import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Home,
  Users,
  Store,
  Truck,
  Plus,
  Download,
  Upload,
  Trash2,
  Eye,
  Edit,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/data-grid";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";
import { FornecedorForm } from "./FornecedorForm";
import { FornecedorView } from "./FornecedorView";
import {
  AlertDialogComponent,
  DeleteAlert,
  BulkDeleteAlert,
} from "@/components/alert-dialog-component";
import { toast } from "@/hooks/use-toast";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Fornecedor,
  CreateFornecedorRequest,
  FornecedoresListResponse,
  formatTelefone,
  formatEnderecoCidadeUF,
} from "@shared/fornecedores";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function FornecedoresModule() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { makeRequest } = useAuthenticatedRequest();

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;
  const LOCAL_KEY = "fm_fornecedores";
  const readLocal = (): Fornecedor[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as Fornecedor[]) : [];
    } catch {
      return [];
    }
  };
  const writeLocal = (list: Fornecedor[]) =>
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));

  useEffect(() => {
    try {
      localStorage.removeItem("fm_fornecedores");
    } catch {}
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showBulkDeleteAlert, setShowBulkDeleteAlert] = useState(false);

  const [currentFornecedor, setCurrentFornecedor] = useState<Fornecedor | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const menuItems = [
    { icon: Home, label: "Dashboard", route: "/dashboard" },
    { icon: Store, label: "Estabelecimentos", route: "/estabelecimentos" },
    { icon: Users, label: "Clientes", route: "/clientes" },
    { icon: Truck, label: "Fornecedores", route: "/fornecedores" },
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

  const gridColumns = [
    {
      key: "nome" as const,
      label: "Nome",
      sortable: true,
      render: (value: string, record: Fornecedor) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{record.email}</div>
        </div>
      ),
    },
    { key: "cnpj" as const, label: "CNPJ", sortable: true },
    {
      key: "telefone" as const,
      label: "Telefone",
      sortable: true,
      render: (value: string, record: Fornecedor) =>
        formatTelefone(record.ddi, record.telefone),
    },
    {
      key: "endereco_completo" as const,
      label: "Cidade/UF",
      sortable: true,
      render: (value: any, record: Fornecedor) =>
        formatEnderecoCidadeUF(record.endereco),
    },
    {
      key: "ativo" as const,
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
      key: "data_cadastro" as const,
      label: "Data Cadastro",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("pt-BR"),
    },
    {
      key: "actions" as const,
      label: "Ações",
      render: (_: any, record: Fornecedor) => {
        const whatsapp = `http://wa.me/${record.ddi.replace(/\D/g, "")}${record.telefone.replace(/\D/g, "")}`;
        return (
          <div className="flex items-center justify-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 w-8 p-0 rounded-full border bg-gray-50 hover:bg-gray-100 border-gray-300 flex items-center justify-center"
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
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-black text-white border-black">WhatsApp</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleStatus(record)}
              className={`h-8 w-8 p-0 rounded-full border ${record.ativo ? "bg-green-50 hover:bg-green-100 border-green-200" : "bg-gray-50 hover:bg-gray-100 border-gray-200"}`}
              title={record.ativo ? "Desativar" : "Ativar"}
            >
              <Power
                className={`w-4 h-4 ${record.ativo ? "text-green-600" : "text-gray-500"}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleView(record)}
              className="h-8 w-8 p-0 rounded-full border bg-blue-50 hover:bg-blue-100 border-blue-200"
              title="Visualizar"
            >
              <Eye className="w-4 h-4 text-blue-700" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(record)}
              className="h-8 w-8 p-0 rounded-full border bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
              title="Editar"
            >
              <Edit className="w-4 h-4 text-yellow-700" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(record)}
              className="h-8 w-8 p-0 rounded-full border bg-red-50 hover:bg-red-100 border-red-200"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4 text-red-700" />
            </Button>
          </div>
        );
      },
    },
  ];

  const loadFornecedores = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
      });
      let response: FornecedoresListResponse | null = null;
      try {
        response = await makeRequest(`/api/fornecedores?${params}`);
      } catch {
        response = null;
      }
      if (response) {
        setFornecedores(response.data);
        setTotalRecords(response.pagination.total);
      } else {
        setFornecedores([]);
        setTotalRecords(0);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar fornecedores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, makeRequest]);

  useEffect(() => {
    if (isLoading) return;
    loadFornecedores();
  }, [loadFornecedores, isLoading]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleNew = () => {
    setCurrentFornecedor(null);
    setIsEditing(false);
    setShowForm(true);
  };
  const handleEdit = (f: Fornecedor) => {
    setCurrentFornecedor(f);
    setIsEditing(true);
    setShowView(false);
    setShowForm(true);
  };
  const handleView = (f: Fornecedor) => {
    setCurrentFornecedor(f);
    setShowView(true);
  };
  const handleDelete = (f: Fornecedor) => {
    setCurrentFornecedor(f);
    setShowDeleteAlert(true);
  };

  const handleToggleStatus = async (f: Fornecedor) => {
    try {
      await makeRequest(`/api/fornecedores/${f.id}/toggle-status`, {
        method: "PATCH",
      });
      toast({
        title: `Fornecedor ${f.ativo ? "desativado" : "ativado"}`,
        description: `Fornecedor ${f.ativo ? "desativado" : "ativado"} com sucesso`,
      });
      loadFornecedores();
    } catch (error: any) {
      const list = readLocal();
      const idx = list.findIndex((e) => e.id === f.id);
      if (idx >= 0) {
        list[idx].ativo = !list[idx].ativo;
        list[idx].data_atualizacao = new Date().toISOString();
        writeLocal(list);
        setFornecedores(list);
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

  const handleSave = async (data: CreateFornecedorRequest) => {
    setFormLoading(true);
    try {
      if (isEditing && currentFornecedor) {
        await makeRequest(`/api/fornecedores/${currentFornecedor.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast({
          title: "Fornecedor atualizado",
          description: "Fornecedor atualizado com sucesso",
        });
      } else {
        await makeRequest(`/api/fornecedores`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({
          title: "Fornecedor criado",
          description: "Fornecedor criado com sucesso",
        });
      }
      setSelectedIds([]);
      loadFornecedores();
      setShowForm(false);
    } catch (error: any) {
      const list = readLocal();
      if (isEditing && currentFornecedor) {
        const idx = list.findIndex((e) => e.id === currentFornecedor.id);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            ...data,
            data_atualizacao: new Date().toISOString(),
          } as any;
        }
        toast({ title: "Fornecedor atualizado" });
      } else {
        const now = new Date().toISOString();
        const novo: Fornecedor = {
          id: Date.now(),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          nome: data.nome,
          razao_social: data.razao_social,
          cnpj: data.cnpj,
          email: data.email,
          ddi: data.ddi,
          telefone: data.telefone,
          nome_responsavel: data.nome_responsavel,
          ativo: data.ativo ?? true,
          data_cadastro: now,
          data_atualizacao: now,
          endereco: {
            id: Date.now(),
            fornecedor_id: 0,
            cep: data.cep,
            endereco: data.endereco,
            cidade: data.cidade,
            uf: data.uf,
            pais: data.pais || "Brasil",
            data_cadastro: now,
            data_atualizacao: now,
          },
        } as any;
        list.unshift(novo);
        toast({ title: "Fornecedor criado" });
      }
      writeLocal(list);
      setFornecedores(list);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!currentFornecedor) return;
    // Local fallback (no dependencies for now)
    if (!isAuthenticated) {
      const list = readLocal().filter((e) => e.id !== currentFornecedor.id);
      writeLocal(list);
      setFornecedores(list);
      setSelectedIds([]);
      toast({ title: "Fornecedor excluído" });
      setShowDeleteAlert(false);
      return;
    }

    setDeleteLoading(true);
    try {
      await makeRequest(`/api/fornecedores/${currentFornecedor.id}`, {
        method: "DELETE",
      });
      toast({
        title: "Fornecedor excluído",
        description: "Fornecedor excluído com sucesso",
      });
      setSelectedIds([]);
      await loadFornecedores();
      setShowDeleteAlert(false);
    } catch (error: any) {
      toast({
        title: "Não foi possível excluir",
        description: error.message,
        variant: "destructive",
      });
      await loadFornecedores();
      setShowDeleteAlert(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmBulkDelete = async () => {
    // Local fallback
    if (!isAuthenticated) {
      const list = readLocal().filter((e) => !selectedIds.includes(e.id));
      writeLocal(list);
      setFornecedores(list);
      toast({
        title: "Fornecedores excluídos",
        description: `${selectedIds.length} fornecedor(es) excluído(s) com sucesso`,
      });
      setSelectedIds([]);
      setShowBulkDeleteAlert(false);
      return;
    }

    setDeleteLoading(true);
    try {
      await makeRequest(`/api/fornecedores/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds }),
      });
      toast({
        title: "Fornecedores excluídos",
        description: `${selectedIds.length} fornecedor(es) excluído(s) com sucesso`,
      });
      setSelectedIds([]);
      await loadFornecedores();
      setShowBulkDeleteAlert(false);
    } catch (error: any) {
      toast({
        title: "Não foi possível excluir algum(ns) registro(s)",
        description: error.message,
        variant: "destructive",
      });
      await loadFornecedores();
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
    console.log("Processing import records:", records);

    try {
      const response = await makeRequest(`/api/fornecedores/import`, {
        method: "POST",
        body: JSON.stringify({ records }),
      });
      loadFornecedores();
      return response;
    } catch (error: any) {
      console.log("API failed, using local storage fallback", error);

      // Fallback to local storage
      const list = readLocal();
      const now = new Date().toISOString();

      const mapped = records.map((r: any, i: number) => ({
        id: Date.now() + i,
        id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
        nome: r.nome || "",
        razao_social: r.razao_social,
        cnpj: r.cnpj,
        email: r.email || "",
        ddi: r.ddi || "+55",
        telefone: r.telefone || "",
        nome_responsavel: r.nome_responsavel,
        ativo: r.ativo ?? true,
        data_cadastro: now,
        data_atualizacao: now,
        endereco:
          r.cep || r.endereco || r.cidade
            ? {
                id: Date.now() + i,
                fornecedor_id: 0,
                cep: r.cep,
                endereco: r.endereco,
                cidade: r.cidade,
                uf: r.uf,
                pais: r.pais || "Brasil",
                data_cadastro: now,
                data_atualizacao: now,
              }
            : undefined,
      })) as Fornecedor[];

      console.log("Mapped records for local storage:", mapped);

      const merged = [...mapped, ...list];
      writeLocal(merged);
      setFornecedores(merged);

      return {
        success: true,
        message: "Importação concluída",
        imported: mapped.length,
        errors: [],
      };
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
              <h2 className="text-2xl font-semibold text-gray-800">
                Fornecedores
              </h2>
              <p className="text-gray-600 mt-1">
                Gerencie todos os fornecedores cadastrados no sistema.
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Input
                    placeholder="Buscar registros..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="foodmax-input pl-3"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDeleteAlert(true)}
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
              data={fornecedores.map((f) => ({
                ...f,
                endereco_completo: formatEnderecoCidadeUF(f.endereco),
              }))}
              loading={loading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              showActions={false}
              searchTerm={searchTerm}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onPageChange={setCurrentPage}
            />
          </div>
        </main>
      </div>

      <FornecedorForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        fornecedor={currentFornecedor}
        isLoading={formLoading}
      />
      <FornecedorView
        isOpen={showView}
        onClose={() => setShowView(false)}
        onEdit={handleEdit}
        fornecedor={currentFornecedor}
      />
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={fornecedores.map((fornecedor) => ({
          nome: fornecedor.nome,
          razao_social: fornecedor.razao_social || "",
          cnpj: fornecedor.cnpj || "",
          email: fornecedor.email,
          ddi: fornecedor.ddi,
          telefone: fornecedor.telefone,
          nome_responsavel: fornecedor.nome_responsavel || "",
          cep: fornecedor.endereco?.cep || "",
          endereco: fornecedor.endereco?.endereco || "",
          cidade: fornecedor.endereco?.cidade || "",
          uf: fornecedor.endereco?.uf || "",
          pais: fornecedor.endereco?.pais || "Brasil",
          ativo: fornecedor.ativo ? "Ativo" : "Inativo",
          data_cadastro: fornecedor.data_cadastro,
        }))}
        selectedIds={selectedIds}
        moduleName="Fornecedores"
        columns={[
          { key: "nome", label: "Nome" },
          { key: "razao_social", label: "Razão Social" },
          { key: "cnpj", label: "CNPJ" },
          { key: "email", label: "Email" },
          { key: "ddi", label: "DDI" },
          { key: "telefone", label: "Telefone" },
          { key: "nome_responsavel", label: "Nome Responsável" },
          { key: "cep", label: "CEP" },
          { key: "endereco", label: "Endereço" },
          { key: "cidade", label: "Cidade" },
          { key: "uf", label: "UF" },
          { key: "pais", label: "País" },
          { key: "ativo", label: "Status" },
          { key: "data_cadastro", label: "Data de Cadastro" },
        ]}
      />
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName="Fornecedores"
        columns={[
          { key: "nome", label: "Nome", required: true },
          { key: "razao_social", label: "Razão Social" },
          { key: "cnpj", label: "CNPJ" },
          { key: "email", label: "Email", required: true },
          { key: "ddi", label: "DDI", required: true },
          { key: "telefone", label: "Telefone", required: true },
          { key: "nome_responsavel", label: "Nome Responsável" },
          { key: "cep", label: "CEP" },
          { key: "endereco", label: "Endereço" },
          { key: "cidade", label: "Cidade" },
          { key: "uf", label: "UF" },
          { key: "pais", label: "País" },
          { key: "ativo", label: "Status" },
        ]}
        onImport={handleImport}
        userRole={"admin"}
        hasPayment={true}
        mapHeader={(header) => {
          const map: Record<string, string> = {
            Nome: "nome",
            "Razão Social": "razao_social",
            "Razao Social": "razao_social",
            Cnpj: "cnpj",
            CNPJ: "cnpj",
            Email: "email",
            DDI: "ddi",
            Ddi: "ddi",
            Telefone: "telefone",
            "Nome Responsavel": "nome_responsavel",
            "Nome Responsável": "nome_responsavel",
            CEP: "cep",
            Cep: "cep",
            Endereço: "endereco",
            Endereco: "endereco",
            Cidade: "cidade",
            UF: "uf",
            Uf: "uf",
            País: "pais",
            Pais: "pais",
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
          const required = ["nome", "email", "ddi", "telefone"];

          console.log(`Validating record ${index + 1}:`, record);

          required.forEach((k) => {
            if (!record[k] || String(record[k]).trim() === "") {
              errors.push(`Campo obrigatório '${k}' não preenchido`);
            }
          });

          if (
            record.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)
          ) {
            errors.push("Email inválido");
          }

          if (record.cnpj && String(record.cnpj).trim() !== "") {
            const digits = String(record.cnpj).replace(/\D/g, "");
            if (digits.length > 0 && digits.length !== 14) {
              errors.push("CNPJ deve ter 14 dígitos quando preenchido");
            } else if (digits.length === 14) {
              record.cnpj = digits;
            } else {
              record.cnpj = undefined;
            }
          } else {
            record.cnpj = undefined;
          }

          // Normalize DDI
          if (record.ddi && record.ddi.trim() !== "") {
            let cleaned = String(record.ddi).replace(/\D/g, "");
            if (!cleaned.startsWith("55")) cleaned = "55";
            record.ddi = "+" + cleaned;
          } else {
            record.ddi = "+55";
          }

          // Normalize telefone
          if (record.telefone) {
            record.telefone = String(record.telefone).replace(/\D/g, "");
          }

          // Normalize boolean
          record.ativo = toBool(record.ativo) ?? true;

          console.log(
            `Record ${index + 1} after validation:`,
            record,
            "Errors:",
            errors,
          );
          return errors;
        }}
      />
      <DeleteAlert
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={confirmDelete}
        itemName={currentFornecedor?.nome}
        isLoading={deleteLoading}
      />
      <BulkDeleteAlert
        isOpen={showBulkDeleteAlert}
        onClose={() => setShowBulkDeleteAlert(false)}
        onConfirm={confirmBulkDelete}
        selectedCount={selectedIds.length}
        isLoading={deleteLoading}
      />
    </div>
  );
}

export default FornecedoresModule;
export { FornecedoresModule };
