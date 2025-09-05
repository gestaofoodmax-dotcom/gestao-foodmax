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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { X, Save, Phone, MapPin, FileText } from "lucide-react";
import { DDISelect } from "@/components/ddi-select";
import { toast } from "@/hooks/use-toast";
import {
  Estabelecimento,
  EstabelecimentoFormData,
  TIPOS_ESTABELECIMENTO,
  ESTADOS_BRASIL,
  formatCNPJ,
  validateCNPJ,
  validateEmail,
  validateCEP,
} from "@shared/estabelecimentos";

const estabelecimentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  razao_social: z.string().optional(),
  cnpj: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return validateCNPJ(val);
    }, "CNPJ inválido"),
  tipo_estabelecimento: z.enum(TIPOS_ESTABELECIMENTO, {
    required_error: "Tipo de estabelecimento é obrigatório",
  }),
  email: z.string().email("Email inválido"),
  ddi: z.string().min(1, "DDI é obrigatório"),
  telefone: z
    .string()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(15, "Telefone deve ter no máximo 15 dígitos"),
  ativo: z.boolean().default(true),

  // Endereco fields
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

type EstabelecimentoFormSchema = z.infer<typeof estabelecimentoSchema>;

interface EstabelecimentoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EstabelecimentoFormData) => Promise<void>;
  estabelecimento?: Estabelecimento | null;
  isLoading?: boolean;
}

export function EstabelecimentoForm({
  isOpen,
  onClose,
  onSave,
  estabelecimento,
  isLoading = false,
}: EstabelecimentoFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [cnpjDisplay, setCNPJDisplay] = useState("");

  const isEditing = !!estabelecimento;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EstabelecimentoFormSchema>({
    resolver: zodResolver(estabelecimentoSchema),
    defaultValues: {
      nome: "",
      razao_social: "",
      cnpj: "",
      tipo_estabelecimento: "Restaurante",
      email: "",
      ddi: "+55",
      telefone: "",
      ativo: true,
      cep: "",
      endereco: "",
      cidade: "",
      uf: "",
      pais: "Brasil",
    },
  });

  const watchedDDI = watch("ddi");
  const watchedTipoEstabelecimento = watch("tipo_estabelecimento");
  const watchedAtivo = watch("ativo");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      if (estabelecimento) {
        // Populate form with existing data
        const formData = {
          nome: estabelecimento.nome,
          razao_social: estabelecimento.razao_social || "",
          cnpj: estabelecimento.cnpj || "",
          tipo_estabelecimento: estabelecimento.tipo_estabelecimento,
          email: estabelecimento.email,
          ddi: estabelecimento.ddi,
          telefone: estabelecimento.telefone,
          ativo: estabelecimento.ativo,
          cep: estabelecimento.endereco?.cep || "",
          endereco: estabelecimento.endereco?.endereco || "",
          cidade: estabelecimento.endereco?.cidade || "",
          uf: estabelecimento.endereco?.uf || "",
          pais: estabelecimento.endereco?.pais || "Brasil",
        };

        reset(formData);
        setCNPJDisplay(formData.cnpj);
      } else {
        // Reset to default values for new estabelecimento
        reset({
          nome: "",
          razao_social: "",
          cnpj: "",
          tipo_estabelecimento: "Restaurante",
          email: "",
          ddi: "+55",
          telefone: "",
          ativo: true,
          cep: "",
          endereco: "",
          cidade: "",
          uf: "",
          pais: "Brasil",
        });
        setCNPJDisplay("");
      }
    }
  }, [isOpen, estabelecimento, reset]);

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, "");

    // Limit to 14 digits
    const limited = numbers.slice(0, 14);

    // Format with mask
    const formatted = formatCNPJ(limited);
    setCNPJDisplay(formatted);
    setValue("cnpj", limited);
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, "");

    // Limit to 8 digits
    const limited = numbers.slice(0, 8);
    setValue("cep", limited);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, "");

    // Limit to 15 digits
    const limited = numbers.slice(0, 15);
    setValue("telefone", limited);
  };

  const onSubmit = async (data: EstabelecimentoFormSchema) => {
    try {
      setIsSaving(true);
      await onSave(data);
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description:
          error.message || "Ocorreu um erro ao salvar o estabelecimento",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fieldLabels: Record<string, string> = {
    nome: "Nome",
    tipo_estabelecimento: "Tipo de Estabelecimento",
    email: "Email",
    ddi: "DDI",
    telefone: "Telefone",
  };
  const onInvalid = (formErrors: FieldErrors<EstabelecimentoFormSchema>) => {
    const labels = Object.keys(formErrors).map((k) => fieldLabels[k] || k);
    if (labels.length > 0) {
      toast({
        title: "Preencha os campos obrigatórios",
        description: labels.join(", "),
        variant: "destructive",
      });
    }
  };

  const getFieldError = (fieldName: keyof EstabelecimentoFormSchema) => {
    return errors[fieldName]?.message;
  };

  const getInputClassName = (fieldName: keyof EstabelecimentoFormSchema) => {
    const hasError = !!errors[fieldName];
    return `foodmax-input ${hasError ? "border-red-500 focus:ring-red-500" : ""}`;
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
            {isEditing ? "Editar Estabelecimento" : "Novo Estabelecimento"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="space-y-6"
        >
          {/* Dados Básicos */}
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome" className="text-sm font-medium">
                  Nome *
                </Label>
                <Input
                  id="nome"
                  {...register("nome")}
                  className={getInputClassName("nome")}
                  placeholder="Nome do estabelecimento"
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
                  htmlFor="tipo_estabelecimento"
                  className="text-sm font-medium"
                >
                  Tipo de Estabelecimento *
                </Label>
                <Select
                  value={watchedTipoEstabelecimento}
                  onValueChange={(value) =>
                    setValue("tipo_estabelecimento", value as any)
                  }
                >
                  <SelectTrigger
                    className={getInputClassName("tipo_estabelecimento")}
                  >
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ESTABELECIMENTO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError("tipo_estabelecimento") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("tipo_estabelecimento")}
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
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase().slice(0, 2);
                        setValue("uf", v);
                      }}
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

          {/* Status */}
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
