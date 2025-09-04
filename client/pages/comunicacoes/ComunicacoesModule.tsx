import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Send,
} from "lucide-react";
import ComunicacaoForm from "./ComunicacaoForm";
import ComunicacaoView from "./ComunicacaoView";
import { DeleteAlert, BulkDeleteAlert } from "@/components/alert-dialog-component";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cliente } from "@shared/clientes";
import { Fornecedor } from "@shared/fornecedores";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";

export default function ComunicacoesModule() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { getUserRole, hasPayment } = useAuth();
  const { makeRequest } = useAuthenticatedRequest();

  const [activeStatus, setActiveStatus] = useState<StatusComunicacao | "Todos">("Todos");
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [estabelecimentoFilter, setEstabelecimentoFilter] = useState<string>("todos");
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
  const [sendPreview, setSendPreview] = useState<{ assunto: string; mensagem: string; destinatarios: string[] }>({ assunto: "", mensagem: "", destinatarios: [] });

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
        ...(estabelecimentoFilter && { estabelecimento_id: estabelecimentoFilter }),
      });
      const res: ComunicacoesListResponse | null = await makeRequest(`/api/comunicacoes?${params}`);
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
  }, [currentPage, pageSize, searchTerm, activeStatus, estabelecimentoFilter, makeRequest]);

  useEffect(() => { loadEstabelecimentos(); }, [loadEstabelecimentos]);
  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { setSelectedIds([]); setCurrentPage(1); }, [activeStatus, estabelecimentoFilter]);

  const estabelecimentosMap = useMemo(() => {
    const m = new Map<number, string>();
    estabelecimentos.forEach((e) => m.set(e.id, e.nome));
    return m;
  }, [estabelecimentos]);

  const gridColumns = useMemo(() => [
    { key: "estabelecimento_id", label: "Estabelecimento", sortable: true, render: (v: number) => estabelecimentosMap.get(v) || v },
    { key: "assunto", label: "Assunto", sortable: true },
    {
      key: "destinatarios_tipo",
      label: "Destinatários",
      sortable: true,
      render: (_: any, r: Comunicacao) => {
        const t = r.destinatarios_tipo;
        if (t === 'TodosClientes') return 'Todos os clientes';
        if (t === 'ClientesEspecificos') return `Clientes específicos (${(r.clientes_ids || []).length})`;
        if (t === 'TodosFornecedores') return 'Todos os fornecedores';
        if (t === 'FornecedoresEspecificos') return `Fornecedores específicos (${(r.fornecedores_ids || []).length})`;
        return `Outros (${(r.destinatarios_text || '').split(/[;,\\s]+/g).filter(Boolean).length})`;
      }
    },
    { key: "data_envio", label: "Data de Envio", sortable: true, render: (v: string) => (v ? new Date(v).toLocaleString('pt-BR') : '-') },
    { key: "status", label: "Status", sortable: true, render: (v: StatusComunicacao) => <Badge className={getStatusBadgeColor(v)}>{v}</Badge> },
    { key: "data_cadastro", label: "Data Cadastro", sortable: true, render: (v: string) => new Date(v).toLocaleDateString('pt-BR') },
    {
      key: "acoes",
      label: "Ações",
      render: (_: any, r: Comunicacao) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSend(r)}
            disabled={r.status !== 'Pendente' || !!r.email_enviado}
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
      )
    }
  ], [estabelecimentosMap]);

  const handleNew = () => { setCurrent(null); setIsEditing(false); setShowForm(true); };
  const handleEdit = (r: Comunicacao) => { setCurrent(r); setIsEditing(true); setShowForm(true); };

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const s = searchTerm.toLowerCase();
    return rows.filter((r) => {
      const est = (estabelecimentosMap.get(r.estabelecimento_id) || "").toLowerCase();
      const assunto = (r.assunto || "").toLowerCase();
      const msg = (r.mensagem || "").toLowerCase();
      const dest = (r.destinatarios_text || "").toLowerCase();
      const status = (r.status || "").toLowerCase();
      return [est, assunto, msg, dest, status].some((v) => v.includes(s));
    });
  }, [rows, searchTerm, estabelecimentosMap]);
  const handleView = (r: Comunicacao) => { setCurrent(r); setShowView(true); };
  const handleDelete = (r: Comunicacao) => { setCurrent(r); setShowDeleteAlert(true); };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (isEditing && current) {
        await makeRequest(`/api/comunicacoes/${current.id}`, { method: 'PUT', body: JSON.stringify(data) });
        toast({ title: 'Atualizado', description: 'Comunicação atualizada com sucesso' });
      } else {
        await makeRequest(`/api/comunicacoes`, { method: 'POST', body: JSON.stringify(data) });
        toast({ title: 'Criado', description: 'Comunicação criada com sucesso' });
      }
      await loadRows();
      setShowForm(false);
      setCurrent(null);
      setIsEditing(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha ao salvar', variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
  };

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const handleDeleteConfirmed = async () => {
    if (!current) return;
    try {
      await makeRequest(`/api/comunicacoes/${current.id}`, { method: 'DELETE' });
      toast({ title: 'Excluído', description: 'Registro excluído com sucesso' });
      await loadRows();
      setSelectedIds([]);
      setShowDeleteAlert(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha ao excluir', variant: 'destructive' });
    }
  };

  const getRecipientsForPreview = async (r: Comunicacao) => {
    try {
      if (r.tipo_comunicacao === 'Promoção') {
        const params = new URLSearchParams({ page: '1', limit: '1000' });
        const res = await makeRequest(`/api/clientes?${params}`);
        let data = (res?.data || []) as Cliente[];
        data = data.filter((c) => c.ativo && c.estabelecimento_id === r.estabelecimento_id && (!!c.aceita_promocao_email));
        if (r.destinatarios_tipo === 'ClientesEspecificos') {
          const ids = new Set(r.clientes_ids || []);
          data = data.filter((c) => ids.has(c.id));
        }
        return data.map((c) => c.email).filter(Boolean) as string[];
      } else if (r.tipo_comunicacao === 'Fornecedor') {
        const params = new URLSearchParams({ page: '1', limit: '1000' });
        const res = await makeRequest(`/api/fornecedores?${params}`);
        let data = (res?.data || []) as Fornecedor[];
        data = data.filter((f) => f.ativo);
        if (r.destinatarios_tipo === 'FornecedoresEspecificos') {
          const ids = new Set(r.fornecedores_ids || []);
          data = data.filter((f) => ids.has(f.id));
        }
        return data.map((f) => f.email).filter(Boolean) as string[];
      }
      const txt = (r.destinatarios_text || '').split(/[;,\s]+/g).map((s) => s.trim()).filter(Boolean);
      return txt;
    } catch {
      return [];
    }
  };

  const handleSend = async (r: Comunicacao) => {
    if (!hasPayment()) {
      toast({ title: 'Plano necessário', description: 'Essa ação só funciona no plano pago.', variant: 'destructive' });
      return;
    }
    setCurrent(r);
    setSendProgress(0);
    const destinatarios = await getRecipientsForPreview(r);
    setSendPreview({ assunto: r.assunto, mensagem: r.mensagem, destinatarios });
    setSendModalOpen(true);
  };

  const confirmSend = async () => {
    if (!current) return;
    setSendLoading(true);
    try {
      // fake progress animation while server marks as sent
      setSendProgress(20);
      const res = await makeRequest(`/api/comunicacoes/${current.id}/send`, { method: 'POST' });
      setSendProgress(90);
      await loadRows();
      setSendProgress(100);
      toast({ title: 'Enviado', description: 'Email enviado com sucesso' });
      setSendModalOpen(false);
      setCurrent(null);
    } catch (e: any) {
      toast({ title: 'Erro ao enviar', description: e.message || 'Falha no envio', variant: 'destructive' });
    } finally {
      setSendLoading(false);
      setTimeout(() => setSendProgress(0), 400);
    }
  };

  const handleBulkSend = async () => {
    if (!hasPayment()) {
      toast({ title: 'Plano necessário', description: 'Essa ação só funciona no plano pago.', variant: 'destructive' });
      return;
    }
    const ids = selectedIds;
    if (ids.length === 0) return;
    if (ids.length > 50) {
      toast({ title: 'Limite excedido', description: 'Só é possível enviar para até 50 registros por vez.', variant: 'destructive' });
      return;
    }
    setSendLoading(true);
    try {
      // show simple progress by percentage of selected
      let progress = 0;
      setSendProgress(progress);
      const res = await makeRequest(`/api/comunicacoes/send-bulk`, { method: 'POST', body: JSON.stringify({ ids }) });
      setSendProgress(100);
      await loadRows();
      toast({ title: 'Envio concluído', description: 'Emails enviados com sucesso' });
    } catch (e: any) {
      toast({ title: 'Erro no envio', description: e.message || 'Falha ao enviar emails', variant: 'destructive' });
    } finally {
      setSendLoading(false);
      setTimeout(() => setSendProgress(0), 400);
    }
  };

  return (
    <div className="flex h-screen bg-foodmax-gray-bg">
      <Sidebar open={sidebarOpen} onToggle={(next) => setSidebarOpen(typeof next === 'boolean' ? next : !sidebarOpen)} />

      <div className="flex-1 flex flex-col">
        <header className="bg-foodmax-gray-bg px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 mr-3 rounded-lg border bg-white" aria-label="Abrir menu">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">Comunicação</h2>
                <p className="text-gray-600 mt-1">Envie comunicações para clientes e fornecedores.</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="w-full">
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <Select value={estabelecimentoFilter} onValueChange={(v) => setEstabelecimentoFilter(v)}>
                    <SelectTrigger className="foodmax-input inline-flex w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {estabelecimentos.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.nome}</SelectItem>
                      ))}
                      <SelectItem value="todos">Todos Estabelecimentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="w-full border-b border-gray-200">
                <div className="flex items-center gap-6">
                  {[{label:"Todos", value:"Todos"},{label:"Pendentes", value:"Pendente"},{label:"Enviados", value:"Enviado"},{label:"Cancelados", value:"Cancelado"}].map((tab) => (
                    <div key={tab.label} className="flex items-center gap-6">
                      <button
                        className={`relative -mb-px pb-2 pt-1 text-base ${activeStatus === (tab.value as any) ? 'text-foodmax-orange' : 'text-gray-700 hover:text-gray-900'}`}
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
                  <Input placeholder="Buscar registros..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="foodmax-input pl-10" />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto flex-wrap">
                  {selectedIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => setShowBulkDelete(true)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir Selecionados ({selectedIds.length})
                    </Button>
                  )}
                  {selectedIds.length > 0 && (
                    <Button size="sm" onClick={handleBulkSend} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Send className="w-4 h-4 mr-2" /> Enviar para Selecionados ({selectedIds.length})
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                    <Upload className="w-4 h-4 mr-2" /> Importar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const data = (filteredRows || rows).map((r) => ({
                      estabelecimento: estabelecimentosMap.get(r.estabelecimento_id) || r.estabelecimento_id,
                      tipo_comunicacao: r.tipo_comunicacao,
                      assunto: r.assunto,
                      mensagem: r.mensagem,
                      destinatarios_tipo: r.destinatarios_tipo,
                      clientes_ids: (r.clientes_ids || []).join(','),
                      fornecedores_ids: (r.fornecedores_ids || []).join(','),
                      destinatarios_text: r.destinatarios_text || '',
                      status: r.status,
                      data_envio: r.data_envio ? new Date(r.data_envio).toLocaleString('pt-BR') : '',
                      data_cadastro: new Date(r.data_cadastro).toLocaleString('pt-BR'),
                    }));
                    setExportData(data);
                    setShowExport(true);
                  }}>
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </Button>
                  <Button onClick={handleNew} className="bg-foodmax-orange text-white hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" /> Novo
                  </Button>
                </div>
              </div>

              {sendLoading && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                    <div className="bg-green-500 h-2" style={{ width: `${sendProgress}%` }} />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Enviando emails...</div>
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
        onClose={() => { setShowForm(false); setCurrent(null); setIsEditing(false); }}
        onSave={async (data) => handleSave(data)}
        comunicacao={current}
        isLoading={formLoading}
      />

      <ComunicacaoView
        isOpen={showView}
        onClose={() => { setShowView(false); setCurrent(null); }}
        comunicacao={current}
      />

      <DeleteAlert isOpen={showDeleteAlert} onClose={() => setShowDeleteAlert(false)} onConfirm={handleDeleteConfirmed} itemName={current?.assunto} isLoading={false} />

      <BulkDeleteAlert
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={async () => {
          try {
            await makeRequest(`/api/comunicacoes/bulk-delete`, { method: 'POST', body: JSON.stringify({ ids: selectedIds }) });
            toast({ title: 'Excluídos', description: `${selectedIds.length} registro(s) excluído(s)` });
            await loadRows();
            setSelectedIds([]);
            setShowBulkDelete(false);
          } catch (e: any) {
            toast({ title: 'Erro', description: e.message || 'Falha ao excluir', variant: 'destructive' });
          }
        }}
        selectedCount={selectedIds.length}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => { setShowExport(false); setExportData([]); }}
        data={exportData}
        selectedIds={selectedIds}
        moduleName="Comunicações"
        columns={[
          { key: 'estabelecimento', label: 'Estabelecimento' },
          { key: 'tipo_comunicacao', label: 'Tipo de Comunicação' },
          { key: 'assunto', label: 'Assunto' },
          { key: 'mensagem', label: 'Mensagem' },
          { key: 'destinatarios_tipo', label: 'Destinatários' },
          { key: 'clientes_ids', label: 'Clientes IDs' },
          { key: 'fornecedores_ids', label: 'Fornecedores IDs' },
          { key: 'destinatarios_text', label: 'Destinatários Texto' },
          { key: 'status', label: 'Status' },
          { key: 'data_envio', label: 'Data de Envio' },
          { key: 'data_cadastro', label: 'Data Cadastro' },
        ]}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName="Comunicações"
        userRole={getUserRole()}
        hasPayment={hasPayment()}
        columns={[
          { key: 'estabelecimento', label: 'Estabelecimento (nome ou ID)', required: true },
          { key: 'tipo_comunicacao', label: 'Tipo de Comunicação', required: true },
          { key: 'assunto', label: 'Assunto', required: true },
          { key: 'mensagem', label: 'Mensagem', required: true },
          { key: 'destinatarios_tipo', label: 'Destinatários', required: true },
          { key: 'clientes_ids', label: 'Clientes IDs (1,2,3)' },
          { key: 'fornecedores_ids', label: 'Fornecedores IDs (1,2,3)' },
          { key: 'destinatarios_text', label: 'Destinatários Texto' },
          { key: 'status', label: 'Status' },
        ]}
        mapHeader={(h) => {
          const n = h.trim().toLowerCase();
          const map: Record<string, string> = {
            estabelecimento: 'estabelecimento',
            'tipo de comunicação': 'tipo_comunicacao',
            assunto: 'assunto',
            mensagem: 'mensagem',
            'destinatários': 'destinatarios_tipo',
            destinatarios: 'destinatarios_tipo',
            'clientes ids': 'clientes_ids',
            'fornecedores ids': 'fornecedores_ids',
            'destinatários texto': 'destinatarios_text',
            'destinatarios texto': 'destinatarios_text',
            status: 'status',
          };
          return map[n] || n.replace(/\s+/g, '_');
        }}
        validateRecord={(r) => {
          const errors: string[] = [];
          if (!r.estabelecimento) errors.push('Estabelecimento é obrigatório');
          if (!r.tipo_comunicacao) errors.push('Tipo de Comunicação é obrigatório');
          if (!r.assunto) errors.push('Assunto é obrigatório');
          if (!r.mensagem) errors.push('Mensagem é obrigatória');
          if (!r.destinatarios_tipo) errors.push('Destinatários é obrigatório');
          return errors;
        }}
        onImport={async (records) => {
          let imported = 0;
          for (const r of records) {
            try {
              let estabelecimento_id: number | null = null;
              const v = String(r.estabelecimento || '').trim();
              if (/^\d+$/.test(v)) {
                estabelecimento_id = parseInt(v, 10);
              } else {
                const found = estabelecimentos.find((e) => e.nome.toLowerCase() === v.toLowerCase());
                estabelecimento_id = found ? found.id : null;
              }
              if (!estabelecimento_id) continue;

              const parseIds = (s?: string) =>
                (String(s || '')
                  .split(/[,;\s]+/g)
                  .map((x) => parseInt(x.trim(), 10))
                  .filter((n) => !isNaN(n)) as number[]);

              await makeRequest(`/api/comunicacoes`, {
                method: 'POST',
                body: JSON.stringify({
                  estabelecimento_id,
                  tipo_comunicacao: r.tipo_comunicacao,
                  assunto: r.assunto,
                  mensagem: r.mensagem,
                  destinatarios_tipo: r.destinatarios_tipo,
                  clientes_ids: parseIds(r.clientes_ids),
                  fornecedores_ids: parseIds(r.fornecedores_ids),
                  destinatarios_text: r.destinatarios_text || '',
                  status: r.status || 'Pendente',
                }),
              });
              imported += 1;
            } catch {}
          }
          await loadRows();
          return { success: true, imported, message: `${imported} comunicação(ões) importada(s)` } as any;
        }}
      />

      {sendModalOpen && current && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Enviar Email</h3>
            <div className="space-y-3 max-h-[60vh] overflow-auto">
              <div>
                <div className="text-sm text-gray-600">Destinatários</div>
                <div className="text-sm bg-gray-50 rounded border p-2 whitespace-pre-wrap break-words">
                  {sendPreview.destinatarios.length > 0 ? sendPreview.destinatarios.join(', ') : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Assunto</div>
                <div className="text-sm font-medium">{sendPreview.assunto}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Mensagem</div>
                <div className="text-sm bg-gray-50 rounded border p-2 whitespace-pre-line">{sendPreview.mensagem}</div>
              </div>
              {sendLoading && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                    <div className="bg-green-500 h-2" style={{ width: `${sendProgress}%` }} />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Enviando email...</div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSendModalOpen(false)}>Cancelar</Button>
              <Button onClick={confirmSend} disabled={sendLoading} className="bg-foodmax-orange hover:bg-orange-600">
                <Send className="w-4 h-4 mr-2" /> {sendLoading ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
