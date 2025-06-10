-- Create enum for payment request status
CREATE TYPE payment_request_status_enum AS ENUM ('pending', 'paid', 'declined', 'expired', 'cancelled');

-- Create payment_requests table
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requestor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20,8) NOT NULL,
    asset_symbol VARCHAR(10) NOT NULL,
    status payment_request_status_enum NOT NULL DEFAULT 'pending',
    note TEXT,
    qr_code TEXT, -- Generated QR code data for payment
    expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_requestor ON payment_requests(requestor_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_recipient ON payment_requests(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_expires_at ON payment_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON payment_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_paid_at ON payment_requests(paid_at);
CREATE INDEX IF NOT EXISTS idx_requests_transaction ON payment_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_requests_asset_symbol ON payment_requests(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_requests_amount ON payment_requests(amount);

-- Add check constraints
ALTER TABLE payment_requests ADD CONSTRAINT check_amount_positive
    CHECK (amount > 0);

ALTER TABLE payment_requests ADD CONSTRAINT check_different_users
    CHECK (requestor_id != recipient_id);

ALTER TABLE payment_requests ADD CONSTRAINT check_asset_symbol_format
    CHECK (asset_symbol ~ '^[A-Z0-9]{1,10}$');

ALTER TABLE payment_requests ADD CONSTRAINT check_expires_future
    CHECK (expires_at IS NULL OR expires_at > created_at);

ALTER TABLE payment_requests ADD CONSTRAINT check_paid_at_logic
    CHECK (
        (status = 'paid' AND paid_at IS NOT NULL AND transaction_id IS NOT NULL) OR
        (status != 'paid' AND (paid_at IS NULL OR transaction_id IS NULL))
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payment_requests_updated_at 
    BEFORE UPDATE ON payment_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_payment_requests_updated_at();


-- Function to expire old payment requests
CREATE OR REPLACE FUNCTION expire_old_payment_requests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    UPDATE payment_requests 
    SET 
        status = 'expired',
        updated_at = CURRENT_TIMESTAMP
    WHERE 
        status = 'pending'
        AND expires_at IS NOT NULL 
        AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get payment request statistics
CREATE OR REPLACE FUNCTION get_payment_request_stats(
    p_user_id UUID,
    p_period_days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
    stats JSON;
    period_start TIMESTAMP WITH TIME ZONE;
BEGIN
    period_start := CURRENT_TIMESTAMP - (p_period_days || ' days')::INTERVAL;
    
    SELECT json_build_object(
        'total_sent', COALESCE(sent.count, 0),
        'total_received', COALESCE(received.count, 0),
        'total_amount_sent', COALESCE(sent.total_amount, 0),
        'total_amount_received', COALESCE(received.total_amount, 0),
        'pending_sent', COALESCE(pending_sent.count, 0),
        'pending_received', COALESCE(pending_received.count, 0),
        'paid_requests', COALESCE(paid.count, 0),
        'period_days', p_period_days
    ) INTO stats
    FROM (SELECT 1) as dummy
    LEFT JOIN (
        SELECT COUNT(*) as count, SUM(amount) as total_amount
        FROM payment_requests 
        WHERE requestor_id = p_user_id 
        AND created_at >= period_start
    ) sent ON TRUE
    LEFT JOIN (
        SELECT COUNT(*) as count, SUM(amount) as total_amount
        FROM payment_requests 
        WHERE recipient_id = p_user_id 
        AND created_at >= period_start
    ) received ON TRUE
    LEFT JOIN (
        SELECT COUNT(*) as count
        FROM payment_requests 
        WHERE requestor_id = p_user_id 
        AND status = 'pending'
        AND created_at >= period_start
    ) pending_sent ON TRUE
    LEFT JOIN (
        SELECT COUNT(*) as count
        FROM payment_requests 
        WHERE recipient_id = p_user_id 
        AND status = 'pending'
        AND created_at >= period_start
    ) pending_received ON TRUE
    LEFT JOIN (
        SELECT COUNT(*) as count
        FROM payment_requests 
        WHERE (requestor_id = p_user_id OR recipient_id = p_user_id)
        AND status = 'paid'
        AND created_at >= period_start
    ) paid ON TRUE;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel payment request
CREATE OR REPLACE FUNCTION cancel_payment_request(
    p_request_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    current_request RECORD;
BEGIN
    -- Get current request
    SELECT * INTO current_request
    FROM payment_requests 
    WHERE id = p_request_id;
    
    IF current_request IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Only requestor can cancel
    IF current_request.requestor_id != p_user_id THEN
        RAISE EXCEPTION 'Only the requestor can cancel a payment request';
    END IF;
    
    -- Can only cancel pending requests
    IF current_request.status != 'pending' THEN
        RAISE EXCEPTION 'Can only cancel pending payment requests';
    END IF;
    
    -- Update status to cancelled
    UPDATE payment_requests 
    SET 
        status = 'cancelled',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_request_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY payment_requests_owner_policy ON payment_requests
    FOR ALL
    USING (
        requestor_id = current_setting('app.current_user_id')::UUID OR 
        recipient_id = current_setting('app.current_user_id')::UUID
    );

-- Create views for easy access
CREATE OR REPLACE VIEW active_payment_requests AS
SELECT 
    pr.*,
    CONCAT(up_req.first_name, ' ', up_req.last_name) as requestor_name,
    CONCAT(up_rec.first_name, ' ', up_rec.last_name) as recipient_name,
    (pr.expires_at IS NOT NULL AND pr.expires_at < CURRENT_TIMESTAMP) as is_expired
FROM payment_requests pr
LEFT JOIN users u_req ON pr.requestor_id = u_req.id
LEFT JOIN user_profiles up_req ON pr.requestor_id = up_req.user_id
LEFT JOIN users u_rec ON pr.recipient_id = u_rec.id
LEFT JOIN user_profiles up_rec ON pr.recipient_id = up_rec.user_id
WHERE pr.status = 'pending'
AND (pr.expires_at IS NULL OR pr.expires_at > CURRENT_TIMESTAMP)
ORDER BY pr.created_at DESC;

CREATE OR REPLACE VIEW payment_request_summary AS
SELECT 
    DATE(pr.created_at) as request_date,
    pr.asset_symbol,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN pr.status = 'pending' THEN 1 END) as pending_requests,
    COUNT(CASE WHEN pr.status = 'paid' THEN 1 END) as paid_requests,
    COUNT(CASE WHEN pr.status = 'declined' THEN 1 END) as declined_requests,
    COUNT(CASE WHEN pr.status = 'expired' THEN 1 END) as expired_requests,
    COUNT(CASE WHEN pr.status = 'cancelled' THEN 1 END) as cancelled_requests,
    SUM(pr.amount) as total_amount,
    SUM(CASE WHEN pr.status = 'paid' THEN pr.amount ELSE 0 END) as paid_amount
FROM payment_requests pr
GROUP BY DATE(pr.created_at), pr.asset_symbol
ORDER BY request_date DESC, pr.asset_symbol;
