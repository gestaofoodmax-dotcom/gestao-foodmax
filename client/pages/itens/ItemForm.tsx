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
import { Info, X, Save, AlertTriangle } from "lucide-react";
import { Item, ItemCategoria, UNIDADES_MEDIDA } from "@shared/itens";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  categoria_id: z.number({ invalid_type_error: "Categoria é obrigatória" }),
  nome: z.string().min(1, "Nome é obrigatório"),
  preco_centavos: z.number().min(1, "Preço é obrigatório"),
  custo_pago_centavos: z.number().min(1, "Custo Pago é obrigatório"),
  unidade_medida: z.string().min(1, "Unidade de Medida é obrigatória"),
  peso_gramas: z.number().optional(),
  estoque_atual: z.number().optional(),
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
  const [filter, setFilter] = useState("");

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
      preco_centavos: 0,
      custo_pago_centavos: 0,
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
          preco_centavos: item.preco_centavos,
          custo_pago_centavos: item.custo_pago_centavos,
          unidade_medida: item.unidade_medida,
          peso_gramas: item.peso_gramas,
          estoque_atual: item.estoque_atual,
          ativo: item.ativo,
        });
      } else {
        reset({
          categoria_id: watchedCategoriaId as any,
          nome: "",
          preco_centavos: 0,
          custo_pago_centavos: 0,
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

  const [precoMask, setPrecoMask] = useState(formatInputCurrency(0));
  const [custoMask, setCustoMask] = useState(formatInputCurrency(0));

  useEffect(() => {
    if (item) {
      setPrecoMask(formatInputCurrency(item.preco_centavos));
      setCustoMask(formatInputCurrency(item.custo_pago_centavos));
    } else {
      setPrecoMask(formatInputCurrency(0));
      setCustoMask(formatInputCurrency(0));
    }
  }, [item, isOpen]);

  const onInvalid = (formErrors: FieldErrors<FormSchema>) => {
    const labelsMap: Record<string, string> = {
      categoria_id: "Categoria",
      nome: "Nome",
      preco_centavos: "Preço",
      custo_pago_centavos: "Custo Pago",
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

  const filteredCategorias = useMemo(() => {
    return categorias
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .filter((c) => c.nome.toLowerCase().includes(filter.toLowerCase()));
  }, [categorias, filter]);

  const showNoCategoriasWarning = categorias.length === 0;

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
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Categoria *</Label>
                <div className="border rounded-lg">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Filtrar por nome..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {filteredCategorias.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${watchedCategoriaId === c.id ? "bg-gray-100" : ""}`}
                        onClick={() => setValue("categoria_id", c.id)}
                      >
                        {c.nome}
                      </button>
                    ))}
                    {filteredCategorias.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Nenhuma categoria encontrada
                      </div>
                    )}
                  </div>
                </div>
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
                  className={`foodmax-input ${errors.nome ? "border-red-500" : ""}`}
                  placeholder="Nome do item"
                />
              </div>

              <div>
                <Label htmlFor="preco" className="text-sm font-medium">
                  Preço (R$) *
                </Label>
                <Input
                  id="preco"
                  value={precoMask}
                  onChange={(e) => {
                    const cents = parseCurrencyToCentavos(e.target.value);
                    setPrecoMask(formatInputCurrency(cents));
                    setValue("preco_centavos", cents);
                  }}
                  className={`foodmax-input ${errors.preco_centavos ? "border-red-500" : ""}`}
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
                    setCustoMask(formatInputCurrency(cents));
                    setValue("custo_pago_centavos", cents);
                  }}
                  className={`foodmax-input ${errors.custo_pago_centavos ? "border-red-500" : ""}`}
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
            <div className="flex items-center justify-start">
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
