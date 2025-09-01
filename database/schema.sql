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
  codigo TEXT NOT NULL UNIQUE,
  observacao TEXT NULL,
  status status_pedido_enum NOT NULL DEFAULT 'Pendente',
  valor_total_centavos INTEGER NOT NULL DEFAULT 0,
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
  preco_total_centavos INTEGER NOT NULL DEFAULT 0,
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
  valor_unitario_centavos INTEGER NOT NULL DEFAULT 0,
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

DROP TRIGGER IF EXISTS trg_pedidos_itens_extras_validate ON pedidos_itens_extras;
CREATE TRIGGER trg_pedidos_itens_extras_validate
BEFORE INSERT OR UPDATE ON pedidos_itens_extras
FOR EACH ROW EXECUTE FUNCTION validate_item_stock();
