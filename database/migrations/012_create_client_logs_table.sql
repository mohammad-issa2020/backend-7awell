-- Migration: 012_create_client_logs_table.sql
-- Description: Create client_logs table for client-side event logging and analytics
-- Date: 2025-06-02

-- Create client_logs table
CREATE TABLE IF NOT EXISTS client_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'analytics',
    severity VARCHAR(20) NOT NULL DEFAULT 'low',
    payload JSONB DEFAULT '{}',
    client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_drift_ms INTEGER DEFAULT 0,
    user_agent TEXT,
    ip_address INET,
    device_id VARCHAR(255),
    app_version VARCHAR(100),
    platform VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_logs_user_id ON client_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_client_logs_event_type ON client_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_client_logs_category ON client_logs(category);
CREATE INDEX IF NOT EXISTS idx_client_logs_severity ON client_logs(severity);
CREATE INDEX IF NOT EXISTS idx_client_logs_created_at ON client_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_client_logs_client_timestamp ON client_logs(client_timestamp);
CREATE INDEX IF NOT EXISTS idx_client_logs_user_event_time ON client_logs(user_id, event_type, created_at);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_client_logs_user_category_time ON client_logs(user_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_logs_user_severity_time ON client_logs(user_id, severity, created_at DESC);

-- GIN index for payload search
CREATE INDEX IF NOT EXISTS idx_client_logs_payload ON client_logs USING GIN (payload);

-- Add constraints
ALTER TABLE client_logs ADD CONSTRAINT check_event_type_not_empty
    CHECK (LENGTH(TRIM(event_type)) > 0);

ALTER TABLE client_logs ADD CONSTRAINT check_category_valid
    CHECK (category IN ('analytics', 'error', 'performance', 'security', 'business'));

ALTER TABLE client_logs ADD CONSTRAINT check_severity_valid
    CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE client_logs ADD CONSTRAINT check_timestamps_order
    CHECK (client_timestamp IS NOT NULL);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_client_logs_updated_at 
    BEFORE UPDATE ON client_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_client_logs_updated_at();

-- Function to get client analytics summary
CREATE OR REPLACE FUNCTION get_client_analytics_summary(
    p_user_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    total_events BIGINT,
    events_by_category JSONB,
    events_by_severity JSONB,
    events_by_type JSONB,
    avg_time_drift_ms NUMERIC,
    most_active_day DATE,
    error_rate NUMERIC,
    performance_events BIGINT,
    security_events BIGINT,
    platforms JSONB,
    app_versions JSONB
) AS $$
DECLARE
    start_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Set default start date if not provided (7 days ago)
    start_date := COALESCE(p_start_date, CURRENT_TIMESTAMP - INTERVAL '7 days');
    
    RETURN QUERY
    SELECT 
        COUNT(*) as total_events,
        
        -- Events by category
        jsonb_object_agg(
            category, 
            category_count
        ) FILTER (WHERE category IS NOT NULL) as events_by_category,
        
        -- Events by severity
        jsonb_object_agg(
            severity, 
            severity_count
        ) FILTER (WHERE severity IS NOT NULL) as events_by_severity,
        
        -- Top 10 event types
        jsonb_object_agg(
            event_type, 
            type_count
        ) FILTER (WHERE type_rank <= 10) as events_by_type,
        
        -- Average time drift
        ROUND(AVG(time_drift_ms)::NUMERIC, 2) as avg_time_drift_ms,
        
        -- Most active day
        (
            SELECT DATE(created_at) 
            FROM client_logs 
            WHERE user_id = p_user_id 
            AND created_at >= start_date
            GROUP BY DATE(created_at) 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ) as most_active_day,
        
        -- Error rate (percentage)
        ROUND(
            (COUNT(*) FILTER (WHERE category = 'error')::NUMERIC / 
             GREATEST(COUNT(*), 1)::NUMERIC) * 100, 
            2
        ) as error_rate,
        
        -- Performance events count
        COUNT(*) FILTER (WHERE category = 'performance') as performance_events,
        
        -- Security events count
        COUNT(*) FILTER (WHERE category = 'security') as security_events,
        
        -- Platform distribution
        jsonb_object_agg(
            COALESCE(platform, 'unknown'), 
            platform_count
        ) FILTER (WHERE platform_count > 0) as platforms,
        
        -- App version distribution
        jsonb_object_agg(
            COALESCE(app_version, 'unknown'), 
            version_count
        ) FILTER (WHERE version_count > 0) as app_versions
        
    FROM (
        SELECT 
            cl.*,
            COUNT(*) OVER (PARTITION BY category) as category_count,
            COUNT(*) OVER (PARTITION BY severity) as severity_count,
            COUNT(*) OVER (PARTITION BY event_type) as type_count,
            ROW_NUMBER() OVER (PARTITION BY 1 ORDER BY COUNT(*) OVER (PARTITION BY event_type) DESC) as type_rank,
            COUNT(*) OVER (PARTITION BY platform) as platform_count,
            COUNT(*) OVER (PARTITION BY app_version) as version_count
        FROM client_logs cl
        WHERE cl.user_id = p_user_id
        AND cl.created_at >= start_date
    ) aggregated_data;
END;
$$ LANGUAGE plpgsql;

-- Function to get client error summary
CREATE OR REPLACE FUNCTION get_client_error_summary(
    p_user_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    error_message TEXT,
    error_count BIGINT,
    latest_occurrence TIMESTAMP WITH TIME ZONE,
    platforms TEXT[],
    app_versions TEXT[]
) AS $$
DECLARE
    start_date TIMESTAMP WITH TIME ZONE;
BEGIN
    start_date := COALESCE(p_start_date, CURRENT_TIMESTAMP - INTERVAL '7 days');
    
    RETURN QUERY
    SELECT 
        COALESCE(payload->>'message', 'Unknown error') as error_message,
        COUNT(*) as error_count,
        MAX(created_at) as latest_occurrence,
        ARRAY_AGG(DISTINCT platform) FILTER (WHERE platform IS NOT NULL) as platforms,
        ARRAY_AGG(DISTINCT app_version) FILTER (WHERE app_version IS NOT NULL) as app_versions
    FROM client_logs
    WHERE user_id = p_user_id
    AND category = 'error'
    AND created_at >= start_date
    GROUP BY COALESCE(payload->>'message', 'Unknown error')
    ORDER BY error_count DESC, latest_occurrence DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get performance metrics summary
CREATE OR REPLACE FUNCTION get_client_performance_summary(
    p_user_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    metric_name TEXT,
    avg_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    count BIGINT,
    unit TEXT
) AS $$
DECLARE
    start_date TIMESTAMP WITH TIME ZONE;
BEGIN
    start_date := COALESCE(p_start_date, CURRENT_TIMESTAMP - INTERVAL '7 days');
    
    RETURN QUERY
    SELECT 
        COALESCE(payload->>'metric', 'unknown') as metric_name,
        ROUND(AVG((payload->>'value')::NUMERIC), 2) as avg_value,
        MIN((payload->>'value')::NUMERIC) as min_value,
        MAX((payload->>'value')::NUMERIC) as max_value,
        COUNT(*) as count,
        COALESCE(payload->>'unit', 'ms') as unit
    FROM client_logs
    WHERE user_id = p_user_id
    AND category = 'performance'
    AND created_at >= start_date
    AND payload->>'value' IS NOT NULL
    AND (payload->>'value')::TEXT ~ '^[0-9]+\.?[0-9]*$'
    GROUP BY COALESCE(payload->>'metric', 'unknown'), COALESCE(payload->>'unit', 'ms')
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old client logs
CREATE OR REPLACE FUNCTION cleanup_old_client_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Remove logs older than 90 days
    DELETE FROM client_logs
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE client_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only access their own logs
CREATE POLICY client_logs_owner_policy ON client_logs
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- Create views for analytics
CREATE OR REPLACE VIEW client_logs_summary AS
SELECT 
    user_id,
    DATE(created_at) as log_date,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE category = 'error') as error_events,
    COUNT(*) FILTER (WHERE category = 'performance') as performance_events,
    COUNT(*) FILTER (WHERE category = 'security') as security_events,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
    COUNT(DISTINCT event_type) as unique_event_types,
    AVG(time_drift_ms) as avg_time_drift,
    COUNT(DISTINCT platform) as platforms_used,
    COUNT(DISTINCT app_version) as app_versions_used
