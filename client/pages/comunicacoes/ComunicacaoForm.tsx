import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Link as LinkIcon, Save, X } from "lucide-react";
import { useAuthenticatedRequest } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { Estabelecimento } from "@shared/estabelecimentos";
import {
  CreateComunicacaoRequest,
  DestinatariosTipo,
  TipoComunicacao,
} from "@shared/comunicacoes";
import { Cliente } from "@shared/clientes";
import { Fornecedor } from "@shared/fornecedores";

const schema = z.object({
  estabelecimento_id: z.number({ required_error: "Estabelecimento é obrigatório" }),
  tipo_comunicacao: z.enum(["Promoção", "Fornecedor", "Outro"] as [TipoComunicacao, ...TipoComunicacao[]]),
  assunto: z.string().min(1, "Assunto é obrigatório"),
  mensagem: z.string().min(1, "Mensagem é obrigatória"),
  destinatarios_tipo: z.enum([
    "TodosClientes",
    "ClientesEspecificos",
    "TodosFornecedores",
    "FornecedoresEspecificos",
    "Outros",
  ] as [DestinatariosTipo, ...DestinatariosTipo[]]),
  destinatarios_text: z.string().optional(),
  email_enviado: z.boolean().optional(),
  status: z.enum(["Pendente", "Enviado", "Cancelado"]).optional(),
});

type FormSchema = z.infer<typeof schema>;

