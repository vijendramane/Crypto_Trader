const { body, param, query, validationResult } = require('express-validator');
const { logger } = require('../config/logger');

// Handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Validation failed', {
      url: req.originalUrl,
      method: req.method,
      errors: formattedErrors,
      userId: req.user?.id
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formattedErrors
      }
    });
  }

  next();
};

// User registration validation
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Password reset request validation
const validatePasswordResetRequest = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  handleValidationErrors
];

// Trading strategy validation
const validateTradingStrategy = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Strategy name must be between 3 and 200 characters'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('riskLevel')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Risk level must be low, medium, or high'),

  body('category')
    .isIn([
      'scalping', 'day_trading', 'swing_trading', 'position_trading',
      'arbitrage', 'market_making', 'mean_reversion', 'momentum',
      'breakout', 'grid_trading'
    ])
    .withMessage('Invalid trading strategy category'),

  body('targetAssets')
    .isArray({ min: 1 })
    .withMessage('At least one target asset is required')
    .custom((assets) => {
      const validAssets = [
        'BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'UNI', 'AAVE', 'SOL',
        'MATIC', 'AVAX', 'ATOM', 'LTC', 'BCH', 'XRP', 'BNB', 'USDT', 'USDC'
      ];
      
      if (!Array.isArray(assets)) {
        throw new Error('Target assets must be an array');
      }
      
      for (const asset of assets) {
        if (!validAssets.includes(asset.toUpperCase())) {
          throw new Error(`Invalid asset: ${asset}`);
        }
      }
      
      return true;
    }),

  body('timeframe')
    .isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'])
    .withMessage('Invalid timeframe'),

  body('profitTarget')
    .isFloat({ min: 0.01, max: 1000 })
    .withMessage('Profit target must be between 0.01% and 1000%'),

  body('stopLoss')
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Stop loss must be between 0.01% and 100%'),

  body('performanceMetrics')
    .optional()
    .isObject()
    .withMessage('Performance metrics must be an object')
    .custom((metrics) => {
      if (metrics) {
        const requiredFields = ['winRate', 'profitLoss', 'sharpeRatio', 'maxDrawdown'];
        for (const field of requiredFields) {
          if (!(field in metrics)) {
            throw new Error(`Performance metrics must include ${field}`);
          }
        }
      }
      return true;
    }),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),

  handleValidationErrors
];

// Update trading strategy validation (partial)
const validateTradingStrategyUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Strategy name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('riskLevel')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Risk level must be low, medium, or high'),

  body('category')
    .optional()
    .isIn([
      'scalping', 'day_trading', 'swing_trading', 'position_trading',
      'arbitrage', 'market_making', 'mean_reversion', 'momentum',
      'breakout', 'grid_trading'
    ])
    .withMessage('Invalid trading strategy category'),

  body('targetAssets')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one target asset is required')
    .custom((assets) => {
      if (assets) {
        const validAssets = [
          'BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'UNI', 'AAVE', 'SOL',
          'MATIC', 'AVAX', 'ATOM', 'LTC', 'BCH', 'XRP', 'BNB', 'USDT', 'USDC'
        ];
        
        for (const asset of assets) {
          if (!validAssets.includes(asset.toUpperCase())) {
            throw new Error(`Invalid asset: ${asset}`);
          }
        }
      }
      
      return true;
    }),

  body('profitTarget')
    .optional()
    .isFloat({ min: 0.01, max: 1000 })
    .withMessage('Profit target must be between 0.01% and 1000%'),

  body('stopLoss')
    .optional()
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Stop loss must be between 0.01% and 100%'),

  handleValidationErrors
];

// UUID parameter validation
const validateUUID = [
  param('id')
    .isUUID(4)
    .withMessage('Invalid ID format'),

  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'performanceScore', 'riskLevel'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  handleValidationErrors
];

// Strategy search validation
const validateStrategySearch = [
  query('q')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),

  query('riskLevel')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid risk level filter'),

  query('category')
    .optional()
    .isIn([
      'scalping', 'day_trading', 'swing_trading', 'position_trading',
      'arbitrage', 'market_making', 'mean_reversion', 'momentum',
      'breakout', 'grid_trading'
    ])
    .withMessage('Invalid category filter'),

  query('minPerformanceScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Minimum performance score must be between 0 and 100'),

  ...validatePagination
];

// Strategy status update validation (admin only)
const validateStrategyStatusUpdate = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected'),

  body('rejectionReason')
    .if(body('status').equals('rejected'))
    .notEmpty()
    .withMessage('Rejection reason is required when rejecting a strategy')
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),

  handleValidationErrors
];

// Email verification validation
const validateEmailVerification = [
  param('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isJWT()
    .withMessage('Invalid verification token format'),

  handleValidationErrors
];

// User profile update validation
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('profile')
    .optional()
    .isObject()
    .withMessage('Profile must be an object'),

  handleValidationErrors
];

// Custom validation for file uploads (if implemented)
const validateFileUpload = (field, options = {}) => {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = [] } = options;
  
  return (req, res, next) => {
    const file = req.files?.[field];
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          message: `${field} file is required`,
          code: 'FILE_REQUIRED'
        }
      });
    }

    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: {
          message: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
          code: 'FILE_TOO_LARGE'
        }
      });
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
          code: 'INVALID_FILE_TYPE'
        }
      });
    }

    next();
  };
};

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateTradingStrategy,
  validateTradingStrategyUpdate,
  validateUUID,
  validatePagination,
  validateStrategySearch,
  validateStrategyStatusUpdate,
  validateEmailVerification,
  validateProfileUpdate,
  validateFileUpload
};