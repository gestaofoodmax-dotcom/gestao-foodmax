import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrencyBRL } from "@shared/pedidos";
import { Pedido } from "@shared/pedidos";
import { useAuthenticatedRequest } from "@/hooks/use-auth";

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

  useEffect(() => {
    const load = async () => {
      if (!pedido) return;
      try {
        const data = await makeRequest(`/api/pedidos/${pedido.id}`);
        setDetalhe(data);
      } catch {
        setDetalhe(pedido);
      }
    };
    if (isOpen) load();
  }, [isOpen, pedido, makeRequest]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visualizar Pedido</DialogTitle>
        </DialogHeader>

        {detalhe && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded border">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium">Estabelecimento:</span>{" "}
                  {detalhe.estabelecimento_nome || detalhe.estabelecimento_id}
                </div>
                <div>
                  <span className="font-medium">Código:</span> {detalhe.codigo}
                </div>
                <div>
                  <span className="font-medium">Tipo:</span>{" "}
                  {detalhe.tipo_pedido}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {detalhe.status}
                </div>
                <div>
                  <span className="font-medium">Cliente:</span>{" "}
                  {detalhe.cliente_nome || "Não Cliente"}
                </div>
                <div>
                  <span className="font-medium">Valor Total:</span>{" "}
                  {formatCurrencyBRL(detalhe.valor_total_centavos)}
                </div>
                <div>
                  <span className="font-medium">Finalizado em:</span>{" "}
                  {detalhe.data_hora_finalizado
                    ? new Date(detalhe.data_hora_finalizado).toLocaleString(
                        "pt-BR",
                      )
                    : "-"}
                </div>
                <div>
                  <span className="font-medium">Data Cadastro:</span>{" "}
                  {new Date(detalhe.data_cadastro).toLocaleString("pt-BR")}
                </div>
              </div>
            </div>

            {detalhe?.cardapios && detalhe.cardapios.length > 0 && (
              <div className="bg-white p-4 rounded border">
                <h3 className="font-semibold mb-2">Cardápios</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {detalhe.cardapios.map((c: any) => (
                    <li key={c.id}>
                      {c.cardapio_nome || c.cardapio_id} -{" "}
                      {formatCurrencyBRL(c.preco_total_centavos)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detalhe?.itens_extras && detalhe.itens_extras.length > 0 && (
              <div className="bg-white p-4 rounded border">
                <h3 className="font-semibold mb-2">Itens Extra</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {detalhe.itens_extras.map((e: any) => (
                    <li key={e.id}>
                      {e.item_nome || e.item_id} (Qtd: {e.quantidade}) -{" "}
                      {formatCurrencyBRL(
                        e.valor_unitario_centavos * e.quantidade,
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detalhe?.observacao && (
              <div className="bg-white p-4 rounded border">
                <h3 className="font-semibold mb-2">Observação</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {detalhe.observacao}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
