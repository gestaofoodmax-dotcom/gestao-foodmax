import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: string;
  columns: { key: string; label: string; required?: boolean }[];
  onImport: (
    data: any[],
  ) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  onGetRelatedId?: (fieldName: string, value: string) => Promise<number | null>;
  onCreateRelated?: (fieldName: string, value: string) => Promise<number>;
  userRole: "admin" | "user" | null;
  hasPayment?: boolean;
  mapHeader?: (header: string) => string;
  validateRecord?: (record: any, index: number) => string[];
}

export function ImportModal({
  isOpen,
  onClose,
  moduleName,
  columns,
  onImport,
  onGetRelatedId,
  onCreateRelated,
  userRole,
  hasPayment,
  mapHeader,
  validateRecord,
}: ImportModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewData([]);
      setRecordCount(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen]);

  // Normalize role to handle case variations (e.g., ADMIN)
  const normalizedRole = userRole ? String(userRole).toLowerCase() : null;
  // Check if user can import (exact rules); if role is not yet loaded, don't block here
  const canImport =
    normalizedRole === "admin" ||
    (normalizedRole === "user" && !!hasPayment) ||
    normalizedRole === null;

  const parseCSV = (csvText: string): any[] => {
    const text = (csvText || "").replace(/\r\n?/g, "\n");
    const lines: string[] = [];

    // Detect delimiter: prefer comma, fallback to semicolon
    const firstLine = text.split("\n")[0] || "";
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semiCount > commaCount ? ";" : ",";

    // CSV parser supporting quotes and delimiters inside quotes
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') {
          // Escaped quote
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (!inQuotes && ch === "\n") {
        lines.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    if (cur.length > 0) lines.push(cur);

    if (lines.length < 1) return [];

    const splitRow = (row: string): string[] => {
      const cells: string[] = [];
      let buf = "";
      let quoted = false;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        const next = row[i + 1];
        if (ch === '"') {
          if (quoted && next === '"') {
            buf += '"';
            i++;
          } else {
            quoted = !quoted;
          }
        } else if (!quoted && row.startsWith(delimiter, i)) {
          cells.push(buf);
          buf = "";
          i += delimiter.length - 1;
        } else {
          buf += ch;
        }
      }
      cells.push(buf);
      return cells.map((c) => c.trim().replace(/^"(.*)"$/, "$1"));
    };

    const headers = splitRow(lines[0]);
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const values = splitRow(lines[i]);
      const record: any = {};
      headers.forEach((header, index) => {
        const key =
          (typeof mapHeader === "function" && mapHeader(header)) ||
          header.toLowerCase().replace(/\s+/g, "_");
        const value = values[index] ?? "";
        if (value !== "") record[key] = value;
      });
      data.push(record);
    }

    return data;
  };

  const processRelatedFields = async (records: any[]): Promise<any[]> => {
    const processedRecords = [];

    for (let i = 0; i < records.length; i++) {
      const record = { ...records[i] };

      // Update progress with better visibility
      const progressValue = (i / records.length) * 40; // First 40% for processing
      setProgress(progressValue);

      // Add artificial delay for better UX on small datasets
      if (records.length < 50) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Process fields that start with id_ (relationships)
      for (const [key, value] of Object.entries(record)) {
        if (
          key.startsWith("id_") &&
          key !== "id_usuario" &&
          value &&
          onGetRelatedId
        ) {
          try {
            let relatedId = await onGetRelatedId(key, value as string);

            // If not found and we can create, try to create
            if (!relatedId && onCreateRelated) {
              try {
                relatedId = await onCreateRelated(key, value as string);
              } catch (createError) {
                console.error(
                  `Error creating related record for ${key}:`,
                  createError,
                );
                // Skip this record
                continue;
              }
            }

            if (relatedId) {
              record[key] = relatedId;
            } else {
              // Skip this record if we can't resolve the relationship
              continue;
            }
          } catch (error) {
            console.error(`Error processing related field ${key}:`, error);
            continue;
          }
        }
      }

      processedRecords.push(record);
    }

    // Ensure we reach 40% before moving to next phase
    setProgress(40);
    await new Promise((resolve) => setTimeout(resolve, 100));

    return processedRecords;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Preview and count
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setRecordCount(parsed.length);
      setPreviewData(parsed.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    if (!canImport) {
      toast({
        description: "Essa ação só funciona no plano pago",
        variant: "destructive",
      });
      return;
    }

    try {
      // PRE-VALIDAÇÃO (antes da barra andar)
      const text = await selectedFile.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo CSV não contém dados válidos",
          variant: "destructive",
        });
        return;
      }

      if (parsed.length > 1000) {
        toast({
          title: "Limite excedido",
          description: "Só é possível importar até 1000 registros por arquivo",
          variant: "destructive",
        });
        return;
      }

      const errors: string[] = [];
      const validRecords: any[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const record = parsed[i];
        const recordErrors = validateRecord ? validateRecord(record, i) : [];
        if (recordErrors.length > 0) {
          errors.push(`Linha ${i + 2}: ${recordErrors.join(", ")}`);
        } else {
          validRecords.push(record);
        }
      }

      if (errors.length > 0 && validRecords.length === 0) {
        toast({
          title: "Dados inválidos",
          description: "Todos os registros contêm erros. Verifique o arquivo.",
          variant: "destructive",
        });
        return;
      }

      // Inicia importação (agora a barra pode andar)
      setIsImporting(true);
      setProgress(0);
      await new Promise((r) => setTimeout(r, 150));

      // Parsing concluído
      setProgress(20);
      await new Promise((r) => setTimeout(r, 150));

      // Validação concluída
      setProgress(40);
      await new Promise((r) => setTimeout(r, 150));

      // Processar relacionamentos
      const processedRecords = onGetRelatedId
        ? await processRelatedFields(validRecords)
        : validRecords;

      setProgress(75);
      await new Promise((r) => setTimeout(r, 200));

      // Importar
      setProgress(80);
      await new Promise((r) => setTimeout(r, 200));

      const result: any = await onImport(processedRecords);

      setProgress(95);
      await new Promise((r) => setTimeout(r, 200));

      const importedCount =
        typeof result?.imported === "number"
          ? result.imported
          : processedRecords.length;
      const hadErrors =
        Array.isArray(result?.errors) && result.errors.length > 0;

      setProgress(100);
      await new Promise((r) => setTimeout(r, 350));

      if (result.success && importedCount > 0) {
        toast({
          title: "Importação concluída",
          description: `${importedCount} registro${importedCount > 1 ? "s" : ""} importado${importedCount > 1 ? "s" : ""} com sucesso`,
        });
        if (hadErrors) {
          toast({
            title: "Alguns registros ignorados",
            description: `${result.errors.length} registro(s) duplicado(s) ou inválido(s) foram ignorados`,
            variant: "destructive",
          });
        }
        setSelectedFile(null);
        setPreviewData([]);
        setRecordCount(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setTimeout(() => {
          onClose();
        }, 1000);
      } else if (result.success && importedCount === 0) {
        toast({
          title: "Nenhum registro importado",
          description: hadErrors
            ? `${result.errors.length} registro(s) duplicado(s) foram ignorados`
            : "Registros duplicados ou já existentes foram ignorados",
          variant: "destructive",
        });
        setSelectedFile(null);
        setPreviewData([]);
        setRecordCount(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        toast({
          title: "Erro na importação",
          description:
            result?.message || "Ocorreu um erro ao importar os dados",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao processar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const requiredColumns = columns.filter((col) => col.required);
  const optionalColumns = columns.filter((col) => !col.required);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="w-[90vw] sm:w-[640px] max-w-2xl max-h-[80vh] overflow-y-auto overflow-x-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-2">
            Importar {moduleName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {normalizedRole === "user" && !hasPayment && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Essa ação só funciona no plano pago
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Formato do arquivo CSV
            </h4>

            <p className="text-sm text-blue-800 mb-3">
              O arquivo deve conter as seguintes colunas na primeira linha
              (cabeçalho):
            </p>

            <div className="text-sm">
              <h5 className="font-medium text-blue-900 mb-1">
                Campos obrigatórios:
              </h5>
              <ul className="grid grid-cols-2 gap-2 mb-3">
                {requiredColumns.map((col) => (
                  <li key={col.key} className="text-blue-700">
                    • {col.label}
                  </li>
                ))}
              </ul>
              <h5 className="font-medium text-blue-900 mb-1">
                Campos opcionais:
              </h5>
              <p className="text-blue-700 whitespace-normal break-words">
                {optionalColumns.map((c) => c.label).join(", ")}
              </p>
            </div>

            <div className="mt-3 text-xs text-blue-600">
              <p>• Limite: 1000 registros por arquivo</p>
              <p>• Registros duplicados serão ignorados</p>
              <p>• Formato de data: dd/mm/yyyy</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar arquivo CSV
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Escolher Arquivo
              </Button>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-600 truncate">
                  {selectedFile
                    ? selectedFile.name
                    : "Nenhum arquivo selecionado"}
                </div>
                {selectedFile && (
                  <div className="text-xs text-gray-500">
                    {recordCount !== null
                      ? `${recordCount} registro${recordCount !== 1 ? "s" : ""}`
                      : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedFile && (
            <div
              className={`space-y-3 rounded-lg p-4 border-2 transition-all duration-300 ${
                isImporting
                  ? "bg-blue-50 border-blue-400 shadow-lg"
                  : "bg-gray-50 border-gray-300"
              }`}
            >
              <div className="relative">
                <Progress
                  value={progress}
                  className="w-full h-6 bg-gray-300 border-2 border-gray-400"
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">
                  {Math.round(progress)}% CONCLUÍDO
                </div>
              </div>
              <div
                className={`text-sm font-medium text-gray-700`}
              >
                {!isImporting && "Clique em 'Enviar' para iniciar a importação"}
                {isImporting && progress < 20 && "📄 ANALISANDO ARQUIVO CSV..."}
                {isImporting &&
                  progress >= 20 &&
                  progress < 40 &&
                  "✅ VALIDANDO REGISTROS..."}
                {isImporting &&
                  progress >= 40 &&
                  progress < 60 &&
                  "🔗 PROCESSANDO RELACIONAMENTOS..."}
                {isImporting &&
                  progress >= 60 &&
                  progress < 90 &&
                  "💾 SALVANDO NO BANCO DE DADOS..."}
                {isImporting &&
                  progress >= 90 &&
                  "🎉 FINALIZANDO IMPORTAÇÃO..."}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedFile(null);
              setPreviewData([]);
              setRecordCount(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
              onClose();
            }}
            disabled={isImporting}
            className="flex-1 sm:flex-none"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>

          <Button
            onClick={handleImport}
            disabled={isImporting || !selectedFile}
            variant="orange"
            className="flex-1 sm:flex-none"
            data-testid="import-submit"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? "Importando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
