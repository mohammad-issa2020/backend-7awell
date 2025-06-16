-- Migration: 011_create_transaction_details_table.sql
-- Description: Create transaction_details table for storing blockchain transaction details
-- Date: 2025-06-02

-- Drop existing table if it exists
DROP TABLE IF EXISTS transaction_details CASCADE;

-- Create transaction_details table
CREATE TABLE IF NOT EXISTS transaction_details (
    transaction_id UUID PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
    network VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(255) UNIQUE,
    confirmations INTEGER DEFAULT 0,
    block_number BIGINT,
    gas_fee DECIMAL(20,8),
    error_message TEXT,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_confirmations_positive CHECK (confirmations >= 0),
    CONSTRAINT check_block_number_positive CHECK (block_number IS NULL OR block_number > 0),
    CONSTRAINT check_gas_fee_positive CHECK (gas_fee IS NULL OR gas_fee >= 0),
    CONSTRAINT check_tx_hash_format CHECK (tx_hash IS NULL OR LENGTH(tx_hash) BETWEEN 1 AND 255),
    CONSTRAINT check_network_format CHECK (LENGTH(network) BETWEEN 1 AND 50)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tx_details_hash ON transaction_details(tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_details_network ON transaction_details(network);
CREATE INDEX IF NOT EXISTS idx_tx_details_confirmations ON transaction_details(confirmations);
CREATE INDEX IF NOT EXISTS idx_tx_details_block ON transaction_details(block_number);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transaction_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_transaction_details_updated_at ON transaction_details;
CREATE TRIGGER update_transaction_details_updated_at 
    BEFORE UPDATE ON transaction_details 
    FOR EACH ROW 
    EXECUTE FUNCTION update_transaction_details_updated_at();

-- Function to update transaction details
CREATE OR REPLACE FUNCTION update_transaction_details(
    p_transaction_id UUID,
    p_network VARCHAR(50),
    p_tx_hash VARCHAR(255) DEFAULT NULL,
    p_confirmations INTEGER DEFAULT 0,
    p_block_number BIGINT DEFAULT NULL,
    p_gas_fee DECIMAL(20,8) DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_raw_response JSONB DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
    INSERT INTO transaction_details (
        transaction_id,
        network,
        tx_hash,
        confirmations,
        block_number,
        gas_fee,
        error_message,
        raw_response
    ) VALUES (
        p_transaction_id,
        p_network,
        p_tx_hash,
        p_confirmations,
        p_block_number,
        p_gas_fee,
        p_error_message,
        p_raw_response
    )
    ON CONFLICT (transaction_id) DO UPDATE SET
        network = EXCLUDED.network,
        tx_hash = EXCLUDED.tx_hash,
        confirmations = EXCLUDED.confirmations,
        block_number = EXCLUDED.block_number,
        gas_fee = EXCLUDED.gas_fee,
        error_message = EXCLUDED.error_message,
        raw_response = EXCLUDED.raw_response,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN p_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get transaction details with confirmations
CREATE OR REPLACE FUNCTION get_transaction_details_with_confirmations(
    p_min_confirmations INTEGER DEFAULT 0
)
RETURNS TABLE(
    transaction_id UUID,
    network VARCHAR(50),
    tx_hash VARCHAR(255),
    confirmations INTEGER,
    block_number BIGINT,
    gas_fee DECIMAL(20,8),
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        td.transaction_id,
        td.network,
        td.tx_hash,
        td.confirmations,
        td.block_number,
        td.gas_fee,
        td.error_message
    FROM transaction_details td
    WHERE td.confirmations >= p_min_confirmations
    ORDER BY td.block_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE transaction_details IS 'Stores blockchain transaction details and status';
COMMENT ON COLUMN transaction_details.transaction_id IS 'Reference to the main transaction';
COMMENT ON COLUMN transaction_details.network IS 'Blockchain network (e.g., Ethereum, Bitcoin)';
COMMENT ON COLUMN transaction_details.tx_hash IS 'Blockchain transaction hash';
COMMENT ON COLUMN transaction_details.confirmations IS 'Number of block confirmations';
COMMENT ON COLUMN transaction_details.block_number IS 'Block number where transaction was included';
COMMENT ON COLUMN transaction_details.gas_fee IS 'Gas fee paid for the transaction';
COMMENT ON COLUMN transaction_details.error_message IS 'Error message if transaction failed';
COMMENT ON COLUMN transaction_details.raw_response IS 'Raw response from blockchain node';

CREATE OR REPLACE FUNCTION prevent_update_except_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Only status is allowed to change
    -- Check if any other column is changed
    IF row_to_json(NEW) - 'status' IS DISTINCT FROM row_to_json(OLD) - 'status' THEN
      RAISE EXCEPTION 'Only status can be updated';
    END IF;
  ELSE
    -- If status is not changed, prevent any update
    IF row_to_json(NEW) IS DISTINCT FROM row_to_json(OLD) THEN
      RAISE EXCEPTION 'Only status can be updated';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER only_status_update
BEFORE UPDATE ON transaction_details
FOR EACH ROW
EXECUTE FUNCTION prevent_update_except_status(); 