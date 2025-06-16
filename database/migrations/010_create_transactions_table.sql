-- Migration: 010_create_transactions_table.sql
-- Description: Create transactions table for transaction management
-- Date: 2025-06-02

-- Drop existing types and tables if they exist
DROP TABLE IF EXISTS transactions CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS transaction_status_enum CASCADE;

-- Create enums for transaction types and status
CREATE TYPE transaction_type_enum AS ENUM ('transfer', 'payment', 'cash_out', 'cash_in', 'exchange');
CREATE TYPE transaction_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(100) UNIQUE NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type transaction_type_enum NOT NULL,
    status transaction_status_enum NOT NULL DEFAULT 'pending',
    amount DECIMAL(20,8) NOT NULL,
    asset_symbol VARCHAR(10) NOT NULL REFERENCES supported_assets(symbol),
    fee DECIMAL(20,8) DEFAULT 0,
    exchange_rate DECIMAL(20,8), -- For currency exchanges
    note TEXT,
    metadata JSONB, -- Additional transaction data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT check_amount_positive CHECK (amount > 0),
    CONSTRAINT check_fee_positive CHECK (fee >= 0),
    CONSTRAINT check_exchange_rate_positive CHECK (exchange_rate IS NULL OR exchange_rate > 0),
    CONSTRAINT check_reference_format CHECK (LENGTH(reference) BETWEEN 1 AND 100),
    CONSTRAINT check_asset_symbol_format CHECK (LENGTH(asset_symbol) BETWEEN 2 AND 10),
    CONSTRAINT check_sender_recipient_different CHECK (sender_id IS NULL OR recipient_id IS NULL OR sender_id != recipient_id),
    CONSTRAINT check_completed_at_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR 
        (status != 'completed' AND completed_at IS NULL)
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tx_sender ON transactions(sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_recipient ON transactions(recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status, created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Set completed_at when status changes to completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Clear completed_at if status changes from completed to something else
    IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_transactions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Main transactions table for all types of financial transactions';
COMMENT ON COLUMN transactions.reference IS 'Unique human-readable transaction reference';
COMMENT ON COLUMN transactions.sender_id IS 'User who initiated the transaction (nullable for cash-in)';
COMMENT ON COLUMN transactions.recipient_id IS 'User who receives the transaction (nullable for cash-out)';
COMMENT ON COLUMN transactions.type IS 'Type of transaction (transfer, payment, cash_out, cash_in, exchange)';
COMMENT ON COLUMN transactions.status IS 'Current status of the transaction';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount in the specified asset';
COMMENT ON COLUMN transactions.asset_symbol IS 'Symbol of the asset being transacted';
COMMENT ON COLUMN transactions.fee IS 'Transaction fee charged';
COMMENT ON COLUMN transactions.exchange_rate IS 'Exchange rate used for currency conversions';
COMMENT ON COLUMN transactions.metadata IS 'Additional flexible transaction data in JSON format'; 