-- Tabela de Fornecedores
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

-- Trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.data_atualizacao = now();
  return new;
end;
$$ language plpgsql;

create trigger fornecedores_set_updated_at
before update on public.fornecedores
for each row execute function public.set_updated_at();

-- Tabela de Endereços dos Fornecedores
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
