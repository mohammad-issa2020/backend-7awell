-- Create enum type for sync status
CREATE TYPE contact_sync_status_type AS ENUM ('pending', 'syncing', 'completed', 'failed');

-- Create contact_sync_status table
CREATE TABLE contact_sync_status (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_sync TIMESTAMP,
    device_contacts_count INTEGER DEFAULT 0,
    synced_contacts_count INTEGER DEFAULT 0,
    status contact_sync_status_type DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update updated_at
CREATE TRIGGER set_contact_sync_status_updated_at
    BEFORE UPDATE ON contact_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_contact_sync_status_user_id ON contact_sync_status(user_id);
CREATE INDEX idx_contact_sync_status_status ON contact_sync_status(status);

-- Add RLS policies
ALTER TABLE contact_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync status"
    ON contact_sync_status
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync status"
    ON contact_sync_status
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync status"
    ON contact_sync_status
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create function to handle sync status updates
CREATE OR REPLACE FUNCTION update_contact_sync_status(
    p_user_id UUID,
    p_device_contacts_count INTEGER,
    p_synced_contacts_count INTEGER,
    p_status contact_sync_status_type
)
RETURNS contact_sync_status
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sync_status contact_sync_status;
BEGIN
    INSERT INTO contact_sync_status (
        user_id,
        last_sync,
        device_contacts_count,
        synced_contacts_count,
        status
    )
    VALUES (
        p_user_id,
        CURRENT_TIMESTAMP,
        p_device_contacts_count,
        p_synced_contacts_count,
        p_status
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        last_sync = CURRENT_TIMESTAMP,
        device_contacts_count = p_device_contacts_count,
        synced_contacts_count = p_synced_contacts_count,
        status = p_status,
        updated_at = CURRENT_TIMESTAMP
    RETURNING * INTO v_sync_status;

    RETURN v_sync_status;
END;
$$; 