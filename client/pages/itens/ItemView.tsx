import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Item, formatCurrencyBRL } from "@shared/itens";
import { Info, Edit, X, List, FileText } from "lucide-react";

export default function ItemView({
  isOpen,
  onClose,
  item,
  onEdit,
  categoriaNome,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onEdit?: (i: Item) => void;
  categoriaNome: string | null;
}) {
  if (!item) return null;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const DataField = ({ label, value }: { label: string; value: any }) => (
    <div>
      <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{value ?? "-"}</div>
    </div>
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="w-[85vw] h-[90vh] max-w-none overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-2">
            Visualizar Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <List className="w-6 h-6 text-foodmax-orange" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foodmax-orange">
                  {item.nome}
                </h2>
              </div>
            </div>
            <div className="text-right">
              <Badge
                className={`${item.ativo ? "bg-green-500" : "bg-red-500"} text-white mb-2`}
              >
                {item.ativo ? "Ativo" : "Inativo"}
              </Badge>
              <p className="text-xs text-gray-500">
                Cadastrado em {formatDate(item.data_cadastro)}
              </p>
            </div>
          </div>

          {/* Dados Básicos */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DataField label="Categoria" value={categoriaNome} />
              <DataField
                label="Preço"
                value={formatCurrencyBRL(item.preco_centavos)}
              />
              <DataField
                label="Custo Pago"
                value={formatCurrencyBRL(item.custo_pago_centavos)}
              />
              <DataField label="Unidade" value={item.unidade_medida} />
              <DataField label="Peso (g)" value={item.peso_gramas} />
              <DataField
                label="Estoque Atual"
                value={
                  <Badge
                    className={`${(item.estoque_atual ?? 0) <= 0 ? "bg-red-50 text-red-700 border border-red-200" : (item.estoque_atual ?? 0) <= 5 ? "bg-yellow-50 text-yellow-700 border border-yellow-200" : "bg-green-50 text-green-700 border border-green-200"}`}
                  >
                    {item.estoque_atual ?? 0}
                  </Badge>
                }
              />
              <DataField label="Ativo" value={item.ativo ? "Sim" : "Não"} />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-none"
          >
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
          {onEdit && (
            <Button
              onClick={() => onEdit(item)}
              variant="orange"
              className="flex-1 sm:flex-none"
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
