-- Migration: 014_optimize_contact_batch_operations.sql
-- Description: Create optimized database functions for batch contact sync operations
-- Date: 2025-06-18

-- Create custom types for batch operations
CREATE TYPE contact_batch_item AS (
    owner_id UUID,
    phone_hash VARCHAR(255),
    is_favorite BOOLEAN,
    linked_user_id UUID
);

CREATE TYPE contact_sync_result AS (
    total_processed INTEGER,
    contacts_inserted INTEGER,
    contacts_updated INTEGER,
    matched_contacts INTEGER,
    processing_time_ms INTEGER,
    batch_size INTEGER
);

-- Optimized bulk contact insert function using JSONB
CREATE OR REPLACE FUNCTION bulk_insert_contacts(
    p_contacts JSONB,
    p_batch_size INTEGER DEFAULT 500
)
RETURNS contact_sync_result
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_result contact_sync_result;
    v_inserted_count INTEGER := 0;
    v_updated_count INTEGER := 0;
    v_total_count INTEGER;
    v_batch_count INTEGER := 0;
    v_batch JSONB;
    v_offset INTEGER := 0;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Get total count
    v_total_count := jsonb_array_length(p_contacts);
    
    -- Process in batches to avoid memory issues and improve performance
    WHILE v_offset < v_total_count LOOP
        -- Extract batch
        SELECT jsonb_agg(value) INTO v_batch
        FROM (
            SELECT value 
            FROM jsonb_array_elements(p_contacts) WITH ORDINALITY AS t(value, idx)
            WHERE idx > v_offset AND idx <= v_offset + p_batch_size
        ) AS batch_data;
        
        -- Insert batch with conflict resolution
        WITH inserted_data AS (
            INSERT INTO contacts_with_accounts (owner_id, phone_hash, is_favorite, linked_user_id)
            SELECT 
                (value->>'owner_id')::UUID,
                value->>'phone_hash',
                COALESCE((value->>'is_favorite')::BOOLEAN, false),
                CASE WHEN value->>'linked_user_id' = 'null' OR value->>'linked_user_id' IS NULL 
                     THEN NULL 
                     ELSE (value->>'linked_user_id')::UUID END
            FROM jsonb_array_elements(v_batch)
            ON CONFLICT (owner_id, phone_hash) 
            DO UPDATE SET
                is_favorite = EXCLUDED.is_favorite,
                linked_user_id = EXCLUDED.linked_user_id,
                updated_at = CURRENT_TIMESTAMP
            RETURNING 
                CASE WHEN xmax = 0 THEN 1 ELSE 0 END as is_insert,
                CASE WHEN xmax > 0 THEN 1 ELSE 0 END as is_update
        )
        SELECT 
            COALESCE(SUM(is_insert), 0),
            COALESCE(SUM(is_update), 0)
        INTO v_inserted_count, v_updated_count
        FROM inserted_data;
        
        v_batch_count := v_batch_count + jsonb_array_length(v_batch);
        v_offset := v_offset + p_batch_size;
    END LOOP;
    
    v_end_time := clock_timestamp();
    
    -- Build result
    v_result.total_processed := v_total_count;
    v_result.contacts_inserted := v_inserted_count;
    v_result.contacts_updated := v_updated_count;
    v_result.matched_contacts := v_inserted_count + v_updated_count;
    v_result.processing_time_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
    v_result.batch_size := p_batch_size;
    
    RETURN v_result;
END;
$$;

-- Enhanced contact sync function with phone matching
CREATE OR REPLACE FUNCTION sync_user_contacts(
    p_owner_id UUID,
    p_phone_hashes TEXT[],
    p_device_contacts_count INTEGER DEFAULT 0,
    p_batch_size INTEGER DEFAULT 500
)
RETURNS contact_sync_result
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_result contact_sync_result;
    v_contacts_json JSONB;
    v_phone_hash TEXT;
    v_linked_user_id UUID;
    v_contact_data JSONB[];
    v_matched_users INTEGER := 0;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Convert phone hashes to contacts array with user matching
    v_contact_data := ARRAY[]::JSONB[];
    
    FOREACH v_phone_hash IN ARRAY p_phone_hashes LOOP
        -- Check if phone hash is linked to a user
        SELECT linked_user_id INTO v_linked_user_id
        FROM phones 
        WHERE phone_hash = v_phone_hash;
        
        IF v_linked_user_id IS NOT NULL THEN
            v_matched_users := v_matched_users + 1;
        END IF;
        
        -- Add to contacts array
        v_contact_data := v_contact_data || jsonb_build_object(
            'owner_id', p_owner_id,
            'phone_hash', v_phone_hash,
            'is_favorite', false,
            'linked_user_id', v_linked_user_id
        );
    END LOOP;
    
    -- Convert array to JSONB
    v_contacts_json := array_to_json(v_contact_data)::JSONB;
    
    -- Use bulk insert function
    SELECT * INTO v_result 
    FROM bulk_insert_contacts(v_contacts_json, p_batch_size);
    
    -- Update matched contacts count
    v_result.matched_contacts := v_matched_users;
    
    -- Update sync status
    PERFORM update_contact_sync_status(
        p_owner_id,
        p_device_contacts_count,
        v_result.total_processed,
        'completed'
    );
    
    v_end_time := clock_timestamp();
    v_result.processing_time_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
    
    RETURN v_result;
