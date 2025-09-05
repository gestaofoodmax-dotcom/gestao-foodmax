import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building,
  Store,
  Phone,
  MapPin,
  Info,
  Edit,
  X,
  FileText,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  Estabelecimento,
  formatTelefone,
  formatEndereco,
} from "@shared/estabelecimentos";

interface EstabelecimentoViewProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (estabelecimento: Estabelecimento) => void;
  estabelecimento: Estabelecimento | null;
}

export function EstabelecimentoView({
  isOpen,
  onClose,
  onEdit,
  estabelecimento,
}: EstabelecimentoViewProps) {
  if (!estabelecimento) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      Restaurante: "bg-blue-500",
      Bar: "bg-purple-500",
      Lancheria: "bg-orange-500",
      Churrascaria: "bg-red-500",
      Petiscaria: "bg-yellow-500",
      Pizzaria: "bg-indigo-500",
      Outro: "bg-gray-500",
    };
    return colors[tipo] || "bg-gray-500";
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
            Visualizar Estabelecimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Store className="w-6 h-6 text-foodmax-orange" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foodmax-orange">
                  {estabelecimento.nome}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <Badge
                variant={estabelecimento.ativo ? "default" : "secondary"}
                className={`${estabelecimento.ativo ? "bg-green-500" : "bg-red-500"} text-white mb-2`}
              >
                {estabelecimento.ativo ? "Ativo" : "Inativo"}
              </Badge>
              <p className="text-xs text-gray-500">
                Cadastrado em {formatDate(estabelecimento.data_cadastro)}
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
              <DataField label="Nome" value={estabelecimento.nome} />

              {estabelecimento.razao_social && (
                <DataField
                  label="Razão Social"
                  value={estabelecimento.razao_social}
                />
              )}

              {estabelecimento.cnpj && (
                <DataField label="CNPJ" value={estabelecimento.cnpj} />
              )}

              <DataField
                label="Tipo de Estabelecimento"
                value={
                  <span className="text-black">
                    {estabelecimento.tipo_estabelecimento}
                  </span>
                }
              />
            </div>
          </div>

          {/* Contato */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Contato</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DataField
                label="Telefone"
                value={
                  <a
                    href={`tel:${estabelecimento.ddi}${estabelecimento.telefone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {formatTelefone(
                      estabelecimento.ddi,
                      estabelecimento.telefone,
                    )}
                  </a>
                }
              />
              <DataField
                label="Email"
                value={
                  <a
                    href={`mailto:${estabelecimento.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {estabelecimento.email}
                  </a>
                }
              />
            </div>
          </div>

          {/* Endereço */}
          {estabelecimento.endereco && (
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-600">Endereço</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {estabelecimento.endereco.cep && (
                  <DataField label="CEP" value={estabelecimento.endereco.cep} />
                )}

                {estabelecimento.endereco.endereco && (
                  <DataField
                    label="Endereço"
                    value={estabelecimento.endereco.endereco}
                  />
                )}

                {estabelecimento.endereco.cidade &&
                  estabelecimento.endereco.uf && (
                    <DataField
                      label="Cidade/UF"
                      value={formatEndereco(estabelecimento.endereco)}
                    />
                  )}

                <DataField label="País" value={estabelecimento.endereco.pais} />
              </div>
            </div>
          )}

          {/* Detalhes do Cadastro */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-600">
                Detalhes do Cadastro
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DataField
                label="Data de Cadastro"
                value={formatDate(estabelecimento.data_cadastro)}
              />

              <DataField
                label="Data de Atualização"
                value={formatDate(estabelecimento.data_atualizacao)}
              />

              <DataField
                label="Ativo"
                value={
                  <span className="text-black">
                    {estabelecimento.ativo ? "Sim" : "Não"}
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
              onClick={() => onEdit(estabelecimento)}
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
