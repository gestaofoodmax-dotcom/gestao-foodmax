import { useState, useEffect } from "react";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { X, Save, Phone, MapPin, Info } from "lucide-react";
import { DDISelect } from "@/components/ddi-select";
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
  Fornecedor,
  CreateFornecedorRequest,
  formatCNPJ,
  validateCNPJ,
  validateEmail,
  validateCEP,
} from "@shared/fornecedores";
import { Estabelecimento } from "@shared/estabelecimentos";

const fornecedorSchema = z.object({
  estabelecimento_id: z.number({
    invalid_type_error: "Estabelecimento é obrigatório",
  }),
  nome: z.string().min(1, "Nome é obrigatório"),
  razao_social: z.string().optional(),
  cnpj: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return validateCNPJ(val);
    }, "CNPJ inválido"),
  email: z.string().email("Email inválido"),
  ddi: z.string().min(1, "DDI é obrigatório"),
  telefone: z
    .string()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(15, "Telefone deve ter no máximo 15 dígitos"),
  nome_responsavel: z.string().optional(),
  ativo: z.boolean().default(true),
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

type FornecedorFormSchema = z.infer<typeof fornecedorSchema>;

interface FornecedorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateFornecedorRequest) => Promise<void>;
  fornecedor?: Fornecedor | null;
  isLoading?: boolean;
}

