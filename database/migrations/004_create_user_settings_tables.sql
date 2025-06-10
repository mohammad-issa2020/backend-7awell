-- Migration: 004_create_user_settings_tables.sql
-- Description: Create user_settings and notification_settings tables
-- Date: 2025-06-02

-- Create enum type for theme
CREATE TYPE theme_enum AS ENUM ('light', 'dark', 'system');

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(5) DEFAULT 'en' NOT NULL,
    theme theme_enum DEFAULT 'light' NOT NULL,
    daily_limit DECIMAL(15,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT TRUE,
    transaction_alerts BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    promotions BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_language ON user_settings(language);
CREATE INDEX IF NOT EXISTS idx_user_settings_theme ON user_settings(theme);

CREATE INDEX IF NOT EXISTS idx_notification_settings_push ON notification_settings(push_enabled);
CREATE INDEX IF NOT EXISTS idx_notification_settings_email ON notification_settings(email_notifications);

-- Add constraints for user_settings
ALTER TABLE user_settings ADD CONSTRAINT check_language_code 
    CHECK (LENGTH(language) BETWEEN 2 AND 5);

ALTER TABLE user_settings ADD CONSTRAINT check_daily_limit 
    CHECK (daily_limit IS NULL OR daily_limit >= 0);


-- Create triggers for updated_at
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create default settings for a user
CREATE OR REPLACE FUNCTION create_default_user_settings(user_uuid UUID, user_language VARCHAR(5) DEFAULT 'en')
RETURNS void AS $$
BEGIN
    -- Insert default user settings
    INSERT INTO user_settings (user_id, language) 
    VALUES (user_uuid, user_language)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert default notification settings
    INSERT INTO notification_settings (user_id) 
    VALUES (user_uuid)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
