import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, X, Edit, FileText, Info } from "lucide-react";
import { Fornecedor, formatTelefone, formatEnderecoCidadeUF } from "@shared/fornecedores";

interface FornecedorViewProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (fornecedor: Fornecedor) => void;
  fornecedor: Fornecedor | null;
}

export function FornecedorView({ isOpen, onClose, onEdit, fornecedor }: FornecedorViewProps) {
  if (!fornecedor) return null;

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const DataField = ({ label, value, icon, fullWidth = false }: { label: string; value: string | React.ReactNode; icon?: React.ReactNode; fullWidth?: boolean; }) => (
    <div className={fullWidth ? "col-span-2" : ""}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-sm font-medium text-gray-600">{label}</span></div>
      <div className="text-sm text-gray-900">{value || "-"}</div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[85vw] h-[90vh] max-w-none overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-2">Visualizar Fornecedor</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foodmax-orange">{fornecedor.nome}</h2>
              {fornecedor.nome_responsavel && <p className="text-sm text-gray-600">Responsável: {fornecedor.nome_responsavel}</p>}
            </div>
            <div className="text-right">
              <Badge className={`${fornecedor.ativo ? "bg-green-500" : "bg-red-500"} text-white mb-2`}>{fornecedor.ativo ? "Ativo" : "Inativo"}</Badge>
              <p className="text-xs text-gray-500">Cadastrado em {formatDate(fornecedor.data_cadastro)}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-blue-600">Dados Básicos</h3></div>
            <div className="grid grid-cols-2 gap-4">
              <DataField label="Nome" value={fornecedor.nome} />
              {fornecedor.razao_social && <DataField label="Razão Social" value={fornecedor.razao_social} />}
              {fornecedor.cnpj && <DataField label="CNPJ" value={fornecedor.cnpj} />}
              <DataField label="Email" value={<a href={`mailto:${fornecedor.email}`} className="text-blue-600 hover:underline">{fornecedor.email}</a>} icon={<Mail className="w-4 h-4 text-gray-500" />} />
              {fornecedor.nome_responsavel && <DataField label="Responsável" value={fornecedor.nome_responsavel} />}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4"><Phone className="w-5 h-5 text-green-600" /><h3 className="font-semibold text-green-600">Contato</h3></div>
            <div className="grid grid-cols-2 gap-4">
              <DataField label="Telefone" value={<a href={`tel:${fornecedor.ddi}${fornecedor.telefone}`} className="text-blue-600 hover:underline">{formatTelefone(fornecedor.ddi, fornecedor.telefone)}</a>} />
            </div>
          </div>

          {fornecedor.endereco && (
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-purple-600" /><h3 className="font-semibold text-purple-600">Endereço</h3></div>
              <div className="grid grid-cols-2 gap-4">
                {fornecedor.endereco.cep && <DataField label="CEP" value={fornecedor.endereco.cep} />}
                {(fornecedor.endereco.cidade || fornecedor.endereco.uf) && (
                  <DataField label="Cidade/UF" value={formatEnderecoCidadeUF(fornecedor.endereco)} />
                )}
                {fornecedor.endereco.endereco && (
                  <DataField label="Endereço" value={fornecedor.endereco.endereco} fullWidth />
                )}
                <DataField label="País" value={fornecedor.endereco.pais} />
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4"><Info className="w-5 h-5 text-gray-600" /><h3 className="font-semibold text-gray-600">Detalhes do Cadastro</h3></div>
            <div className="grid grid-cols-2 gap-4">
              <DataField label="Data de Cadastro" value={formatDate(fornecedor.data_cadastro)} />
              <DataField label="Data de Atualização" value={formatDate(fornecedor.data_atualizacao)} />
              <DataField label="Status" value={<span className="text-black">{fornecedor.ativo ? "Ativo" : "Inativo"}</span>} />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none"><X className="w-4 h-4 mr-2" />Fechar</Button>
          {onEdit && (<Button onClick={() => onEdit(fornecedor)} variant="orange" className="flex-1 sm:flex-none"><Edit className="w-4 h-4 mr-2" />Editar</Button>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
