-- check if delete or not

-- Migration: 005_create_user_sessions_table.sql
-- Description: Create user_sessions table for enhanced session management
-- Date: 2025-06-02

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stytch_session_id VARCHAR(255), -- Reference to Stytch session
    session_token VARCHAR(255) UNIQUE NOT NULL, -- Our internal session token
    device_id VARCHAR(255), -- Device identifier
    device_name VARCHAR(100), -- Friendly device name
    ip_address INET,
    user_agent TEXT,
    location_country VARCHAR(2), -- Country code
    location_city VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    pin_verified BOOLEAN DEFAULT FALSE, -- PIN verification status
    biometric_verified BOOLEAN DEFAULT FALSE, -- Biometric verification status
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_stytch ON user_sessions(stytch_session_id) WHERE stytch_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_device ON user_sessions(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip ON user_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Add constraints
ALTER TABLE user_sessions ADD CONSTRAINT check_expires_future 
    CHECK (expires_at > created_at);

-- Ensure active sessions have valid expiry
ALTER TABLE user_sessions ADD CONSTRAINT check_active_not_expired 
    CHECK (is_active = FALSE OR expires_at > CURRENT_TIMESTAMP);



-- Function to create session
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_stytch_session_id VARCHAR(255) DEFAULT NULL,
    p_session_token VARCHAR(255),
    p_device_id VARCHAR(255) DEFAULT NULL,
    p_device_name VARCHAR(100) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_expires_minutes INTEGER DEFAULT 1440 -- 24 hours default
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
    expires_time TIMESTAMP WITH TIME ZONE;
BEGIN
    expires_time := CURRENT_TIMESTAMP + (p_expires_minutes || ' minutes')::INTERVAL;
    
    INSERT INTO user_sessions (
        user_id, 
        stytch_session_id, 
        session_token, 
        device_id, 
        device_name,
        ip_address, 
        user_agent, 
        expires_at
    ) VALUES (
        p_user_id, 
        p_stytch_session_id, 
        p_session_token, 
        p_device_id, 
        p_device_name,
        p_ip_address, 
        p_user_agent, 
        expires_time
    )
    RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to verify PIN for session
CREATE OR REPLACE FUNCTION verify_session_pin(p_session_token VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_sessions 
    SET pin_verified = TRUE,
        last_activity = CURRENT_TIMESTAMP
    WHERE session_token = p_session_token 
    AND is_active = TRUE 
    AND expires_at > CURRENT_TIMESTAMP;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(p_session_token VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_sessions 
    SET last_activity = CURRENT_TIMESTAMP
    WHERE session_token = p_session_token 
    AND is_active = TRUE 
    AND expires_at > CURRENT_TIMESTAMP;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to terminate session
CREATE OR REPLACE FUNCTION terminate_session(p_session_token VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE
    WHERE session_token = p_session_token;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to terminate all user sessions except current
CREATE OR REPLACE FUNCTION terminate_other_sessions(p_user_id UUID, p_current_session_token VARCHAR(255))
RETURNS INTEGER AS $$
DECLARE
    terminated_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE
    WHERE user_id = p_user_id 
    AND session_token != p_current_session_token 
    AND is_active = TRUE;
    
    GET DIAGNOSTICS terminated_count = ROW_COUNT;
    RETURN terminated_count;
END;
$$ LANGUAGE plpgsql;


-- Add RLS policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (user_id IN (
        SELECT id FROM users WHERE stytch_user_id = auth.uid()::text
    ));

-- Policy: Users can update their own sessions (for activity updates)
CREATE POLICY "Users can update own sessions" ON user_sessions
    FOR UPDATE USING (user_id IN (
        SELECT id FROM users WHERE stytch_user_id = auth.uid()::text
    ));

-- Policy: Service role has full access
CREATE POLICY "Service role has full session access" ON user_sessions
    FOR ALL USING (current_setting('role') = 'service_role');

-- Create view for session summary
CREATE OR REPLACE VIEW user_session_summary AS
SELECT 
    us.user_id,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE us.is_active = TRUE) as active_sessions,
    COUNT(*) FILTER (WHERE us.pin_verified = TRUE AND us.is_active = TRUE) as verified_sessions,
    MAX(us.last_activity) as last_session_activity,
    COUNT(DISTINCT us.device_id) FILTER (WHERE us.device_id IS NOT NULL) as unique_devices
FROM user_sessions us
WHERE us.expires_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY us.user_id;

-- Schedule cleanup job (this would typically be run by a cron job)
-- For now, we'll just create the function that can be called periodically
CREATE OR REPLACE FUNCTION schedule_session_cleanup()
RETURNS void AS $$
BEGIN
    PERFORM cleanup_expired_sessions();
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE user_sessions IS 'Enhanced session management with device tracking and PIN verification';
COMMENT ON COLUMN user_sessions.stytch_session_id IS 'Reference to Stytch session for integration';
COMMENT ON COLUMN user_sessions.session_token IS 'Internal session token for our application';
COMMENT ON COLUMN user_sessions.device_id IS 'Unique device identifier';
COMMENT ON COLUMN user_sessions.pin_verified IS 'Whether PIN has been verified for this session';
COMMENT ON COLUMN user_sessions.biometric_verified IS 'Whether biometric authentication has been used';
COMMENT ON VIEW user_session_summary IS 'Summary statistics for user sessions'; 