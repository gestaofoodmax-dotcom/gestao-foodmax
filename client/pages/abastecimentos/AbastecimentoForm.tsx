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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import {
  Abastecimento,
  CreateAbastecimentoRequest,
  STATUS_ABASTECIMENTO,
  StatusAbastecimento,
} from "@shared/abastecimentos";
import { Estabelecimento } from "@shared/estabelecimentos";
import { Fornecedor } from "@shared/fornecedores";
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
  Building,
  Truck,
  CupSoda,
  Phone,
  MapPin,
  FileText,
  Minus,
  ShoppingBag,
  Package,
  Leaf,
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
import { DDISelect } from "@/components/ddi-select";

const schema = z.object({
  estabelecimento_id: z.number({
    required_error: "Estabelecimento é obrigatório",
  }),
  fornecedores_ids: z
    .array(z.number())
    .min(1, "Pelo menos um fornecedor é obrigatório"),
  categoria_id: z.number({
    required_error: "Categoria é obrigatória",
  }),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  ddi: z.string().min(1, "DDI é obrigatório"),
  email: z.string().email("Email inválido").nullable().optional(),
  data_hora_recebido: z.string().nullable().optional(),
  observacao: z.string().optional(),
  status: z
    .enum(["Pendente", "Enviado", "Recebido", "Cancelado"])
    .default("Pendente"),
  email_enviado: z.boolean().default(false),
  cep: z.string().nullable().optional(),
  endereco: z.string().min(1, "Endereço é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  uf: z.string().length(2, "UF deve ter 2 caracteres"),
  pais: z.string().min(1, "País é obrigatório"),
});

type FormData = z.infer<typeof schema>;

export default function AbastecimentoForm({
  isOpen,
  onClose,
  onSave,
  abastecimento,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateAbastecimentoRequest) => void;
  abastecimento: Abastecimento | null;
  isLoading?: boolean;
}) {
  const { makeRequest } = useAuthenticatedRequest();

  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(
    [],
  );
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<ItemCategoria[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [selectedFornecedoresIds, setSelectedFornecedoresIds] = useState<
    number[]
  >([]);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | null>(
    null,
  );
  const [selectedItens, setSelectedItens] = useState<
    {
      item_id: number;
      quantidade: number;
    }[]
  >([]);

  const [showEstabelecimentoAlert, setShowEstabelecimentoAlert] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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
      status: "Pendente" as StatusAbastecimento,
      ddi: "+55",
      pais: "Brasil",
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !abastecimento) {
      reset({
        estabelecimento_id: undefined as any,
        fornecedores_ids: [],
        categoria_id: undefined as any,
        telefone: "",
        ddi: "+55",
        email: "",
        data_hora_recebido: null,
        observacao: "",
        status: "Pendente",
        email_enviado: false,
        cep: "",
        endereco: "",
        cidade: "",
        uf: "",
        pais: "Brasil",
      });
      setSelectedFornecedoresIds([]);
      setSelectedCategoriaId(null);
      setSelectedItens([]);
    }
  }, [isOpen, abastecimento, reset]);

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
        if (!abastecimento && lastActive) {
          setValue("estabelecimento_id", lastActive.id);
          // Auto-populate contact info from establishment
          await loadEstabelecimentoContacts(lastActive.id);
        }
      }

      const fornResp = await makeRequest("/api/fornecedores?page=1&limit=1000");
      if (fornResp?.data) {
        const ordered = fornResp.data.sort((a: Fornecedor, b: Fornecedor) =>
          a.nome.localeCompare(b.nome),
        );
        setFornecedores(ordered);
      }

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

      setDataLoaded(true);
    } catch {
      setDataLoaded(true);
    }
  };

  const loadEstabelecimentoContacts = async (estabelecimentoId: number) => {
    try {
      console.log("Loading establishment data for ID:", estabelecimentoId);
      const response = await makeRequest(
        `/api/estabelecimentos/${estabelecimentoId}`,
      );
      console.log("Establishment response:", response);

      if (response) {
        // Load contact data from main establishment table
        setValue("telefone", response.telefone || "", { shouldDirty: true });
        setValue("ddi", response.ddi || "+55", { shouldDirty: true });
        setValue("email", response.email || "", { shouldDirty: true });

        // Load address data from related endereco table
        if (response.endereco) {
          console.log("Loading address data:", response.endereco);
          setValue("cep", response.endereco.cep || "", { shouldDirty: true });
          setValue("endereco", response.endereco.endereco || "", {
            shouldDirty: true,
          });
          setValue("cidade", response.endereco.cidade || "", {
            shouldDirty: true,
          });
          setValue("uf", response.endereco.uf || "", { shouldDirty: true });
          setValue("pais", response.endereco.pais || "Brasil", {
            shouldDirty: true,
          });
        } else {
          // Clear address fields if no address data
          setValue("cep", "", { shouldDirty: true });
          setValue("endereco", "", { shouldDirty: true });
          setValue("cidade", "", { shouldDirty: true });
          setValue("uf", "", { shouldDirty: true });
          setValue("pais", "Brasil", { shouldDirty: true });
        }
      }
    } catch (error) {
      console.error("Error loading establishment data:", error);
    }
  };

  const handleEstabelecimentoChange = async (newEstId: number) => {
    if (
      watchedValues.estabelecimento_id &&
      watchedValues.estabelecimento_id !== newEstId
    ) {
      // Show confirmation alert
      setShowEstabelecimentoAlert({
        open: true,
        message:
          "Alterar o estabelecimento irá sobrescrever os dados de contato. Deseja continuar?",
        onConfirm: async () => {
          setValue("estabelecimento_id", newEstId);
          await loadEstabelecimentoContacts(newEstId);
          setShowEstabelecimentoAlert({
            open: false,
            message: "",
            onConfirm: () => {},
          });
        },
      });
    } else {
      setValue("estabelecimento_id", newEstId);
      await loadEstabelecimentoContacts(newEstId);
    }
  };

  useEffect(() => {
    if (abastecimento) {
      reset({
        estabelecimento_id: abastecimento.estabelecimento_id,
        fornecedores_ids: abastecimento.fornecedores_ids,
        categoria_id: abastecimento.categoria_id,
        telefone: abastecimento.telefone,
        ddi: abastecimento.ddi,
        email: abastecimento.email || "",
        data_hora_recebido: abastecimento.data_hora_recebido,
        observacao: abastecimento.observacao || "",
        status: abastecimento.status,
        email_enviado: abastecimento.email_enviado,
        cep: "",
        endereco: "",
        cidade: "",
        uf: "",
        pais: "Brasil",
      });
      setSelectedFornecedoresIds(abastecimento.fornecedores_ids);
      setSelectedCategoriaId(abastecimento.categoria_id);

      // Load detailed relations for edit
      (async () => {
        try {
          const det = await makeRequest(
            `/api/abastecimentos/${abastecimento.id}`,
          );
          if (det?.itens) {
            const itensData = det.itens.map((i: any) => ({
              item_id: i.item_id,
              quantidade: i.quantidade,
            }));
            setSelectedItens(itensData);
          }
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
  }, [abastecimento, reset, makeRequest]);

  const filteredItens = useMemo(() => {
    if (!selectedCategoriaId) return [] as Item[];
    return itens.filter((i) => i.categoria_id === selectedCategoriaId);
  }, [itens, selectedCategoriaId]);

  const quantidadeTotal = useMemo(() => {
    return selectedItens.reduce((sum, item) => sum + item.quantidade, 0);
  }, [selectedItens]);

  const onSubmit = (data: FormData) => {
    console.log("=== FORM SUBMISSION START ===");
    console.log("Form data:", data);
    console.log("Selected fornecedores:", selectedFornecedoresIds);
    console.log("Selected categoria:", selectedCategoriaId);
    console.log("Selected itens:", selectedItens);

    // Clear previous validation errors
    setValidationErrors({});
    const newErrors: Record<string, string> = {};

    // Validação APENAS campos obrigatórios (marcados com *)
    if (!data.estabelecimento_id) {
      newErrors.estabelecimento_id = "Estabelecimento é obrigatório";
    }

    if (selectedFornecedoresIds.length === 0) {
      newErrors.fornecedores_ids = "Selecione pelo menos um Fornecedor";
    }

    if (!selectedCategoriaId) {
      newErrors.categoria_id = "Selecione uma Categoria";
    }

    if (!data.telefone?.trim()) {
      newErrors.telefone = "Telefone é obrigatório";
    }

    if (!data.endereco?.trim()) {
      newErrors.endereco = "Endereço é obrigatório";
    }

    if (!data.cidade?.trim()) {
      newErrors.cidade = "Cidade é obrigatória";
    }

    if (!data.uf?.trim()) {
      newErrors.uf = "UF é obrigatório";
    }

    if (!data.pais?.trim()) {
      newErrors.pais = "País é obrigatório";
    }

    // If there are validation errors, show them and prevent submission
    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      toast({
        description: "Preencha todos os campos obrigatórios marcados com *",
        variant: "destructive",
      });
      return;
    }

    // Validação de email apenas se preenchido
    const cleanEmail = data.email?.trim();
    const emailToSend = cleanEmail && cleanEmail !== "" ? cleanEmail : null;
    if (emailToSend) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailToSend)) {
        toast({
          title: "Erro de validação",
          description: "Email inválido",
          variant: "destructive",
        });
        return;
      }
    }

    const payload: CreateAbastecimentoRequest = {
      estabelecimento_id: Number(data.estabelecimento_id),
      fornecedores_ids: selectedFornecedoresIds,
      categoria_id: Number(selectedCategoriaId),
      telefone: data.telefone.trim(),
      ddi: data.ddi?.trim() || "+55",
      email: emailToSend,
      data_hora_recebido: data.data_hora_recebido || null,
      observacao: data.observacao?.trim() || null,
      status: (data.status as StatusAbastecimento) || "Pendente",
      email_enviado: Boolean(data.email_enviado),
      itens: selectedItens.map((item) => ({
        item_id: Number(item.item_id),
        quantidade: Number(item.quantidade),
      })),
      endereco: {
        cep: data.cep?.trim() || null,
        endereco: data.endereco.trim(),
        cidade: data.cidade.trim(),
        uf: data.uf.trim().toUpperCase(),
        pais: data.pais.trim(),
      },
    };

    console.log("=== FINAL PAYLOAD ===");
    console.log(JSON.stringify(payload, null, 2));
    onSave(payload);
  };

  const hasPrerequisites =
    dataLoaded &&
    estabelecimentos.length > 0 &&
    fornecedores.length > 0 &&
    categorias.length > 0 &&
    itens.length > 0;

  // Debug prerequisites
  console.log("Prerequisites check:", {
    dataLoaded,
    estabelecimentos: estabelecimentos.length,
    fornecedores: fornecedores.length,
    categorias: categorias.length,
    itens: itens.length,
    hasPrerequisites,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[85vw] h-[90vh] max-w-none overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal">
            {abastecimento ? "Editar Abastecimento" : "Novo Abastecimento"}
          </DialogTitle>
        </DialogHeader>

        {/* Warnings for missing prerequisites */}
        {dataLoaded && !hasPrerequisites && (
          <div className="mb-4 space-y-2">
            {estabelecimentos.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div className="text-sm text-yellow-800">
                    Antes de cadastrar, é necessário ter pelo menos um
                    Estabelecimento.{" "}
                    <button
                      onClick={() => window.open("/estabelecimentos", "_blank")}
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" /> (ir para módulo
                      Estabelecimentos)
                    </button>
                  </div>
                </div>
              </div>
            )}
            {fornecedores.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div className="text-sm text-yellow-800">
                    Antes de cadastrar, é necessário ter pelo menos um
                    Fornecedor.{" "}
                    <button
                      onClick={() => window.open("/fornecedores", "_blank")}
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" /> (ir para módulo
                      Fornecedores)
                    </button>
                  </div>
                </div>
              </div>
            )}
            {categorias.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div className="text-sm text-yellow-800">
                    Antes de cadastrar, é necessário ter pelo menos uma
                    Categoria.{" "}
                    <button
                      onClick={() => window.open("/itens", "_blank")}
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" /> (ir para módulo Itens)
                    </button>
                  </div>
                </div>
              </div>
            )}
            {itens.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div className="text-sm text-yellow-800">
                    Antes de cadastrar, é necessário ter pelo menos um Item.{" "}
                    <button
                      onClick={() => window.open("/itens", "_blank")}
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" /> (ir para módulo Itens)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warning about category limitation */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <div className="text-sm text-blue-800">
              <strong>Atenção:</strong> Cada compra só é possível cadastrar para
              1 categoria.
            </div>
          </div>
        </div>

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
                              onSelect={() => handleEstabelecimentoChange(e.id)}
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
                <Label>Fornecedores *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between foodmax-input"
                    >
                      {selectedFornecedoresIds.length > 0
                        ? `${selectedFornecedoresIds.length} selecionado(s)`
                        : "Selecione Fornecedores"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Filtrar fornecedores..." />
                      <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {fornecedores.map((f) => (
                            <CommandItem
                              key={f.id}
                              onSelect={() =>
                                setSelectedFornecedoresIds((prev) =>
                                  prev.includes(f.id)
                                    ? prev.filter((id) => id !== f.id)
                                    : [...prev, f.id],
                                )
                              }
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedFornecedoresIds.includes(f.id)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {f.nome}
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

          {/* Itens do Abastecimento */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-600">
                Itens do Abastecimento
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Categoria *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between foodmax-input"
                    >
                      {selectedCategoriaId
                        ? categorias.find((c) => c.id === selectedCategoriaId)
                            ?.nome
                        : "Selecione Categoria"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Filtrar categorias..." />
                      <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {categorias.map((cat) => (
                            <CommandItem
                              key={cat.id}
                              onSelect={() => {
                                setSelectedCategoriaId(cat.id);
                                setValue("categoria_id", cat.id);
                                // Clear selected items when category changes
                                setSelectedItens([]);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCategoriaId === cat.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {cat.nome}
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
                      disabled={!selectedCategoriaId}
                      className={cn(
                        "w-full justify-between foodmax-input",
                        !selectedCategoriaId && "opacity-60 cursor-not-allowed",
                      )}
                    >
                      {selectedCategoriaId
                        ? "Selecionar Itens"
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
                          {filteredItens.map((item) => {
                            const isLow = (item.estoque_atual || 0) < 3;
                            const isOut = (item.estoque_atual || 0) === 0;
                            const isAdded = selectedItens.some(
                              (i) => i.item_id === item.id,
                            );
                            return (
                              <CommandItem
                                key={item.id}
                                onSelect={() =>
                                  !isAdded &&
                                  setSelectedItens((prev) => [
                                    ...prev,
                                    {
                                      item_id: item.id,
                                      quantidade: 1,
                                    },
                                  ])
                                }
                                disabled={isAdded}
                                className={cn(isAdded ? "opacity-50" : "")}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    {isLow && (
                                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                                    )}
                                    <span>{item.nome}</span>
                                    {isAdded && (
                                      <Badge variant="secondary">
                                        Já adicionado
                                      </Badge>
                                    )}
                                    {isOut && (
                                      <Badge className="bg-red-50 text-red-700 border-red-200">
                                        Sem estoque
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-500">
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

            {/* Shopping Cart */}
            {selectedItens.length > 0 && (
              <div className="pt-4">
                <div className="space-y-2">
                  {selectedItens.map((selectedItem) => {
                    const item = itens.find(
                      (i) => i.id === selectedItem.item_id,
                    );
                    if (!item) return null;
                    return (
                      <div
                        key={selectedItem.item_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{item.nome}</div>
                          <div className="text-xs text-gray-600">
                            Estoque Atual: {item.estoque_atual ?? 0}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <Label className="text-xs">Quantidade</Label>
                            <Input
                              type="number"
                              min="1"
                              value={selectedItem.quantidade}
                              onChange={(e) => {
                                const newQuantity = Math.max(
                                  1,
                                  parseInt(e.target.value) || 1,
                                );
                                setSelectedItens((prev) =>
                                  prev.map((p) =>
                                    p.item_id === selectedItem.item_id
                                      ? { ...p, quantidade: newQuantity }
                                      : p,
                                  ),
                                );
                              }}
                              className="w-20 h-8 text-center"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedItens((prev) =>
                                prev.filter(
                                  (p) => p.item_id !== selectedItem.item_id,
                                ),
                              )
                            }
                            className="h-8 w-8 p-0 border-red-200 hover:bg-red-50"
                          >
                            <Minus className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conditional Horizontal gray line and Quantidade Total */}
            {selectedItens.length > 0 && (
              <div className="pt-4">
                <hr className="border-t border-gray-300 mb-4" />
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Quantidade Total: </span>
                  <span className="font-semibold">{quantidadeTotal}</span>
                </div>
              </div>
            )}
          </div>

          {/* Contato */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Contato</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Telefone *</Label>
                <div className="flex gap-2">
                  <DDISelect
                    value={watchedValues.ddi}
                    onChange={(value) => setValue("ddi", value)}
                  />
                  <Input
                    id="telefone"
                    {...register("telefone")}
                    placeholder="DDD + número telefone"
                    className="foodmax-input flex-1"
                    maxLength={15}
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.value = target.value.replace(/[^0-9]/g, "");
                    }}
                  />
                </div>
                {errors.telefone && (
                  <span className="text-sm text-red-600">
                    {errors.telefone.message}
                  </span>
                )}
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="foodmax-input"
                />
                {errors.email && (
                  <span className="text-sm text-red-600">
                    {errors.email.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-600">Endereço</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>CEP</Label>
                <Input
                  id="cep"
                  {...register("cep")}
                  className="foodmax-input"
                  maxLength={8}
                />
              </div>
              <div>
                <Label>Endereço *</Label>
                <Input
                  id="endereco"
                  {...register("endereco")}
                  className="foodmax-input"
                />
                {errors.endereco && (
                  <span className="text-sm text-red-600">
                    {errors.endereco.message}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label>Cidade *</Label>
                  <Input
                    id="cidade"
                    {...register("cidade")}
                    className="foodmax-input"
                  />
                  {errors.cidade && (
                    <span className="text-sm text-red-600">
                      {errors.cidade.message}
                    </span>
                  )}
                </div>
                <div>
                  <Label>UF *</Label>
                  <Input
                    id="uf"
                    {...register("uf")}
                    className="foodmax-input"
                    maxLength={2}
                  />
                  {errors.uf && (
                    <span className="text-sm text-red-600">
                      {errors.uf.message}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label>País *</Label>
                <Input
                  id="pais"
                  {...register("pais")}
                  className="foodmax-input"
                  defaultValue="Brasil"
                />
                {errors.pais && (
                  <span className="text-sm text-red-600">
                    {errors.pais.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-600">Observação</h3>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea
                rows={3}
                {...register("observacao")}
                className="foodmax-input resize-none"
                placeholder="Observação do abastecimento..."
              />
            </div>
            <div>
              <Label>Data/Hora Recebido</Label>
              <Input
                type="datetime-local"
                value={
                  watchedValues.data_hora_recebido
                    ? new Date(watchedValues.data_hora_recebido)
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setValue(
                    "data_hora_recebido",
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  )
                }
                className="foodmax-input"
              />
            </div>
          </div>

          {/* Status */}
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
                  {STATUS_ABASTECIMENTO.map((s) => (
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
            disabled={isLoading}
            className="bg-foodmax-orange hover:bg-orange-600"
          >
            <Save className="w-4 h-4 mr-2" />{" "}
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog
        open={showEstabelecimentoAlert.open}
        onOpenChange={(open) =>
          setShowEstabelecimentoAlert((s) => ({ ...s, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-gray-700">
            {showEstabelecimentoAlert.message}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setShowEstabelecimentoAlert({
                  open: false,
                  message: "",
                  onConfirm: () => {},
                })
              }
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={showEstabelecimentoAlert.onConfirm}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
