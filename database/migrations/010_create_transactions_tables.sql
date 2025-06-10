-- Migration: 010_create_transactions_tables.sql
-- Description: Create transactions and transaction_details tables for transaction management
-- Date: 2025-06-02

-- Create enums for transaction types and status
-- CREATE TYPE transaction_type_enum AS ENUM ('transfer', 'payment', 'cash_out', 'cash_in', 'exchange');
-- CREATE TYPE transaction_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(100) UNIQUE NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type transaction_type_enum NOT NULL,
    status transaction_status_enum NOT NULL DEFAULT 'pending',
    amount DECIMAL(20,8) NOT NULL,
    asset_symbol VARCHAR(10) NOT NULL,
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

-- Create transaction_details table
CREATE TABLE IF NOT EXISTS transaction_details (
    transaction_id UUID PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
    network VARCHAR(50), -- Blockchain network
    tx_hash VARCHAR(255), -- Blockchain transaction hash
    confirmations INTEGER DEFAULT 0,
    block_number BIGINT,
    gas_fee DECIMAL(20,8),
    error_message TEXT,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_confirmations_positive CHECK (confirmations >= 0),
    CONSTRAINT check_block_number_positive CHECK (block_number IS NULL OR block_number >= 0),
    CONSTRAINT check_gas_fee_positive CHECK (gas_fee IS NULL OR gas_fee >= 0),
    CONSTRAINT check_tx_hash_format CHECK (tx_hash IS NULL OR LENGTH(tx_hash) BETWEEN 10 AND 255)
);

