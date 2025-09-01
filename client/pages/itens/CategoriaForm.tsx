import { useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileText, X, Save } from "lucide-react";
import { ItemCategoria } from "@shared/itens";

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FormSchema = z.infer<typeof schema>;

export default function CategoriaForm({
  isOpen,
  onClose,
  onSave,
  categoria,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  categoria?: ItemCategoria | null;
}) {
  const isEditing = !!categoria;
  const { register, handleSubmit, setValue, reset, watch } =
    useForm<FormSchema>({
      resolver: zodResolver(schema),
      defaultValues: { nome: "", descricao: "", ativo: true },
    });
  const watchedAtivo = watch("ativo");

  useEffect(() => {
    if (isOpen) {
      if (categoria) {
        reset({
          nome: categoria.nome,
          descricao: categoria.descricao || "",
          ativo: categoria.ativo,
        });
      } else {
        reset({ nome: "", descricao: "", ativo: true });
      }
    }
  }, [isOpen, categoria, reset]);

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
          <DialogTitle className="text-xl sm:text-2xl font-normal py-0 mb-1">
            {isEditing ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(async (d) => {
            await onSave(d);
            onClose();
          })}
          className="space-y-6"
        >
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
                  className="foodmax-input"
                  placeholder="Nome da categoria"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="descricao" className="text-sm font-medium">
                  Descrição
                </Label>
                <Textarea
                  id="descricao"
                  {...register("descricao")}
                  className="foodmax-input min-h-[120px]"
                  placeholder="Descrição da categoria"
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
              className="flex-1 sm:flex-none"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
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
