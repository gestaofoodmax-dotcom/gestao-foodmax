-- Itens and categorias tables (PostgreSQL / Supabase)
create table if not exists itens_categorias (
  id bigserial primary key,
  id_usuario bigint not null,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  data_cadastro timestamp with time zone not null default now(),
  data_atualizacao timestamp with time zone not null default now()
);

create index if not exists idx_itens_categorias_usuario on itens_categorias(id_usuario);
create index if not exists idx_itens_categorias_nome on itens_categorias(nome);

create table if not exists itens (
  id bigserial primary key,
  id_usuario bigint not null,
  categoria_id bigint not null references itens_categorias(id) on delete restrict,
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

create index if not exists idx_itens_usuario on itens(id_usuario);
create index if not exists idx_itens_categoria on itens(categoria_id);
create index if not exists idx_itens_nome on itens(nome);

-- trigger to update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.data_atualizacao = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_itens_update') then
    create trigger trg_itens_update before update on itens
    for each row execute procedure set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_itens_categorias_update') then
    create trigger trg_itens_categorias_update before update on itens_categorias
    for each row execute procedure set_updated_at();
  end if;
end $$;
