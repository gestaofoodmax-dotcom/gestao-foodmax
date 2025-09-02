import React from "react";

export interface ItemCategoria {
  id: number;
  id_usuario: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface Item {
  id: number;
  id_usuario: number;
  categoria_id: number;
  nome: string;
  preco: number; // store in centavos
  custo_pago: number; // store in centavos
  unidade_medida:
    | "Grama"
    | "Quilograma"
    | "Mililitro"
    | "Litro"
    | "Unidade"
    | "Dúzia"
    | "Caixa"
    | "Pacote"
    | "Fatia"
    | "Xícara"
    | "Colher de sopa"
    | "Colher de chá";
  peso_gramas?: number;
  estoque_atual?: number;
  ativo: boolean;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface CreateItemRequest {
  categoria_id: number;
  nome: string;
  preco: number;
  custo_pago: number;
  unidade_medida: Item["unidade_medida"];
  peso_gramas?: number;
  estoque_atual?: number;
  ativo?: boolean;
}

export interface UpdateItemRequest extends Partial<CreateItemRequest> {}

export interface CreateItemCategoriaRequest {
  nome: string;
  descricao?: string;
  ativo?: boolean;
}

export interface UpdateItemCategoriaRequest
  extends Partial<CreateItemCategoriaRequest> {}

export interface ItensListResponse {
  data: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ItensCategoriasListResponse {
  data: ItemCategoria[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const UNIDADES_MEDIDA: Item["unidade_medida"][] = [
  "Grama",
  "Quilograma",
  "Mililitro",
  "Litro",
  "Unidade",
  "Dúzia",
  "Caixa",
  "Pacote",
  "Fatia",
  "Xícara",
  "Colher de sopa",
  "Colher de chá",
];

export const principaisCategorias = [
  "Carnes",
  "Aves",
  "Peixes",
  "Massas",
  "Molhos",
  "Laticínios",
  "Bebidas",
  "Vegetais",
  "Frutas",
  "Sobremesas",
  "Padaria",
  "Cereais",
  "Temperos",
  "Congelados",
  "Enlatados",
];

export const formatCurrencyBRL = (centavos: number | undefined) => {
  const v = typeof centavos === "number" ? centavos / 100 : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
