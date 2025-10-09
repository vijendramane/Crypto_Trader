const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');

class JWTUtil {
  // Generate access token
  static generateAccessToken(payload) {
    try {
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '1h',
          issuer: 'primetrade-api',
          audience: 'primetrade-client'
        }
      );

      return token;
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Token generation failed');
    }
  }

  // Generate refresh token
  static generateRefreshToken(payload) {
    try {
      const token = jwt.sign(
        payload,
        process.env.JWT_REFRESH_SECRET,
        {
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
          issuer: 'primetrade-api',
          audience: 'primetrade-client'
        }
      );

      return token;
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Refresh token generation failed');
    }
  }

  // Generate token pair (access + refresh)
  static generateTokenPair(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({ id: user.id });

    return {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    };
  }

  // Verify access token
  static verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'primetrade-api',
        audience: 'primetrade-client'
      });

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not active');
      }
      
      logger.error('Token verification error:', error);
      throw new Error('Token verification failed');
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        issuer: 'primetrade-api',
        audience: 'primetrade-client'
      });

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      
      logger.error('Refresh token verification error:', error);
      throw new Error('Refresh token verification failed');
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // Get token expiration time
  static getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      logger.error('Error decoding token for expiration:', error);
      return null;
    }
  }

  // Check if token is about to expire (within 5 minutes)
  static isTokenExpiringSoon(token, bufferMinutes = 5) {
    try {
      const expiration = this.getTokenExpiration(token);
      if (!expiration) return true;

      const bufferTime = bufferMinutes * 60 * 1000; // Convert to milliseconds
      const expirationWithBuffer = expiration.getTime() - bufferTime;
      
      return Date.now() >= expirationWithBuffer;
    } catch (error) {
      logger.error('Error checking token expiration:', error);
      return true;
    }
  }

  // Decode token without verification (for debugging)
  static decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  // Generate email verification token
  static generateEmailVerificationToken(userId) {
    try {
      const payload = {
        id: userId,
        type: 'email_verification'
      };

      return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '24h',
        issuer: 'primetrade-api'
      });
    } catch (error) {
      logger.error('Error generating email verification token:', error);
      throw new Error('Email verification token generation failed');
    }
  }

  // Verify email verification token
  static verifyEmailVerificationToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'primetrade-api'
      });

      if (decoded.type !== 'email_verification') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.error('Email verification token verification error:', error);
      throw new Error('Invalid or expired verification token');
    }
  }

  // Generate password reset token (separate from JWT for security)
  static generatePasswordResetToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = JWTUtil;