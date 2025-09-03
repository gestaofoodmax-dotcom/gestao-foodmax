-- Enable extensions if needed
-- create extension if not exists pgcrypto;

-- Users table
create table if not exists public.usuarios (
  id bigserial primary key,
  email text not null unique,
  senha text not null,
  role text default 'user',
  ativo boolean not null default true,
  onboarding boolean not null default false,
  ip text,
  data_pagamento timestamp with time zone,
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);

-- Contacts for users (used in onboarding)
create table if not exists public.usuarios_contatos (
  id bigserial primary key,
  usuario_id bigint not null references public.usuarios(id) on delete cascade,
  nome text not null,
  ddi varchar(10) not null,
  telefone varchar(15) not null,
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists usuarios_contatos_usuario_idx on public.usuarios_contatos(usuario_id);

-- Login attempts per day (ip+email)
create table if not exists public.login_attempts (
  id bigserial primary key,
  ip text not null,
  email text not null,
  attempt_date date not null default current_date,
  attempts_count int not null default 1,
  last_attempt timestamp with time zone not null default now()
);
create index if not exists login_attempts_idx on public.login_attempts(ip, email, attempt_date);

-- Registration attempts per day (ip)
create table if not exists public.registration_attempts (
  id bigserial primary key,
  ip text not null,
  registration_date date not null default current_date,
  registrations_count int not null default 1,
  last_registration timestamp with time zone not null default now()
);
create index if not exists registration_attempts_idx on public.registration_attempts(ip, registration_date);

-- Helper function to keep updated_at columns
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.data_atualizacao = now();
  return new;
end;
$$ language plpgsql;

-- Estabelecimentos
create table if not exists public.estabelecimentos (
  id bigserial primary key,
  id_usuario bigint not null references public.usuarios(id) on delete cascade,
  nome text not null,
  razao_social text,
  cnpj varchar(14),
  tipo_estabelecimento text not null,
  email text not null,
  ddi varchar(10) not null,
  telefone varchar(15) not null,
  ativo boolean not null default true,
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists estabelecimentos_usuario_idx on public.estabelecimentos(id_usuario);
create index if not exists estabelecimentos_nome_idx on public.estabelecimentos(nome);
create trigger estabelecimentos_set_updated_at
before update on public.estabelecimentos
for each row execute function public.set_updated_at();

create table if not exists public.estabelecimentos_enderecos (
  id bigserial primary key,
  estabelecimento_id bigint not null references public.estabelecimentos(id) on delete cascade,
  cep varchar(8),
  endereco text,
  cidade text,
  uf char(2),
  pais text not null default 'Brasil',
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists estabelecimentos_enderecos_est_idx on public.estabelecimentos_enderecos(estabelecimento_id);
create trigger estabelecimentos_enderecos_set_updated_at
before update on public.estabelecimentos_enderecos
for each row execute function public.set_updated_at();

-- Clientes
create table if not exists public.clientes (
  id bigserial primary key,
  id_usuario bigint not null references public.usuarios(id) on delete cascade,
  estabelecimento_id bigint not null references public.estabelecimentos(id) on delete restrict,
  nome text not null,
  genero text,
  profissao text,
  email text,
  ddi varchar(10) not null,
  telefone varchar(15) not null,
  ativo boolean not null default true,
  aceita_promocao_email boolean not null default false,
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists clientes_usuario_idx on public.clientes(id_usuario);
create index if not exists clientes_estabelecimento_idx on public.clientes(estabelecimento_id);
create trigger clientes_set_updated_at
before update on public.clientes
for each row execute function public.set_updated_at();

create table if not exists public.clientes_enderecos (
  id bigserial primary key,
  cliente_id bigint not null references public.clientes(id) on delete cascade,
  cep varchar(8),
  endereco text,
  cidade text,
  uf char(2),
  pais text not null default 'Brasil',
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists clientes_enderecos_cliente_idx on public.clientes_enderecos(cliente_id);
create trigger clientes_enderecos_set_updated_at
before update on public.clientes_enderecos
for each row execute function public.set_updated_at();

-- Fornecedores (novo módulo)
create table if not exists public.fornecedores (
  id bigserial primary key,
  id_usuario bigint not null references public.usuarios(id) on delete cascade,
  nome text not null,
  razao_social text,
  cnpj varchar(14),
  email text not null,
  ddi varchar(10) not null,
  telefone varchar(15) not null,
  nome_responsavel text,
  ativo boolean not null default true,
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists fornecedores_usuario_idx on public.fornecedores(id_usuario);
create index if not exists fornecedores_nome_idx on public.fornecedores(nome);
create unique index if not exists fornecedores_unique_nome_usuario on public.fornecedores(id_usuario, nome);
create trigger fornecedores_set_updated_at
before update on public.fornecedores
for each row execute function public.set_updated_at();

create table if not exists public.fornecedores_enderecos (
  id bigserial primary key,
  fornecedor_id bigint not null references public.fornecedores(id) on delete cascade,
  cep varchar(8),
  endereco text,
  cidade text,
  uf char(2),
  pais text not null default 'Brasil',
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists fornecedores_enderecos_fornecedor_idx on public.fornecedores_enderecos(fornecedor_id);
create trigger fornecedores_enderecos_set_updated_at
before update on public.fornecedores_enderecos
for each row execute function public.set_updated_at();

-- Itens (novo módulo)
create table if not exists public.itens_categorias (
  id bigserial primary key,
  id_usuario bigint not null references public.usuarios(id) on delete cascade,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists itens_categorias_usuario_idx on public.itens_categorias(id_usuario);
create index if not exists itens_categorias_nome_idx on public.itens_categorias(nome);
create trigger itens_categorias_set_updated_at
before update on public.itens_categorias
for each row execute function public.set_updated_at();

create table if not exists public.itens (
  id bigserial primary key,
  id_usuario bigint not null references public.usuarios(id) on delete cascade,
  categoria_id bigint not null references public.itens_categorias(id) on delete restrict,
  nome text not null,
  preco integer not null check (preco >= 0),
  custo_pago integer not null check (custo_pago >= 0),
  unidade_medida text not null,
  peso_gramas integer,
  estoque_atual integer,
  ativo boolean not null default true,
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists itens_usuario_idx on public.itens(id_usuario);
create index if not exists itens_categoria_idx on public.itens(categoria_id);
create index if not exists itens_nome_idx on public.itens(nome);
create trigger itens_set_updated_at
before update on public.itens
for each row execute function public.set_updated_at();

-- Cardápios (novo m��dulo)
create table if not exists public.cardapios (
  id bigserial primary key,
  id_usuario bigint not null references public.usuarios(id) on delete cascade,
  nome text not null,
  tipo_cardapio text not null check (tipo_cardapio in ('Café', 'Almoço', 'Janta', 'Lanche', 'Bebida', 'Outro')),
  quantidade_total integer not null default 0,
  preco_itens integer not null default 0 check (preco_itens >= 0),
  margem_lucro_percentual numeric(5,2) not null default 0 check (margem_lucro_percentual >= 0),
  preco_total integer not null default 0 check (preco_total >= 0),
  descricao text,
  ativo boolean not null default true,
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists cardapios_usuario_idx on public.cardapios(id_usuario);
create index if not exists cardapios_tipo_idx on public.cardapios(tipo_cardapio);
create index if not exists cardapios_nome_idx on public.cardapios(nome);
create trigger cardapios_set_updated_at
before update on public.cardapios
for each row execute function public.set_updated_at();

-- Itens do cardápio (relacionamento)
create table if not exists public.cardapios_itens (
  id bigserial primary key,
  cardapio_id bigint not null references public.cardapios(id) on delete cascade,
  item_id bigint not null references public.itens(id) on delete restrict,
  quantidade integer not null default 1 check (quantidade > 0),
  valor_unitario integer not null default 0 check (valor_unitario >= 0),
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);
create index if not exists cardapios_itens_cardapio_idx on public.cardapios_itens(cardapio_id);
create index if not exists cardapios_itens_item_idx on public.cardapios_itens(item_id);
create unique index if not exists cardapios_itens_unique on public.cardapios_itens(cardapio_id, item_id);
create trigger cardapios_itens_set_updated_at
before update on public.cardapios_itens
for each row execute function public.set_updated_at();

-- Seed function for default categorias (12 principais)
-- Only executes on first access - if user already has any categories, skips insertion
create or replace function public.seed_itens_categorias_defaults(p_user_id bigint)
returns void as $$
begin
  -- Only insert default categories if user has no categories yet (first access only)
  if not exists (select 1 from public.itens_categorias where id_usuario = p_user_id) then
    insert into public.itens_categorias (id_usuario, nome, descricao, ativo)
    values
      (p_user_id, 'Carne', 'Cortes bovinos, suínos e outras carnes vermelhas.', true),
      (p_user_id, 'Ave', 'Frango, peru e outras aves.', true),
      (p_user_id, 'Peixe', 'Peixes e frutos do mar frescos ou congelados.', true),
      (p_user_id, 'Laticínio', 'Leite, queijos, iogurtes e derivados.', true),
      (p_user_id, 'Bebida', 'Bebidas alcoólicas e não alcoólicas.', true),
      (p_user_id, 'Vegetal', 'Hortaliças e legumes frescos.', true),
      (p_user_id, 'Fruta', 'Frutas frescas e secas.', true),
      (p_user_id, 'Massa', 'Massas secas e frescas.', true),
      (p_user_id, 'Grão e Cereal', 'Arroz, feijão, aveia e outros grãos.', true),
      (p_user_id, 'Pão', 'Pães, bolos e produtos de panificação.', true),
      (p_user_id, 'Sobremesa', 'Doces, tortas e sobremesas em geral.', true),
      (p_user_id, 'Tempero e Condimento', 'Ervas, especiarias e molhos prontos.', true);
  end if;
end;
$$ language plpgsql;

-- Schema for Pedidos module and related junction tables
-- Requires existing tables: usuarios, estabelecimentos, clientes, itens_categorias, itens, cardapios

-- Utility: update data_atualizacao automatically
CREATE OR REPLACE FUNCTION set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate estoque for pedidos_itens_extras
CREATE OR REPLACE FUNCTION validate_item_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_estoque INTEGER;
  v_categoria INTEGER;
BEGIN
  SELECT estoque_atual, categoria_id INTO v_estoque, v_categoria FROM itens WHERE id = NEW.item_id;

  IF v_categoria IS NULL OR v_categoria <> NEW.categoria_id THEN
    RAISE EXCEPTION 'Categoria do item não confere (item %, categoria %)', NEW.item_id, NEW.categoria_id;
  END IF;

  IF v_estoque IS NULL THEN
    v_estoque := 0;
  END IF;

  IF v_estoque <= 0 THEN
    RAISE EXCEPTION 'Item sem estoque (item %). Ajuste no módulo Itens.', NEW.item_id;
  END IF;

  IF NEW.quantidade > v_estoque THEN
    RAISE EXCEPTION 'Quantidade informada (%) é maior que o estoque atual (%) do item %', NEW.quantidade, v_estoque, NEW.item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tipos permitidos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_pedido_enum') THEN
    CREATE TYPE tipo_pedido_enum AS ENUM ('Atendente', 'QR Code', 'APP', 'Outro');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_pedido_enum') THEN
    CREATE TYPE status_pedido_enum AS ENUM ('Pendente', 'Finalizado', 'Cancelado');
  END IF;
END $$;

-- Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL,
  estabelecimento_id INTEGER NOT NULL REFERENCES estabelecimentos(id) ON DELETE RESTRICT,
  cliente_id INTEGER NULL REFERENCES clientes(id) ON DELETE SET NULL,
  tipo_pedido tipo_pedido_enum NOT NULL,
  codigo VARCHAR(8) NOT NULL UNIQUE,
  observacao TEXT NULL,
  status status_pedido_enum NOT NULL DEFAULT 'Pendente',
  valor_total INTEGER NOT NULL DEFAULT 0,
  data_hora_finalizado TIMESTAMPTZ NULL,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_pedidos_estabelecimento ON pedidos(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_codigo ON pedidos(codigo);

DROP TRIGGER IF EXISTS trg_pedidos_set_timestamp ON pedidos;
CREATE TRIGGER trg_pedidos_set_timestamp
BEFORE UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION set_timestamp();

-- Pedidos x Cardápios
CREATE TABLE IF NOT EXISTS pedidos_cardapios (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  cardapio_id INTEGER NOT NULL REFERENCES cardapios(id) ON DELETE RESTRICT,
  preco_total INTEGER NOT NULL DEFAULT 0,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cardapios_pedido ON pedidos_cardapios(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cardapios_cardapio ON pedidos_cardapios(cardapio_id);

DROP TRIGGER IF EXISTS trg_pedidos_cardapios_set_timestamp ON pedidos_cardapios;
CREATE TRIGGER trg_pedidos_cardapios_set_timestamp
BEFORE UPDATE ON pedidos_cardapios
FOR EACH ROW EXECUTE FUNCTION set_timestamp();

-- Pedidos Itens Extras
CREATE TABLE IF NOT EXISTS pedidos_itens_extras (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES itens(id) ON DELETE RESTRICT,
  categoria_id INTEGER NOT NULL REFERENCES itens_categorias(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario INTEGER NOT NULL DEFAULT 0,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_itens_extras_pedido ON pedidos_itens_extras(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_itens_extras_item ON pedidos_itens_extras(item_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_itens_extras_cat ON pedidos_itens_extras(categoria_id);

DROP TRIGGER IF EXISTS trg_pedidos_itens_extras_set_timestamp ON pedidos_itens_extras;
CREATE TRIGGER trg_pedidos_itens_extras_set_timestamp
BEFORE UPDATE ON pedidos_itens_extras
FOR EACH ROW EXECUTE FUNCTION set_timestamp();

-- Abastecimentos Module Database Schema
-- Created for FoodMax Application - Supply Management

-- Table: abastecimentos
-- Main table for supply management
CREATE TABLE IF NOT EXISTS abastecimentos (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    estabelecimento_id INTEGER NOT NULL,
    fornecedores_ids INTEGER[] NOT NULL DEFAULT '{}',
    codigo VARCHAR(8) NOT NULL UNIQUE,
    categoria_id INTEGER NOT NULL,
    quantidade_total INTEGER NOT NULL DEFAULT 0,
    telefone VARCHAR(15) NOT NULL,
    ddi VARCHAR(10) NOT NULL DEFAULT '+55',
    email VARCHAR(255),
    data_hora_recebido TIMESTAMP WITH TIME ZONE,
    observacao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Enviado', 'Recebido', 'Cancelado')),
    email_enviado BOOLEAN NOT NULL DEFAULT FALSE,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_abastecimentos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_abastecimentos_estabelecimento FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    CONSTRAINT fk_abastecimentos_categoria FOREIGN KEY (categoria_id) REFERENCES itens_categorias(id) ON DELETE CASCADE
);

-- Table: abastecimentos_itens
-- Junction table for items in each supply order
CREATE TABLE IF NOT EXISTS abastecimentos_itens (
    id SERIAL PRIMARY KEY,
    abastecimento_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    unidade_medida VARCHAR(50) NOT NULL DEFAULT 'Unidade',
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_abastecimentos_itens_abastecimento FOREIGN KEY (abastecimento_id) REFERENCES abastecimentos(id) ON DELETE CASCADE,
    CONSTRAINT fk_abastecimentos_itens_item FOREIGN KEY (item_id) REFERENCES itens(id) ON DELETE CASCADE,

    -- Unique constraint to prevent duplicate items in same supply order
    CONSTRAINT uk_abastecimentos_itens_unique UNIQUE (abastecimento_id, item_id)
);

-- Table: abastecimentos_enderecos
-- Address information for each supply order
CREATE TABLE IF NOT EXISTS abastecimentos_enderecos (
    id SERIAL PRIMARY KEY,
    abastecimento_id INTEGER NOT NULL,
    cep VARCHAR(8),
    endereco VARCHAR(255) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    pais VARCHAR(100) NOT NULL DEFAULT 'Brasil',
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_abastecimentos_enderecos_abastecimento FOREIGN KEY (abastecimento_id) REFERENCES abastecimentos(id) ON DELETE CASCADE,

    -- Unique constraint to ensure one address per supply order
    CONSTRAINT uk_abastecimentos_enderecos_unique UNIQUE (abastecimento_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_abastecimentos_usuario ON abastecimentos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_estabelecimento ON abastecimentos(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_codigo ON abastecimentos(codigo);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_categoria ON abastecimentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_status ON abastecimentos(status);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_data_cadastro ON abastecimentos(data_cadastro);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_data_hora_recebido ON abastecimentos(data_hora_recebido);

CREATE INDEX IF NOT EXISTS idx_abastecimentos_itens_abastecimento ON abastecimentos_itens(abastecimento_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_itens_item ON abastecimentos_itens(item_id);

CREATE INDEX IF NOT EXISTS idx_abastecimentos_enderecos_abastecimento ON abastecimentos_enderecos(abastecimento_id);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_data_atualizacao_abastecimentos()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_abastecimentos_data_atualizacao
    BEFORE UPDATE ON abastecimentos
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao_abastecimentos();

CREATE TRIGGER trigger_update_abastecimentos_itens_data_atualizacao
    BEFORE UPDATE ON abastecimentos_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao_abastecimentos();

CREATE TRIGGER trigger_update_abastecimentos_enderecos_data_atualizacao
    BEFORE UPDATE ON abastecimentos_enderecos
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao_abastecimentos();

-- Trigger to update quantidade_total when items are added/removed/updated
CREATE OR REPLACE FUNCTION update_abastecimento_quantidade_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE abastecimentos
    SET quantidade_total = (
        SELECT COALESCE(SUM(quantidade), 0)
        FROM abastecimentos_itens
        WHERE abastecimento_id = COALESCE(NEW.abastecimento_id, OLD.abastecimento_id)
    )
    WHERE id = COALESCE(NEW.abastecimento_id, OLD.abastecimento_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quantidade_total_insert
    AFTER INSERT ON abastecimentos_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_abastecimento_quantidade_total();

CREATE TRIGGER trigger_update_quantidade_total_update
    AFTER UPDATE ON abastecimentos_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_abastecimento_quantidade_total();

CREATE TRIGGER trigger_update_quantidade_total_delete
    AFTER DELETE ON abastecimentos_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_abastecimento_quantidade_total();

-- Comments for documentation
COMMENT ON TABLE abastecimentos IS 'Main table for supply orders management';
COMMENT ON COLUMN abastecimentos.id_usuario IS 'User who created the supply order';
COMMENT ON COLUMN abastecimentos.estabelecimento_id IS 'Establishment requesting the supply';
COMMENT ON COLUMN abastecimentos.fornecedores_ids IS 'Array of supplier IDs for this order';
COMMENT ON COLUMN abastecimentos.categoria_id IS 'Category of items being ordered (only one category per order)';
COMMENT ON COLUMN abastecimentos.quantidade_total IS 'Total quantity of all items in the order';
COMMENT ON COLUMN abastecimentos.telefone IS 'Contact phone number (DDI + phone)';
COMMENT ON COLUMN abastecimentos.ddi IS 'International dialing code';
COMMENT ON COLUMN abastecimentos.email IS 'Contact email address';
COMMENT ON COLUMN abastecimentos.data_hora_recebido IS 'Date and time when order was received';
COMMENT ON COLUMN abastecimentos.observacao IS 'Additional notes or observations';
COMMENT ON COLUMN abastecimentos.status IS 'Order status: Pendente, Enviado, Recebido, Cancelado';
COMMENT ON COLUMN abastecimentos.email_enviado IS 'Whether email was sent to suppliers';

COMMENT ON TABLE abastecimentos_itens IS 'Items included in each supply order (shopping cart)';
COMMENT ON COLUMN abastecimentos_itens.abastecimento_id IS 'Reference to the supply order';
COMMENT ON COLUMN abastecimentos_itens.item_id IS 'Reference to the item being ordered';
COMMENT ON COLUMN abastecimentos_itens.quantidade IS 'Quantity of this item in the order';
COMMENT ON COLUMN abastecimentos_itens.unidade_medida IS 'Unit of measure for the item (e.g., Quilograma, Litro, Unidade)';

COMMENT ON TABLE abastecimentos_enderecos IS 'Delivery address for each supply order';
COMMENT ON COLUMN abastecimentos_enderecos.abastecimento_id IS 'Reference to the supply order';
COMMENT ON COLUMN abastecimentos_enderecos.cep IS 'Postal code (Brazilian CEP)';
COMMENT ON COLUMN abastecimentos_enderecos.endereco IS 'Street address';
COMMENT ON COLUMN abastecimentos_enderecos.cidade IS 'City name';
COMMENT ON COLUMN abastecimentos_enderecos.uf IS 'State abbreviation (2 characters)';
COMMENT ON COLUMN abastecimentos_enderecos.pais IS 'Country name';
