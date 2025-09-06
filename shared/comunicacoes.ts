export type TipoComunicacao = "Promoção" | "Fornecedor" | "Outro";

export type DestinatariosTipo =
  | "TodosClientes"
  | "ClientesEspecificos"
  | "TodosFornecedores"
  | "FornecedoresEspecificos"
  | "Outros";

export type StatusComunicacao = "Pendente" | "Enviado" | "Cancelado";

export interface Comunicacao {
  id: number;
  id_usuario: number;
  estabelecimento_id: number;
  tipo_comunicacao: TipoComunicacao;
  assunto: string;
  mensagem: string; // texto final a ser enviado
  destinatarios_tipo: DestinatariosTipo;
  clientes_ids?: number[] | null;
  fornecedores_ids?: number[] | null;
  destinatarios_text?: string | null; // usado quando tipo = "Outros"
  email_enviado: boolean;
  status: StatusComunicacao;
  data_hora_enviado?: string | null;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface CreateComunicacaoRequest {
  estabelecimento_id: number;
  tipo_comunicacao: TipoComunicacao;
  assunto: string;
  mensagem: string;
  destinatarios_tipo: DestinatariosTipo;
  clientes_ids?: number[];
  fornecedores_ids?: number[];
  destinatarios_text?: string;
  status?: StatusComunicacao; // default Pendente
}

export type UpdateComunicacaoRequest = Partial<CreateComunicacaoRequest> & {
  status?: StatusComunicacao;
  email_enviado?: boolean;
};

export interface ComunicacoesListResponse {
  data: Comunicacao[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getStatusBadgeColor = (s: StatusComunicacao) => {
  switch (s) {
    case "Pendente":
      return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    case "Enviado":
      return "bg-green-50 text-green-700 border border-green-200";
    case "Cancelado":
      return "bg-red-50 text-red-700 border border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
};