export default function ComunicacaoForm({
  isOpen,
  onClose,
  onSave,
  comunicacao,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateComunicacaoRequest & { email_enviado?: boolean; status?: any }) => Promise<void> | void;
  comunicacao: any | null;
  isLoading?: boolean;
}) {
  const { makeRequest } = useAuthenticatedRequest();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const [selectedClientes, setSelectedClientes] = useState<number[]>([]);
  const [selectedFornecedores, setSelectedFornecedores] = useState<number[]>([]);

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
      estabelecimento_id: undefined as unknown as number,
      tipo_comunicacao: "Promoção",
      assunto: "Promoção",
      mensagem: "",
      destinatarios_tipo: "TodosClientes",
      destinatarios_text: "",
      email_enviado: false,
      status: "Pendente",
    },
  });

  const watched = watch();

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
      data.sort((a, b) => (a.data_cadastro < b.data_cadastro ? 1 : -1));
      setEstabelecimentos(data);
      if (!comunicacao) {
        const lastActive = data.find((e) => e.ativo);
        if (lastActive) setValue("estabelecimento_id", lastActive.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadClientes = async (estId?: number) => {
    try {
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      const res = await makeRequest(`/api/clientes?${params}`);
      let data = (res?.data || []) as Cliente[];
      data = data.filter((c) => c.ativo && (!estId || c.estabelecimento_id === estId));
      setClientes(data);
    } catch {
      setClientes([]);
    }
  };
  const loadFornecedores = async () => {
    try {
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      const res = await makeRequest(`/api/fornecedores?${params}`);
      let data = (res?.data || []) as Fornecedor[];
      data = data.filter((f) => f.ativo);
      setFornecedores(data);
    } catch {
      setFornecedores([]);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadEstabelecimentos();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const estId = watched.estabelecimento_id;
    if (estId) loadClientes(estId);
    loadFornecedores();
  }, [isOpen, watched.estabelecimento_id]);

  useEffect(() => {
    if (isOpen) {
      if (comunicacao) {
        reset({
          estabelecimento_id: comunicacao.estabelecimento_id,
          tipo_comunicacao: comunicacao.tipo_comunicacao,
          assunto: comunicacao.assunto,
          mensagem: comunicacao.mensagem,
          destinatarios_tipo: comunicacao.destinatarios_tipo,
          destinatarios_text: comunicacao.destinatarios_text || "",
          email_enviado: !!comunicacao.email_enviado,
          status: comunicacao.status || "Pendente",
        });
        setSelectedClientes(comunicacao.clientes_ids || []);
        setSelectedFornecedores(comunicacao.fornecedores_ids || []);
      } else {
        const template =
          localStorage.getItem("fm_config_promocao_template") ||
          "Olá!\n\nConfira nossas promoções exclusivas da semana.\n\nAtenciosamente,\nEquipe FoodMax";
        reset({
          estabelecimento_id: watched.estabelecimento_id as any,
          tipo_comunicacao: "Promoção",
          assunto: "Promoção",
          mensagem: template,
          destinatarios_tipo: "TodosClientes",
          destinatarios_text: "",
          email_enviado: false,
          status: "Pendente",
        });
        setSelectedClientes([]);
        setSelectedFornecedores([]);
      }
    }
  }, [isOpen, comunicacao, reset]);

  const save = async (data: FormSchema) => {
    if (data.tipo_comunicacao === "Outro" && !data.destinatarios_text) {
      toast({ title: "Validação", description: "Informe os destinatários", variant: "destructive" });
      return;
    }

    const payload: CreateComunicacaoRequest & { email_enviado?: boolean; status?: any } = {
      estabelecimento_id: data.estabelecimento_id,
      tipo_comunicacao: data.tipo_comunicacao,
      assunto: data.assunto,
      mensagem: data.mensagem,
      destinatarios_tipo: data.destinatarios_tipo as DestinatariosTipo,
      clientes_ids: data.destinatarios_tipo === "ClientesEspecificos" ? selectedClientes : [],
      fornecedores_ids:
        data.destinatarios_tipo === "FornecedoresEspecificos" ? selectedFornecedores : [],
      destinatarios_text: data.destinatarios_text,
      status: data.status || "Pendente",
      email_enviado: !!data.email_enviado,
    };

    await onSave(payload);
  };

  const hasEstabelecimentos = estabelecimentos.length > 0;

  const promoImages = useMemo(() => {
    try {
      const raw = localStorage.getItem("fm_config_promocao_imagens");
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return arr.filter((u) => typeof u === "string" && u.trim() !== "");
    } catch {
      return [];
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[85vw] h-[90vh] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal">
            {comunicacao ? "Editar Comunicação" : "Nova Comunicação"}
          </DialogTitle>
        </DialogHeader>

        {!hasEstabelecimentos && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                Antes de cadastrar, é necessário ter pelo menos um Estabelecimento.{' '}
                <button
                  onClick={() => window.open('/estabelecimentos', '_blank')}
                  className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                >
                  <LinkIcon className="w-3 h-3" /> (ir para módulo Estabelecimentos)
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(save)} className="space-y-6">
          <div className="space-y-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z"/></svg>
              <h3 className="font-semibold text-blue-600">Dados Básicos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Estabelecimento *</Label>
                <Select
                  value={watched.estabelecimento_id as any}
                  onValueChange={(v) => setValue('estabelecimento_id', parseInt(v))}
                >
                  <SelectTrigger className="foodmax-input">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {estabelecimentos.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.estabelecimento_id && (
                  <span className="text-sm text-red-600">Estabelecimento é obrigatório</span>
                )}
              </div>

              <div>
                <Label>Tipo de Comunicação *</Label>
                <Select
                  value={watched.tipo_comunicacao}
                  onValueChange={(v) => {
                    setValue('tipo_comunicacao', v as any);
                    // defaults per type
                    if (v === 'Promoção') {
                      setValue('assunto', 'Promoção');
                      const t = localStorage.getItem('fm_config_promocao_template') || '';
                      setValue('mensagem', t || watched.mensagem || '');
                      setValue('destinatarios_tipo', 'TodosClientes' as any);
                    } else if (v === 'Fornecedor') {
                      setValue('assunto', '');
                      setValue('destinatarios_tipo', 'TodosFornecedores' as any);
                    } else {
                      setValue('assunto', '');
                      setValue('destinatarios_tipo', 'Outros' as any);
                    }
                  }}
                >
                  <SelectTrigger className="foodmax-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Promoção">Promoção</SelectItem>
                    <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              {watched.tipo_comunicacao === 'Fornecedor' && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6h-7l-2-2H3v16h18V6z"/></svg>
                    <h3 className="font-semibold text-green-600">Conteúdo</h3>
                  </div>
                  <Label>Assunto *</Label>
                  <Input {...register('assunto')} className="foodmax-input" />
                  {errors.assunto && (
                    <span className="text-sm text-red-600">{errors.assunto.message}</span>
                  )}
                  <div className="mt-3">
                    <Label>Mensagem *</Label>
                    <Textarea rows={5} {...register('mensagem')} className="foodmax-input resize-none" />
                  </div>
                  <div className="mt-4">
                    <Label>Destinatários *</Label>
                    <Select
                      value={watched.destinatarios_tipo as any}
                      onValueChange={(v) => setValue('destinatarios_tipo', v as any)}
                    >
                      <SelectTrigger className="foodmax-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TodosFornecedores">Todos os fornecedores</SelectItem>
                        <SelectItem value="FornecedoresEspecificos">Fornecedores específicos</SelectItem>
                      </SelectContent>
                    </Select>
                    {watched.destinatarios_tipo === 'FornecedoresEspecificos' && (
                      <div className="mt-3 max-h-48 overflow-auto border rounded p-2 bg-gray-50">
                        {fornecedores.map((f) => (
                          <label key={f.id} className="flex items-center gap-2 py-1">
                            <input
                              type="checkbox"
                              checked={selectedFornecedores.includes(f.id)}
                              onChange={(e) =>
                                setSelectedFornecedores((prev) =>
                                  e.target.checked ? [...prev, f.id] : prev.filter((id) => id !== f.id),
                                )
                              }
                            />
                            <span>{f.nome}</span>
                            <span className="text-xs text-gray-500">{f.email}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}


              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0C9.66 11 11 9.66 11 8S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                  <h3 className="font-semibold text-purple-600">Destinatários</h3>
                </div>
                {watched.tipo_comunicacao === 'Promoção' && (
                  <div>
                    <Label>Destinatários *</Label>
                    <Select
                      value={watched.destinatarios_tipo as any}
                      onValueChange={(v) => setValue('destinatarios_tipo', v as any)}
                    >
                      <SelectTrigger className="foodmax-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TodosClientes">Todos os clientes</SelectItem>
                        <SelectItem value="ClientesEspecificos">Clientes específicos</SelectItem>
                      </SelectContent>
                    </Select>
                    {watched.destinatarios_tipo === 'ClientesEspecificos' && (
                      <div className="mt-3 max-h-48 overflow-auto border rounded p-2 bg-gray-50">
                        {clientes.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 py-1">
                            <input
                              type="checkbox"
                              checked={selectedClientes.includes(c.id)}
                              onChange={(e) =>
                                setSelectedClientes((prev) =>
                                  e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                                )
                              }
                            />
                            <span>{c.nome}</span>
                            <span className="text-xs text-gray-500">{c.email || '-'}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="mt-4">
                      <Label>Assunto *</Label>
                      <Input {...register('assunto')} className="foodmax-input" />
                      {errors.assunto && (
                        <span className="text-sm text-red-600">{errors.assunto.message}</span>
                      )}
                    </div>
                    <div className="mt-3">
                      <Label>Template de Email de Promoção</Label>
                      <Textarea rows={5} {...register('mensagem')} className="foodmax-input resize-none" />
                      {promoImages.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium mb-2">Pré-visualização de Imagens</div>
                          <div className="flex flex-wrap gap-3">
                            {promoImages.map((src, idx) => (
                              <div key={idx} className="w-24 h-24 rounded border overflow-hidden bg-gray-50">
                                <img src={src} alt={`Imagem ${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span>Editar texto em</span>
                          <button
                            type="button"
                            onClick={() => window.open('/configuracoes', '_blank')}
                            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" /> Configurações
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {watched.tipo_comunicacao === 'Outro' && (
                  <div>
                    <Label>Destinatários *</Label>
                    <Textarea
                      {...register('destinatarios_text')}
                      className="foodmax-input resize-none"
                      rows={3}
                      placeholder="Digite emails separados por vírgula, ponto e vírgula ou espaço"
                    />
                    <div className="mt-4">
                      <Label>Assunto *</Label>
                      <Input {...register('assunto')} className="foodmax-input" />
                      {errors.assunto && (
                        <span className="text-sm text-red-600">{errors.assunto.message}</span>
                      )}
                    </div>
                    <div className="mt-3">
                      <Label>Mensagem *</Label>
                      <Textarea rows={5} {...register('mensagem')} className="foodmax-input resize-none" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label>Status</Label>
                <Select value={watched.status as any} onValueChange={(v) => setValue('status', v as any)}>
                  <SelectTrigger className="foodmax-input w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Enviado">Enviado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="email_enviado"
                  checked={!!watched.email_enviado}
                  onCheckedChange={(checked) => setValue('email_enviado', checked)}
                />
                <div>
                  <Label htmlFor="email_enviado" className="text-sm font-medium">
                    Email Enviado
                  </Label>
                  <p className="text-sm text-gray-600">{watched.email_enviado ? 'Sim' : 'Não'}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-foodmax-orange hover:bg-orange-600">
              <Save className="w-4 h-4 mr-2" /> {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
