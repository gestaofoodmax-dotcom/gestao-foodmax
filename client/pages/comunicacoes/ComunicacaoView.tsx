import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeColor } from "@shared/comunicacoes";

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[85vw] h-[90vh] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal">Visualizar Comunicação</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Assunto</div>
              <div className="font-medium">{comunicacao.assunto}</div>
            </div>
            <div>
              <div className="text-gray-500">Status</div>
              <Badge className={getStatusBadgeColor(comunicacao.status)}>{comunicacao.status}</Badge>
            </div>
            <div>
              <div className="text-gray-500">Tipo</div>
              <div className="font-medium">{comunicacao.tipo_comunicacao}</div>
            </div>
            <div>
              <div className="text-gray-500">Email Enviado</div>
              <div className="font-medium">{comunicacao.email_enviado ? 'Sim' : 'Não'}</div>
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-sm mb-1">Mensagem</div>
            <div className="p-3 bg-gray-50 rounded border whitespace-pre-line text-sm">
              {comunicacao.mensagem}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
