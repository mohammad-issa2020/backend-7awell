# Contact Sync API Examples

This document provides comprehensive examples for all contact synchronization API endpoints.

## Authentication

All contact sync endpoints require authentication. Include the session token in the Authorization header:

```
Authorization: Bearer YOUR_SESSION_TOKEN
```

---

## 1. Sync User Contacts

Synchronize user's device contacts with the platform to find contacts who have 7awel accounts.

**Endpoint:** `POST /api/v1/contacts/sync`

### Request Example

```bash
curl -X POST "https://api.7awel.com/api/v1/contacts/sync" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": [
      "+1234567890",
      "+9876543210",
      "+1122334455",
      "+5555666777"
    ],
    "deviceContactsCount": 150
  }'
```

### Request Body

```json
{
  "phoneNumbers": [
    "+1234567890",
    "+9876543210", 
    "+1122334455",
    "+5555666777"
  ],
  "deviceContactsCount": 150
}
```

### Response Example

```json
{
  "statusCode": 200,
  "message": "Contacts synced successfully",
  "data": {
    "success": true,
    "total_processed": 4,
    "matched_contacts": 2,
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## 2. Get User Contacts

Retrieve user's synchronized contacts with pagination support.

**Endpoint:** `GET /api/v1/contacts`

### Request Examples

**Get all contacts:**
```bash
curl -X GET "https://api.7awel.com/api/v1/contacts" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Get only favorites:**
```bash
curl -X GET "https://api.7awel.com/api/v1/contacts?favorites=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**With pagination:**
```bash
curl -X GET "https://api.7awel.com/api/v1/contacts?limit=20&offset=40" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Query Parameters

- `favorites` (optional): `true` or `false` - Filter for favorite contacts only
- `limit` (optional): Number of contacts to return (max: 100, default: 50)
- `offset` (optional): Number of contacts to skip (default: 0)

### Response Example

```json
{
  "statusCode": 200,
  "message": "Contacts retrieved successfully",
  "data": {
    "contacts": [
      {
        "contact_id": "uuid-contact-1",
        "phone_hash": "abc123hash",
        "linked_user_id": "uuid-user-1",
        "linked_user_phone": "+1234567890",
        "linked_user_email": "john@example.com",
        "linked_user_first_name": "John",
        "linked_user_last_name": "Doe",
        "linked_user_avatar": "https://avatar.url/john.jpg",
        "is_favorite": true,
        "last_interaction": "2024-01-15T09:45:00.000Z",
        "contact_created_at": "2024-01-10T08:30:00.000Z"
      },
      {
        "contact_id": "uuid-contact-2",
        "phone_hash": "def456hash",
        "linked_user_id": "uuid-user-2",
        "linked_user_phone": "+9876543210",
        "linked_user_email": "jane@example.com",
        "linked_user_first_name": "Jane",
        "linked_user_last_name": "Smith",
        "linked_user_avatar": null,
        "is_favorite": false,
        "last_interaction": null,
        "contact_created_at": "2024-01-12T14:20:00.000Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## 3. Get Favorite Contacts

Retrieve all contacts marked as favorites.

**Endpoint:** `GET /api/v1/contacts/favorites`

### Request Example

```bash
curl -X GET "https://api.7awel.com/api/v1/contacts/favorites" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Response Example

