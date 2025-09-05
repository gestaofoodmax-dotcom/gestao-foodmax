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
import { X, Send, LifeBuoy, FileText, Headphones } from "lucide-react";
import { useAuth, useAuthenticatedRequest } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import {
  Suporte,
  STATUS_BADGE_STYLES,
  PRIORIDADE_BADGE_STYLES,
  SuporteStatus,
  SuporteResposta,
} from "@shared/suportes";
import { useMemo, useState, useEffect } from "react";
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
  const [respostas, setRespostas] = useState<SuporteResposta[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!isOpen || !suporte) return;
      try {
        const resp = await makeRequest(`/api/suportes/${suporte.id}/respostas`);
        if (!active) return;
        setRespostas(resp.data || []);
      } catch {
        setRespostas([]);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isOpen, suporte?.id]);

  if (!suporte) return null;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    const pad = (n: number) => String(n).padStart(2, "0");
    const dd = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  const handleEnviar = async () => {
    if (!resposta.trim()) return;
    setSending(true);
    try {
      const payload: any = { resposta };
      if (isAdmin) payload.status = selectedStatus;
      const updated = await makeRequest(
        `/api/suportes/${suporte.id}/respostas`,
        {
          method: "POST",
          body: JSON.stringify(payload),
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
                  {(suporte as any).codigo}
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
                <div className="text-sm font-medium text-gray-600">
                  Tipo de Suporte
                </div>
                <div className="text-sm text-gray-900">{suporte.tipo}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Prioridade</div>
                <div className="text-sm text-gray-900">{suporte.prioridade}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Nome</div>
                <div className="text-sm text-gray-900">
                  {suporte.nome_usuario}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Email</div>
                <div className="text-sm text-gray-900">
                  {suporte.email_usuario}
                </div>
              </div>
            </div>
          </div>

          {/* Ticket */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Headphones className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Ticket</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Código do Ticket
                </div>
                <div className="text-sm text-gray-900">
                  {(suporte as any).codigo || "-"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Título</div>
                <div className="text-sm text-gray-900">{suporte.titulo}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-gray-600">
                  Descrição
                </div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">
                  {suporte.descricao}
                </div>
              </div>
            </div>
          </div>

          {/* Histórico de Resposta */}
          {respostas.length > 0 && (
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <LifeBuoy className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-600">
                  Histórico de Resposta
                </h3>
              </div>
              <div className="space-y-3">
                {respostas.map((r) => (
                  <div
                    key={r.id}
                    className={`border rounded p-3 ${r.role === "admin" ? "bg-gray-50" : "bg-white"}`}
                  >
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                      {r.resposta}
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      {r.nome_usuario} - {formatDate(r.data_cadastro)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responder Ticket (hidden when Fechado) */}
          {suporte.status !== "Fechado" && (
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Headphones className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-orange-600">
                  Responder Ticket
                </h3>
              </div>
              <Textarea
                rows={4}
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder={
                  isAdmin
                    ? "Escreva sua resposta ao usuário"
                    : "Escreva sua resposta ao administrador"
                }
              />
              {isAdmin && (
                <div className="w-64 mt-3">
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
              )}
            </div>
          )}
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
          <Button
            onClick={handleEnviar}
            disabled={sending || !resposta.trim()}
            className="flex-1 sm:flex-none bg-foodmax-orange hover:bg-orange-600"
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
