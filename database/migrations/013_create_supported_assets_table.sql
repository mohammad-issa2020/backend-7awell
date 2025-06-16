-- Migration: 013_create_supported_assets_table.sql
-- Description: Create supported_assets table for managing supported fiat and crypto assets
-- Date: 2024-03-20

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
('BNB', 'Binance Coin', 'crypto', 18, 0.000000000000000001, 10000.000000000000000000, 'BSC');

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
