import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, record: any) => React.ReactNode;
}

interface DataGridProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onView?: (record: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onToggleStatus?: (record: any) => void;
  searchTerm?: string;
  currentPage?: number;
  pageSize?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  showActions?: boolean;
  actionButtons?: {
    view?: boolean;
    edit?: boolean;
    delete?: boolean;
    toggle?: boolean;
  };
}

type SortDirection = "asc" | "desc" | null;

export function DataGrid({
  columns,
  data,
  loading = false,
  selectedIds,
  onSelectionChange,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  searchTerm = "",
  currentPage = 1,
  pageSize = 10,
  totalRecords,
  onPageChange,
  showActions = true,
  actionButtons = { view: true, edit: true, delete: true, toggle: true },
}: DataGridProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Filter by search term
    if (searchTerm) {
      filtered = data.filter((record) =>
        columns.some((column) => {
          const value = record[column.key];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        }),
      );
    }

    // Sort data
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === null || aVal === undefined)
          return sortDirection === "asc" ? 1 : -1;
        if (bVal === null || bVal === undefined)
          return sortDirection === "asc" ? -1 : 1;

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal, "pt-BR")
            : bVal.localeCompare(aVal, "pt-BR");
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection, columns]);

  // Pagination
  const paginatedData = useMemo(() => {
    const isServerSide =
      typeof totalRecords === "number" &&
      totalRecords > filteredAndSortedData.length &&
      typeof onPageChange === "function";

    if (isServerSide) {
      // Data already corresponds to the current page from the server
      return filteredAndSortedData;
    }

    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(startIndex, startIndex + pageSize);
  }, [
    filteredAndSortedData,
    currentPage,
    pageSize,
    totalRecords,
    onPageChange,
  ]);

  const totalPages = Math.ceil(
    (totalRecords || filteredAndSortedData.length) / pageSize,
  );

  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    if (isChecked) {
      const allIds = paginatedData
        .map((record) => record.id)
        .filter((id) => id !== undefined);
      const newSelectedIds = [...new Set([...selectedIds, ...allIds])];
      onSelectionChange(newSelectedIds);
    } else {
      const pageIds = paginatedData.map((record) => record.id);
      const newSelectedIds = selectedIds.filter((id) => !pageIds.includes(id));
      onSelectionChange(newSelectedIds);
    }
  };

  const handleSelectRecord = (recordId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, recordId]);
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== recordId));
    }
  };

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((record) => selectedIds.includes(record.id));

  const isSomeSelected = paginatedData.some((record) =>
    selectedIds.includes(record.id),
  );

  const formatValue = (
    value: any,
    column: Column,
    record: any,
  ): React.ReactNode => {
    if (column.render) {
      return column.render(value, record);
    }

    if (value === null || value === undefined) {
      return "-";
    }

    // Format dates
    if (column.key.includes("data_") && value) {
      return new Date(value).toLocaleDateString("pt-BR");
    }

    // Format boolean as badge
    if (typeof value === "boolean") {
      return (
        <Badge
          className={
            value
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }
        >
          {value ? "Ativo" : "Inativo"}
        </Badge>
      );
    }

    // Format status as colored badge
    if (column.key === "status" || column.key === "tipo_estabelecimento") {
      const softMap: Record<string, string> = {
        ativo: "bg-green-50 text-green-700 border border-green-200",
        inativo: "bg-red-50 text-red-700 border border-red-200",
        Restaurante: "bg-blue-50 text-blue-700 border border-blue-200",
        Bar: "bg-purple-50 text-purple-700 border border-purple-200",
        Lancheria: "bg-orange-50 text-orange-700 border border-orange-200",
        Churrascaria: "bg-red-50 text-red-700 border border-red-200",
        Petiscaria: "bg-yellow-50 text-yellow-700 border border-yellow-200",
        Pizzaria: "bg-indigo-50 text-indigo-700 border border-indigo-200",
        Outro: "bg-gray-50 text-gray-700 border border-gray-200",
      };

      const styles =
        softMap[value] || "bg-gray-50 text-gray-700 border border-gray-200";
      return <Badge className={`${styles}`}>{value}</Badge>;
    }

    return String(value);
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) return null;

    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foodmax-orange mx-auto mb-2"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    isAllSelected
                      ? true
                      : isSomeSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>

              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`${column.width || ""} ${column.sortable ? "cursor-pointer hover:bg-gray-100" : ""}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}

              {showActions && (
                <TableHead className="w-32 text-center">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={1 + columns.length + (showActions ? 1 : 0)}>
                  <div className="py-10 text-center text-gray-600">
                    {searchTerm ? (
                      <>Nenhum registro encontrado para "{searchTerm}"</>
                    ) : (
                      <>Nenhum registro cadastrado</>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((record) => (
                <TableRow key={record.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(record.id)}
                      onCheckedChange={(checked) =>
                        handleSelectRecord(record.id, checked as boolean)
                      }
                    />
                  </TableCell>

                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.width || ""}>
                      {formatValue(record[column.key], column, record)}
                    </TableCell>
                  ))}

                  {showActions && (
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {actionButtons.toggle && onToggleStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleStatus(record)}
                            className={`h-8 w-8 p-0 rounded-full border ${record.ativo ? "bg-green-50 hover:bg-green-100 border-green-200" : "bg-gray-50 hover:bg-gray-100 border-gray-200"}`}
                            title={record.ativo ? "Desativar" : "Ativar"}
                          >
                            <Power
                              className={`w-4 h-4 ${record.ativo ? "text-green-600" : "text-gray-500"}`}
                            />
                          </Button>
                        )}

                        {actionButtons.view && onView && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(record)}
                            className="h-8 w-8 p-0 rounded-full border bg-blue-50 hover:bg-blue-100 border-blue-200"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4 text-blue-700" />
                          </Button>
                        )}

                        {actionButtons.edit && onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(record)}
                            className="h-8 w-8 p-0 rounded-full border bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-yellow-700" />
                          </Button>
                        )}

                        {actionButtons.delete && onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(record)}
                            className="h-8 w-8 p-0 rounded-full border bg-red-50 hover:bg-red-100 border-red-200"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 text-red-700" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer with total records and pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {(totalRecords ?? filteredAndSortedData.length) > 0 && (
            <>
              Total de registros: {totalRecords ?? filteredAndSortedData.length}
            </>
          )}
          {selectedIds.length > 0 && (
            <span className="ml-2">
              ({selectedIds.length} selecionado
              {selectedIds.length > 1 ? "s" : ""})
            </span>
          )}
        </div>

        {totalPages >= 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <span className="text-sm text-gray-600">
              Página {Math.min(currentPage, totalPages || 1)} de{" "}
              {Math.max(totalPages, 1)}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
