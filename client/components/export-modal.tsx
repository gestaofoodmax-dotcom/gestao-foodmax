import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  selectedIds: number[];
  moduleName: string;
  columns: { key: string; label: string }[];
  onGetRelatedValue?: (fieldName: string, id: number) => Promise<string>;
}

export function ExportModal({
  isOpen,
  onClose,
  data,
  selectedIds,
  moduleName,
  columns,
  onGetRelatedValue,
}: ExportModalProps) {
  const [exportType, setExportType] = useState<"current" | "selected" | "all">(
    "current",
  );
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Field mapping for better column names
  const getFieldLabel = (fieldName: string): string => {
    const mappings: Record<string, string> = {
      tipo_cardapio: "Tipo de Cardápio",
      tipo_estabelecimento: "Tipo de Estabelecimento",
      data_cadastro: "Data de Cadastro",
      data_atualizacao: "Data de Atualização",
      data_pagamento: "Data de Pagamento",
      razao_social: "Razão Social",
      // Add more mappings as needed
    };

    return (
      mappings[fieldName] ||
      fieldName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  };

  const formatValue = (value: any, fieldName: string): string => {
    if (value === null || value === undefined) return "";

    // Format dates
    if (fieldName.includes("data_") && value) {
      return new Date(value).toLocaleDateString("pt-BR");
    }

    // Format boolean values
    if (typeof value === "boolean") {
      return value ? "Ativo" : "Inativo";
    }

    return String(value);
  };

  const getDataToExport = () => {
    switch (exportType) {
      case "selected":
        return data.filter((item) => selectedIds.includes(item.id));
      case "all":
        return data;
      case "current":
      default:
        return data; // Assuming current page data is passed
    }
  };

  const processRelatedFields = async (records: any[]): Promise<any[]> => {
    const processedRecords = [];

    for (let i = 0; i < records.length; i++) {
      const record = { ...records[i] };

      // Update progress with minimum delay for visibility
      const progressValue = (i / records.length) * 90; // Leave 10% for final steps
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
          onGetRelatedValue
        ) {
          try {
            const relatedValue = await onGetRelatedValue(key, value as number);
            record[key] = relatedValue;
          } catch (error) {
            console.error(`Error getting related value for ${key}:`, error);
            record[key] = value; // Keep original value if can't resolve
          }
        }
      }

      processedRecords.push(record);
    }

    // Ensure we reach 90% before final steps
    setProgress(90);
    await new Promise((resolve) => setTimeout(resolve, 100));

    return processedRecords;
  };

  const convertToCSV = (records: any[]): string => {
    if (records.length === 0) return "";

    // Filter out id and id_usuario columns
    const filteredColumns = columns.filter(
      (col) => col.key !== "id" && col.key !== "id_usuario",
    );

    // Create headers with proper labels
    const headers = filteredColumns.map((col) => getFieldLabel(col.key));

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...records.map((record) =>
        filteredColumns
          .map((col) => {
            const value = formatValue(record[col.key], col.key);
            // Escape quotes and wrap in quotes if contains comma or quote
            const escaped =
              value.includes(",") || value.includes('"')
                ? `"${value.replace(/"/g, '""')}"`
                : value;
            return escaped;
          })
          .join(","),
      ),
    ].join("\n");

    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);

      const dataToExport = getDataToExport();

      if (dataToExport.length === 0) {
        toast({
          title: "Erro na exportação",
          description: "Nenhum registro selecionado para exportar",
          variant: "destructive",
        });
        return;
      }

      // If CSV expects id_estabelecimento but records have estabelecimento_id, alias it
      const needsEstabAlias = columns.some(
        (c) => c.key === "id_estabelecimento",
      );
      const withAliases = needsEstabAlias
        ? dataToExport.map((r) =>
            r && typeof r === "object"
              ? {
                  ...r,
                  id_estabelecimento:
                    (r as any).id_estabelecimento ??
                    (r as any).estabelecimento_id,
                }
              : r,
          )
        : dataToExport;

      // Process related fields if handler provided (converts ids -> nomes)
      const processedData = onGetRelatedValue
        ? await processRelatedFields(withAliases)
        : withAliases;

      // Show processing completion
      setProgress(95);
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Convert to CSV
      const csvContent = convertToCSV(processedData);

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const typeLabel =
        exportType === "current"
          ? "pagina-atual"
          : exportType === "selected"
            ? "selecionados"
            : "todos";
      const filename = `${moduleName.toLowerCase()}-${typeLabel}-${timestamp}.csv`;

      // Download file
      downloadCSV(csvContent, filename);

      // Final progress
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast({
        title: "Exportação concluída",
        description: `${processedData.length} registros exportados com sucesso`,
      });

      // Wait a bit before closing so user sees completion
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const getRecordCount = () => {
    switch (exportType) {
      case "selected":
        return selectedIds.length;
      case "all":
        return data.length;
      case "current":
      default:
        return data.length;
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="w-[90vw] sm:w-[640px] max-w-2xl max-h-[80vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-normal py-2">
            Exportar {moduleName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              Instruções para exportar CSV
            </h4>
            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
              <li>O arquivo será gerado no formato CSV (UTF-8).</li>
              <li>A primeira linha contém os cabeçalhos das colunas.</li>
              <li>Datas são exportadas no formato dd/mm/yyyy.</li>
            </ul>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Selecione o que deseja exportar:
            </p>

            <RadioGroup
              value={exportType}
              onValueChange={(value: any) => setExportType(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="current" id="current" />
                <Label htmlFor="current">
                  Exportar página atual ({data.length} registros)
                </Label>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" />
                  <Label htmlFor="selected">
                    Exportar selecionados ({selectedIds.length} registros)
                  </Label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">
                  Exportar tudo ({data.length} registros)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Exportando dados...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 sm:flex-none"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>

          <Button
            onClick={handleExport}
            disabled={isExporting || getRecordCount() === 0}
            variant="orange"
            className="flex-1 sm:flex-none"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exportando..." : "Baixar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