END;
$$;

-- Function to get optimal batch size based on data
CREATE OR REPLACE FUNCTION get_optimal_batch_size(
    p_estimated_contact_count INTEGER,
    p_avg_contact_size_kb DECIMAL DEFAULT 0.5
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_optimal_size INTEGER;
    v_max_batch_size INTEGER := 1000;
    v_min_batch_size INTEGER := 100;
    v_target_size_kb DECIMAL := 250; -- 250KB target batch size
BEGIN
    -- Calculate optimal batch size based on target size
    v_optimal_size := (v_target_size_kb / p_avg_contact_size_kb)::INTEGER;
    
    -- Ensure within bounds
    v_optimal_size := GREATEST(v_min_batch_size, LEAST(v_max_batch_size, v_optimal_size));
    
    -- For very large datasets, use smaller batches
    IF p_estimated_contact_count > 10000 THEN
        v_optimal_size := LEAST(v_optimal_size, 500);
    END IF;
    
    RETURN v_optimal_size;
END;
$$;

-- Function to estimate contact sync performance
CREATE OR REPLACE FUNCTION estimate_sync_performance(
    p_contact_count INTEGER,
    p_batch_size INTEGER DEFAULT NULL
)
RETURNS TABLE(
    estimated_batch_size INTEGER,
    estimated_batches INTEGER,
    estimated_time_seconds INTEGER,
    estimated_memory_mb DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_batch_size INTEGER;
    v_contacts_per_second INTEGER := 1000; -- Conservative estimate
    v_kb_per_contact DECIMAL := 0.5;
BEGIN
    -- Use provided batch size or calculate optimal
    v_batch_size := COALESCE(p_batch_size, get_optimal_batch_size(p_contact_count));
    
    RETURN QUERY SELECT 
        v_batch_size,
        CEIL(p_contact_count::DECIMAL / v_batch_size)::INTEGER,
        CEIL(p_contact_count::DECIMAL / v_contacts_per_second)::INTEGER,
        (p_contact_count * v_kb_per_contact / 1024)::DECIMAL;
END;
$$;

-- Create view for contact sync statistics
CREATE OR REPLACE VIEW contact_sync_stats AS
SELECT 
    DATE(created_at) as sync_date,
    COUNT(*) as total_syncs,
    AVG(device_contacts_count) as avg_device_contacts,
    AVG(synced_contacts_count) as avg_synced_contacts,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_syncs,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_syncs,
    ROUND(AVG(synced_contacts_count::DECIMAL / NULLIF(device_contacts_count, 0) * 100), 2) as avg_sync_rate
FROM contact_sync_status
GROUP BY DATE(created_at)
ORDER BY sync_date DESC;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_owner_created_at ON contacts_with_accounts(owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_hash_linked_user ON contacts_with_accounts(phone_hash, linked_user_id);
CREATE INDEX IF NOT EXISTS idx_phones_hash_user ON phones(phone_hash, linked_user_id);

-- Add comments
COMMENT ON FUNCTION bulk_insert_contacts IS 'Optimized bulk insert for contacts using JSONB and batching';
COMMENT ON FUNCTION sync_user_contacts IS 'Complete contact sync with user matching and status updates';
COMMENT ON FUNCTION get_optimal_batch_size IS 'Calculate optimal batch size based on contact count and size';
COMMENT ON FUNCTION estimate_sync_performance IS 'Estimate performance metrics for contact sync operations';
COMMENT ON VIEW contact_sync_stats IS 'Daily statistics for contact sync operations'; 