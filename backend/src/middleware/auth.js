const JWTUtil = require('../utils/jwt');
const { User } = require('../models');
const { logger } = require('../config/logger');

// Main authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtil.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN'
        }
      });
    }

    // Verify the token
    const decoded = JWTUtil.verifyAccessToken(token);
    
    // Find the user in database
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. User not found.',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Check if user is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        error: {
          message: 'Account is temporarily locked. Try again later.',
          code: 'ACCOUNT_LOCKED',
          lockUntil: user.lockUntil
        }
      });
    }

    // Add user to request object
    req.user = user;
    req.token = token;

    // Log successful authentication
    logger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    next();
    
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error.message === 'Token expired') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token.',
          code: 'INVALID_TOKEN'
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        message: 'Authentication failed.',
        code: 'AUTH_FAILED'
      }
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtil.extractTokenFromHeader(authHeader);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = JWTUtil.verifyAccessToken(token);
    const user = await User.findByPk(decoded.id);

    req.user = user || null;
    req.token = token;

    next();
  } catch (error) {
    // In optional auth, we don't fail on token errors
    req.user = null;
    next();
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. Authentication required.',
          code: 'AUTH_REQUIRED'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Insufficient permissions.',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: roles,
          current: req.user.role
        }
      });
    }

    logger.debug('Authorization successful', {
      userId: req.user.id,
      role: req.user.role,
      endpoint: req.originalUrl
    });

    next();
  };
};

// Admin only middleware
const requireAdmin = authorize('admin');

// User or Admin middleware
const requireUser = authorize('user', 'admin');

// Email verification required middleware
const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      }
    });
  }

  if (!req.user.isEmailVerified && process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Email verification required.',
        code: 'EMAIL_NOT_VERIFIED'
      }
    });
  }

  next();
};

// Resource owner or admin middleware
const requireOwnerOrAdmin = (resourceIdParam = 'id', userIdField = 'createdBy') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required.',
            code: 'AUTH_REQUIRED'
          }
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params[resourceIdParam];
      
      // If checking a user resource directly
      if (userIdField === 'id' || userIdField === 'userId') {
        if (resourceId === req.user.id) {
          return next();
        }
      } else {
        // For other resources, we need to fetch and check ownership
        // This will be implemented in specific route handlers
        req.requireOwnership = {
          resourceId,
          userIdField,
          userId: req.user.id
        };
        return next();
      }

      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You can only access your own resources.',
          code: 'RESOURCE_ACCESS_DENIED'
        }
      });

    } catch (error) {
      logger.error('Resource authorization error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Authorization check failed.',
          code: 'AUTH_CHECK_FAILED'
        }
      });
    }
  };
};

// Rate limiting by user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    const userRequestLog = userRequests.get(userId);
    
    // Remove old requests outside the window
    const validRequests = userRequestLog.filter(timestamp => timestamp > windowStart);
    userRequests.set(userId, validRequests);

    // Check rate limit
    if (validRequests.length >= maxRequests) {
      const remainingTime = Math.ceil((validRequests[0] + windowMs - now) / 1000);
      
      return res.status(429).json({
        success: false,
        error: {
          message: 'Rate limit exceeded. Too many requests.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: remainingTime
        }
      });
    }

    // Add current request
    validRequests.push(now);
    
    // Add rate limit info to response headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - validRequests.length,
      'X-RateLimit-Reset': Math.ceil((windowStart + windowMs) / 1000)
    });

    next();
  };
};

// Audit middleware for admin actions
const auditAdminActions = (action) => {
  return (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      const { logAuditEvent } = require('../config/logger');
      
      // Log after response is sent
      res.on('finish', () => {
        if (res.statusCode < 400) {
          logAuditEvent(action, req.user.id, {
            method: req.method,
            url: req.originalUrl,
            params: req.params,
            body: req.body,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip
          });
        }
      });
    }
    
    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requireAdmin,
  requireUser,
  requireEmailVerified,
  requireOwnerOrAdmin,
  userRateLimit,
  auditAdminActions
};