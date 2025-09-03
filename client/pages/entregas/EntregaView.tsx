import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import { EntregaDetalhada, formatCurrencyBRL, formatDateTimeBR, getStatusEntregaColor, getTipoEntregaColor } from "@shared/entregas";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, X } from "lucide-react";

export default function EntregaView({ isOpen, onClose, entrega, onEdit }: { isOpen: boolean; onClose: () => void; entrega: any; onEdit: (e: any) => void; }) {
  const { makeRequest } = useAuthenticatedRequest();
  const [det, setDet] = useState<EntregaDetalhada | null>(null);

  useEffect(() => {
    if (!isOpen || !entrega?.id) return;
    (async () => {
      try {
        const d = await makeRequest(`/api/entregas/${entrega.id}`);
        setDet(d);
      } catch { setDet(null); }
    })();
  }, [isOpen, entrega?.id, makeRequest]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5" /> Detalhes da Entrega</DialogTitle>
        </DialogHeader>
        {det ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Estabelecimento</Label>
                <div className="text-sm">{det.estabelecimento_nome || det.estabelecimento_id}</div>
              </div>
              <div>
                <Label>Tipo</Label>
                <div className="text-sm"><Badge className={getTipoEntregaColor(det.tipo_entrega)}>{det.tipo_entrega}</Badge></div>
              </div>
              <div>
                <Label>Pedido</Label>
                <div className="text-sm">{det.pedido_codigo || det.codigo_pedido_app || "-"}</div>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <div className="text-sm">{det.forma_pagamento}</div>
              </div>
              <div>
                <Label>Valor Pedido</Label>
                <div className="text-sm">{formatCurrencyBRL(det.valor_pedido)}</div>
              </div>
              <div>
                <Label>Taxa Extra</Label>
                <div className="text-sm">{formatCurrencyBRL(det.taxa_extra)}</div>
              </div>
              <div>
                <Label>Valor Entrega</Label>
                <div className="text-sm">{formatCurrencyBRL(det.valor_entrega)}</div>
              </div>
              <div>
                <Label>Status</Label>
                <div className="text-sm"><Badge className={getStatusEntregaColor(det.status)}>{det.status}</Badge></div>
              </div>
              <div>
                <Label>Cliente</Label>
                <div className="text-sm">{det.cliente_nome || "Não Cliente"}</div>
              </div>
              <div>
                <Label>Telefone</Label>
                <div className="text-sm">{det.ddi} {det.telefone}</div>
              </div>
              <div>
                <Label>Data/Hora Saída</Label>
                <div className="text-sm">{formatDateTimeBR(det.data_hora_saida)}</div>
              </div>
              <div>
                <Label>Data/Hora Entregue</Label>
                <div className="text-sm">{formatDateTimeBR(det.data_hora_entregue)}</div>
              </div>
            </div>
            <div>
              <Label>Observação</Label>
              <div className="text-sm whitespace-pre-wrap">{det.observacao || "-"}</div>
            </div>
            <div>
              <Label>Endereço de Entrega</Label>
              <div className="text-sm">
                {det.endereco ? (
                  <span>
                    {[det.endereco.cep, det.endereco.endereco, [det.endereco.cidade, det.endereco.uf].filter(Boolean).join("/"), det.endereco.pais].filter((x) => typeof x === "string" && x.trim() !== "").join(" - ")}
                  </span>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Carregando...</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="w-4 h-4 mr-2" /> Fechar</Button>
          {det && (
            <Button onClick={() => onEdit(det)} className="bg-foodmax-orange hover:bg-orange-600"><Edit className="w-4 h-4 mr-2" /> Editar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
