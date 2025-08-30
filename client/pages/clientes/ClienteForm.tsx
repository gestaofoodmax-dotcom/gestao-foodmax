import { useEffect, useState } from "react";
import { useForm, FieldErrors } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DDISelect } from "@/components/ddi-select";
import { Info, MapPin, Phone, Save, X, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import { GENEROS, Cliente, ClienteFormData } from "@shared/clientes";
import { validateCEP } from "@shared/estabelecimentos";
import { Estabelecimento } from "@shared/estabelecimentos";

const clienteSchema = z.object({
  estabelecimento_id: z.number({
    invalid_type_error: "Estabelecimento é obrigatório",
  }),
  nome: z.string().min(1, "Nome é obrigatório"),
  genero: z.enum(["Masculino", "Feminino", "Outro"]).optional(),
  profissao: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  ddi: z.string().min(1, "DDI é obrigatório"),
  telefone: z
    .string()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(15, "Telefone deve ter no máximo 15 dígitos"),
  ativo: z.boolean().default(true),
  aceita_promocao_email: z.boolean().default(false),
  cep: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return validateCEP(val);
    }, "CEP deve ter 8 dígitos"),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2, "UF deve ter 2 caracteres").optional(),
  pais: z.string().default("Brasil"),
});

type ClienteFormSchema = z.infer<typeof clienteSchema>;

interface ClienteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ClienteFormData) => Promise<void>;
  cliente?: Cliente | null;
  isLoading?: boolean;
}

