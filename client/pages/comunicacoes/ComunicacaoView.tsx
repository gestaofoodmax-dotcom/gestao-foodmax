import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeColor } from "@shared/comunicacoes";
import { FileText, Info, Mail, UserCheck, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ComunicacaoView({
  isOpen,
  onClose,
  comunicacao,
}: {
  isOpen: boolean;
  onClose: () => void;
  comunicacao: any | null;
}) {
  if (!comunicacao) return null;

  const DataField = ({ label, value }: { label: string; value: any }) => (
    <div className="space-y-1">
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="text-sm text-gray-900">{value ?? "-"}</div>
    </div>
  );

  const destinatariosResumo = () => {
    const t = comunicacao.destinatarios_tipo as string;
    if (comunicacao.tipo_comunicacao === "Promoção") {
      if (t === "TodosClientes") return "Todos os clientes";
      if (t === "ClientesEspecificos")
        return `Clientes específicos (${(comunicacao.clientes_ids || []).length})`;
    } else if (comunicacao.tipo_comunicacao === "Fornecedor") {
      if (t === "TodosFornecedores") return "Todos os fornecedores";
      if (t === "FornecedoresEspecificos")
        return `Fornecedores específicos (${(comunicacao.fornecedores_ids || []).length})`;
    }
    const txt = (comunicacao.destinatarios_text || "").trim();
    return txt ? txt : "-";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[85vw] h-[90vh] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-2">
            Visualizar Comunicação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-foodmax-orange" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foodmax-orange">
                  {comunicacao.assunto || `Comunicação #${comunicacao.id}`}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <Badge className={getStatusBadgeColor(comunicacao.status)}>
                {comunicacao.status}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">
                Cadastrado em {new Date(comunicacao.data_cadastro).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false })}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600">Dados Básicos</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataField label="Estabelecimento" value={comunicacao.estabelecimento_id} />
              <DataField label="Tipo de Comunicação" value={comunicacao.tipo_comunicacao} />
              <DataField label="Destinatários" value={destinatariosResumo()} />
              <DataField label="Email Enviado" value={comunicacao.email_enviado ? "Sim" : "Não"} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              <span className="text-green-600">Email</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataField label="Assunto" value={comunicacao.assunto} />
            </div>
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-600 mb-1">Mensagem</div>
              <div className="p-3 bg-gray-50 rounded border whitespace-pre-wrap text-sm">
                {comunicacao.mensagem || "-"}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Detalhes do Cadastro</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataField
                label="Data de Cadastro"
                value={new Date(comunicacao.data_cadastro).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  hour12: false,
                })}
              />
              <DataField
                label="Data de Envio"
                value={comunicacao.data_envio ? new Date(comunicacao.data_envio).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false }) : "-"}
              />
              <DataField label="Status" value={comunicacao.status} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
