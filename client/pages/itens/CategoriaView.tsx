import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ItemCategoria } from "@shared/itens";
import { Info, X } from "lucide-react";

export default function CategoriaView({ isOpen, onClose, categoria }: { isOpen: boolean; onClose: () => void; categoria: ItemCategoria | null; }) {
  if (!categoria) return null;
  const DataField = ({ label, value }: { label: string; value: any }) => (
    <div>
      <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{value ?? "-"}</div>
    </div>
  );
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[70vw] max-w-2xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-1">Visualizar Categoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataField label="Nome" value={categoria.nome} />
              <DataField label="Status" value={<Badge className={categoria.ativo ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}>{categoria.ativo ? "Sim" : "Não"}</Badge>} />
              <div className="md:col-span-2">
                <DataField label="Descrição" value={categoria.descricao || "-"} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
