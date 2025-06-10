-- Create enum for contact sync status
CREATE TYPE contact_sync_status_enum AS ENUM ('pending', 'syncing', 'completed', 'failed');

-- Create phones table for phone hash to user mapping
CREATE TABLE IF NOT EXISTS phones (
    phone_hash VARCHAR(255) PRIMARY KEY NOT NULL,
    linked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create contacts_with_accounts table for user contacts
CREATE TABLE IF NOT EXISTS contacts_with_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_hash VARCHAR(255) NOT NULL,
    is_favorite BOOLEAN DEFAULT false,
    linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    last_interaction TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create contact_sync_status table for tracking sync operations
CREATE TABLE IF NOT EXISTS contact_sync_status (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_sync TIMESTAMP WITH TIME ZONE,
    device_contacts_count INTEGER DEFAULT 0,
    synced_contacts_count INTEGER DEFAULT 0,
    status contact_sync_status_enum DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_phones_linked_user ON phones(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_phones_created_at ON phones(created_at);

CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts_with_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_hash ON contacts_with_accounts(phone_hash);
CREATE INDEX IF NOT EXISTS idx_contacts_linked_user ON contacts_with_accounts(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_favorite ON contacts_with_accounts(owner_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON contacts_with_accounts(last_interaction);

CREATE INDEX IF NOT EXISTS idx_contact_sync_status ON contact_sync_status(status);
CREATE INDEX IF NOT EXISTS idx_contact_sync_last_sync ON contact_sync_status(last_sync);

-- Add unique constraints
ALTER TABLE contacts_with_accounts ADD CONSTRAINT unique_owner_phone 
    UNIQUE (owner_id, phone_hash);

-- Add check constraints
ALTER TABLE contacts_with_accounts ADD CONSTRAINT check_phone_hash_length
    CHECK (LENGTH(phone_hash) >= 32 AND LENGTH(phone_hash) <= 255);

ALTER TABLE contact_sync_status ADD CONSTRAINT check_contacts_count_positive
    CHECK (device_contacts_count >= 0 AND synced_contacts_count >= 0);

ALTER TABLE contact_sync_status ADD CONSTRAINT check_synced_not_greater_than_device
    CHECK (synced_contacts_count <= device_contacts_count);

-- Function to update updated_at timestamp for phones
CREATE OR REPLACE FUNCTION update_phones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update updated_at timestamp for contacts_with_accounts
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update updated_at timestamp for contact_sync_status
CREATE OR REPLACE FUNCTION update_contact_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_phones_updated_at 
    BEFORE UPDATE ON phones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_phones_updated_at();

CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts_with_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_contacts_updated_at();

CREATE TRIGGER update_contact_sync_updated_at 
    BEFORE UPDATE ON contact_sync_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_contact_sync_updated_at();

-- Function to create phone hash mapping
CREATE OR REPLACE FUNCTION create_phone_mapping(
    p_phone_hash VARCHAR(255),
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO phones (phone_hash, linked_user_id)
    VALUES (p_phone_hash, p_user_id)
    ON CONFLICT (phone_hash) DO UPDATE SET
        linked_user_id = EXCLUDED.linked_user_id,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to sync contacts for a user
CREATE OR REPLACE FUNCTION sync_user_contacts(
    p_owner_id UUID,
    p_phone_hashes TEXT[], -- Array of phone hashes
    p_device_contacts_count INTEGER
)
RETURNS JSON AS $$
DECLARE
    phone_hash TEXT;
    matched_contacts INTEGER := 0;
    total_processed INTEGER := 0;
    linked_user UUID;
    result JSON;
BEGIN
    -- Update sync status to syncing
    INSERT INTO contact_sync_status (user_id, status, device_contacts_count)
    VALUES (p_owner_id, 'syncing', p_device_contacts_count)
    ON CONFLICT (user_id) DO UPDATE SET
        status = 'syncing',
        device_contacts_count = EXCLUDED.device_contacts_count,
        updated_at = CURRENT_TIMESTAMP;

    -- Process each phone hash
    FOREACH phone_hash IN ARRAY p_phone_hashes
    LOOP
        total_processed := total_processed + 1;
        
        -- Check if this phone hash is linked to a user
        SELECT linked_user_id INTO linked_user
        FROM phones 
        WHERE phone_hash = phone_hash;
        
        IF linked_user IS NOT NULL THEN
            -- Insert or update contact
            INSERT INTO contacts_with_accounts (
                owner_id, 
                phone_hash, 
                linked_user_id,
                last_interaction
            )
            VALUES (
                p_owner_id, 
                phone_hash, 
                linked_user,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (owner_id, phone_hash) DO UPDATE SET
                linked_user_id = EXCLUDED.linked_user_id,
                last_interaction = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP;
            
            matched_contacts := matched_contacts + 1;
        END IF;
    END LOOP;

    -- Update sync status to completed
    UPDATE contact_sync_status 
    SET 
        status = 'completed',
        synced_contacts_count = matched_contacts,
        last_sync = CURRENT_TIMESTAMP,
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_owner_id;

    -- Return result
    result := json_build_object(
        'success', TRUE,
        'total_processed', total_processed,
        'matched_contacts', matched_contacts,
        'timestamp', CURRENT_TIMESTAMP
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Update sync status to failed
        UPDATE contact_sync_status 
        SET 
            status = 'failed',
            error_message = SQLERRM,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_owner_id;
        
        RETURN json_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'timestamp', CURRENT_TIMESTAMP
        );
END;
$$ LANGUAGE plpgsql;

-- Function to get user contacts
CREATE OR REPLACE FUNCTION get_user_contacts(
    p_user_id UUID,
    p_favorites_only BOOLEAN DEFAULT FALSE,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    contact_id UUID,
    phone_hash VARCHAR(255),
    linked_user_id UUID,
    linked_user_phone VARCHAR(20),
    linked_user_email VARCHAR(255),
    linked_user_first_name VARCHAR(100),
    linked_user_last_name VARCHAR(100),
    linked_user_avatar TEXT,
    is_favorite BOOLEAN,
    last_interaction TIMESTAMP WITH TIME ZONE,
    contact_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as contact_id,
        c.phone_hash,
        c.linked_user_id,
        u.phone as linked_user_phone,
        u.email as linked_user_email,
        up.first_name as linked_user_first_name,
        up.last_name as linked_user_last_name,
        up.avatar_url as linked_user_avatar,
        c.is_favorite,
        c.last_interaction,
        c.created_at as contact_created_at
    FROM contacts_with_accounts c
    LEFT JOIN users u ON c.linked_user_id = u.id
    LEFT JOIN user_profiles up ON c.linked_user_id = up.user_id
    WHERE c.owner_id = p_user_id
    AND (NOT p_favorites_only OR c.is_favorite = TRUE)
    AND c.linked_user_id IS NOT NULL
    ORDER BY 
        c.is_favorite DESC,
        c.last_interaction DESC NULLS LAST,
        c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_contact_favorite(
    p_owner_id UUID,
    p_contact_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    current_favorite BOOLEAN;
BEGIN
    -- Get current favorite status
    SELECT is_favorite INTO current_favorite
    FROM contacts_with_accounts
    WHERE id = p_contact_id AND owner_id = p_owner_id;
    
    IF current_favorite IS NULL THEN
        RETURN FALSE; -- Contact not found
    END IF;
    
    -- Toggle favorite status
    UPDATE contacts_with_accounts
    SET 
        is_favorite = NOT current_favorite,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_contact_id AND owner_id = p_owner_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to update last interaction
CREATE OR REPLACE FUNCTION update_contact_interaction(
    p_owner_id UUID,
    p_phone_hash VARCHAR(255)
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE contacts_with_accounts
    SET 
        last_interaction = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE owner_id = p_owner_id AND phone_hash = p_phone_hash;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get contact sync status
CREATE OR REPLACE FUNCTION get_contact_sync_status(p_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    last_sync TIMESTAMP WITH TIME ZONE,
    device_contacts_count INTEGER,
    synced_contacts_count INTEGER,
    status contact_sync_status_enum,
    error_message TEXT,
    sync_percentage NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        css.user_id,
        css.last_sync,
        css.device_contacts_count,
        css.synced_contacts_count,
        css.status,
        css.error_message,
        CASE 
            WHEN css.device_contacts_count > 0 THEN
                ROUND((css.synced_contacts_count::NUMERIC / css.device_contacts_count::NUMERIC) * 100, 2)
            ELSE 0
        END as sync_percentage
    FROM contact_sync_status css
    WHERE css.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old contact sync data
CREATE OR REPLACE FUNCTION cleanup_old_contact_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Remove contacts for users who haven't synced in 90 days
    DELETE FROM contacts_with_accounts
    WHERE owner_id IN (
        SELECT user_id 
        FROM contact_sync_status 
        WHERE last_sync < CURRENT_TIMESTAMP - INTERVAL '90 days'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Reset sync status for users who haven't synced in 90 days
    UPDATE contact_sync_status
    SET 
        status = 'pending',
        device_contacts_count = 0,
        synced_contacts_count = 0,
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE last_sync < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts_with_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_sync_status ENABLE ROW LEVEL SECURITY;

-- Create views for easy access
CREATE OR REPLACE VIEW user_favorite_contacts AS
SELECT 
    c.id,
    c.owner_id,
    c.phone_hash,
    c.linked_user_id,
    u.phone,
    u.email,
    up.first_name,
    up.last_name,
    up.avatar_url as avatar,
    c.last_interaction,
    c.created_at
FROM contacts_with_accounts c
LEFT JOIN users u ON c.linked_user_id = u.id
LEFT JOIN user_profiles up ON c.linked_user_id = up.user_id
WHERE c.is_favorite = TRUE
AND c.linked_user_id IS NOT NULL
ORDER BY c.last_interaction DESC NULLS LAST;

CREATE OR REPLACE VIEW contact_sync_summary AS
SELECT 
    css.user_id,
    css.last_sync,
    css.device_contacts_count,
    css.synced_contacts_count,
    css.status,
    CASE 
        WHEN css.device_contacts_count > 0 THEN
            ROUND((css.synced_contacts_count::NUMERIC / css.device_contacts_count::NUMERIC) * 100, 2)
        ELSE 0
    END as sync_percentage,
    css.updated_at
FROM contact_sync_status css
ORDER BY css.updated_at DESC;

-- Add RLS to views
ALTER VIEW user_favorite_contacts SET (security_barrier = true);
ALTER VIEW contact_sync_summary SET (security_barrier = true);

-- Trigger function to log contact activities
CREATE OR REPLACE FUNCTION log_contact_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log contact creation
    IF TG_OP = 'INSERT' THEN
        PERFORM log_user_activity(
            NEW.owner_id,
            'Contact added',
            'other',
            jsonb_build_object(
                'contact_id', NEW.id,
                'has_account', NEW.linked_user_id IS NOT NULL,
                'is_favorite', NEW.is_favorite
            )
        );
        RETURN NEW;
    END IF;
    
    -- Log contact updates
    IF TG_OP = 'UPDATE' THEN
        -- Log favorite toggle
        IF OLD.is_favorite != NEW.is_favorite THEN
            PERFORM log_user_activity(
                NEW.owner_id,
                CASE WHEN NEW.is_favorite THEN 'Contact marked as favorite' ELSE 'Contact unmarked as favorite' END,
                'other',
                jsonb_build_object(
                    'contact_id', NEW.id,
                    'is_favorite', NEW.is_favorite
                )
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contact activity logging
CREATE TRIGGER trigger_log_contact_activity
    AFTER INSERT OR UPDATE ON contacts_with_accounts
    FOR EACH ROW
    EXECUTE FUNCTION log_contact_activity();

-- Add comments for documentation
COMMENT ON TABLE phones IS 'Phone hash to user ID mapping for privacy-preserving contact matching';
COMMENT ON COLUMN phones.phone_hash IS 'SHA-256 hash of phone number for privacy';
COMMENT ON COLUMN phones.linked_user_id IS 'Reference to user who owns this phone number';

COMMENT ON TABLE contacts_with_accounts IS 'User contacts that have 7awel accounts';
COMMENT ON COLUMN contacts_with_accounts.owner_id IS 'User who owns this contact list';
COMMENT ON COLUMN contacts_with_accounts.phone_hash IS 'SHA-256 hash of contact phone number';
COMMENT ON COLUMN contacts_with_accounts.linked_user_id IS 'Reference to the 7awel user if contact has an account';
COMMENT ON COLUMN contacts_with_accounts.is_favorite IS 'Whether this contact is marked as favorite';
COMMENT ON COLUMN contacts_with_accounts.last_interaction IS 'Last time user interacted with this contact';

COMMENT ON TABLE contact_sync_status IS 'Status of contact synchronization for each user';
COMMENT ON COLUMN contact_sync_status.device_contacts_count IS 'Total number of contacts on user device';
COMMENT ON COLUMN contact_sync_status.synced_contacts_count IS 'Number of contacts that have 7awel accounts';
COMMENT ON COLUMN contact_sync_status.status IS 'Current status of contact sync operation';

COMMENT ON VIEW user_favorite_contacts IS 'All favorite contacts with linked user information';
COMMENT ON VIEW contact_sync_summary IS 'Summary of contact sync status for all users'; 