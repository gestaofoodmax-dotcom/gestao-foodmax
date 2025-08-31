import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Cardapio, 
  CardapioDetalhado, 
  formatCurrencyBRL, 
  formatPercentage,
  getTipoCardapioColor 
} from "@shared/cardapios";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import { 
  Info, 
  Edit, 
  X, 
  ChefHat, 
  ShoppingBag, 
  DollarSign, 
  Percent,
  Calendar,
  FileText,
  Package
} from "lucide-react";

export default function CardapioView({
  isOpen,
  onClose,
  cardapio,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  cardapio: Cardapio | null;
  onEdit?: (c: Cardapio) => void;
}) {
  const { makeRequest } = useAuthenticatedRequest();
  const [cardapioDetalhado, setCardapioDetalhado] = useState<CardapioDetalhado | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && cardapio) {
      loadCardapioDetalhado();
    }
  }, [isOpen, cardapio]);

  const loadCardapioDetalhado = async () => {
    if (!cardapio) return;
    
    setLoading(true);
    try {
      const response = await makeRequest(`/api/cardapios/${cardapio.id}`);
      if (response) {
        setCardapioDetalhado(response);
      }
    } catch (error) {
      console.error("Error loading cardapio details:", error);
      // Fallback to basic cardapio data
      setCardapioDetalhado({ ...cardapio, itens: [] });
    } finally {
      setLoading(false);
    }
  };

  if (!cardapio) return null;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const DataField = ({ 
    icon: Icon, 
    label, 
    value, 
    className = "" 
  }: { 
    icon?: any;
    label: string; 
    value: any;
    className?: string;
  }) => (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-500" />}
        <div className="text-sm font-medium text-gray-600">{label}</div>
      </div>
      <div className="text-sm text-gray-900 ml-6">{value ?? "-"}</div>
    </div>
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ChefHat className="w-6 h-6 text-foodmax-orange" />
            <span>{cardapio.nome}</span>
            <Badge className={getTipoCardapioColor(cardapio.tipo_cardapio)}>
              {cardapio.tipo_cardapio}
            </Badge>
            <Badge
              className={
                cardapio.ativo
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }
            >
              {cardapio.ativo ? "Ativo" : "Inativo"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-gray-600" />
              Informações Básicas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DataField 
                icon={ChefHat}
                label="Nome" 
                value={cardapio.nome} 
              />
              <DataField 
                icon={Package}
                label="Tipo de Cardápio" 
                value={cardapio.tipo_cardapio} 
              />
              <DataField 
                icon={ShoppingBag}
                label="Quantidade Total" 
                value={cardapio.quantidade_total} 
              />
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Informações Financeiras
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DataField 
                icon={DollarSign}
                label="Preço dos Itens" 
                value={formatCurrencyBRL(cardapio.preco_itens_centavos)} 
              />
              <DataField 
                icon={Percent}
                label="Margem de Lucro" 
                value={formatPercentage(cardapio.margem_lucro_percentual)} 
              />
              <DataField 
                icon={DollarSign}
                label="Preço Total" 
                value={formatCurrencyBRL(cardapio.preco_total_centavos)}
                className="text-lg font-semibold"
              />
            </div>
          </div>

          {/* Description */}
          {cardapio.descricao && (
            <div className="bg-gray-50 rounded-lg p-4">
              <DataField 
                icon={FileText}
                label="Descrição" 
                value={cardapio.descricao} 
              />
            </div>
          )}

          {/* Items List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foodmax-orange"></div>
              <p className="mt-2 text-gray-600">Carregando itens...</p>
            </div>
          ) : cardapioDetalhado?.itens && cardapioDetalhado.itens.length > 0 ? (
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                Itens do Cardápio ({cardapioDetalhado.itens.length})
              </h3>
              
              <div className="space-y-3">
                {cardapioDetalhado.itens.map((item) => {
                  const total = item.quantidade * item.valor_unitario_centavos;
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.item_nome}</div>
                        <div className="text-sm text-gray-600">
                          Categoria: {item.categoria_nome}
                        </div>
                        <div className="text-sm text-gray-600">
                          Estoque Atual: {item.item_estoque_atual ?? "N/A"}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{item.quantidade}</div>
                          <div className="text-gray-500">Qtde</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium">
                            {formatCurrencyBRL(item.valor_unitario_centavos)}
                          </div>
                          <div className="text-gray-500">Unit.</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium text-green-600">
                            {formatCurrencyBRL(total)}
                          </div>
                          <div className="text-gray-500">Total</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Items Summary */}
              <div className="mt-4 pt-4 border-t bg-white rounded p-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-800">
                      {cardapioDetalhado.itens.reduce((sum, item) => sum + item.quantidade, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total de Itens</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrencyBRL(cardapio.preco_itens_centavos)}
                    </div>
                    <div className="text-sm text-gray-600">Custo dos Itens</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrencyBRL(cardapio.preco_total_centavos)}
                    </div>
                    <div className="text-sm text-gray-600">Preço Final</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center">
              <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum item encontrado neste cardápio</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Datas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataField 
                icon={Calendar}
                label="Data de Cadastro" 
                value={formatDate(cardapio.data_cadastro)} 
              />
              <DataField 
                icon={Calendar}
                label="Última Atualização" 
                value={formatDate(cardapio.data_atualizacao)} 
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
          {onEdit && (
            <Button 
              type="button" 
              onClick={() => onEdit(cardapio)}
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
