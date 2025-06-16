import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

class RateLimiter {
  constructor() {
    this.redisClient = null;
    this.initRedis();
  }

  async initRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL
        });
        
        this.redisClient.on('error', (err) => {
          console.error('Redis Client Error for Rate Limiter:', err);
        });
        
        await this.redisClient.connect();
        console.log('✅ Redis connected for rate limiting');
      }
    } catch (error) {
      console.warn('⚠️ Redis not available for rate limiting, using memory store:', error.message);
    }
  }

  /**
   * Create a rate limiter with custom options
   * @param {Object} options - Rate limiting options
   * @returns {Function} Express middleware
   */
  createLimiter(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        status: 'ERROR',
        message: 'Too many requests, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id || req.ip;
      }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // Use Redis store if available
    if (this.redisClient) {
      mergedOptions.store = new RedisStore({
        client: this.redisClient,
        prefix: 'rl:', // Key prefix for rate limiting
      });
    }

    return rateLimit(mergedOptions);
  }

  /**
   * Default rate limiter for general API endpoints
   */
  general() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes
      message: {
        status: 'ERROR',
        message: 'Too many requests, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });
  }

  /**
   * Strict rate limiter for sensitive endpoints
   */
  strict() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 requests per 15 minutes
      message: {
        status: 'ERROR',
        message: 'Too many requests to sensitive endpoint, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });
  }

  /**
   * Lenient rate limiter for public endpoints
   */
  lenient() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 requests per 15 minutes
      message: {
        status: 'ERROR',
        message: 'Too many requests, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });
  }

  /**
   * Auth-specific rate limiter
   */
  auth() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 auth attempts per 15 minutes
      keyGenerator: (req) => {
        // Use phone/email for auth endpoints
        const identifier = req.body?.phoneNumber || req.body?.email || req.ip;
        return `auth:${identifier}`;
      },
      message: {
        status: 'ERROR',
        message: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      }
    });
  }

  /**
   * OTP-specific rate limiter
   */
  otp() {
    return this.createLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 3, // 3 OTP requests per 5 minutes
      keyGenerator: (req) => {
        const identifier = req.body?.phoneNumber || req.body?.email || req.ip;
        return `otp:${identifier}`;
      },
      message: {
        status: 'ERROR',
        message: 'Too many OTP requests, please try again in 5 minutes.',
        code: 'OTP_RATE_LIMIT_EXCEEDED'
      }
    });
  }
}

const rateLimiterInstance = new RateLimiter();

export default rateLimiterInstance;
export { RateLimiter }; 