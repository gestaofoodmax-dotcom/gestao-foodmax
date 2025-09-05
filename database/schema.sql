-- FoodMax database schema additions for Suportes (Support Tickets)
-- This file includes only the Suportes module DDL and preserves any existing schema by appending definitions.

-- Enum-like constraints
CREATE TABLE IF NOT EXISTS suportes (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome_usuario VARCHAR(200) NOT NULL,
  email_usuario VARCHAR(200) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Técnico','Financeiro','Dúvida','Sugestão','Reclamação','Outro')),
  prioridade VARCHAR(10) NOT NULL CHECK (prioridade IN ('Baixa','Média','Alta')),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Aberto' CHECK (status IN ('Aberto','Em Andamento','Resolvido','Fechado')),
  resposta_admin TEXT,
  data_resposta_admin TIMESTAMP WITH TIME ZONE,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suportes_usuario ON suportes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_suportes_status ON suportes(status);
CREATE INDEX IF NOT EXISTS idx_suportes_prioridade ON suportes(prioridade);
CREATE INDEX IF NOT EXISTS idx_suportes_tipo ON suportes(tipo);

-- Events table to simulate notifications/email logs
CREATE TABLE IF NOT EXISTS suportes_eventos (
  id SERIAL PRIMARY KEY,
  suporte_id INTEGER NOT NULL REFERENCES suportes(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(50) NOT NULL,
  detalhes TEXT,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suportes_eventos_suporte ON suportes_eventos(suporte_id);

-- Trigger to auto-update data_atualizacao
CREATE OR REPLACE FUNCTION set_updated_at_suportes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_suportes_updated_at ON suportes;
CREATE TRIGGER trg_suportes_updated_at
BEFORE UPDATE ON suportes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_suportes();
