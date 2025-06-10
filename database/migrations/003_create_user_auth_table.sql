-- Migration: 003_create_user_auth_table.sql
-- Description: Create user_auth table for additional authentication and security settings
-- Date: 2025-06-02

-- Create user_auth table
CREATE TABLE IF NOT EXISTS user_auth (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    auth_service_id VARCHAR(255) NULL, -- Stytch user ID reference
    pin_hash VARCHAR(255), -- Hashed PIN for app access
    pin_salt VARCHAR(255), -- Salt for PIN hashing
    pin_attempts INTEGER DEFAULT 0, -- Failed PIN attempts counter
    pin_locked_until TIMESTAMP WITH TIME ZONE, -- Lock time after failed attempts
    biometric_enabled BOOLEAN DEFAULT FALSE, -- Fingerprint/Face ID enabled
    two_factor_enabled BOOLEAN DEFAULT FALSE, -- Additional 2FA for app
    two_factor_secret VARCHAR(255), -- TOTP secret for 2FA
    transaction_pin_enabled BOOLEAN DEFAULT TRUE, -- Require PIN for transactions
    transaction_pin_hash VARCHAR(255), -- Separate PIN for transactions
    transaction_pin_salt VARCHAR(255), -- Salt for transaction PIN
    security_questions JSONB DEFAULT '[]', -- Security questions for recovery
    device_whitelist JSONB DEFAULT '[]', -- Trusted devices
    login_attempts INTEGER DEFAULT 0, -- Failed login attempts
    locked_until TIMESTAMP WITH TIME ZONE, -- Account lock time
    last_security_check TIMESTAMP WITH TIME ZONE,
    security_level VARCHAR(20) DEFAULT 'standard' CHECK (security_level IN ('basic', 'standard', 'high', 'maximum')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_auth_locked_until ON user_auth(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_auth_security_level ON user_auth(security_level);
CREATE INDEX IF NOT EXISTS idx_user_auth_pin_locked ON user_auth(pin_locked_until) WHERE pin_locked_until IS NOT NULL;

-- Add constraints
ALTER TABLE user_auth ADD CONSTRAINT check_pin_attempts 
    CHECK (pin_attempts >= 0 AND pin_attempts <= 10);

ALTER TABLE user_auth ADD CONSTRAINT check_login_attempts 
    CHECK (login_attempts >= 0 AND login_attempts <= 10);

-- Ensure PIN hash and salt are set together
ALTER TABLE user_auth ADD CONSTRAINT check_pin_consistency 
    CHECK ((pin_hash IS NULL AND pin_salt IS NULL) OR (pin_hash IS NOT NULL AND pin_salt IS NOT NULL));

-- Ensure transaction PIN hash and salt are set together  
ALTER TABLE user_auth ADD CONSTRAINT check_transaction_pin_consistency 
    CHECK ((transaction_pin_hash IS NULL AND transaction_pin_salt IS NULL) OR (transaction_pin_hash IS NOT NULL AND transaction_pin_salt IS NOT NULL));

-- Create trigger for updated_at
CREATE TRIGGER update_user_auth_updated_at 
    BEFORE UPDATE ON user_auth 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to reset PIN attempts
CREATE OR REPLACE FUNCTION reset_pin_attempts(user_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE user_auth 
    SET pin_attempts = 0, pin_locked_until = NULL 
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to increment PIN attempts and lock if needed
CREATE OR REPLACE FUNCTION increment_pin_attempts(user_uuid UUID)
RETURNS boolean AS $$ -- Returns true if account is now locked
DECLARE
    current_attempts INTEGER;
    max_attempts INTEGER := 5;
    lock_duration INTERVAL := '30 minutes';
BEGIN
    UPDATE user_auth 
    SET pin_attempts = pin_attempts + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = user_uuid
    RETURNING pin_attempts INTO current_attempts;
    
    IF current_attempts >= max_attempts THEN
        UPDATE user_auth 
        SET pin_locked_until = CURRENT_TIMESTAMP + lock_duration
        WHERE user_id = user_uuid;
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;



-- Add RLS policies
ALTER TABLE user_auth ENABLE ROW LEVEL SECURITY;

