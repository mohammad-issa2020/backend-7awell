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
CREATE TRIGGER update_asset_balances_last_updated 
    BEFORE UPDATE ON asset_balances 
    FOR EACH ROW 
    EXECUTE FUNCTION update_balance_last_updated();

-- Function to create or update asset balance
CREATE OR REPLACE FUNCTION upsert_asset_balance(
    p_wallet_id UUID,
    p_asset_symbol VARCHAR(10),
    p_total DECIMAL(20,8) DEFAULT 0,
    p_available DECIMAL(20,8) DEFAULT 0,
    p_pending DECIMAL(20,8) DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    balance_id UUID;
    wallet_user_id UUID;
BEGIN
    -- Get wallet owner for logging
    SELECT user_id INTO wallet_user_id FROM wallets WHERE id = p_wallet_id;
    
    -- Insert or update balance
    INSERT INTO asset_balances (wallet_id, asset_symbol, total, available, pending)
    VALUES (p_wallet_id, p_asset_symbol, p_total, p_available, p_pending)
    ON CONFLICT (wallet_id, asset_symbol)
    DO UPDATE SET
        total = EXCLUDED.total,
        available = EXCLUDED.available,
        pending = EXCLUDED.pending,
        last_updated = CURRENT_TIMESTAMP
    RETURNING id INTO balance_id;
    
    -- Log the balance update
    PERFORM log_user_activity(
        wallet_user_id,
        'Asset balance updated',
        'other',
        jsonb_build_object(
            'wallet_id', p_wallet_id,
            'asset_symbol', p_asset_symbol,
            'total', p_total,
            'available', p_available,
            'pending', p_pending
        )
    );
    
    RETURN balance_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add to balance (for deposits/credits)
CREATE OR REPLACE FUNCTION add_to_balance(
    p_wallet_id UUID,
    p_asset_symbol VARCHAR(10),
    p_amount DECIMAL(20,8),
    p_to_available BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
DECLARE
    current_total DECIMAL(20,8);
    current_available DECIMAL(20,8);
    current_pending DECIMAL(20,8);
    wallet_user_id UUID;
BEGIN
    -- Validate amount is positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    
    -- Get wallet owner for logging
    SELECT user_id INTO wallet_user_id FROM wallets WHERE id = p_wallet_id;
    
    -- Get current balances or create new record
    SELECT total, available, pending 
    INTO current_total, current_available, current_pending
    FROM asset_balances 
    WHERE wallet_id = p_wallet_id AND asset_symbol = p_asset_symbol;
    
    -- If no record exists, create with zeros
    IF NOT FOUND THEN
        current_total := 0;
        current_available := 0;
        current_pending := 0;
    END IF;
    
    -- Add to appropriate balance
    IF p_to_available THEN
        current_available := current_available + p_amount;
    ELSE
        current_pending := current_pending + p_amount;
    END IF;
    
    current_total := current_available + current_pending;
    
    -- Update or insert balance
    PERFORM upsert_asset_balance(p_wallet_id, p_asset_symbol, current_total, current_available, current_pending);
    
    -- Log the transaction
    PERFORM log_user_activity(
        wallet_user_id,
        'Balance increased',
        'other',
        jsonb_build_object(
            'wallet_id', p_wallet_id,
            'asset_symbol', p_asset_symbol,
            'amount', p_amount,
            'to_available', p_to_available,
            'new_total', current_total
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to subtract from balance (for withdrawals/debits)
CREATE OR REPLACE FUNCTION subtract_from_balance(
    p_wallet_id UUID,
    p_asset_symbol VARCHAR(10),
    p_amount DECIMAL(20,8),
    p_from_available BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
DECLARE
    current_total DECIMAL(20,8);
    current_available DECIMAL(20,8);
    current_pending DECIMAL(20,8);
    wallet_user_id UUID;
BEGIN
    -- Validate amount is positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    
    -- Get wallet owner for logging
    SELECT user_id INTO wallet_user_id FROM wallets WHERE id = p_wallet_id;
    
    -- Get current balances
    SELECT total, available, pending 
    INTO current_total, current_available, current_pending
    FROM asset_balances 
    WHERE wallet_id = p_wallet_id AND asset_symbol = p_asset_symbol;
    
    -- Check if balance exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No balance record found for wallet % and asset %', p_wallet_id, p_asset_symbol;
    END IF;
    
    -- Check sufficient balance
    IF p_from_available THEN
        IF current_available < p_amount THEN
            RAISE EXCEPTION 'Insufficient available balance. Available: %, Requested: %', current_available, p_amount;
        END IF;
        current_available := current_available - p_amount;
    ELSE
        IF current_pending < p_amount THEN
            RAISE EXCEPTION 'Insufficient pending balance. Pending: %, Requested: %', current_pending, p_amount;
        END IF;
        current_pending := current_pending - p_amount;
    END IF;
    
    current_total := current_available + current_pending;
    
    -- Update balance
    PERFORM upsert_asset_balance(p_wallet_id, p_asset_symbol, current_total, current_available, current_pending);
    
    -- Log the transaction
    PERFORM log_user_activity(
        wallet_user_id,
        'Balance decreased',
        'other',
        jsonb_build_object(
            'wallet_id', p_wallet_id,
            'asset_symbol', p_asset_symbol,
            'amount', p_amount,
            'from_available', p_from_available,
            'new_total', current_total
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to move balance from pending to available
CREATE OR REPLACE FUNCTION confirm_pending_balance(
    p_wallet_id UUID,
    p_asset_symbol VARCHAR(10),
    p_amount DECIMAL(20,8)
)
RETURNS BOOLEAN AS $$
DECLARE
    current_total DECIMAL(20,8);
    current_available DECIMAL(20,8);
    current_pending DECIMAL(20,8);
    wallet_user_id UUID;
BEGIN
    -- Validate amount is positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    
    -- Get wallet owner for logging
    SELECT user_id INTO wallet_user_id FROM wallets WHERE id = p_wallet_id;
    
    -- Get current balances
    SELECT total, available, pending 
    INTO current_total, current_available, current_pending
    FROM asset_balances 
    WHERE wallet_id = p_wallet_id AND asset_symbol = p_asset_symbol;
    
    -- Check if balance exists and sufficient pending
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No balance record found for wallet % and asset %', p_wallet_id, p_asset_symbol;
    END IF;
    
    IF current_pending < p_amount THEN
        RAISE EXCEPTION 'Insufficient pending balance. Pending: %, Requested: %', current_pending, p_amount;
    END IF;
    
    -- Move from pending to available
    current_pending := current_pending - p_amount;
    current_available := current_available + p_amount;
    
    -- Update balance (total remains the same)
    PERFORM upsert_asset_balance(p_wallet_id, p_asset_symbol, current_total, current_available, current_pending);
    
    -- Log the confirmation
    PERFORM log_user_activity(
        wallet_user_id,
        'Pending balance confirmed',
        'other',
        jsonb_build_object(
            'wallet_id', p_wallet_id,
            'asset_symbol', p_asset_symbol,
            'amount', p_amount,
            'new_available', current_available,
            'new_pending', current_pending
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get wallet balances summary
CREATE OR REPLACE FUNCTION get_wallet_balances(p_wallet_id UUID)
RETURNS TABLE(
    asset_symbol VARCHAR(10),
    total DECIMAL(20,8),
    available DECIMAL(20,8),
    pending DECIMAL(20,8),
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ab.asset_symbol,
        ab.total,
        ab.available,
        ab.pending,
        ab.last_updated
    FROM asset_balances ab
    WHERE ab.wallet_id = p_wallet_id
    AND ab.total > 0
    ORDER BY ab.total DESC, ab.asset_symbol;
END;
$$ LANGUAGE plpgsql;

-- Function to get user total balances across all wallets
CREATE OR REPLACE FUNCTION get_user_total_balances(p_user_id UUID)
RETURNS TABLE(
    asset_symbol VARCHAR(10),
    total_balance DECIMAL(20,8),
    available_balance DECIMAL(20,8),
    pending_balance DECIMAL(20,8),
    wallet_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ab.asset_symbol,
        SUM(ab.total) as total_balance,
        SUM(ab.available) as available_balance,
        SUM(ab.pending) as pending_balance,
        COUNT(DISTINCT ab.wallet_id) as wallet_count
    FROM asset_balances ab
    JOIN wallets w ON ab.wallet_id = w.id
    WHERE w.user_id = p_user_id
    AND w.status = 'active'
    AND ab.total > 0
    GROUP BY ab.asset_symbol
    ORDER BY total_balance DESC, ab.asset_symbol;
END;
$$ LANGUAGE plpgsql;

-- Create views for different asset types
CREATE OR REPLACE VIEW wallet_crypto_balances AS
SELECT 
    ab.id,
    ab.wallet_id,
    ab.asset_symbol,
    ab.total,
    ab.available,
    ab.pending,
    ab.last_updated,
    w.user_id,
    w.wallet_address
FROM asset_balances ab
JOIN wallets w ON ab.wallet_id = w.id
WHERE ab.asset_symbol IN ('BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'ADA', 'DOT', 'SOL', 'MATIC', 'LINK', 'LTC', 'BCH', 'XRP', 'TRX', 'DOGE', 'AVAX', 'UNI', 'ATOM', 'FTM', 'NEAR')
AND ab.total > 0
ORDER BY ab.total DESC;

CREATE OR REPLACE VIEW wallet_fiat_balances AS
SELECT 
    ab.id,
    ab.wallet_id,
    ab.asset_symbol,
    ab.total,
    ab.available,
    ab.pending,
    ab.last_updated,
    w.user_id,
    w.wallet_address
FROM asset_balances ab
JOIN wallets w ON ab.wallet_id = w.id
WHERE ab.asset_symbol IN ('USD', 'EUR', 'GBP', 'AED', 'SAR')
AND ab.total > 0
ORDER BY ab.total DESC;

-- Create view for wallet balance summary
CREATE OR REPLACE VIEW wallet_balance_summary AS
SELECT 
    w.id as wallet_id,
    w.user_id,
    w.wallet_address,
    w.wallet_type,
    COUNT(ab.id) as asset_count,
    COUNT(ab.id) FILTER (WHERE ab.asset_symbol IN ('BTC', 'ETH', 'USDT', 'USDC')) as major_crypto_count,
    COUNT(ab.id) FILTER (WHERE ab.asset_symbol IN ('USD', 'EUR', 'GBP')) as fiat_count,
    SUM(ab.total) FILTER (WHERE ab.asset_symbol = 'USD') as total_usd,
    MAX(ab.last_updated) as last_balance_update
FROM wallets w
LEFT JOIN asset_balances ab ON w.id = ab.wallet_id AND ab.total > 0
WHERE w.status = 'active'
GROUP BY w.id, w.user_id, w.wallet_address, w.wallet_type
ORDER BY total_usd DESC NULLS LAST;

-- Trigger function to log balance changes
CREATE OR REPLACE FUNCTION log_balance_activity()
RETURNS TRIGGER AS $$
DECLARE
    wallet_user_id UUID;
BEGIN
    -- Get wallet owner
    SELECT user_id INTO wallet_user_id FROM wallets WHERE id = COALESCE(NEW.wallet_id, OLD.wallet_id);
    
    -- Log balance creation
    IF TG_OP = 'INSERT' THEN
        PERFORM log_user_activity(
            wallet_user_id,
            'New asset balance created',
            'other',
            jsonb_build_object(
                'wallet_id', NEW.wallet_id,
                'asset_symbol', NEW.asset_symbol,
                'total', NEW.total,
                'available', NEW.available,
                'pending', NEW.pending
            )
        );
        RETURN NEW;
    END IF;
    
    -- Log balance updates
    IF TG_OP = 'UPDATE' THEN
        -- Only log if there are significant changes
        IF OLD.total != NEW.total OR OLD.available != NEW.available OR OLD.pending != NEW.pending THEN
            PERFORM log_user_activity(
                wallet_user_id,
                'Asset balance modified',
                'other',
                jsonb_build_object(
                    'wallet_id', NEW.wallet_id,
                    'asset_symbol', NEW.asset_symbol,
                    'old_total', OLD.total,
                    'new_total', NEW.total,
                    'old_available', OLD.available,
                    'new_available', NEW.available,
                    'old_pending', OLD.pending,
                    'new_pending', NEW.pending
                )
            );
        END IF;
        RETURN NEW;
    END IF;
    
    -- Log balance deletion
    IF TG_OP = 'DELETE' THEN
        PERFORM log_user_activity(
            wallet_user_id,
            'Asset balance removed',
            'other',
            jsonb_build_object(
                'wallet_id', OLD.wallet_id,
                'asset_symbol', OLD.asset_symbol,
                'final_total', OLD.total
            )
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for balance activity logging
CREATE TRIGGER trigger_log_balance_activity
    AFTER INSERT OR UPDATE OR DELETE ON asset_balances
    FOR EACH ROW
    EXECUTE FUNCTION log_balance_activity();
