import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Home,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Package,
  Truck,
  User,
  Store,
  CreditCard,
  ClipboardList,
  Search,
  Plus,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/data-grid";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";
import { EstabelecimentoForm } from "./EstabelecimentoForm";
import { EstabelecimentoView } from "./EstabelecimentoView";
import {
  AlertDialogComponent,
  DeleteAlert,
  BulkDeleteAlert,
  PaymentRequiredAlert,
} from "@/components/alert-dialog-component";
import { toast } from "@/hooks/use-toast";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Estabelecimento,
  EstabelecimentoFormData,
  EstabelecimentosListResponse,
  ESTABELECIMENTO_EXPORT_COLUMNS,
  ESTABELECIMENTO_IMPORT_COLUMNS,
  formatTelefone,
  formatEndereco,
} from "@shared/estabelecimentos";

function EstabelecimentosModule() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { getUserRole, hasPayment, logout, isAuthenticated, isLoading } =
    useAuth();
  const navigate = useNavigate();
  const { makeRequest } = useAuthenticatedRequest();

  // Data state
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;
  const LOCAL_KEY = "fm_estabelecimentos";
  const readLocal = (): Estabelecimento[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as Estabelecimento[]) : [];
    } catch {
      return [];
    }
  };

  // Always clear caches when entering this page
  useEffect(() => {
    try {
      localStorage.removeItem("fm_estabelecimentos");
      localStorage.removeItem("fm_clientes");
      console.log("[DEBUG] Cleared localStorage caches");
    } catch {}
  }, []);
  const writeLocal = (list: Estabelecimento[]) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  };

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showBulkDeleteAlert, setShowBulkDeleteAlert] = useState(false);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);

  // Current item state
  const [currentEstabelecimento, setCurrentEstabelecimento] =
    useState<Estabelecimento | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const userRole = getUserRole();
  const hasPaymentPlan = hasPayment();

  const menuItems = [
    { icon: Home, label: "Dashboard", route: "/dashboard" },
    { icon: Store, label: "Estabelecimentos", route: "/estabelecimentos" },
    { icon: Users, label: "Clientes", route: "/clientes" },
  ];

  const renderMenuItem = (item: any, index: number) => {
    const isActive = location.pathname === item.route;
    return (
      <Link
        key={index}
        to={item.route}
        className={`w-full flex items-center px-4 py-2 text-left transition-colors ${
          isActive
            ? "bg-orange-50 text-foodmax-orange border-r-4 border-foodmax-orange"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <item.icon className="w-4 h-4" />
        {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
      </Link>
    );
  };

  // Grid columns configuration
  const gridColumns = [
    {
      key: "nome" as const,
      label: "Nome",
      sortable: true,
      render: (value: string, record: Estabelecimento) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      key: "cnpj" as const,
      label: "CNPJ",
      sortable: true,
    },
    {
      key: "telefone" as const,
      label: "Telefone",
      sortable: true,
      render: (value: string, record: Estabelecimento) =>
        formatTelefone(record.ddi, record.telefone),
    },
    {
      key: "endereco_completo" as const,
      label: "Cidade/UF",
      sortable: true,
      render: (value: any, record: Estabelecimento) =>
        formatEndereco(record.endereco),
    },
    {
      key: "tipo_estabelecimento" as const,
      label: "Tipo",
      sortable: true,
      render: (value: string) => {
        const soft: Record<string, string> = {
          Restaurante: "bg-blue-50 text-blue-700 border border-blue-200",
          Bar: "bg-purple-50 text-purple-700 border border-purple-200",
          Lancheria: "bg-orange-50 text-orange-700 border border-orange-200",
          Churrascaria: "bg-red-50 text-red-700 border border-red-200",
          Petiscaria: "bg-yellow-50 text-yellow-700 border border-yellow-200",
          Pizzaria: "bg-indigo-50 text-indigo-700 border border-indigo-200",
          Outro: "bg-gray-50 text-gray-700 border border-gray-200",
        };
        return (
          <Badge
            className={`${soft[value] || "bg-gray-50 text-gray-700 border border-gray-200"}`}
          >
            {value}
          </Badge>
        );
      },
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
  ];

  // Load estabelecimentos
  const loadEstabelecimentos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
      });

      let response: EstabelecimentosListResponse | null = null;
      try {
        response = await makeRequest(`/api/estabelecimentos?${params}`);
      } catch (err: any) {
        response = null;
      }

      if (response) {
        setEstabelecimentos(response.data);
        setTotalRecords(response.pagination.total);
      } else {
        setEstabelecimentos([]);
        setTotalRecords(0);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar estabelecimentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, makeRequest]);

  // Effects
  useEffect(() => {
    if (isLoading) return;
    loadEstabelecimentos();
  }, [loadEstabelecimentos, isLoading]);

  // Event handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleNew = () => {
    // Check free plan limit for new establishments
    if (
      userRole === "user" &&
      !hasPaymentPlan &&
      estabelecimentos.length >= 1
    ) {
      setShowPaymentAlert(true);
      return;
    }

    setCurrentEstabelecimento(null);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEdit = (estabelecimento: Estabelecimento) => {
    setCurrentEstabelecimento(estabelecimento);
    setIsEditing(true);
    setShowView(false);
    setShowForm(true);
  };

  const handleView = (estabelecimento: Estabelecimento) => {
    setCurrentEstabelecimento(estabelecimento);
    setShowView(true);
  };

  const handleDelete = (estabelecimento: Estabelecimento) => {
    setCurrentEstabelecimento(estabelecimento);
    setShowDeleteAlert(true);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione pelo menos um estabelecimento para excluir",
        variant: "destructive",
      });
      return;
    }
    setShowBulkDeleteAlert(true);
  };

  const handleToggleStatus = async (estabelecimento: Estabelecimento) => {
    try {
      await makeRequest(
        `/api/estabelecimentos/${estabelecimento.id}/toggle-status`,
        { method: "PATCH" },
      );
      toast({
        title: `Estabelecimento ${estabelecimento.ativo ? "desativado" : "ativado"}`,
        description: `Estabelecimento ${estabelecimento.ativo ? "desativado" : "ativado"} com sucesso`,
      });
      loadEstabelecimentos();
    } catch (error: any) {
      const list = readLocal();
      const idx = list.findIndex((e) => e.id === estabelecimento.id);
      if (idx >= 0) {
        list[idx].ativo = !list[idx].ativo;
        list[idx].data_atualizacao = new Date().toISOString();
        writeLocal(list);
        setEstabelecimentos(list);
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

  // Form save handler
  const handleSave = async (data: EstabelecimentoFormData) => {
    setFormLoading(true);
    try {
      if (isEditing && currentEstabelecimento) {
        await makeRequest(
          `/api/estabelecimentos/${currentEstabelecimento.id}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
          },
        );
        toast({
          title: "Estabelecimento atualizado",
          description: "Estabelecimento atualizado com sucesso",
        });
      } else {
        await makeRequest("/api/estabelecimentos", {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({
          title: "Estabelecimento criado",
          description: "Estabelecimento criado com sucesso",
        });
      }

      // Clear selection and reload data
      setSelectedIds([]);
      loadEstabelecimentos();
      setShowForm(false);
    } catch (error: any) {
      const list = readLocal();
      if (isEditing && currentEstabelecimento) {
        const idx = list.findIndex((e) => e.id === currentEstabelecimento.id);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            ...data,
            data_atualizacao: new Date().toISOString(),
          } as any;
        }
        toast({ title: "Estabelecimento atualizado" });
      } else {
        const now = new Date().toISOString();
        const novo: Estabelecimento = {
          id: Date.now(),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          nome: data.nome,
          razao_social: data.razao_social,
          cnpj: data.cnpj,
          tipo_estabelecimento: data.tipo_estabelecimento,
          email: data.email,
          ddi: data.ddi,
          telefone: data.telefone,
          ativo: data.ativo ?? true,
          data_cadastro: now,
          data_atualizacao: now,
          endereco: {
            id: Date.now(),
            estabelecimento_id: 0,
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
        toast({ title: "Estabelecimento criado" });
      }
      writeLocal(list);
      setEstabelecimentos(list);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete handlers
  const confirmDelete = async () => {
    if (!currentEstabelecimento) return;

    // Offline/local mode: handle without API preserving dependency message
    if (!isAuthenticated) {
      const clientesRaw = localStorage.getItem("fm_clientes");
      const clientes: any[] = clientesRaw ? JSON.parse(clientesRaw) : [];
      const hasDeps = clientes.some(
        (c) => Number(c.estabelecimento_id) === currentEstabelecimento.id,
      );
      if (hasDeps) {
        toast({
          title: "Não foi possível excluir",
          description:
            "Não é possível excluir o Estabelecimento pois existem Clientes vinculados. Exclua ou transfira os clientes antes de excluir o estabelecimento.",
          variant: "destructive",
        });
        setShowDeleteAlert(false);
        return;
      }
      const list = readLocal().filter(
        (e) => e.id !== currentEstabelecimento.id,
      );
      writeLocal(list);
      setEstabelecimentos(list);
      setSelectedIds([]);
      toast({ title: "Estabelecimento excluído" });
      setShowDeleteAlert(false);
      return;
    }

    setDeleteLoading(true);
    try {
      await makeRequest(`/api/estabelecimentos/${currentEstabelecimento.id}`, {
        method: "DELETE",
      });

      toast({
        title: "Estabelecimento excluído",
        description: "Estabelecimento excluído com sucesso",
      });

      setSelectedIds([]);
      await loadEstabelecimentos();
      setShowDeleteAlert(false);
    } catch (error: any) {
      const status = error?.status;
      const data = error?.data || {};
      let description: string = error?.message;
      if (!description || status === 409) {
        if (data?.blockedIds?.length) {
          description = `Não é possível excluir ${data.blockedIds.length} registro(s): existem Clientes vinculados. Exclua ou transfira os clientes antes de excluir.`;
        } else if (
          /Clientes vinculados|depend.ncias/i.test(String(data?.error || ""))
        ) {
          description = String(data.error);
        } else if (!description) {
          description =
            "Existem dependências com outros módulos. Remova-as antes de excluir.";
        }
      }
      toast({
        title: "Não foi possível excluir",
        description,
        variant: "destructive",
      });
      await loadEstabelecimentos();
      setShowDeleteAlert(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmBulkDelete = async () => {
    // Offline/local mode
    if (!isAuthenticated) {
      const clientesRaw = localStorage.getItem("fm_clientes");
      const clientes: any[] = clientesRaw ? JSON.parse(clientesRaw) : [];
      const blocked = new Set<number>();
      for (const id of selectedIds) {
        const hasDeps = clientes.some(
          (c) => Number(c.estabelecimento_id) === id,
        );
        if (hasDeps) blocked.add(id);
      }
      if (blocked.size > 0) {
        toast({
          title: "Não foi possível excluir algum(ns) registro(s)",
          description: `Não é possível excluir ${blocked.size} registro(s): existem Clientes vinculados. Exclua ou transfira os clientes antes de excluir.`,
          variant: "destructive",
        });
      }
      const deletable = selectedIds.filter((id) => !blocked.has(id));
      if (deletable.length > 0) {
        const list = readLocal().filter((e) => !deletable.includes(e.id));
        writeLocal(list);
        setEstabelecimentos(list);
        toast({
          title: "Estabelecimentos excluídos",
          description: `${deletable.length} estabelecimento(s) excluído(s) com sucesso`,
        });
      }
      setSelectedIds([]);
      setShowBulkDeleteAlert(false);
      return;
    }

    setDeleteLoading(true);
    try {
      await makeRequest("/api/estabelecimentos/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds }),
      });

      toast({
        title: "Estabelecimentos excluídos",
        description: `${selectedIds.length} estabelecimento(s) excluído(s) com sucesso`,
      });

      setSelectedIds([]);
      await loadEstabelecimentos();
      setShowBulkDeleteAlert(false);
    } catch (error: any) {
      const status = error?.status;
      const data = error?.data || {};
      let description: string = error?.message;
      if (!description || status === 409) {
        if (data?.blockedIds?.length) {
          description = `Não é possível excluir ${data.blockedIds.length} registro(s): existem Clientes vinculados. Exclua ou transfira os clientes antes de excluir.`;
        } else if (
          /Clientes vinculados|depend.ncias/i.test(String(data?.error || ""))
        ) {
          description = String(data.error);
        } else if (!description) {
          description =
            "Existem dependências com outros módulos. Remova-as antes de excluir.";
        }
      }
      toast({
        title: "Não foi possível excluir algum(ns) registro(s)",
        description,
        variant: "destructive",
      });
      await loadEstabelecimentos();
      setShowBulkDeleteAlert(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helpers for import normalization and deduplication
  const onlyDigits = (v: any) => String(v || "").replace(/\D/g, "");
  const toBool = (v: any): boolean | undefined => {
    if (typeof v === "boolean") return v;
    if (v == null) return undefined;
    const s = String(v).trim().toLowerCase();
    if (["1", "true", "ativo", "yes", "sim"].includes(s)) return true;
    if (["0", "false", "inativo", "no", "nao", "não"].includes(s)) return false;
    return undefined;
  };
  const normalizeTipo = (t: any): Estabelecimento["tipo_estabelecimento"] => {
    const map: Record<string, Estabelecimento["tipo_estabelecimento"]> = {
      restaurante: "Restaurante",
      bar: "Bar",
      lancheria: "Lancheria",
      churrascaria: "Churrascaria",
      petiscaria: "Petiscaria",
      pizzaria: "Pizzaria",
      outro: "Outro",
    };
    const k = String(t || "")
      .trim()
      .toLowerCase();
    return map[k] || "Outro";
  };
  const makeKey = (r: any) => {
    const cnpj = onlyDigits(r.cnpj);
    return cnpj
      ? `cnpj:${cnpj}`
      : `nome:${(r.nome || "").trim().toLowerCase()}`;
  };
  const normalizeRecord = (r: any) => {
    const ativo = toBool(r.ativo);
    const cnpj = onlyDigits(r.cnpj);
    return {
      nome: (r.nome || "").trim(),
      razao_social: r.razao_social || undefined,
      cnpj: cnpj || undefined,
      tipo_estabelecimento: normalizeTipo(r.tipo_estabelecimento),
      email: r.email?.trim(),
      ddi: String(r.ddi || "").trim(),
      telefone: String(r.telefone || "").trim(),
      ...(ativo !== undefined ? { ativo } : {}),
      cep: r.cep || undefined,
      endereco: r.endereco || undefined,
      cidade: r.cidade || undefined,
      uf: r.uf || undefined,
      pais: r.pais || undefined,
    };
  };

  // Import handler
  const handleImport = async (records: any[]) => {
    console.log("[DEBUG] Starting import with", records.length, "records");
    console.log("[DEBUG] First record:", records[0]);

    // Normalize and remove duplicates (within file and against current list)
    const normalized = records.map(normalizeRecord);
    console.log("[DEBUG] Normalized first record:", normalized[0]);

    const existingKeys = new Set(
      estabelecimentos.map((e) =>
        e.cnpj
          ? `cnpj:${onlyDigits(e.cnpj)}`
          : `nome:${e.nome.trim().toLowerCase()}`,
      ),
    );

    const seenInFile = new Set<string>();
    const unique: any[] = [];
    for (const r of normalized) {
      const key = makeKey(r);
      if (!key || seenInFile.has(key) || existingKeys.has(key)) continue;
      seenInFile.add(key);
      unique.push(r);
    }

    console.log("[DEBUG] Unique records to import:", unique.length);

    if (unique.length === 0) {
      return {
        success: true,
        message: "Nenhum novo registro para importar",
        imported: 0,
        errors: ["Registros duplicados ou já existentes foram ignorados"],
      } as any;
    }

    try {
      console.log("[DEBUG] Calling API with:", unique);
      const response = await makeRequest("/api/estabelecimentos/import", {
        method: "POST",
        body: JSON.stringify({ records: unique }),
      });

      console.log("[DEBUG] API response:", response);
      loadEstabelecimentos();
      return response;
    } catch (error: any) {
      console.error("[DEBUG] Import API failed:", error);

      // Show error to user instead of silent fallback
      throw new Error(
        `Erro na importação: ${error.message || "Falha na comunicação com o servidor"}`
      );
    }
  };

  return (
    <div className="flex h-screen bg-foodmax-gray-bg">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-64" : "w-16"} bg-white shadow-lg transition-all duration-300 flex flex-col h-full`}
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          {/* Logo */}
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

          {/* Principal section */}
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

        {/* Fixed footer */}
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

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-foodmax-gray-bg px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                Estabelecimentos
              </h2>
              <p className="text-gray-600 mt-1">
                Gerencie todos os estabelecimentos cadastrados no sistema.
              </p>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Controls */}
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar registros..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="foodmax-input pl-10"
                  />
                </div>

                {/* Action buttons */}
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

            {/* Data Grid */}
            <DataGrid
              columns={gridColumns}
              data={estabelecimentos.map((e) => ({
                ...e,
                endereco_completo: formatEndereco(e.endereco),
              }))}
              loading={loading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              searchTerm={searchTerm}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onPageChange={handlePageChange}
            />
          </div>
        </main>
      </div>

      {/* Modals */}
      <EstabelecimentoForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        estabelecimento={currentEstabelecimento}
        isLoading={formLoading}
      />

      <EstabelecimentoView
        isOpen={showView}
        onClose={() => setShowView(false)}
        onEdit={handleEdit}
        estabelecimento={currentEstabelecimento}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={estabelecimentos}
        selectedIds={selectedIds}
        moduleName="Estabelecimentos"
        columns={ESTABELECIMENTO_EXPORT_COLUMNS}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName="Estabelecimentos"
        columns={ESTABELECIMENTO_IMPORT_COLUMNS.map((col) => ({
          ...col,
          required: [
            "nome",
            "tipo_estabelecimento",
            "email",
            "ddi",
            "telefone",
          ].includes(col.key),
        }))}
        onImport={handleImport}
        userRole={userRole}
        hasPayment={hasPaymentPlan}
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
            CEP: "cep",
            Cep: "cep",
            Endereço: "endereco",
            Endereco: "endereco",
            Cidade: "cidade",
            UF: "uf",
            Uf: "uf",
            País: "pais",
            Pais: "pais",
            "Tipo de Estabelecimento": "tipo_estabelecimento",
            "Tipo Estabelecimento": "tipo_estabelecimento",
            Tipo: "tipo_estabelecimento",
            Ativo: "ativo",
            "Data de Cadastro": "data_cadastro",
            "Data Cadastro": "data_cadastro",
          };
          const mapped = map[header] || header.toLowerCase().replace(/\s+/g, "_");
          console.log(`[DEBUG] Header mapping: "${header}" -> "${mapped}"`);
          return mapped;
        }}
        validateRecord={(record, index) => {
          console.log(`[DEBUG] Validating record ${index + 1}:`, record);
          const errors: string[] = [];
          const required = [
            "nome",
            "tipo_estabelecimento",
            "email",
            "ddi",
            "telefone",
          ];
          required.forEach((k) => {
            if (!record[k]) {
              errors.push(`Campo obrigatório '${k}' não preenchido`);
              console.log(`[DEBUG] Missing required field: ${k}`);
            }
          });
          if (
            record.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)
          ) {
            errors.push("Email inválido");
          }
          if (record.cnpj) {
            const digits = String(record.cnpj).replace(/\D/g, "");
            if (digits.length !== 14) errors.push("CNPJ deve ter 14 dígitos");
            else record.cnpj = digits;
          }
          if (errors.length > 0) {
            console.log(`[DEBUG] Validation errors for record ${index + 1}:`, errors);
          }
          return errors;
        }}
      />

      {/* Alert Dialogs */}
      <DeleteAlert
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={confirmDelete}
        itemName={currentEstabelecimento?.nome}
        isLoading={deleteLoading}
      />

      <BulkDeleteAlert
        isOpen={showBulkDeleteAlert}
        onClose={() => setShowBulkDeleteAlert(false)}
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

export default EstabelecimentosModule;
export { EstabelecimentosModule };
