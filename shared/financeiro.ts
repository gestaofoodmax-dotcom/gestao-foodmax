export type TipoTransacao = "Receita" | "Despesa";

export interface FinanceiroTransacao {
  id: number;
  id_usuario: number;
  estabelecimento_id: number;
  tipo: TipoTransacao;
  categoria: string;
  valor: number; // centavos
  data_transacao: string | null;
  descricao?: string | null;
  ativo: boolean;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface CreateFinanceiroTransacaoRequest {
  estabelecimento_id: number;
  tipo: TipoTransacao;
  categoria: string;
  valor: number; // centavos
  data_transacao?: string | null; // ISO
  descricao?: string | null;
  ativo?: boolean;
}

export interface UpdateFinanceiroTransacaoRequest
  extends Partial<CreateFinanceiroTransacaoRequest> {}

export interface FinanceiroListResponse {
  data: FinanceiroTransacao[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  totals: {
    totalReceitas: number; // centavos
    totalDespesas: number; // centavos
    saldoLiquido: number; // centavos (receitas - despesas)
  };
}

export const FINANCEIRO_CATEGORIAS: string[] = [
  "Vendas",
  "Serviços",
  "PIX",
  "Dinheiro",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Folha de Pagamento",
  "Impostos",
  "Marketing",
  "Manutenção",
  "Transporte",
  "Outros",
];
