import { useEffect, useMemo, useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/data-grid";
import { toast } from "@/hooks/use-toast";
import {
  FINANCEIRO_CATEGORIAS,
  FinanceiroTransacao,
  FinanceiroListResponse,
  TipoTransacao,
} from "@shared/financeiro";
import { Estabelecimento } from "@shared/estabelecimentos";
import { formatCurrencyBRL } from "@shared/itens";
import FinanceiroForm from "./FinanceiroForm";
import FinanceiroView from "./FinanceiroView";
import {
  Menu,
  Search,
  Plus,
  Trash2,
  Eye,
  Edit,
  Power,
  Upload,
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";
import {
  DeleteAlert,
  BulkDeleteAlert,
} from "@/components/alert-dialog-component";

export default function FinanceiroModule() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { isLoading, getUserRole, hasPayment } = useAuth();
  const { makeRequest } = useAuthenticatedRequest();

  const [activeTab, setActiveTab] = useState<"todos" | "receitas" | "despesas">(
    "todos",
  );

  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(
    [],
  );
  const [selectedEstabelecimento, setSelectedEstabelecimento] =
    useState<string>("all");
  const [period, setPeriod] = useState<string>("all");

  const [transacoes, setTransacoes] = useState<FinanceiroTransacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalRecords, setTotalRecords] = useState(0);
  const [totals, setTotals] = useState({
    totalReceitas: 0,
    totalDespesas: 0,
    saldoLiquido: 0,
  });
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);

  const LOCAL_KEY = "fm_financeiro";
  const readLocal = (): FinanceiroTransacao[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const writeLocal = (list: FinanceiroTransacao[]) =>
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));

  useEffect(() => {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const gridColumns = useMemo(
    () => [
      {
        key: "estabelecimento_nome",
        label: "Estabelecimento",
        sortable: true,
        render: (_: any, r: any) => r.estabelecimento_nome || "-",
      },
      { key: "categoria", label: "Categoria", sortable: true },
      {
        key: "valor",
        label: "Valor",
        sortable: true,
        render: (v: number) => formatCurrencyBRL(v),
      },
      {
        key: "data_transacao",
        label: "Data Transação",
        sortable: true,
        render: (v: string | null) =>
          v
            ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
            : "-",
      },
      {
        key: "tipo",
        label: "Tipo",
        sortable: true,
        render: (value: TipoTransacao) => (
          <Badge
            className={
              value === "Receita"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }
          >
            {value}
          </Badge>
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
        render: (v: string) => new Date(v).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      },
      {
        key: "acoes",
        label: "Ações",
        render: (_: any, r: FinanceiroTransacao) => (
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
    [estabelecimentos],
  );

  const loadEstabelecimentos = useCallback(async () => {
    try {
      let data: Estabelecimento[] = [];
      try {
        const params = new URLSearchParams({ page: "1", limit: "100" });
        const res = await makeRequest(`/api/estabelecimentos?${params}`);
        data = (res.data || []) as Estabelecimento[];
      } catch {
        const raw = localStorage.getItem("fm_estabelecimentos");
        data = raw ? (JSON.parse(raw) as Estabelecimento[]) : [];
      }
      data.sort((a, b) => (a.data_cadastro < b.data_cadastro ? 1 : -1));
      setEstabelecimentos(data);
      if (!selectedEstabelecimento) {
        setSelectedEstabelecimento("all");
      }
    } catch {}
  }, [makeRequest, selectedEstabelecimento]);

  const loadTransacoes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(searchTerm && { search: searchTerm }),
      });
      if (activeTab !== "todos")
        params.set("tipo", activeTab === "receitas" ? "Receita" : "Despesa");
      if (selectedEstabelecimento !== "all")
        params.set("estabelecimento_id", selectedEstabelecimento);
      if (period) params.set("period", period);

      let response: FinanceiroListResponse | null = null;
      try {
        response = await makeRequest(`/api/financeiro?${params}`);
      } catch {
        response = null;
      }
      if (response) {
        setTransacoes(response.data);
        setTotalRecords(response.pagination.total);
        setTotals(response.totals);
      } else {
        const local = readLocal();
        const filtered = local.filter((t) => {
          const byTipo =
            activeTab === "todos"
              ? true
              : t.tipo === (activeTab === "receitas" ? "Receita" : "Despesa");
          const byEst =
            selectedEstabelecimento === "all"
              ? true
              : t.estabelecimento_id === Number(selectedEstabelecimento);
          const bySearch = searchTerm
            ? t.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (t.descricao || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
            : true;
          return byTipo && byEst && bySearch;
        });
        setTransacoes(filtered);
        setTotalRecords(filtered.length);
        const totalReceitas = filtered
          .filter((f) => f.tipo === "Receita")
          .reduce((s, r) => s + r.valor, 0);
        const totalDespesas = filtered
          .filter((f) => f.tipo === "Despesa")
          .reduce((s, r) => s + r.valor, 0);
        setTotals({
          totalReceitas,
          totalDespesas,
          saldoLiquido: totalReceitas - totalDespesas,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    searchTerm,
    activeTab,
    selectedEstabelecimento,
    period,
    makeRequest,
  ]);

  useEffect(() => {
    if (isLoading) return;
    loadEstabelecimentos();
  }, [isLoading, loadEstabelecimentos]);

  useEffect(() => {
    if (isLoading) return;
    loadTransacoes();
  }, [isLoading, loadTransacoes]);

  useEffect(() => {
    const fetchAllForExport = async () => {
      try {
        const params = new URLSearchParams({ page: "1", limit: "10000" });
        if (activeTab !== "todos")
          params.set("tipo", activeTab === "receitas" ? "Receita" : "Despesa");
        if (selectedEstabelecimento !== "all")
          params.set("estabelecimento_id", selectedEstabelecimento);
        if (period) params.set("period", period);
        if (searchTerm) params.set("search", searchTerm);
        const res: FinanceiroListResponse = await makeRequest(
          `/api/financeiro?${params}`,
        );
        const mapped = (res.data || []).map((t) => ({
          estabelecimento_nome:
            estabelecimentos.find((e) => e.id === t.estabelecimento_id)?.nome ||
            "",
          tipo: t.tipo,
          categoria: t.categoria,
          valor: (t.valor / 100).toFixed(2),
          data_transacao: t.data_transacao
            ? new Date(t.data_transacao).toISOString().split("T")[0]
            : "",
          descricao: t.descricao || "",
          ativo: t.ativo ? "Ativo" : "Inativo",
          data_cadastro: new Date(t.data_cadastro).toISOString().split("T")[0],
        }));
        setExportData(mapped);
      } catch {
        const local = readLocal();
        const mapped = local.map((t) => ({
          estabelecimento_nome:
            estabelecimentos.find((e) => e.id === t.estabelecimento_id)?.nome ||
            "",
          tipo: t.tipo,
          categoria: t.categoria,
          valor: (t.valor / 100).toFixed(2),
          data_transacao: t.data_transacao
            ? new Date(t.data_transacao).toISOString().split("T")[0]
            : "",
          descricao: t.descricao || "",
          ativo: t.ativo ? "Ativo" : "Inativo",
          data_cadastro: new Date(t.data_cadastro).toISOString().split("T")[0],
        }));
        setExportData(mapped);
      }
    };
    if (showExport) fetchAllForExport();
    else setExportData([]);
  }, [
    showExport,
    activeTab,
    selectedEstabelecimento,
    period,
    searchTerm,
    estabelecimentos,
    makeRequest,
  ]);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [currentItem, setCurrentItem] = useState<FinanceiroTransacao | null>(
    null,
  );
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleNew = () => {
    setCurrentItem(null);
    setIsEditing(false);
    setShowForm(true);
  };
  const handleEdit = (t: FinanceiroTransacao) => {
    setCurrentItem(t);
    setIsEditing(true);
    setShowView(false);
    setShowForm(true);
  };
  const handleView = (t: FinanceiroTransacao) => {
    setCurrentItem(t);
    setShowView(true);
  };
  const handleDelete = (t: FinanceiroTransacao) => {
    setCurrentItem(t);
    setShowDeleteAlert(true);
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    const toISO = (s: any): string | null => {
      if (!s) return null;
      if (typeof s === "string") {
        const t = s.trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(t)) {
          const [dd, mm, yyyy] = t.split("/");
          return `${yyyy}-${mm}-${dd}T00:00:00-03:00`;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
          const [yyyy, mm, dd] = t.split("-");
          return `${yyyy}-${mm}-${dd}T00:00:00-03:00`;
        }
      }
      const d = new Date(s);
      if (!isNaN(d.getTime()))
        return `${d.toISOString().slice(0, 10)}T00:00:00-03:00`;
      return null;
    };
    const payload = {
      estabelecimento_id: Number(data.estabelecimento_id),
      tipo: data.tipo,
      categoria: String(data.categoria),
      valor: Number(data.valor) || 0,
      data_transacao: toISO(data.data_transacao),
      descricao: data.descricao ?? "",
      ativo: Boolean(data.ativo ?? true),
    };
    try {
      if (isEditing && currentItem) {
        await makeRequest(`/api/financeiro/${currentItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast({
          title: "Transação atualizada",
          description: "Atualizada com sucesso",
        });
      } else {
        await makeRequest(`/api/financeiro`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Transação criada", description: "Criada com sucesso" });
      }
      try {
        localStorage.removeItem(LOCAL_KEY);
      } catch {}
      await loadTransacoes();
      setShowForm(false);
    } catch {
      const list = readLocal();
      const now = new Date().toISOString();
      if (isEditing && currentItem) {
        const idx = list.findIndex((x) => x.id === currentItem.id);
        if (idx >= 0)
          list[idx] = {
            ...list[idx],
            ...payload,
            data_atualizacao: now,
          } as any;
        toast({
          title: "Transação atualizada",
          description: "Atualizada com sucesso",
        });
      } else {
        const novo: FinanceiroTransacao = {
          id: Date.now(),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          estabelecimento_id: payload.estabelecimento_id,
          tipo: payload.tipo as any,
          categoria: payload.categoria,
          valor: payload.valor,
          data_transacao: payload.data_transacao,
          descricao: payload.descricao || null,
          ativo: payload.ativo,
          data_cadastro: now,
          data_atualizacao: now,
        };
        list.unshift(novo);
        toast({ title: "Transação criada", description: "Criada com sucesso" });
      }
      writeLocal(list);
      setTransacoes(list);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (t: FinanceiroTransacao) => {
    try {
      await makeRequest(`/api/financeiro/${t.id}/toggle-status`, {
        method: "PATCH",
      });
      toast({
        title: `Transação ${t.ativo ? "desativada" : "ativada"}`,
        description: "Status atualizado",
      });
      loadTransacoes();
    } catch {
      const list = readLocal();
      const idx = list.findIndex((x) => x.id === t.id);
      if (idx >= 0) {
        list[idx].ativo = !list[idx].ativo;
        list[idx].data_atualizacao = new Date().toISOString();
        writeLocal(list);
        setTransacoes(list);
        toast({
          title: "Status atualizado",
          description: "Atualizado localmente",
        });
      }
    }
  };

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const handleDeleteConfirmed = async () => {
    if (!currentItem) return;
    try {
      await makeRequest(`/api/financeiro/${currentItem.id}`, {
        method: "DELETE",
      });
      toast({
        title: "Transação excluída",
        description: "Excluída com sucesso",
      });
      try {
        localStorage.removeItem(LOCAL_KEY);
      } catch {}
      setSelectedIds([]);
      await loadTransacoes();
      setShowDeleteAlert(false);
    } catch {
      const list = readLocal().filter((e) => e.id !== currentItem.id);
      writeLocal(list);
      setTransacoes(list);
      toast({
        title: "Transação excluída",
        description: "Excluída localmente",
      });
      setSelectedIds([]);
      setShowDeleteAlert(false);
    }
  };

  const estabOptions = useMemo(() => {
    const opts = estabelecimentos.map((e) => ({
      value: String(e.id),
      label: e.nome,
    }));
    opts.push({ value: "all", label: "Todos Estabelecimentos" });
    return opts;
  }, [estabelecimentos]);

  const periodoOptions = [
    { value: "all", label: "Todos Períodos" },
    { value: "7d", label: "Últimos 7 dias" },
    { value: "30d", label: "Últimos 30 dias" },
    { value: "month", label: "Este mês" },
    { value: "12m", label: "Últimos 12 meses" },
  ];

  return (
    <div className="flex h-screen bg-foodmax-gray-bg">
      <Sidebar
        open={sidebarOpen}
        onToggle={(next) =>
          setSidebarOpen(typeof next === "boolean" ? next : !sidebarOpen)
        }
      />

      <div className="flex-1 flex flex-col">
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
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  Financeiro
                </h2>
                <p className="text-gray-600 mt-1">
                  Gerencie suas receitas e despesas.
                </p>
                <div className="mt-3 flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div className="min-w-[320px] md:min-w-[420px] w-full">
                      <Select
                        value={selectedEstabelecimento}
                        onValueChange={(v) => {
                          setSelectedEstabelecimento(v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="foodmax-input h-11">
                          <SelectValue placeholder="Selecione o estabelecimento" />
                        </SelectTrigger>
                        <SelectContent>
                          {estabOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[260px] md:min-w-[340px] w-full">
                      <Select
                        value={period}
                        onValueChange={(v) => {
                          setPeriod(v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="foodmax-input h-11">
                          <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                          {periodoOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">
                            Total Receitas
                          </p>
                          <p className="text-2xl font-bold text-gray-800">
                            {formatCurrencyBRL(totals.totalReceitas)}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">
                            Total Despesas
                          </p>
                          <p className="text-2xl font-bold text-gray-800">
                            {formatCurrencyBRL(totals.totalDespesas)}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <TrendingDown className="w-6 h-6 text-red-600" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Saldo Líquido</p>
                          <p
                            className={`text-2xl font-bold ${totals.saldoLiquido >= 0 ? "text-green-700" : "text-red-700"}`}
                          >
                            {formatCurrencyBRL(totals.saldoLiquido)}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Wallet className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="w-full">
              <div className="w-full border-b border-gray-200">
                <div className="flex items-center gap-6">
                  {[
                    { k: "todos", label: "Todos" },
                    { k: "receitas", label: "Receitas" },
                    { k: "despesas", label: "Despesas" },
                  ].map((t) => (
                    <button
                      key={t.k}
                      className={`relative -mb-px pb-2 pt-1 text-base flex items-center gap-2 ${activeTab === t.k ? "text-foodmax-orange" : "text-gray-700 hover:text-gray-900"}`}
                      onClick={() => {
                        setActiveTab(t.k);
                        setCurrentPage(1);
                      }}
                    >
                      <span>{t.label}</span>
                      <span
                        className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${activeTab === t.k ? "bg-orange-100 text-foodmax-orange" : "bg-gray-100 text-gray-600"}`}
                      >
                        {t.k === "todos"
                          ? totalRecords
                          : transacoes.filter(
                              (x) =>
                                x.tipo ===
                                (t.k === "receitas" ? "Receita" : "Despesa"),
                            ).length}
                      </span>
                      {activeTab === t.k && (
                        <span className="absolute -bottom-[1px] left-0 right-0 h-[3px] bg-foodmax-orange" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative md:flex-1 md:max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar registros..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="foodmax-input pl-10"
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto flex-wrap">
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
              data={transacoes.map((t) => ({
                ...t,
                estabelecimento_nome:
                  estabelecimentos.find((e) => e.id === t.estabelecimento_id)
                    ?.nome || "-",
              }))}
              loading={loading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              searchTerm={searchTerm}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onPageChange={(p) => setCurrentPage(p)}
              showActions={false}
            />
          </div>
        </main>
      </div>

      <FinanceiroForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setCurrentItem(null);
          setIsEditing(false);
        }}
        onSave={handleSave}
        item={currentItem}
        isLoading={formLoading}
        estabelecimentos={estabelecimentos}
      />
      <FinanceiroView
        isOpen={showView}
        onClose={() => {
          setShowView(false);
          setCurrentItem(null);
        }}
        item={currentItem}
        estabelecimentoNome={
          currentItem
            ? estabelecimentos.find(
                (e) => e.id === currentItem.estabelecimento_id,
              )?.nome || null
            : null
        }
        onEdit={(t) => handleEdit(t)}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={
          exportData && exportData.length
            ? exportData
            : transacoes.map((t) => ({
                estabelecimento_nome:
                  estabelecimentos.find((e) => e.id === t.estabelecimento_id)
                    ?.nome || "",
                tipo: t.tipo,
                categoria: t.categoria,
                valor: (t.valor / 100).toFixed(2),
                data_transacao: t.data_transacao
                  ? new Date(t.data_transacao).toISOString().split("T")[0]
                  : "",
                descricao: t.descricao || "",
                ativo: t.ativo ? "Ativo" : "Inativo",
                data_cadastro: new Date(t.data_cadastro)
                  .toISOString()
                  .split("T")[0],
              }))
        }
        selectedIds={selectedIds}
        moduleName={"Financeiro"}
        columns={[
          { key: "estabelecimento_nome", label: "Estabelecimento" },
          { key: "tipo", label: "Tipo" },
          { key: "categoria", label: "Categoria" },
          { key: "valor", label: "Valor" },
          { key: "data_transacao", label: "Data da Transação" },
          { key: "descricao", label: "Descrição" },
          { key: "ativo", label: "Ativo" },
          { key: "data_cadastro", label: "Data de Cadastro" },
        ]}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName={"Financeiro"}
        userRole={getUserRole()}
        hasPayment={hasPayment()}
        columns={[
          {
            key: "estabelecimento_nome",
            label: "Estabelecimento",
            required: true,
          },
          { key: "tipo", label: "Tipo", required: true },
          { key: "categoria", label: "Categoria", required: true },
          { key: "valor", label: "Valor", required: true },
          { key: "data_transacao", label: "Data da Transação", required: true },
          { key: "descricao", label: "Descrição" },
          { key: "ativo", label: "Ativo" },
          { key: "data_cadastro", label: "Data de Cadastro" },
        ]}
        mapHeader={(h) => {
          const n = h.trim().toLowerCase();
          const map: Record<string, string> = {
            estabelecimento: "estabelecimento_nome",
            estabelecimento_nome: "estabelecimento_nome",
            "estabelecimento nome": "estabelecimento_nome",
            tipo: "tipo",
            categoria: "categoria",
            valor: "valor",
            "valor (r$)": "valor",
            "valor r$": "valor",
            "valor_r$": "valor",
            "data transacao": "data_transacao",
            "data da transação": "data_transacao",
            "data da transacao": "data_transacao",
            data_transacao: "data_transacao",
            data: "data_transacao",
            "data lançamento": "data_transacao",
            "data lancamento": "data_transacao",
            "data pagamento": "data_transacao",
            data_pagamento: "data_transacao",
            descricao: "descricao",
            "descrição": "descricao",
            ativo: "ativo",
            "data cadastro": "data_cadastro",
            data_cadastro: "data_cadastro",
          };
          return map[n] || n.replace(/\s+/g, "_");
        }}
        onImport={async (records) => {
          try {
            let imported = 0; // registros salvos no banco
              remote = 0,
              local = 0;
            const total = records.length;
            const estabByName = new Map<string, Estabelecimento>();
            estabelecimentos.forEach((e) =>
              estabByName.set(e.nome.trim().toLowerCase(), e),
            );

            const parseCentavos = (val: any): number => {
              if (val === undefined || val === null || val === "") return 0;
              if (typeof val === "number") return Math.round(val * 100);
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

            const resolveTipo = (raw: any): TipoTransacao | null => {
              const t = String(raw || "").trim().toLowerCase();
              if (t === "receita" || t === "entrada" || t === "credito" || t === "crédito") return "Receita";
              if (t === "despesa" || t === "saida" || t === "saída" || t === "debito" || t === "débito") return "Despesa";
              return null;
            };

            for (const r of records) {
              try {
                const estName = (
                  r.estabelecimento_nome ||
                  r.estabelecimento ||
                  ""
                )
                  .toString()
                  .trim()
                  .toLowerCase();
                const est = estabByName.get(estName) || estabelecimentos[0];
                if (!est) throw new Error("Estabelecimento inválido");
                const tipoResolved = resolveTipo(r.tipo);
                if (!tipoResolved) throw new Error("Tipo inválido");
                const payload: any = {
                  estabelecimento_id: est.id,
                  tipo: tipoResolved,
                  categoria: String(r.categoria || "Outros").trim() || "Outros",
                  valor: parseCentavos(r.valor),
                  data_transacao: ((): string | null => {
                    const s = r.data_transacao
                      ? String(r.data_transacao).trim()
                      : "";
                    if (!s) return null;
                    const toISOBr = (yyyy: string, mm: string, dd: string) =>
                      `${yyyy}-${mm}-${dd}T00:00:00-03:00`;
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
                      const [dd, mm, yyyy] = s.split("/");
                      return toISOBr(yyyy, mm, dd);
                    }
                    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                      const [yyyy, mm, dd] = s.split("-");
                      return toISOBr(yyyy, mm, dd);
                    }
                    const dt = new Date(s);
                    if (!isNaN(dt.getTime()))
                      return `${dt.toISOString().slice(0, 10)}T00:00:00-03:00`;
                    return null;
                  })(),
                  descricao: r.descricao ? String(r.descricao) : "",
                  ativo:
                    typeof r.ativo === "string"
                      ? r.ativo.toLowerCase() !== "false"
                      : Boolean(r.ativo ?? true),
                };
                await makeRequest(`/api/financeiro`, {
                  method: "POST",
                  body: JSON.stringify(payload),
                });
                imported++;
                remote++;
              } catch {
                const list = readLocal();
                const now = new Date().toISOString();
                const est = estabelecimentos[0];
                const tipoResolved = resolveTipo((r as any).tipo) || "Receita";
                const novo: FinanceiroTransacao = {
                  id: Date.now() + remote + local,
                  id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
                  estabelecimento_id: est ? est.id : 0,
                  tipo: tipoResolved as any,
                  categoria: String((r as any).categoria || "Outros"),
                  valor: parseCentavos((r as any).valor),
                  data_transacao: ((): string | null => {
                    const v = (r as any).data_transacao;
                    const s = v ? String(v).trim() : "";
                    if (!s) return null;
                    const toISOBr = (yyyy: string, mm: string, dd: string) =>
                      `${yyyy}-${mm}-${dd}T00:00:00-03:00`;
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
                      const [dd, mm, yyyy] = s.split("/");
                      return toISOBr(yyyy, mm, dd);
                    }
                    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                      const [yyyy, mm, dd] = s.split("-");
                      return toISOBr(yyyy, mm, dd);
                    }
                    const dt = new Date(s);
                    if (!isNaN(dt.getTime()))
                      return `${dt.toISOString().slice(0, 10)}T00:00:00-03:00`;
                    return null;
                  })(),
                  descricao: (r as any).descricao || "",
                  ativo:
                    typeof (r as any).ativo === "string"
                      ? (r as any).ativo.toLowerCase() !== "false"
                      : Boolean((r as any).ativo ?? true),
                  data_cadastro: now,
                  data_atualizacao: now,
                };
                list.unshift(novo);
                writeLocal(list);
                setTransacoes(list);
                imported++;
                local++;
              }
            }
            try {
              localStorage.removeItem(LOCAL_KEY);
            } catch {}
            await loadTransacoes();

            if (remote === total) {
              return {
                success: true,
                message: `${remote} transações importadas com sucesso no banco de dados`,
                imported: remote,
              } as any;
            }

            if (remote === 0) {
              return {
                success: false,
                message:
                  "Nenhum registro foi salvo no banco. Verifique o CSV e os campos obrigatórios.",
                imported: 0,
                errors: [
                  `Salvos localmente: ${local}. Ajuste o arquivo e tente novamente.`,
                ],
              } as any;
            }

            return {
              success: false,
              message: `${remote} de ${total} registro(s) foram salvos no banco. ${total - remote} falharam.`,
              imported: remote,
              errors: [
                `Registros salvos localmente: ${local}. Corrija e tente novamente.`,
              ],
            } as any;
          } catch (e) {
            return { success: false, message: "Erro ao importar" } as any;
          }
        }}
      />

      <DeleteAlert
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleDeleteConfirmed}
        itemName={currentItem?.categoria}
        isLoading={false}
      />

      <BulkDeleteAlert
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={async () => {
          const ids = selectedIds.slice();
          try {
            await makeRequest(`/api/financeiro/bulk-delete`, {
              method: "POST",
              body: JSON.stringify({ ids }),
            });
            toast({
              title: "Registros excluídos",
              description: `${ids.length} registro(s) excluído(s)`,
            });
            try {
              localStorage.removeItem(LOCAL_KEY);
            } catch {}
            await loadTransacoes();
            setSelectedIds([]);
            setShowBulkDelete(false);
          } catch {
            const list = readLocal().filter((e) => !ids.includes(e.id));
            writeLocal(list);
            setTransacoes(list);
            toast({
              title: "Exclusão local",
              description: `${ids.length} registro(s) removido(s)`,
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