FROM client_logs
GROUP BY user_id, DATE(created_at)
ORDER BY log_date DESC;

CREATE OR REPLACE VIEW client_error_trends AS
SELECT 
    DATE(created_at) as error_date,
    COUNT(*) as total_errors,
    COUNT(DISTINCT user_id) as affected_users,
    payload->>'message' as error_message,
    COUNT(*) as error_count,
    ARRAY_AGG(DISTINCT platform) FILTER (WHERE platform IS NOT NULL) as platforms,
    ARRAY_AGG(DISTINCT app_version) FILTER (WHERE app_version IS NOT NULL) as app_versions
FROM client_logs
WHERE category = 'error'
GROUP BY DATE(created_at), payload->>'message'
ORDER BY error_date DESC, error_count DESC;

-- Add RLS to views
ALTER VIEW client_logs_summary SET (security_barrier = true);
ALTER VIEW client_error_trends SET (security_barrier = true);

-- Trigger function to log high-severity events to main activity system
CREATE OR REPLACE FUNCTION log_critical_client_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Log critical events to activity system
    IF NEW.severity = 'critical' OR NEW.category = 'security' THEN
        -- Log to activity system (will be handled by application layer)
        PERFORM log_user_activity(
            NEW.user_id,
            'Critical client event: ' || NEW.event_type,
            'other',
            jsonb_build_object(
                'client_event_id', NEW.id,
                'event_type', NEW.event_type,
                'category', NEW.category,
                'severity', NEW.severity,
                'payload', NEW.payload,
                'source', 'client_logs'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for critical events
CREATE TRIGGER trigger_log_critical_client_events
    AFTER INSERT ON client_logs
    FOR EACH ROW
    WHEN (NEW.severity = 'critical' OR NEW.category = 'security')
    EXECUTE FUNCTION log_critical_client_events();

-- Function for scheduled cleanup (to be called by cron job)
CREATE OR REPLACE FUNCTION schedule_client_logs_cleanup()
RETURNS INTEGER AS $$
DECLARE
    total_cleaned INTEGER := 0;
BEGIN
    -- Clean up old client logs
    total_cleaned := cleanup_old_client_logs();
    
    RETURN total_cleaned;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE client_logs IS 'Client-side event logging for analytics, errors, and performance tracking';
COMMENT ON COLUMN client_logs.event_type IS 'Type of client event (app_opened, client_error, etc.)';
COMMENT ON COLUMN client_logs.category IS 'Event category (analytics, error, performance, security, business)';
COMMENT ON COLUMN client_logs.severity IS 'Event severity level (low, medium, high, critical)';
COMMENT ON COLUMN client_logs.payload IS 'Event data and context information';
COMMENT ON COLUMN client_logs.client_timestamp IS 'Timestamp when event occurred on client';
COMMENT ON COLUMN client_logs.server_timestamp IS 'Timestamp when event was received by server';
COMMENT ON COLUMN client_logs.time_drift_ms IS 'Difference between server and client timestamps in milliseconds';

COMMENT ON FUNCTION get_client_analytics_summary(UUID, TIMESTAMP WITH TIME ZONE) IS 'Get comprehensive analytics summary for user client events';
COMMENT ON FUNCTION get_client_error_summary(UUID, TIMESTAMP WITH TIME ZONE, INTEGER) IS 'Get summary of client-side errors for debugging';
COMMENT ON FUNCTION get_client_performance_summary(UUID, TIMESTAMP WITH TIME ZONE) IS 'Get performance metrics summary for optimization';

COMMENT ON VIEW client_logs_summary IS 'Daily summary of client events per user for analytics';
COMMENT ON VIEW client_error_trends IS 'Error trends and patterns for monitoring and debugging'; 