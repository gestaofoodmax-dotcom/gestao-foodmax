import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Pedido,
  CreatePedidoRequest,
  TIPOS_PEDIDO,
  STATUS_PEDIDO,
  formatCurrencyBRL,
  TipoPedido,
  StatusPedido,
} from "@shared/pedidos";
import { Estabelecimento } from "@shared/estabelecimentos";
import { Cliente } from "@shared/clientes";
import { Cardapio } from "@shared/cardapios";
import { Item, ItemCategoria } from "@shared/itens";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronsUpDown,
  Check,
  X,
  Save,
  Link as LinkIcon,
  AlertCircle,
  Info,
  ShoppingBag,
  DollarSign,
  FileText,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const schema = z.object({
  estabelecimento_id: z.number({
    required_error: "Estabelecimento é obrigatório",
  }),
  tipo_pedido: z.enum(["Atendente", "QR Code", "APP", "Outro"], {
    required_error: "Tipo de Pedido é obrigatório",
  }),
  codigo: z.string().min(1, "Código é obrigatório"),
  cliente_id: z.number().nullable().optional(),
  valor_total_centavos: z.number().min(0, "Valor obrigatório"),
  observacao: z.string().optional(),
  status: z.enum(["Pendente", "Finalizado", "Cancelado"]).default("Pendente"),
  data_hora_finalizado: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

export default function PedidoForm({
  isOpen,
  onClose,
  onSave,
  pedido,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePedidoRequest) => void;
  pedido: Pedido | null;
  isLoading?: boolean;
}) {
  const { makeRequest } = useAuthenticatedRequest();

  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(
    [],
  );
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cardapios, setCardapios] = useState<Cardapio[]>([]);
  const [categorias, setCategorias] = useState<ItemCategoria[]>([]);
  const [itens, setItens] = useState<Item[]>([]);

  const [selectedCardapios, setSelectedCardapios] = useState<number[]>([]);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | null>(
    null,
  );
  const [selectedExtras, setSelectedExtras] = useState<
    {
      item_id: number;
      categoria_id: number;
      quantidade: number;
      valor_unitario_centavos: number;
    }[]
  >([]);
  const [stockAlert, setStockAlert] = useState<{ open: boolean; message: string }>({ open: false, message: "" });

  const parseCurrencyToCentavos = (val: string) => {
    const digits = val.replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  };
  const formatInputCurrency = (centavos: number) => {
    const v = (centavos || 0) / 100;
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };
  const [valorTotalMask, setValorTotalMask] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "Pendente" as StatusPedido },
  });

  const watchedValues = watch();

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  const generateCodigo = () => {
    const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${part()}-${part()}`;
  };

  useEffect(() => {
    if (isOpen && !pedido) {
      reset({
        estabelecimento_id: undefined as any,
        tipo_pedido: undefined as any,
        codigo: generateCodigo(),
        cliente_id: null,
        valor_total_centavos: 0,
        observacao: "",
        status: "Pendente",
        data_hora_finalizado: null,
      });
      setSelectedCardapios([]);
      setSelectedExtras([]);
      setSelectedCategoriaId(null);
    }
  }, [isOpen, pedido, reset]);

  const loadData = async () => {
    try {
      const estResp = await makeRequest(
        "/api/estabelecimentos?page=1&limit=1000",
      );
      if (estResp?.data) {
        const ordered = estResp.data.sort(
          (a: Estabelecimento, b: Estabelecimento) =>
            a.data_cadastro < b.data_cadastro ? 1 : -1,
        );
        setEstabelecimentos(ordered);
        const lastActive = ordered.find((e: Estabelecimento) => e.ativo);
        if (!pedido && lastActive)
          setValue("estabelecimento_id", lastActive.id);
      }
      const cliResp = await makeRequest("/api/clientes?page=1&limit=1000");
      if (cliResp?.data) {
        const ordered = cliResp.data.sort((a: Cliente, b: Cliente) =>
          a.nome.localeCompare(b.nome),
        );
        setClientes(ordered);
        if (!pedido) setValue("cliente_id", null);
      }
      const cardResp = await makeRequest("/api/cardapios?page=1&limit=1000");
      if (cardResp?.data)
        setCardapios(
          cardResp.data.sort((a: Cardapio, b: Cardapio) =>
            a.nome.localeCompare(b.nome),
          ),
        );
      const catResp = await makeRequest(
        "/api/itens-categorias?page=1&limit=1000",
      );
      if (catResp?.data)
        setCategorias(
          catResp.data.sort((a: ItemCategoria, b: ItemCategoria) =>
            a.nome.localeCompare(b.nome),
          ),
        );
      const itensResp = await makeRequest("/api/itens?page=1&limit=1000");
      if (itensResp?.data)
        setItens(
          itensResp.data.sort((a: Item, b: Item) =>
            a.nome.localeCompare(b.nome),
          ),
        );
    } catch {}
  };

  useEffect(() => {
    if (pedido) {
      reset({
        estabelecimento_id: pedido.estabelecimento_id,
        tipo_pedido: pedido.tipo_pedido,
        codigo: pedido.codigo,
        cliente_id: pedido.cliente_id ?? null,
        valor_total_centavos: pedido.valor_total_centavos,
        observacao: pedido.observacao || "",
        status: pedido.status,
        data_hora_finalizado: pedido.data_hora_finalizado,
      });
      setValorTotalMask(formatInputCurrency(pedido.valor_total_centavos));
    }
  }, [pedido, reset]);

  const filteredExtras = useMemo(() => {
    if (!selectedCategoriaId) return [] as Item[];
    return itens.filter((i) => i.categoria_id === selectedCategoriaId);
  }, [itens, selectedCategoriaId]);

  const valorExtras = useMemo(() => {
    return selectedExtras.reduce(
      (sum, e) => sum + e.quantidade * e.valor_unitario_centavos,
      0,
    );
  }, [selectedExtras]);

  const valorCardapios = useMemo(() => {
    return selectedCardapios.reduce((sum, cid) => {
      const c = cardapios.find((x) => x.id === cid);
      return sum + (c?.preco_total_centavos || 0);
    }, 0);
  }, [selectedCardapios, cardapios]);

  useEffect(() => {
    const total = valorCardapios + valorExtras;
    setValue("valor_total_centavos", total);
    setValorTotalMask(formatInputCurrency(total));
  }, [valorCardapios, valorExtras, setValue]);

  const onSubmit = (data: FormData) => {
    if (selectedCardapios.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Selecione pelo menos um Cardápio",
        variant: "destructive",
      });
      return;
    }

    // Validate extras stock before submit
    for (const ex of selectedExtras) {
      const itemInfo = itens.find((i) => i.id === ex.item_id);
      const estoque = itemInfo?.estoque_atual ?? 0;
      if (estoque <= 0) {
        setStockAlert({
          open: true,
          message:
            `O item selecionado está com estoque 0. Ajuste o estoque no módulo Itens antes de continuar.`,
        });
        return;
      }
      if (ex.quantidade > estoque) {
        setStockAlert({
          open: true,
          message:
            `Quantidade informada (${ex.quantidade}) é maior que o estoque atual (${estoque}). Ajuste o estoque no módulo Itens.`,
        });
        return;
      }
    }

    const payload: CreatePedidoRequest = {
      estabelecimento_id: data.estabelecimento_id,
      cliente_id: data.cliente_id ?? null,
      tipo_pedido: data.tipo_pedido as TipoPedido,
      codigo: data.codigo,
      observacao: data.observacao || "",
      status: data.status as StatusPedido,
      valor_total_centavos: data.valor_total_centavos,
      data_hora_finalizado: data.data_hora_finalizado ?? null,
      cardapios: selectedCardapios.map((id) => ({ cardapio_id: id })),
      itens_extras: selectedExtras,
    };

    onSave(payload);
  };

  const hasPrerequisites =
    estabelecimentos.length > 0 && clientes.length > 0 && cardapios.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h[90vh] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pedido ? "Editar Pedido" : "Novo Pedido"}</DialogTitle>
        </DialogHeader>

        {!hasPrerequisites && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                {estabelecimentos.length === 0 ? (
                  <>
                    Antes de cadastrar, é necessário ter pelo menos um
                    Estabelecimento. {""}
                    <button
                      onClick={() => window.open("/estabelecimentos", "_blank")}
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" /> (ir para módulo
                      Estabelecimentos)
                    </button>
                  </>
                ) : clientes.length === 0 ? (
                  <>
                    Antes de cadastrar, é necessário ter pelo menos um Cliente.{" "}
                    {""}
                    <button
                      onClick={() => window.open("/clientes", "_blank")}
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" /> (ir para módulo Clientes)
                    </button>
                  </>
                ) : (
                  <>
                    Antes de cadastrar, é necessário ter pelo menos um Cardápio.{" "}
                    {""}
                    <button
                      onClick={() => window.open("/cardapios", "_blank")}
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" /> (ir para módulo
                      Cardápios)
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados do Pedido</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Estabelecimento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between foodmax-input"
                    >
                      {watchedValues.estabelecimento_id
                        ? estabelecimentos.find(
                            (e) => e.id === watchedValues.estabelecimento_id,
                          )?.nome
                        : "Selecione"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Filtrar estabelecimento..." />
                      <CommandEmpty>
                        Nenhum estabelecimento encontrado.
                      </CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {estabelecimentos.map((e) => (
                            <CommandItem
                              key={e.id}
                              onSelect={() =>
                                setValue("estabelecimento_id", e.id)
                              }
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  watchedValues.estabelecimento_id === e.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {e.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.estabelecimento_id && (
                  <span className="text-sm text-red-600">
                    {errors.estabelecimento_id.message as any}
                  </span>
                )}
              </div>

              <div>
                <Label>Tipo de Pedido *</Label>
                <Select
                  value={watchedValues.tipo_pedido}
                  onValueChange={(v) => setValue("tipo_pedido", v as any)}
                >
                  <SelectTrigger className="foodmax-input">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PEDIDO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo_pedido && (
                  <span className="text-sm text-red-600">
                    {errors.tipo_pedido.message as any}
                  </span>
                )}
              </div>

              <div>
                <Label>Código do Pedido *</Label>
                <Input
                  id="codigo"
                  {...register("codigo")}
                  className="foodmax-input"
                />
                {errors.codigo && (
                  <span className="text-sm text-red-600">
                    {errors.codigo.message}
                  </span>
                )}
              </div>

              <div>
                <Label>Cliente</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between foodmax-input"
                    >
                      {watchedValues.cliente_id
                        ? clientes.find(
                            (c) => c.id === watchedValues.cliente_id,
                          )?.nome
                        : "Não Cliente"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Filtrar clientes..." />
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => setValue("cliente_id", null)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                watchedValues.cliente_id == null
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            Não Cliente
                          </CommandItem>
                          {clientes.map((c) => (
                            <CommandItem
                              key={c.id}
                              onSelect={() => setValue("cliente_id", c.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  watchedValues.cliente_id === c.id
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
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-600">
                Seleção de Cardápios e Itens Extra
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Cardápios *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between foodmax-input"
                    >
                      {selectedCardapios.length > 0
                        ? `${selectedCardapios.length} selecionado(s)`
                        : "Selecione Cardápios"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Filtrar cardápios..." />
                      <CommandEmpty>Nenhum cardápio encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {cardapios.map((c) => (
                            <CommandItem
                              key={c.id}
                              onSelect={() =>
                                setSelectedCardapios((prev) =>
                                  prev.includes(c.id)
                                    ? prev.filter((id) => id !== c.id)
                                    : [...prev, c.id],
                                )
                              }
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCardapios.includes(c.id)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <span className="flex-1">{c.nome}</span>
                              <Badge variant="secondary">
                                {formatCurrencyBRL(c.preco_total_centavos)}
                              </Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={
                      selectedCategoriaId
                        ? String(selectedCategoriaId)
                        : undefined
                    }
                    onValueChange={(v) => setSelectedCategoriaId(parseInt(v))}
                  >
                    <SelectTrigger className="foodmax-input">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Itens Extra</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={!selectedCategoriaId}
                        className={cn(
                          "w-full justify-between foodmax-input",
                          !selectedCategoriaId &&
                            "opacity-60 cursor-not-allowed",
                        )}
                      >
                        {selectedCategoriaId
                          ? "Selecionar Itens Extra"
                          : "Selecione uma categoria"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Filtrar itens..." />
                        <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {filteredExtras.map((item) => {
                              const isLow = (item.estoque_atual || 0) < 3;
                              return (
                                <CommandItem
                                  key={item.id}
                                  onSelect={() => {
                                    setSelectedExtras((prev) => {
                                      const existing = prev.find(
                                        (e) => e.item_id === item.id,
                                      );
                                      if (existing) return prev;
                                      return [
                                        ...prev,
                                        {
                                          item_id: item.id,
                                          categoria_id: item.categoria_id,
                                          quantidade: 1,
                                          valor_unitario_centavos:
                                            item.preco_centavos,
                                        },
                                      ];
                                    });
                                  }}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                      {isLow && (
                                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                                      )}
                                      <span>{item.nome}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      Estoque: {item.estoque_atual ?? 0}
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

              {selectedCategoriaId &&
                filteredExtras.some((i) => (i.estoque_atual || 0) < 3) && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    Atenção: existem itens desta categoria com estoque baixo
                    (&lt; 3).
                  </div>
                )}

              {selectedExtras.length > 0 && (
                <div className="mt-1 space-y-2">
                  {selectedExtras.map((ex) => {
                    const item = itens.find((i) => i.id === ex.item_id);
                    if (!item) return null;
                    const total = ex.quantidade * ex.valor_unitario_centavos;
                    const isZero = (item.estoque_atual || 0) === 0;
                    return (
                      <div
                        key={ex.item_id}
                        className="flex items-center justify-between bg-gray-50 rounded p-2"
                      >
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {(item.estoque_atual || 0) < 3 && (
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                            )}{" "}
                            {item.nome}
                          </div>
                          <div className="text-xs text-gray-600">
                            Estoque Atual: {item.estoque_atual ?? 0}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Qtd</Label>
                            <Input
                              type="number"
                              min="1"
                              value={ex.quantidade}
                              onChange={(e) => {
                                const next = Math.max(1, parseInt(e.target.value) || 1);
                                setSelectedExtras((prev) => {
                                  const itemInfo = itens.find((i) => i.id === ex.item_id);
                                  const estoque = itemInfo?.estoque_atual ?? 0;
                                  const adjusted = estoque > 0 ? Math.min(next, estoque) : 1;
                                  if (next > estoque && estoque >= 0) {
                                    setStockAlert({
                                      open: true,
                                      message:
                                        `Quantidade informada (${next}) é maior que o estoque atual (${estoque}). Para usar quantidade maior, ajuste o estoque no módulo Itens.`,
                                    });
                                  }
                                  return prev.map((p) =>
                                    p.item_id === ex.item_id ? { ...p, quantidade: adjusted } : p,
                                  );
                                });
                              }}
                              disabled={isZero}
                              className="w-20 h-8 text-center"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Valor Unit. (R$)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={(ex.valor_unitario_centavos / 100).toFixed(
                                2,
                              )}
                              onChange={(e) =>
                                setSelectedExtras((prev) =>
                                  prev.map((p) =>
                                    p.item_id === ex.item_id
                                      ? {
                                          ...p,
                                          valor_unitario_centavos: Math.round(
                                            parseFloat(e.target.value || "0") *
                                              100,
                                          ),
                                        }
                                      : p,
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
                            onClick={() =>
                              setSelectedExtras((prev) =>
                                prev.filter((p) => p.item_id !== ex.item_id),
                              )
                            }
                            className="h-8 w-8 p-0 border-red-200 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2 -mt-2 mb-2 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-600">Totais</h3>
              </div>
              <div>
                <Label>Valor do Pedido (R$) *</Label>
                <Input
                  value={valorTotalMask}
                  onChange={(e) => {
                    const cents = parseCurrencyToCentavos(e.target.value);
                    setValorTotalMask(
                      e.target.value === "" ? "" : formatInputCurrency(cents),
                    );
                    setValue("valor_total_centavos", cents);
                  }}
                  className="foodmax-input"
                  placeholder="R$ 0,00"
                />
                {errors.valor_total_centavos && (
                  <span className="text-sm text-red-600">
                    {errors.valor_total_centavos.message}
                  </span>
                )}
              </div>
              <div>
                <Label>Data/Hora Finalizado</Label>
                <Input
                  type="datetime-local"
                  value={
                    watchedValues.data_hora_finalizado
                      ? new Date(watchedValues.data_hora_finalizado)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setValue(
                      "data_hora_finalizado",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    )
                  }
                  className="foodmax-input"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-600">Observação</h3>
            </div>
            <Textarea
              rows={3}
              {...register("observacao")}
              className="foodmax-input resize-none"
              placeholder="Observações..."
            />
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="w-60">
              <Label>Status</Label>
              <Select
                value={watchedValues.status}
                onValueChange={(v) => setValue("status", v as any)}
              >
                <SelectTrigger className="foodmax-input">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_PEDIDO.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" /> Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading || !hasPrerequisites}
            className="bg-foodmax-orange hover:bg-orange-600"
          >
            <Save className="w-4 h-4 mr-2" />{" "}
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={stockAlert.open} onOpenChange={(open) => setStockAlert((s) => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estoque insuficiente</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-gray-700">{stockAlert.message}</div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStockAlert({ open: false, message: "" })}>
              Fechar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => setStockAlert({ open: false, message: "" })}>
              Ok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