export function ClienteForm({
  isOpen,
  onClose,
  onSave,
  cliente,
  isLoading = false,
}: ClienteFormProps) {
  const isEditing = !!cliente;
  const { makeRequest } = useAuthenticatedRequest();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(
    [],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClienteFormSchema>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      estabelecimento_id: undefined as unknown as number,
      nome: "",
      genero: undefined,
      profissao: "",
      email: "",
      ddi: "+55",
      telefone: "",
      ativo: true,
      aceita_promocao_email: false,
      cep: "",
      endereco: "",
      cidade: "",
      uf: "",
      pais: "Brasil",
    },
  });

  const watchedDDI = watch("ddi");
  const watchedAtivo = watch("ativo");
  const watchedAceita = watch("aceita_promocao_email");
  const watchedEstabelecimentoId = watch("estabelecimento_id");

  useEffect(() => {
    if (!isOpen) return;
    const loadEstabelecimentos = async () => {
      try {
        let data: Estabelecimento[] = [];
        try {
          const params = new URLSearchParams({ page: "1", limit: "100" });
          const res = await makeRequest(`/api/estabelecimentos?${params}`);
          data = (res.data || []) as Estabelecimento[];
        } catch {
          const raw = localStorage.getItem("fm_estabelecimentos");
          data = raw ? (JSON.parse(raw) as Estabelecimento[]) : [];
        }
        // Order by data_cadastro desc
        data.sort((a, b) => (a.data_cadastro < b.data_cadastro ? 1 : -1));
        setEstabelecimentos(data);

        if (!isEditing) {
          const lastActive = data.find((e) => e.ativo);
          if (lastActive) setValue("estabelecimento_id", lastActive.id);
        }
      } catch (e: any) {
        console.error(e);
      }
    };
    loadEstabelecimentos();
  }, [isOpen, isEditing, makeRequest, setValue]);

  useEffect(() => {
    if (isOpen) {
      if (cliente) {
        reset({
          estabelecimento_id: cliente.estabelecimento_id,
          nome: cliente.nome,
          genero: cliente.genero,
          profissao: cliente.profissao || "",
          email: cliente.email || "",
          ddi: cliente.ddi,
          telefone: cliente.telefone,
          ativo: cliente.ativo,
          aceita_promocao_email: !!cliente.aceita_promocao_email,
          cep: cliente.endereco?.cep || "",
          endereco: cliente.endereco?.endereco || "",
          cidade: cliente.endereco?.cidade || "",
          uf: cliente.endereco?.uf || "",
          pais: cliente.endereco?.pais || "Brasil",
        });
      } else {
        reset({
          estabelecimento_id: watchedEstabelecimentoId as any,
          nome: "",
          genero: undefined,
          profissao: "",
          email: "",
          ddi: "+55",
          telefone: "",
          ativo: true,
          aceita_promocao_email: false,
          cep: "",
          endereco: "",
          cidade: "",
          uf: "",
          pais: "Brasil",
        });
      }
    }
  }, [isOpen, cliente, reset]);

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/\D/g, "");
    setValue("cep", numbers.slice(0, 8));
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/\D/g, "");
    setValue("telefone", numbers.slice(0, 15));
  };

  const onSubmit = async (data: ClienteFormSchema) => {
    try {
      await onSave(data);
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o cliente",
        variant: "destructive",
      });
    }
  };

  const onInvalid = (formErrors: FieldErrors<ClienteFormSchema>) => {
    const labelsMap: Record<string, string> = {
      estabelecimento_id: "Estabelecimento",
      nome: "Nome",
      email: "Email",
      ddi: "DDI",
      telefone: "Telefone",
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

  const getFieldError = (name: keyof ClienteFormSchema) =>
    errors[name]?.message;
  const getInputClassName = (name: keyof ClienteFormSchema) =>
    `foodmax-input ${errors[name] ? "border-red-500 focus:ring-red-500" : ""}`;

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
            {isEditing ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>

        {estabelecimentos.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <p>
                Antes de cadastrar, é necessário ter pelo menos um
                Estabelecimento.{" "}
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
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="space-y-6"
        >
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Estabelecimento *</Label>
                <Select
                  value={
                    watchedEstabelecimentoId
                      ? String(watchedEstabelecimentoId)
                      : undefined
                  }
                  onValueChange={(v) =>
                    setValue("estabelecimento_id", Number(v))
                  }
                >
                  <SelectTrigger
                    className={getInputClassName("estabelecimento_id")}
                  >
                    <SelectValue placeholder="Selecione o estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {estabelecimentos
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
                {getFieldError("estabelecimento_id") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("estabelecimento_id")}
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
                  className={getInputClassName("nome")}
                  placeholder="Nome do cliente"
                />
                {getFieldError("nome") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("nome")}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Gênero</Label>
                <Select
                  value={watch("genero") as any}
                  onValueChange={(v) => setValue("genero", v as any)}
                >
                  <SelectTrigger className={getInputClassName("genero")}>
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENEROS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="profissao" className="text-sm font-medium">
                  Profissão
                </Label>
                <Input
                  id="profissao"
                  {...register("profissao")}
                  className={getInputClassName("profissao")}
                  placeholder="Profissão"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Contato</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className={getInputClassName("email")}
                  placeholder="email@exemplo.com"
                />
                {getFieldError("email") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("email")}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="telefone" className="text-sm font-medium">
                  Telefone *
                </Label>
                <div className="flex gap-2">
                  <DDISelect
                    value={watchedDDI}
                    onChange={(v) => setValue("ddi", v)}
                    className={`foodmax-input ${getFieldError("ddi") ? "border-red-500" : ""}`}
                  />
                  <Input
                    id="telefone"
                    {...register("telefone")}
                    onChange={handleTelefoneChange}
                    className={`flex-1 ${getInputClassName("telefone")}`}
                    placeholder="DDD + número telefone"
                    maxLength={15}
                  />
                </div>
                {(getFieldError("ddi") || getFieldError("telefone")) && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("ddi") || getFieldError("telefone")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-600">Endereço</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cep" className="text-sm font-medium">
                  CEP
                </Label>
                <Input
                  id="cep"
                  {...register("cep")}
                  onChange={handleCEPChange}
                  className={getInputClassName("cep")}
                  placeholder="00000000"
                  maxLength={8}
                />
                {getFieldError("cep") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("cep")}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="endereco" className="text-sm font-medium">
                  Endereço
                </Label>
                <Input
                  id="endereco"
                  {...register("endereco")}
                  className={getInputClassName("endereco")}
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div>
                    <Label htmlFor="cidade" className="text-sm font-medium">
                      Cidade
                    </Label>
                    <Input
                      id="cidade"
                      {...register("cidade")}
                      className={getInputClassName("cidade")}
                      placeholder="Nome da cidade"
                    />
                  </div>
                  <div className="w-24">
                    <Label htmlFor="uf" className="text-sm font-medium">
                      UF
                    </Label>
                    <Input
                      id="uf"
                      {...register("uf")}
                      onChange={(e) =>
                        setValue("uf", e.target.value.toUpperCase().slice(0, 2))
                      }
                      className={getInputClassName("uf")}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="pais" className="text-sm font-medium">
                  País
                </Label>
                <Input
                  id="pais"
                  {...register("pais")}
                  className={getInputClassName("pais")}
                  placeholder="País"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="space-y-4">
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
              <div className="flex items-center justify-start">
                <div className="flex items-center gap-3">
                  <Switch
                    id="aceita_promocao_email"
                    checked={watchedAceita}
                    onCheckedChange={(c) =>
                      setValue("aceita_promocao_email", c)
                    }
                  />
                  <div>
                    <Label
                      htmlFor="aceita_promocao_email"
                      className="text-sm font-medium"
                    >
                      Aceita Promoção por Email
                    </Label>
                    <p className="text-sm text-gray-600">
                      {watchedAceita ? "Sim" : "Não"}
                    </p>
                  </div>
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
