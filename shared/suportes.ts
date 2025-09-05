// Shared types for Suportes (Support Tickets) module

export type SuporteTipo =
  | "Técnico"
  | "Financeiro"
  | "Dúvida"
  | "Sugestão"
  | "Reclamação"
  | "Outro";

export type SuportePrioridade = "Baixa" | "Média" | "Alta";
export type SuporteStatus = "Aberto" | "Em Andamento" | "Resolvido" | "Fechado";

export interface Suporte {
  id: number;
  id_usuario: number;
  nome_usuario: string;
  email_usuario: string;
  tipo: SuporteTipo;
  prioridade: SuportePrioridade;
  titulo: string;
  descricao: string;
  status: SuporteStatus;
  resposta_admin?: string | null;
  data_resposta_admin?: string | null;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface CreateSuporteRequest {
  tipo: SuporteTipo;
  prioridade: SuportePrioridade;
  nome_usuario: string; // filled from logged user, locked in UI
  email_usuario: string; // filled from logged user, locked in UI
  titulo: string;
  descricao: string;
  status?: SuporteStatus; // admin may set
  resposta_admin?: string | null; // admin may set
}

export interface UpdateSuporteRequest extends Partial<CreateSuporteRequest> {}

export interface SuportesListResponse {
  data: Suporte[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkDeleteRequest {
  ids: number[];
}

export interface StatusResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export const SUPORTE_EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: "titulo", label: "Título" },
  { key: "tipo", label: "Tipo" },
  { key: "prioridade", label: "Prioridade" },
  { key: "status", label: "Status" },
  { key: "nome_usuario", label: "Nome" },
  { key: "email_usuario", label: "Email" },
  { key: "descricao", label: "Descrição" },
  { key: "resposta_admin", label: "Resposta Admin" },
  { key: "data_cadastro", label: "Data de Cadastro" },
  { key: "data_atualizacao", label: "Data de Atualização" },
];

export const SUPORTE_STATUS_TABS: { key: "Todos" | SuporteStatus; label: string }[] = [
  { key: "Todos", label: "Todos" },
  { key: "Aberto", label: "Abertos" },
  { key: "Em Andamento", label: "Em Andamento" },
  { key: "Resolvido", label: "Resolvidos" },
  { key: "Fechado", label: "Fechados" },
];

export const SUPORTE_TIPOS: SuporteTipo[] = [
  "Técnico",
  "Financeiro",
  "Dúvida",
  "Sugestão",
  "Reclamação",
  "Outro",
];

export const SUPORTE_PRIORIDADES: SuportePrioridade[] = ["Baixa", "Média", "Alta"];

export const PRIORIDADE_BADGE_STYLES: Record<SuportePrioridade, string> = {
  Baixa: "bg-green-50 text-green-700 border border-green-200",
  Média: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  Alta: "bg-red-50 text-red-700 border border-red-200",
};

export const STATUS_BADGE_STYLES: Record<SuporteStatus, string> = {
  Aberto: "bg-blue-50 text-blue-700 border border-blue-200",
  "Em Andamento": "bg-purple-50 text-purple-700 border border-purple-200",
  Resolvido: "bg-green-50 text-green-700 border border-green-200",
  Fechado: "bg-gray-50 text-gray-700 border border-gray-200",
};
