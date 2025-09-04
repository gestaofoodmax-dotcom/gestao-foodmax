import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinanceiroTransacao } from "@shared/financeiro";
import { formatCurrencyBRL } from "@shared/itens";
import { Info, Edit, X, FileText, DollarSign, Calendar } from "lucide-react";

export default function FinanceiroView({
  isOpen,
  onClose,
  item,
  onEdit,
  estabelecimentoNome,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: FinanceiroTransacao | null;
  onEdit?: (t: FinanceiroTransacao) => void;
  estabelecimentoNome: string | null;
}) {
  if (!item) return null;

  const formatDateTime = (dateString: string | null) =>
    dateString
      ? new Date(dateString).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "-";

  const DataField = ({ label, value }: { label: string; value: any }) => (
    <div>
      <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{value ?? "-"}</div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[85vw] h-[90vh] max-w-none overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-1">Visualizar Transação</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-foodmax-orange" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foodmax-orange">{item.categoria}</h2>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`${item.ativo ? "bg-green-500" : "bg-red-500"} text-white mb-2`}>
                {item.ativo ? "Ativo" : "Inativo"}
              </Badge>
              <p className="text-xs text-gray-500">Cadastrado em {formatDateTime(item.data_cadastro)}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataField label="Estabelecimento" value={estabelecimentoNome} />
              <DataField label="Tipo" value={item.tipo} />
              <DataField label="Categoria" value={item.categoria} />
              <DataField label="Valor" value={formatCurrencyBRL(item.valor)} />
              <DataField label="Data da Transação" value={formatDateTime(item.data_transacao)} />
              <div className="md:col-span-2">
                <DataField label="Descrição" value={item.descricao || "-"} />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-600">Detalhes do Cadastro</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataField label="Data de Cadastro" value={formatDateTime(item.data_cadastro)} />
              <DataField label="Data de Atualização" value={formatDateTime(item.data_atualizacao)} />
              <DataField label="Ativo" value={item.ativo ? "Sim" : "Não"} />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
          {onEdit && (
            <Button onClick={() => onEdit(item)} variant="orange" className="flex-1 sm:flex-none">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
