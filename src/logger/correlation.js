import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

// AsyncLocalStorage save request context
export const als = new AsyncLocalStorage();

/**
 * Create a unique phone identifier that's more secure than last 4 digits
 * This prevents collision between users with same last 4 digits
 */
function createPhoneIdentifier(phone) {
  if (!phone) return null;
  
  // Remove any non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Create a hash of the phone number with salt for privacy
  const salt = process.env.PHONE_HASH_SALT || 'default-salt-7awell';
  const hash = createHash('sha256')
    .update(cleanPhone + salt)
    .digest('hex');
  
  // Use first 8 characters of hash + last 2 digits for human readability
  const shortHash = hash.substring(0, 8);
  const lastTwo = cleanPhone.slice(-2);
  
  return `phone-${shortHash}-${lastTwo}`;
}

/**
 * Create session-based identifier for completely anonymous users
 */
function createSessionIdentifier() {
  return `session-${randomUUID().substring(0, 8)}`;
}

/**
 * Middleware to add correlation ID to each request
 */
export function correlationMiddleware(req, res, next) {
  // get correlation ID from header or create new
  const correlationId = 
    req.headers['x-correlation-id']?.toString() || 
    req.headers['x-request-id']?.toString() || 
    randomUUID();

  // Enhanced user identification
  const userId = req.user?.id;
  const userPhone = req.user?.phone || req.body?.phone || req.query?.phone || req.headers['x-user-phone'];
  
  // Create a unified user identifier for tracking
  let userIdentifier = 'anonymous';
  let phoneIdentifier = null;
  
  if (userId) {
    // Authenticated user - use user ID
    userIdentifier = `user-${userId}`;
  } else if (userPhone) {
    // Non-authenticated user with phone - use secure phone hash
    phoneIdentifier = createPhoneIdentifier(userPhone);
    userIdentifier = phoneIdentifier;
  } else {
    // Completely anonymous user - create session identifier
    userIdentifier = createSessionIdentifier();
  }

  // create enhanced trace context
  const traceContext = {
    correlationId,
    userId: userId || null,
    userPhone: userPhone || null,
    phoneIdentifier: phoneIdentifier,
    userIdentifier,
    startTime: Date.now(),
    requestId: correlationId,
    ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    method: req.method,
    url: req.originalUrl || req.url,
    
    // Additional context for bug tracking
    contentType: req.get('Content-Type') || null,
    contentLength: req.get('Content-Length') || null,
    origin: req.get('Origin') || null,
    referer: req.get('Referer') || null,
    acceptLanguage: req.get('Accept-Language') || null,
    
    // Request metadata
    query: req.query || {},
    params: req.params || {},
    
    // Session info
    sessionId: req.session?.id || req.cookies?.sessionId || null,
    
    // Device info (if available)
    deviceId: req.headers['x-device-id'] || null,
    appVersion: req.headers['x-app-version'] || null,
    platform: req.headers['x-platform'] || null
  };

  // add correlation ID to response headers
  res.set('X-Correlation-ID', correlationId);
  res.set('X-Request-ID', correlationId);

  // run other middleware inside the context
  als.run(traceContext, () => next());
}

/**
 * Helper function to get trace context from anywhere
 */
export function getTrace() {
  return als.getStore();
}

/**
 * Helper function to get correlation ID only
 */
export function getCorrelationId() {
  const trace = als.getStore();
  return trace?.correlationId;
}

/**
 * Helper function to get user ID from context
 */
export function getCurrentUserId() {
  const trace = als.getStore();
  return trace?.userId;
}

/**
 * Helper function to get user phone from context
 */
export function getCurrentUserPhone() {
  const trace = als.getStore();
  return trace?.userPhone;
}

/**
 * Helper function to get phone identifier (secure hash)
 */
export function getCurrentPhoneIdentifier() {
  const trace = als.getStore();
  return trace?.phoneIdentifier;
}

/**
 * Helper function to get user identifier (unified tracking)
 */
export function getCurrentUserIdentifier() {
  const trace = als.getStore();
  return trace?.userIdentifier || 'anonymous';
}

/**
 * Enhanced helper function to add phone-based user tracking
 * Use this when you identify a user by phone during the request
 */
export function setUserPhone(phone) {
  const trace = als.getStore();
  if (trace && phone) {
    trace.userPhone = phone;
    
    // Create secure phone identifier
    const phoneIdentifier = createPhoneIdentifier(phone);
    trace.phoneIdentifier = phoneIdentifier;
    
    // Update identifier to include secure phone tracking
    if (!trace.userId) {
      trace.userIdentifier = phoneIdentifier;
    }
  }
}

/**
 * Helper function to set user ID during request
 * Use this when user signs in during the request
 */
export function setUserId(userId) {
  const trace = als.getStore();
  if (trace && userId) {
    trace.userId = userId;
    trace.userIdentifier = `user-${userId}`;
  }
}

/**
 * Helper function to add additional information to the context
 */
export function addToTrace(additionalData) {
  const trace = als.getStore();
  if (trace) {
    Object.assign(trace, additionalData);
  }
}

/**
 * Helper function to add component/feature context
 * Useful for bug tracking to know which part of the app had issues
 */
export function setComponent(component, feature = null) {
  const trace = als.getStore();
  if (trace) {
    trace.component = component;
    if (feature) {
      trace.feature = feature;
    }
  }
}

/**
 * Helper function to track business operations
 * Use this for tracking high-level operations for debugging
 */
export function setOperation(operation, details = {}) {
  const trace = als.getStore();
  if (trace) {
    trace.operation = operation;
    trace.operationDetails = details;
  }
}

/**
 * Helper function to get request duration
 */
export function getRequestDuration() {
  const trace = als.getStore();
  if (trace?.startTime) {
    return Date.now() - trace.startTime;
  }
  return 0;
}

/**
 * Helper function to check if user is identified (either by ID or phone)
 */
export function isUserIdentified() {
  const trace = als.getStore();
  return !!(trace?.userId || trace?.userPhone);
}

/**
 * Enhanced helper function to get comprehensive user context for logging
 */
export function getUserContext() {
  const trace = als.getStore();
  if (!trace) return {};
  
  return {
    userId: trace.userId,
    userPhone: trace.userPhone,
    phoneIdentifier: trace.phoneIdentifier,
    userIdentifier: trace.userIdentifier,
    isAuthenticated: !!trace.userId,
    hasPhoneIdentity: !!trace.userPhone,
    sessionId: trace.sessionId,
    deviceId: trace.deviceId
  };
}

/**
 * Helper function to decode phone identifier back to readable format
 * (for debugging purposes only - doesn't reveal actual phone)
 */
export function getPhoneIdentifierInfo(phoneIdentifier) {
  if (!phoneIdentifier || !phoneIdentifier.startsWith('phone-')) {
    return null;
  }
  
  const parts = phoneIdentifier.split('-');
  if (parts.length !== 3) return null;
  
  return {
    type: 'phone',
    hash: parts[1],
    lastTwoDigits: parts[2],
    isUnique: true
  };
} 