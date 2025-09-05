import { useEffect, useState } from "react";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, FileText, Ticket } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Suporte,
  SuportePrioridade,
  SuporteStatus,
  SuporteTipo,
  SUPORTE_PRIORIDADES,
  SUPORTE_TIPOS,
} from "@shared/suportes";

const suporteSchema = z.object({
  tipo: z.enum(["Técnico", "Financeiro", "Dúvida", "Sugestão", "Reclamação", "Outro"], { required_error: "Tipo de suporte é obrigatório" }),
  prioridade: z.enum(["Baixa", "Média", "Alta"], { required_error: "Prioridade é obrigatória" }),
  nome_usuario: z.string().min(1),
  email_usuario: z.string().email(),
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  status: z.enum(["Aberto", "Em Andamento", "Resolvido", "Fechado"]).optional(),
  resposta_admin: z.string().optional().nullable(),
});

type SuporteFormSchema = z.infer<typeof suporteSchema>;

interface SuporteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SuporteFormSchema) => Promise<void>;
  suporte?: Suporte | null;
  isLoading?: boolean;
}

export function SuporteForm({ isOpen, onClose, onSave, suporte, isLoading = false }: SuporteFormProps) {
  const { getUserRole, user } = useAuth();
  const role = getUserRole();
  const isAdmin = role === "admin";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SuporteFormSchema>({
    resolver: zodResolver(suporteSchema),
    defaultValues: {
      tipo: "Técnico",
      prioridade: "Média",
      nome_usuario: "",
      email_usuario: "",
      titulo: "",
      descricao: "",
      status: "Aberto",
      resposta_admin: "",
    },
  });

  const watchedTipo = watch("tipo");
  const watchedPrioridade = watch("prioridade");
  const watchedStatus = watch("status");

  useEffect(() => {
    if (!isOpen) return;

    const defaultName = (() => {
      try {
        const n = localStorage.getItem("fm_user_name");
        if (n && n.trim()) return n;
      } catch {}
      const email = user?.email || "";
      return email.split("@")[0] || "Usuário";
    })();

    if (suporte) {
      reset({
        tipo: suporte.tipo,
        prioridade: suporte.prioridade,
        nome_usuario: suporte.nome_usuario,
        email_usuario: suporte.email_usuario,
        titulo: suporte.titulo,
        descricao: suporte.descricao,
        status: suporte.status,
        resposta_admin: suporte.resposta_admin || "",
      });
    } else {
      reset({
        tipo: "Técnico",
        prioridade: "Média",
        nome_usuario: defaultName,
        email_usuario: user?.email || "",
        titulo: "",
        descricao: "",
        status: "Aberto",
        resposta_admin: "",
      });
    }
  }, [isOpen, suporte, reset, user?.email]);

  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: SuporteFormSchema) => {
    setSaving(true);
    try {
      await onSave(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const onInvalid = (formErrors: FieldErrors<SuporteFormSchema>) => {
    const labels = Object.keys(formErrors).map((k) => k);
    if (labels.length > 0) {
      // prevent toast import; show simple alert-like behavior could be implemented elsewhere
    }
  };

  const getInputClassName = (name: keyof SuporteFormSchema) =>
    `foodmax-input ${errors[name] ? "border-red-500 focus:ring-red-500" : ""}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[85vw] h-[90vh] max-w-none overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-2">
            {suporte ? "Editar Suporte" : "Novo Suporte"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          {/* Dados do Ticket */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Suporte *</Label>
                <Select value={watchedTipo} onValueChange={(v) => setValue("tipo", v as SuporteTipo)}>
                  <SelectTrigger className={getInputClassName("tipo")}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPORTE_TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade</Label>
                <Select value={watchedPrioridade} onValueChange={(v) => setValue("prioridade", v as SuportePrioridade)}>
                  <SelectTrigger className={getInputClassName("prioridade")}>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPORTE_PRIORIDADES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nome</Label>
                <Input {...register("nome_usuario")} className={`${getInputClassName("nome_usuario")} text-gray-500`} readOnly />
              </div>

              <div>
                <Label>Email</Label>
                <Input type="email" {...register("email_usuario")} className={`${getInputClassName("email_usuario")} text-gray-500`} readOnly />
              </div>
            </div>
          </div>

          {/* Dados do Ticket (green) */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Dados do Ticket</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Título *</Label>
                <Input {...register("titulo")} className={getInputClassName("titulo")} placeholder="Título do ticket" />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição *</Label>
                <Textarea {...register("descricao")} className={getInputClassName("descricao")} rows={5} placeholder="Descreva o problema ou dúvida" />
              </div>
            </div>
          </div>

          {/* Admin-only area */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="w-64">
                {isAdmin && (
                  <div>
                    <Label>Status</Label>
                    <Select value={watchedStatus} onValueChange={(v) => setValue("status", v as SuporteStatus)}>
                      <SelectTrigger className={getInputClassName("status")}>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        {(["Aberto", "Em Andamento", "Resolvido", "Fechado"] as SuporteStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving || isLoading} className="flex-1 sm:flex-none">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || isLoading} variant="orange" className="flex-1 sm:flex-none">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
