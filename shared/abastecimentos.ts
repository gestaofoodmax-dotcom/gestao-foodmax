export type StatusAbastecimento =
  | "Pendente"
  | "Enviado"
  | "Recebido"
  | "Cancelado";

export interface Abastecimento {
  id: number;
  id_usuario: number;
  estabelecimento_id: number;
  fornecedores_ids: number[];
  categoria_id: number;
  quantidade_total: number;
  telefone: string;
  ddi: string;
  email?: string | null;
  codigo?: string | null;
  data_hora_recebido: string | null;
  observacao?: string | null;
  status: StatusAbastecimento;
  email_enviado: boolean;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface AbastecimentoItem {
  id: number;
  abastecimento_id: number;
  item_id: number;
  quantidade: number;
  unidade_medida: import("./itens").Item["unidade_medida"] | string;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface AbastecimentoEndereco {
  id: number;
  abastecimento_id: number;
  cep?: string | null;
  endereco: string;
  cidade: string;
  uf: string;
  pais: string;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface AbastecimentoDetalhado extends Abastecimento {
  estabelecimento_nome?: string;
  categoria_nome?: string;
  fornecedores_nomes?: string[];
  itens: (AbastecimentoItem & {
    item_nome?: string;
    estoque_atual?: number;
    unidade_medida?: import("./itens").Item["unidade_medida"] | string;
  })[];
  endereco?: AbastecimentoEndereco;
}

export interface CreateAbastecimentoRequest {
  estabelecimento_id: number;
  fornecedores_ids: number[];
  categoria_id: number;
  telefone: string;
  ddi: string;
  email?: string | null;
  data_hora_recebido?: string | null;
  observacao?: string | null;
  status?: StatusAbastecimento;
  email_enviado?: boolean;
  codigo?: string | null;
  itens: {
    item_id: number;
    quantidade: number;
    unidade_medida: import("./itens").Item["unidade_medida"] | string;
  }[];
  endereco: {
    cep?: string | null;
    endereco: string;
    cidade: string;
    uf: string;
    pais: string;
  };
}

export interface UpdateAbastecimentoRequest
  extends Partial<CreateAbastecimentoRequest> {}

export interface AbastecimentosListResponse {
  data: (Abastecimento & {
    estabelecimento_nome?: string;
    categoria_nome?: string;
    qtde_itens?: number;
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const STATUS_ABASTECIMENTO: StatusAbastecimento[] = [
  "Pendente",
  "Enviado",
  "Recebido",
  "Cancelado",
];

export const getStatusAbastecimentoColor = (status: StatusAbastecimento) => {
  const colors: Record<StatusAbastecimento, string> = {
    Pendente: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Enviado: "bg-blue-50 text-blue-700 border-blue-200",
    Recebido: "bg-green-50 text-green-700 border-green-200",
    Cancelado: "bg-red-50 text-red-700 border-red-200",
  };
  return colors[status];
};

export const formatDateTimeBR = (value: string | null | undefined) => {
  if (!value) return "-";
  try {
    const d = new Date(value);
    const date = d.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    const time = d.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return `${date}, ${time}`;
  } catch {
    return "-";
  }
};
