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
import { toast } from "@/hooks/use-toast";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import { DDISelect } from "@/components/ddi-select";
import {
  Entrega,
  CreateEntregaRequest,
  TIPOS_ENTREGA,
  FORMAS_PAGAMENTO_ENTREGA,
  STATUS_ENTREGA,
  parseCurrencyToCentavos,
  formatCurrencyBRL,
} from "@shared/entregas";
import { Estabelecimento } from "@shared/estabelecimentos";
import { Pedido } from "@shared/pedidos";
import { Cliente } from "@shared/clientes";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronsUpDown, Check, X, Save, FileText, DollarSign, Calendar, Users, Phone, MapPin } from "lucide-react";
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
  estabelecimento_id: z.number({ required_error: "Estabelecimento é obrigatório" }),
  tipo_entrega: z.enum(["Própria", "iFood", "Rappi", "UberEats", "Outro"]).default("Própria"),
  pedido_id: z.number().int().positive().nullable().optional(),
  codigo_pedido_app: z.string().nullable().optional(),
  valor_pedido: z.number().int().nonnegative().default(0),
  taxa_extra: z.number().int().nonnegative().default(0),
  valor_entrega: z.number().int().nonnegative().default(0),
  forma_pagamento: z
    .enum(["PIX", "Cartão de Débito", "Cartão de Crédito", "Dinheiro", "Outro"]) 
    .default("PIX"),
  cliente_id: z.number().int().positive().nullable().optional(),
  ddi: z.string().min(1),
  telefone: z.string().min(1).max(15),
  data_hora_saida: z.string().nullable().optional(),
  data_hora_entregue: z.string().nullable().optional(),
  observacao: z.string().nullable().optional(),
  status: z.enum(["Pendente", "Saiu", "Entregue", "Cancelado"]).default("Pendente"),
  cep: z.string().max(8).nullable().optional(),
  endereco: z.string().min(1),
  cidade: z.string().min(1),
  uf: z.string().length(2),
  pais: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export default function EntregaForm({
  isOpen,
  onClose,
  onSave,
  entrega,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateEntregaRequest) => void;
  entrega: Entrega | null;
  isLoading?: boolean;
}) {
  const { makeRequest } = useAuthenticatedRequest();

  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [showPedidoClienteAlert, setShowPedidoClienteAlert] = useState<{ open: boolean; onConfirm: () => void; message: string }>({ open: false, onConfirm: () => {}, message: "" });

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo_entrega: "Própria",
      forma_pagamento: "PIX",
      status: "Pendente",
      ddi: "+55",
      pais: "Brasil",
    },
  });

  const values = watch();

  const selectedTipo = values.tipo_entrega;

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !entrega) {
      reset({
        estabelecimento_id: undefined as any,
        tipo_entrega: "Própria",
        pedido_id: null,
        codigo_pedido_app: null,
        valor_pedido: 0,
        taxa_extra: 0,
        valor_entrega: 0,
        forma_pagamento: "PIX",
        cliente_id: null,
        ddi: "+55",
        telefone: "",
        data_hora_saida: null,
        data_hora_entregue: null,
        observacao: "",
        status: "Pendente",
        cep: "",
        endereco: "",
        cidade: "",
        uf: "",
        pais: "Brasil",
      });
    }
  }, [isOpen, entrega, reset]);

  const loadData = async () => {
    try {
      const estResp = await makeRequest(`/api/estabelecimentos?page=1&limit=1000`);
      const orderedEst = Array.isArray(estResp?.data)
        ? estResp.data.sort((a: Estabelecimento, b: Estabelecimento) => (a.data_cadastro < b.data_cadastro ? 1 : -1))
        : [];
      setEstabelecimentos(orderedEst);
      const lastActive = orderedEst.find((e: Estabelecimento) => e.ativo);
      if (!entrega && lastActive) {
        setValue("estabelecimento_id", lastActive.id);
      }

      const pedResp = await makeRequest(`/api/pedidos?page=1&limit=1000&status=Pendente`);
      setPedidos(Array.isArray(pedResp?.data) ? pedResp.data : []);

      const cliResp = await makeRequest(`/api/clientes?page=1&limit=1000`);
      const orderedCli = Array.isArray(cliResp?.data)
        ? cliResp.data.sort((a: Cliente, b: Cliente) => a.nome.localeCompare(b.nome))
        : [];
      setClientes(orderedCli);

      setDataLoaded(true);
    } catch {
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    if (entrega) {
      reset({
        estabelecimento_id: entrega.estabelecimento_id,
        tipo_entrega: entrega.tipo_entrega,
        pedido_id: entrega.pedido_id ?? null,
        codigo_pedido_app: entrega.codigo_pedido_app ?? null,
        valor_pedido: entrega.valor_pedido ?? 0,
        taxa_extra: entrega.taxa_extra ?? 0,
        valor_entrega: entrega.valor_entrega ?? 0,
        forma_pagamento: entrega.forma_pagamento,
        cliente_id: entrega.cliente_id ?? null,
        ddi: entrega.ddi,
        telefone: entrega.telefone,
        data_hora_saida: entrega.data_hora_saida,
        data_hora_entregue: entrega.data_hora_entregue,
        observacao: entrega.observacao ?? "",
        status: entrega.status,
        cep: "",
        endereco: "",
        cidade: "",
        uf: "",
        pais: "Brasil",
      });
      (async () => {
        try {
          const det = await makeRequest(`/api/entregas/${entrega.id}`);
          if (det?.endereco) {
            setValue("cep", det.endereco.cep || "");
            setValue("endereco", det.endereco.endereco || "");
            setValue("cidade", det.endereco.cidade || "");
            setValue("uf", det.endereco.uf || "");
            setValue("pais", det.endereco.pais || "Brasil");
          }
        } catch {}
      })();
    }
  }, [entrega, reset, makeRequest, setValue]);

  // Currency inputs as text (no R$). Empty when creating, filled when editing.
  const [valorPedidoText, setValorPedidoText] = useState<string>("");
  const [taxaExtraText, setTaxaExtraText] = useState<string>("");
  const [valorEntregaText, setValorEntregaText] = useState<string>("");

  useEffect(() => {
    if (entrega) {
      setValorPedidoText(((entrega.valor_pedido ?? 0) / 100).toFixed(2));
      setTaxaExtraText(((entrega.taxa_extra ?? 0) / 100).toFixed(2));
      setValorEntregaText(((entrega.valor_entrega ?? 0) / 100).toFixed(2));
    } else {
      setValorPedidoText("");
      setTaxaExtraText("");
      setValorEntregaText("");
    }
  }, [isOpen, entrega]);

  // recompute valor_entrega when valor_pedido or taxa_extra changes
  useEffect(() => {
    const computed = (values.valor_pedido || 0) + (values.taxa_extra || 0);
    setValue("valor_entrega", computed);
    if (!entrega) setValorEntregaText(computed === 0 ? "" : (computed / 100).toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.valor_pedido, values.taxa_extra]);

  const onSelectPedido = async (pedidoId: number) => {
    setValue("pedido_id", pedidoId, { shouldDirty: true });
    try {
      const det = await makeRequest(`/api/pedidos/${pedidoId}`);
      if (det) {
        const valor = det.valor_total || 0;
        setValue("valor_pedido", valor, { shouldDirty: true });
        setValorPedidoText((valor / 100).toFixed(2));
        if (det.cliente_id) {
          setShowPedidoClienteAlert({
            open: true,
            message: "Este Pedido possui um Cliente associado. Deseja preencher os dados do Cliente automaticamente?",
            onConfirm: async () => {
              try {
                setValue("cliente_id", det.cliente_id, { shouldDirty: true });
                const cli = await makeRequest(`/api/clientes/${det.cliente_id}`);
                if (cli) {
                  setValue("ddi", cli.ddi || "+55", { shouldDirty: true });
                  setValue("telefone", cli.telefone || "", { shouldDirty: true });
                  if (cli.endereco) {
                    setValue("cep", cli.endereco.cep || "", { shouldDirty: true });
                    setValue("endereco", cli.endereco.endereco || "", { shouldDirty: true });
                    setValue("cidade", cli.endereco.cidade || "", { shouldDirty: true });
                    setValue("uf", cli.endereco.uf || "", { shouldDirty: true });
                    setValue("pais", cli.endereco.pais || "Brasil", { shouldDirty: true });
                  }
                }
              } catch {}
              setShowPedidoClienteAlert({ open: false, onConfirm: () => {}, message: "" });
            },
          });
        }
      }
    } catch {}
  };

  const onSubmit = (data: FormData) => {
    // Validar obrigatórios marcados com *
    const errorsLocal: string[] = [];
    if (!data.estabelecimento_id) errorsLocal.push("Estabelecimento");
    if (!data.endereco?.trim()) errorsLocal.push("Endereço");
    if (!data.cidade?.trim()) errorsLocal.push("Cidade");
    if (!data.uf?.trim()) errorsLocal.push("UF");
    if (!data.pais?.trim()) errorsLocal.push("País");
    if (!data.telefone?.trim()) errorsLocal.push("Telefone");
    if (!data.forma_pagamento) errorsLocal.push("Forma de Pagamento");
    if (data.tipo_entrega === "Própria") {
      if (!data.pedido_id) errorsLocal.push("Pedido");
    } else {
      if (!data.codigo_pedido_app || !String(data.codigo_pedido_app).trim()) errorsLocal.push("Código Pedido via APP");
    }
    if (errorsLocal.length > 0) {
      toast({ description: `Preencha os campos obrigatórios: ${errorsLocal.join(", ")}`, variant: "destructive" });
      return;
    }

    const payload: CreateEntregaRequest = {
      estabelecimento_id: Number(data.estabelecimento_id),
      tipo_entrega: data.tipo_entrega,
      pedido_id: data.tipo_entrega === "Própria" ? (data.pedido_id ?? null) : null,
      codigo_pedido_app: data.tipo_entrega === "Própria" ? null : (data.codigo_pedido_app || null),
      valor_pedido: Number(data.valor_pedido || 0),
      taxa_extra: Number(data.taxa_extra || 0),
      valor_entrega: Number(data.valor_entrega || 0),
      forma_pagamento: data.forma_pagamento,
      cliente_id: data.cliente_id ?? null,
      ddi: data.ddi?.trim() || "+55",
      telefone: data.telefone.trim(),
      data_hora_saida: data.data_hora_saida || null,
      data_hora_entregue: data.data_hora_entregue || null,
      observacao: data.observacao?.trim() || null,
      status: data.status || "Pendente",
      endereco: {
        cep: data.cep?.trim() || null,
        endereco: data.endereco.trim(),
        cidade: data.cidade.trim(),
        uf: data.uf.trim().toUpperCase(),
        pais: data.pais.trim(),
      },
    };

    onSave(payload);
  };

  const hasEst = dataLoaded && estabelecimentos.length > 0;
  const hasPedidos = dataLoaded && pedidos.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[85vw] h-[90vh] max-w-none overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal">{entrega ? "Editar Entrega" : "Nova Entrega"}</DialogTitle>
        </DialogHeader>

        {/* Avisos topo */}
        {dataLoaded && !hasEst && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Antes de cadastrar, é necessário ter pelo menos um Estabelecimento. {" "}
            <button onClick={() => window.open("/estabelecimentos", "_blank")} className="text-blue-600 hover:text-blue-800 underline">(ir para módulo Estabelecimentos)</button>
          </div>
        )}
        {dataLoaded && hasEst && !hasPedidos && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Antes de cadastrar, é necessário ter pelo menos um Pedido. {" "}
            <button onClick={() => window.open("/pedidos", "_blank")} className="text-blue-600 hover:text-blue-800 underline">(ir para módulo Pedidos)</button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados Básicos */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Estabelecimento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between foodmax-input", errors.estabelecimento_id && "border-red-500")}> 
                      {values.estabelecimento_id ? estabelecimentos.find((e) => e.id === values.estabelecimento_id)?.nome : "Selecione"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Filtrar estabelecimento..." />
                      <CommandEmpty>Nenhum estabelecimento encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {estabelecimentos.map((e) => (
                            <CommandItem key={e.id} onSelect={() => setValue("estabelecimento_id", e.id, { shouldDirty: true })}>
                              <Check className={cn("mr-2 h-4 w-4", values.estabelecimento_id === e.id ? "opacity-100" : "opacity-0")} />
                              {e.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Tipo de Entrega *</Label>
                <Select value={values.tipo_entrega as any} onValueChange={(v) => { setValue("tipo_entrega", v as any); if (v !== "Própria") { setValue("pedido_id", null); } else { setValue("codigo_pedido_app", null); } }}>
                  <SelectTrigger className="foodmax-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_ENTREGA.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTipo === "Própria" ? (
                <>
                  <div>
                    <Label>Pedido *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between foodmax-input")}>
                          {values.pedido_id ? (() => { const p = pedidos.find((x) => x.id === values.pedido_id); return p ? `${p.codigo} - ${(p.valor_total/100).toFixed(2)}` : "Selecione"; })() : "Selecione"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Filtrar pedido (código)..." />
                          <CommandEmpty>Nenhum pedido encontrado.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {pedidos.map((p) => (
                                <CommandItem key={p.id} onSelect={() => onSelectPedido(p.id)}>
                                  <Check className={cn("mr-2 h-4 w-4", values.pedido_id === p.id ? "opacity-100" : "opacity-0")} />
                                  {p.codigo} - {(p.valor_total/100).toFixed(2)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Cliente</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between foodmax-input">
                          {values.cliente_id ? (clientes.find((c) => c.id === values.cliente_id)?.nome || "Selecione") : "Não Cliente"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Filtrar cliente..." />
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              <CommandItem onSelect={() => setValue("cliente_id", null)}>
                                <Check className={cn("mr-2 h-4 w-4", !values.cliente_id ? "opacity-100" : "opacity-0")} />
                                Não Cliente
                              </CommandItem>
                              {clientes.map((c) => (
                                <CommandItem key={c.id} onSelect={async () => {
                                  if (c.id !== values.cliente_id) {
                                    setValue("cliente_id", c.id);
                                    setShowPedidoClienteAlert({
                                      open: true,
                                      message: "Preencher dados de Telefone e Endereço com o Cliente selecionado?",
                                      onConfirm: async () => {
                                        try {
                                          const cli = await makeRequest(`/api/clientes/${c.id}`);
                                          if (cli) {
                                            setValue("ddi", cli.ddi || "+55", { shouldDirty: true });
                                            setValue("telefone", cli.telefone || "", { shouldDirty: true });
                                            if (cli.endereco) {
                                              setValue("cep", cli.endereco.cep || "", { shouldDirty: true });
                                              setValue("endereco", cli.endereco.endereco || "", { shouldDirty: true });
                                              setValue("cidade", cli.endereco.cidade || "", { shouldDirty: true });
                                              setValue("uf", cli.endereco.uf || "", { shouldDirty: true });
                                              setValue("pais", cli.endereco.pais || "Brasil", { shouldDirty: true });
                                            }
                                          }
                                        } catch {}
                                        setShowPedidoClienteAlert({ open: false, onConfirm: () => {}, message: "" });
                                      },
                                    });
                                  }
                                }}>
                                  <Check className={cn("mr-2 h-4 w-4", values.cliente_id === c.id ? "opacity-100" : "opacity-0")} />
                                  {c.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Código Pedido via APP *</Label>
                    <Input {...register("codigo_pedido_app" as any)} className="foodmax-input" maxLength={64} />
                  </div>
                  <div>
                    <Label>Cliente</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between foodmax-input">
                          {values.cliente_id ? (clientes.find((c) => c.id === values.cliente_id)?.nome || "Selecione") : "Não Cliente"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Filtrar cliente..." />
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              <CommandItem onSelect={() => setValue("cliente_id", null)}>
                                <Check className={cn("mr-2 h-4 w-4", !values.cliente_id ? "opacity-100" : "opacity-0")} />
                                Não Cliente
                              </CommandItem>
                              {clientes.map((c) => (
                                <CommandItem key={c.id} onSelect={async () => {
                                  if (c.id !== values.cliente_id) {
                                    setValue("cliente_id", c.id);
                                    setShowPedidoClienteAlert({
                                      open: true,
                                      message: "Preencher dados de Telefone e Endereço com o Cliente selecionado?",
                                      onConfirm: async () => {
                                        try {
                                          const cli = await makeRequest(`/api/clientes/${c.id}`);
                                          if (cli) {
                                            setValue("ddi", cli.ddi || "+55", { shouldDirty: true });
                                            setValue("telefone", cli.telefone || "", { shouldDirty: true });
                                            if (cli.endereco) {
                                              setValue("cep", cli.endereco.cep || "", { shouldDirty: true });
                                              setValue("endereco", cli.endereco.endereco || "", { shouldDirty: true });
                                              setValue("cidade", cli.endereco.cidade || "", { shouldDirty: true });
                                              setValue("uf", cli.endereco.uf || "", { shouldDirty: true });
                                              setValue("pais", cli.endereco.pais || "Brasil", { shouldDirty: true });
                                            }
                                          }
                                        } catch {}
                                        setShowPedidoClienteAlert({ open: false, onConfirm: () => {}, message: "" });
                                      },
                                    });
                                  }
                                }}>
                                  <Check className={cn("mr-2 h-4 w-4", values.cliente_id === c.id ? "opacity-100" : "opacity-0")} />
                                  {c.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* Valores */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-600">Valores</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Valor do Pedido (R$)</Label>
                <Input
                  value={valorPedidoText}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.,]/g, "");
                    setValorPedidoText(raw);
                    const c = parseCurrencyToCentavos(raw);
                    setValue("valor_pedido", c, { shouldDirty: true });
                  }}
                  placeholder=""
                  className="foodmax-input"
                />
              </div>
              <div>
                <Label>Taxa Extra (R$)</Label>
                <Input
                  value={taxaExtraText}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.,]/g, "");
                    setTaxaExtraText(raw);
                    const c = parseCurrencyToCentavos(raw);
                    setValue("taxa_extra", c, { shouldDirty: true });
                  }}
                  placeholder=""
                  className="foodmax-input"
                />
              </div>
              <div>
                <Label>Valor da Entrega (R$) *</Label>
                <Input
                  value={valorEntregaText}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.,]/g, "");
                    setValorEntregaText(raw);
                    const c = parseCurrencyToCentavos(raw);
                    setValue("valor_entrega", c, { shouldDirty: true });
                  }}
                  placeholder=""
                  className={cn("foodmax-input", (!values.valor_entrega && values.valor_entrega !== 0) && "border-red-500")}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Forma de Pagamento *</Label>
                <Select value={values.forma_pagamento as any} onValueChange={(v) => setValue("forma_pagamento", v as any)}>
                  <SelectTrigger className="foodmax-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO_ENTREGA.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

          {/* Contato da Entrega */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Contato da Entrega</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Telefone</Label>
                <div className="flex gap-2">
                  <DDISelect value={values.ddi} onChange={(v) => setValue("ddi", v)} />
                  <Input {...register("telefone")} placeholder="DDD + número telefone" className={cn("foodmax-input flex-1", errors.telefone && "border-red-500")} maxLength={15} onInput={(e) => { const t = e.target as HTMLInputElement; t.value = t.value.replace(/[^0-9]/g, ""); }} />
                </div>
              </div>
            </div>
          </div>

          {/* Endereço da Entrega */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-600">Endereço da Entrega</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>CEP</Label>
                <Input {...register("cep" as any)} className="foodmax-input" maxLength={8} onInput={(e) => { const t = e.target as HTMLInputElement; t.value = t.value.replace(/[^0-9]/g, ""); }} />
              </div>
              <div>
                <Label>Endereço *</Label>
                <Input {...register("endereco")} className={cn("foodmax-input", errors.endereco && "border-red-500")} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label>Cidade *</Label>
                  <Input {...register("cidade")} className={cn("foodmax-input", errors.cidade && "border-red-500")} />
                </div>
                <div>
                  <Label>UF *</Label>
                  <Input {...register("uf")} className={cn("foodmax-input", errors.uf && "border-red-500")} maxLength={2} />
                </div>
              </div>
              <div>
                <Label>País *</Label>
                <Input {...register("pais")} className={cn("foodmax-input", errors.pais && "border-red-500")} defaultValue="Brasil" />
              </div>
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-600">Observação</h3>
            </div>
            <div className="md:col-span-2">
              <Textarea rows={3} {...register("observacao" as any)} className="foodmax-input resize-none" />
            </div>
            </div>
          </div>

          {/* Endereço da Entrega */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-600">Endereço da Entrega</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>CEP</Label>
                <Input {...register("cep" as any)} className="foodmax-input" maxLength={8} onInput={(e) => { const t = e.target as HTMLInputElement; t.value = t.value.replace(/[^0-9]/g, ""); }} />
              </div>
              <div>
                <Label>Endereço *</Label>
                <Input {...register("endereco")} className={cn("foodmax-input", errors.endereco && "border-red-500")} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label>Cidade *</Label>
                  <Input {...register("cidade")} className={cn("foodmax-input", errors.cidade && "border-red-500")} />
                </div>
                <div>
                  <Label>UF *</Label>
                  <Input {...register("uf")} className={cn("foodmax-input", errors.uf && "border-red-500")} maxLength={2} />
                </div>
              </div>
              <div>
                <Label>País *</Label>
                <Input {...register("pais")} className={cn("foodmax-input", errors.pais && "border-red-500")} defaultValue="Brasil" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white p-4 rounded-lg border w-full">
            <Label>Status</Label>
            <div className="w-60">
              <Select value={values.status as any} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger className="foodmax-input"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  {STATUS_ENTREGA.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
          <Button type="submit" onClick={handleSubmit(onSubmit)} disabled={isLoading} className="bg-foodmax-orange hover:bg-orange-600">
            <Save className="w-4 h-4 mr-2" /> {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showPedidoClienteAlert.open} onOpenChange={(open) => setShowPedidoClienteAlert((s) => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar preenchimento</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-gray-700">{showPedidoClienteAlert.message}</div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPedidoClienteAlert({ open: false, onConfirm: () => {}, message: "" })}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={showPedidoClienteAlert.onConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
