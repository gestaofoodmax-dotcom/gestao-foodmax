import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import { DataGrid } from "@/components/data-grid";
import { toast } from "@/hooks/use-toast";
import {
  Download,
  Edit,
  Eye,
  Menu,
  Plus,
  Search,
  Trash2,
  Truck,
  CheckCircle2,
  Timer,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";
import { BulkDeleteAlert, DeleteAlert } from "@/components/alert-dialog-component";
import {
  Entrega,
  EntregasListResponse,
  TipoEntrega,
  StatusEntrega,
  getTipoEntregaColor,
  getStatusEntregaColor,
  formatDateTimeBR,
  formatCurrencyBRL,
} from "@shared/entregas";
import EntregaForm from "./EntregaForm";
import EntregaView from "./EntregaView";

export default function EntregasModule() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { makeRequest } = useAuthenticatedRequest();

  const tabs: ("Todos" | TipoEntrega)[] = [
    "Todos",
    "Própria",
    "iFood",
    "Rappi",
    "UberEats",
    "Outro",
  ];
  const [activeTab, setActiveTab] = useState<"Todos" | TipoEntrega>("Todos");

  type TabState = { search: string; page: number };
  const [tabState, setTabState] = useState<Record<string, TabState>>({
    Todos: { search: "", page: 1 },
    Própria: { search: "", page: 1 },
    iFood: { search: "", page: 1 },
    Rappi: { search: "", page: 1 },
    UberEats: { search: "", page: 1 },
    Outro: { search: "", page: 1 },
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

  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [totalCounts, setTotalCounts] = useState<Record<string, number>>({
    Todos: 0,
    Própria: 0,
    iFood: 0,
    Rappi: 0,
    UberEats: 0,
    Outro: 0,
  });
  const pageSize = 10;

  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const LOCAL_KEY = "fm_entregas";
  const readLocal = (): Entrega[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const writeLocal = (list: Entrega[]) =>
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));

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
      {
        key: "pedido",
        label: "Pedido",
        sortable: false,
        render: (_: any, r: any) =>
          r.pedido_codigo || r.codigo_pedido_app || "-",
      },
      {
        key: "tipo_entrega",
        label: "Tipo",
        sortable: true,
        render: (v: any) => (
          <Badge className={getTipoEntregaColor(v)}>{v}</Badge>
        ),
      },
      {
        key: "data_hora_saida",
        label: "Data/Hora Saída",
        sortable: true,
        render: (v: any) => formatDateTimeBR(v),
      },
      {
        key: "data_hora_entregue",
        label: "Data/Hora Entregue",
        sortable: true,
        render: (v: any) => formatDateTimeBR(v),
      },
      {
        key: "valor_entrega",
        label: "Valor Entrega",
        sortable: true,
        render: (v: number) => formatCurrencyBRL(v),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v: any) => (
          <Badge className={getStatusEntregaColor(v)}>{v}</Badge>
        ),
      },
      {
        key: "acoes",
        label: "Ações",
        render: (_: any, r: Entrega) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRegistrarEntregue(r)}
              disabled={r.status === "Entregue" || !!r.data_hora_entregue}
              className={`h-8 w-8 p-0 rounded-full border ${r.status === "Entregue" || !!r.data_hora_entregue ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-50" : "bg-green-50 hover:bg-green-100 border-green-200"}`}
              title={
                r.status === "Entregue" || !!r.data_hora_entregue
                  ? "Já entregue"
                  : "Registrar Entrega"
              }
            >
              <CheckCircle2
                className={`w-4 h-4 ${r.status === "Entregue" || !!r.data_hora_entregue ? "text-gray-400" : "text-green-700"}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRegistrarSaida(r)}
              disabled={r.status !== "Pendente" || !!r.data_hora_saida}
              className={`h-8 w-8 p-0 rounded-full border ${r.status !== "Pendente" || !!r.data_hora_saida ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-50" : "bg-yellow-50 hover:bg-yellow-100 border-yellow-200"}`}
              title={
                r.status !== "Pendente" || !!r.data_hora_saida
                  ? "Saída já registrada"
                  : "Registrar Saída"
              }
            >
              <Timer
                className={`w-4 h-4 ${r.status !== "Pendente" || !!r.data_hora_saida ? "text-gray-400" : "text-yellow-700"}`}
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

  const loadCounts = useCallback(async () => {
    try {
      const reqs = [
        makeRequest(`/api/entregas?page=1&limit=1`),
        makeRequest(`/api/entregas?page=1&limit=1&tipo=Própria`),
        makeRequest(`/api/entregas?page=1&limit=1&tipo=iFood`),
        makeRequest(`/api/entregas?page=1&limit=1&tipo=Rappi`),
        makeRequest(`/api/entregas?page=1&limit=1&tipo=UberEats`),
        makeRequest(`/api/entregas?page=1&limit=1&tipo=Outro`),
      ];
      const [all, propria, ifood, rappi, uber, outro] = await Promise.all(
        reqs.map((p) => p.catch(() => null)),
      );
      setTotalCounts({
        Todos: all?.pagination?.total || 0,
        Própria: propria?.pagination?.total || 0,
        iFood: ifood?.pagination?.total || 0,
        Rappi: rappi?.pagination?.total || 0,
        UberEats: uber?.pagination?.total || 0,
        Outro: outro?.pagination?.total || 0,
      });
    } catch {
      const local = readLocal();
      setTotalCounts({
        Todos: local.length,
        Própria: local.filter((e) => e.tipo_entrega === "Própria").length,
        iFood: local.filter((e) => e.tipo_entrega === "iFood").length,
        Rappi: local.filter((e) => e.tipo_entrega === "Rappi").length,
        UberEats: local.filter((e) => e.tipo_entrega === "UberEats").length,
        Outro: local.filter((e) => e.tipo_entrega === "Outro").length,
      });
    }
  }, [makeRequest]);

  const loadEntregas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });
      if (activeTab !== "Todos") params.set("tipo", activeTab);
      let response: EntregasListResponse | null = null;
      try {
        response = await makeRequest(`/api/entregas?${params}`);
      } catch {
        response = null;
      }
      if (response) {
        setEntregas(response.data as any);
      } else {
        const local = readLocal();
        const filtered = local.filter(
          (e) => activeTab === "Todos" || e.tipo_entrega === activeTab,
        );
        setEntregas(filtered as any);
      }
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [activeTab, currentPage, makeRequest]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);
  useEffect(() => {
    loadEntregas();
  }, [loadEntregas]);
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const handlePageChange = (p: number) => setCurrentPage(p);
  const handleSearch = (v: string) => setCurrentSearch(v);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [currentEntrega, setCurrentEntrega] = useState<Entrega | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleNew = () => {
    setCurrentEntrega(null);
    setIsEditing(false);
    setShowForm(true);
  };
  const handleEdit = (e: Entrega) => {
    setCurrentEntrega(e);
    setIsEditing(true);
    setShowView(false);
    setShowForm(true);
  };
  const handleView = (e: Entrega) => {
    setCurrentEntrega(e);
    setShowView(true);
  };
  const handleDelete = async (e: Entrega) => {
    try {
      await makeRequest(`/api/entregas/${e.id}`, { method: "DELETE" });
      toast({
        title: "Entrega excluída",
        description: "Entrega excluída com sucesso",
      });
      await Promise.all([loadEntregas(), loadCounts()]);
    } catch {
      const list = readLocal().filter((x) => x.id !== e.id);
      writeLocal(list);
      setEntregas(list);
      toast({ title: "Entrega excluída", description: "Entrega excluída" });
      await loadCounts();
    }
  };

  const refreshAfterMutation = async () => {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {}
    setSelectedIds([]);
    await Promise.all([loadEntregas(), loadCounts()]);
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (isEditing && currentEntrega) {
        await makeRequest(`/api/entregas/${currentEntrega.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast({
          title: "Entrega atualizada",
          description: "Dados atualizados",
        });
      } else {
        try {
          await makeRequest(`/api/entregas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          toast({
            title: "Entrega criada",
            description: "Dados salvos no banco",
          });
        } catch {
          toast({
            title: "Entrega salva localmente",
            description: "Dados processados",
          });
        }
      }
      await refreshAfterMutation();
      setShowForm(false);
    } catch (e) {
      const list = readLocal();
      const now = new Date().toISOString();
      if (isEditing && currentEntrega) {
        const idx = list.findIndex((x) => x.id === currentEntrega.id);
        if (idx >= 0)
          list[idx] = { ...list[idx], ...data, data_atualizacao: now } as any;
      } else {
        const novo: Entrega = {
          id: Date.now(),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          estabelecimento_id: data.estabelecimento_id,
          tipo_entrega: data.tipo_entrega,
          pedido_id: data.pedido_id ?? null,
          codigo_pedido_app: data.codigo_pedido_app ?? null,
          valor_pedido: data.valor_pedido ?? 0,
          taxa_extra: data.taxa_extra ?? 0,
          valor_entrega: data.valor_entrega ?? 0,
          forma_pagamento: data.forma_pagamento,
          cliente_id: data.cliente_id ?? null,
          ddi: data.ddi,
          telefone: data.telefone,
          data_hora_saida: data.data_hora_saida ?? null,
          data_hora_entregue: data.data_hora_entregue ?? null,
          observacao: data.observacao ?? null,
          status: data.status ?? "Pendente",
          data_cadastro: now,
          data_atualizacao: now,
        } as any;
        list.unshift(novo);
      }
      writeLocal(list);
      setEntregas(list);
      await loadCounts();
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRegistrarSaida = async (e: Entrega) => {
    try {
      await makeRequest(`/api/entregas/${e.id}/saida`, { method: "PATCH" });
      toast({
        title: "Saída registrada",
        description: "Status alterado para Saiu",
      });
      await refreshAfterMutation();
    } catch {
      const list = readLocal();
      const idx = list.findIndex((x) => x.id === e.id);
      if (idx >= 0) {
        list[idx].status = "Saiu" as any;
        list[idx].data_hora_saida = new Date().toISOString();
        writeLocal(list);
        setEntregas(list);
        await loadCounts();
      }
    }
  };

  const handleRegistrarEntregue = async (e: Entrega) => {
    try {
      await makeRequest(`/api/entregas/${e.id}/entregue`, { method: "PATCH" });
      toast({
        title: "Entrega registrada",
        description: "Status alterado para Entregue",
      });
      await refreshAfterMutation();
    } catch {
      const list = readLocal();
      const idx = list.findIndex((x) => x.id === e.id);
      if (idx >= 0) {
        list[idx].status = "Entregue" as any;
        list[idx].data_hora_entregue = new Date().toISOString();
        writeLocal(list);
        setEntregas(list);
        await loadCounts();
      }
    }
  };

  const getAllForExport = async () => {
    try {
      const all: any[] = [];
      let page = 1;
      const limit = 1000;
      while (true) {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (activeTab !== "Todos") params.set("tipo", activeTab);
        const resp = await makeRequest(`/api/entregas?${params}`);
        const data = Array.isArray(resp?.data) ? resp.data : [];
        all.push(...data);
        const totalPages = resp?.pagination?.totalPages;
        if (totalPages ? page >= totalPages : data.length < limit) break;
        page += 1;
      }
      return all;
    } catch {
      return readLocal().filter(
        (e) => activeTab === "Todos" || e.tipo_entrega === activeTab,
      );
    }
  };

  const buildExportRows = async () => {
    const rows = await getAllForExport();

    const formatDateTimeBRNoComma = (iso: string | null | undefined) => {
      if (!iso) return "";
      const date = new Date(iso);
      const parts = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(date);
      const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
      return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
    };

    const buildRowFromDetail = (d: any) => {
      const end = d.endereco || null;
      const cityUf = end?.cidade ? `${end.cidade}${end.uf ? `/${end.uf}` : ""}` : "";
      let enderecoStr = "";
      if (end) {
        const hasCep = typeof end.cep === "string" && end.cep.trim() !== "";
        const cepText = hasCep ? end.cep.trim() : "";
        const rest = [end.endereco, cityUf, end.pais].filter(
          (x) => typeof x === "string" && x.trim() !== "",
        );
        if (hasCep) {
          enderecoStr = rest.length > 0 ? `${cepText} - ${rest.join(" - ")}` : cepText;
        } else {
          enderecoStr = rest.length > 0 ? ` - ${rest.join(" - ")}` : " - ";
        }
      }

      return {
        id: d.id,
        estabelecimento_nome: d.estabelecimento_nome || "",
        tipo_entrega: d.tipo_entrega,
        pedido: d.pedido_codigo || d.codigo_pedido_app || "",
        valor_pedido: (d.valor_pedido ?? 0) / 100,
        taxa_extra: (d.taxa_extra ?? 0) / 100,
        valor_entrega: (d.valor_entrega ?? 0) / 100,
        forma_pagamento: d.forma_pagamento,
        cliente_nome: d.cliente_nome || "",
        ddi: d.ddi || "",
        telefone: d.telefone || "",
        data_hora_saida: formatDateTimeBRNoComma(d.data_hora_saida),
        data_hora_entregue: formatDateTimeBRNoComma(d.data_hora_entregue),
        observacao: d.observacao || "",
        status: d.status,
        entrega_endereco: enderecoStr,
      } as any;
    };

    const chunkSize = 10;
    const exportRows: any[] = [];

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (e: any) => {
          const fetchOnce = async () =>
            await makeRequest(`/api/entregas/${e.id}?_t=${Date.now()}`);
          let det: any = null;
          try {
            det = await fetchOnce();
          } catch {
            try {
              await new Promise((r) => setTimeout(r, 150));
              det = await fetchOnce();
            } catch {
              det = null;
            }
          }

          if (det) return buildRowFromDetail(det);

          return buildRowFromDetail(e);
        }),
      );
      exportRows.push(...results);
    }

    return exportRows;
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
                  Entregas
                </h2>
                <p className="text-gray-600 mt-1">
                  Gerencie as entregas por tipo e status.
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="w-full border-b border-gray-200">
              <div className="flex items-center gap-6">
                {tabs.map((t) => (
                  <div key={t} className="flex items-center gap-6">
                    <button
                      className={`relative -mb-px pb-2 pt-1 text-base flex items-center gap-2 ${activeTab === (t as any) ? "text-foodmax-orange" : "text-gray-700 hover:text-gray-900"}`}
                      onClick={() => setActiveTab(t as any)}
                    >
                      <span>{t}</span>
                      <span
                        className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${activeTab === (t as any) ? "bg-orange-100 text-foodmax-orange" : "bg-gray-100 text-gray-600"}`}
                      >
                        {totalCounts[t] ?? 0}
                      </span>
                      {activeTab === (t as any) && (
                        <span className="absolute -bottom-[1px] left-0 right-0 h-[3px] bg-foodmax-orange" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative md:flex-1 md:max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar registros..."
                    value={currentSearch}
                    onChange={(e) => handleSearch(e.target.value)}
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
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir Selecionados ({selectedIds.length})
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
                      try {
                        const data = await buildExportRows();
                        setExportData(data);
                      } catch {
                        setExportData(entregas as any);
                      }
                      setShowExport(true);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </Button>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-foodmax-orange text-white hover:bg-orange-600"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Novo
                  </Button>
                </div>
              </div>
            </div>

            <DataGrid
              key={`grid-${activeTab}`}
              columns={gridColumns}
              data={entregas}
              loading={loading || !initialLoadComplete}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              searchTerm={currentSearch}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={totalCounts[activeTab] || entregas.length}
              onPageChange={handlePageChange}
              showActions={false}
            />
          </div>
        </main>
      </div>

      <EntregaForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setCurrentEntrega(null);
          setIsEditing(false);
        }}
        onSave={handleSave}
        entrega={currentEntrega}
        isLoading={formLoading}
      />

      <EntregaView
        isOpen={showView}
        onClose={() => {
          setShowView(false);
          setCurrentEntrega(null);
        }}
        entrega={currentEntrega as any}
        onEdit={(e) => handleEdit(e as any)}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => {
          setShowExport(false);
          setExportData([]);
        }}
        data={exportData}
        selectedIds={selectedIds}
        moduleName="Entregas"
        columns={[
          { key: "estabelecimento_nome", label: "Estabelecimento" },
          { key: "tipo_entrega", label: "Tipo Entrega" },
          { key: "pedido", label: "Pedido" },
          { key: "valor_pedido", label: "Valor do Pedido (R$)" },
          { key: "taxa_extra", label: "Taxa Extra (R$)" },
          { key: "valor_entrega", label: "Valor da Entrega (R$)" },
          { key: "forma_pagamento", label: "Forma de Pagamento" },
          { key: "cliente_nome", label: "Cliente" },
          { key: "ddi", label: "DDI" },
          { key: "telefone", label: "Telefone" },
          { key: "data_hora_saida", label: "Data/Hora Saída" },
          { key: "data_hora_entregue", label: "Data/Hora Entregue" },
          { key: "observacao", label: "Observação" },
          { key: "status", label: "Status" },
          { key: "entrega_endereco", label: "Entrega Endereço" },
        ]}
      />

      <BulkDeleteAlert
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={async () => {
          try {
            await makeRequest(`/api/entregas/bulk-delete`, {
              method: "POST",
              body: JSON.stringify({ ids: selectedIds }),
            });
            toast({
              title: "Entregas excluídas",
              description: `${selectedIds.length} registro(s) excluído(s) com sucesso`,
            });
            await refreshAfterMutation();
            setShowBulkDelete(false);
          } catch (error: any) {
            const list = readLocal().filter((e) => !selectedIds.includes(e.id));
            writeLocal(list);
            setEntregas(list);
            toast({
              title: "Exclusão concluída localmente",
              description: `${selectedIds.length} registro(s) removido(s)`,
            });
            await refreshAfterMutation();
            setShowBulkDelete(false);
          }
        }}
        selectedCount={selectedIds.length}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName="Entregas"
        userRole={"admin"}
        hasPayment={true}
        columns={[
          {
            key: "estabelecimento_nome",
            label: "Estabelecimento",
            required: true,
          },
          { key: "tipo_entrega", label: "Tipo de Entrega" },
          { key: "pedido", label: "Pedido (Código ou Código via APP)" },
          { key: "valor_pedido", label: "Valor do Pedido (R$)" },
          { key: "taxa_extra", label: "Taxa Extra (R$)" },
          { key: "valor_entrega", label: "Valor da Entrega (R$)" },
          { key: "forma_pagamento", label: "Forma de Pagamento" },
          { key: "cliente_nome", label: "Cliente" },
          { key: "ddi", label: "DDI" },
          { key: "telefone", label: "Telefone" },
          {
            key: "data_hora_saida",
            label: "Data/Hora Saída (dd/mm/yyyy hh:mm:ss, horário de Brasília)",
          },
          {
            key: "data_hora_entregue",
            label:
              "Data/Hora Entregue (dd/mm/yyyy hh:mm:ss, horário de Brasília)",
          },
          { key: "observacao", label: "Observação" },
          { key: "status", label: "Status" },
          {
            key: "endereco",
            label: "Entrega Endereço (CEP - Endereço - Cidade/UF - País)",
          },
        ]}
        mapHeader={(h) => {
          const original = h.trim();
          const n = original.toLowerCase();
          const exact: Record<string, string> = {
            Estabelecimento: "estabelecimento_nome",
            "Tipo de Entrega": "tipo_entrega",
            Pedido: "pedido",
            "Valor do Pedido (R$)": "valor_pedido",
            "Taxa Extra (R$)": "taxa_extra",
            "Valor da Entrega (R$)": "valor_entrega",
            "Forma de Pagamento": "forma_pagamento",
            Cliente: "cliente_nome",
            DDI: "ddi",
            Telefone: "telefone",
            "Data/Hora Saída": "data_hora_saida",
            "Data/Hora Entregue": "data_hora_entregue",
            Observação: "observacao",
            Status: "status",
            "Cliente Endereço": "endereco",
            "Entrega Endereço": "endereco",
          };
          if (exact[original]) return exact[original];
          const lower: Record<string, string> = {
            estabelecimento: "estabelecimento_nome",
            tipo: "tipo_entrega",
            entrega: "tipo_entrega",
            pedido: "pedido",
            "valor do pedido": "valor_pedido",
            taxa: "taxa_extra",
            "valor da entrega": "valor_entrega",
            forma: "forma_pagamento",
            pagamento: "forma_pagamento",
            cliente: "cliente_nome",
            ddi: "ddi",
            telefone: "telefone",
            saida: "data_hora_saida",
            entregue: "data_hora_entregue",
            observacao: "observacao",
            observação: "observacao",
            status: "status",
            endereço: "endereco",
            endereços: "endereco",
          };
          return lower[n] || n.replace(/\s+/g, "_");
        }}
        validateRecord={(r) => {
          const errs: string[] = [];
          if (!r.estabelecimento_nome && !r.estabelecimento)
            errs.push("Estabelecimento é obrigatório");
          return errs;
        }}
        onImport={async (records) => {
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

          const parseDate = (s: any) => {
            const str = String(s || "").trim();
            if (!str) return null;
            const re =
              /^(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
            const m = str.match(re);
            if (m) {
              const [, dd, mm, yyyy, hh = "00", mi = "00", ss = "00"] =
                m as any;
              return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}-03:00`;
            }
            try {
              const d = new Date(str);
              return isNaN(d.getTime()) ? null : d.toISOString();
            } catch {
              return null;
            }
          };

          const full = records.map((r) => {
            const endRaw = String(
              r.endereco || r["Cliente Endereço"] || r["Entrega Endereço"] || "",
            ).trim();
            let endereco: any = null;
            if (endRaw) {
              const parts = endRaw.split("-").map((x: string) => x.trim());
              const cep = parts[0] || null;
              const enderecoStr = parts[1] || "";
              const cidadeUf = parts[2] || "";
              const pais = parts[3] || "Brasil";
              let cidade = "";
              let uf = "";
              if (cidadeUf.includes("/")) {
                const [c, u] = cidadeUf.split("/").map((s: string) => s.trim());
                cidade = c || "";
                uf = u || "";
              } else {
                cidade = cidadeUf || "";
                uf = parts[3] || "";
              }
              endereco = { cep, endereco: enderecoStr, cidade, uf, pais };
            }

            return {
              estabelecimento_nome: String(
                r.estabelecimento_nome || r.estabelecimento || "",
              ).trim(),
              tipo_entrega: String(
                r.tipo_entrega || r.tipo || "Própria",
              ).trim(),
              pedido: String(
                r.pedido || r.pedido_codigo || r.codigo_pedido_app || "",
              ).trim(),
              valor_pedido: parseCentavos(r.valor_pedido),
              taxa_extra: parseCentavos(r.taxa_extra),
              valor_entrega: parseCentavos(r.valor_entrega),
              forma_pagamento: String(
                r.forma_pagamento || r.pagamento || "PIX",
              ).trim(),
              cliente_nome: String(r.cliente_nome || r.cliente || "").trim(),
              ddi: String(r.ddi || "+55").trim(),
              telefone: String(r.telefone || "").trim(),
              data_hora_saida: parseDate(r.data_hora_saida),
              data_hora_entregue: parseDate(r.data_hora_entregue),
              observacao: String(r.observacao || r.observação || "").trim(),
              status: String(r.status || "Pendente").trim(),
              endereco,
            } as any;
          });

          try {
            const response = await makeRequest(`/api/entregas/import-full`, {
              method: "POST",
              body: JSON.stringify({ records: full }),
            });
            await Promise.all([loadEntregas(), loadCounts()]);
            return {
              success: true,
              imported: response?.imported ?? full.length,
              message: `${response?.imported ?? full.length} entrega(s) importada(s)`,
            } as any;
          } catch (e) {
            return {
              success: false,
              imported: 0,
              message: "Erro ao importar: " + (e as Error).message,
            } as any;
          }
        }}
      />
    </div>
  );
}
