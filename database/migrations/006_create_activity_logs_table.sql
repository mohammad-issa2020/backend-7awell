-- Migration: 006_create_activity_logs_table.sql
-- Description: Create activity_logs table for user activity tracking and security monitoring
-- Date: 2025-06-02

-- Create enum for common activity types
CREATE TYPE activity_type_enum AS ENUM (
    'auth_login',
    'auth_logout', 
    'auth_failed_login',
    'auth_otp_sent',
    'auth_otp_verified',
    'auth_password_changed',
    'profile_updated',
    'settings_changed',
    'wallet_created',
    'wallet_imported',
    'transaction_sent',
    'transaction_received',
    'pin_created',
    'pin_changed',
    'pin_failed',
    'biometric_enabled',
    'biometric_disabled',
    'session_created',
    'session_terminated',
    'device_added',
    'device_removed',
    'security_alert',
    'account_locked',
    'account_unlocked',
    'data_export',
    'data_deletion',
    'suspicious_activity',
    'other'
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Allow logs to remain if user deleted
    action VARCHAR(100) NOT NULL,
    activity_type activity_type_enum DEFAULT 'other',
    details JSONB DEFAULT '{}',
    ip_address INET,
    device_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_user_time ON activity_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_ip ON activity_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_activity_device ON activity_logs(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_user_type_time ON activity_logs(user_id, activity_type, created_at);

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_activity_type activity_type_enum DEFAULT 'other',
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_device_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        user_id,
        action,
        activity_type,
        details,
        ip_address,
        device_id
    ) VALUES (
        p_user_id,
        p_action,
        p_activity_type,
        p_details,
        p_ip_address,
        p_device_id
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;


