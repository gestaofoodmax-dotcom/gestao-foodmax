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
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ChevronsUpDown,
  Check,
  X,
  Save,
  ShoppingBag,
  Minus,
  AlertCircle,
  Link,
  Info,
  DollarSign,
  Boxes,
  FileText,
  Package,
} from "lucide-react";
import {
  Cardapio,
  TIPOS_CARDAPIO,
  TipoCardapio,
  formatCurrencyBRL,
} from "@shared/cardapios";
import { Item, ItemCategoria } from "@shared/itens";
import { toast } from "@/hooks/use-toast";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
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
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo_cardapio: z.enum(
    ["Café", "Almoço", "Janta", "Lanche", "Bebida", "Outro"],
    {
      required_error: "Tipo de cardápio é obrigatório",
    },
  ),
  margem_lucro_percentual: z
    .number({
      required_error: "Margem de lucro é obrigatória",
    })
    .min(0, "Margem deve ser maior ou igual a 0"),
  preco_total_centavos: z
    .number({
      required_error: "Preço total é obrigatório",
    })
    .min(0, "Preço deve ser maior ou igual a 0"),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

interface CardapioItem {
  item_id: number;
  item_nome: string;
  categoria_nome: string;
  quantidade: number;
  valor_unitario_centavos: number;
  item_estoque_atual?: number;
}

