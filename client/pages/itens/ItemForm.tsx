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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FileText,
  X,
  Save,
  AlertTriangle,
  ChevronsUpDown,
  Check,
  DollarSign,
  Boxes,
} from "lucide-react";
import { Item, ItemCategoria, UNIDADES_MEDIDA } from "@shared/itens";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const schema = z.object({
  categoria_id: z.number({ invalid_type_error: "Categoria é obrigatória" }),
  nome: z.string().min(1, "Nome é obrigatório"),
  preco: z.number().min(0, "Preço deve ser maior ou igual a 0"),
  custo_pago: z
    .number()
    .min(0, "Custo Pago deve ser maior ou igual a 0"),
  unidade_medida: z.string().min(1, "Unidade de Medida é obrigatória"),
  peso_gramas: z.preprocess(
    (v) =>
      v === "" || v === null || (typeof v === "number" && isNaN(v))
        ? undefined
        : v,
    z.number().int().nonnegative().optional(),
  ),
  estoque_atual: z.preprocess(
    (v) =>
      v === "" || v === null || (typeof v === "number" && isNaN(v))
        ? undefined
        : v,
    z.number().int().nonnegative().optional(),
  ),
  ativo: z.boolean().default(true),
});

type FormSchema = z.infer<typeof schema>;

export default function ItemForm({
  isOpen,
  onClose,
  onSave,
  item,
  isLoading = false,
  categorias,
  onOpenCategorias,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  item?: Item | null;
  isLoading?: boolean;
  categorias: ItemCategoria[];
  onOpenCategorias: () => void;
}) {
  const isEditing = !!item;
  const [openCategorias, setOpenCategorias] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoria_id: undefined as unknown as number,
      nome: "",
      preco: 0,
      custo_pago: 0,
      unidade_medida: "Unidade",
      peso_gramas: undefined,
      estoque_atual: 0,
      ativo: true,
    },
  });

  const watchedAtivo = watch("ativo");
  const watchedCategoriaId = watch("categoria_id");

  useEffect(() => {
    if (isOpen) {
      if (item) {
        reset({
          categoria_id: item.categoria_id,
          nome: item.nome,
          preco: item.preco,
          custo_pago: item.custo_pago,
          unidade_medida: item.unidade_medida,
          peso_gramas: item.peso_gramas,
          estoque_atual: item.estoque_atual,
          ativo: item.ativo,
        });
      } else {
        reset({
          categoria_id: watchedCategoriaId as any,
          nome: "",
          preco: 0,
          custo_pago: 0,
          unidade_medida: "Unidade",
          peso_gramas: undefined,
          estoque_atual: 0,
          ativo: true,
        });
      }
    }
  }, [isOpen, item, reset]);

  const parseCurrencyToCentavos = (val: string) => {
    const digits = val.replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  };
  const formatInputCurrency = (centavos: number) => {
    const v = centavos / 100;
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const [precoMask, setPrecoMask] = useState("");
  const [custoMask, setCustoMask] = useState("");

  useEffect(() => {
    if (item) {
      setPrecoMask(formatInputCurrency(item.preco));
      setCustoMask(formatInputCurrency(item.custo_pago));
    } else {
      setPrecoMask("");
      setCustoMask("");
    }
  }, [item, isOpen]);

  const onInvalid = (formErrors: FieldErrors<FormSchema>) => {
    const labelsMap: Record<string, string> = {
      categoria_id: "Categoria",
      nome: "Nome",
      preco: "Preço",
      custo_pago: "Custo Pago",
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

  const categoriasOrdenadas = useMemo(() => {
    return categorias.slice().sort((a, b) => a.nome.localeCompare(b.nome));
  }, [categorias]);

  const showNoCategoriasWarning = categorias.length === 0;
  const categoriaSelecionada = categorias.find(
    (c) => c.id === watchedCategoriaId,
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
            {isEditing ? "Editar Item" : "Novo Item"}
          </DialogTitle>
        </DialogHeader>

        {showNoCategoriasWarning && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <p>
                Antes de cadastrar, é necessário ter pelo menos uma Categoria.{" "}
                {""}
                <button
                  onClick={onOpenCategorias}
                  className="underline text-yellow-900"
                >
                  Nova Categoria
                </button>
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
                <Label className="text-sm font-medium">Categoria *</Label>
                <Popover open={openCategorias} onOpenChange={setOpenCategorias}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCategorias}
                      className={cn(
                        "w-full justify-between foodmax-input bg-white",
                        errors.categoria_id ? "border-red-500" : "",
                      )}
                    >
                      {categoriaSelecionada
                        ? categoriaSelecionada.nome
                        : "Selecione a categoria"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar categorias..." />
                      <CommandList>
                        <CommandEmpty>
                          Nenhuma categoria encontrada
                        </CommandEmpty>
                        <CommandGroup>
                          {categoriasOrdenadas.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.nome}
                              onSelect={() => {
                                setValue("categoria_id", c.id);
                                setOpenCategorias(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  watchedCategoriaId === c.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {c.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.categoria_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.categoria_id.message as any}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="nome" className="text-sm font-medium">
                  Nome *
                </Label>
                <Input
                  id="nome"
                  {...register("nome")}
                  className={cn(
                    "foodmax-input",
                    errors.nome ? "border-red-500" : "",
                  )}
                  placeholder="Nome do item"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Unidade de Medida</Label>
                <Select
                  value={watch("unidade_medida") as any}
                  onValueChange={(v) => setValue("unidade_medida", v)}
                >
                  <SelectTrigger className="foodmax-input">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_MEDIDA.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="peso" className="text-sm font-medium">
                  Peso (Gramas)
                </Label>
                <Input
                  id="peso"
                  type="number"
                  {...register("peso_gramas", { valueAsNumber: true })}
                  className="foodmax-input"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Preços</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preco" className="text-sm font-medium">
                  Preço (R$) *
                </Label>
                <Input
                  id="preco"
                  value={precoMask}
                  onChange={(e) => {
                    const cents = parseCurrencyToCentavos(e.target.value);
                    setPrecoMask(
                      e.target.value === "" ? "" : formatInputCurrency(cents),
                    );
                    setValue("preco", cents);
                  }}
                  placeholder=""
                  className={cn(
                    "foodmax-input",
                    errors.preco ? "border-red-500" : "",
                  )}
                />
              </div>
              <div>
                <Label htmlFor="custo" className="text-sm font-medium">
                  Custo Pago (R$) *
                </Label>
                <Input
                  id="custo"
                  value={custoMask}
                  onChange={(e) => {
                    const cents = parseCurrencyToCentavos(e.target.value);
                    setCustoMask(
                      e.target.value === "" ? "" : formatInputCurrency(cents),
                    );
                    setValue("custo_pago", cents);
                  }}
                  placeholder=""
                  className={cn(
                    "foodmax-input",
                    errors.custo_pago ? "border-red-500" : "",
                  )}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Boxes className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-600">Estoque</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <Label htmlFor="estoque" className="text-sm font-medium">
                  Estoque Atual
                </Label>
                <Input
                  id="estoque"
                  type="number"
                  {...register("estoque_atual", { valueAsNumber: true })}
                  className="foodmax-input"
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
