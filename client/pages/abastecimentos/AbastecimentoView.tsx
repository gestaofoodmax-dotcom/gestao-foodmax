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
import { getStatusAbastecimentoColor } from "@shared/abastecimentos";
import { Abastecimento } from "@shared/abastecimentos";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Info,
  Building,
  Truck,
  CupSoda,
  Phone,
  MapPin,
  FileText,
  Calendar,
  X,
  Edit,
  ShoppingBag,
  Users,
} from "lucide-react";

export default function AbastecimentoView({
  isOpen,
  onClose,
  onEdit,
  abastecimento,
}: {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (a: Abastecimento) => void;
  abastecimento: Abastecimento | null;
}) {
  const { makeRequest } = useAuthenticatedRequest();
  const [detalhe, setDetalhe] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!abastecimento) return;

      // Clear all relevant caches for fresh data
      try {
        localStorage.removeItem("fm_abastecimentos");
        localStorage.removeItem("fm_abastecimentos_cache");
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
          `/api/abastecimentos/${abastecimento.id}?_t=${Date.now()}`,
        );

        const data = await Promise.race([dataPromise, timeoutPromise]);
        setDetalhe(data);
      } catch (error) {
        // Fallback to basic abastecimento data if API fails or times out
        console.log("Using fallback data for abastecimento view:", error);
        setDetalhe({
          ...abastecimento,
          itens: [],
          endereco: null,
          fornecedores_nomes: [],
        });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && abastecimento) {
      load();
    }
  }, [isOpen, abastecimento, makeRequest]);

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

  const formatDateTimeBR = (value: string | null | undefined) => {
    if (!value) return "-";
    try {
      const d = new Date(value);
      const date = d.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });
      const time = d.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return `${date}, ${time}`;
    } catch {
      return "-";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[85vw] h-[90vh] max-w-none overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-2">
            Visualizar Abastecimento
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
              <p className="mt-2 text-gray-600">Carregando fornecedores...</p>
            </div>
            <div className="border rounded-lg p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foodmax-orange"></div>
              <p className="mt-2 text-gray-600">Carregando itens...</p>
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
                    Abastecimento #{detalhe.id}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <Badge className={getStatusAbastecimentoColor(detalhe.status)}>
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

            {/* Dados Básicos */}
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
                <DataField
                  label="Fornecedores"
                  value={
                    detalhe?.fornecedores_nomes &&
                    detalhe.fornecedores_nomes.length > 0
                      ? detalhe.fornecedores_nomes.join(", ")
                      : "-"
                  }
                />
              </div>
            </div>

            {/* Itens do Abastecimento */}
            {detalhe?.itens && detalhe.itens.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <CupSoda className="w-5 h-5 text-yellow-600" />
                  <span className="text-yellow-600">
                    Itens do Abastecimento
                  </span>
                </h3>
                <div className="space-y-2">
                  {detalhe.itens.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {item.item_nome || item.item_id}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.categoria_nome || "Categoria não informada"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Estoque Atual: {item.estoque_atual ?? 0}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{item.quantidade}</div>
                          <div className="text-gray-500">Qtde</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <hr className="border-t border-gray-300 mt-4 mb-4" />
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Quantidade Total: </span>
                  <span className="font-semibold">
                    {detalhe.itens.reduce(
                      (total: number, item: any) =>
                        total + (item.quantidade || 0),
                      0,
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Contato */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                <span className="text-green-600">Contato</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DataField
                  label="Telefone"
                  value={`${detalhe.ddi || ""} ${detalhe.telefone || ""}`}
                />
                <DataField label="Email" value={detalhe.email || "-"} />
                <DataField
                  label="Email Enviado"
                  value={detalhe.email_enviado ? "Sim" : "Não"}
                />
              </div>
            </div>

            {/* Endereço */}
            {detalhe?.endereco && (
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <span className="text-purple-600">Endereço</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DataField label="CEP" value={detalhe.endereco.cep || "-"} />
                  <DataField
                    label="Endereço"
                    value={detalhe.endereco.endereco || "-"}
                  />
                  <DataField
                    label="Cidade"
                    value={detalhe.endereco.cidade || "-"}
                  />
                  <DataField label="UF" value={detalhe.endereco.uf || "-"} />
                  <DataField
                    label="País"
                    value={detalhe.endereco.pais || "-"}
                  />
                </div>
              </div>
            )}

            {/* Observação */}
            {detalhe?.observacao &&
              detalhe.observacao.trim() !== "Cadastro forçado pelo sistema" &&
              detalhe.observacao.trim() !== "" && (
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

            {/* Detalhes do Cadastro */}
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
                  label="Data/Hora Recebido"
                  value={formatDateTimeBR(detalhe.data_hora_recebido)}
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
          {abastecimento && (
            <Button
              type="button"
              onClick={() => onEdit(abastecimento)}
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
