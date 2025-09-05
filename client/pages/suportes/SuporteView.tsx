import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Info,
  X,
  Send,
  LifeBuoy,
  FileText,
  Ticket,
  Edit,
} from "lucide-react";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import {
  Suporte,
  STATUS_BADGE_STYLES,
  PRIORIDADE_BADGE_STYLES,
  SuporteStatus,
} from "@shared/suportes";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SuporteViewProps {
  isOpen: boolean;
  onClose: () => void;
  suporte: Suporte | null;
  onReplied?: (updated: Suporte) => void;
  onEdit?: (s: Suporte) => void;
}

export function SuporteView({
  isOpen,
  onClose,
  suporte,
  onReplied,
  onEdit,
}: SuporteViewProps) {
  const { getUserRole } = useAuth();
  const isAdmin = getUserRole() === "admin";
  const { makeRequest } = useAuthenticatedRequest();
  const [resposta, setResposta] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<SuporteStatus>(
    (suporte?.status as SuporteStatus) || "Aberto",
  );

  if (!suporte) return null;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEnviar = async () => {
    if (!resposta.trim()) return;
    setSending(true);
    try {
      const updated = await makeRequest(
        `/api/suportes/${suporte.id}/responder`,
        {
          method: "POST",
          body: JSON.stringify({ resposta, status: selectedStatus }),
        },
      );
      onReplied && onReplied(updated.data);
      toast({ title: "Resposta enviada", description: resposta });
      setResposta("");
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="w-[85vw] h-[90vh] max-w-none overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-2">
            Visualizar Suporte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Top header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <LifeBuoy className="w-6 h-6 text-foodmax-orange" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foodmax-orange">
                  {suporte.titulo}
                </h2>
              </div>
            </div>
            <div className="text-right">
              <Badge
                className={`${STATUS_BADGE_STYLES[suporte.status] || "bg-gray-50 text-gray-700 border border-gray-200"}`}
              >
                {suporte.status}
              </Badge>
              <p className="text-xs text-gray-800 mt-1">
                Cadastrado em {formatDate(suporte.data_cadastro)}
              </p>
            </div>
          </div>

          {/* Dados Básicos */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">Tipo de Suporte</div>
                <div className="text-sm text-gray-900">{suporte.tipo}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Prioridade</div>
                <div>
                  <Badge className={`${PRIORIDADE_BADGE_STYLES[suporte.prioridade]}`}>
                    {suporte.prioridade}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Nome</div>
                <div className="text-sm text-gray-900">{suporte.nome_usuario}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Email</div>
                <div className="text-sm text-gray-900">{suporte.email_usuario}</div>
              </div>
            </div>
          </div>

          {/* Dados do Ticket */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Dados do Ticket</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-600">Título</div>
                <div className="text-sm text-gray-900">{suporte.titulo}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-600">Descrição</div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">{suporte.descricao}</div>
              </div>
            </div>
          </div>

          {/* Detalhes do Cadastro */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-600">
                Detalhes do Cadastro
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Data de Cadastro
                </div>
                <div className="text-sm text-gray-900">
                  {formatDate(suporte.data_cadastro)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Data de Atualização
                </div>
                <div className="text-sm text-gray-900">
                  {formatDate(suporte.data_atualizacao)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Status</div>
                <div className="text-sm text-gray-900">{suporte.status}</div>
              </div>
              {suporte.resposta_admin && (
                <div className="col-span-2">
                  <div className="text-sm font-medium text-gray-600">
                    Resposta Admin
                  </div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    {suporte.resposta_admin}
                  </div>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Resposta Admin
              </div>
              <Textarea
                rows={4}
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Escreva sua resposta ao usuário"
              />
              <div className="flex items-center justify-between gap-3 mt-3">
                <div className="w-64">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Status
                  </div>
                  <Select
                    value={selectedStatus}
                    onValueChange={(v) => setSelectedStatus(v as SuporteStatus)}
                  >
                    <SelectTrigger className="foodmax-input">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          "Aberto",
                          "Em Andamento",
                          "Resolvido",
                          "Fechado",
                        ] as SuporteStatus[]
                      ).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    onClick={handleEnviar}
                    disabled={sending || !resposta.trim()}
                    variant="orange"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
          {onEdit && suporte && (
            <Button
              type="button"
              onClick={() => onEdit(suporte)}
              className="flex-1 sm:flex-none bg-foodmax-orange hover:bg-orange-600"
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
