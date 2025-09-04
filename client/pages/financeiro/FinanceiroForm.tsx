import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FieldErrors } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, FileText, Save, X, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Estabelecimento } from "@shared/estabelecimentos";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { Button as UIButton } from "@/components/ui/button";
import {
  FinanceiroTransacao,
  FINANCEIRO_CATEGORIAS,
  TipoTransacao,
} from "@shared/financeiro";

const schema = z.object({
  estabelecimento_id: z.number({
    invalid_type_error: "Estabelecimento é obrigatório",
  }),
  tipo: z.enum(["Receita", "Despesa"], {
    required_error: "Tipo é obrigatório",
  }),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  valor: z.number().int().min(0, "Valor deve ser >= 0"),
  data_transacao: z.string().min(1, "Data da Transação é obrigatória"),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FormSchema = z.infer<typeof schema>;

export default function FinanceiroForm({
  isOpen,
  onClose,
  onSave,
  item,
  isLoading = false,
  estabelecimentos,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  item?: FinanceiroTransacao | null;
  isLoading?: boolean;
  estabelecimentos: Estabelecimento[];
}) {
  const isEditing = !!item;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      estabelecimento_id: undefined as unknown as number,
      tipo: undefined as unknown as TipoTransacao,
      categoria: "",
      valor: 0,
      data_transacao: "",
      descricao: "",
      ativo: true,
    } as any,
  });

  const watchedAtivo = watch("ativo");
  const watchedEstId = watch("estabelecimento_id");
  const watchedTipo = watch("tipo");

  const [valorMask, setValorMask] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const formatDateBR = (d?: Date) =>
    d ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";

  const parseCurrencyToCentavos = (val: string) => {
    const digits = val.replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  };
  const formatInputCurrency = (centavos: number) => {
    const v = centavos / 100;
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  useEffect(() => {
    if (isOpen) {
      if (item) {
        reset({
          estabelecimento_id: item.estabelecimento_id,
          tipo: item.tipo,
          categoria: item.categoria,
          valor: item.valor,
          data_transacao: item.data_transacao
            ? new Date(item.data_transacao).toLocaleDateString("pt-BR")
            : "",
          descricao: item.descricao || "",
          ativo: item.ativo,
        });
        setValorMask(formatInputCurrency(item.valor));
        setSelectedDate(
          item.data_transacao ? new Date(item.data_transacao) : undefined,
        );
      } else {
        // Default estabelecimento: último cadastrado ativo
        const lastActive = estabelecimentos.find((e) => e.ativo);
        reset({
          estabelecimento_id: lastActive
            ? lastActive.id
            : (undefined as unknown as number),
          tipo: undefined as unknown as TipoTransacao,
          categoria: "",
          valor: 0,
          data_transacao: "",
          descricao: "",
          ativo: true,
        } as any);
        setValorMask("");
        setSelectedDate(undefined);
      }
    }
  }, [isOpen, item, reset, estabelecimentos]);

  const onInvalid = (formErrors: FieldErrors<FormSchema>) => {
    const labelsMap: Record<string, string> = {
      estabelecimento_id: "Estabelecimento",
      tipo: "Tipo de Transação",
      categoria: "Categoria",
      valor: "Valor",
      data_transacao: "Data da Transação",
    };
    const labels = Object.keys(formErrors).map((k) => labelsMap[k] || k);
    if (labels.length > 0) {
      toast({
        title: "Preencha os campos obrigatórios",
        description: labels.join(", "),
        variant: "destructive",
      });
    }
  };

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
            {isEditing ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>

        {estabelecimentos.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <p>
                Antes de cadastrar, é necessário ter pelo menos um
                Estabelecimento. {""}
                <Link
                  to="/estabelecimentos"
                  className="underline text-yellow-900"
                >
                  Ir para Estabelecimentos
                </Link>
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(async (d) => {
            await onSave(d);
            onClose();
          }, onInvalid)}
          className="space-y-6"
        >
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Estabelecimento *</Label>
                <Select
                  value={watchedEstId ? String(watchedEstId) : undefined}
                  onValueChange={(v) =>
                    setValue("estabelecimento_id", Number(v))
                  }
                >
                  <SelectTrigger
                    className={`foodmax-input ${errors.estabelecimento_id ? "border-red-500" : ""}`}
                  >
                    <SelectValue placeholder="Selecione o estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {estabelecimentos
                      .slice()
                      .sort((a, b) =>
                        a.data_cadastro < b.data_cadastro ? 1 : -1,
                      )
                      .map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Tipo de Transação *
                </Label>
                <Select
                  value={watchedTipo as any}
                  onValueChange={(v) => setValue("tipo", v as any)}
                >
                  <SelectTrigger
                    className={`foodmax-input ${errors.tipo ? "border-red-500" : ""}`}
                  >
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita">Receita</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Categoria *</Label>
                <Select
                  value={watch("categoria") as any}
                  onValueChange={(v) => setValue("categoria", v)}
                >
                  <SelectTrigger
                    className={`foodmax-input ${errors.categoria ? "border-red-500" : ""}`}
                  >
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {FINANCEIRO_CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Transação</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valor" className="text-sm font-medium">
                  Valor (R$) *
                </Label>
                <Input
                  id="valor"
                  value={valorMask}
                  onChange={(e) => {
                    const cents = parseCurrencyToCentavos(e.target.value);
                    setValorMask(
                      e.target.value === "" ? "" : formatInputCurrency(cents),
                    );
                    setValue("valor", cents);
                  }}
                  className={`foodmax-input ${errors.valor ? "border-red-500" : ""}`}
                  placeholder=""
                />
              </div>
              <div>
                <Label htmlFor="data" className="text-sm font-medium">
                  Data da Transação *
                </Label>
                <input type="hidden" {...register("data_transacao")} />
                <Popover>
                  <PopoverTrigger asChild>
                    <UIButton
                      variant="outline"
                      className={`w-full justify-start text-left font-normal foodmax-input ${errors.data_transacao ? "border-red-500" : ""}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? formatDateBR(selectedDate) : "dd/mm/aaaa"}
                    </UIButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date || undefined);
                        const formatted = date ? formatDateBR(date) : "";
                        setValue("data_transacao", formatted, { shouldDirty: true });
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="descricao" className="text-sm font-medium">
                  Descrição
                </Label>
                <Textarea
                  id="descricao"
                  {...register("descricao")}
                  className="foodmax-input min-h-[100px]"
                  placeholder="Descrição opcional"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Switch
                id="ativo"
                checked={watchedAtivo}
                onCheckedChange={(c) => setValue("ativo", c)}
              />
              <div>
                <Label htmlFor="ativo" className="text-sm font-medium">
                  Ativo
                </Label>
                <p className="text-sm text-gray-600">
                  {watchedAtivo ? "Sim" : "Não"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="orange"
              className="flex-1 sm:flex-none"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