```json
{
  "statusCode": 200,
  "message": "Favorite contacts retrieved successfully",
  "data": {
    "contacts": [
      {
        "id": "uuid-contact-1",
        "owner_id": "uuid-owner",
        "phone_hash": "abc123hash",
        "linked_user_id": "uuid-user-1",
        "phone": "+1234567890",
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "avatar": "https://avatar.url/john.jpg",
        "last_interaction": "2024-01-15T09:45:00.000Z",
        "created_at": "2024-01-10T08:30:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## 4. Search Contacts

Search through user's contacts by name, email, or phone number.

**Endpoint:** `GET /api/v1/contacts/search`

### Request Examples

**Basic search:**
```bash
curl -X GET "https://api.7awel.com/api/v1/contacts/search?q=john" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Search with pagination:**
```bash
curl -X GET "https://api.7awel.com/api/v1/contacts/search?q=smith&limit=10&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Query Parameters

- `q` (required): Search term (minimum 2 characters)
- `limit` (optional): Number of results to return (max: 50, default: 20)
- `offset` (optional): Number of results to skip (default: 0)

### Response Example

```json
{
  "statusCode": 200,
  "message": "Search completed successfully",
  "data": {
    "contacts": [
      {
        "id": "uuid-contact-1",
        "phone_hash": "abc123hash",
        "linked_user_id": "uuid-user-1",
        "is_favorite": true,
        "last_interaction": "2024-01-15T09:45:00.000Z",
        "created_at": "2024-01-10T08:30:00.000Z",
        "users": {
          "phone_number": "+1234567890",
          "email": "john@example.com",
          "user_profiles": {
            "first_name": "John",
            "last_name": "Doe",
            "avatar_url": "https://avatar.url/john.jpg"
          }
        }
      }
    ],
    "searchTerm": "john",
    "pagination": {
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## 5. Get Contact Sync Status

Check the synchronization status for the current user.

**Endpoint:** `GET /api/v1/contacts/sync/status`

### Request Example

```bash
curl -X GET "https://api.7awel.com/api/v1/contacts/sync/status" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Response Example (With Sync History)

```json
{
  "statusCode": 200,
  "message": "Sync status retrieved successfully",
  "data": {
    "user_id": "uuid-user",
    "last_sync": "2024-01-15T10:30:00.000Z",
    "device_contacts_count": 150,
    "synced_contacts_count": 25,
    "status": "completed",
    "error_message": null,
    "sync_percentage": 16.67
  },
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

### Response Example (No Sync History)

```json
{
  "statusCode": 200,
  "message": "No sync history found",
  "data": {
    "user_id": "uuid-user",
    "status": "pending",
    "last_sync": null,
    "device_contacts_count": 0,
    "synced_contacts_count": 0,
    "sync_percentage": 0,
    "error_message": null
  },
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## 6. Get Contact Statistics

Get comprehensive statistics about user's contacts.

**Endpoint:** `GET /api/v1/contacts/stats`

### Request Example

```bash
curl -X GET "https://api.7awel.com/api/v1/contacts/stats" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Response Example

```json
{
  "statusCode": 200,
  "message": "Contact statistics retrieved successfully",
  "data": {
    "total_device_contacts": 150,
    "total_synced_contacts": 25,
    "total_favorites": 5,
    "sync_percentage": 16.67,
    "last_sync": "2024-01-15T10:30:00.000Z",
    "sync_status": "completed"
  },
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## 7. Toggle Contact Favorite

Toggle the favorite status of a specific contact.

**Endpoint:** `POST /api/v1/contacts/:contactId/favorite/toggle`

### Request Example

```bash
curl -X POST "https://api.7awel.com/api/v1/contacts/uuid-contact-1/favorite/toggle" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Response Example (Success)

```json
{
  "statusCode": 200,
  "message": "Favorite status updated successfully",
  "data": {
    "success": true,
    "message": "Favorite status toggled successfully"
  },
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

### Response Example (Contact Not Found)

```json
{
  "statusCode": 404,
  "message": "Contact not found",
  "error": "Contact not found or does not belong to user",
  "errorCode": "CONTACT_NOT_FOUND",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## 8. Update Contact Interaction

Update the last interaction timestamp for a contact.

**Endpoint:** `POST /api/v1/contacts/interaction`

### Request Example

```bash
curl -X POST "https://api.7awel.com/api/v1/contacts/interaction" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890"
  }'
```

### Request Body

```json
{
  "phoneNumber": "+1234567890"
}
```

### Response Example (Success)

```json
{
  "statusCode": 200,
  "message": "Interaction updated successfully",
  "data": {
    "success": true,
    "message": "Interaction updated successfully"
  },
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

### Response Example (Contact Not Found)

```json
{
  "statusCode": 200,
  "message": "Contact not found",
  "data": {
    "success": false,
    "message": "Contact not found"
  },
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## 9. Create Phone Mapping

Create a phone number mapping for the current user (used for contact discovery).

**Endpoint:** `POST /api/v1/contacts/phone-mapping`

### Request Example

```bash
curl -X POST "https://api.7awel.com/api/v1/contacts/phone-mapping" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890"
  }'
```

### Request Body

```json
{
  "phoneNumber": "+1234567890"
}
```

### Response Example

```json
{
  "statusCode": 200,
  "message": "Phone mapping created successfully",
  "data": {
    "success": true,
    "phoneHash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
    "message": "Phone mapping created successfully"
  },
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## Error Responses

All endpoints follow the same error response format:

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Invalid request",
  "error": "phoneNumbers must be an array",
  "errorCode": "INVALID_PHONE_NUMBERS",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Session token is required",
  "errorCode": "MISSING_TOKEN",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Failed to sync contacts",
  "error": "Database connection failed",
  "errorCode": "CONTACT_SYNC_FAILED",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## Rate Limiting

Contact sync endpoints have the following rate limits:

- **Sync Contacts**: 3 requests per 5 minutes per user
- **Search**: 10 requests per minute per user
- **Other endpoints**: 100 requests per 15 minutes per user

When rate limit is exceeded:

```json
{
  "statusCode": 429,
  "message": "Too many requests, please try again later",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "traceId": "abc123-def456-ghi789"
}
```

---

## Privacy and Security

### Phone Number Hashing

All phone numbers are stored as SHA-256 hashes for privacy:
- Original phone number: `+1234567890`
- Normalized: `1234567890` (digits only)
- Hash: `a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3`

### Data Protection

- Phone numbers are never stored in plain text
- Only users who mutually have each other's contacts can see the connection
- All API calls require valid authentication
- Contact data is automatically cleaned up after 90 days of inactivity

### Best Practices

1. **Batch Sync**: Send all contacts in one sync request rather than individual calls
2. **Limit Data**: Only send phone numbers that users have given permission to sync
3. **Handle Errors**: Implement proper error handling for rate limits and failed requests
4. **Update Interactions**: Call the interaction endpoint when users interact with contacts
5. **Respect Privacy**: Always inform users about contact synchronization and get consent 