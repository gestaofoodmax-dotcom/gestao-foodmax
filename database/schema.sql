-- FoodMax - Base Schema (users, auth, core entities)

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
