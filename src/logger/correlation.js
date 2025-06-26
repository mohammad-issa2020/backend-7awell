import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

// AsyncLocalStorage save request context
export const als = new AsyncLocalStorage();

/**
 * Middleware to add correlation ID to each request
 */
export function correlationMiddleware(req, res, next) {
  // get correlation ID from header or create new
  const correlationId = 
    req.headers['x-correlation-id']?.toString() || 
    req.headers['x-request-id']?.toString() || 
    randomUUID();

  // get user ID from auth middleware if available
  const userId = req.user?.id;

  // create trace context
  const traceContext = {
    correlationId,
    userId: userId || null,
    startTime: Date.now(),
    requestId: correlationId,
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    method: req.method,
    url: req.originalUrl || req.url
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
 * Helper function to add additional information to the context
 */
export function addToTrace(additionalData) {
  const trace = als.getStore();
  if (trace) {
    Object.assign(trace, additionalData);
  }
}

/**
 * Helper function to
 */
export function getRequestDuration() {
  const trace = als.getStore();
  if (trace?.startTime) {
    return Date.now() - trace.startTime;
  }
  return 0;
} 