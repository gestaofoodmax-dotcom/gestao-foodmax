// Shared types for Estabelecimentos module

export interface Estabelecimento {
  id: number;
  id_usuario: number;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  tipo_estabelecimento:
    | "Restaurante"
    | "Bar"
    | "Lancheria"
    | "Churrascaria"
    | "Petiscaria"
    | "Pizzaria"
    | "Outro";
  email: string;
  ddi: string;
  telefone: string;
  ativo: boolean;
  data_cadastro: string;
  data_atualizacao: string;
  endereco?: EstabelecimentoEndereco;
}

export interface EstabelecimentoEndereco {
  id: number;
  estabelecimento_id: number;
  cep?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  pais: string;
  data_cadastro: string;
  data_atualizacao: string;
}

// Request types
export interface CreateEstabelecimentoRequest {
  nome: string;
  razao_social?: string;
  cnpj?: string;
  tipo_estabelecimento:
    | "Restaurante"
    | "Bar"
    | "Lancheria"
    | "Churrascaria"
    | "Petiscaria"
    | "Pizzaria"
    | "Outro";
  email: string;
  ddi: string;
  telefone: string;
  ativo?: boolean;

  // Endereco fields
  cep?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
}

export interface UpdateEstabelecimentoRequest
  extends Partial<CreateEstabelecimentoRequest> {}

export interface BulkDeleteRequest {
  ids: number[];
}

export interface ImportEstabelecimentosRequest {
  records: CreateEstabelecimentoRequest[];
}

// Response types
export interface EstabelecimentoResponse {
  message: string;
  data: Estabelecimento;
}

export interface EstabelecimentosListResponse {
  data: Estabelecimento[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkDeleteResponse {
  message: string;
  deletedCount: number;
}

export interface ImportResponse {
  success: boolean;
  message: string;
  imported: number;
  errors?: string[];
}

export interface StatusToggleResponse {
  message: string;
  data: Estabelecimento;
}

// Query parameters
export interface EstabelecimentosQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  tipo?: string;
  ativo?: boolean;
}

// Form validation types
export interface EstabelecimentoFormData extends CreateEstabelecimentoRequest {}

export interface EstabelecimentoFormErrors {
  nome?: string;
  razao_social?: string;
  cnpj?: string;
  tipo_estabelecimento?: string;
  email?: string;
  ddi?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
  general?: string;
}

// Grid column configuration
export interface EstabelecimentoGridColumn {
  key:
    | keyof Estabelecimento
    | "actions"
    | "endereco_completo"
    | "telefone_completo";
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, record: Estabelecimento) => React.ReactNode;
}

// Export/Import configuration
export interface EstabelecimentoExportColumn {
  key: string;
  label: string;
}

export const ESTABELECIMENTO_EXPORT_COLUMNS: EstabelecimentoExportColumn[] = [
  { key: "nome", label: "Nome" },
  { key: "razao_social", label: "Razão Social" },
  { key: "cnpj", label: "CNPJ" },
  { key: "tipo_estabelecimento", label: "Tipo de Estabelecimento" },
  { key: "email", label: "Email" },
  { key: "ddi", label: "DDI" },
  { key: "telefone", label: "Telefone" },
  { key: "cep", label: "CEP" },
  { key: "endereco", label: "Endereço" },
  { key: "cidade", label: "Cidade" },
  { key: "uf", label: "UF" },
  { key: "pais", label: "País" },
  { key: "ativo", label: "Status" },
  { key: "data_cadastro", label: "Data de Cadastro" },
];

export const ESTABELECIMENTO_IMPORT_COLUMNS: EstabelecimentoExportColumn[] = [
  { key: "nome", label: "Nome" },
  { key: "razao_social", label: "Razão Social" },
  { key: "cnpj", label: "CNPJ" },
  { key: "tipo_estabelecimento", label: "Tipo de Estabelecimento" },
  { key: "email", label: "Email" },
  { key: "ddi", label: "DDI" },
  { key: "telefone", label: "Telefone" },
  { key: "cep", label: "CEP" },
  { key: "endereco", label: "Endereço" },
  { key: "cidade", label: "Cidade" },
  { key: "uf", label: "UF" },
  { key: "pais", label: "País" },
];

// Constants
export const TIPOS_ESTABELECIMENTO = [
  "Restaurante",
  "Bar",
  "Lancheria",
  "Churrascaria",
  "Petiscaria",
  "Pizzaria",
  "Outro",
] as const;

export const ESTADOS_BRASIL = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

// Helper functions
export const formatTelefone = (ddi: string, telefone: string): string => {
  return `${ddi} ${telefone}`;
};

export const formatEndereco = (endereco?: EstabelecimentoEndereco): string => {
  if (!endereco) return "-";

  const parts = [];
  if (endereco.cidade) parts.push(endereco.cidade);
  if (endereco.uf) parts.push(endereco.uf);

  return parts.length > 0 ? parts.join("/") : "-";
};

export const formatCNPJ = (cnpj: string): string => {
  // Remove any non-numeric characters
  const numbers = cnpj.replace(/\D/g, "");

  // Apply CNPJ mask: XX.XXX.XXX/XXXX-XX
  if (numbers.length === 14) {
    return numbers.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }

  return cnpj; // Return original if not 14 digits
};

export const validateCNPJ = (cnpj: string): boolean => {
  const numbers = cnpj.replace(/\D/g, "");

  if (numbers.length !== 14) return false;

  // Basic CNPJ validation (you can implement full algorithm if needed)
  const invalidCNPJs = [
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

  return !invalidCNPJs.includes(numbers);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateCEP = (cep: string): boolean => {
  const numbers = cep.replace(/\D/g, "");
  return numbers.length === 8;
};
