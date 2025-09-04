import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  EntregaDetalhada,
  formatCurrencyBRL,
  formatDateTimeBR,
  getStatusEntregaColor,
  getTipoEntregaColor,
} from "@shared/entregas";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Edit,
  X,
  Truck,
  FileText,
  Wallet,
  Users,
  Phone,
  MapPin,
  Calendar,
  Info,
} from "lucide-react";

export default function EntregaView({
  isOpen,
  onClose,
  entrega,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  entrega: any;
  onEdit: (e: any) => void;
}) {
  const { makeRequest } = useAuthenticatedRequest();
  const [det, setDet] = useState<EntregaDetalhada | null>(null);

  useEffect(() => {
    if (!isOpen || !entrega?.id) return;
    (async () => {
      try {
        const d = await makeRequest(`/api/entregas/${entrega.id}`);
        setDet(d);
      } catch {
        setDet(null);
      }
    })();
  }, [isOpen, entrega?.id, makeRequest]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" /> Detalhes da Entrega
          </DialogTitle>
        </DialogHeader>
        {det ? (
          <div className="space-y-6">
            {/* Header with status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-6 h-6 text-foodmax-orange" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foodmax-orange">
                    {det.pedido_codigo ||
                      det.codigo_pedido_app ||
                      `Entrega #${det.id}`}
                  </h2>
                </div>
              </div>
              <div className="text-right">
                <Badge className={getStatusEntregaColor(det.status)}>
                  {det.status}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  Cadastrado em{" "}
                  {new Date(det.data_cadastro).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    hour12: false,
                  })}
                </p>
              </div>
            </div>

            {/* Dados Básicos */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-blue-600">Dados Básicos</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Estabelecimento</Label>
                  <div className="text-sm">
                    {det.estabelecimento_nome || det.estabelecimento_id}
                  </div>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <div className="text-sm">
                    <Badge className={getTipoEntregaColor(det.tipo_entrega)}>
                      {det.tipo_entrega}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Pedido</Label>
                  <div className="text-sm">
                    {det.pedido_codigo || det.codigo_pedido_app || "-"}
                  </div>
                </div>
                <div>
                  <Label>Forma de Pagamento</Label>
                  <div className="text-sm">{det.forma_pagamento}</div>
                </div>
              </div>
            </div>

            {/* Valores */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-600">Valores</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Valor Pedido</Label>
                  <div className="text-sm">
                    {formatCurrencyBRL(det.valor_pedido)}
                  </div>
                </div>
                <div>
                  <Label>Taxa Extra</Label>
                  <div className="text-sm">
                    {formatCurrencyBRL(det.taxa_extra)}
                  </div>
                </div>
                <div>
                  <Label>Valor Entrega</Label>
                  <div className="text-sm">
                    {formatCurrencyBRL(det.valor_entrega)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cliente e Contato */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                <span className="text-green-600">Cliente e Contato</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <div className="text-sm">
                    {det.cliente_nome || "Não Cliente"}
                  </div>
                </div>
                <div>
                  <Label>Telefone</Label>
                  <div className="text-sm">
                    {det.ddi} {det.telefone}
                  </div>
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <span className="text-purple-600">Endereço de Entrega</span>
              </h3>
              <div className="text-sm">
                {det.endereco ? (
                  <span>
                    {[
                      det.endereco.cep,
                      det.endereco.endereco,
                      [det.endereco.cidade, det.endereco.uf]
                        .filter(Boolean)
                        .join("/"),
                      det.endereco.pais,
                    ]
                      .filter((x) => typeof x === "string" && x.trim() !== "")
                      .join(" - ")}
                  </span>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>

            {/* Datas */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span className="text-indigo-600">Datas</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data/Hora Saída</Label>
                  <div className="text-sm">
                    {formatDateTimeBR(det.data_hora_saida)}
                  </div>
                </div>
                <div>
                  <Label>Data/Hora Entregue</Label>
                  <div className="text-sm">
                    {formatDateTimeBR(det.data_hora_entregue)}
                  </div>
                </div>
              </div>
            </div>

            {/* Observação */}
            {det.observacao && det.observacao.trim() !== "" && (
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  <span className="text-red-600">Observação</span>
                </h3>
                <div className="text-sm whitespace-pre-wrap">
                  {det.observacao}
                </div>
              </div>
            )}

            {/* Detalhes do Cadastro */}
            <div className="bg-white rounded-lg p-4 border">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Detalhes do Cadastro</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data de Cadastro</Label>
                  <div className="text-sm">
                    {new Date(det.data_cadastro).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      hour12: false,
                    })}
                  </div>
                </div>
                <div>
                  <Label>Última Atualização</Label>
                  <div className="text-sm">
                    {new Date(det.data_atualizacao).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      hour12: false,
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Carregando...</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" /> Fechar
          </Button>
          {det && (
            <Button
              onClick={() => onEdit(det)}
              className="bg-foodmax-orange hover:bg-orange-600"
            >
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
