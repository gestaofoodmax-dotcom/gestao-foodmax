export type StatusPedido = "Pendente" | "Finalizado" | "Cancelado";

export type TipoPedido = "Atendente" | "QR Code" | "APP" | "Outro";

export interface Pedido {
  id: number;
  id_usuario: number;
  estabelecimento_id: number;
  cliente_id: number | null;
  codigo: string;
  tipo_pedido: TipoPedido;
  valor_total: number;
  data_hora_finalizado: string | null;
  observacao?: string | null;
  status: StatusPedido;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface PedidoCardapio {
  id: number;
  pedido_id: number;
  cardapio_id: number;
  preco_total_centavos: number;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface PedidoItemExtra {
  id: number;
  pedido_id: number;
  item_id: number;
  categoria_id: number;
  quantidade: number;
  valor_unitario_centavos: number;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface PedidoDetalhado extends Pedido {
  estabelecimento_nome?: string;
  cliente_nome?: string | null;
  cardapios: (PedidoCardapio & { cardapio_nome?: string })[];
  itens_extras: (PedidoItemExtra & {
    item_nome?: string;
    categoria_nome?: string;
    estoque_atual?: number;
  })[];
}

export interface CreatePedidoRequest {
  estabelecimento_id: number;
  cliente_id?: number | null;
  tipo_pedido: TipoPedido;
  codigo?: string; // if not provided, server generates
  observacao?: string | null;
  status?: StatusPedido; // default Pendente
  valor_total: number; // calculated client-side but editable
  cardapios: { cardapio_id: number; preco_total_centavos?: number }[]; // preco can be filled by server
  itens_extras: {
    item_id: number;
    categoria_id: number;
    quantidade: number;
    valor_unitario_centavos: number;
  }[];
  data_hora_finalizado?: string | null;
}

export interface UpdatePedidoRequest extends Partial<CreatePedidoRequest> {}

export interface PedidosListResponse {
  data: (Pedido & { estabelecimento_nome?: string })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const TIPOS_PEDIDO: TipoPedido[] = [
  "Atendente",
  "QR Code",
  "APP",
  "Outro",
];

export const STATUS_PEDIDO: StatusPedido[] = [
  "Pendente",
  "Finalizado",
  "Cancelado",
];

export const formatCurrencyBRL = (centavos: number | undefined) => {
  const v = typeof centavos === "number" ? centavos / 100 : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const getTipoPedidoColor = (tipo: TipoPedido) => {
  const colors: Record<TipoPedido, string> = {
    Atendente: "bg-blue-50 text-blue-700 border-blue-200",
    "QR Code": "bg-purple-50 text-purple-700 border-purple-200",
    APP: "bg-green-50 text-green-700 border-green-200",
    Outro: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return colors[tipo];
};

export const getStatusPedidoColor = (status: StatusPedido) => {
  const colors: Record<StatusPedido, string> = {
    Pendente: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Finalizado: "bg-green-50 text-green-700 border-green-200",
    Cancelado: "bg-red-50 text-red-700 border-red-200",
  };
  return colors[status];
};
