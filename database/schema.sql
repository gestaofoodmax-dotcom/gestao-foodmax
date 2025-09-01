-- Pedidos module schema (PostgreSQL compatible)
-- This script creates the required tables, relations and triggers for the Pedidos module

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum-like constraints via CHECK
CREATE TABLE IF NOT EXISTS pedidos (
  id BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL,
  estabelecimento_id BIGINT NOT NULL,
  cliente_id BIGINT NULL,
  codigo VARCHAR(32) NOT NULL UNIQUE,
  tipo_pedido VARCHAR(16) NOT NULL CHECK (tipo_pedido IN ('Atendente','QR Code','APP','Outro')),
  valor_total_centavos BIGINT NOT NULL DEFAULT 0 CHECK (valor_total_centavos >= 0),
  data_hora_finalizado TIMESTAMPTZ NULL,
  observacao TEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente','Finalizado','Cancelado')),
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relations (will succeed only if referenced tables exist)
DO $$ BEGIN
  ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_estabelecimento FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_pedidos_estabelecimento ON pedidos(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_codigo ON pedidos(codigo);

-- Child: pedidos_cardapios
CREATE TABLE IF NOT EXISTS pedidos_cardapios (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL,
  cardapio_id BIGINT NOT NULL,
  preco_total_centavos BIGINT NOT NULL DEFAULT 0 CHECK (preco_total_centavos >= 0),
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE pedidos_cardapios
    ADD CONSTRAINT fk_pedidos_cardapios_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pedidos_cardapios
    ADD CONSTRAINT fk_pedidos_cardapios_cardapio FOREIGN KEY (cardapio_id) REFERENCES cardapios(id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_pedidos_cardapios_pedido ON pedidos_cardapios(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cardapios_cardapio ON pedidos_cardapios(cardapio_id);

-- Child: pedidos_itens_extras
CREATE TABLE IF NOT EXISTS pedidos_itens_extras (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  categoria_id BIGINT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario_centavos BIGINT NOT NULL CHECK (valor_unitario_centavos >= 0),
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE pedidos_itens_extras
    ADD CONSTRAINT fk_pedidos_itens_extras_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pedidos_itens_extras
    ADD CONSTRAINT fk_pedidos_itens_extras_item FOREIGN KEY (item_id) REFERENCES itens(id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pedidos_itens_extras
    ADD CONSTRAINT fk_pedidos_itens_extras_categoria FOREIGN KEY (categoria_id) REFERENCES itens_categorias(id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_pedidos_itens_extras_pedido ON pedidos_itens_extras(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_itens_extras_item ON pedidos_itens_extras(item_id);

-- Trigger to auto-update data_atualizacao
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_pedidos_updated
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_pedidos_cardapios_updated
  BEFORE UPDATE ON pedidos_cardapios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_pedidos_itens_extras_updated
  BEFORE UPDATE ON pedidos_itens_extras
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Generate default random codigo if not provided
CREATE OR REPLACE FUNCTION ensure_pedido_codigo()
RETURNS TRIGGER AS $$
DECLARE
  p1 TEXT;
  p2 TEXT;
BEGIN
  IF NEW.codigo IS NULL OR LENGTH(TRIM(NEW.codigo)) = 0 THEN
    p1 := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text,'-','') FROM 1 FOR 4));
    p2 := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text,'-','') FROM 5 FOR 4));
    NEW.codigo := p1 || '-' || p2;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_pedidos_codigo
  BEFORE INSERT ON pedidos
  FOR EACH ROW EXECUTE FUNCTION ensure_pedido_codigo();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
