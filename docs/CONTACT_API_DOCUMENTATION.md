# Contact API Documentation

## Overview
This document provides comprehensive documentation for the Contact API endpoints, which handle user contact synchronization, management, and search functionality.

## Architecture

### Clean Code Principles Applied
- **Single Responsibility**: Each file has a specific purpose
- **Separation of Concerns**: Business logic separated from validation and routing
- **DRY (Don't Repeat Yourself)**: Reusable components and constants
- **SOLID Principles**: Modular and extensible design

### File Structure
```
routes/
  └── contactRoutes.js           # Route definitions and middleware application

schemas/
  └── contactSchemas.js          # Zod validation schemas

constants/
  └── contactConstants.js        # Configuration constants and limits

middleware/
  └── contactValidation.js       # Enhanced validation and security middleware

services/
  └── contactHelpers.js          # Business logic and utility functions
```

## API Endpoints

### Authentication
All endpoints require authentication via the `Authorization` header:
```
Authorization: Bearer <token>
```

### Base URL
```
/api/v1/contacts
```

---

## Contact Sync Endpoints

### 1. Sync Contacts
**POST** `/sync`

Synchronize user contacts with the platform using optimized batch processing.

#### Request Body
```json
{
  "phoneNumbers": ["+1234567890", "+0987654321"],
  "deviceContactsCount": 150,
  "batchSize": 500
}
```

#### Validation Rules
- `phoneNumbers`: Array of 1-10,000 valid phone numbers
- `deviceContactsCount`: Positive number
- `batchSize`: Optional, 100-1000 (default: 500)

#### Response
```json
{
  "success": true,
  "data": {
    "processed": 2,
    "added": 1,
    "updated": 1,
    "duration_ms": 1250,
    "batch_info": {
      "total_batches": 1,
      "batch_size": 500
    }
  },
  "message": "Contacts synced successfully"
}
```

#### Security Features
- Rate limiting (10 syncs per hour)
- Large operation throttling (>5000 contacts)
- Duplicate phone number detection
- Spam pattern detection

---

### 2. Estimate Sync Performance
**POST** `/sync/estimate`

Get performance estimates for contact sync operations.

#### Request Body
```json
{
  "contactCount": 5000,
  "batchSize": 1000
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "contactCount": 5000,
    "estimatedTimeMs": 10250,
    "estimatedTimeSeconds": 10,
    "numberOfBatches": 5,
    "performanceLevel": "medium",
    "recommendedBatchSize": 1000
  }
}
```

---

### 3. Sync Statistics
**GET** `/sync/statistics?days=30`

Retrieve contact sync statistics for analysis.

#### Query Parameters
- `days`: Number of days to include (1-365, default: 30)

#### Response
```json
{
  "success": true,
  "data": {
    "total_syncs": 15,
    "total_contacts_processed": 2500,
    "average_sync_time_ms": 1800,
    "success_rate": 98.5,
    "last_sync_at": "2024-01-15T10:30:00Z",
    "days_covered": 30
  }
}
```

---

### 4. Sync Status
**GET** `/sync/status`

Get current sync status for the authenticated user.

#### Response
```json
{
  "success": true,
  "data": {
    "is_syncing": false,
    "last_sync_at": "2024-01-15T10:30:00Z",
    "total_contacts": 127,
    "pending_operations": 0
  }
}
```

---

## Contact Retrieval Endpoints

### 5. Get Contacts
**GET** `/?favorites=false&limit=50&offset=0`

Retrieve user contacts with pagination and filtering.

#### Query Parameters
- `favorites`: Filter by favorites ("true"/"false", default: "false")
- `limit`: Results per page (1-100, default: 50)
- `offset`: Results to skip (≥0, default: 0)

#### Response
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "uuid",
        "phone_hash": "hash",
        "is_favorite": false,
        "linked_user_id": "uuid",
        "last_interaction_at": "2024-01-15T10:30:00Z",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 127,
      "limit": 50,
      "offset": 0,
      "currentPage": 1,
      "totalPages": 3,
      "hasMore": true,
      "nextOffset": 50
    }
  }
}
```

---

### 6. Get Favorite Contacts
**GET** `/favorites`

Retrieve user's favorite contacts.

#### Response
Similar to Get Contacts but filtered to favorites only.

---

### 7. Search Contacts
**GET** `/search?q=john&limit=20&offset=0`

Search through user contacts.

#### Query Parameters
- `q`: Search term (2-50 characters)
- `limit`: Results per page (1-50, default: 20)
- `offset`: Results to skip (≥0, default: 0)

#### Search Features
- Phone number search with normalization
- Text search with partial matching
- XSS protection and input sanitization

---

### 8. Contact Statistics
**GET** `/stats`

Get contact analytics and statistics.

#### Response
```json
{
  "success": true,
  "data": {
    "total": 127,
    "favorites": 15,
    "withLinkedUsers": 45,
    "recentInteractions": 12,
    "averageInteractionAge": 7
  }
}
```

---

## Contact Interaction Endpoints

### 9. Toggle Favorite
**POST** `/:contactId/favorite/toggle`

Toggle favorite status for a contact.

#### Parameters
- `contactId`: UUID of the contact

#### Response
```json
{
  "success": true,
  "data": {
    "contact_id": "uuid",
    "is_favorite": true
  },
  "message": "Favorite status updated"
}
```

---

### 10. Record Interaction
**POST** `/interaction`

Record interaction with a contact.

#### Request Body
```json
{
  "phoneNumber": "+1234567890"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "interaction_recorded": true,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

### 11. Create Phone Mapping
**POST** `/phone-mapping`

Create phone number mapping for current user.

#### Request Body
```json
{
  "phoneNumber": "+1234567890"
}
```

---

## Bulk Operations

### 12. Bulk Insert (Admin Only)
**POST** `/bulk-insert`

Bulk insert contacts for administrative purposes.

#### Request Body
```json
{
  "contacts": [
    {
      "phone_hash": "hash1",
      "is_favorite": false,
      "linked_user_id": null
    }
  ],
  "batchSize": 500
}
```

#### Access Control
- Requires admin role
- Enhanced logging for large operations
- Special rate limiting

---

## Error Handling

### Validation Errors (400)
```json
{
  "success": false,
  "errors": [
    {
      "field": "phoneNumbers",
      "message": "At least one phone number required",
      "received": [],
      "expected": "array"
    }
  ],
  "message": "Validation failed"
}
```

### Rate Limiting (429)
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 3600
}
```

### Permission Errors (403)
```json
{
  "success": false,
  "message": "Insufficient permissions for bulk operations"
}
```

---

## Performance Features

### Response Time Monitoring
- All requests include `X-Response-Time` header
- Slow requests (>1000ms) are automatically logged
- Performance metrics for optimization

### Batch Processing
- Configurable batch sizes for optimal performance
- Automatic batch size recommendations
- Progress tracking for large operations

### Security Features
- Input sanitization and XSS protection
- Spam pattern detection for phone numbers
- Duplicate detection and prevention
- Rate limiting with user-specific tracking

---

## Development Guidelines

### Adding New Endpoints
1. Define schema in `schemas/contactSchemas.js`
2. Add constants to `constants/contactConstants.js`
3. Create route in `routes/contactRoutes.js`
4. Add validation middleware if needed
5. Update this documentation

### Testing
- Use validation schemas for consistent testing
- Test rate limiting and security features
- Verify performance under load
- Test error handling scenarios

### Monitoring
- Check response time headers
- Monitor rate limiting effectiveness
- Track validation failure patterns
- Review performance logs

---

## Migration from Joi to Zod

This API has been migrated from Joi to Zod validation with the following improvements:

### Benefits of Zod
- Better TypeScript integration
- Smaller bundle size
- More intuitive syntax
- Built-in type inference

### Breaking Changes
- None - API contract remains the same
- Enhanced error messages
- Improved validation performance

### Migration Notes
- All validation logic preserved
- Enhanced phone number normalization
- Better error reporting
- Improved performance monitoring 