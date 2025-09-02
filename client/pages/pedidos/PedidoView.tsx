import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyBRL, getStatusPedidoColor } from "@shared/pedidos";
import { Pedido } from "@shared/pedidos";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Info,
  Utensils,
  CupSoda,
  FileText,
  Calendar,
  X,
  Edit,
  ShoppingBag,
} from "lucide-react";

export default function PedidoView({
  isOpen,
  onClose,
  onEdit,
  pedido,
}: {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (p: Pedido) => void;
  pedido: Pedido | null;
}) {
  const { makeRequest } = useAuthenticatedRequest();
  const [detalhe, setDetalhe] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!pedido) return;

      // Clear all relevant caches for fresh data
      try {
        localStorage.removeItem("fm_pedidos");
        localStorage.removeItem("fm_pedidos_cache");
        localStorage.removeItem("fm_grid_cache");
        // Clear any component-level cache
        setDetalhe(null);
      } catch {}

      setLoading(true);

      try {
        // Use Promise with timeout for faster loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 5000),
        );

        const dataPromise = makeRequest(
          `/api/pedidos/${pedido.id}?_t=${Date.now()}`,
        );

        const data = await Promise.race([dataPromise, timeoutPromise]);
        setDetalhe(data);
      } catch (error) {
        // Fallback to basic pedido data if API fails or times out
        console.log("Using fallback data for pedido view:", error);
        setDetalhe({
          ...pedido,
          cardapios: [],
          itens_extras: [],
        });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && pedido) {
      load();
    }
  }, [isOpen, pedido, makeRequest]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDetalhe(null);
      setLoading(false);
    }
  }, [isOpen]);

  const DataField = ({ label, value }: { label: string; value: any }) => (
    <div className="space-y-1">
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="text-sm text-gray-900">{value ?? "-"}</div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[85vw] h-[90vh] max-w-none overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-2">
            Visualizar Pedido
          </DialogTitle>
        </DialogHeader>

        {loading && !detalhe && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="h-8 bg-gray-200 w-48 rounded animate-pulse" />
              <div className="h-6 bg-gray-200 w-32 rounded animate-pulse" />
            </div>
            <div className="h-32 bg-gray-100 rounded animate-pulse" />

            <div className="border rounded-lg p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foodmax-orange"></div>
              <p className="mt-2 text-gray-600">Carregando cardápios...</p>
            </div>
            <div className="border rounded-lg p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foodmax-orange"></div>
              <p className="mt-2 text-gray-600">Carregando itens extras...</p>
            </div>
          </div>
        )}

        {detalhe && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-foodmax-orange" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foodmax-orange">
                    {detalhe.codigo}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <Badge className={getStatusPedidoColor(detalhe.status)}>
                  {detalhe.status}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  Cadastrado em{" "}
                  {new Date(detalhe.data_cadastro).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    hour12: false,
                  })}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-blue-600">Dados Básicos</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DataField
                  label="Estabelecimento"
                  value={
                    detalhe.estabelecimento_nome || detalhe.estabelecimento_id
                  }
                />
                <DataField label="Tipo de Pedido" value={detalhe.tipo_pedido} />
                <DataField label="Código do Pedido" value={detalhe.codigo} />
                <DataField
                  label="Cliente"
                  value={detalhe.cliente_nome || "Não Cliente"}
                />
              </div>
            </div>

            {detalhe?.cardapios && detalhe.cardapios.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-purple-600" />
                  <span className="text-purple-600">Cardápios</span>
                </h3>
                <div className="space-y-2">
                  {detalhe.cardapios.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {c.cardapio_nome || c.cardapio_id}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium">1</div>
                          <div className="text-gray-500">Qtde</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">
                            {formatCurrencyBRL(c.preco_total)}
                          </div>
                          <div className="text-gray-500">Unit.</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">
                            {formatCurrencyBRL(c.preco_total)}
                          </div>
                          <div className="text-gray-500">Total</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detalhe?.itens_extras && detalhe.itens_extras.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <CupSoda className="w-5 h-5 text-yellow-700" />
                  <span className="text-yellow-700">Itens Extras</span>
                </h3>
                <div className="space-y-2">
                  {detalhe.itens_extras.map((e: any) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {e.item_nome || e.item_id}
                        </div>
                        <div className="text-xs text-gray-500">
                          {e.categoria_nome || "-"}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{e.quantidade}</div>
                          <div className="text-gray-500">Qtde</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">
                            {formatCurrencyBRL(e.valor_unitario)}
                          </div>
                          <div className="text-gray-500">Unit.</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">
                            {formatCurrencyBRL(e.valor_unitario * e.quantidade)}
                          </div>
                          <div className="text-gray-500">Total</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detalhe?.observacao && (
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  <span className="text-red-600">Observação</span>
                </h3>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">
                  {detalhe.observacao}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg p-4 border">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Detalhes do Cadastro</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DataField
                  label="Data de Cadastro"
                  value={new Date(detalhe.data_cadastro).toLocaleString(
                    "pt-BR",
                    { timeZone: "America/Sao_Paulo", hour12: false },
                  )}
                />
                <DataField
                  label="Última Atualização"
                  value={new Date(detalhe.data_atualizacao).toLocaleString(
                    "pt-BR",
                    { timeZone: "America/Sao_Paulo", hour12: false },
                  )}
                />
                <DataField
                  label="Data/Hora Finalizado"
                  value={
                    detalhe.data_hora_finalizado
                      ? new Date(detalhe.data_hora_finalizado).toLocaleString(
                          "pt-BR",
                          { timeZone: "America/Sao_Paulo", hour12: false },
                        )
                      : "-"
                  }
                />
                <DataField label="Status" value={detalhe.status} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
          {pedido && (
            <Button
              type="button"
              onClick={() => onEdit(pedido)}
              className="bg-foodmax-orange hover:bg-orange-600"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
