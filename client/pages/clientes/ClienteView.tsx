import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cliente } from "@shared/clientes";
import { formatEndereco, formatTelefone } from "@shared/clientes";
import {
  Phone,
  MapPin,
  Info,
  Edit,
  X,
  User,
  Calendar,
} from "lucide-react";

interface ClienteViewProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (cliente: Cliente) => void;
  cliente: Cliente | null;
  estabelecimentoNome?: string | null;
}

export function ClienteView({
  isOpen,
  onClose,
  onEdit,
  cliente,
  estabelecimentoNome,
}: ClienteViewProps) {
  if (!cliente) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const DataField = ({
    label,
    value,
    icon,
    fullWidth = false,
  }: {
    label: string;
    value: string | React.ReactNode;
    icon?: React.ReactNode;
    fullWidth?: boolean;
  }) => (
    <div className={fullWidth ? "col-span-2" : ""}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-sm text-gray-900">{value || "-"}</div>
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
            Visualizar Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-foodmax-orange" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foodmax-orange">
                  {cliente.nome}
                </h2>
              </div>
            </div>
            <div className="text-right">
              <Badge
                className={`${cliente.ativo ? "bg-green-500" : "bg-red-500"} text-white mb-2`}
              >
                {cliente.ativo ? "Ativo" : "Inativo"}
              </Badge>
              <p className="text-xs text-gray-500">
                Cadastrado em {formatDate(cliente.data_cadastro)}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DataField label="Nome" value={cliente.nome} />
              {cliente.genero && (
                <DataField label="Gênero" value={cliente.genero} />
              )}
              {cliente.profissao && (
                <DataField label="Profissão" value={cliente.profissao} />
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Contato</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DataField
                label="Email"
                value={
                  cliente.email ? (
                    <a
                      href={`mailto:${cliente.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {cliente.email}
                    </a>
                  ) : null
                }
              />
              <DataField
                label="Telefone"
                value={
                  <a
                    href={`tel:${cliente.ddi}${cliente.telefone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {formatTelefone(cliente.ddi, cliente.telefone)}
                  </a>
                }
              />
            </div>
          </div>

          {cliente.endereco && (
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-600">Endereço</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {cliente.endereco.cep && (
                  <DataField label="CEP" value={cliente.endereco.cep} />
                )}
                {cliente.endereco.endereco && (
                  <DataField label="Endereço" value={cliente.endereco.endereco} />
                )}
                {(cliente.endereco.cidade || cliente.endereco.uf) && (
                  <DataField
                    label="Cidade/UF"
                    value={formatEndereco(cliente.endereco)}
                  />
                )}
                <DataField label="País" value={cliente.endereco.pais} />
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-600">
                Detalhes do Cadastro
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DataField
                label="Data de Cadastro"
                value={formatDate(cliente.data_cadastro)}
              />
              <DataField
                label="Data de Atualização"
                value={formatDate(cliente.data_atualizacao)}
              />
              <DataField
                label="Ativo"
                value={<span className="text-black">{cliente.ativo ? "Sim" : "Não"}</span>}
              />
              <DataField
                label="Aceita Promoções"
                value={
                  <span className="text-black">
                    {cliente.aceita_promocao_email ? "Sim" : "Não"}
                  </span>
                }
              />
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
              onClick={() => onEdit(cliente)}
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
