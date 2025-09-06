import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { DataGrid } from "@/components/data-grid";
import { toast } from "@/hooks/use-toast";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import { Estabelecimento } from "@shared/estabelecimentos";
import {
  Comunicacao,
  ComunicacoesListResponse,
  getStatusBadgeColor,
  StatusComunicacao,
} from "@shared/comunicacoes";
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
  Upload,
  Download,
  Mail,
  Send,
  X,
} from "lucide-react";
import ComunicacaoForm from "./ComunicacaoForm";
import ComunicacaoView from "./ComunicacaoView";
import {
  DeleteAlert,
  BulkDeleteAlert,
} from "@/components/alert-dialog-component";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cliente } from "@shared/clientes";
import { Fornecedor } from "@shared/fornecedores";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";
import { clearAllAppCaches } from "@/lib/cache";

export default function ComunicacoesModule() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { getUserRole, hasPayment } = useAuth();
  const { makeRequest } = useAuthenticatedRequest();

  const [activeStatus, setActiveStatus] = useState<StatusComunicacao | "Todos">(
    "Todos",
  );
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(
    [],
  );
  const [estabelecimentoFilter, setEstabelecimentoFilter] =
    useState<string>("todos");
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);

  const [rows, setRows] = useState<Comunicacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [current, setCurrent] = useState<Comunicacao | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendPreview, setSendPreview] = useState<{
    assunto: string;
    mensagem: string;
    destinatarios: string[];
  }>({ assunto: "", mensagem: "", destinatarios: [] });
  const [sendForm, setSendForm] = useState({
    destinatarios: "",
    assunto: "",
    mensagem: "",
  });

  useEffect(() => setSidebarOpen(!isMobile), [isMobile]);

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
      setEstabelecimentoFilter("todos");
    } catch {}
  }, [makeRequest]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(searchTerm && { search: searchTerm }),
        ...(activeStatus !== "Todos" && { status: activeStatus }),
        ...(estabelecimentoFilter && {
          estabelecimento_id: estabelecimentoFilter,
        }),
      });
      const res: ComunicacoesListResponse | null = await makeRequest(
        `/api/comunicacoes?${params}`,
      );
      if (res) {
        setRows(res.data);
        setTotalRecords(res.pagination.total);
      } else {
        setRows([]);
        setTotalRecords(0);
      }
    } catch {
      setRows([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    searchTerm,
    activeStatus,
    estabelecimentoFilter,
    makeRequest,
  ]);

  useEffect(() => {
    loadEstabelecimentos();
  }, [loadEstabelecimentos]);
  useEffect(() => {
    loadRows();
  }, [loadRows]);
  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, [activeStatus, estabelecimentoFilter]);

  const estabelecimentosMap = useMemo(() => {
    const m = new Map<number, string>();
    estabelecimentos.forEach((e) => m.set(e.id, e.nome));
    return m;
  }, [estabelecimentos]);

  const gridColumns = useMemo(
    () => [
      {
        key: "estabelecimento_id",
        label: "Estabelecimento",
        sortable: true,
        render: (v: number) => estabelecimentosMap.get(v) || v,
      },
      { key: "assunto", label: "Assunto", sortable: true },
      {
        key: "destinatarios_tipo",
        label: "Destinatários",
        sortable: true,
        render: (_: any, r: Comunicacao) => {
          const t = r.destinatarios_tipo;
          if (t === "TodosClientes") return "Todos os clientes";
          if (t === "ClientesEspecificos")
            return `Clientes específicos (${(r.clientes_ids || []).length})`;
          if (t === "TodosFornecedores") return "Todos os fornecedores";
          if (t === "FornecedoresEspecificos")
            return `Fornecedores específicos (${(r.fornecedores_ids || []).length})`;
          return `Outros (${(r.destinatarios_text || "").split(/[;,\\s]+/g).filter(Boolean).length})`;
        },
      },
      {
        key: "data_hora_enviado",
        label: "Data/Hora Enviado",
        sortable: true,
        render: (v: string) =>
          v ? new Date(v).toLocaleString("pt-BR", { hour12: false }) : "-",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v: StatusComunicacao) => (
          <Badge className={getStatusBadgeColor(v)}>{v}</Badge>
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
        render: (_: any, r: Comunicacao) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSend(r)}
              disabled={r.status !== "Pendente" || !!r.email_enviado}
              className="h-8 w-8 p-0 rounded-full border bg-green-50 hover:bg-green-100 border-green-200"
              title="Enviar Email"
            >
              <Send className="w-4 h-4 text-green-700" />
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
    [estabelecimentosMap],
  );

  const handleNew = () => {
    setCurrent(null);
    setIsEditing(false);
    setShowForm(true);
  };
  const handleEdit = async (r: Comunicacao) => {
    setCurrent(r);
    setIsEditing(true);
    try {
      const uid =
        typeof window !== "undefined"
          ? localStorage.getItem("fm_user_id")
          : null;
      await clearAllAppCaches();
      if (uid) localStorage.setItem("fm_user_id", uid);
    } catch {}
    setShowForm(true);
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const s = searchTerm.toLowerCase();
    return rows.filter((r) => {
      const est = (
        estabelecimentosMap.get(r.estabelecimento_id) || ""
      ).toLowerCase();
      const assunto = (r.assunto || "").toLowerCase();
      const msg = (r.mensagem || "").toLowerCase();
      const dest = (r.destinatarios_text || "").toLowerCase();
      const status = (r.status || "").toLowerCase();
      return [est, assunto, msg, dest, status].some((v) => v.includes(s));
    });
  }, [rows, searchTerm, estabelecimentosMap]);
  const handleView = (r: Comunicacao) => {
    setCurrent(r);
    setShowView(true);
  };
  const handleDelete = (r: Comunicacao) => {
    setCurrent(r);
    setShowDeleteAlert(true);
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (isEditing && current) {
        await makeRequest(`/api/comunicacoes/${current.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast({
          title: "Atualizado",
          description: "Comunicação atualizada com sucesso",
        });
      } else {
        await makeRequest(`/api/comunicacoes`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({
          title: "Criado",
          description: "Comunicação criada com sucesso",
        });
      }
      await loadRows();
      setShowForm(false);
      setCurrent(null);
      setIsEditing(false);
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e.message || "Falha ao salvar",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const handleDeleteConfirmed = async () => {
    if (!current) return;
    try {
      await makeRequest(`/api/comunicacoes/${current.id}`, {
        method: "DELETE",
      });
      toast({
        title: "Excluído",
        description: "Registro excluído com sucesso",
      });
      await loadRows();
      setSelectedIds([]);
      setShowDeleteAlert(false);
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e.message || "Falha ao excluir",
        variant: "destructive",
      });
    }
  };

  const getRecipientsForPreview = async (r: Comunicacao) => {
    try {
      if (r.tipo_comunicacao === "Promoção") {
        const params = new URLSearchParams({ page: "1", limit: "1000" });
        const res = await makeRequest(`/api/clientes?${params}`);
        let data = (res?.data || []) as Cliente[];
        data = data.filter(
          (c) =>
            c.ativo &&
            c.estabelecimento_id === r.estabelecimento_id &&
            !!c.aceita_promocao_email,
        );
        if (r.destinatarios_tipo === "ClientesEspecificos") {
          const ids = new Set(r.clientes_ids || []);
          data = data.filter((c) => ids.has(c.id));
        }
        return data.map((c) => c.email).filter(Boolean) as string[];
      } else if (r.tipo_comunicacao === "Fornecedor") {
        const params = new URLSearchParams({ page: "1", limit: "1000" });
        const res = await makeRequest(`/api/fornecedores?${params}`);
        let data = (res?.data || []) as Fornecedor[];
        data = data.filter((f) => f.ativo);
        if (r.destinatarios_tipo === "FornecedoresEspecificos") {
          const ids = new Set(r.fornecedores_ids || []);
          data = data.filter((f) => ids.has(f.id));
        }
        return data.map((f) => f.email).filter(Boolean) as string[];
      }
      const txt = (r.destinatarios_text || "")
        .split(/[;,\s]+/g)
        .map((s) => s.trim())
        .filter(Boolean);
      return txt;
    } catch {
      return [];
    }
  };

  const handleSend = async (r: Comunicacao) => {
    if (!hasPayment()) {
      toast({
        title: "Plano necessário",
        description: "Essa ação só funciona no plano pago.",
        variant: "destructive",
      });
      return;
    }
    setCurrent(r);
    setSendProgress(0);
    const destinatarios = await getRecipientsForPreview(r);
    setSendPreview({ assunto: r.assunto, mensagem: r.mensagem, destinatarios });
    setSendForm({
      assunto: r.assunto || "",
      mensagem: r.mensagem || "",
      destinatarios: destinatarios.join(", "),
    });
    setSendModalOpen(true);
  };

  const confirmSend = async () => {
    if (!current) return;
    setSendLoading(true);
    try {
      // Atualiza o registro com eventuais alterações de assunto/mensagem/destinatários (para "Outro")
      const updatePayload: any = {
        assunto: sendForm.assunto,
        mensagem: sendForm.mensagem,
      };
      if (current.tipo_comunicacao === "Outro") {
        updatePayload.destinatarios_text = sendForm.destinatarios;
      }
      try {
        await makeRequest(`/api/comunicacoes/${current.id}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });
      } catch {}

      // Envia
      setSendProgress(20);
      await makeRequest(`/api/comunicacoes/${current.id}/send`, {
        method: "POST",
      });
      setSendProgress(90);
      await loadRows();
      setSendProgress(100);
      toast({ title: "Enviado", description: "Email enviado com sucesso" });
      setSendModalOpen(false);
      setCurrent(null);
    } catch (e: any) {
      toast({
        title: "Erro ao enviar",
        description: e.message || "Falha no envio",
        variant: "destructive",
      });
    } finally {
      setSendLoading(false);
      setTimeout(() => setSendProgress(0), 400);
    }
  };

  const handleBulkSend = async () => {
    if (!hasPayment()) {
      toast({
        title: "Plano necessário",
        description: "Essa ação só funciona no plano pago.",
        variant: "destructive",
      });
      return;
    }
    const ids = selectedIds;
    if (ids.length === 0) return;
    if (ids.length > 50) {
      toast({
        title: "Limite excedido",
        description: "Só é possível enviar para até 50 registros por vez.",
        variant: "destructive",
      });
      return;
    }
    setSendLoading(true);
    try {
      // show simple progress by percentage of selected
      let progress = 0;
      setSendProgress(progress);
      const res = await makeRequest(`/api/comunicacoes/send-bulk`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      setSendProgress(100);
      await loadRows();
      toast({
        title: "Envio concluído",
        description: "Emails enviados com sucesso",
      });
    } catch (e: any) {
      toast({
        title: "Erro no envio",
        description: e.message || "Falha ao enviar emails",
        variant: "destructive",
      });
    } finally {
      setSendLoading(false);
      setTimeout(() => setSendProgress(0), 400);
    }
  };

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
                  Comunicação
                </h2>
                <p className="text-gray-600 mt-1">
                  Envie comunicações para clientes e fornecedores.
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="w-full">
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <Select
                    value={estabelecimentoFilter}
                    onValueChange={(v) => setEstabelecimentoFilter(v)}
                  >
                    <SelectTrigger className="foodmax-input inline-flex w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {estabelecimentos.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.nome}
                        </SelectItem>
                      ))}
                      <SelectItem value="todos">
                        Todos Estabelecimentos
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="w-full border-b border-gray-200">
                <div className="flex items-center gap-6">
                  {[
                    { label: "Todos", value: "Todos" },
                    { label: "Pendentes", value: "Pendente" },
                    { label: "Enviados", value: "Enviado" },
                    { label: "Cancelados", value: "Cancelado" },
                  ].map((tab) => (
                    <div key={tab.label} className="flex items-center gap-6">
                      <button
                        className={`relative -mb-px pb-2 pt-1 text-base ${activeStatus === (tab.value as any) ? "text-foodmax-orange" : "text-gray-700 hover:text-gray-900"}`}
                        onClick={() => setActiveStatus(tab.value as any)}
                      >
                        <span>{tab.label}</span>
                        {activeStatus === tab.value && (
                          <span className="absolute -bottom-[1px] left-0 right-0 h-[3px] bg-foodmax-orange" />
                        )}
                      </button>
                    </div>
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
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir Selecionados (
                      {selectedIds.length})
                    </Button>
                  )}
                  {selectedIds.length > 0 && (
                    <Button
                      size="sm"
                      onClick={handleBulkSend}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" /> Enviar para Selecionados
                      ({selectedIds.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImport(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" /> Importar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Load ALL comunicacoes, clientes and fornecedores to format export
                      const loadAll = async () => {
                        const all: Comunicacao[] = [];
                        let page = 1;
                        const limit = 1000;
                        for (let i = 0; i < 50; i++) {
                          const params = new URLSearchParams({
                            page: String(page),
                            limit: String(limit),
                          });
                          const res: any = await makeRequest(
                            `/api/comunicacoes?${params}`,
                          ).catch(() => null);
                          const chunk: Comunicacao[] = (res?.data ||
                            []) as Comunicacao[];
                          if (chunk.length === 0) break;
                          all.push(...chunk);
                          if (chunk.length < limit) break;
                          page += 1;
                        }
                        return all;
                      };
                      // Busca completa também para clientes e fornecedores
                      const fetchAllSimple = async <T,>(
                        urlBase: string,
                      ): Promise<T[]> => {
                        let page = 1;
                        const limit = 1000;
                        const res: T[] = [];
                        for (let i = 0; i < 50; i++) {
                          const params = new URLSearchParams({
                            page: String(page),
                            limit: String(limit),
                          });
                          const r: any = await makeRequest(
                            `${urlBase}?${params}`,
                          ).catch(() => null);
                          const chunk: T[] = (r?.data || []) as T[];
                          if (chunk.length === 0) break;
                          res.push(...chunk);
                          if (chunk.length < limit) break;
                          page += 1;
                        }
                        return res;
                      };

                      const [allRows, clientes, fornecedores] =
                        await Promise.all([
                          loadAll(),
                          fetchAllSimple<Cliente>(`/api/clientes`),
                          fetchAllSimple<Fornecedor>(`/api/fornecedores`),
                        ]);
                      const cMap = new Map<number, Cliente>();
                      clientes.forEach((c) => cMap.set(c.id, c));
                      const fMap = new Map<number, Fornecedor>();
                      fornecedores.forEach((f) => fMap.set(f.id, f));

                      const fmtClientes = (r: Comunicacao) => {
                        if (r.destinatarios_tipo === "TodosClientes") {
                          const list = clientes
                            .filter(
                              (c) =>
                                c.estabelecimento_id === r.estabelecimento_id &&
                                c.ativo &&
                                c.email,
                            )
                            .map((c) => `${c.nome} - ${c.email}`);
                          return list.join("; ");
                        }
                        const ids = Array.isArray(r.clientes_ids)
                          ? r.clientes_ids
                          : [];
                        const list = ids
                          .map((id) => cMap.get(id))
                          .filter((c): c is Cliente => !!c && !!c.email)
                          .map((c) => `${c.nome} - ${c.email}`);
                        return list.join("; ");
                      };

                      const fmtFornecedores = (r: Comunicacao) => {
                        if (r.destinatarios_tipo === "TodosFornecedores") {
                          const list = fornecedores
                            .filter((f) => f.ativo && f.email)
                            .map((f) => `${f.nome} - ${f.email}`);
                          return list.join("; ");
                        }
                        const ids = Array.isArray(r.fornecedores_ids)
                          ? r.fornecedores_ids
                          : [];
                        const list = ids
                          .map((id) => fMap.get(id))
                          .filter((f): f is Fornecedor => !!f && !!f.email)
                          .map((f) => `${f.nome} - ${f.email}`);
                        return list.join("; ");
                      };

                      const pad = (n: number) => String(n).padStart(2, "0");
                      const fmtDateTime = (d?: string) => {
                        if (!d) return "";
                        const x = new Date(d);
                        if (Number.isNaN(x.getTime())) return "";
                        return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;
                      };

                      const getEmails = (r: Comunicacao) => {
                        if (r.destinatarios_tipo === "TodosClientes") {
                          return clientes
                            .filter(
                              (c) =>
                                c.estabelecimento_id === r.estabelecimento_id &&
                                c.ativo &&
                                c.email,
                            )
                            .map((c) => String(c.email).trim());
                        }
                        if (r.destinatarios_tipo === "ClientesEspecificos") {
                          const ids = Array.isArray(r.clientes_ids)
                            ? r.clientes_ids
                            : [];
                          return ids
                            .map((id) => cMap.get(id)?.email)
                            .filter((e): e is string => !!e)
                            .map((e) => e.trim());
                        }
                        if (r.destinatarios_tipo === "TodosFornecedores") {
                          return fornecedores
                            .filter((f) => f.ativo && f.email)
                            .map((f) => String(f.email).trim());
                        }
                        if (
                          r.destinatarios_tipo === "FornecedoresEspecificos"
                        ) {
                          const ids = Array.isArray(r.fornecedores_ids)
                            ? r.fornecedores_ids
                            : [];
                          return ids
                            .map((id) => fMap.get(id)?.email)
                            .filter((e): e is string => !!e)
                            .map((e) => e.trim());
                        }
                        const txt = String(r.destinatarios_text || "");
                        return txt
                          .split(/[;,.\s]+/g)
                          .map((s) => s.trim())
                          .filter(Boolean);
                      };

                      const data = allRows.map((r) => {
                        const emails = getEmails(r);
                        let destinatarios = "";
                        if (r.destinatarios_tipo === "ClientesEspecificos") {
                          destinatarios = `Clientes específicos [${emails.join("; ")}]`;
                        } else if (r.destinatarios_tipo === "TodosClientes") {
                          destinatarios = "Todos os clientes";
                        } else if (
                          r.destinatarios_tipo === "FornecedoresEspecificos"
                        ) {
                          destinatarios = `Fornecedores específicos [${emails.join("; ")}]`;
                        } else if (
                          r.destinatarios_tipo === "TodosFornecedores"
                        ) {
                          destinatarios = "Todos os fornecedores";
                        } else {
                          destinatarios = emails.join("; ");
                        }
                        return {
                          estabelecimento:
                            estabelecimentosMap.get(r.estabelecimento_id) ||
                            r.estabelecimento_id,
                          tipo_comunicacao: r.tipo_comunicacao,
                          assunto: r.assunto,
                          mensagem: r.mensagem,
                          destinatarios,
                          status: r.status,
                          data_hora_enviado: fmtDateTime(
                            r.data_hora_enviado || undefined,
                          ),
                          data_cadastro: fmtDateTime(r.data_cadastro),
                        };
                      });
                      setExportData(data);
                      setShowExport(true);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </Button>
                  <Button
                    onClick={handleNew}
                    className="bg-foodmax-orange text-white hover:bg-orange-600"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Novo
                  </Button>
                </div>
              </div>

              {sendLoading && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                    <div
                      className="bg-green-500 h-2"
                      style={{ width: `${sendProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Enviando emails...
                  </div>
                </div>
              )}
            </div>

            <DataGrid
              columns={gridColumns}
              data={filteredRows}
              loading={loading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              searchTerm={searchTerm}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={filteredRows.length}
              onPageChange={setCurrentPage}
              showActions={false}
            />
          </div>
        </main>
      </div>

      <ComunicacaoForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setCurrent(null);
          setIsEditing(false);
        }}
        onSave={async (data) => handleSave(data)}
        comunicacao={current}
        isLoading={formLoading}
      />

      <ComunicacaoView
        isOpen={showView}
        onClose={() => {
          setShowView(false);
          setCurrent(null);
        }}
        comunicacao={current}
        onEdit={(c) => {
          setShowView(false);
          handleEdit(c as any);
        }}
      />

      <DeleteAlert
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleDeleteConfirmed}
        itemName={current?.assunto}
        isLoading={false}
      />

      <BulkDeleteAlert
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={async () => {
          try {
            await makeRequest(`/api/comunicacoes/bulk-delete`, {
              method: "POST",
              body: JSON.stringify({ ids: selectedIds }),
            });
            toast({
              title: "Excluídos",
              description: `${selectedIds.length} registro(s) excluído(s)`,
            });
            await loadRows();
            setSelectedIds([]);
            setShowBulkDelete(false);
          } catch (e: any) {
            toast({
              title: "Erro",
              description: e.message || "Falha ao excluir",
              variant: "destructive",
            });
          }
        }}
        selectedCount={selectedIds.length}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => {
          setShowExport(false);
          setExportData([]);
        }}
        data={exportData}
        selectedIds={selectedIds}
        moduleName="Comunicações"
        defaultExportType="all"
        columns={[
          { key: "estabelecimento", label: "Estabelecimento" },
          { key: "tipo_comunicacao", label: "Tipo de Comunicação" },
          { key: "assunto", label: "Assunto" },
          { key: "mensagem", label: "Mensagem" },
          { key: "destinatarios", label: "Destinatários" },
          { key: "status", label: "Status" },
          { key: "data_hora_enviado", label: "Data/Hora Enviado" },
          { key: "data_cadastro", label: "Data Cadastro" },
        ]}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName="Comunicações"
        userRole={getUserRole()}
        hasPayment={hasPayment()}
        extraNotes={[
          "Destinatários deve ser um destes formatos:",
          "Todos os clientes",
          "Clientes específicos [email1@dominio.com; email2@dominio.com]",
          "Todos os fornecedores",
          "Fornecedores específicos [email1@dominio.com; email2@dominio.com]",
          "Ou apenas: email1@dominio.com; email2@dominio.com",
          "Data/Hora Enviado: use dd/mm/yyyy hh:mm:ss (sem vírgula e sem aspas)",
        ]}
        columns={[
          {
            key: "estabelecimento",
            label: "Estabelecimento (nome ou ID)",
            required: true,
          },
          {
            key: "tipo_comunicacao",
            label: "Tipo de Comunicação",
            required: true,
          },
          { key: "assunto", label: "Assunto", required: true },
          { key: "mensagem", label: "Mensagem", required: true },
          { key: "destinatarios", label: "Destinatários", required: true },
          { key: "status", label: "Status" },
          { key: "data_hora_enviado", label: "Data/Hora Enviado" },
          { key: "data_cadastro", label: "Data Cadastro (opcional)" },
        ]}
        mapHeader={(h) => {
          // Normalize header by removing diacritics and trimming
          const nRaw = h.trim().toLowerCase();
          const n = nRaw.normalize("NFD").replace(/\p{Diacritic}/gu, "");
          const map: Record<string, string> = {
            estabelecimento: "estabelecimento",
            "tipo de comunicacao": "tipo_comunicacao",
            assunto: "assunto",
            mensagem: "mensagem",
            destinatarios: "destinatarios",
            status: "status",
            "data/hora enviado": "data_hora_enviado",
            "data hora enviado": "data_hora_enviado",
            "data cadastro": "data_cadastro",
          };
          return map[n] || n.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        }}
        validateRecord={(r) => {
          const errors: string[] = [];
          if (!r.estabelecimento) errors.push("Estabelecimento é obrigatório");
          if (!r.tipo_comunicacao)
            errors.push("Tipo de Comunicação é obrigatório");
          if (!r.assunto) errors.push("Assunto é obrigatório");
          if (!r.mensagem) errors.push("Mensagem é obrigatória");
          if (!r.destinatarios) errors.push("Destinatários é obrigatório");
          return errors;
        }}
        onImport={async (records) => {
          let imported = 0;

          const [cliRes, fornRes] = await Promise.all([
            makeRequest(`/api/clientes?page=1&limit=1000`).catch(() => null),
            makeRequest(`/api/fornecedores?page=1&limit=1000`).catch(
              () => null,
            ),
          ]);
          const clientes: Cliente[] = (cliRes?.data || []) as any;
          const fornecedores: Fornecedor[] = (fornRes?.data || []) as any;

          const parseEmails = (s?: string) =>
            String(s || "")
              .split(/;+/)
              .map((x) => x.trim())
              .filter(Boolean);
          const parseDestinatarios = (s?: string) => {
            const raw = String(s || "").trim();
            // Bracketed group formats
            const m = raw.match(
              /^\s*(clientes|fornecedores)(?:\s+espec[íi]ficos)?\s*\[(.*)\]\s*$/i,
            );
            if (m) {
              const grupo = m[1].toLowerCase();
              const hasEspecificos = /espec[íi]ficos/i.test(raw);
              const emails = parseEmails(m[2]).map((e) => e.toLowerCase());
              if (grupo === "clientes" && hasEspecificos)
                return { tipo: "ClientesEspecificos" as const, emails };
              if (grupo === "clientes" && !hasEspecificos)
                return { tipo: "TodosClientes" as const, emails };
              if (grupo === "fornecedores" && hasEspecificos)
                return { tipo: "FornecedoresEspecificos" as const, emails };
              return { tipo: "TodosFornecedores" as const, emails };
            }
            // Phrases for ALL
            const sLower = raw.toLowerCase();
            if (["todos os clientes", "todos clientes"].includes(sLower))
              return { tipo: "TodosClientes" as const, emails: [] };
            if (
              ["todos os fornecedores", "todos fornecedores"].includes(sLower)
            )
              return { tipo: "TodosFornecedores" as const, emails: [] };
            // Fallback to loose emails list
            const emails = parseEmails(raw).map((e) => e.toLowerCase());
            return { tipo: "Outros" as const, emails };
          };

          // Converte "dd/mm/yyyy hh:mm:ss" ou "dd/mm/yyyy" para ISO com timezone -03:00 (Brasília)
          const toIsoBr = (s?: string) => {
            const v = String(s || "").trim();
            if (!v) return undefined;
            const m = v.match(
              /^([0-3]?\d)\/([01]?\d)\/(\d{4})(?:\s+([0-2]?\d):([0-5]?\d)(?::([0-5]?\d))?)?$/,
            );
            if (m) {
              const dd = parseInt(m[1], 10);
              const mm = parseInt(m[2], 10);
              const yyyy = parseInt(m[3], 10);
              const hh = m[4] ? parseInt(m[4], 10) : 0;
              const mi = m[5] ? parseInt(m[5], 10) : 0;
              const ss = m[6] ? parseInt(m[6], 10) : 0;
              const pad = (n: number) => String(n).padStart(2, "0");
              return `${yyyy}-${pad(mm)}-${pad(dd)}T${pad(hh)}:${pad(mi)}:${pad(ss)}-03:00`;
            }
            // Tenta parse nativo como fallback
            const d = new Date(v);
            return isNaN(d.getTime()) ? undefined : d.toISOString();
          };

          const normalizeDestType = (v?: string) => {
            const s = String(v || "").toLowerCase();
            if (
              ["todosclientes", "todos clientes", "todos os clientes"].includes(
                s,
              )
            )
              return "TodosClientes";
            if (
              [
                "clientesespecificos",
                "clientes específicos",
                "clientes especificos",
              ].includes(s)
            )
              return "ClientesEspecificos";
            if (["todosfornecedores", "todos fornecedores"].includes(s))
              return "TodosFornecedores";
            if (
              [
                "fornecedoresespecificos",
                "fornecedores específicos",
                "fornecedores especificos",
              ].includes(s)
            )
              return "FornecedoresEspecificos";
            if (["outros", "outro"].includes(s)) return "Outros";
            return "Outros";
          };

          const importErrors: string[] = [];
          for (let i = 0; i < records.length; i++) {
            const r = records[i];
            try {
              // estabelecimento
              let estabelecimento_id: number | null = null;
              const v = String(r.estabelecimento || "").trim();
              if (/^\d+$/.test(v)) {
                estabelecimento_id = parseInt(v, 10);
              } else {
                let found = estabelecimentos.find(
                  (e) => e.nome.toLowerCase() === v.toLowerCase(),
                );
                if (!found) {
                  // try partial match
                  found = estabelecimentos.find((e) =>
                    e.nome.toLowerCase().includes(v.toLowerCase()),
                  );
                }
                estabelecimento_id = found ? found.id : null;
              }

              if (!estabelecimento_id) {
                importErrors.push(
                  `Linha ${i + 2}: Estabelecimento '${v}' não encontrado`,
                );
                continue;
              }

              // destinatários (novo formato)
              const parsed = parseDestinatarios(r.destinatarios);
              const destTipo = parsed.tipo;

              const clientes_ids: number[] = [];
              const fornecedores_ids: number[] = [];

              if (destTipo === "ClientesEspecificos") {
                for (const email of parsed.emails) {
                  const found = clientes.find(
                    (c) => c.email?.toLowerCase() === email,
                  );
                  if (found) clientes_ids.push(found.id);
                  else
                    importErrors.push(
                      `Linha ${i + 2}: Cliente com email '${email}' não encontrado`,
                    );
                }
              } else if (destTipo === "FornecedoresEspecificos") {
                for (const email of parsed.emails) {
                  const found = fornecedores.find(
                    (f) => f.email?.toLowerCase() === email,
                  );
                  if (found) fornecedores_ids.push(found.id);
                  else
                    importErrors.push(
                      `Linha ${i + 2}: Fornecedor com email '${email}' não encontrado`,
                    );
                }
              }

              // Ensure status is valid enum
              const statusValues = [
                "Pendente",
                "Enviado",
                "Cancelado",
              ] as const;
              let statusVal = (r.status || "Pendente") as string;
              if (!statusValues.includes(statusVal as any)) {
                const sNorm = String(statusVal || "")
                  .toLowerCase()
                  .trim();
                if (sNorm.startsWith("pend")) statusVal = "Pendente";
                else if (sNorm.startsWith("envi")) statusVal = "Enviado";
                else if (sNorm.startsWith("canc")) statusVal = "Cancelado";
                else statusVal = "Pendente";
              }

              await makeRequest(`/api/comunicacoes`, {
                method: "POST",
                body: JSON.stringify({
                  estabelecimento_id,
                  tipo_comunicacao: r.tipo_comunicacao,
                  assunto: r.assunto,
                  mensagem: r.mensagem,
                  destinatarios_tipo: destTipo,
                  clientes_ids,
                  fornecedores_ids,
                  destinatarios_text:
                    destTipo === "Outros" ? parsed.emails.join("; ") : "",
                  status: statusVal,
                  data_hora_enviado: toIsoBr(r.data_hora_enviado),
                  data_cadastro: toIsoBr(r.data_cadastro),
                }),
              });
              imported += 1;
            } catch (e: any) {
              importErrors.push(
                `Linha ${i + 2}: Erro ao importar - ${e?.message || e}`,
              );
            }
          }
          await loadRows();
          return {
            success: true,
            imported,
            errors: importErrors,
            message: `${imported} comunicação(ões) importada(s)`,
          } as any;
        }}
      />

      <Dialog
        open={sendModalOpen}
        onOpenChange={(o) => !sendLoading && setSendModalOpen(o)}
      >
        <DialogContent className="max-w-3xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-normal py-2">
              Enviar Email
            </DialogTitle>
          </DialogHeader>

          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 rounded p-3 text-sm">
            <p>
              Confira os Destinatários, Assunto e Mensagem antes de enviar o
              email.
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Email</h3>
            </div>

            <div>
              <Label>Destinatários</Label>
              <Input
                value={sendForm.destinatarios}
                onChange={(e) =>
                  setSendForm((f) => ({ ...f, destinatarios: e.target.value }))
                }
                placeholder="email1@dominio.com, email2@dominio.com"
                className="foodmax-input"
                disabled={sendLoading || current?.tipo_comunicacao !== "Outro"}
              />
            </div>
            <div>
              <Label>Assunto do Email</Label>
              <Input
                value={sendForm.assunto}
                onChange={(e) =>
                  setSendForm((f) => ({ ...f, assunto: e.target.value }))
                }
                className="foodmax-input"
                disabled={sendLoading}
              />
            </div>
            <div>
              <Label>Mensagem do Email</Label>
              <Textarea
                rows={8}
                value={sendForm.mensagem}
                onChange={(e) =>
                  setSendForm((f) => ({ ...f, mensagem: e.target.value }))
                }
                className="foodmax-input"
                disabled={sendLoading}
              />
            </div>

            {sendLoading && (
              <div>
                <Progress value={sendProgress} />
                <div className="mt-1 text-xs text-gray-600">
                  Enviando email...
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendModalOpen(false)}
              disabled={sendLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              className="bg-foodmax-orange text-white hover:bg-orange-600"
              disabled={sendLoading}
              onClick={confirmSend}
            >
              <Send className="w-4 h-4 mr-2" />
              {sendLoading ? "Enviando..." : "Enviar Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