export default function CardapioForm({
  isOpen,
  onClose,
  onSave,
  cardapio,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FormData & { itens: CardapioItem[] }) => void;
  cardapio: Cardapio | null;
  isLoading?: boolean;
}) {
  const { makeRequest } = useAuthenticatedRequest();
  const [categorias, setCategorias] = useState<ItemCategoria[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<number[]>([]);
  const [cardapioItens, setCardapioItens] = useState<CardapioItem[]>([]);
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [stockAlertMessage, setStockAlertMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const parseCurrencyToCentavos = (val: string) => {
    const digits = val.replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  };
  const formatInputCurrency = (centavos: number) => {
    const v = (centavos || 0) / 100;
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };
  const [precoTotalMask, setPrecoTotalMask] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ativo: true,
    },
  });

  const watchedValues = watch();

  // Load categorias and itens
  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !cardapio) {
      setSelectedCategorias([]);
      setCardapioItens([]);
      setShowStockAlert(false);
      setStockAlertMessage("");
      reset({
        nome: "",
        tipo_cardapio: undefined as any,
        margem_lucro_percentual: 0,
        preco_total_centavos: 0,
        descricao: "",
        ativo: true,
      });
    }
  }, [isOpen, cardapio, reset]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load categorias
      const categoriasResponse = await makeRequest(
        "/api/itens-categorias?page=1&limit=200",
      );
      if (categoriasResponse?.data) {
        setCategorias(
          categoriasResponse.data.sort((a: ItemCategoria, b: ItemCategoria) =>
            a.nome.localeCompare(b.nome),
          ),
        );
      }

      // Load itens
      const itensResponse = await makeRequest("/api/itens?page=1&limit=1000");
      if (itensResponse?.data) {
        setItens(
          itensResponse.data.sort((a: Item, b: Item) =>
            a.nome.localeCompare(b.nome),
          ),
        );
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset form when cardapio changes
  useEffect(() => {
    if (cardapio) {
      reset({
        nome: cardapio.nome,
        tipo_cardapio: cardapio.tipo_cardapio,
        margem_lucro_percentual: cardapio.margem_lucro_percentual,
        preco_total_centavos: cardapio.preco_total_centavos,
        descricao: cardapio.descricao || "",
        ativo: cardapio.ativo,
      });
      // Load cardapio items if editing
      loadCardapioItens();
    } else {
      reset({
        nome: "",
        tipo_cardapio: undefined,
        margem_lucro_percentual: 0,
        preco_total_centavos: 0,
        descricao: "",
        ativo: true,
      });
      setCardapioItens([]);
      setSelectedCategorias([]);
    }
  }, [cardapio, reset]);

  const loadCardapioItens = async () => {
    if (!cardapio) return;
    try {
      const response = await makeRequest(`/api/cardapios/${cardapio.id}`);
      if (response?.itens) {
        setCardapioItens(response.itens);
        // Extract selected categories
        const catIds = [
          ...new Set(
            response.itens
              .map((item: any) => {
                const foundItem = itens.find((i) => i.id === item.item_id);
                return foundItem?.categoria_id;
              })
              .filter(Boolean),
          ),
        ] as number[];
        setSelectedCategorias(catIds);
      }
    } catch (error) {
      console.error("Error loading cardapio items:", error);
    }
  };

  // Filter itens by selected categories
  const filteredItens = useMemo(() => {
    if (selectedCategorias.length === 0) return [];
    return itens.filter((item) =>
      selectedCategorias.includes(item.categoria_id),
    );
  }, [itens, selectedCategorias]);

  // Calculate totals
  const { quantidadeTotal, precoItens, precoTotal } = useMemo(() => {
    const quantidadeTotal = cardapioItens.reduce(
      (sum, item) => sum + item.quantidade,
      0,
    );
    const precoItens = cardapioItens.reduce(
      (sum, item) => sum + item.quantidade * item.valor_unitario_centavos,
      0,
    );
    const margem = watchedValues.margem_lucro_percentual || 0;
    const precoTotal = Math.round(precoItens * (1 + margem / 100));

    return { quantidadeTotal, precoItens, precoTotal };
  }, [cardapioItens, watchedValues.margem_lucro_percentual]);

  // Update form values when calculations change
  useEffect(() => {
    setValue("preco_total_centavos", precoTotal);
  }, [precoTotal, setValue]);

  useEffect(() => {
    setPrecoTotalMask(
      formatInputCurrency(watchedValues.preco_total_centavos || 0),
    );
  }, [watchedValues.preco_total_centavos]);

  // Low-stock toast on category selection disabled per requirements

  const addItem = (item: Item) => {
    if ((item.estoque_atual || 0) === 0) {
      toast({
        title: "Sem estoque",
        description: "Este item está com estoque 0 e não pode ser adicionado",
        variant: "destructive",
      });
      return;
    }
    const existing = cardapioItens.find((ci) => ci.item_id === item.id);
    if (existing) {
      toast({
        title: "Item já adicionado",
        description: "Este item já está no cardápio",
        variant: "destructive",
      });
      return;
    }

    const categoria = categorias.find((c) => c.id === item.categoria_id);
    const newItem: CardapioItem = {
      item_id: item.id,
      item_nome: item.nome,
      categoria_nome: categoria?.nome || "",
      quantidade: 1,
      valor_unitario_centavos: item.preco_centavos,
      item_estoque_atual: item.estoque_atual,
    };

    setCardapioItens((prev) => [...prev, newItem]);
  };

  const removeItem = (itemId: number) => {
    setCardapioItens((prev) => prev.filter((item) => item.item_id !== itemId));
  };

  const updateItemQuantity = (itemId: number, quantidade: number) => {
    const item = cardapioItens.find((ci) => ci.item_id === itemId);
    if (!item) return;

    const estoque = item.item_estoque_atual || 0;

    if (quantidade > estoque) {
      setStockAlertMessage(
        `A quantidade informada (${quantidade}) está acima do estoque atual (${estoque}). ` +
          "Para usar uma quantidade maior, você deve aumentar o estoque no módulo Itens.",
      );
      setShowStockAlert(true);
      return;
    }

    setCardapioItens((prev) =>
      prev.map((ci) => (ci.item_id === itemId ? { ...ci, quantidade } : ci)),
    );
  };

  const updateItemPrice = (itemId: number, valor_unitario_centavos: number) => {
    setCardapioItens((prev) =>
      prev.map((ci) =>
        ci.item_id === itemId ? { ...ci, valor_unitario_centavos } : ci,
      ),
    );
  };

  const validateStock = () => {
    const invalidItems = cardapioItens.filter((item) => {
      const estoque = item.item_estoque_atual || 0;
      return item.quantidade > estoque;
    });

    if (invalidItems.length > 0) {
      const itemNames = invalidItems.map((item) => item.item_nome).join(", ");
      toast({
        title: "Erro de Validação",
        description: `Os seguintes itens têm quantidade maior que o estoque: ${itemNames}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const onSubmit = (data: FormData) => {
    if (cardapioItens.length === 0) {
      toast({
        title: "Erro de Validação",
        description: "É necessário adicionar pelo menos um item ao cardápio",
        variant: "destructive",
      });
      return;
    }

    if (!validateStock()) {
      return;
    }

    onSave({
      ...data,
      itens: cardapioItens,
    });
  };

  const hasPrerequisites = categorias.length > 0 && itens.length > 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-normal">
              {cardapio ? "Editar Cardápio" : "Novo Cardápio"}
            </DialogTitle>
          </DialogHeader>

          {!hasPrerequisites && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div className="text-sm text-yellow-800">
                  {categorias.length === 0 ? (
                    <>
                      Antes de cadastrar, é necessário ter pelo menos uma
                      Categoria{" "}
                      <button
                        onClick={() => window.open("/itens", "_blank")}
                        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                      >
                        <Link className="w-3 h-3" />
                        (ir para módulo Itens)
                      </button>
                    </>
                  ) : (
                    <>
                      Antes de cadastrar, é necessário ter pelo menos um Item{" "}
                      <button
                        onClick={() => window.open("/itens", "_blank")}
                        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                      >
                        <Link className="w-3 h-3" />
                        (ir para m��dulo Itens)
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    {...register("nome")}
                    className="foodmax-input"
                    placeholder="Nome do cardápio"
                  />
                  {errors.nome && (
                    <span className="text-sm text-red-600">
                      {errors.nome.message}
                    </span>
                  )}
                </div>

                <div>
                  <Label htmlFor="tipo_cardapio">Tipo de Cardápio *</Label>
                  <Select
                    value={watchedValues.tipo_cardapio}
                    onValueChange={(value) =>
                      setValue("tipo_cardapio", value as TipoCardapio)
                    }
                  >
                    <SelectTrigger className="foodmax-input">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CARDAPIO.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tipo_cardapio && (
                    <span className="text-sm text-red-600">
                      {errors.tipo_cardapio.message}
                    </span>
                  )}
                </div>

                <div>
                  <Label>Categorias *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between foodmax-input"
                      >
                        {selectedCategorias.length > 0
                          ? `${selectedCategorias.length} categoria(s) selecionada(s)`
                          : "Selecione categorias"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Filtrar categorias..." />
                        <CommandEmpty>
                          Nenhuma categoria encontrada.
                        </CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {categorias.map((categoria) => (
                              <CommandItem
                                key={categoria.id}
                                onSelect={() => {
                                  setSelectedCategorias((prev) =>
                                    prev.includes(categoria.id)
                                      ? prev.filter((id) => id !== categoria.id)
                                      : [...prev, categoria.id],
                                  );
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCategorias.includes(categoria.id)
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {categoria.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Itens *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={selectedCategorias.length === 0}
                        className={cn(
                          "w-full justify-between foodmax-input",
                          selectedCategorias.length === 0 &&
                            "opacity-60 cursor-not-allowed",
                        )}
                      >
                        {selectedCategorias.length === 0
                          ? "Selecione categorias para listar itens"
                          : "Adicionar item ao cardápio"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Filtrar itens..." />
                        <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {filteredItens.map((item) => {
                              const isLowStock = (item.estoque_atual || 0) < 3;
                              const isAdded = cardapioItens.some(
                                (ci) => ci.item_id === item.id,
                              );
                              const isOutOfStock =
                                (item.estoque_atual || 0) === 0;

                              return (
                                <CommandItem
                                  key={item.id}
                                  onSelect={() =>
                                    !isAdded && !isOutOfStock && addItem(item)
                                  }
                                  disabled={isAdded || isOutOfStock}
                                  className={
                                    isAdded || isOutOfStock ? "opacity-50" : ""
                                  }
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                      {isLowStock && (
                                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                                      )}
                                      <span>{item.nome}</span>
                                      {isAdded && (
                                        <Badge variant="secondary">
                                          Já adicionado
                                        </Badge>
                                      )}
                                      {isOutOfStock && (
                                        <Badge className="bg-red-50 text-red-700 border-red-200">
                                          Sem estoque
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-sm text-gray-500">
                                      Estoque: {item.estoque_atual || 0}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Items List */}
            {cardapioItens.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Utensils className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-600">
                    Itens do Cardápio
                  </h3>
                </div>

                <div className="space-y-3">
                  {cardapioItens.map((item) => {
                    const isZeroStock = (item.item_estoque_atual || 0) === 0;
                    const total =
                      item.quantidade * item.valor_unitario_centavos;

                    return (
                      <div
                        key={item.item_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.item_nome}</div>
                          <div className="text-sm text-gray-600">{item.categoria_nome}</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Quantidade</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) =>
                                updateItemQuantity(
                                  item.item_id,
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              disabled={isZeroStock}
                              className="w-20 h-8 text-center"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Valor Unit. (R$)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={(
                                item.valor_unitario_centavos / 100
                              ).toFixed(2)}
                              onChange={(e) =>
                                updateItemPrice(
                                  item.item_id,
                                  Math.round(
                                    parseFloat(e.target.value || "0") * 100,
                                  ),
                                )
                              }
                              className="w-24 h-8 text-center"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Total</Label>
                            <div className="text-sm font-medium w-20 text-center bg-white p-1 rounded border">
                              {formatCurrencyBRL(total)}
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(item.item_id)}
                            className="h-8 w-8 p-0 border-red-200 hover:bg-red-50"
                          >
                            <Minus className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Quantidade Total: </span>
                      <span>{quantidadeTotal}</span>
                    </div>
                    <div>
                      <span className="font-medium">Preço dos Itens: </span>
                      <span>{formatCurrencyBRL(precoItens)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2 -mt-2 mb-2 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-600">Preço</h3>
                </div>
                <div>
                  <Label htmlFor="margem_lucro_percentual">
                    Margem de Lucro (%) *
                  </Label>
                  <Input
                    id="margem_lucro_percentual"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("margem_lucro_percentual", {
                      valueAsNumber: true,
                    })}
                    className="foodmax-input"
                    placeholder="0.00"
                  />
                  {errors.margem_lucro_percentual && (
                    <span className="text-sm text-red-600">
                      {errors.margem_lucro_percentual.message}
                    </span>
                  )}
                </div>

                <div>
                  <Label htmlFor="preco_total_centavos">
                    Preço Total (R$) *
                  </Label>
                  <Input
                    id="preco_total_centavos"
                    value={precoTotalMask}
                    onChange={(e) => {
                      const cents = parseCurrencyToCentavos(e.target.value);
                      setPrecoTotalMask(
                        e.target.value === "" ? "" : formatInputCurrency(cents),
                      );
                      setValue("preco_total_centavos", cents);
                    }}
                    className="foodmax-input"
                    placeholder="R$ 0,00"
                  />
                  {errors.preco_total_centavos && (
                    <span className="text-sm text-red-600">
                      {errors.preco_total_centavos.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                {...register("descricao")}
                className="foodmax-input resize-none"
                rows={3}
                placeholder="Descrição do cardápio..."
              />
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Switch
                  id="ativo"
                  checked={watchedValues.ativo}
                  onCheckedChange={(checked) => setValue("ativo", checked)}
                />
                <div>
                  <Label htmlFor="ativo" className="text-sm font-medium">
                    Ativo
                  </Label>
                  <p className="text-sm text-gray-600">
                    {watchedValues.ativo ? "Sim" : "Não"}
                  </p>
                </div>
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading || !hasPrerequisites}
              className="bg-foodmax-orange hover:bg-orange-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showStockAlert} onOpenChange={setShowStockAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Alerta de Estoque
            </AlertDialogTitle>
            <AlertDialogDescription>{stockAlertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={() => window.open("/itens", "_blank")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ir para Módulo Itens
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
