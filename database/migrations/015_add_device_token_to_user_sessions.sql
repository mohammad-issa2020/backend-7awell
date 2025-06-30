-- Migration: 015_add_device_token_to_user_sessions.sql
-- Description: Add device_token column to user_sessions table for Firebase notifications
-- Date: 2024-03-21

-- Add device_token column to user_sessions table
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS device_token TEXT;

-- Create index for device_token lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_token 
ON user_sessions(device_token) 
WHERE device_token IS NOT NULL;

-- Create index for user_id and device_token combination
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_device_token 
ON user_sessions(user_id, device_token) 
WHERE device_token IS NOT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN user_sessions.device_token IS 'Firebase Cloud Messaging (FCM) device token for push notifications'; 