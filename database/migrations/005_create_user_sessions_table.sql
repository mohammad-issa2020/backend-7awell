-- check if delete or not

-- Migration: 005_create_user_sessions_table.sql
-- Description: Create user_sessions table for enhanced session management
-- Date: 2024-03-19

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL, -- Our internal session token
    device_id VARCHAR(255), -- Device identifier
    device_name VARCHAR(100), -- Friendly device name
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    pin_verified BOOLEAN DEFAULT FALSE, -- PIN verification status
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
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

