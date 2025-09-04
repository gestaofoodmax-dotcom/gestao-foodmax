-- Tabelas para módulo Entregas

-- Tipos enumerados (em Supabase/Postgres recomenda-se enum ou check constraint). Aqui usaremos CHECK para ampla compatibilidade.

CREATE TABLE IF NOT EXISTS entregas (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL,
  estabelecimento_id INTEGER NOT NULL,
  tipo_entrega TEXT NOT NULL CHECK (tipo_entrega IN ('Própria','iFood','Rappi','UberEats','Outro')) DEFAULT 'Própria',
  pedido_id INTEGER NULL,
  codigo_pedido_app TEXT NULL,
  valor_pedido INTEGER NOT NULL DEFAULT 0, -- centavos
  taxa_extra INTEGER NOT NULL DEFAULT 0,   -- centavos
  valor_entrega INTEGER NOT NULL DEFAULT 0, -- centavos
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('PIX','Cartão de Débito','Cartão de Crédito','Dinheiro','Outro')) DEFAULT 'PIX',
  cliente_id INTEGER NULL,
  ddi TEXT NOT NULL DEFAULT '+55',
  telefone TEXT NOT NULL,
  data_hora_saida TIMESTAMPTZ NULL,
  data_hora_entregue TIMESTAMPTZ NULL,
  observacao TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pendente','Saiu','Entregue','Cancelado')) DEFAULT 'Pendente',
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entregas_usuario ON entregas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_entregas_estabelecimento ON entregas(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_entregas_pedido ON entregas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_entregas_cliente ON entregas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_entregas_tipo ON entregas(tipo_entrega);
CREATE INDEX IF NOT EXISTS idx_entregas_status ON entregas(status);

-- Endereço da entrega (1:1)
CREATE TABLE IF NOT EXISTS entregas_enderecos (
  id SERIAL PRIMARY KEY,
  entrega_id INTEGER NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  cep TEXT NULL,
  endereco TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  pais TEXT NOT NULL DEFAULT 'Brasil',
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entregas_enderecos_entrega ON entregas_enderecos(entrega_id);

-- Relacionamentos (ajuste os nomes das tabelas de referência conforme seu schema existente)
-- Supondo tabelas existentes: usuarios(id), estabelecimentos(id), pedidos(id), clientes(id)
-- Caso existam, podem-se adicionar as FKs abaixo (use IF NOT EXISTS em migrações controladas):
-- ALTER TABLE entregas ADD CONSTRAINT fk_entregas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id);
-- ALTER TABLE entregas ADD CONSTRAINT fk_entregas_estabelecimento FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id);
-- ALTER TABLE entregas ADD CONSTRAINT fk_entregas_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id);
-- ALTER TABLE entregas ADD CONSTRAINT fk_entregas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id);

-- Trigger para atualizar data_atualizacao em updates
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entregas_updated_at ON entregas;
CREATE TRIGGER trg_entregas_updated_at
BEFORE UPDATE ON entregas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_entregas_enderecos_updated_at ON entregas_enderecos;
CREATE TRIGGER trg_entregas_enderecos_updated_at
BEFORE UPDATE ON entregas_enderecos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
