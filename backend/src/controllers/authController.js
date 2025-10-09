const { User } = require('../models');
const JWTUtil = require('../utils/jwt');
const { logger } = require('../config/logger');
const crypto = require('crypto');

class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      const { firstName, lastName, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'User with this email already exists',
            code: 'USER_EXISTS'
          }
        });
      }

      // Create new user
      const user = await User.createUser({
        firstName,
        lastName,
        email,
        password
      });

      // Generate tokens
      const tokens = JWTUtil.generateTokenPair(user);

      // Generate email verification token if enabled
      let emailVerificationToken = null;
      if (process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
        emailVerificationToken = JWTUtil.generateEmailVerificationToken(user.id);
        await user.update({ emailVerificationToken });
        
        // TODO: Send verification email
        logger.info('Email verification token generated', {
          userId: user.id,
          email: user.email
        });
      }

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email
      });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          tokens,
          emailVerificationRequired: process.env.ENABLE_EMAIL_VERIFICATION === 'true'
        }
      });

    } catch (error) {
      logger.error('Registration error:', error);

      // Handle Sequelize validation errors
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));

        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: validationErrors
          }
        });
      }

      // Handle unique constraint errors
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          error: {
            message: 'User with this email already exists',
            code: 'EMAIL_EXISTS'
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          message: 'Registration failed',
          code: 'REGISTRATION_FAILED'
        }
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
          }
        });
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
        return res.status(423).json({
          success: false,
          error: {
            message: `Account is locked. Try again in ${lockTimeRemaining} minutes.`,
            code: 'ACCOUNT_LOCKED',
            lockUntil: user.lockUntil
          }
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        // Increment login attempts
        const attempts = (user.loginAttempts || 0) + 1;
        const maxAttempts = 5;
        const lockDuration = 30 * 60 * 1000; // 30 minutes

        const updateData = { loginAttempts: attempts };
        
        if (attempts >= maxAttempts) {
          updateData.lockUntil = new Date(Date.now() + lockDuration);
          updateData.loginAttempts = 0;
        }

        await user.update(updateData);

        logger.warn('Failed login attempt', {
          email,
          attempts,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
            attemptsRemaining: Math.max(0, maxAttempts - attempts)
          }
        });
      }

      // Reset login attempts and update last login
      await user.update({
        loginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date()
      });

      // Generate tokens
      const tokens = JWTUtil.generateTokenPair(user);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          tokens
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Login failed',
          code: 'LOGIN_FAILED'
        }
      });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Refresh token is required',
            code: 'REFRESH_TOKEN_REQUIRED'
          }
        });
      }

      // Verify refresh token
      const decoded = JWTUtil.verifyRefreshToken(refreshToken);
      
      // Find user
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Generate new tokens
      const tokens = JWTUtil.generateTokenPair(user);

      logger.info('Token refreshed successfully', {
        userId: user.id,
        email: user.email
      });

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens
        }
      });

    } catch (error) {
      logger.error('Token refresh error:', error);

      if (error.message.includes('expired')) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Refresh token expired',
            code: 'REFRESH_TOKEN_EXPIRED'
          }
        });
      }

      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        }
      });
    }
  }

  // Request password reset
  static async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal that user doesn't exist
        return res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // TODO: Send password reset email
      logger.info('Password reset requested', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        data: {
          resetToken // Remove in production - only for testing
        }
      });

    } catch (error) {
      logger.error('Password reset request error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Password reset request failed',
          code: 'PASSWORD_RESET_REQUEST_FAILED'
        }
      });
    }
  }

  // Reset password
  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      const user = await User.findByResetToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid or expired reset token',
            code: 'INVALID_RESET_TOKEN'
          }
        });
      }

      // Update password
      await user.updatePassword(password);

      logger.info('Password reset successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      logger.error('Password reset error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Password reset failed',
          code: 'PASSWORD_RESET_FAILED'
        }
      });
    }
  }

  // Verify email
  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      const decoded = JWTUtil.verifyEmailVerificationToken(token);
      
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      if (user.isEmailVerified) {
        return res.status(200).json({
          success: true,
          message: 'Email already verified'
        });
      }

      // Verify email
      await user.update({
        isEmailVerified: true,
        emailVerificationToken: null
      });

      logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email
      });

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      logger.error('Email verification error:', error);
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired verification token',
          code: 'INVALID_VERIFICATION_TOKEN'
        }
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = req.user;

      return res.status(200).json({
        success: true,
        data: {
          user
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get profile',
          code: 'GET_PROFILE_FAILED'
        }
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const user = req.user;
      const { firstName, lastName, profile } = req.body;

      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (profile !== undefined) updateData.profile = { ...user.profile, ...profile };

      await user.update(updateData);

      logger.info('Profile updated successfully', {
        userId: user.id,
        email: user.email
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user
        }
      });

    } catch (error) {
      logger.error('Profile update error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Profile update failed',
          code: 'PROFILE_UPDATE_FAILED'
        }
      });
    }
  }

  // Logout (client-side token invalidation)
  static async logout(req, res) {
    try {
      // In a more complex setup, you might want to blacklist the token
      // For now, we'll just log the logout event
      
      logger.info('User logged out', {
        userId: req.user?.id,
        email: req.user?.email,
        ip: req.ip
      });

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Logout failed',
          code: 'LOGOUT_FAILED'
        }
      });
    }
  }
}

module.exports = AuthController;