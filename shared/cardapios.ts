export interface Cardapio {
  id: number;
  id_usuario: number;
  nome: string;
  tipo_cardapio: TipoCardapio;
  quantidade_total: number;
  preco_itens_centavos: number;
  margem_lucro_percentual: number;
  preco_total_centavos: number;
  descricao?: string;
  ativo: boolean;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface CardapioItem {
  id: number;
  cardapio_id: number;
  item_id: number;
  quantidade: number;
  valor_unitario_centavos: number;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface CardapioWithItems extends Cardapio {
  itens: (CardapioItem & {
    item_nome: string;
    item_estoque_atual?: number;
    categoria_nome: string;
  })[];
}

export type TipoCardapio = "Café" | "Almoço" | "Janta" | "Lanche" | "Bebida" | "Outro";

export const TIPOS_CARDAPIO: TipoCardapio[] = [
  "Café",
  "Almoço", 
  "Janta",
  "Lanche",
  "Bebida",
  "Outro"
];

export interface CreateCardapioRequest {
  nome: string;
  tipo_cardapio: TipoCardapio;
  margem_lucro_percentual: number;
  preco_total_centavos: number;
  descricao?: string;
  ativo?: boolean;
  itens: {
    item_id: number;
    quantidade: number;
    valor_unitario_centavos: number;
  }[];
}

export interface UpdateCardapioRequest extends Partial<CreateCardapioRequest> {}

export interface CardapiosListResponse {
  data: Cardapio[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CardapioDetalhado extends Cardapio {
  itens: {
    id: number;
    item_id: number;
    item_nome: string;
    categoria_nome: string;
    quantidade: number;
    valor_unitario_centavos: number;
    item_estoque_atual?: number;
  }[];
}

export const formatCurrencyBRL = (centavos: number | undefined) => {
  const v = typeof centavos === "number" ? centavos / 100 : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const formatPercentage = (value: number | undefined) => {
  const v = typeof value === "number" ? value : 0;
  return `${v.toFixed(2)}%`;
};

export const getTipoCardapioColor = (tipo: TipoCardapio) => {
  const colors = {
    "Café": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "Almoço": "bg-blue-50 text-blue-700 border-blue-200", 
    "Janta": "bg-purple-50 text-purple-700 border-purple-200",
    "Lanche": "bg-green-50 text-green-700 border-green-200",
    "Bebida": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Outro": "bg-gray-50 text-gray-700 border-gray-200"
  };
  return colors[tipo] || colors["Outro"];
};
