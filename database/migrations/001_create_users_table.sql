-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL, -- Primary identifier
    stytch_user_id VARCHAR(255) UNIQUE NULL, -- Stytch user ID
    email VARCHAR(255) UNIQUE,
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    kyc_level VARCHAR(20) DEFAULT 'none' CHECK (kyc_level IN ('none', 'basic', 'enhanced', 'full'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role to perform all operations
-- This allows admin operations and testing
CREATE POLICY "Allow service role full access" ON users 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Create policy to allow authenticated users to read their own data
CREATE POLICY "Users can view own data" ON users 
    FOR SELECT 
    TO authenticated 
    USING (id = auth.uid());

-- Create policy to allow authenticated users to update their own data
CREATE POLICY "Users can update own data" ON users 
    FOR UPDATE 
    TO authenticated 
    USING (id = auth.uid()) 
    WITH CHECK (id = auth.uid());

-- Create policy for inserting new users (public access during registration)
CREATE POLICY "Allow user creation" ON users 
    FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);
