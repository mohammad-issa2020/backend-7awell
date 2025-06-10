# 7awel Crypto Wallet API Documentation

## Promotion Service API (`/api/v1/promotions`)

The Promotion Service provides targeted marketing promotions with analytics and caching capabilities.

### User Endpoints

#### Get Promotions
```http
GET /api/v1/promotions?locale={locale}&limit={limit}&offset={offset}
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `locale` (optional): Language locale (default: 'en')
- `limit` (optional): Number of promotions (1-50, default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "statusCode": 200,
  "message": "Promotions retrieved successfully",
  "data": {
    "promotions": [
      {
        "promotion_id": "uuid",
        "title": "Special Offer!",
        "description": "Get 50% off...",
        "image_url": "https://...",
        "link_url": "https://...",
        "background_color": "#FF5733",
        "priority": 100,
        "start_date": "2024-01-01T00:00:00Z",
        "end_date": "2024-12-31T23:59:59Z",
        "is_viewed": false,
        "is_clicked": false
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "hasMore": true
    },
    "locale": "en",
    "cached": false,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

#### Record Promotion View
```http
POST /api/v1/promotions/{promotionId}/view
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "platform": "mobile",
  "appVersion": "1.0.0",
  "deviceInfo": {},
  "referrer": "home_screen"
}
```

#### Record Promotion Click
```http
POST /api/v1/promotions/{promotionId}/click
Authorization: Bearer {accessToken}
```

### Admin Endpoints


#### Get All Promotions
```http
GET /api/v1/promotions/all?limit={limit}&offset={offset}
Authorization: Bearer {accessToken}
```

#### Clear Cache
```http
DELETE /api/v1/promotions/cache?userId={userId}
Authorization: Bearer {accessToken}
```

#### Cleanup Expired
```http
POST /api/v1/promotions/cleanup
Authorization: Bearer {accessToken}
```

---

## Transaction Service API (`/api/v1/transactions`)

The Transaction Service provides comprehensive crypto wallet transaction tracking with cursor-based pagination, advanced filtering, and real-time status updates.

### Key Features

- **Cursor-based Pagination**: Efficient handling of large transaction datasets
- **Advanced Filtering**: Filter by type, status, asset, network, date range
- **Full-text Search**: Search transaction descriptions and notes
- **Real-time Status**: Track transaction confirmations and status changes
- **Comprehensive Analytics**: Transaction statistics and trends
- **Multi-asset Support**: Bitcoin, Ethereum, tokens, NFTs, and more
- **Network Support**: Multiple blockchain networks

### Transaction Types

- `send` - Outgoing transactions
- `receive` - Incoming transactions
- `buy` - Asset purchases
- `sell` - Asset sales
- `swap` - Asset exchanges
- `stake` - Staking deposits
- `unstake` - Staking withdrawals
- `reward` - Staking/mining rewards
- `fee` - Network fees
- `deposit` - Exchange deposits
- `withdrawal` - Exchange withdrawals

### Transaction Status

- `pending` - Transaction initiated but not confirmed
- `confirmed` - Transaction confirmed on blockchain
- `failed` - Transaction failed
- `cancelled` - Transaction cancelled
- `expired` - Transaction expired

### Endpoints

#### List Transactions
```http
GET /api/v1/transactions?cursor={cursor}&limit={limit}&type={type}&status={status}&assetSymbol={symbol}&network={network}&startDate={date}&endDate={date}&search={query}
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `cursor` (optional): Pagination cursor from previous response
- `limit` (optional): Number of transactions (1-100, default: 20)
- `type` (optional): Filter by transaction type
- `status` (optional): Filter by transaction status
- `assetSymbol` (optional): Filter by asset (BTC, ETH, USDT, etc.)
- `network` (optional): Filter by network (ethereum, bitcoin, polygon, etc.)
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)
- `search` (optional): Search in descriptions and notes