-- Create indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_tx_sender ON transactions(sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_recipient ON transactions(recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_asset ON transactions(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_tx_amount ON transactions(amount);
CREATE INDEX IF NOT EXISTS idx_tx_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_tx_completed_at ON transactions(completed_at) WHERE completed_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tx_sender_status ON transactions(sender_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_recipient_status ON transactions(recipient_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_type_status ON transactions(type, status, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_asset_status ON transactions(asset_symbol, status, created_at);

-- Create indexes for transaction_details table
CREATE INDEX IF NOT EXISTS idx_tx_details_network ON transaction_details(network);
CREATE INDEX IF NOT EXISTS idx_tx_details_hash ON transaction_details(tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_details_confirmations ON transaction_details(confirmations);
CREATE INDEX IF NOT EXISTS idx_tx_details_block ON transaction_details(block_number) WHERE block_number IS NOT NULL;

-- Function to update updated_at timestamp for transactions
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

-- Function to update updated_at timestamp for transaction_details
CREATE OR REPLACE FUNCTION update_transaction_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_transactions_updated_at();

CREATE TRIGGER update_transaction_details_updated_at 
    BEFORE UPDATE ON transaction_details 
    FOR EACH ROW 
    EXECUTE FUNCTION update_transaction_details_updated_at();

-- Function to generate unique transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_reference(p_type transaction_type_enum DEFAULT 'transfer')
RETURNS VARCHAR(100) AS $$
DECLARE
    prefix VARCHAR(4);
    timestamp_part VARCHAR(10);
    random_part VARCHAR(6);
    reference VARCHAR(100);
    counter INTEGER := 0;
BEGIN
    -- Set prefix based on transaction type
    CASE p_type
        WHEN 'transfer' THEN prefix := 'TXF';
        WHEN 'payment' THEN prefix := 'PAY';
        WHEN 'cash_out' THEN prefix := 'OUT';
        WHEN 'cash_in' THEN prefix := 'CIN';
        WHEN 'exchange' THEN prefix := 'EXC';
        ELSE prefix := 'TXN';
    END CASE;
    
    -- Generate reference with timestamp and random components
    LOOP
        timestamp_part := TO_CHAR(CURRENT_TIMESTAMP, 'YYMMDDHHMI');
        random_part := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        reference := prefix || timestamp_part || random_part;
        
        -- Check if reference already exists
        IF NOT EXISTS (SELECT 1 FROM transactions WHERE reference = reference) THEN
            EXIT;
        END IF;
        
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique reference after 100 attempts';
        END IF;
    END LOOP;
    
    RETURN reference;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new transaction
CREATE OR REPLACE FUNCTION create_transaction(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_type transaction_type_enum,
    p_amount DECIMAL(20,8),
    p_asset_symbol VARCHAR(10),
    p_fee DECIMAL(20,8) DEFAULT 0,
    p_exchange_rate DECIMAL(20,8) DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    transaction_id UUID;
    tx_reference VARCHAR(100);
BEGIN
    -- Generate unique reference
    tx_reference := generate_transaction_reference(p_type);
    
    -- Insert transaction
    INSERT INTO transactions (
        reference, sender_id, recipient_id, type, amount, asset_symbol, 
        fee, exchange_rate, note, metadata
    ) VALUES (
        tx_reference, p_sender_id, p_recipient_id, p_type, p_amount, p_asset_symbol,
        p_fee, p_exchange_rate, p_note, p_metadata
    )
    RETURNING id INTO transaction_id;
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update transaction status
CREATE OR REPLACE FUNCTION update_transaction_status(
    p_transaction_id UUID,
    p_new_status transaction_status_enum,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_status transaction_status_enum;
    sender_user_id UUID;
    recipient_user_id UUID;
BEGIN
    -- Get current status and user IDs
    SELECT status, sender_id, recipient_id 
    INTO old_status, sender_user_id, recipient_user_id
    FROM transactions 
    WHERE id = p_transaction_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update transaction status
    UPDATE transactions 
    SET status = p_new_status
    WHERE id = p_transaction_id;
    
    -- Update transaction details with error message if provided
    IF p_error_message IS NOT NULL THEN
        INSERT INTO transaction_details (transaction_id, error_message)
        VALUES (p_transaction_id, p_error_message)
        ON CONFLICT (transaction_id)
        DO UPDATE SET error_message = EXCLUDED.error_message;
    END IF;
    
    -- Log activity for sender
    IF sender_user_id IS NOT NULL THEN
        PERFORM log_user_activity(
            sender_user_id,
            'Transaction status updated',
            CASE 
                WHEN p_new_status = 'failed' THEN 'security_alert'
                WHEN p_new_status = 'completed' THEN 'other'
                ELSE 'other'
            END,
            jsonb_build_object(
                'transaction_id', p_transaction_id,
                'old_status', old_status,
                'new_status', p_new_status,
                'error_message', p_error_message
            )
        );
    END IF;
    
    -- Log activity for recipient
    IF recipient_user_id IS NOT NULL AND recipient_user_id != sender_user_id THEN
        PERFORM log_user_activity(
            recipient_user_id,
            'Transaction status updated',
            CASE 
                WHEN p_new_status = 'failed' THEN 'security_alert'
                WHEN p_new_status = 'completed' THEN 'other'
                ELSE 'other'
            END,
            jsonb_build_object(
                'transaction_id', p_transaction_id,
                'old_status', old_status,
                'new_status', p_new_status,
                'role', 'recipient'
            )
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get user transactions
CREATE OR REPLACE FUNCTION get_user_transactions(
    p_user_id UUID,
    p_status transaction_status_enum DEFAULT NULL,
    p_type transaction_type_enum DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    reference VARCHAR(100),
    sender_id UUID,
    recipient_id UUID,
    type transaction_type_enum,
    status transaction_status_enum,
    amount DECIMAL(20,8),
    asset_symbol VARCHAR(10),
    fee DECIMAL(20,8),
    exchange_rate DECIMAL(20,8),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.reference,
        t.sender_id,
        t.recipient_id,
        t.type,
        t.status,
        t.amount,
        t.asset_symbol,
        t.fee,
        t.exchange_rate,
        t.note,
        t.created_at,
        t.completed_at,
        CASE 
            WHEN t.sender_id = p_user_id THEN 'sent'
            WHEN t.recipient_id = p_user_id THEN 'received'
            ELSE 'unknown'
        END as direction
    FROM transactions t
    WHERE (t.sender_id = p_user_id OR t.recipient_id = p_user_id)
    AND (p_status IS NULL OR t.status = p_status)
    AND (p_type IS NULL OR t.type = p_type)
    ORDER BY t.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create views for different transaction perspectives
CREATE OR REPLACE VIEW user_sent_transactions AS
SELECT 
    t.id,
    t.reference,
    t.sender_id as user_id,
    t.recipient_id,
    t.type,
    t.status,
    t.amount,
    t.asset_symbol,
    t.fee,
    t.exchange_rate,
    t.note,
    t.created_at,
    t.completed_at,
    'sent' as direction
FROM transactions t
WHERE t.sender_id IS NOT NULL
ORDER BY t.created_at DESC;

CREATE OR REPLACE VIEW user_received_transactions AS
SELECT 
    t.id,
    t.reference,
    t.recipient_id as user_id,
    t.sender_id,
    t.type,
    t.status,
    t.amount,
    t.asset_symbol,
    t.fee,
    t.exchange_rate,
    t.note,
    t.created_at,
    t.completed_at,
    'received' as direction
FROM transactions t
WHERE t.recipient_id IS NOT NULL
ORDER BY t.created_at DESC;

-- Create view for transaction summary
CREATE OR REPLACE VIEW transaction_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as transaction_date,
    type,
    status,
    asset_symbol,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    SUM(fee) as total_fees,
    AVG(amount) as avg_amount
FROM transactions
GROUP BY DATE_TRUNC('day', created_at), type, status, asset_symbol
ORDER BY transaction_date DESC, type, asset_symbol;

-- Trigger function to log transaction activities
CREATE OR REPLACE FUNCTION log_transaction_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log transaction creation
    IF TG_OP = 'INSERT' THEN
        -- Log for sender
        IF NEW.sender_id IS NOT NULL THEN
            PERFORM log_user_activity(
                NEW.sender_id,
                'New transaction created',
                'other',
                jsonb_build_object(
                    'transaction_id', NEW.id,
                    'reference', NEW.reference,
                    'type', NEW.type,
                    'amount', NEW.amount,
                    'asset_symbol', NEW.asset_symbol,
                    'role', 'sender'
                )
            );
        END IF;
        
        -- Log for recipient
        IF NEW.recipient_id IS NOT NULL AND NEW.recipient_id != NEW.sender_id THEN
            PERFORM log_user_activity(
                NEW.recipient_id,
                'New transaction received',
                'other',
                jsonb_build_object(
                    'transaction_id', NEW.id,
                    'reference', NEW.reference,
                    'type', NEW.type,
                    'amount', NEW.amount,
                    'asset_symbol', NEW.asset_symbol,
                    'role', 'recipient'
                )
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction activity logging
CREATE TRIGGER trigger_log_transaction_activity
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_transaction_activity();

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Main transactions table for all types of financial transactions';
COMMENT ON TABLE transaction_details IS 'Additional blockchain and technical details for transactions';
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
COMMENT ON COLUMN transaction_details.network IS 'Blockchain network used for the transaction';
COMMENT ON COLUMN transaction_details.tx_hash IS 'Blockchain transaction hash';
COMMENT ON COLUMN transaction_details.confirmations IS 'Number of blockchain confirmations';
COMMENT ON COLUMN transaction_details.gas_fee IS 'Gas fee paid for blockchain transaction';
COMMENT ON VIEW user_sent_transactions IS 'View of transactions from sender perspective';
COMMENT ON VIEW user_received_transactions IS 'View of transactions from recipient perspective';
COMMENT ON VIEW transaction_summary IS 'Daily summary of transactions by type, status, and asset'; 