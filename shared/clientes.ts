import React from "react";

export interface Cliente {
  id: number;
  id_usuario: number;
  estabelecimento_id: number;
  nome: string;
  genero?: "Masculino" | "Feminino" | "Outro";
  profissao?: string;
  email?: string;
  ddi: string;
  telefone: string;
  aceita_promocao_email?: boolean;
  ativo: boolean;
  data_cadastro: string;
  data_atualizacao: string;
  endereco?: ClienteEndereco;
}

export interface ClienteEndereco {
  id: number;
  cliente_id: number;
  cep?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  pais: string;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface CreateClienteRequest {
  estabelecimento_id: number;
  nome: string;
  genero?: "Masculino" | "Feminino" | "Outro";
  profissao?: string;
  email?: string;
  ddi: string;
  telefone: string;
  ativo?: boolean;
  aceita_promocao_email?: boolean;
  cep?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
}

export interface UpdateClienteRequest extends Partial<CreateClienteRequest> {}

export interface ClientesListResponse {
  data: Cliente[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ImportClientesRequest {
  records: CreateClienteRequest[];
}

export interface ImportResponse {
  success: boolean;
  message: string;
  imported: number;
  errors?: string[];
}

export interface StatusToggleResponse {
  message: string;
  data: Cliente;
}

export type ClienteFormData = CreateClienteRequest;

export const GENEROS = ["Masculino", "Feminino", "Outro"] as const;

export const CLIENTE_EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: "estabelecimento_nome", label: "Nome Estabelecimento" },
  { key: "nome", label: "Nome" },
  { key: "genero", label: "Gênero" },
  { key: "profissao", label: "Profissão" },
  { key: "email", label: "Email" },
  { key: "ddi", label: "DDI" },
  { key: "telefone", label: "Telefone" },
  { key: "cep", label: "CEP" },
  { key: "endereco", label: "Endereço" },
  { key: "cidade", label: "Cidade" },
  { key: "uf", label: "UF" },
  { key: "pais", label: "País" },
  { key: "aceita_promocao_email", label: "Aceita Promoção Email" },
  { key: "ativo", label: "Status" },
  { key: "data_cadastro", label: "Data de Cadastro" },
];

export const CLIENTE_IMPORT_COLUMNS: { key: string; label: string }[] = [
  { key: "id_estabelecimento", label: "Estabelecimento" },
  { key: "nome", label: "Nome" },
  { key: "genero", label: "Gênero" },
  { key: "profissao", label: "Profissão" },
  { key: "email", label: "Email" },
  { key: "ddi", label: "DDI" },
  { key: "telefone", label: "Telefone" },
  { key: "cep", label: "CEP" },
  { key: "endereco", label: "Endereço" },
  { key: "cidade", label: "Cidade" },
  { key: "uf", label: "UF" },
  { key: "pais", label: "País" },
  { key: "aceita_promocao_email", label: "Aceita Promoç��o por Email" },
];

export const formatTelefone = (ddi: string, telefone: string): string => {
  return `${ddi} ${telefone}`;
};

export const formatEndereco = (endereco?: ClienteEndereco): string => {
  if (!endereco) return "-";
  const parts = [] as string[];
  if (endereco.cidade) parts.push(endereco.cidade);
  if (endereco.uf) parts.push(endereco.uf);
  return parts.length > 0 ? parts.join("/") : "-";
};
