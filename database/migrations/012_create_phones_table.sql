-- Migration: 012_create_phones_table.sql
-- Description: Create phones table for storing phone numbers with privacy
-- Date: 2025-06-02

-- Drop existing table if it exists
DROP TABLE IF EXISTS phones CASCADE;

-- Create phones table
CREATE TABLE IF NOT EXISTS phones (
    phone_hash VARCHAR(255) PRIMARY KEY NOT NULL,
    linked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_phone_hash_length CHECK (LENGTH(phone_hash) BETWEEN 1 AND 255)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_phones_user_id ON phones(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_phones_created_at ON phones(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_phones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_phones_updated_at ON phones;
CREATE TRIGGER update_phones_updated_at 
    BEFORE UPDATE ON phones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_phones_updated_at();

-- Function to link phone to user
CREATE OR REPLACE FUNCTION link_phone_to_user(
    p_phone_hash VARCHAR(255),
    p_user_id UUID
)
RETURNS UUID AS $$
BEGIN
    INSERT INTO phones (
        phone_hash,
        linked_user_id
    ) VALUES (
        p_phone_hash,
        p_user_id
    )
    ON CONFLICT (phone_hash) DO UPDATE SET
        linked_user_id = EXCLUDED.linked_user_id,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to unlink phone from user
CREATE OR REPLACE FUNCTION unlink_phone_from_user(
    p_phone_hash VARCHAR(255)
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM phones
    WHERE phone_hash = p_phone_hash;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get user by phone hash
CREATE OR REPLACE FUNCTION get_user_by_phone_hash(
    p_phone_hash VARCHAR(255)
)
RETURNS TABLE(
    user_id UUID,
    phone_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.linked_user_id,
        p.phone_hash,
        p.created_at
    FROM phones p
    WHERE p.phone_hash = p_phone_hash;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE phones IS 'Stores phone numbers with privacy (hashed)';
COMMENT ON COLUMN phones.phone_hash IS 'Hashed phone number for privacy';
COMMENT ON COLUMN phones.linked_user_id IS 'Reference to the user who owns this phone';
COMMENT ON COLUMN phones.created_at IS 'When this phone was first linked';
COMMENT ON COLUMN phones.updated_at IS 'When this phone was last updated'; 