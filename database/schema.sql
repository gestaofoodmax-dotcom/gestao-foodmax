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
  preco_centavos integer not null check (preco_centavos >= 0),
  custo_pago_centavos integer not null check (custo_pago_centavos >= 0),
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

-- Seed function for default categorias (12 principais)
create or replace function public.seed_itens_categorias_defaults(p_user_id bigint)
returns void as $$
begin
  if not exists (select 1 from public.itens_categorias where id_usuario = p_user_id) then
    insert into public.itens_categorias (id_usuario, nome, descricao, ativo)
    values
      (p_user_id, 'Carnes', 'Cortes bovinos, suínos e outras carnes vermelhas.', true),
      (p_user_id, 'Aves', 'Frango, peru e outras aves.', true),
      (p_user_id, 'Peixes', 'Peixes e frutos do mar frescos ou congelados.', true),
      (p_user_id, 'Laticínios', 'Leite, queijos, iogurtes e derivados.', true),
      (p_user_id, 'Bebidas', 'Bebidas alcoólicas e não alcoólicas.', true),
      (p_user_id, 'Vegetais', 'Hortaliças e legumes frescos.', true),
      (p_user_id, 'Frutas', 'Frutas frescas e secas.', true),
      (p_user_id, 'Massas', 'Massas secas e frescas.', true),
      (p_user_id, 'Grãos e Cereais', 'Arroz, feijão, aveia e outros grãos.', true),
      (p_user_id, 'Padaria', 'Pães, bolos e produtos de panificação.', true),
      (p_user_id, 'Sobremesas', 'Doces, tortas e sobremesas em geral.', true),
      (p_user_id, 'Temperos e Condimentos', 'Ervas, especiarias e molhos prontos.', true);
  end if;
end;
$$ language plpgsql;
