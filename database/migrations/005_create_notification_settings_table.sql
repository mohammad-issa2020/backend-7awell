-- Migration: 005_create_notification_settings_table.sql
-- Description: Create notification_settings table
-- Date: 2025-06-02

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT true NOT NULL,
    transaction_alerts BOOLEAN DEFAULT true NOT NULL,
    security_alerts BOOLEAN DEFAULT true NOT NULL,
    promotions BOOLEAN DEFAULT true NOT NULL,
    email_notifications BOOLEAN DEFAULT true NOT NULL,
    sms_notifications BOOLEAN DEFAULT true NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_push ON notification_settings(push_enabled);
CREATE INDEX IF NOT EXISTS idx_notification_settings_email ON notification_settings(email_notifications);
CREATE INDEX IF NOT EXISTS idx_notification_settings_sms ON notification_settings(sms_notifications);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create default notification settings for a user
CREATE OR REPLACE FUNCTION create_default_notification_settings(user_uuid UUID)
RETURNS void AS $$
BEGIN
    -- Insert default notification settings
    INSERT INTO notification_settings (user_id) 
    VALUES (user_uuid)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql; 