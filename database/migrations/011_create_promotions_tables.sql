-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    locale VARCHAR(10) DEFAULT 'en' NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_priority ON promotions(priority DESC);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_active_priority ON promotions(is_active, priority DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotions_title ON promotions(title);
CREATE INDEX IF NOT EXISTS idx_promotions_created_at ON promotions(created_at);

-- Add check constraints
ALTER TABLE promotions ADD CONSTRAINT check_title_not_empty
    CHECK (LENGTH(TRIM(title)) > 0);

ALTER TABLE promotions ADD CONSTRAINT check_priority_range
    CHECK (priority >= 0 AND priority <= 100);

ALTER TABLE promotions ADD CONSTRAINT check_date_logic
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date > start_date);

ALTER TABLE promotions ADD CONSTRAINT check_locale_format
    CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

-- Function to update updated_at timestamp for promotions
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_promotions_updated_at 
    BEFORE UPDATE ON promotions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_promotions_updated_at();

-- Function to get active promotions
CREATE OR REPLACE FUNCTION get_active_promotions(
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    promotion_id UUID,
    title VARCHAR(255),
    description TEXT,
    priority INTEGER,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    locale VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as promotion_id,
        p.title,
        p.description,
        p.priority,
        p.start_date,
        p.end_date,
        p.locale
    FROM promotions p
    WHERE p.is_active = true
    AND (p.start_date IS NULL OR p.start_date <= CURRENT_TIMESTAMP)
    AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
    ORDER BY p.priority DESC, p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for promotions (public read for active promotions)
CREATE POLICY promotions_public_read ON promotions
    FOR SELECT
    USING (is_active = true AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP) AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP));

-- Create views for analytics and reporting
CREATE OR REPLACE VIEW active_promotions_summary AS
SELECT 
    COUNT(*) as total_active_promotions,
    COUNT(*) FILTER (WHERE start_date <= CURRENT_TIMESTAMP) as live_promotions,
    COUNT(*) FILTER (WHERE start_date > CURRENT_TIMESTAMP) as scheduled_promotions,
    AVG(priority) as avg_priority,
    MAX(created_at) as latest_promotion_created
FROM promotions
WHERE is_active = true
AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP);

-- Add RLS to views
ALTER VIEW active_promotions_summary SET (security_barrier = true);

-- Trigger function to log promotion activities
CREATE OR REPLACE FUNCTION log_promotion_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log promotion creation
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'promotions' THEN
        -- Log to system (no specific user)
        INSERT INTO activity_logs (user_id, action, activity_type, details)
        VALUES (
            NULL,
            'Promotion created: ' || NEW.title,
            'other',
            jsonb_build_object(
                'promotion_id', NEW.id,
                'title', NEW.title,
                'priority', NEW.priority,
                'start_date', NEW.start_date,
                'end_date', NEW.end_date
            )
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity logging
CREATE TRIGGER trigger_log_promotion_creation
    AFTER INSERT ON promotions
    FOR EACH ROW
    EXECUTE FUNCTION log_promotion_activity();

-- Function for scheduled cleanup (to be called by cron job)
CREATE OR REPLACE FUNCTION schedule_promotion_cleanup()
RETURNS INTEGER AS $$
DECLARE
    total_cleaned INTEGER := 0;
    expired_count INTEGER := 0;
BEGIN
    -- Expire old promotions
    expired_count := expire_old_promotions();
    
    total_cleaned := expired_count;
    
    RETURN total_cleaned;
END;
$$ LANGUAGE plpgsql;
