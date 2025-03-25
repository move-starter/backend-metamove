import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';

/**
 * Rate limiter middleware to prevent abuse
 * Different limits for different endpoints
 */
export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { 
        success: false, 
        message: 'Too many requests, please try again later.' 
    },
    keyGenerator: (req) => {
        // Use IP address and user ID (if available) for rate limiting
        const userId = req.body.userId || req.params.userId || 'anonymous';
        return `${req.ip}-${userId}`;
    },
    // Skip rate limiting for known safe endpoints
    skip: (req) => {
        const safePaths = ['/health', '/api/docs'];
        return safePaths.includes(req.path);
    }
});

/**
 * Specific rate limiter for sensitive operations
 */
export const sensitiveRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 sensitive operations per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        success: false, 
        message: 'Too many sensitive operations, please try again later.' 
    },
    keyGenerator: (req) => {
        // For sensitive operations, use stricter rate limiting
        const userId = req.body.userId || req.params.userId || 'anonymous';
        return `${req.ip}-${userId}-sensitive`;
    }
});

/**
 * Validate and sanitize request inputs
 * @param {string} location - Where to look for parameters ('body', 'params', 'query')
 * @param {Array} requiredParams - List of required parameters
 * @returns {function} Express middleware
 */
export const validateRequest = (location, requiredParams = []) => {
    return (req, res, next) => {
        try {
            const locationParts = location.split(', ');
            
            // Check each location
            for (const part of locationParts) {
                if (!req[part]) {
                    continue;
                }
                
                // Check for required parameters in this location
                for (const param of requiredParams) {
                    if (part === 'body' && !req.body[param]) {
                        return res.status(400).json({
                            success: false,
                            message: `Missing required parameter: ${param}`
                        });
                    }
                    
                    if (part === 'params' && !req.params[param]) {
                        return res.status(400).json({
                            success: false,
                            message: `Missing required parameter: ${param}`
                        });
                    }
                    
                    if (part === 'query' && !req.query[param]) {
                        return res.status(400).json({
                            success: false,
                            message: `Missing required parameter: ${param}`
                        });
                    }
                }
                
                // Sanitize all parameters in this location
                for (const [key, value] of Object.entries(req[part])) {
                    if (typeof value === 'string') {
                        // Basic sanitization - remove potentially dangerous characters
                        req[part][key] = value.replace(/[<>]/g, '');
                    }
                }
            }
            
            next();
        } catch (error) {
            console.error('Request validation error:', error);
            return res.status(400).json({
                success: false,
                message: 'Invalid request parameters'
            });
        }
    };
};

/**
 * Security headers middleware
 * Sets security-related HTTP headers
 */
export const securityHeaders = (req, res, next) => {
    // Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; object-src 'none'; img-src 'self' data:;"
    );
    
    // Prevent browsers from incorrectly detecting non-scripts as scripts
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Strict Transport Security (use HTTPS)
    res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
    );
    
    // X-Frame-Options (prevent clickjacking)
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'same-origin');
    
    next();
};

/**
 * Log all API requests
 * Records information about each request for monitoring and debugging
 */
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = createHash('sha256')
        .update(`${Date.now()}-${Math.random()}`)
        .digest('hex')
        .substring(0, 16);
    
    // Add request ID to request object and response headers
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    
    // Calculate client IP address
    const ip = req.ip || 
        req.connection.remoteAddress || 
        req.socket.remoteAddress || 
        'unknown';
    
    // Log request details
    console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} from ${ip}`);
    
    // Log request body for non-GET requests (excluding sensitive fields)
    if (req.method !== 'GET' && req.body) {
        const safeBody = { ...req.body };
        
        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'key', 'secret', 'privateKey'];
        for (const field of sensitiveFields) {
            if (safeBody[field]) {
                safeBody[field] = '[REDACTED]';
            }
        }
        
        console.log(`[${requestId}] Request Body:`, JSON.stringify(safeBody));
    }
    
    // Capture response time and status
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(
            `[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} ` +
            `completed with status ${res.statusCode} in ${duration}ms`
        );
    });
    
    next();
};

/**
 * Error handling middleware
 * Catches and processes errors
 */
export const errorHandler = (err, req, res, next) => {
    // Log the error
    console.error(`[ERROR] [${req.requestId || 'unknown'}]`, err);
    
    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Send appropriate response
    res.status(err.status || 500).json({
        success: false,
        message: isProduction ? 'An unexpected error occurred' : err.message,
        error: isProduction ? undefined : {
            name: err.name,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
}; 