-- Migration: 008_create_asset_balances_table.sql
-- Description: Create asset_balances table for tracking different asset balances per wallet
-- Date: 2025-06-02

-- Create enum for supported asset symbols
CREATE TYPE asset_symbol_enum AS ENUM (
    'USD', 'EUR', 'GBP', 'AED', 'SAR', -- Fiat currencies
    'BTC', 'ETH', 'USDT', 'USDC', 'BNB', -- Cryptocurrencies  
    'ADA', 'DOT', 'SOL', 'MATIC', 'LINK',
    'LTC', 'BCH', 'XRP', 'TRX', 'DOGE',
    'AVAX', 'UNI', 'ATOM', 'FTM', 'NEAR'
);

-- Create asset_balances table
CREATE TABLE IF NOT EXISTS asset_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(10) NOT NULL, -- USD, EUR, BTC, ETH, etc.
    total DECIMAL(20,8) DEFAULT 0.00000000 NOT NULL,
    available DECIMAL(20,8) DEFAULT 0.00000000 NOT NULL,
    pending DECIMAL(20,8) DEFAULT 0.00000000 NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_wallet_asset UNIQUE (wallet_id, asset_symbol),
    CONSTRAINT check_total_positive CHECK (total >= 0),
    CONSTRAINT check_available_positive CHECK (available >= 0),
    CONSTRAINT check_pending_positive CHECK (pending >= 0),
    CONSTRAINT check_balance_logic CHECK (total = available + pending),
    CONSTRAINT check_asset_symbol_format CHECK (LENGTH(asset_symbol) BETWEEN 2 AND 10)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_balance_wallet ON asset_balances(wallet_id);
CREATE INDEX IF NOT EXISTS idx_balance_symbol ON asset_balances(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_balance_wallet_symbol ON asset_balances(wallet_id, asset_symbol);
CREATE INDEX IF NOT EXISTS idx_balance_total ON asset_balances(total) WHERE total > 0;
CREATE INDEX IF NOT EXISTS idx_balance_last_updated ON asset_balances(last_updated);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_balance_wallet_total ON asset_balances(wallet_id, total DESC);
CREATE INDEX IF NOT EXISTS idx_balance_symbol_total ON asset_balances(asset_symbol, total DESC);

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_balance_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update last_updated
DROP TRIGGER IF EXISTS update_asset_balances_last_updated ON asset_balances;
CREATE TRIGGER update_asset_balances_last_updated 
    BEFORE UPDATE ON asset_balances 
    FOR EACH ROW 
    EXECUTE FUNCTION update_balance_last_updated();
