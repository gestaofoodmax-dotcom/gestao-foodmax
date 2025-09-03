export type TipoEntrega = "Própria" | "iFood" | "Rappi" | "UberEats" | "Outro";

export type StatusEntrega = "Pendente" | "Saiu" | "Entregue" | "Cancelado";

export type FormaPagamentoEntrega =
  | "PIX"
  | "Cartão de Débito"
  | "Cartão de Crédito"
  | "Dinheiro"
  | "Outro";

export interface Entrega {
  id: number;
  id_usuario: number;
  estabelecimento_id: number;
  tipo_entrega: TipoEntrega;
  pedido_id: number | null; // quando Própria
  codigo_pedido_app: string | null; // quando iFood/Rappi/UberEats/Outro
  valor_pedido: number; // em centavos
  taxa_extra: number; // em centavos
  valor_entrega: number; // em centavos
  forma_pagamento: FormaPagamentoEntrega;
  cliente_id: number | null; // null representa "Não Cliente"
  ddi: string;
  telefone: string;
  data_hora_saida: string | null;
  data_hora_entregue: string | null;
  observacao?: string | null;
  status: StatusEntrega;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface EntregaEndereco {
  id: number;
  entrega_id: number;
  cep?: string | null;
  endereco: string;
  cidade: string;
  uf: string; // 2 chars
  pais: string; // default Brasil
  data_cadastro: string;
  data_atualizacao: string;
}

export interface EntregaDetalhada extends Entrega {
  estabelecimento_nome?: string;
  pedido_codigo?: string | null;
  pedido_valor_total?: number | null;
  cliente_nome?: string | null;
  endereco?: EntregaEndereco | null;
}

export interface CreateEntregaRequest {
  estabelecimento_id: number;
  tipo_entrega: TipoEntrega;
  pedido_id?: number | null; // se Própria
  codigo_pedido_app?: string | null; // se não Própria
  valor_pedido: number; // centavos, aceitar 0
  taxa_extra: number; // centavos, aceitar 0
  valor_entrega: number; // centavos, aceitar 0
  forma_pagamento: FormaPagamentoEntrega;
  cliente_id?: number | null; // opcional
  ddi: string;
  telefone: string;
  data_hora_saida?: string | null;
  data_hora_entregue?: string | null;
  observacao?: string | null;
  status?: StatusEntrega;
  endereco: {
    cep?: string | null;
    endereco: string;
    cidade: string;
    uf: string; // 2 chars
    pais: string;
  };
}

export interface UpdateEntregaRequest extends Partial<CreateEntregaRequest> {}

export interface EntregasListResponse {
  data: (Entrega & {
    estabelecimento_nome?: string;
    pedido_codigo?: string | null;
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const TIPOS_ENTREGA: TipoEntrega[] = [
  "Própria",
  "iFood",
  "Rappi",
  "UberEats",
  "Outro",
];

export const FORMAS_PAGAMENTO_ENTREGA: FormaPagamentoEntrega[] = [
  "PIX",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Dinheiro",
  "Outro",
];

export const STATUS_ENTREGA: StatusEntrega[] = [
  "Pendente",
  "Saiu",
  "Entregue",
  "Cancelado",
];

export const getTipoEntregaColor = (tipo: TipoEntrega) => {
  const colors: Record<TipoEntrega, string> = {
    "Própria": "bg-blue-50 text-blue-700 border-blue-200",
    "iFood": "bg-red-50 text-red-700 border-red-200",
    "Rappi": "bg-orange-50 text-orange-700 border-orange-200",
    "UberEats": "bg-green-50 text-green-700 border-green-200",
    "Outro": "bg-gray-50 text-gray-700 border-gray-200",
  };
  return colors[tipo];
};

export const getStatusEntregaColor = (status: StatusEntrega) => {
  const colors: Record<StatusEntrega, string> = {
    Pendente: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Saiu: "bg-blue-50 text-blue-700 border-blue-200",
    Entregue: "bg-green-50 text-green-700 border-green-200",
    Cancelado: "bg-red-50 text-red-700 border-red-200",
  };
  return colors[status];
};

export const formatCurrencyBRL = (centavos: number | undefined) => {
  const v = typeof centavos === "number" ? centavos / 100 : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const parseCurrencyToCentavos = (value: string): number => {
  const s = String(value || "").trim();
  if (!s) return 0;
  const clean = s.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(,|$))/g, "");
  const dot = clean.replace(",", ".");
  const n = Number(dot);
  if (!isNaN(n)) return Math.round(n * 100);
  const digits = s.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
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