export function FornecedorForm({
  isOpen,
  onClose,
  onSave,
  fornecedor,
  isLoading = false,
}: FornecedorFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [cnpjDisplay, setCNPJDisplay] = useState("");

  const isEditing = !!fornecedor;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FornecedorFormSchema>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      estabelecimento_id: undefined as unknown as number,
      nome: "",
      razao_social: "",
      cnpj: "",
      email: "",
      ddi: "+55",
      telefone: "",
      nome_responsavel: "",
      ativo: true,
      cep: "",
      endereco: "",
      cidade: "",
      uf: "",
      pais: "Brasil",
    },
  });

  const watchedDDI = watch("ddi");
  const watchedAtivo = watch("ativo");
  const watchedEstabelecimentoId = watch("estabelecimento_id");

  const { makeRequest } = useAuthenticatedRequest();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (fornecedor) {
        const formData = {
          estabelecimento_id: watchedEstabelecimentoId as any,
          nome: fornecedor.nome,
          razao_social: fornecedor.razao_social || "",
          cnpj: fornecedor.cnpj || "",
          email: fornecedor.email,
          ddi: fornecedor.ddi,
          telefone: fornecedor.telefone,
          nome_responsavel: fornecedor.nome_responsavel || "",
          ativo: fornecedor.ativo,
          cep: fornecedor.endereco?.cep || "",
          endereco: fornecedor.endereco?.endereco || "",
          cidade: fornecedor.endereco?.cidade || "",
          uf: fornecedor.endereco?.uf || "",
          pais: fornecedor.endereco?.pais || "Brasil",
        } as any;
        reset(formData);
        setCNPJDisplay(formData.cnpj);
      } else {
        reset({
          estabelecimento_id: watchedEstabelecimentoId as any,
          nome: "",
          razao_social: "",
          cnpj: "",
          email: "",
          ddi: "+55",
          telefone: "",
          nome_responsavel: "",
          ativo: true,
          cep: "",
          endereco: "",
          cidade: "",
          uf: "",
          pais: "Brasil",
        } as any);
        setCNPJDisplay("");
      }
    }
  }, [isOpen, fornecedor, reset, watchedEstabelecimentoId]);

  useEffect(() => {
    if (!isOpen) return;
    const loadEstabelecimentos = async () => {
      try {
        let data: Estabelecimento[] = [];
        try {
          const params = new URLSearchParams({ page: "1", limit: "200" });
          const res = await makeRequest(`/api/estabelecimentos?${params}`);
          data = (res.data || []) as Estabelecimento[];
        } catch {
          const raw = localStorage.getItem("fm_estabelecimentos");
          data = raw ? (JSON.parse(raw) as Estabelecimento[]) : [];
        }
        data.sort((a, b) => (a.data_cadastro < b.data_cadastro ? 1 : -1));
        setEstabelecimentos(data);
        if (!isEditing) {
          const lastActive = data.find((e) => e.ativo);
          if (lastActive) setValue("estabelecimento_id", lastActive.id as any);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadEstabelecimentos();
  }, [isOpen, isEditing, makeRequest, setValue]);

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/\D/g, "").slice(0, 14);
    setCNPJDisplay(formatCNPJ(numbers));
    setValue("cnpj", numbers);
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/\D/g, "").slice(0, 8);
    setValue("cep", numbers);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/\D/g, "").slice(0, 15);
    setValue("telefone", numbers);
  };

  const onSubmit = async (data: FornecedorFormSchema) => {
    try {
      setIsSaving(true);
      await onSave(data as unknown as CreateFornecedorRequest);
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o fornecedor",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fieldLabels: Record<string, string> = {
    nome: "Nome",
    email: "Email",
    ddi: "DDI",
    telefone: "Telefone",
  };

  const onInvalid = (formErrors: FieldErrors<FornecedorFormSchema>) => {
    const labels = Object.keys(formErrors).map((k) => fieldLabels[k] || k);
    if (labels.length) {
      toast({
        title: "Preencha os campos obrigatórios",
        description: labels.join(", "),
        variant: "destructive",
      });
    }
  };

  const getFieldError = (name: keyof FornecedorFormSchema) =>
    errors[name]?.message;
  const getInputClassName = (name: keyof FornecedorFormSchema) =>
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
            {isEditing ? "Editar Fornecedor" : "Novo Fornecedor"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="space-y-6"
        >
          {/* Dados Básicos */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Estabelecimento *</Label>
                <Select
                  value={watchedEstabelecimentoId ? String(watchedEstabelecimentoId) : undefined}
                  onValueChange={(v) => setValue("estabelecimento_id", Number(v) as any)}
                >
                  <SelectTrigger className={getInputClassName("estabelecimento_id")}>
                    <SelectValue placeholder="Selecione o estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {estabelecimentos
                      .sort((a, b) => (a.data_cadastro < b.data_cadastro ? 1 : -1))
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
                  placeholder="Nome do fornecedor"
                />
                {getFieldError("nome") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("nome")}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="razao_social" className="text-sm font-medium">
                  Razão Social
                </Label>
                <Input
                  id="razao_social"
                  {...register("razao_social")}
                  className={getInputClassName("razao_social")}
                  placeholder="Razão social da empresa"
                />
                {getFieldError("razao_social") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("razao_social")}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="cnpj" className="text-sm font-medium">
                  CNPJ
                </Label>
                <Input
                  id="cnpj"
                  value={cnpjDisplay}
                  onChange={handleCNPJChange}
                  className={getInputClassName("cnpj")}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {getFieldError("cnpj") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("cnpj")}
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="nome_responsavel"
                  className="text-sm font-medium"
                >
                  Nome Responsável
                </Label>
                <Input
                  id="nome_responsavel"
                  {...register("nome_responsavel")}
                  className={getInputClassName("nome_responsavel")}
                  placeholder="Nome da pessoa responsável"
                />
                {getFieldError("nome_responsavel") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("nome_responsavel")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-600">Contato</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email *
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
                    onChange={(value) => setValue("ddi", value)}
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

          {/* Endereço */}
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
                {getFieldError("endereco") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("endereco")}
                  </p>
                )}
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
                    {getFieldError("cidade") && (
                      <p className="text-sm text-red-600 mt-1">
                        {getFieldError("cidade")}
                      </p>
                    )}
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
                    {getFieldError("uf") && (
                      <p className="text-sm text-red-600 mt-1">
                        {getFieldError("uf")}
                      </p>
                    )}
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
                {getFieldError("pais") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("pais")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status - div com borda e sem título */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-start">
              <div className="flex items-center gap-3">
                <Switch
                  id="ativo"
                  checked={watchedAtivo}
                  onCheckedChange={(checked) => setValue("ativo", checked)}
                />
                <div>
                  <Label htmlFor="ativo" className="text-sm font-medium">
                    Ativo
                  </Label>
                  <p className="text-sm text-gray-600">{watchedAtivo ? "Sim" : "Não"}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving || isLoading}
              className="flex-1 sm:flex-none"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isLoading}
              variant="orange"
              className="flex-1 sm:flex-none"
            >
              {isSaving ? (
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
