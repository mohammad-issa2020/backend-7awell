-- Migration: Create wallets table
-- Date: 2024-01-XX
-- Description: Add wallets table to store wallet information

-- Create enum for wallet types
CREATE TYPE wallet_type_enum AS ENUM ('custodial', 'non_custodial');

-- Create enum for wallet status
CREATE TYPE wallet_status_enum AS ENUM ('active', 'frozen', 'closed');

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    wallet_type wallet_type_enum DEFAULT 'custodial',
    status wallet_status_enum DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON wallets(created_at);

-- Add comments
COMMENT ON TABLE wallets IS 'wallets table for users';
COMMENT ON COLUMN wallets.wallet_address IS 'blockchain wallet address';
COMMENT ON COLUMN wallets.wallet_type IS 'type of wallet (custodial or non-custodial)';
COMMENT ON COLUMN wallets.status IS 'wallet status (active, frozen, closed)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON wallets TO authenticated;

-- Enable row level security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Security policies
CREATE POLICY "Users can view their own wallets" ON wallets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wallets" ON wallets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own wallets" ON wallets
    FOR UPDATE USING (user_id = auth.uid());