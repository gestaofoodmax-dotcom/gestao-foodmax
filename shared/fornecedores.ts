// Shared types for Fornecedores module

export interface Fornecedor {
  id: number;
  id_usuario: number;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  email: string;
  ddi: string;
  telefone: string; // até 15 dígitos, somente números no armazenamento
  nome_responsavel?: string;
  ativo: boolean;
  data_cadastro: string;
  data_atualizacao: string;
  endereco?: FornecedorEndereco;
}

export interface FornecedorEndereco {
  id: number;
  fornecedor_id: number;
  cep?: string; // 8 dígitos
  endereco?: string;
  cidade?: string;
  uf?: string; // 2 chars
  pais: string; // padrão Brasil
  data_cadastro: string;
  data_atualizacao: string;
}

export interface CreateFornecedorRequest {
  nome: string;
  razao_social?: string;
  cnpj?: string;
  email: string;
  ddi: string;
  telefone: string;
  nome_responsavel?: string;
  ativo?: boolean;
  // Endereço
  cep?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
}

export interface UpdateFornecedorRequest
  extends Partial<CreateFornecedorRequest> {}

export interface FornecedoresListResponse {
  data: Fornecedor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FornecedorResponse {
  message: string;
  data: Fornecedor;
}

export interface BulkDeleteRequest {
  ids: number[];
}

export interface BulkDeleteResponse {
  message: string;
  deletedCount: number;
}

export interface StatusToggleResponse {
  message: string;
  data: Fornecedor;
}

export const formatTelefone = (ddi: string, telefone: string): string => {
  return `${ddi} ${telefone}`;
};

export const formatEnderecoCidadeUF = (
  endereco?: FornecedorEndereco,
): string => {
  if (!endereco) return "-";
  const parts: string[] = [];
  if (endereco.cidade) parts.push(endereco.cidade);
  if (endereco.uf) parts.push(endereco.uf);
  return parts.length ? parts.join("/") : "-";
};

export const formatCNPJ = (cnpj: string): string => {
  const numbers = (cnpj || "").replace(/\D/g, "");
  if (numbers.length === 14) {
    return numbers.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return cnpj;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const numbers = (cnpj || "").replace(/\D/g, "");
  if (numbers.length !== 14) return false;
  const invalid = [
    "00000000000000",
    "11111111111111",
    "22222222222222",
    "33333333333333",
    "44444444444444",
    "55555555555555",
    "66666666666666",
    "77777777777777",
    "88888888888888",
    "99999999999999",
  ];
  return !invalid.includes(numbers);
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateCEP = (cep: string): boolean => {
  const numbers = (cep || "").replace(/\D/g, "");
  return numbers.length === 8;
};
