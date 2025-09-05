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
import { Menu, Search, Plus, Eye, Trash2, LifeBuoy } from "lucide-react";
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  const [statusTab, setStatusTab] = useState<string>("Todos");

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const gridColumns = useMemo(
    () => [
      { key: "titulo", label: "Título", sortable: true },
      { key: "tipo", label: "Tipo", sortable: true },
      {
        key: "prioridade",
        label: "Prioridade",
        sortable: true,
        render: (value: any) => (
          <Badge className={`${PRIORIDADE_BADGE_STYLES[value] || "bg-gray-50 text-gray-700 border border-gray-200"}`}>{value}</Badge>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value: any) => (
          <Badge className={`${STATUS_BADGE_STYLES[value] || "bg-gray-50 text-gray-700 border border-gray-200"}`}>{value}</Badge>
        ),
      },
      {
        key: "data_cadastro",
        label: "Data Cadastro",
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString("pt-BR"),
      },
    ],
    [],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(searchTerm && { search: searchTerm }),
        ...(statusTab && statusTab !== "Todos" ? { status: statusTab } : {}),
      });
      const response: SuportesListResponse = await makeRequest(`/api/suportes?${params}`);
      setSuportes(response.data);
      setTotalRecords(response.pagination.total);
    } catch (e: any) {
      toast({ title: "Erro ao carregar suporte", description: e.message, variant: "destructive" });
      setSuportes([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusTab, makeRequest]);

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

  const handleView = (rec: Suporte) => {
    setCurrent(rec);
    setShowView(true);
  };

  const handleDelete = async (rec: Suporte) => {
    setDeleteLoading(true);
    try {
      await makeRequest(`/api/suportes/${rec.id}`, { method: "DELETE" });
      toast({ title: "Registro excluído" });
      setSelectedIds([]);
      loadData();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (current) {
        await makeRequest(`/api/suportes/${current.id}`, { method: "PUT", body: JSON.stringify(data) });
        toast({ title: "Suporte atualizado" });
      } else {
        await makeRequest(`/api/suportes`, { method: "POST", body: JSON.stringify(data) });
        toast({ title: "Suporte criado" });
      }
      setShowForm(false);
      loadData();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
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
                <h2 className="text-2xl font-semibold text-gray-800">Suporte</h2>
                <p className="text-gray-600 mt-1">Abra e gerencie tickets de suporte.</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border p-4 space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-2">
                {SUPORTE_STATUS_TABS.map((tab) => (
                  <Button
                    key={tab.key}
                    variant={statusTab === tab.key ? "orange" : "outline"}
                    size="sm"
                    onClick={() => {
                      setStatusTab(tab.key);
                      setCurrentPage(1);
                    }}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative md:flex-1 md:max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input placeholder="Buscar registros..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="foodmax-input pl-10" />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto flex-wrap">
                  {selectedIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={async () => {
                      try {
                        for (const id of selectedIds) {
                          await makeRequest(`/api/suportes/${id}`, { method: "DELETE" });
                        }
                        toast({ title: "Registros excluídos" });
                        setSelectedIds([]);
                        loadData();
                      } catch (e: any) {
                        toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
                      }
                    }}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Selecionados ({selectedIds.length})
                    </Button>
                  )}

                  {/* Excluir Import button explicitly as requested */}

                  <Button onClick={handleNew} className="bg-foodmax-orange text-white hover:bg-orange-600">
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
              onSelectionChange={setSelectedIds}
              onView={handleView}
              onDelete={handleDelete}
              searchTerm={searchTerm}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onPageChange={setCurrentPage}
              showActions={true}
              actionButtons={{ view: true, edit: false, delete: true, toggle: false }}
            />
          </div>
        </main>
      </div>

      <SuporteForm isOpen={showForm} onClose={() => setShowForm(false)} onSave={handleSave} suporte={current} isLoading={formLoading} />

      <SuporteView
        isOpen={showView}
        onClose={() => setShowView(false)}
        suporte={current}
        onReplied={(updated) => {
          setCurrent(updated);
          loadData();
        }}
      />
    </div>
  );
}

export default SuportesModule;
export { SuportesModule };
