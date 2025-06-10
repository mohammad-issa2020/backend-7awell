-- Migration: 007_create_wallets_table.sql
-- Description: Create wallets table for crypto wallet management
-- Date: 2025-06-02

-- Create enum for wallet types
CREATE TYPE wallet_type_enum AS ENUM ('custodial', 'non_custodial');

-- Create enum for wallet status
CREATE TYPE wallet_status_enum AS ENUM ('active', 'frozen', 'closed');

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) UNIQUE NOT NULL, -- Blockchain address
    wallet_type wallet_type_enum DEFAULT 'custodial',
    status wallet_status_enum DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallets_user_status ON wallets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON wallets(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wallets_user_type_status ON wallets(user_id, wallet_type, status);

-- Add constraints
ALTER TABLE wallets ADD CONSTRAINT check_wallet_address_format
    CHECK (LENGTH(wallet_address) >= 20 AND LENGTH(wallet_address) <= 255);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_wallets_updated_at 
    BEFORE UPDATE ON wallets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_wallet_updated_at();

-- Function to create a new wallet
CREATE OR REPLACE FUNCTION create_wallet(
    p_user_id UUID,
    p_wallet_address VARCHAR(255),
    p_wallet_type wallet_type_enum DEFAULT 'custodial'
)
RETURNS UUID AS $$
DECLARE
    wallet_id UUID;
BEGIN
    -- Insert the new wallet
    INSERT INTO wallets (
        user_id,
        wallet_address,
        wallet_type
    ) VALUES (
        p_user_id,
        p_wallet_address,
        p_wallet_type
    )
    RETURNING id INTO wallet_id;
    
    RETURN wallet_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update wallet status
CREATE OR REPLACE FUNCTION update_wallet_status(
    p_wallet_id UUID,
    p_new_status wallet_status_enum
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE wallets 
    SET status = p_new_status
    WHERE id = p_wallet_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get user wallets summary
CREATE OR REPLACE FUNCTION get_user_wallets_summary(p_user_id UUID)
RETURNS TABLE(
    total_wallets BIGINT,
    active_wallets BIGINT,
    custodial_wallets BIGINT,
    non_custodial_wallets BIGINT,
    frozen_wallets BIGINT,
    closed_wallets BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_wallets,
        COUNT(*) FILTER (WHERE status = 'active') as active_wallets,
        COUNT(*) FILTER (WHERE wallet_type = 'custodial') as custodial_wallets,
        COUNT(*) FILTER (WHERE wallet_type = 'non_custodial') as non_custodial_wallets,
        COUNT(*) FILTER (WHERE status = 'frozen') as frozen_wallets,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_wallets
    FROM wallets
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user wallets
CREATE OR REPLACE FUNCTION get_user_wallets(
    p_user_id UUID,
    p_status wallet_status_enum DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    wallet_address VARCHAR(255),
    wallet_type wallet_type_enum,
    status wallet_status_enum,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.wallet_address,
        w.wallet_type,
        w.status,
        w.created_at,
        w.updated_at
    FROM wallets w
    WHERE w.user_id = p_user_id
    AND (p_status IS NULL OR w.status = p_status)
    ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;


-- Create views for different wallet types
CREATE OR REPLACE VIEW user_custodial_wallets AS
SELECT 
    id,
    user_id,
    wallet_address,
    status,
    created_at,
    updated_at
FROM wallets
WHERE wallet_type = 'custodial'
AND status = 'active'
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW user_non_custodial_wallets AS
SELECT 
    id,
    user_id,
    wallet_address,
    status,
    created_at,
    updated_at
FROM wallets
WHERE wallet_type = 'non_custodial'
AND status = 'active'
ORDER BY created_at DESC;

-- Create view for wallet summary by user
CREATE OR REPLACE VIEW user_wallet_summary AS
SELECT 
    user_id,
    COUNT(*) as total_wallets,
    COUNT(*) FILTER (WHERE status = 'active') as active_wallets,
    COUNT(*) FILTER (WHERE wallet_type = 'custodial') as custodial_wallets,
    COUNT(*) FILTER (WHERE wallet_type = 'non_custodial') as non_custodial_wallets,
    MAX(created_at) as latest_wallet_created
FROM wallets
GROUP BY user_id
ORDER BY user_id;

-- Add RLS to views
ALTER VIEW user_custodial_wallets SET (security_barrier = true);
ALTER VIEW user_non_custodial_wallets SET (security_barrier = true);
ALTER VIEW user_wallet_summary SET (security_barrier = true);

-- Trigger function to log wallet activities
CREATE OR REPLACE FUNCTION log_wallet_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log wallet creation
    IF TG_OP = 'INSERT' THEN
        PERFORM log_user_activity(
            NEW.user_id,
            'New wallet created',
            'wallet_created',
            jsonb_build_object(
                'wallet_id', NEW.id,
                'wallet_type', NEW.wallet_type,
                'address', NEW.wallet_address
            )
        );
        RETURN NEW;
    END IF;
    
    -- Log wallet updates
    IF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            PERFORM log_user_activity(
                NEW.user_id,
                'Wallet status changed',
                CASE 
                    WHEN NEW.status = 'frozen' THEN 'security_alert'
                    WHEN NEW.status = 'closed' THEN 'other'
                    ELSE 'other'
                END,
                jsonb_build_object(
                    'wallet_id', NEW.id,
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'wallet_type', NEW.wallet_type
                )
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wallet activity logging
CREATE TRIGGER trigger_log_wallet_activity
    AFTER INSERT OR UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION log_wallet_activity();

-- Add comments for documentation
COMMENT ON TABLE wallets IS 'Cryptocurrency wallets for users with support for custodial and non-custodial wallet types';
COMMENT ON COLUMN wallets.wallet_address IS 'Blockchain address for the wallet (must be unique)';
COMMENT ON COLUMN wallets.wallet_type IS 'Type of wallet: custodial (managed by platform) or non_custodial (user managed)';
COMMENT ON COLUMN wallets.status IS 'Current status of the wallet (active, frozen, closed)';
COMMENT ON VIEW user_custodial_wallets IS 'Active custodial wallets for users';
COMMENT ON VIEW user_non_custodial_wallets IS 'Active non-custodial wallets for users';
COMMENT ON VIEW user_wallet_summary IS 'Summary of wallet counts and types by user'; 