-- Migration: Create wallets table for Web3Auth integration
-- Date: 2024-01-XX
-- Description: Add wallets table to store wallet information

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    -- unique wallet id
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- user id (related to users table)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- address (Ethereum address)
    address VARCHAR(42) NOT NULL,
    
    -- provider (Web3Auth, MetaMask, etc.)
    provider VARCHAR(50) NOT NULL DEFAULT 'web3auth',
    
    -- network (ethereum, polygon, goerli, etc.)
    network VARCHAR(20) NOT NULL DEFAULT 'ethereum',
    
    -- wallet status (active, inactive, suspended)
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- backup methods (JSON array)
    backup_methods JSONB DEFAULT '["device"]'::jsonb,
    
    -- additional information (metadata)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- important dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- unique constraints
    CONSTRAINT unique_user_address UNIQUE (user_id, address),
    CONSTRAINT unique_active_address UNIQUE (address) WHERE status = 'active'
);

-- create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status);
CREATE INDEX IF NOT EXISTS idx_wallets_network ON wallets(network);
CREATE INDEX IF NOT EXISTS idx_wallets_provider ON wallets(provider);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON wallets(created_at);
CREATE INDEX IF NOT EXISTS idx_wallets_last_used ON wallets(last_used);

-- add columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42),
ADD COLUMN IF NOT EXISTS wallet_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS wallet_created_at TIMESTAMP WITH TIME ZONE;

-- create index for wallet address in users table
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- create wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    -- unique transaction id
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- wallet id
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    
            -- transaction hash on blockchain
   
    transaction_type VARCHAR(20) NOT NULL,
    
    -- sent token
    from_token VARCHAR(42),
    from_amount DECIMAL(78, 18),
    
    -- received token
    to_token VARCHAR(42),
    to_amount DECIMAL(78, 18),
    
    -- gas fee
    gas_fee DECIMAL(78, 18),
    
    -- transaction status (pending, confirmed, failed)
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- block number
    block_number BIGINT,
    
    -- additional information
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- unique constraints
    CONSTRAINT unique_transaction_hash UNIQUE (transaction_hash)
);

-- create indexes for wallet transactions table
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_hash ON wallet_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);

-- create wallet activities table
CREATE TABLE IF NOT EXISTS wallet_activities (
    -- unique activity id
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
        -- wallet id
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    
    -- user id
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- activity type
    activity_type VARCHAR(50) NOT NULL,
    
    -- activity description
    description TEXT,
    
    -- additional information
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- ip address
    ip_address INET,
    
    -- device information
    user_agent TEXT,
    
    -- activity date
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- create indexes for wallet activities table
CREATE INDEX IF NOT EXISTS idx_wallet_activities_wallet_id ON wallet_activities(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_activities_user_id ON wallet_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_activities_type ON wallet_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_wallet_activities_created_at ON wallet_activities(created_at);

-- create function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- create trigger to update updated_at automatically
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- create function to check if ethereum address is valid
CREATE OR REPLACE FUNCTION is_valid_ethereum_address(address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- check if address starts with 0x and contains 40 hex characters
    RETURN address ~ '^0x[a-fA-F0-9]{40}$';
END;
$$ LANGUAGE plpgsql;

-- add constraint to check if wallet address is valid
ALTER TABLE wallets 
ADD CONSTRAINT valid_ethereum_address 
CHECK (is_valid_ethereum_address(address));

-- add constraint to check if wallet address is valid in users table
ALTER TABLE users 
ADD CONSTRAINT valid_user_wallet_address 
CHECK (wallet_address IS NULL OR is_valid_ethereum_address(wallet_address));

-- add comments to tables
COMMENT ON TABLE wallets IS 'wallets table for users';
COMMENT ON TABLE wallet_transactions IS 'wallet transactions table';
COMMENT ON TABLE wallet_activities IS 'wallet activities table';

-- add comments to columns
COMMENT ON COLUMN wallets.address IS 'wallet address (Ethereum format)';
COMMENT ON COLUMN wallets.provider IS 'wallet provider (web3auth, metamask, etc.)';
COMMENT ON COLUMN wallets.network IS 'blockchain network (ethereum, polygon, etc.)';
COMMENT ON COLUMN wallets.backup_methods IS 'backup methods available for the wallet';
COMMENT ON COLUMN wallets.status IS 'wallet status (active, inactive, suspended)';

-- create view for wallets with user information
CREATE OR REPLACE VIEW wallets_with_users AS
SELECT 
    w.*,
    u.phone_number,
    u.email,
    u.first_name,
    u.last_name,
    u.created_at as user_created_at
FROM wallets w
JOIN users u ON w.user_id = u.id
WHERE w.status = 'active';

        -- create
CREATE OR REPLACE VIEW wallet_statistics AS
SELECT 
    COUNT(*) as total_wallets,
    COUNT(*) FILTER (WHERE status = 'active') as active_wallets,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_wallets,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE network = 'ethereum') as ethereum_wallets,
    COUNT(*) FILTER (WHERE network = 'polygon') as polygon_wallets,
    COUNT(*) FILTER (WHERE provider = 'web3auth') as web3auth_wallets,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as wallets_last_30_days,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as wallets_last_7_days
FROM wallets;

-- create function to get user primary wallet
CREATE OR REPLACE FUNCTION get_user_primary_wallet(p_user_id UUID)
RETURNS TABLE (
    wallet_id UUID,
    address VARCHAR(42),
    provider VARCHAR(50),
    network VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.address,
        w.provider,
        w.network,
        w.created_at
    FROM wallets w
    WHERE w.user_id = p_user_id 
    AND w.status = 'active'
    ORDER BY w.created_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- grant permissions to authenticated user
GRANT SELECT, INSERT, UPDATE, DELETE ON wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wallet_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wallet_activities TO authenticated;
GRANT SELECT ON wallets_with_users TO authenticated;
GRANT SELECT ON wallet_statistics TO authenticated;

-- create row level security for wallets table
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_activities ENABLE ROW LEVEL SECURITY;

-- security policy: users can only view their own wallets
CREATE POLICY "Users can view their own wallets" ON wallets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wallets" ON wallets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own wallets" ON wallets
    FOR UPDATE USING (user_id = auth.uid());

-- security policy for transactions
CREATE POLICY "Users can view their wallet transactions" ON wallet_transactions
    FOR SELECT USING (
        wallet_id IN (
            SELECT id FROM wallets WHERE user_id = auth.uid()
        )
    );

-- security policy for activities
CREATE POLICY "Users can view their wallet activities" ON wallet_activities
    FOR SELECT USING (user_id = auth.uid());

    -- create function to log wallet activity
CREATE OR REPLACE FUNCTION log_wallet_activity(
    p_wallet_id UUID,
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO wallet_activities (
        wallet_id,
        user_id,
        activity_type,
        description,
        metadata,
        created_at
    ) VALUES (
        p_wallet_id,
        p_user_id,
        p_activity_type,
        p_description,
        p_metadata,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;