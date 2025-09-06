import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataGrid } from "@/components/data-grid";
import { SuporteForm } from "./SuporteForm";
import { SuporteView } from "./SuporteView";
import { toast } from "@/hooks/use-toast";
import { ExportModal } from "@/components/export-modal";
import {
  Menu,
  Search,
  Plus,
  Trash2,
  LifeBuoy,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  DeleteAlert,
  BulkDeleteAlert,
} from "@/components/alert-dialog-component";
import {
  Suporte,
  SuportesListResponse,
  SUPORTE_EXPORT_COLUMNS,
  SUPORTE_STATUS_TABS,
  STATUS_BADGE_STYLES,
  PRIORIDADE_BADGE_STYLES,
} from "@shared/suportes";

function SuportesModule() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { getUserRole, isLoading } = useAuth();
  const role = getUserRole();
  const isAdmin = role === "admin";
  const { makeRequest } = useAuthenticatedRequest();

  const [suportes, setSuportes] = useState<Suporte[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  const [statusTab, setStatusTab] = useState<string>("Todos");
  const [tabState, setTabState] = useState<
    Record<string, { search: string; page: number; selected: number[] }>
  >({
    Todos: { search: "", page: 1, selected: [] },
  });
  const currentSearch = tabState[statusTab]?.search ?? "";
  const currentPage = tabState[statusTab]?.page ?? 1;
  const selectedIds = tabState[statusTab]?.selected ?? [];

  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showBulkDeleteAlert, setShowBulkDeleteAlert] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<Suporte | null>(null);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const gridColumns = useMemo(
    () => [
      { key: "codigo", label: "Código", sortable: true },
      { key: "titulo", label: "Título", sortable: true },
      { key: "tipo", label: "Tipo", sortable: true },
      {
        key: "prioridade",
        label: "Prioridade",
        sortable: true,
        render: (value: any) => (
          <Badge
            className={`${PRIORIDADE_BADGE_STYLES[value] || "bg-gray-50 text-gray-700 border border-gray-200"}`}
          >
            {value}
          </Badge>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value: any) => (
          <Badge
            className={`${STATUS_BADGE_STYLES[value] || "bg-gray-50 text-gray-700 border border-gray-200"}`}
          >
            {value}
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
        render: (_: any, r: Suporte) => {
          const isResolved = r.status === "Resolvido";
          const isClosed = r.status === "Fechado";
          const canChange = isAdmin && !isClosed && !isResolved;
          return (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarkResolvido(r)}
                className="h-8 w-8 p-0 rounded-full border bg-green-50 hover:bg-green-100 border-green-200"
                title="Resolvido"
                disabled={!isAdmin || isResolved || isClosed}
              >
                <CheckCircle2 className="w-4 h-4 text-green-700" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarkFechado(r)}
                className="h-8 w-8 p-0 rounded-full border bg-gray-50 hover:bg-gray-100 border-gray-200"
                title="Fechar"
                disabled={!isAdmin || isClosed}
              >
                <XCircle className="w-4 h-4 text-gray-700" />
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
                onClick={() => handleDelete(r)}
                className="h-8 w-8 p-0 rounded-full border bg-red-50 hover:bg-red-100 border-red-200"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4 text-red-700" />
              </Button>
            </div>
          );
        },
      },
    ],
    [isAdmin],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(currentSearch && { search: currentSearch }),
        ...(statusTab && statusTab !== "Todos" ? { status: statusTab } : {}),
      });
      const response: SuportesListResponse = await makeRequest(
        `/api/suportes?${params}`,
      );
      setSuportes(response.data);
      setTotalRecords(response.pagination.total);
    } catch (e: any) {
      toast({
        title: "Erro ao carregar suporte",
        description: e.message,
        variant: "destructive",
      });
      setSuportes([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, currentSearch, statusTab, makeRequest]);

  useEffect(() => {
    if (isLoading) return;
    loadData();
  }, [loadData, isLoading]);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [current, setCurrent] = useState<Suporte | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleNew = () => {
    setCurrent(null);
    setShowForm(true);
  };

  const setTabSearch = (val: string) =>
    setTabState((s) => ({
      ...s,
      [statusTab]: {
        ...(s[statusTab] || { search: "", page: 1, selected: [] }),
        search: val,
        page: 1,
      },
    }));
  const setTabPage = (page: number) =>
    setTabState((s) => ({
      ...s,
      [statusTab]: {
        ...(s[statusTab] || { search: "", page: 1, selected: [] }),
        page,
      },
    }));
  const setTabSelected = (ids: number[]) =>
    setTabState((s) => ({
      ...s,
      [statusTab]: {
        ...(s[statusTab] || { search: "", page: 1, selected: [] }),
        selected: ids,
      },
    }));

  const handleView = (rec: Suporte) => {
    setCurrent(rec);
    setShowView(true);
  };

  const handleMarkResolvido = async (rec: Suporte) => {
    try {
      await makeRequest(`/api/suportes/${rec.id}/resolver`, {
        method: "PATCH",
      });
      toast({ title: "Ticket marcado como Resolvido" });
      loadData();
    } catch (e: any) {
      toast({
        title: "Erro ao marcar Resolvido",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkFechado = async (rec: Suporte) => {
    try {
      await makeRequest(`/api/suportes/${rec.id}/fechar`, { method: "PATCH" });
      toast({ title: "Ticket marcado como Fechado" });
      loadData();
    } catch (e: any) {
      toast({
        title: "Erro ao fechar ticket",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (rec: Suporte) => {
    setCurrent(rec);
    setShowView(false);
    setShowForm(true);
  };

  const handleDelete = (rec: Suporte) => {
    setRecordToDelete(rec);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    setDeleteLoading(true);
    try {
      await makeRequest(`/api/suportes/${recordToDelete.id}`, {
        method: "DELETE",
      });
      toast({ title: "Registro excluído" });
      try {
        localStorage.removeItem("fm_grid_cache");
        localStorage.removeItem("fm_suportes");
      } catch {}
      setTabSelected([]);
      setShowDeleteAlert(false);
      setRecordToDelete(null);
      loadData();
    } catch (e: any) {
      toast({
        title: "Erro ao excluir",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (current) {
        await makeRequest(`/api/suportes/${current.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast({ title: "Suporte atualizado" });
      } else {
        await makeRequest(`/api/suportes`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({ title: "Suporte criado" });
      }
      setShowForm(false);
      loadData();
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
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
                  Suporte
                </h2>
                <p className="text-gray-600 mt-1">
                  Abra e gerencie tickets de suporte.
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Tabs outside search box (Cardápios style) */}
            <div className="w-full">
              <div className="w-full border-b border-gray-200">
                <div className="flex items-center gap-6">
                  {SUPORTE_STATUS_TABS.map((tab) => {
                    const count =
                      tab.key === "Todos"
                        ? totalRecords
                        : suportes.filter((s) => s.status === tab.key).length;
                    return (
                      <div key={tab.key} className="flex items-center gap-6">
                        <button
                          className={`relative -mb-px pb-2 pt-1 text-base flex items-center gap-2 ${
                            statusTab === tab.key
                              ? "text-foodmax-orange"
                              : "text-gray-700 hover:text-gray-900"
                          }`}
                          onClick={() => {
                            setStatusTab(tab.key);
                            setTabState((s) => ({
                              ...s,
                              [tab.key]: s[tab.key] || {
                                search: "",
                                page: 1,
                                selected: [],
                              },
                            }));
                          }}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${
                              statusTab === tab.key
                                ? "bg-orange-100 text-foodmax-orange"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {count}
                          </span>
                          {statusTab === tab.key && (
                            <span className="absolute -bottom-[1px] left-0 right-0 h-[3px] bg-foodmax-orange" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative md:flex-1 md:max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar registros..."
                    value={currentSearch}
                    onChange={(e) => {
                      setTabSearch(e.target.value);
                    }}
                    className="foodmax-input pl-10"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto flex-wrap">
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
                    onClick={async () => {
                      try {
                        // Fetch ALL registros (respecting current status filter)
                        const limit = 500;
                        let page = 1;
                        let total = Infinity;
                        const all: any[] = [];
                        while (all.length < total) {
                          const params = new URLSearchParams({
                            page: String(page),
                            limit: String(limit),
                            ...(statusTab !== "Todos"
                              ? { status: statusTab }
                              : {}),
                          });
                          const resp: SuportesListResponse = await makeRequest(
                            `/api/suportes?${params}`,
                          );
                          const items = resp?.data || [];
                          total = resp?.pagination?.total ?? items.length;
                          all.push(...items);
                          if (items.length < limit) break;
                          page += 1;
                        }

                        // Load respostas for each suporte and aggregate
                        const enriched = await Promise.all(
                          all.map(async (s) => {
                            try {
                              const r = await makeRequest(
                                `/api/suportes/${s.id}/respostas`,
                              );
                              const respostas: any[] = r?.data || [];
                              const respostasStrRaw = respostas
                                .map((it) => {
                                  const dt = new Date(
                                    it.data_cadastro,
                                  ).toLocaleString("pt-BR", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  });
                                  const texto = String(it.resposta ?? "").replace(/\r?\n+/g, " ");
                                  const usuario = String(it.nome_usuario ?? "");
                                  return `${texto} - ${usuario} - ${dt}`;
                                })
                                .join("; ");
                              const respostasStr = respostasStrRaw.replace(
                                /[",]/g,
                                "",
                              );
                              return { ...s, respostas: respostasStr };
                            } catch {
                              return { ...s, respostas: "" };
                            }
                          }),
                        );

                        setExportData(enriched);
                        setShowExport(true);
                      } catch {
                        // Fallback: export current page enriched with respostas
                        try {
                          const enriched = await Promise.all(
                            suportes.map(async (s) => {
                              try {
                                const r = await makeRequest(
                                  `/api/suportes/${s.id}/respostas`,
                                );
                                const respostas: any[] = r?.data || [];
                                const respostasStrRaw = respostas
                                .map((it) => {
                                  const dt = new Date(
                                    it.data_cadastro,
                                  ).toLocaleString("pt-BR", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  });
                                  const texto = String(it.resposta ?? "").replace(/\r?\n+/g, " ");
                                  const usuario = String(it.nome_usuario ?? "");
                                  return `${texto} - ${usuario} - ${dt}`;
                                })
                                .join("; ");
                              const respostasStr = respostasStrRaw.replace(
                                /[",]/g,
                                "",
                              );
                              return { ...s, respostas: respostasStr };
                              } catch {
                                return { ...s, respostas: "" };
                              }
                            }),
                          );
                          setExportData(enriched);
                          setShowExport(true);
                        } catch {
                          setExportData(suportes);
                          setShowExport(true);
                        }
                      }
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
              columns={gridColumns as any}
              data={suportes}
              loading={loading}
              selectedIds={selectedIds}
              onSelectionChange={setTabSelected}
              onView={handleView}
              onDelete={handleDelete}
              searchTerm={currentSearch}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onPageChange={setTabPage}
              showActions={false}
            />
          </div>
        </main>
      </div>

      <SuporteForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        suporte={current}
        isLoading={formLoading}
      />

      <SuporteView
        isOpen={showView}
        onClose={() => setShowView(false)}
        suporte={current}
        onEdit={(rec) => {
          handleEdit(rec);
        }}
        onReplied={(updated) => {
          setCurrent(updated);
          loadData();
        }}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={exportData}
        selectedIds={selectedIds}
        moduleName="Suportes"
        columns={SUPORTE_EXPORT_COLUMNS}
      />

      <DeleteAlert
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={confirmDelete}
        itemName={recordToDelete?.titulo}
        isLoading={deleteLoading}
      />

      <BulkDeleteAlert
        isOpen={showBulkDeleteAlert}
        onClose={() => setShowBulkDeleteAlert(false)}
        onConfirm={async () => {
          setDeleteLoading(true);
          try {
            for (const id of selectedIds) {
              await makeRequest(`/api/suportes/${id}`, { method: "DELETE" });
            }
            toast({ title: "Registros excluídos" });
            try {
              localStorage.removeItem("fm_grid_cache");
              localStorage.removeItem("fm_suportes");
            } catch {}
            setTabSelected([]);
            setShowBulkDeleteAlert(false);
            loadData();
          } catch (e: any) {
            toast({
              title: "Erro ao excluir",
              description: e.message,
              variant: "destructive",
            });
          } finally {
            setDeleteLoading(false);
          }
        }}
        selectedCount={selectedIds.length}
        isLoading={deleteLoading}
      />
    </div>
  );
}

export default SuportesModule;
export { SuportesModule };
