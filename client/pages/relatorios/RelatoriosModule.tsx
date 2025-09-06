import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  BarChart3,
  PieChart as PieIcon,
  Menu,
} from "lucide-react";
import { Estabelecimento } from "@shared/estabelecimentos";
import { FinanceiroTransacao } from "@shared/financeiro";
import { Pedido, STATUS_PEDIDO } from "@shared/pedidos";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const periodoOptions = [
  { value: "all", label: "Todos Períodos" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "month", label: "Este mês" },
  { value: "12m", label: "Últimos 12 meses" },
];

function parsePeriod(period: string | undefined): Date | null {
  if (!period || period === "all") return null;
  const now = new Date();
  if (period === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (period === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "12m") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 12);
    return d;
  }
  const d = new Date(period);
  return isNaN(d.getTime()) ? null : d;
}

export default function RelatoriosModule() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { makeRequest } = useAuthenticatedRequest();

  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(
    [],
  );
  const [selectedEstabelecimento, setSelectedEstabelecimento] =
    useState<string>("all");
  const [period, setPeriod] = useState<string>("all");

  const [financeiro, setFinanceiro] = useState<FinanceiroTransacao[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const chartsContainerRef = useRef<HTMLDivElement>(null);
  const finCardRef = useRef<HTMLDivElement>(null);
  const pedCardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const loadEstabelecimentos = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      const res = await makeRequest(`/api/estabelecimentos?${params}`);
      const list = (res.data || []) as Estabelecimento[];
      list.sort((a, b) => (a.data_cadastro < b.data_cadastro ? 1 : -1));
      setEstabelecimentos(list);
      setSelectedEstabelecimento("all");
    } catch {
      setEstabelecimentos([]);
      setSelectedEstabelecimento("all");
    }
  }, [makeRequest]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Financeiro supports server-side period filtering
      const fParams = new URLSearchParams({ page: "1", limit: "10000" });
      if (selectedEstabelecimento !== "all")
        fParams.set("estabelecimento_id", selectedEstabelecimento);
      if (period) fParams.set("period", period);
      try {
        const fin = await makeRequest(`/api/financeiro?${fParams}`);
        setFinanceiro((fin?.data as FinanceiroTransacao[]) || []);
      } catch {
        setFinanceiro([]);
      }

      // Pedidos doesn't support period on server, fetch a large page and filter client-side
      const pParams = new URLSearchParams({ page: "1", limit: "10000" });
      try {
        const res = await makeRequest(`/api/pedidos?${pParams}`);
        setPedidos((res?.data as Pedido[]) || []);
      } catch {
        setPedidos([]);
      }
    } finally {
      setLoading(false);
    }
  }, [makeRequest, period, selectedEstabelecimento]);

  useEffect(() => {
    loadEstabelecimentos();
  }, [loadEstabelecimentos]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredFinanceiro = useMemo(() => {
    const from = parsePeriod(period);
    return financeiro.filter((t) => {
      const byEst =
        selectedEstabelecimento === "all" ||
        t.estabelecimento_id === Number(selectedEstabelecimento);
      const byDate = from
        ? (t.data_transacao
            ? new Date(t.data_transacao)
            : new Date(t.data_cadastro)) >= from
        : true;
      return byEst && byDate;
    });
  }, [financeiro, period, selectedEstabelecimento]);

  const filteredPedidos = useMemo(() => {
    const from = parsePeriod(period);
    return pedidos.filter((p) => {
      const byEst =
        selectedEstabelecimento === "all" ||
        p.estabelecimento_id === Number(selectedEstabelecimento);
      const dt = p.data_hora_finalizado || p.data_cadastro;
      const byDate = from ? new Date(dt) >= from : true;
      return byEst && byDate;
    });
  }, [pedidos, period, selectedEstabelecimento]);

  const finBarData = useMemo(() => {
    // aggregate by month or day depending on period
    const from = parsePeriod(period);
    const useMonthly = !from || period === "12m" || period === "all";
    const map = new Map<
      string,
      { label: string; receitas: number; despesas: number }
    >();
    const fmtMonth = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const labelMonth = (d: Date) =>
      d.toLocaleString("pt-BR", { month: "short", year: "numeric" });
    const fmtDay = (d: Date) => d.toISOString().slice(0, 10);
    const labelDay = (d: Date) => d.toLocaleDateString("pt-BR");

    filteredFinanceiro.forEach((t) => {
      const d = new Date(t.data_transacao || t.data_cadastro);
      const key = useMonthly ? fmtMonth(d) : fmtDay(d);
      const label = useMonthly ? labelMonth(d) : labelDay(d);
      if (!map.has(key)) map.set(key, { label, receitas: 0, despesas: 0 });
      const obj = map.get(key)!;
      if (t.tipo === "Receita") obj.receitas += t.valor;
      else obj.despesas += t.valor;
    });

    const arr = Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([, v]) => v);
    return arr;
  }, [filteredFinanceiro, period]);

  const pedidosPieData = useMemo(() => {
    const counts: Record<string, number> = {
      Pendente: 0,
      Finalizado: 0,
      Cancelado: 0,
    };
    filteredPedidos.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return [
      { name: "Pendente", value: counts.Pendente },
      { name: "Finalizado", value: counts.Finalizado },
      { name: "Cancelado", value: counts.Cancelado },
    ];
  }, [filteredPedidos]);

  const estabOptions = useMemo(() => {
    const opts = estabelecimentos.map((e) => ({
      value: String(e.id),
      label: e.nome,
    }));
    opts.push({ value: "all", label: "Todos Estabelecimentos" });
    return opts;
  }, [estabelecimentos]);

  const ensureChartsRendered = async (elements: HTMLElement[]): Promise<boolean> => {
    const timeout = 15000; // wait longer for slow renders
    const interval = 300;
    let elapsed = 0;

    // If the page is still loading data, wait until loading finishes (but cap by timeout)
    while (loading && elapsed < timeout) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, interval));
      elapsed += interval;
    }

    elapsed = 0;
    while (elapsed < timeout) {
      let allReady = true;
      for (const el of elements) {
        const svgs = el.getElementsByTagName("svg");
        if (svgs.length === 0) {
          allReady = false;
          break;
        }
        let ready = false;
        for (const svg of Array.from(svgs)) {
          try {
            const bbox = svg.getBBox();
            // require a slightly larger bbox to be sure it's fully rendered
            if (bbox && bbox.width > 8 && bbox.height > 8) {
              ready = true;
              break;
            }
          } catch (e) {
            // ignore
          }
        }
        if (!ready) {
          allReady = false;
          break;
        }
      }
      if (allReady) return true;
      // wait and retry
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, interval));
      elapsed += interval;
    }
    return false;
  };

  const exportToPDF = useCallback(async () => {
    const elements: HTMLElement[] = [];
    if (finCardRef.current) elements.push(finCardRef.current);
    if (pedCardRef.current) elements.push(pedCardRef.current);
    if (elements.length === 0) return;

    setExporting(true);
    try {
      // wait charts render
      const ready = await ensureChartsRendered(elements);
      if (!ready) {
        setExporting(false);
        toast({
          title: "Gráficos incompletos",
          description: "Os gráficos não terminaram de carregar. Aguarde e tente novamente.",
        });
        return;
      }

      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Cabeçalho
      const marginX = 40;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(17, 24, 39); // gray-900
      pdf.text("Gestão Gastronômica", pageWidth / 2, 40, { align: "center" });

      // quebra de linha após o título -> subtítulo alinhado à esquerda
      const nomeEstabDisplay =
        selectedEstabelecimento === "all"
          ? "Todos Estabelecimentos"
          : estabelecimentos.find((e) => e.id === Number(selectedEstabelecimento))?.nome || "Estabelecimento";
      const periodoLabel = (periodoOptions.find((p) => p.value === period)?.label) || "Todos Períodos";

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.setTextColor(75, 85, 99); // gray-600
      const subtitleY = 64;
      pdf.text(`${nomeEstabDisplay} - ${periodoLabel}`, pageWidth / 2, subtitleY, { align: "center" }); // subtitle centered

      // duas quebras de linha após subtítulo
      let currentY = subtitleY + 28 * 2;

      const maxHeight = 260; // tamanho médio
      const imgMaxWidth = Math.min(pageWidth - marginX * 2, pageWidth * 0.65); // reduzir largura para manter proporção, mais compacta

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        // dispatch resize to force chart libraries to recalc sizes before capture
        try {
          window.dispatchEvent(new Event("resize"));
        } catch (e) {
          /* ignore */
        }
        // try capturing the element multiple times if capture looks incomplete
        let canvas: HTMLCanvasElement | null = null;
        for (let attempt = 0; attempt < 4; attempt++) {
          // eslint-disable-next-line no-await-in-loop
          canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            imageTimeout: 30000,
          });
          if (canvas && canvas.width > 50 && canvas.height > 50) break;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 250));
        }
        if (!canvas) continue;
        const imgData = canvas.toDataURL("image/png");

        // manter aspecto e limitar altura para "tamanho médio"
        const naturalW = canvas.width;
        const naturalH = canvas.height;
        const imgWidth = imgMaxWidth;
        const imgHeight = Math.min((naturalH * imgWidth) / naturalW, maxHeight);
        const centerX = (pageWidth - imgWidth) / 2;

        // quebra de página se necessário
        if (currentY + imgHeight > pageHeight - 40) {
          pdf.addPage();
          currentY = 40;
        }

        pdf.addImage(imgData, "PNG", centerX, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 24; // espaço entre gráficos
      }

      const fileSlug = nomeEstabDisplay.replace(/\s+/g, "-").toLowerCase();
      const file = `relatorio-${fileSlug}-${period}.pdf`;
      pdf.save(file);
    } finally {
      setExporting(false);
    }
  }, [estabelecimentos, period, selectedEstabelecimento]);

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
                  Relatórios
                </h2>
                <p className="text-gray-600 mt-1">
                  Gere gráficos financeiros e de pedidos.
                </p>
                <div className="mt-3 w-full">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="min-w-[320px] md:min-w-[420px] w-full md:mr-3">
                      <Select
                        value={selectedEstabelecimento}
                        onValueChange={setSelectedEstabelecimento}
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
                    <div className="min-w-[260px] md:min-w-[340px] w-full md:mr-3 mt-3 md:mt-0">
                      <Select value={period} onValueChange={setPeriod}>
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
                    <div className="mt-3 md:mt-0">
                      <Button
                      onClick={exportToPDF}
                      disabled={exporting || loading}
                      className="bg-green-600 hover:bg-green-700 text-white h-11 px-5"
                      title="Exportar gráficos para PDF"
                    >
                      Exportar Relatório
                    </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {estabelecimentos.length === 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-1" />
              <div>
                <p>
                  Antes de cadastrar, é necessário ter pelo menos um
                  Estabelecimento.{" "}
                  <a
                    href="/estabelecimentos"
                    className="underline text-yellow-900"
                  >
                    Abrir módulo Estabelecimentos
                  </a>
                </p>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 p-6">
          <div ref={chartsContainerRef} className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div
                ref={finCardRef}
                className="foodmax-card border border-gray-200 p-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-700 mt-2" />
                  <h3 className="text-lg font-semibold text-blue-700">
                    Relatório de Transações
                  </h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={finBarData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(v: any) =>
                          (Number(v) / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        }
                      />
                      <Legend />
                      <Bar dataKey="receitas" name="Receitas" fill="#16a34a" />
                      <Bar dataKey="despesas" name="Despesas" fill="#dc2626" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div
                ref={pedCardRef}
                className="foodmax-card border border-gray-200 p-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <PieIcon className="w-5 h-5 text-orange-700 mt-2" />
                  <h3 className="text-lg font-semibold text-orange-700">
                    Relatório de Pedidos
                  </h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        dataKey="value"
                        nameKey="name"
                        data={pedidosPieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        {pedidosPieData.map((entry, index) => {
                          const colors: Record<string, string> = {
                            Pendente: "#f59e0b",
                            Finalizado: "#16a34a",
                            Cancelado: "#dc2626",
                          };
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={colors[entry.name] || "#4b5563"}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </main>
          {exporting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-t-transparent border-gray-300 rounded-full animate-spin" />
                <div className="text-gray-700 font-medium">Gerando PDF — aguarde...</div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
