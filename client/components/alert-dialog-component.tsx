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
import { AlertTriangle, Trash2, X } from "lucide-react";

interface AlertDialogComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  type?: "delete" | "warning" | "info";
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function AlertDialogComponent({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = "warning",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
}: AlertDialogComponentProps) {
  const getIcon = () => {
    switch (type) {
      case "delete":
        return <Trash2 className="w-6 h-6 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case "info":
      default:
        return <AlertTriangle className="w-6 h-6 text-blue-600" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case "delete":
        return "bg-red-600 hover:bg-red-700 text-white";
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700 text-white";
      case "info":
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white";
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            {getIcon()}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600 mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-row gap-2 sm:gap-0">
          <AlertDialogCancel
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            <X className="w-4 h-4 mr-2" />
            {cancelText}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 sm:flex-none ${getConfirmButtonClass()}`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </>
            ) : (
              <>
                {type === "delete" && <Trash2 className="w-4 h-4 mr-2" />}
                {confirmText}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Pre-configured alert dialogs for common scenarios

interface DeleteAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  isLoading?: boolean;
}

export function DeleteAlert({
  isOpen,
  onClose,
  onConfirm,
  itemName = "esse registro",
  isLoading = false,
}: DeleteAlertProps) {
  return (
    <AlertDialogComponent
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Confirmar exclusão"
      description={`Deseja realmente excluir ${itemName}? Esta ação não pode ser desfeita.`}
      type="delete"
      confirmText="Excluir"
      cancelText="Cancelar"
      isLoading={isLoading}
    />
  );
}

interface BulkDeleteAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  isLoading?: boolean;
}

export function BulkDeleteAlert({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isLoading = false,
}: BulkDeleteAlertProps) {
  return (
    <AlertDialogComponent
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Confirmar exclusão em massa"
      description={`Deseja realmente excluir todos os ${selectedCount} registros selecionados? Esta ação não pode ser desfeita.`}
      type="delete"
      confirmText={`Excluir ${selectedCount} registros`}
      cancelText="Cancelar"
      isLoading={isLoading}
    />
  );
}

interface StatusChangeAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: "ativar" | "desativar";
  itemName?: string;
  isLoading?: boolean;
}

export function StatusChangeAlert({
  isOpen,
  onClose,
  onConfirm,
  action,
  itemName = "esse registro",
  isLoading = false,
}: StatusChangeAlertProps) {
  return (
    <AlertDialogComponent
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Confirmar ${action}`}
      description={`Deseja realmente ${action} ${itemName}?`}
      type="warning"
      confirmText={action === "ativar" ? "Ativar" : "Desativar"}
      cancelText="Cancelar"
      isLoading={isLoading}
    />
  );
}

interface UnsavedChangesAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function UnsavedChangesAlert({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: UnsavedChangesAlertProps) {
  return (
    <AlertDialogComponent
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Alterações não salvas"
      description="Você tem alterações não salvas. Deseja realmente sair sem salvar?"
      type="warning"
      confirmText="Sair sem salvar"
      cancelText="Continuar editando"
      isLoading={isLoading}
    />
  );
}

interface PaymentRequiredAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export function PaymentRequiredAlert({
  isOpen,
  onClose,
  onUpgrade,
}: PaymentRequiredAlertProps) {
  return (
    <AlertDialogComponent
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onUpgrade || onClose}
      title="Plano pago necessário"
      description="Essa ação só funciona no plano pago. Faça upgrade para ter acesso a todos os recursos."
      type="info"
      confirmText={onUpgrade ? "Fazer upgrade" : "Entendi"}
      cancelText="Fechar"
    />
  );
}
