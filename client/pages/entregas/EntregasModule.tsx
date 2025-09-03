import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import { DataGrid } from "@/components/data-grid";
import { toast } from "@/hooks/use-toast";
import { Download, Edit, Eye, Menu, Plus, Search, Trash2, Truck, CheckCircle2, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";
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

  const tabs: ("Todos" | TipoEntrega)[] = ["Todos", "Própria", "iFood", "Rappi", "UberEats", "Outro"];
  const [activeTab, setActiveTab] = useState<("Todos" | TipoEntrega)>("Todos");

  type TabState = { search: string; page: number };
  const [tabState, setTabState] = useState<Record<string, TabState>>({
    Todos: { search: "", page: 1 },
    "Própria": { search: "", page: 1 },
    iFood: { search: "", page: 1 },
    Rappi: { search: "", page: 1 },
    UberEats: { search: "", page: 1 },
    Outro: { search: "", page: 1 },
  });
  const currentSearch = tabState[activeTab]?.search ?? "";
  const currentPage = tabState[activeTab]?.page ?? 1;
  const setCurrentSearch = (val: string) =>
    setTabState((s) => ({ ...s, [activeTab]: { ...s[activeTab], search: val, page: 1 } }));
  const setCurrentPage = (page: number) => setTabState((s) => ({ ...s, [activeTab]: { ...s[activeTab], page } }));

  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [totalCounts, setTotalCounts] = useState<Record<string, number>>({
    Todos: 0,
    "Própria": 0,
    iFood: 0,
    Rappi: 0,
    UberEats: 0,
    Outro: 0,
  });
  const pageSize = 10;

  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);

  const LOCAL_KEY = "fm_entregas";
  const readLocal = (): Entrega[] => {
    try { const raw = localStorage.getItem(LOCAL_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  };
  const writeLocal = (list: Entrega[]) => localStorage.setItem(LOCAL_KEY, JSON.stringify(list));

  useEffect(() => { setSidebarOpen(!isMobile); }, [isMobile]);

  const gridColumns = useMemo(
    () => [
      { key: "estabelecimento_nome", label: "Estabelecimento", sortable: true, render: (_: any, r: any) => r.estabelecimento_nome || "-" },
      {
        key: "pedido",
        label: "Pedido",
        sortable: false,
        render: (_: any, r: any) => r.pedido_codigo || r.codigo_pedido_app || "-",
      },
      {
        key: "tipo_entrega",
        label: "Tipo",
        sortable: true,
        render: (v: any) => <Badge className={getTipoEntregaColor(v)}>{v}</Badge>,
      },
      { key: "data_hora_saida", label: "Data/Hora Saída", sortable: true, render: (v: any) => formatDateTimeBR(v) },
      { key: "data_hora_entregue", label: "Data/Hora Entregue", sortable: true, render: (v: any) => formatDateTimeBR(v) },
      { key: "valor_entrega", label: "Valor Entrega", sortable: true, render: (v: number) => formatCurrencyBRL(v) },
      { key: "status", label: "Status", sortable: true, render: (v: any) => <Badge className={getStatusEntregaColor(v)}>{v}</Badge> },
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
              title={r.status === "Entregue" || !!r.data_hora_entregue ? "Já entregue" : "Registrar Entrega"}
            >
              <CheckCircle2 className={`w-4 h-4 ${r.status === "Entregue" || !!r.data_hora_entregue ? "text-gray-400" : "text-green-700"}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRegistrarSaida(r)}
              disabled={r.status !== "Pendente" || !!r.data_hora_saida}
              className={`h-8 w-8 p-0 rounded-full border ${r.status !== "Pendente" || !!r.data_hora_saida ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-50" : "bg-yellow-50 hover:bg-yellow-100 border-yellow-200"}`}
              title={r.status !== "Pendente" || !!r.data_hora_saida ? "Saída já registrada" : "Registrar Saída"}
            >
              <Timer className={`w-4 h-4 ${r.status !== "Pendente" || !!r.data_hora_saida ? "text-gray-400" : "text-yellow-700"}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleView(r)} className="h-8 w-8 p-0 rounded-full border bg-blue-50 hover:bg-blue-100 border-blue-200" title="Visualizar">
              <Eye className="w-4 h-4 text-blue-700" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(r)} className="h-8 w-8 p-0 rounded-full border bg-yellow-50 hover:bg-yellow-100 border-yellow-200" title="Editar">
              <Edit className="w-4 h-4 text-yellow-700" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(r)} className="h-8 w-8 p-0 rounded-full border bg-red-50 hover:bg-red-100 border-red-200" title="Excluir">
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
      const [all, propria, ifood, rappi, uber, outro] = await Promise.all(reqs.map((p) => p.catch(() => null)));
      setTotalCounts({
        Todos: all?.pagination?.total || 0,
        "Própria": propria?.pagination?.total || 0,
        iFood: ifood?.pagination?.total || 0,
        Rappi: rappi?.pagination?.total || 0,
        UberEats: uber?.pagination?.total || 0,
        Outro: outro?.pagination?.total || 0,
      });
    } catch {
      const local = readLocal();
      setTotalCounts({
        Todos: local.length,
        "Própria": local.filter((e) => e.tipo_entrega === "Própria").length,
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
      const params = new URLSearchParams({ page: String(currentPage), limit: String(pageSize) });
      if (activeTab !== "Todos") params.set("tipo", activeTab);
      let response: EntregasListResponse | null = null;
      try { response = await makeRequest(`/api/entregas?${params}`); } catch { response = null; }
      if (response) {
        setEntregas(response.data as any);
      } else {
        const local = readLocal();
        const filtered = local.filter((e) => activeTab === "Todos" || e.tipo_entrega === activeTab);
        setEntregas(filtered as any);
      }
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [activeTab, currentPage, makeRequest]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadEntregas(); }, [loadEntregas]);
  useEffect(() => { setSelectedIds([]); }, [activeTab]);

  const handlePageChange = (p: number) => setCurrentPage(p);
  const handleSearch = (v: string) => setCurrentSearch(v);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [currentEntrega, setCurrentEntrega] = useState<Entrega | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleNew = () => { setCurrentEntrega(null); setIsEditing(false); setShowForm(true); };
  const handleEdit = (e: Entrega) => { setCurrentEntrega(e); setIsEditing(true); setShowView(false); setShowForm(true); };
  const handleView = (e: Entrega) => { setCurrentEntrega(e); setShowView(true); };
  const handleDelete = async (e: Entrega) => {
    try {
      await makeRequest(`/api/entregas/${e.id}`, { method: "DELETE" });
      toast({ title: "Entrega excluída", description: "Entrega excluída com sucesso" });
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
    try { localStorage.removeItem(LOCAL_KEY); } catch {}
    setSelectedIds([]);
    await Promise.all([loadEntregas(), loadCounts()]);
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (isEditing && currentEntrega) {
        await makeRequest(`/api/entregas/${currentEntrega.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), });
        toast({ title: "Entrega atualizada", description: "Dados atualizados" });
      } else {
        try {
          await makeRequest(`/api/entregas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), });
          toast({ title: "Entrega criada", description: "Dados salvos no banco" });
        } catch {
          toast({ title: "Entrega salva localmente", description: "Dados processados" });
        }
      }
      await refreshAfterMutation();
      setShowForm(false);
    } catch (e) {
      const list = readLocal();
      const now = new Date().toISOString();
      if (isEditing && currentEntrega) {
        const idx = list.findIndex((x) => x.id === currentEntrega.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...data, data_atualizacao: now } as any;
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
      toast({ title: "Saída registrada", description: "Status alterado para Saiu" });
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
      toast({ title: "Entrega registrada", description: "Status alterado para Entregue" });
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
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      if (activeTab !== "Todos") params.set("tipo", activeTab);
      const resp = await makeRequest(`/api/entregas?${params}`);
      return Array.isArray(resp?.data) ? resp.data : [];
    } catch { return readLocal().filter((e) => activeTab === "Todos" || e.tipo_entrega === activeTab); }
  };

  const buildExportRows = async () => {
    const rows = await getAllForExport();
    return rows.map((e: any) => {
      const formatDateTimeBRNoComma = (iso: string | null | undefined) => {
        if (!iso) return "";
        const date = new Date(iso);
        const parts = new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
        }).formatToParts(date);
        const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
        return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
      };

      return {
        estabelecimento_nome: e.estabelecimento_nome || "",
        tipo_entrega: e.tipo_entrega,
        pedido: e.pedido_codigo || e.codigo_pedido_app || "",
        valor_pedido: (e.valor_pedido ?? 0) / 100,
        taxa_extra: (e.taxa_extra ?? 0) / 100,
        valor_entrega: (e.valor_entrega ?? 0) / 100,
        forma_pagamento: e.forma_pagamento,
        cliente_nome: e.cliente_nome || "",
        ddi: e.ddi || "",
        telefone: e.telefone || "",
        data_hora_saida: formatDateTimeBRNoComma(e.data_hora_saida),
        data_hora_entregue: formatDateTimeBRNoComma(e.data_hora_entregue),
        observacao: e.observacao || "",
        status: e.status,
        cliente_endereco: e.endereco
          ? [e.endereco.cep, e.endereco.endereco, [e.endereco.cidade, e.endereco.uf].filter(Boolean).join("/"), e.endereco.pais]
              .filter((x: any) => typeof x === "string" && x.trim() !== "")
              .join(" - ")
          : "",
      };
    });
  };

  return (
    <div className="flex h-screen bg-foodmax-gray-bg">
      <Sidebar open={sidebarOpen} onToggle={(next) => setSidebarOpen(typeof next === "boolean" ? next : !sidebarOpen)} />
      <div className="flex-1 flex flex-col">
        <header className="bg-foodmax-gray-bg px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 mr-3 rounded-lg border bg-white" aria-label="Abrir menu">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">Entregas</h2>
                <p className="text-gray-600 mt-1">Gerencie as entregas por tipo e status.</p>
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
                      <span className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${activeTab === (t as any) ? "bg-orange-100 text-foodmax-orange" : "bg-gray-100 text-gray-600"}`}>
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
                  <Input placeholder="Buscar registros..." value={currentSearch} onChange={(e) => handleSearch(e.target.value)} className="foodmax-input pl-10" />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try { const data = await buildExportRows(); setExportData(data); } catch { setExportData(entregas as any); }
                      setShowExport(true);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </Button>
                  <Button onClick={() => setShowForm(true)} className="bg-foodmax-orange text-white hover:bg-orange-600">
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
        onClose={() => { setShowForm(false); setCurrentEntrega(null); setIsEditing(false); }}
        onSave={handleSave}
        entrega={currentEntrega}
        isLoading={formLoading}
      />

      <EntregaView
        isOpen={showView}
        onClose={() => { setShowView(false); setCurrentEntrega(null); }}
        entrega={currentEntrega as any}
        onEdit={(e) => handleEdit(e as any)}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => { setShowExport(false); setExportData([]); }}
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
          { key: "cliente_endereco", label: "Cliente Endereço" },
        ]}
      />

      {/* Import instructions specific to Entregas via ImportModal if needed in future */}
    </div>
  );
}
