# Promotions Management System Setup

## Database Table Creation

First, create the promotions table in your Supabase database:

```sql
-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    background_color VARCHAR(20) DEFAULT '#007bff',
    priority INTEGER DEFAULT 1,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    target_audience VARCHAR(50) DEFAULT 'all',
    locale VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_priority ON promotions(priority);
CREATE INDEX IF NOT EXISTS idx_promotions_locale ON promotions(locale);

-- Create promotion_views table for tracking
CREATE TABLE IF NOT EXISTS promotion_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create promotion_clicks table for tracking
CREATE TABLE IF NOT EXISTS promotion_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for tracking tables
CREATE INDEX IF NOT EXISTS idx_promotion_views_user ON promotion_views(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_views_promotion ON promotion_views(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_clicks_user ON promotion_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_clicks_promotion ON promotion_clicks(promotion_id);
```

## Admin Authentication Setup

1. **Login as Admin:**
```bash
POST /api/v1/admin/auth/login
Content-Type: application/json

{
    "username": "admin",
    "password": "password"
}
```

2. **Get Admin Token:**
```json
{
    "statusCode": 200,
    "message": "Admin login successful",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

## Promotion Management APIs

### 1. Create New Promotion (Admin Only)

```bash
POST /api/v1/promotions
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json

{
    "title": "Black Friday Sale!",
    "description": "Get 50% off on all crypto transactions",
    "image_url": "https://example.com/promo-image.jpg",
    "link_url": "https://7awel.com/black-friday",
    "background_color": "#FF6B35",
    "priority": 5,
    "start_date": "2024-11-29T00:00:00Z",
    "end_date": "2024-11-30T23:59:59Z",
    "target_audience": "all",
    "locale": "en",
    "is_active": true
}
```

**Response:**
```json
{
    "statusCode": 201,
    "message": "Promotion created successfully",
    "data": {
        "success": true,
        "promotion": {
            "id": "12345678-1234-1234-1234-123456789012",
            "title": "Black Friday Sale!",
            "description": "Get 50% off on all crypto transactions",
            "image_url": "https://example.com/promo-image.jpg",
            "link_url": "https://7awel.com/black-friday",
            "background_color": "#FF6B35",
            "priority": 5,
            "start_date": "2024-11-29T00:00:00.000Z",
            "end_date": "2024-11-30T23:59:59.000Z",
            "target_audience": "all",
            "locale": "en",
            "is_active": true,
            "created_at": "2024-01-15T10:30:00.000Z",
            "updated_at": "2024-01-15T10:30:00.000Z"
        }
    }
}
```

### 2. Update Promotion (Admin Only)

```bash
PUT /api/v1/promotions/12345678-1234-1234-1234-123456789012
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json

{
    "title": "Extended Black Friday Sale!",
    "description": "Get 60% off on all crypto transactions - Extended!",
    "end_date": "2024-12-01T23:59:59Z",
    "priority": 10
}
```

### 3. Delete Promotion (Admin Only)

```bash
DELETE /api/v1/promotions/12345678-1234-1234-1234-123456789012
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

### 4. Get All Promotions (Admin Only)

```bash
GET /api/v1/promotions/all?limit=20&offset=0
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

### 5. Get Promotion Analytics (Admin Only)

```bash
GET /api/v1/promotions/analytics?startDate=2024-01-01&endDate=2024-12-31&promotionId=12345678-1234-1234-1234-123456789012
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

## User APIs (No Admin Required)

### 1. Get User Promotions

```bash
GET /api/v1/promotions?locale=en&limit=10&offset=0
Authorization: Bearer USER_SESSION_TOKEN
```

### 2. Record Promotion View

```bash
POST /api/v1/promotions/12345678-1234-1234-1234-123456789012/view
Authorization: Bearer USER_SESSION_TOKEN
```

### 3. Record Promotion Click

```bash
POST /api/v1/promotions/12345678-1234-1234-1234-123456789012/click
Authorization: Bearer USER_SESSION_TOKEN
```

## Validation Rules

### Required Fields for Creating Promotion:
- `title` (string, max 255 characters)
- `description` (text)
- `start_date` (ISO 8601 datetime)
- `end_date` (ISO 8601 datetime, must be after start_date)

### Optional Fields:
- `image_url` (string, max 500 characters)
- `link_url` (string, max 500 characters)
- `background_color` (string, default: '#007bff')
- `priority` (integer, default: 1, higher = shown first)
- `target_audience` (string, default: 'all')
- `locale` (string, default: 'en')
- `is_active` (boolean, default: true)

## Error Codes

- `UNAUTHORIZED` - Admin authentication required
- `MISSING_FIELDS` - Required fields are missing
- `PROMOTION_CREATION_ERROR` - Error creating promotion
- `PROMOTION_UPDATE_ERROR` - Error updating promotion
- `PROMOTION_DELETE_ERROR` - Error deleting promotion
- `MISSING_PARAMETER` - Promotion ID is missing

## Complete API Endpoints Summary

```
Admin Promotion Management:
POST   /api/v1/promotions                    - Create promotion
PUT    /api/v1/promotions/:promotionId       - Update promotion
DELETE /api/v1/promotions/:promotionId       - Delete promotion
GET    /api/v1/promotions/all                - Get all promotions
DELETE /api/v1/promotions/cache              - Clear cache
POST   /api/v1/promotions/cleanup            - Cleanup expired

User Promotion Access:
GET    /api/v1/promotions                    - Get user promotions
POST   /api/v1/promotions/:promotionId/view  - Record view
POST   /api/v1/promotions/:promotionId/click - Record click
```

## Testing

1. **Create Admin Account** (if needed):
```bash
POST /api/v1/admin/auth/create
{
    "username": "admin",
    "password": "password",
    "email": "admin@7awel.com"
}
```

2. **Login as Admin**
3. **Create Sample Promotion**
4. **Test User APIs with regular user session**

All endpoints include proper rate limiting, validation, and error handling. 