-- Abastecimentos Module Database Schema
-- Created for FoodMax Application

-- Table: abastecimentos
-- Main table for supply management
CREATE TABLE IF NOT EXISTS abastecimentos (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    estabelecimento_id INTEGER NOT NULL,
    fornecedores_ids INTEGER[] NOT NULL DEFAULT '{}',
    categoria_id INTEGER NOT NULL,
    quantidade_total INTEGER NOT NULL DEFAULT 0,
    telefone VARCHAR(15) NOT NULL,
    ddi VARCHAR(10) NOT NULL DEFAULT '+55',
    email VARCHAR(255),
    data_hora_recebido TIMESTAMP WITH TIME ZONE,
    observacao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Enviado', 'Recebido', 'Cancelado')),
    email_enviado BOOLEAN NOT NULL DEFAULT FALSE,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_abastecimentos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_abastecimentos_estabelecimento FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    CONSTRAINT fk_abastecimentos_categoria FOREIGN KEY (categoria_id) REFERENCES itens_categorias(id) ON DELETE CASCADE
);

-- Table: abastecimentos_itens
-- Junction table for items in each supply order
CREATE TABLE IF NOT EXISTS abastecimentos_itens (
    id SERIAL PRIMARY KEY,
    abastecimento_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_abastecimentos_itens_abastecimento FOREIGN KEY (abastecimento_id) REFERENCES abastecimentos(id) ON DELETE CASCADE,
    CONSTRAINT fk_abastecimentos_itens_item FOREIGN KEY (item_id) REFERENCES itens(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate items in same supply order
    CONSTRAINT uk_abastecimentos_itens_unique UNIQUE (abastecimento_id, item_id)
);

-- Table: abastecimentos_enderecos
-- Address information for each supply order
CREATE TABLE IF NOT EXISTS abastecimentos_enderecos (
    id SERIAL PRIMARY KEY,
    abastecimento_id INTEGER NOT NULL,
    cep VARCHAR(8),
    endereco VARCHAR(255) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    pais VARCHAR(100) NOT NULL DEFAULT 'Brasil',
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_abastecimentos_enderecos_abastecimento FOREIGN KEY (abastecimento_id) REFERENCES abastecimentos(id) ON DELETE CASCADE,
    
    -- Unique constraint to ensure one address per supply order
    CONSTRAINT uk_abastecimentos_enderecos_unique UNIQUE (abastecimento_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_abastecimentos_usuario ON abastecimentos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_estabelecimento ON abastecimentos(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_categoria ON abastecimentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_status ON abastecimentos(status);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_data_cadastro ON abastecimentos(data_cadastro);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_data_hora_recebido ON abastecimentos(data_hora_recebido);

CREATE INDEX IF NOT EXISTS idx_abastecimentos_itens_abastecimento ON abastecimentos_itens(abastecimento_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_itens_item ON abastecimentos_itens(item_id);

CREATE INDEX IF NOT EXISTS idx_abastecimentos_enderecos_abastecimento ON abastecimentos_enderecos(abastecimento_id);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_data_atualizacao_abastecimentos()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_abastecimentos_data_atualizacao
    BEFORE UPDATE ON abastecimentos
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao_abastecimentos();

CREATE TRIGGER trigger_update_abastecimentos_itens_data_atualizacao
    BEFORE UPDATE ON abastecimentos_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao_abastecimentos();

CREATE TRIGGER trigger_update_abastecimentos_enderecos_data_atualizacao
    BEFORE UPDATE ON abastecimentos_enderecos
    FOR EACH ROW
    EXECUTE FUNCTION update_data_atualizacao_abastecimentos();

-- Trigger to update quantidade_total when items are added/removed/updated
CREATE OR REPLACE FUNCTION update_abastecimento_quantidade_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE abastecimentos 
    SET quantidade_total = (
        SELECT COALESCE(SUM(quantidade), 0) 
        FROM abastecimentos_itens 
        WHERE abastecimento_id = COALESCE(NEW.abastecimento_id, OLD.abastecimento_id)
    )
    WHERE id = COALESCE(NEW.abastecimento_id, OLD.abastecimento_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quantidade_total_insert
    AFTER INSERT ON abastecimentos_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_abastecimento_quantidade_total();

CREATE TRIGGER trigger_update_quantidade_total_update
    AFTER UPDATE ON abastecimentos_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_abastecimento_quantidade_total();

CREATE TRIGGER trigger_update_quantidade_total_delete
    AFTER DELETE ON abastecimentos_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_abastecimento_quantidade_total();

-- Comments for documentation
COMMENT ON TABLE abastecimentos IS 'Main table for supply orders management';
COMMENT ON COLUMN abastecimentos.id_usuario IS 'User who created the supply order';
COMMENT ON COLUMN abastecimentos.estabelecimento_id IS 'Establishment requesting the supply';
COMMENT ON COLUMN abastecimentos.fornecedores_ids IS 'Array of supplier IDs for this order';
COMMENT ON COLUMN abastecimentos.categoria_id IS 'Category of items being ordered (only one category per order)';
COMMENT ON COLUMN abastecimentos.quantidade_total IS 'Total quantity of all items in the order';
COMMENT ON COLUMN abastecimentos.telefone IS 'Contact phone number (DDI + phone)';
COMMENT ON COLUMN abastecimentos.ddi IS 'International dialing code';
COMMENT ON COLUMN abastecimentos.email IS 'Contact email address';
COMMENT ON COLUMN abastecimentos.data_hora_recebido IS 'Date and time when order was received';
COMMENT ON COLUMN abastecimentos.observacao IS 'Additional notes or observations';
COMMENT ON COLUMN abastecimentos.status IS 'Order status: Pendente, Enviado, Recebido, Cancelado';
COMMENT ON COLUMN abastecimentos.email_enviado IS 'Whether email was sent to suppliers';

COMMENT ON TABLE abastecimentos_itens IS 'Items included in each supply order (shopping cart)';
COMMENT ON COLUMN abastecimentos_itens.abastecimento_id IS 'Reference to the supply order';
COMMENT ON COLUMN abastecimentos_itens.item_id IS 'Reference to the item being ordered';
COMMENT ON COLUMN abastecimentos_itens.quantidade IS 'Quantity of this item in the order';

COMMENT ON TABLE abastecimentos_enderecos IS 'Delivery address for each supply order';
COMMENT ON COLUMN abastecimentos_enderecos.abastecimento_id IS 'Reference to the supply order';
COMMENT ON COLUMN abastecimentos_enderecos.cep IS 'Postal code (Brazilian CEP)';
COMMENT ON COLUMN abastecimentos_enderecos.endereco IS 'Street address';
COMMENT ON COLUMN abastecimentos_enderecos.cidade IS 'City name';
COMMENT ON COLUMN abastecimentos_enderecos.uf IS 'State abbreviation (2 characters)';
COMMENT ON COLUMN abastecimentos_enderecos.pais IS 'Country name';
