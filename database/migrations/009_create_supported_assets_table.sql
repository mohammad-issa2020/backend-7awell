-- Migration: 009_create_supported_assets_table.sql
-- Description: Create supported_assets table for managing supported fiat and crypto assets
-- Date: 2025-06-02

-- Create enum for asset types
CREATE TYPE asset_type_enum AS ENUM ('fiat', 'crypto');

-- Create supported_assets table 
CREATE TABLE IF NOT EXISTS supported_assets (
    symbol VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    asset_type asset_type_enum NOT NULL,
    decimals INTEGER DEFAULT 2,
    min_amount DECIMAL(20,8),
    max_amount DECIMAL(20,8),
    is_active BOOLEAN DEFAULT true,
    network VARCHAR(50), -- For crypto assets
    contract_address VARCHAR(255), -- For tokens
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_decimals_positive CHECK (decimals >= 0),
    CONSTRAINT check_min_amount_positive CHECK (min_amount IS NULL OR min_amount >= 0),
    CONSTRAINT check_max_amount_positive CHECK (max_amount IS NULL OR max_amount >= 0),
    CONSTRAINT check_min_max_amounts CHECK (min_amount IS NULL OR max_amount IS NULL OR min_amount <= max_amount),
    CONSTRAINT check_symbol_format CHECK (LENGTH(symbol) BETWEEN 2 AND 10),
    CONSTRAINT check_name_format CHECK (LENGTH(name) BETWEEN 1 AND 100)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supported_assets_type ON supported_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_supported_assets_active ON supported_assets(is_active);
CREATE INDEX IF NOT EXISTS idx_supported_assets_type_active ON supported_assets(asset_type, is_active);
CREATE INDEX IF NOT EXISTS idx_supported_assets_network ON supported_assets(network) WHERE network IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supported_assets_name ON supported_assets(name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_supported_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_supported_assets_updated_at 
    BEFORE UPDATE ON supported_assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_supported_assets_updated_at();

-- Function to add new supported asset
CREATE OR REPLACE FUNCTION add_supported_asset(
    p_symbol VARCHAR(10),
    p_name VARCHAR(100),
    p_asset_type asset_type_enum,
    p_decimals INTEGER DEFAULT 2,
    p_min_amount DECIMAL(20,8) DEFAULT NULL,
    p_max_amount DECIMAL(20,8) DEFAULT NULL,
    p_network VARCHAR(50) DEFAULT NULL,
    p_contract_address VARCHAR(255) DEFAULT NULL
)
RETURNS VARCHAR(10) AS $$
BEGIN
    INSERT INTO supported_assets (
        symbol, name, asset_type, decimals, min_amount, max_amount, network, contract_address
    ) VALUES (
        UPPER(p_symbol), p_name, p_asset_type, p_decimals, p_min_amount, p_max_amount, p_network, p_contract_address
    );
    
    RETURN UPPER(p_symbol);
END;
$$ LANGUAGE plpgsql;

-- Function to activate/deactivate asset
CREATE OR REPLACE FUNCTION update_asset_status(
    p_symbol VARCHAR(10),
    p_is_active BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE supported_assets 
    SET is_active = p_is_active
    WHERE symbol = UPPER(p_symbol);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get active assets by type
CREATE OR REPLACE FUNCTION get_active_assets(p_asset_type asset_type_enum DEFAULT NULL)
RETURNS TABLE(
    symbol VARCHAR(10),
    name VARCHAR(100),
    asset_type asset_type_enum,
    decimals INTEGER,
    min_amount DECIMAL(20,8),
    max_amount DECIMAL(20,8),
    network VARCHAR(50),
    contract_address VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.symbol,
        sa.name,
        sa.asset_type,
        sa.decimals,
        sa.min_amount,
        sa.max_amount,
        sa.network,
        sa.contract_address
    FROM supported_assets sa
    WHERE sa.is_active = true
    AND (p_asset_type IS NULL OR sa.asset_type = p_asset_type)
    ORDER BY sa.asset_type, sa.symbol;
END;
$$ LANGUAGE plpgsql;

-- Create views for different asset types
CREATE OR REPLACE VIEW active_crypto_assets AS
SELECT 
    symbol,
    name,
    decimals,
    min_amount,
    max_amount,
    network,
    contract_address,
    created_at
FROM supported_assets
WHERE asset_type = 'crypto' 
AND is_active = true
ORDER BY symbol;

CREATE OR REPLACE VIEW active_fiat_assets AS
SELECT 
    symbol,
    name,
    decimals,
    min_amount,
    max_amount,
    created_at
FROM supported_assets
WHERE asset_type = 'fiat' 
AND is_active = true
ORDER BY symbol;

-- Insert default supported assets
INSERT INTO supported_assets (symbol, name, asset_type, decimals, min_amount, max_amount, network) VALUES
-- Fiat currencies
('USD', 'US Dollar', 'fiat', 2, 0.01, 1000000.00, NULL),
('EUR', 'Euro', 'fiat', 2, 0.01, 1000000.00, NULL),
('GBP', 'British Pound', 'fiat', 2, 0.01, 1000000.00, NULL),
('AED', 'UAE Dirham', 'fiat', 2, 0.01, 1000000.00, NULL),
('SAR', 'Saudi Riyal', 'fiat', 2, 0.01, 1000000.00, NULL),

-- Major cryptocurrencies
('BTC', 'Bitcoin', 'crypto', 8, 0.00000001, 1000.00000000, 'Bitcoin'),
('ETH', 'Ethereum', 'crypto', 18, 0.000000000000000001, 10000.000000000000000000, 'Ethereum'),
('USDT', 'Tether USD', 'crypto', 6, 0.000001, 1000000.000000, 'Multiple'),
('USDC', 'USD Coin', 'crypto', 6, 0.000001, 1000000.000000, 'Multiple'),
('BNB', 'Binance Coin', 'crypto', 18, 0.000000000000000001, 10000.000000000000000000, 'BSC'),

-- Other popular cryptocurrencies
('ADA', 'Cardano', 'crypto', 6, 0.000001, 100000.000000, 'Cardano'),
('DOT', 'Polkadot', 'crypto', 10, 0.0000000001, 10000.0000000000, 'Polkadot'),
('SOL', 'Solana', 'crypto', 9, 0.000000001, 10000.000000000, 'Solana'),
('MATIC', 'Polygon', 'crypto', 18, 0.000000000000000001, 100000.000000000000000000, 'Polygon'),
('LINK', 'Chainlink', 'crypto', 18, 0.000000000000000001, 10000.000000000000000000, 'Ethereum'),
('LTC', 'Litecoin', 'crypto', 8, 0.00000001, 1000.00000000, 'Litecoin'),
('BCH', 'Bitcoin Cash', 'crypto', 8, 0.00000001, 1000.00000000, 'Bitcoin Cash'),
('XRP', 'Ripple', 'crypto', 6, 0.000001, 100000.000000, 'XRP Ledger'),
('TRX', 'TRON', 'crypto', 6, 0.000001, 100000.000000, 'TRON'),
('DOGE', 'Dogecoin', 'crypto', 8, 0.00000001, 100000.00000000, 'Dogecoin'),
('AVAX', 'Avalanche', 'crypto', 18, 0.000000000000000001, 10000.000000000000000000, 'Avalanche'),
('UNI', 'Uniswap', 'crypto', 18, 0.000000000000000001, 10000.000000000000000000, 'Ethereum'),
('ATOM', 'Cosmos', 'crypto', 6, 0.000001, 10000.000000, 'Cosmos'),
('FTM', 'Fantom', 'crypto', 18, 0.000000000000000001, 100000.000000000000000000, 'Fantom'),
('NEAR', 'NEAR Protocol', 'crypto', 24, 0.000000000000000000000001, 10000.000000000000000000000000, 'NEAR');

-- Add comments for documentation
COMMENT ON TABLE supported_assets IS 'List of supported fiat and cryptocurrency assets with their properties and limits';
COMMENT ON COLUMN supported_assets.symbol IS 'Unique asset symbol (e.g., USD, BTC, ETH)';
COMMENT ON COLUMN supported_assets.name IS 'Full name of the asset';
COMMENT ON COLUMN supported_assets.asset_type IS 'Type of asset: fiat currency or cryptocurrency';
COMMENT ON COLUMN supported_assets.decimals IS 'Number of decimal places supported for this asset';
COMMENT ON COLUMN supported_assets.min_amount IS 'Minimum transaction amount for this asset';
COMMENT ON COLUMN supported_assets.max_amount IS 'Maximum transaction amount for this asset';
COMMENT ON COLUMN supported_assets.network IS 'Blockchain network for crypto assets';
COMMENT ON COLUMN supported_assets.contract_address IS 'Smart contract address for tokens';
COMMENT ON VIEW active_crypto_assets IS 'Currently active cryptocurrency assets';
COMMENT ON VIEW active_fiat_assets IS 'Currently active fiat currency assets'; 