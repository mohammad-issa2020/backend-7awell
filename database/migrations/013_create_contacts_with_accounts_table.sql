-- Migration: 013_create_contacts_with_accounts_table.sql
-- Description: Create contacts_with_accounts table for storing user contacts
-- Date: 2025-06-02

-- Drop existing table if it exists
DROP TABLE IF EXISTS contacts_with_accounts CASCADE;

-- Create contacts_with_accounts table
CREATE TABLE IF NOT EXISTS contacts_with_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_hash VARCHAR(255) NOT NULL,
    is_favorite BOOLEAN DEFAULT false,
    linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    last_interaction TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_phone_hash_length CHECK (LENGTH(phone_hash) BETWEEN 1 AND 255),
    CONSTRAINT unique_owner_phone UNIQUE (owner_id, phone_hash)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts_with_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_hash ON contacts_with_accounts(phone_hash);
CREATE INDEX IF NOT EXISTS idx_contacts_linked_user ON contacts_with_accounts(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON contacts_with_accounts(last_interaction);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts_with_accounts;
CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts_with_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_contacts_updated_at();

-- Function to add contact
CREATE OR REPLACE FUNCTION add_contact(
    p_owner_id UUID,
    p_phone_hash VARCHAR(255),
    p_is_favorite BOOLEAN DEFAULT false,
    p_linked_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_contact_id UUID;
BEGIN
    INSERT INTO contacts_with_accounts (
        owner_id,
        phone_hash,
        is_favorite,
        linked_user_id
    ) VALUES (
        p_owner_id,
        p_phone_hash,
        p_is_favorite,
        p_linked_user_id
    )
    ON CONFLICT (owner_id, phone_hash) DO UPDATE SET
        is_favorite = EXCLUDED.is_favorite,
        linked_user_id = EXCLUDED.linked_user_id,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_contact_id;
    
    RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update contact
CREATE OR REPLACE FUNCTION update_contact(
    p_contact_id UUID,
    p_is_favorite BOOLEAN DEFAULT NULL,
    p_linked_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE contacts_with_accounts
    SET 
        is_favorite = COALESCE(p_is_favorite, is_favorite),
        linked_user_id = COALESCE(p_linked_user_id, linked_user_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_contact_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to delete contact
CREATE OR REPLACE FUNCTION delete_contact(
    p_contact_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM contacts_with_accounts
    WHERE id = p_contact_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get contact by ID
CREATE OR REPLACE FUNCTION get_contact_by_id(
    p_contact_id UUID
)
RETURNS TABLE(
    id UUID,
    owner_id UUID,
    phone_hash VARCHAR(255),
    is_favorite BOOLEAN,
    linked_user_id UUID,
    last_interaction TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.owner_id,
        c.phone_hash,
        c.is_favorite,
        c.linked_user_id,
        c.last_interaction,
        c.created_at,
        c.updated_at
    FROM contacts_with_accounts c
    WHERE c.id = p_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE contacts_with_accounts IS 'Stores user contacts with optional linked 7awel accounts';
COMMENT ON COLUMN contacts_with_accounts.id IS 'Unique identifier for the contact';
COMMENT ON COLUMN contacts_with_accounts.owner_id IS 'User who owns this contact';
COMMENT ON COLUMN contacts_with_accounts.phone_hash IS 'Hashed phone number for privacy';
COMMENT ON COLUMN contacts_with_accounts.is_favorite IS 'Whether this contact is marked as favorite';
COMMENT ON COLUMN contacts_with_accounts.linked_user_id IS 'Reference to 7awel user if they have an account';
COMMENT ON COLUMN contacts_with_accounts.last_interaction IS 'Last interaction timestamp with this contact';
COMMENT ON COLUMN contacts_with_accounts.created_at IS 'When this contact was first added';
COMMENT ON COLUMN contacts_with_accounts.updated_at IS 'When this contact was last updated'; 