**Response:**
```json
{
  "statusCode": 200,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "internal_id": "txn_1640995200_a1b2c3d4",
        "type": "send",
        "status": "confirmed",
        "amount": "0.5",
        "asset_symbol": "ETH",
        "asset_name": "Ethereum",
        "asset_type": "cryptocurrency",
        "usd_amount": "2150.00",
        "from_address": "0x123...",
        "to_address": "0x456...",
        "network": "ethereum",
        "transaction_hash": "0xabc123...",
        "confirmations": 15,
        "required_confirmations": 12,
        "gas_fee": "0.002",
        "gas_fee_usd": "8.60",
        "description": "Payment to John",
        "notes": "Monthly rent payment",
        "tags": ["rent", "monthly"],
        "initiated_at": "2024-01-01T10:00:00Z",
        "confirmed_at": "2024-01-01T10:05:00Z",
        "completed_at": "2024-01-01T10:05:00Z",
        "created_at": "2024-01-01T10:00:00Z",
        "metadata": {}
      }
    ],
    "pagination": {
      "limit": 20,
      "cursor": null,
      "nextCursor": "txn_1640995100_b2c3d4e5",
      "hasMore": true
    },
    "filters": {
      "type": null,
      "status": null,
      "assetSymbol": null,
      "network": null,
      "startDate": null,
      "endDate": null,
      "search": null
    },
    "totalCount": 1,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

#### Get Transaction by ID
```http
GET /api/v1/transactions/{id}
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Transaction retrieved successfully",
  "data": {
    "id": "uuid",
    "internal_id": "txn_1640995200_a1b2c3d4",
    "type": "send",
    "status": "confirmed",
    "amount": "0.5",
    "asset_symbol": "ETH",
    "asset_name": "Ethereum",
    "asset_type": "cryptocurrency",
    "asset_contract_address": null,
    "asset_decimals": 18,
    "usd_amount": "2150.00",
    "exchange_rate": "4300.00",
    "from_address": "0x123...",
    "to_address": "0x456...",
    "from_user_id": null,
    "to_user_id": null,
    "network": "ethereum",
    "transaction_hash": "0xabc123...",
    "gas_fee": "0.002",
    "gas_fee_usd": "8.60",
    "network_fee": "0.002",
    "network_fee_usd": "8.60",
    "platform_fee": "0.001",
    "platform_fee_usd": "4.30",
    "description": "Payment to John",
    "notes": "Monthly rent payment",
    "tags": ["rent", "monthly"],
    "block_number": 18500000,
    "block_hash": "0xdef456...",
    "transaction_index": 45,
    "gas_used": 21000,
    "gas_price": "95.23",
    "nonce": 125,
    "confirmations": 15,
    "required_confirmations": 12,
    "confirmed_at": "2024-01-01T10:05:00Z",
    "initiated_at": "2024-01-01T10:00:00Z",
    "broadcast_at": "2024-01-01T10:00:30Z",
    "completed_at": "2024-01-01T10:05:00Z",
    "failed_at": null,
    "metadata": {},
    "external_reference": null,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:05:00Z",
    "totalFeesUsd": 12.90,
    "isConfirmed": true,
    "isPending": false,
    "hasSufficientConfirmations": true,
    "timeSinceInitiated": {
      "value": "2 hours ago",
      "ms": 7200000
    },
    "timeToConfirmation": {
      "value": "5 minutes ago",
      "ms": 300000
    }
  }
}
```

#### Get Transaction Statistics
```http
GET /api/v1/transactions/stats?days={days}
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `days` (optional): Number of days to analyze (1-365, default: 30)

**Response:**
```json
{
  "statusCode": 200,
  "message": "Transaction statistics retrieved successfully",
  "data": {
    "total_transactions": 150,
    "total_sent": "12500.50",
    "total_received": "8750.25",
    "total_fees": "125.75",
    "transactions_by_type": {
      "send": 75,
      "receive": 45,
      "buy": 20,
      "sell": 10
    },
    "transactions_by_status": {
      "confirmed": 140,
      "pending": 8,
      "failed": 2
    },
    "transactions_by_asset": {
      "ETH": 85,
      "BTC": 35,
      "USDT": 30
    },
    "avg_transaction_amount": "142.34",
    "pending_transactions": 8,
    "failed_transactions": 2,
    "period": {
      "days": 30,
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    }
  }
}
```

