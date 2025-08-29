-- FoodMax Database Schema
-- Execute this after connecting to Neon database

-- Table: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    onboarding BOOLEAN DEFAULT FALSE,
    ip VARCHAR(45),
    data_pagamento DATE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(50) DEFAULT 'user',
    ativo BOOLEAN DEFAULT TRUE,
    login_attempts INTEGER DEFAULT 0,
    last_login_attempt TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: usuarios_contatos
CREATE TABLE IF NOT EXISTS usuarios_contatos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    ddi VARCHAR(10) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    cep VARCHAR(10),
    endereco TEXT,
    cidade VARCHAR(100),
    uf VARCHAR(2),
    pais VARCHAR(100) DEFAULT 'Brasil',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: login_attempts (for tracking failed login attempts by IP)
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    email VARCHAR(255),
    attempt_date DATE DEFAULT CURRENT_DATE,
    attempts_count INTEGER DEFAULT 1,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ip, email, attempt_date)
);

-- Table: registration_attempts (for tracking registrations by IP per day)
CREATE TABLE IF NOT EXISTS registration_attempts (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    registration_date DATE DEFAULT CURRENT_DATE,
    registrations_count INTEGER DEFAULT 1,
    last_registration TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ip, registration_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_date ON login_attempts(ip, attempt_date);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_ip_date ON registration_attempts(ip, registration_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_contatos_updated_at BEFORE UPDATE ON usuarios_contatos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample admin user (password: Admin123!)
-- INSERT INTO usuarios (email, senha, role, onboarding)
-- VALUES ('admin@foodmax.com', '$2b$12$example_hash_here', 'admin', TRUE);

-- Tabela: estabelecimentos
CREATE TABLE IF NOT EXISTS public.estabelecimentos (
  id                BIGSERIAL PRIMARY KEY,
  id_usuario        BIGINT NOT NULL,
  nome              VARCHAR(255) NOT NULL,
  razao_social      VARCHAR(255),
  cnpj              VARCHAR(14),
  tipo_estabelecimento TEXT NOT NULL,
  email             VARCHAR(255) NOT NULL,
  ddi               VARCHAR(10) NOT NULL,
  telefone          VARCHAR(15) NOT NULL,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  data_cadastro     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_usuario ON public.estabelecimentos (id_usuario);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_nome ON public.estabelecimentos (nome);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_cnpj ON public.estabelecimentos (cnpj);

-- Endereço do estabelecimento
CREATE TABLE IF NOT EXISTS public.estabelecimentos_enderecos (
  id                 BIGSERIAL PRIMARY KEY,
  estabelecimento_id BIGINT NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  cep                VARCHAR(8),
  endereco           VARCHAR(255),
  cidade             VARCHAR(120),
  uf                 CHAR(2),
  pais               VARCHAR(120) NOT NULL DEFAULT 'Brasil',
  data_cadastro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_est_end_estabelecimento ON public.estabelecimentos_enderecos (estabelecimento_id);

-- Tabela: clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id                      BIGSERIAL PRIMARY KEY,
  id_usuario              BIGINT NOT NULL,
  estabelecimento_id      BIGINT NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE RESTRICT,
  nome                    VARCHAR(255) NOT NULL,
  genero                  TEXT,
  profissao               VARCHAR(255),
  email                   VARCHAR(255),
  ddi                     VARCHAR(10) NOT NULL,
  telefone                VARCHAR(15) NOT NULL,
  aceita_promocao_email   BOOLEAN NOT NULL DEFAULT FALSE,
  ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
  data_cadastro           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_usuario ON public.clientes (id_usuario);
CREATE INDEX IF NOT EXISTS idx_clientes_estabelecimento ON public.clientes (estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes (nome);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes (telefone);

-- Endereço do cliente
CREATE TABLE IF NOT EXISTS public.clientes_enderecos (
  id            BIGSERIAL PRIMARY KEY,
  cliente_id    BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cep           VARCHAR(8),
  endereco      VARCHAR(255),
  cidade        VARCHAR(120),
  uf            CHAR(2),
  pais          VARCHAR(120) NOT NULL DEFAULT 'Brasil',
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cli_end_cliente ON public.clientes_enderecos (cliente_id);

-- Atualiza automaticamente data_atualizacao em UPDATE (PostgreSQL trigger)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
    BEGIN
      NEW.data_atualizacao = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_estabelecimentos_set_updated_at') THEN
    CREATE TRIGGER trg_estabelecimentos_set_updated_at
    BEFORE UPDATE ON public.estabelecimentos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_est_end_set_updated_at') THEN
    CREATE TRIGGER trg_est_end_set_updated_at
    BEFORE UPDATE ON public.estabelecimentos_enderecos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clientes_set_updated_at') THEN
    CREATE TRIGGER trg_clientes_set_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cli_end_set_updated_at') THEN
    CREATE TRIGGER trg_cli_end_set_updated_at
    BEFORE UPDATE ON public.clientes_enderecos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;
