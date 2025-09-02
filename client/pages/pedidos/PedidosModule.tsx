import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Menu,
  Home,
  Store,
  Users,
  Truck,
  List,
  Utensils,
  Search,
  Plus,
  Trash2,
  Eye,
  Edit,
  CheckCircle2,
  ShoppingBag,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/data-grid";
import { toast } from "@/hooks/use-toast";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Pedido,
  PedidosListResponse,
  StatusPedido,
  getStatusPedidoColor,
  getTipoPedidoColor,
  formatCurrencyBRL,
  TIPOS_PEDIDO,
  STATUS_PEDIDO,
} from "@shared/pedidos";
import PedidoForm from "./PedidoForm";
import PedidoView from "./PedidoView";
import {
  BulkDeleteAlert,
  DeleteAlert,
} from "@/components/alert-dialog-component";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";

export default function PedidosModule() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, getUserRole, hasPayment } = useAuth();
  const { makeRequest } = useAuthenticatedRequest();

  const tabs: (StatusPedido | "Todos")[] = [
    "Todos",
    "Pendente",
    "Finalizado",
    "Cancelado",
  ];
  const [activeTab, setActiveTab] = useState<StatusPedido | "Todos">("Todos");

  type TabState = { search: string; page: number };
  const [tabState, setTabState] = useState<Record<string, TabState>>({
    Todos: { search: "", page: 1 },
    Pendente: { search: "", page: 1 },
    Finalizado: { search: "", page: 1 },
    Cancelado: { search: "", page: 1 },
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

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [totalCounts, setTotalCounts] = useState<Record<string, number>>({
    Todos: 0,
    Pendente: 0,
    Finalizado: 0,
    Cancelado: 0,
  });
  const pageSize = 10;

  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);

  const [estabelecimentosMap, setEstabelecimentosMap] = useState<
    Map<number, string>
  >(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  const LOCAL_PEDIDOS = "fm_pedidos";
  const readLocalPedidos = (): Pedido[] => {
    try {
      const raw = localStorage.getItem(LOCAL_PEDIDOS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const writeLocalPedidos = (list: Pedido[]) =>
    localStorage.setItem(LOCAL_PEDIDOS, JSON.stringify(list));

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const gridColumns = useMemo(
    () => [
      {
        key: "estabelecimento_nome",
        label: "Estabelecimento",
        sortable: false,
        render: (v: any, r: any) => r.estabelecimento_nome || "-",
      },
      { key: "codigo", label: "Código", sortable: true },
      {
        key: "tipo_pedido",
        label: "Tipo",
        sortable: true,
        render: (v: any) => (
          <Badge className={getTipoPedidoColor(v)}>{v}</Badge>
        ),
      },
      {
        key: "valor_total",
        label: "Valor Total",
        sortable: true,
        render: (v: number) => formatCurrencyBRL(v),
      },
      {
        key: "data_hora_finalizado",
        label: "Data/Hora Finalizado",
        sortable: true,
        render: (v: string | null) =>
          v ? new Date(v).toLocaleString("pt-BR", {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }) : "-",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v: any) => (
          <Badge className={getStatusPedidoColor(v)}>{v}</Badge>
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
        render: (_: any, r: Pedido) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFinalize(r)}
              disabled={r.status === "Finalizado" || !!r.data_hora_finalizado}
              className={`h-8 w-8 p-0 rounded-full border ${
                r.status === "Finalizado" || !!r.data_hora_finalizado
                  ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-50"
                  : "bg-green-50 hover:bg-green-100 border-green-200"
              }`}
              title={r.status === "Finalizado" || !!r.data_hora_finalizado ? "Já finalizado" : "Finalizar"}
            >
              <CheckCircle2 className={`w-4 h-4 ${
                r.status === "Finalizado" || !!r.data_hora_finalizado
                  ? "text-gray-400"
                  : "text-green-700"
              }`} />
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

  const enrichWithEstabelecimentoNome = (list: Pedido[]) => {
    if (!estabelecimentosMap || estabelecimentosMap.size === 0)
      return list as any;
    return list.map((p: any) => ({
      ...p,
      estabelecimento_nome:
        p.estabelecimento_nome ||
        estabelecimentosMap.get(p.estabelecimento_id) ||
        p.estabelecimento_nome,
    }));
  };

  const loadEstabelecimentosMap = useCallback(async () => {
    try {
      const resp = await makeRequest(`/api/estabelecimentos?page=1&limit=1000`);
      const map = new Map<number, string>();
      if (Array.isArray(resp?.data)) {
        resp.data.forEach((e: any) => map.set(e.id, e.nome));
      } else {
        try {
          const local = JSON.parse(
            localStorage.getItem("fm_estabelecimentos") || "[]",
          );
          (local || []).forEach((e: any) => map.set(e.id, e.nome));
        } catch {}
      }
      setEstabelecimentosMap(map);
      setMapLoaded(true);
    } catch {
      setMapLoaded(true);
    }
  }, [makeRequest]);

  const loadCounts = useCallback(async () => {
    try {
      const requests = [
        makeRequest(`/api/pedidos?page=1&limit=1`),
        makeRequest(`/api/pedidos?page=1&limit=1&status=Pendente`),
        makeRequest(`/api/pedidos?page=1&limit=1&status=Finalizado`),
        makeRequest(`/api/pedidos?page=1&limit=1&status=Cancelado`),
      ];
      let [allResp, pendResp, finResp, cancResp] = await Promise.all(
        requests.map((p) => p.catch(() => null)),
      );

      if (allResp || pendResp || finResp || cancResp) {
        setTotalCounts({
          Todos: allResp?.pagination?.total || 0,
          Pendente: pendResp?.pagination?.total || 0,
          Finalizado: finResp?.pagination?.total || 0,
          Cancelado: cancResp?.pagination?.total || 0,
        });
        return;
      }

      const local = readLocalPedidos();
      setTotalCounts({
        Todos: local.length,
        Pendente: local.filter((p) => p.status === "Pendente").length,
        Finalizado: local.filter((p) => p.status === "Finalizado").length,
        Cancelado: local.filter((p) => p.status === "Cancelado").length,
      });
    } catch {}
  }, [makeRequest]);

  const loadPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(currentSearch && { search: currentSearch }),
        ...(activeTab !== "Todos" && { status: activeTab }),
      });
      let response: PedidosListResponse | null = null;
      try {
        response = await makeRequest(`/api/pedidos?${params}`);
      } catch {
        response = null;
      }
      if (response) {
        const data = enrichWithEstabelecimentoNome(response.data as any);
        setPedidos(data as any);
      } else {
        const local = readLocalPedidos();
        const filtered = local
          .filter((p) => activeTab === "Todos" || p.status === activeTab)
          .filter(
            (p) =>
              !currentSearch ||
              p.codigo.toLowerCase().includes(currentSearch.toLowerCase()),
          );
        setPedidos(enrichWithEstabelecimentoNome(filtered) as any);
      }
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [currentPage, currentSearch, activeTab, makeRequest, estabelecimentosMap]);

  useEffect(() => {
    try {
      localStorage.removeItem(LOCAL_PEDIDOS);
    } catch {}
    loadEstabelecimentosMap();
    loadCounts();
  }, [loadEstabelecimentosMap, loadCounts]);

  useEffect(() => {
    if (!mapLoaded) return;
    loadPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, currentPage, currentSearch, activeTab]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const handleSearch = (value: string) => {
    setCurrentSearch(value);
  };
  const handlePageChange = (page: number) => setCurrentPage(page);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [currentPedido, setCurrentPedido] = useState<Pedido | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const handleNew = () => {
    setCurrentPedido(null);
    setIsEditing(false);
    setShowForm(true);
  };
  const handleEdit = (p: Pedido) => {
    setCurrentPedido(p);
    setIsEditing(true);
    setShowView(false);
    setShowForm(true);
  };
  const handleView = (p: Pedido) => {
    setCurrentPedido(p);
    setShowView(true);
  };
  const handleDelete = (p: Pedido) => {
    setCurrentPedido(p);
    setShowDeleteAlert(true);
  };

  const refreshAfterMutation = async () => {
    // Limpar todos os caches relevantes
    try {
      localStorage.removeItem(LOCAL_PEDIDOS);
      localStorage.removeItem("fm_pedidos_cache");
      localStorage.removeItem("fm_grid_cache");
    } catch {}

    // Limpar seleção
    setSelectedIds([]);

    // Recarregar dados
    await Promise.all([loadPedidos(), loadCounts()]);
  };

  const handleSave = async (data: any) => {
    setFormLoading(true);
    try {
      if (isEditing && currentPedido) {
        await makeRequest(`/api/pedidos/${currentPedido.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast({
          title: "Pedido atualizado",
          description: "Pedido atualizado com sucesso",
        });
      } else {
        await makeRequest(`/api/pedidos`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast({
          title: "Pedido criado",
          description: "Pedido criado com sucesso",
        });
      }
      setSelectedIds([]);
      await refreshAfterMutation();
      setShowForm(false);
    } catch (error: any) {
      const list = readLocalPedidos();
      const now = new Date().toISOString();
      if (isEditing && currentPedido) {
        const idx = list.findIndex((x) => x.id === currentPedido.id);
        if (idx >= 0)
          list[idx] = { ...list[idx], ...data, data_atualizacao: now } as any;
        toast({
          title: "Pedido atualizado",
          description: "Pedido atualizado",
        });
      } else {
        const novo: Pedido = {
          id: Date.now(),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          estabelecimento_id: data.estabelecimento_id,
          cliente_id: data.cliente_id ?? null,
          codigo: data.codigo,
          tipo_pedido: data.tipo_pedido,
          valor_total: data.valor_total,
          data_hora_finalizado: data.data_hora_finalizado ?? null,
          observacao: data.observacao || null,
          status: data.status || "Pendente",
          data_cadastro: now,
          data_atualizacao: now,
        } as any;
        list.unshift(novo);
        toast({ title: "Pedido criado", description: "Pedido criado" });
      }
      writeLocalPedidos(list);
      setPedidos(enrichWithEstabelecimentoNome(list) as any);
      await loadCounts();
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleFinalize = async (p: Pedido) => {
    try {
      await makeRequest(`/api/pedidos/${p.id}/finalizar`, { method: "PATCH" });
      toast({
        title: "Pedido finalizado",
        description: "Status alterado para Finalizado",
      });
      await refreshAfterMutation();
    } catch {
      const list = readLocalPedidos();
      const idx = list.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        list[idx].status = "Finalizado" as any;
        list[idx].data_hora_finalizado = new Date().toISOString();
        writeLocalPedidos(list);
        setPedidos(enrichWithEstabelecimentoNome(list) as any);
        toast({
          title: "Pedido finalizado",
          description: "Status alterado",
        });
        await loadCounts();
      }
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!currentPedido) return;
    try {
      await makeRequest(`/api/pedidos/${currentPedido.id}`, {
        method: "DELETE",
      });
      toast({
        title: "Pedido excluído",
        description: "Pedido excluído com sucesso",
      });
      await refreshAfterMutation();
      setShowDeleteAlert(false);
    } catch (error: any) {
      const list = readLocalPedidos().filter((e) => e.id !== currentPedido.id);
      writeLocalPedidos(list);
      await refreshAfterMutation();
      toast({
        title: "Pedido excluído",
        description: "Pedido excluído com sucesso",
      });
      setShowDeleteAlert(false);
    }
  };

  const filteredPedidos = useMemo(() => {
    return pedidos.filter(
      (p) => activeTab === "Todos" || p.status === activeTab,
    );
  }, [pedidos, activeTab]);

  const getAllPedidosForExport = async (): Promise<any[]> => {
    try {
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      const resp = await makeRequest(`/api/pedidos?${params}`);
      const data = Array.isArray(resp?.data) ? resp.data : [];
      return enrichWithEstabelecimentoNome(data as any);
    } catch {
      return enrichWithEstabelecimentoNome(readLocalPedidos() as any);
    }
  };

  const getPedidosWithRelationsForExport = async () => {
    const all = await getAllPedidosForExport();
    const pedidosToExport =
      selectedIds.length > 0
        ? all.filter((p: any) => selectedIds.includes(p.id))
        : all;

    const exportRows: any[] = [];

    for (const p of pedidosToExport) {
      try {
        const det = await makeRequest(`/api/pedidos/${p.id}`);
        const pedido = det || p;

        const cardapios: any[] = Array.isArray(pedido.cardapios)
          ? pedido.cardapios
          : [];
        const extras: any[] = Array.isArray(pedido.itens_extras)
          ? pedido.itens_extras
          : [];

        // Consolidar cardápios em uma única string
        const cardapiosInfo =
          cardapios.length > 0
            ? cardapios
                .map(
                  (c) =>
                    `${c.cardapio_nome || "N/A"} (R$ ${((c.preco_total || 0) / 100).toFixed(2)})`,
                )
                .join("; ")
            : "";

        // Consolidar itens extras em strings separadas
        const extrasNomes =
          extras.length > 0
            ? extras
                .map((e) => e.item_nome || "")
                .filter((n) => n)
                .join("; ")
            : "";
        const extrasCategorias =
          extras.length > 0
            ? extras
                .map((e) => e.categoria_nome || "")
                .filter((n) => n)
                .join("; ")
            : "";
        const extrasQuantidades =
          extras.length > 0
            ? extras
                .map((e) => e.quantidade ?? "")
                .filter((n) => n !== "")
                .join("; ")
            : "";
        const extrasValores =
          extras.length > 0
            ? extras
                .map((e) => `R$ ${((e.valor_unitario || 0) / 100).toFixed(2)}`)
                .join("; ")
            : "";

        // Uma única linha por pedido com dados consolidados
        exportRows.push({
          estabelecimento_nome:
            pedido.estabelecimento_nome || p.estabelecimento_nome || "",
          cliente_nome: pedido.cliente_nome || "",
          codigo: pedido.codigo,
          tipo_pedido: pedido.tipo_pedido,
          valor_total: ((pedido.valor_total || 0) / 100).toFixed(2),
          status: pedido.status,
          data_hora_finalizado: pedido.data_hora_finalizado
            ? new Date(pedido.data_hora_finalizado).toLocaleString("pt-BR", {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })
            : "",
          observacao: pedido.observacao || "",
          data_cadastro: pedido.data_cadastro || "",
          data_atualizacao: pedido.data_atualizacao || "",
          cardapios: cardapiosInfo,
          itens_extras_nome: extrasNomes,
          itens_extras_categoria: extrasCategorias,
          itens_extras_quantidade: extrasQuantidades,
          itens_extras_valor_unitario: extrasValores,
        });
      } catch {
        // Fallback para dados básicos sem detalhamento
        exportRows.push({
          estabelecimento_nome: p.estabelecimento_nome || "",
          cliente_nome: "",
          codigo: p.codigo,
          tipo_pedido: p.tipo_pedido,
          valor_total: ((p.valor_total || 0) / 100).toFixed(2),
          status: p.status,
          data_hora_finalizado: p.data_hora_finalizado
            ? new Date(p.data_hora_finalizado).toLocaleString("pt-BR", {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })
            : "",
          observacao: p.observacao || "",
          data_cadastro: p.data_cadastro || "",
          data_atualizacao: p.data_atualizacao || "",
          cardapios: "",
          itens_extras_nome: "",
          itens_extras_categoria: "",
          itens_extras_quantidade: "",
          itens_extras_valor_unitario: "",
        });
      }
    }

    return exportRows;
  };

  const handleImportPedidos = async (records: any[]) => {
    try {
      const estMap = estabelecimentosMap;
      const now = new Date().toISOString();
      const valid: any[] = [];

      console.log("Processing", records.length, "records for import");
      console.log("Available establishments:", Array.from(estMap.entries()));

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        console.log(`Processing record ${i + 1}:`, r);

        // Debug all date-related fields
        console.log(`🔍 CSV Field Values for record ${i + 1}:`);
        console.log(`  - data_hora_finalizado: "${r.data_hora_finalizado || ''}"`);
        console.log(`  - Data/Hora Finalizado: "${r["Data/Hora Finalizado"] || ''}"`);
        console.log(`  - observacao: "${r.observacao || ''}"`);
        console.log(`  - Observação: "${r["Observação"] || ''}"`);
        console.log(`  - data_cadastro: "${r.data_cadastro || ''}"`);
        console.log(`  - Data Cadastro: "${r["Data Cadastro"] || ''}"`);
        console.log(`  - data_atualizacao: "${r.data_atualizacao || ''}"`);
        console.log(`  - Data Atualização: "${r["Data Atualização"] || ''}"`);
        console.log(`  - All keys:`, Object.keys(r));

        // Map estabelecimento - check both estabelecimento and estabelecimento_nome
        const nomeEst = String(
          r.estabelecimento_nome || r.estabelecimento || "",
        ).trim();

        console.log(`Looking for establishment: "${nomeEst}"`);

        let estId = null;
        if (nomeEst) {
          // Try exact match first
          estId = Array.from(estMap.entries()).find(
            ([, nome]) => nome.toLowerCase() === nomeEst.toLowerCase(),
          )?.[0];

          // If no exact match, try partial match
          if (!estId) {
            estId = Array.from(estMap.entries()).find(
              ([, nome]) =>
                nome.toLowerCase().includes(nomeEst.toLowerCase()) ||
                nomeEst.toLowerCase().includes(nome.toLowerCase()),
            )?.[0];
          }
        } else {
          estId = Number(r.estabelecimento_id || r.id_estabelecimento || 0);
        }

        console.log(`Found establishment ID: ${estId}`);

        if (!estId) {
          console.log(
            `Skipping record ${i + 1}: No establishment found for "${nomeEst}"`,
          );
          // Try to create establishment locally if missing
          if (nomeEst) {
            const newEstId = Date.now() + Math.floor(Math.random() * 1000);
            estMap.set(newEstId, nomeEst);
            estId = newEstId;
            console.log(
              `Created temporary establishment: ${nomeEst} with ID ${estId}`,
            );
          } else {
            continue;
          }
        }

        // Validate tipo_pedido
        const tipo = String(r.tipo_pedido || r.tipo || "").trim() as any;
        if (!TIPOS_PEDIDO.includes(tipo)) continue;

        // Validate status
        const status = String(r.status || "Pendente").trim() as any;
        if (!STATUS_PEDIDO.includes(status)) continue;

        // Parse valor_total - handle currency format from CSV
        const valorStr = String(r.valor_total || 0)
          .replace(/R\$/g, "")
          .replace(/\s/g, "")
          .trim();

        let valor_centavos = 0;
        if (valorStr) {
          // If contains comma as decimal separator (Brazilian format)
          if (valorStr.includes(",") && !valorStr.includes(".")) {
            valor_centavos = Math.round(
              parseFloat(valorStr.replace(",", ".")) * 100,
            );
          }
          // If contains both comma and dot (thousands separator)
          else if (valorStr.includes(",") && valorStr.includes(".")) {
            valor_centavos = Math.round(
              parseFloat(valorStr.replace(/\./g, "").replace(",", ".")) * 100,
            );
          }
          // If only dots (could be thousands separator or decimal)
          else if (valorStr.includes(".")) {
            const parts = valorStr.split(".");
            if (parts.length === 2 && parts[1].length <= 2) {
              // Decimal separator
              valor_centavos = Math.round(parseFloat(valorStr) * 100);
            } else {
              // Thousands separator
              valor_centavos = Math.round(
                parseFloat(valorStr.replace(/\./g, "")) * 100,
              );
            }
          }
          // No separators
          else {
            valor_centavos = Math.round(parseFloat(valorStr) * 100);
          }
        }

        // Parse dates correctly - handles both date and datetime formats
        const parseDate = (dateStr: string) => {
          console.log(`🔍 parseDate called with: "${dateStr}" (type: ${typeof dateStr})`);
          if (!dateStr) return null;

          // Skip time-only values (HH:MM:SS format without date)
          const timeOnlyPattern = /^\d{1,2}:\d{2}:\d{2}$/;
          if (timeOnlyPattern.test(dateStr.trim())) {
            console.log(`⏰ Skipping time-only value: "${dateStr}"`);
            return null;
          }

          try {
            // Handle DD/MM/YYYY, HH:MM:SS format (from CSV export)
            if (dateStr.includes("/") && dateStr.includes(",")) {
              // Split on comma to separate date and time: "02/09/2025, 01:07:27"
              const [datePart, timePart] = dateStr.split(",").map(s => s.trim());
              const [day, month, year] = datePart.split("/");

              // Validate date components
              const dayNum = parseInt(day);
              const monthNum = parseInt(month);
              const yearNum = parseInt(year);

              if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum) ||
                  dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
                console.log(`❌ Invalid date components in "${dateStr}"`);
                return null;
              }

              if (timePart) {
                // Parse time component
                const [hours, minutes, seconds] = timePart.split(":");
                const hoursNum = parseInt(hours || "0");
                const minutesNum = parseInt(minutes || "0");
                const secondsNum = parseInt(seconds || "0");

                // Validate time components
                if (isNaN(hoursNum) || isNaN(minutesNum) || isNaN(secondsNum) ||
                    hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59 || secondsNum < 0 || secondsNum > 59) {
                  console.log(`❌ Invalid time components in "${dateStr}"`);
                  return null;
                }

                // Use UTC to prevent timezone conversion issues
                const parsedDate = new Date(Date.UTC(
                  yearNum,
                  monthNum - 1,
                  dayNum,
                  hoursNum,
                  minutesNum,
                  secondsNum
                ));

                // Validate the created date
                if (isNaN(parsedDate.getTime())) {
                  console.log(`❌ Invalid date created from "${dateStr}"`);
                  return null;
                }

                const isoString = parsedDate.toISOString();
                console.log(`✅ Parsed datetime "${dateStr}" -> "${isoString}"`);
                return isoString;
              } else {
                // No time component, just date - use UTC
                const parsedDate = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));

                // Validate the created date
                if (isNaN(parsedDate.getTime())) {
                  console.log(`❌ Invalid date created from "${dateStr}"`);
                  return null;
                }

                const isoString = parsedDate.toISOString();
                return isoString;
              }
            }
            // Handle DD/MM/YYYY format (date only)
            else if (dateStr.includes("/")) {
              const [day, month, year] = dateStr.split("/");
              const dayNum = parseInt(day);
              const monthNum = parseInt(month);
              const yearNum = parseInt(year);

              // Validate date components
              if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum) ||
                  dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
                console.log(`❌ Invalid date components in "${dateStr}"`);
                return null;
              }

              const parsedDate = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));

              // Validate the created date
              if (isNaN(parsedDate.getTime())) {
                console.log(`❌ Invalid date created from "${dateStr}"`);
                return null;
              }

              const isoString = parsedDate.toISOString();
              return isoString;
            }
            // Handle other formats (ISO strings, etc.)
            const fallbackDate = new Date(dateStr);

            // Validate the created date
            if (isNaN(fallbackDate.getTime())) {
              console.log(`❌ Invalid date from fallback parsing: "${dateStr}"`);
              return null;
            }

            const isoString = fallbackDate.toISOString();
            return isoString;
          } catch (error) {
            console.error(`❌ Error parsing date "${dateStr}":`, error);
            return null;
          }
        };

        const novo: any = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          id_usuario: Number(localStorage.getItem("fm_user_id") || 1),
          estabelecimento_id: estId,
          cliente_id: null, // Will be handled if cliente mapping is needed
          codigo:
            String(r.codigo || "").trim() ||
            `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          tipo_pedido: tipo,
          valor_total: valor_centavos,
          data_hora_finalizado: (() => {
            // Check specific field names for data_hora_finalizado only
            const rawValue = r["data_hora_finalizado"] || r["Data/Hora Finalizado"] || r["data/hora finalizado"] || "";
            console.log(`🎯 Processing data_hora_finalizado for record ${i + 1}:`);
            console.log(`🎯 Available keys in record:`, Object.keys(r));
            console.log(`🎯 Raw data_hora_finalizado value: "${rawValue}"`);

            if (!rawValue) {
              console.log(`🎯 No data_hora_finalizado value found - will be null`);
              return null;
            }

            const parsed = parseDate(rawValue);
            console.log(`🎯 Final parsed result: "${parsed}"`);
            return parsed;
          })(),
          observacao: String(r.observacao || r.observação || "").trim() || null,
          status: status,
          data_cadastro: (() => {
            const rawValue = r.data_cadastro || r["Data Cadastro"] || "";
            console.log(`📅 data_cadastro raw value: "${rawValue}"`);
            const parsed = parseDate(rawValue);
            return parsed || now;
          })(),
          data_atualizacao: (() => {
            const rawValue = r.data_atualizacao || r["Data Atualização"] || r["data atualização"] || "";
            console.log(`📅 data_atualizacao raw value: "${rawValue}"`);
            const parsed = parseDate(rawValue);
            return parsed || now;
          })(),
        };
        novo.estabelecimento_nome = estMap.get(estId);

        // Process consolidated cardápios (Menu01 (R$ 69.30); Menu02 (R$ 42.00))
        const cardapios: any[] = [];
        const cardapiosText = String(r.cardapios || r.cardápios || "").trim();
        if (cardapiosText) {
          const cardapioItems = cardapiosText
            .split(";")
            .map((item) => item.trim())
            .filter((item) => item);
          for (const item of cardapioItems) {
            // Match pattern: Name (R$ XX.XX)
            const match = item.match(/^(.+?)\s*\(\s*R\$\s*([0-9,\.]+)\s*\)$/i);
            if (match) {
              const nome = match[1].trim();
              const precoStr = match[2].replace(",", ".");
              const preco = parseFloat(precoStr);
              cardapios.push({
                cardapio_nome: nome,
                preco_total: Math.round(preco * 100), // convert to cents
              });
            }
          }
        }

        // Process consolidated extras (separated by ;)
        const itensExtras: any[] = [];
        const extrasNomes = String(
          r["itens extras nome"] || r.itens_extras_nome || "",
        )
          .split(";")
          .map((n) => n.trim())
          .filter((n) => n);
        const extrasCategorias = String(
          r["itens extras categoria"] || r.itens_extras_categoria || "",
        )
          .split(";")
          .map((c) => c.trim())
          .filter((c) => c);
        const extrasQuantidades = String(
          r["itens extras quantidade"] || r.itens_extras_quantidade || "",
        )
          .split(";")
          .map((q) => q.trim())
          .filter((q) => q);
        const extrasValores = String(
          r["itens extras valor unitario"] ||
            r.itens_extras_valor_unitario ||
            "",
        )
          .split(";")
          .map((v) => v.trim())
          .filter((v) => v);

        const maxExtras = Math.max(
          extrasNomes.length,
          extrasCategorias.length,
          extrasQuantidades.length,
          extrasValores.length,
        );

        for (let i = 0; i < maxExtras; i++) {
          const nome = extrasNomes[i] || "";
          const categoria = extrasCategorias[i] || "";
          const quantidade = parseInt(extrasQuantidades[i]) || 1;
          const valorStr = extrasValores[i] || "0";

          // Parse value (R$ XX.XX format)
          let valor = 0;
          if (valorStr) {
            const cleanValue = valorStr
              .replace(/R\$/g, "")
              .replace(/\s/g, "")
              .replace(",", ".");
            valor = parseFloat(cleanValue) || 0;
          }

          if (nome) {
            itensExtras.push({
              item_nome: nome,
              categoria_nome: categoria,
              quantidade: quantidade,
              valor_unitario: Math.round(valor * 100), // convert to cents
            });
          }
        }

        // Add relations to the order object
        novo.cardapios = cardapios;
        novo.itens_extras = itensExtras;

        console.log(`🎯 Final novo object for record ${i + 1}:`, {
          codigo: novo.codigo,
          data_hora_finalizado: novo.data_hora_finalizado,
          status: novo.status
        });

        valid.push(novo);
      }

      console.log(
        `Processed ${records.length} records, ${valid.length} valid records found`,
      );

      if (valid.length === 0) {
        return {
          success: false,
          imported: 0,
          message: `Nenhum registro válido encontrado. Processados ${records.length} registros.`,
        } as any;
      }

      // Try to send to server with relations
      try {
        const response = await makeRequest(`/api/pedidos/import-full`, {
          method: "POST",
          body: JSON.stringify({ records: valid }),
        });
        await Promise.all([loadPedidos(), loadCounts()]);
        return {
          success: true,
          imported: response?.imported ?? valid.length,
          message: `${response?.imported ?? valid.length} pedido(s) importado(s) com todas as relações`,
        } as any;
      } catch (e) {
        // Local fallback - save at least basic order data
        const existing = readLocalPedidos();
        const pedidosBasicos = valid.map((v) => {
          const { cardapios, itens_extras, ...pedidoBasico } = v;
          return pedidoBasico;
        });
        const merged = [...pedidosBasicos, ...existing];
        writeLocalPedidos(merged);
        setPedidos(enrichWithEstabelecimentoNome(merged) as any);
        await loadCounts();
        return {
          success: true,
          imported: valid.length,
          message: `${valid.length} pedido(s) importado(s) localmente (dados básicos)`,
        } as any;
      }
    } catch (e) {
      return {
        success: false,
        imported: 0,
        message: "Erro ao importar: " + (e as Error).message,
      } as any;
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
                  Pedidos
                </h2>
                <p className="text-gray-600 mt-1">
                  Gerencie os pedidos por status.
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="w-full">
              <div className="w-full border-b border-gray-200">
                <div className="flex items-center gap-6">
                  {tabs.map((st) => (
                    <div key={st} className="flex items-center gap-6">
                      <button
                        className={`relative -mb-px pb-2 pt-1 text-base flex items-center gap-2 ${
                          activeTab === (st as any)
                            ? "text-foodmax-orange"
                            : "text-gray-700 hover:text-gray-900"
                        }`}
                        onClick={() => setActiveTab(st as any)}
                      >
                        <span>{st}</span>
                        <span
                          className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${
                            activeTab === (st as any)
                              ? "bg-orange-100 text-foodmax-orange"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {totalCounts[st] ?? 0}
                        </span>
                        {activeTab === (st as any) && (
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
                    onClick={async () => {
                      const data = await getPedidosWithRelationsForExport();
                      setExportData(data);
                      setShowExport(true);
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
              columns={gridColumns}
              data={filteredPedidos}
              loading={loading || !initialLoadComplete}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              searchTerm={currentSearch}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={filteredPedidos.length}
              onPageChange={handlePageChange}
              showActions={false}
            />
          </div>
        </main>
      </div>

      <PedidoForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setCurrentPedido(null);
          setIsEditing(false);
        }}
        onSave={handleSave}
        pedido={currentPedido}
        isLoading={formLoading}
      />

      <PedidoView
        isOpen={showView}
        onClose={() => {
          setShowView(false);
          setCurrentPedido(null);
        }}
        onEdit={(p) => handleEdit(p as any)}
        pedido={currentPedido as any}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => {
          setShowExport(false);
          setExportData([]);
        }}
        data={exportData}
        selectedIds={selectedIds}
        moduleName="Pedidos"
        columns={[
          { key: "estabelecimento_nome", label: "Estabelecimento" },
          { key: "cliente_nome", label: "Cliente" },
          { key: "codigo", label: "Código" },
          { key: "tipo_pedido", label: "Tipo de Pedido" },
          { key: "valor_total", label: "Valor Total" },
          { key: "status", label: "Status" },
          { key: "data_hora_finalizado", label: "Data/Hora Finalizado" },
          { key: "observacao", label: "Observação" },
          { key: "data_cadastro", label: "Data Cadastro" },
          { key: "data_atualizacao", label: "Data Atualização" },
          { key: "cardapios", label: "Cardápios" },
          { key: "itens_extras_nome", label: "Itens Extras Nome" },
          { key: "itens_extras_categoria", label: "Itens Extras Categoria" },
          { key: "itens_extras_quantidade", label: "Itens Extras Quantidade" },
          {
            key: "itens_extras_valor_unitario",
            label: "Itens Extras Valor Unitario",
          },
        ]}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        moduleName="Pedidos"
        userRole={getUserRole()}
        hasPayment={hasPayment()}
        columns={[
          {
            key: "estabelecimento_nome",
            label: "Estabelecimento",
            required: true,
          },
          { key: "cliente_nome", label: "Cliente" },
          { key: "codigo", label: "Código" },
          { key: "tipo_pedido", label: "Tipo de Pedido", required: true },
          { key: "valor_total", label: "Valor Total" },
          { key: "status", label: "Status" },
          { key: "data_hora_finalizado", label: "Data/Hora Finalizado" },
          { key: "observacao", label: "Observação" },
          { key: "data_cadastro", label: "Data Cadastro" },
          { key: "data_atualizacao", label: "Data Atualização" },
          { key: "cardapios", label: "Cardápios (Nome (R$ Preço); ...)" },
          {
            key: "itens_extras_nome",
            label: "Itens Extras Nome (separados por ;)",
          },
          {
            key: "itens_extras_categoria",
            label: "Itens Extras Categoria (separados por ;)",
          },
          {
            key: "itens_extras_quantidade",
            label: "Itens Extras Quantidade (separados por ;)",
          },
          {
            key: "itens_extras_valor_unitario",
            label: "Itens Extras Valor Unitario (separados por ;)",
          },
        ]}
        mapHeader={(h) => {
          const original = h.trim();
          const n = original.toLowerCase();

          // Exact mapping for CSV headers (case-sensitive match first)
          const exactMap: Record<string, string> = {
            // Exact CSV headers from your file
            Estabelecimento: "estabelecimento_nome",
            Cliente: "cliente_nome",
            Código: "codigo",
            "Tipo de Pedido": "tipo_pedido",
            "Valor Total": "valor_total",
            Status: "status",
            "Data/Hora Finalizado": "data_hora_finalizado",
            "Observação": "observacao",
            "Data Cadastro": "data_cadastro",
            "Data Atualização": "data_atualizacao",
            Cardápios: "cardapios",
            "Itens Extras Nome": "itens_extras_nome",
            "Itens Extras Categoria": "itens_extras_categoria",
            "Itens Extras Quantidade": "itens_extras_quantidade",
            "Itens Extras Valor Unitario": "itens_extras_valor_unitario",
          };

          // Check exact match first
          if (exactMap[original]) {
            return exactMap[original];
          }

          // Fallback to lowercase mapping
          const lowerMap: Record<string, string> = {
            estabelecimento: "estabelecimento_nome",
            "estabelecimento nome": "estabelecimento_nome",
            cliente: "cliente_nome",
            "cliente nome": "cliente_nome",
            código: "codigo",
            codigo: "codigo",
            tipo: "tipo_pedido",
            "tipo de pedido": "tipo_pedido",
            valor: "valor_total",
            "valor total": "valor_total",
            "valor total (centavos)": "valor_total",
            status: "status",
            observação: "observacao",
            observacao: "observacao",
            "data/hora finalizado": "data_hora_finalizado",
            "data cadastro": "data_cadastro",
            "data atualização": "data_atualizacao",
            "data atualizacao": "data_atualizacao",
            cardápios: "cardapios",
            cardapios: "cardapios",
            cardápio: "cardapios",
            cardapio: "cardapios",
            "itens extras nome": "itens_extras_nome",
            "itens extras categoria": "itens_extras_categoria",
            "itens extras quantidade": "itens_extras_quantidade",
            "itens extras valor unitario": "itens_extras_valor_unitario",
            "itens extras valor unitário": "itens_extras_valor_unitario",
          };

          return lowerMap[n] || n.replace(/\s+/g, "_");
        }}
        validateRecord={(r, index) => {
          const errors: string[] = [];

          console.log(`Validating record ${index + 1}:`, r);

          // Check estabelecimento
          if (!r.estabelecimento_nome && !r.estabelecimento) {
            errors.push("Estabelecimento é obrigatório");
          }

          // Check tipo_pedido
          const tipo = String(r.tipo_pedido || "").trim();
          if (!tipo) {
            errors.push("Tipo de Pedido é obrigatório");
          } else if (!TIPOS_PEDIDO.includes(tipo as any)) {
            errors.push(
              `Tipo inválido: '${tipo}'. Valores aceitos: ${TIPOS_PEDIDO.join(", ")}`,
            );
          }

          // Check status (optional, defaults to Pendente)
          const status = String(r.status || "Pendente").trim();
          if (status && !STATUS_PEDIDO.includes(status as any)) {
            errors.push(
              `Status inválido: '${status}'. Valores aceitos: ${STATUS_PEDIDO.join(", ")}`,
            );
          }

          // Check valor_total
          const valorStr = String(r.valor_total || "").trim();
          if (
            valorStr &&
            isNaN(
              parseFloat(valorStr.replace(/[R$\s,]/g, "").replace(",", ".")),
            )
          ) {
            errors.push("Valor Total inválido");
          }

          console.log(`Record ${index + 1} validation errors:`, errors);
          return errors;
        }}
        onImport={async (records) => {
          console.log(
            "ImportModal onImport called with",
            records.length,
            "records",
          );

          // Always use our enhanced handleImportPedidos function
          const result = await handleImportPedidos(records);
          console.log("Import result:", result);
          return result as any;
        }}
      />

      <DeleteAlert
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleDeleteConfirmed}
        itemName={currentPedido?.codigo}
        isLoading={false}
      />

      <BulkDeleteAlert
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={async () => {
          try {
            await makeRequest(`/api/pedidos/bulk-delete`, {
              method: "POST",
              body: JSON.stringify({ ids: selectedIds }),
            });
            toast({
              title: "Pedidos excluídos",
              description: `${selectedIds.length} registro(s) excluído(s) com sucesso`,
            });
            await refreshAfterMutation();
            setShowBulkDelete(false);
          } catch (error: any) {
            const list = readLocalPedidos().filter(
              (e) => !selectedIds.includes(e.id),
            );
            writeLocalPedidos(list);
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
    </div>
  );
}