#### Get Transaction Options
```http
GET /api/v1/transactions/options
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Transaction options retrieved successfully",
  "data": {
    "types": {
      "SEND": "send",
      "RECEIVE": "receive",
      "BUY": "buy",
      "SELL": "sell",
      "SWAP": "swap",
      "STAKE": "stake",
      "UNSTAKE": "unstake",
      "REWARD": "reward",
      "FEE": "fee",
      "DEPOSIT": "deposit",
      "WITHDRAWAL": "withdrawal"
    },
    "statuses": {
      "PENDING": "pending",
      "CONFIRMED": "confirmed",
      "FAILED": "failed",
      "CANCELLED": "cancelled",
      "EXPIRED": "expired"
    },
    "assetTypes": {
      "CRYPTOCURRENCY": "cryptocurrency",
      "TOKEN": "token",
      "NFT": "nft",
      "FIAT": "fiat"
    },
    "supportedNetworks": [
      "ethereum",
      "bitcoin",
      "polygon",
      "binance-smart-chain",
      "avalanche",
      "solana",
      "cardano",
      "polkadot"
    ],
    "maxLimit": 100,
    "defaultLimit": 20
  }
}
```

#### Create Transaction (Internal/Testing)
```http
POST /api/v1/transactions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "type": "send",
  "amount": "0.5",
  "assetSymbol": "ETH",
  "assetName": "Ethereum",
  "network": "ethereum",
  "fromAddress": "0x123...",
  "toAddress": "0x456...",
  "description": "Payment to John",
  "metadata": {
    "purpose": "rent_payment"
  }
}
```

#### Update Transaction Status (Internal)
```http
PATCH /api/v1/transactions/{id}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "confirmed",
  "confirmations": 15,
  "transactionHash": "0xabc123...",
  "blockNumber": 18500000
}
```

### Cursor-based Pagination

The transaction API uses cursor-based pagination for efficient handling of large datasets:

1. **First Request**: Call without cursor parameter
2. **Subsequent Requests**: Use `nextCursor` from previous response
3. **End of Data**: `hasMore` will be false and `nextCursor` will be null

**Example:**
```javascript
// First page
GET /api/v1/transactions?limit=20

// Next page
GET /api/v1/transactions?limit=20&cursor=txn_1640995100_b2c3d4e5

// Continue until hasMore = false
```

### Database Schema

The transaction service uses a comprehensive database schema with:

- **High Precision**: Support for crypto amounts with 36 decimal places
- **Multi-network**: Support for multiple blockchain networks
- **Comprehensive Indexing**: Optimized for fast queries and pagination
- **Full-text Search**: GIN indexes for description/notes search
- **Activity Integration**: Automatic logging to activity system
- **Row-level Security**: Users can only access their own transactions

---

## Client Logging Service API (`/api/v1/logs`)

The Client Logging Service captures client-side events that cannot be automatically tracked on the server, complementing the existing server-side activity logging system.

### Key Features

- **Complementary to Activity Logging**: Focuses on client-side events only
- **Event Categories**: Analytics, Error, Performance, Security, Business
- **Batch Processing**: Support for bulk event submission
- **Time Drift Tracking**: Monitors client-server time synchronization
- **Automatic Integration**: Critical events are forwarded to main activity system

### Event Types

#### Analytics Events
- `app_opened` - App startup
- `app_backgrounded` - App moved to background
- `app_foregrounded` - App returned to foreground
- `screen_view` - Screen/page navigation
- `button_click` - UI interactions
- `form_interaction` - Form usage

#### Performance Events
- `app_startup_time` - App initialization time
- `api_response_time` - API call performance
- `screen_load_time` - UI rendering time

#### Error Events
- `client_error` - JavaScript/app errors
- `network_error` - Connectivity issues
- `validation_error` - Input validation failures

#### Security Events
- `app_tampering_detected` - Security compromise
- `root_jailbreak_detected` - Device security issues
- `debugger_detected` - Development tool detection

#### Business Events
- `feature_used` - Feature adoption tracking
- `tutorial_step` - Onboarding progress
- `onboarding_step` - User journey tracking

### Endpoints

