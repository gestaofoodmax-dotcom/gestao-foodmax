-- Estabelecimentos Module Database Schema
-- Execute this schema after connecting to your Neon database

-- First, add the data_pagamento field to existing usuarios table
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;

-- Create estabelecimentos table
CREATE TABLE IF NOT EXISTS estabelecimentos (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj VARCHAR(18), -- with mask: XX.XXX.XXX/XXXX-XX
    tipo_estabelecimento VARCHAR(50) NOT NULL CHECK (tipo_estabelecimento IN (
        'Restaurante', 'Bar', 'Lancheria', 'Churrascaria', 
        'Petiscaria', 'Pizzaria', 'Outro'
    )),
    email VARCHAR(255) NOT NULL,
    ddi VARCHAR(5) NOT NULL DEFAULT '+55',
    telefone VARCHAR(15) NOT NULL, -- 15 numeric characters
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_estabelecimento_por_usuario UNIQUE(id_usuario, nome),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create estabelecimentos_enderecos table
CREATE TABLE IF NOT EXISTS estabelecimentos_enderecos (
    id SERIAL PRIMARY KEY,
    estabelecimento_id INTEGER NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    cep VARCHAR(8), -- 8 numeric characters without mask
    endereco TEXT,
    cidade VARCHAR(255),
    uf VARCHAR(2),
    pais VARCHAR(100) DEFAULT 'Brasil',
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_cep CHECK (cep ~ '^[0-9]{8}$' OR cep IS NULL),
    CONSTRAINT valid_uf CHECK (LENGTH(uf) = 2 OR uf IS NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_usuario ON estabelecimentos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_ativo ON estabelecimentos(ativo);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_tipo ON estabelecimentos(tipo_estabelecimento);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_email ON estabelecimentos(email);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_data ON estabelecimentos(data_cadastro);
CREATE INDEX IF NOT EXISTS idx_enderecos_estabelecimento ON estabelecimentos_enderecos(estabelecimento_id);

-- Create trigger to automatically update data_atualizacao
CREATE OR REPLACE FUNCTION update_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to both tables
DROP TRIGGER IF EXISTS update_estabelecimentos_data_atualizacao ON estabelecimentos;
CREATE TRIGGER update_estabelecimentos_data_atualizacao
    BEFORE UPDATE ON estabelecimentos
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao();

DROP TRIGGER IF EXISTS update_enderecos_data_atualizacao ON estabelecimentos_enderecos;
CREATE TRIGGER update_enderecos_data_atualizacao
    BEFORE UPDATE ON estabelecimentos_enderecos
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao();

-- Insert sample data for testing (optional)
-- Uncomment below if you want test data
/*
INSERT INTO estabelecimentos (
    id_usuario, nome, razao_social, cnpj, tipo_estabelecimento, 
    email, ddi, telefone, ativo
) VALUES (
    1, -- Replace with actual user ID
    'Restaurante do João',
    'João Silva Restaurante LTDA',
    '12.345.678/0001-90',
    'Restaurante',
    'contato@restaurantedojoao.com.br',
    '+55',
    '1199887766',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO estabelecimentos_enderecos (
    estabelecimento_id, cep, endereco, cidade, uf, pais
) VALUES (
    1, -- Replace with actual estabelecimento ID
    '01310100',
    'Av. Paulista, 1000',
    'São Paulo',
    'SP',
    'Brasil'
) ON CONFLICT DO NOTHING;
*/
