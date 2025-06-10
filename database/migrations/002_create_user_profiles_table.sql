-- Create enum type for gender
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    date_of_birth DATE,
    gender gender_enum,
    country VARCHAR(2), -- ISO country code (ISO 3166-1 alpha-2)
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_first_name ON user_profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_name ON user_profiles(last_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Add constraint for country code validation (ISO 3166-1 alpha-2)
ALTER TABLE user_profiles ADD CONSTRAINT check_country_code 
    CHECK (country IS NULL OR LENGTH(country) = 2);

-- Add constraint for valid date of birth (not in future, reasonable age limits)
ALTER TABLE user_profiles ADD CONSTRAINT check_date_of_birth 
    CHECK (date_of_birth IS NULL OR (
        date_of_birth <= CURRENT_DATE AND 
        date_of_birth >= CURRENT_DATE - INTERVAL '120 years'
    ));

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