#### Log Single Event
```http
POST /api/v1/logs
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "eventType": "screen_view",
  "payload": {
    "screen": "wallet_dashboard",
    "loadTime": 245,
    "fromScreen": "login"
  },
  "timestamp": 1640995200000,
  "category": "analytics",
  "severity": "low"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Event logged successfully",
  "data": {
    "success": true,
    "logId": "uuid",
    "serverTimestamp": 1640995201000,
    "timeDrift": 1000
  }
}
```

#### Log Batch Events
```http
POST /api/v1/logs/batch
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "events": [
    {
      "eventType": "button_click",
      "payload": {
        "button": "send_crypto",
        "screen": "wallet"
      },
      "timestamp": 1640995200000
    },
    {
      "eventType": "screen_view",
      "payload": {
        "screen": "send_confirmation"
      },
      "timestamp": 1640995201000
    }
  ]
}
```

#### Log Performance Metric
```http
POST /api/v1/logs/performance
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "metric": "api_response_time",
  "value": 1250,
  "unit": "ms",
  "context": {
    "endpoint": "/api/v1/auth/me",
    "method": "GET"
  }
}
```

#### Log Client Error
```http
POST /api/v1/logs/error
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "error": {
    "message": "Cannot read property 'balance' of undefined",
    "stack": "TypeError: Cannot read property...",
    "name": "TypeError"
  },
  "context": {
    "screen": "wallet_dashboard",
    "userAction": "viewing_balance",
    "url": "/dashboard"
  }
}
```

#### Get User Logs
```http
GET /api/v1/logs?eventType={type}&category={cat}&severity={sev}&limit={num}&offset={num}
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `eventType` (optional): Filter by event type
- `category` (optional): Filter by category (analytics, error, performance, security, business)
- `severity` (optional): Filter by severity (low, medium, high, critical)
- `limit` (optional): Number of logs (1-100, default: 50)
- `offset` (optional): Pagination offset
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

#### Get Analytics Summary
```http
GET /api/v1/logs/analytics?days={num}
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Analytics retrieved successfully",
  "data": {
    "total_events": 1250,
    "events_by_category": {
      "analytics": 800,
      "performance": 300,
      "error": 100,
      "security": 50
    },
    "error_rate": 8.0,
    "avg_time_drift_ms": 125.5,
    "most_active_day": "2024-01-15",
    "platforms": {
      "ios": 600,
      "android": 400,
      "web": 250
    }
  }
}
```

#### Get Available Types
```http
GET /api/v1/logs/types
Authorization: Bearer {accessToken}
```

### Rate Limits

- **Regular Logging**: 120 events/minute (2 per second)
- **Batch Logging**: 10 batches/minute (max 50 events per batch)
- **Reading Logs**: 60 requests/minute

### Integration with Activity System

Critical events (`severity: 'critical'` or `category: 'security'`) are automatically forwarded to the main activity logging system for unified monitoring and alerting.

### Database Schema

The client logging uses a dedicated `client_logs` table with:
- Comprehensive indexing for performance
- JSONB payload for flexible event data
- Time drift tracking for synchronization monitoring
- Row-level security for user data isolation
- Automated cleanup of old logs (90 days retention)

### Best Practices

1. **Event Timing**: Send events in batches when possible to reduce API calls
2. **Error Context**: Include relevant context with error events for debugging
3. **Performance Metrics**: Track meaningful performance indicators
4. **Security Events**: Immediately report security-related events
5. **Time Synchronization**: Ensure client clocks are reasonably accurate

---

## Rate Limiting

All API endpoints use Redis-based rate limiting with different limits based on endpoint sensitivity:

- **Authentication**: 10 attempts/15 minutes
- **OTP**: 3 requests/5 minutes  
- **Promotions**: 60 requests/minute
- **Transactions Reading**: 100 requests/minute
- **Transactions Writing**: 30 requests/minute
- **Client Logging**: 120 events/minute
- **Activity Reading**: 100 requests/15 minutes

## Error Handling

All APIs return consistent error responses:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "traceId": "uuid"
}
```

## Authentication

All endpoints require valid Stytch session tokens in the Authorization header:

```
Authorization: Bearer {stytch_session_token}
``` 