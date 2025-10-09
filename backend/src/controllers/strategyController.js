const { TradingStrategy, User } = require('../models');
const { logger } = require('../config/logger');
const { redisClient } = require('../config/redis');
const { Op } = require('sequelize');

class StrategyController {
  // Get all strategies (with pagination and filters)
  static async getAllStrategies(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        riskLevel,
        category,
        minPerformanceScore = 0,
        q: searchQuery
      } = req.query;

      const offset = (page - 1) * limit;
      const order = [[sortBy, sortOrder.toUpperCase()]];

      // Build where clause
      const whereClause = {
        isPublic: true,
        status: 'approved',
        performanceScore: { [Op.gte]: parseInt(minPerformanceScore) }
      };

      if (riskLevel) {
        whereClause.riskLevel = riskLevel;
      }

      if (category) {
        whereClause.category = category;
      }

      if (searchQuery) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${searchQuery}%` } },
          { description: { [Op.iLike]: `%${searchQuery}%` } },
          { tags: { [Op.contains]: [searchQuery] } }
        ];
      }

      // Try to get from cache first
      const cacheKey = `strategies:public:${JSON.stringify(req.query)}`;
      let cachedData = null;
      
      if (process.env.ENABLE_REDIS_CACHING === 'true') {
        cachedData = await redisClient.get(cacheKey);
      }

      if (cachedData && res.cache) {
        return res.json({
          success: true,
          data: cachedData,
          cached: true
        });
      }

      const { count, rows: strategies } = await TradingStrategy.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });

      const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1
      };

      const responseData = {
        strategies,
        pagination
      };

      // Cache the result
      if (process.env.ENABLE_REDIS_CACHING === 'true') {
        await redisClient.set(cacheKey, responseData, 300); // 5 minutes
      }

      return res.status(200).json({
        success: true,
        data: responseData
      });

    } catch (error) {
      logger.error('Get all strategies error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve strategies',
          code: 'GET_STRATEGIES_FAILED'
        }
      });
    }
  }

  // Get strategy by ID
  static async getStrategyById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const strategy = await TradingStrategy.findByPk(id, {
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }]
      });

      if (!strategy) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Strategy not found',
            code: 'STRATEGY_NOT_FOUND'
          }
        });
      }

      // Check access permissions
      const canAccess = 
        strategy.isPublic && strategy.status === 'approved' ||
        strategy.createdBy === userId ||
        req.user?.role === 'admin';

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. Strategy is not public or you are not the owner.',
            code: 'STRATEGY_ACCESS_DENIED'
          }
        });
      }

      // Increment view count (for public strategies)
      if (strategy.isPublic && strategy.status === 'approved' && userId !== strategy.createdBy) {
        await strategy.increment('viewCount');
      }

      logger.info('Strategy retrieved', {
        strategyId: id,
        userId: userId,
        viewCount: strategy.viewCount + 1
      });

      return res.status(200).json({
        success: true,
        data: {
          strategy
        }
      });

    } catch (error) {
      logger.error('Get strategy by ID error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve strategy',
          code: 'GET_STRATEGY_FAILED'
        }
      });
    }
  }

  // Create new strategy
  static async createStrategy(req, res) {
    try {
      const userId = req.user.id;
      const strategyData = {
        ...req.body,
        createdBy: userId,
        status: 'draft'
      };

      // Ensure target assets are uppercase
      if (strategyData.targetAssets) {
        strategyData.targetAssets = strategyData.targetAssets.map(asset => asset.toUpperCase());
      }

      // Set default performance metrics if not provided
      if (!strategyData.performanceMetrics) {
        strategyData.performanceMetrics = {
          winRate: 0,
          profitLoss: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          totalTrades: 0,
          avgTradeDuration: 0,
          lastUpdated: new Date().toISOString()
        };
      }

      const strategy = await TradingStrategy.create(strategyData);

      // Invalidate related cache
      if (process.env.ENABLE_REDIS_CACHING === 'true') {
        await redisClient.invalidateUserCache(userId);
        await redisClient.invalidatePublicStrategiesCache();
      }

      logger.info('Strategy created successfully', {
        strategyId: strategy.id,
        userId: userId,
        name: strategy.name
      });

      return res.status(201).json({
        success: true,
        message: 'Strategy created successfully',
        data: {
          strategy
        }
      });

    } catch (error) {
      logger.error('Create strategy error:', error);

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

      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create strategy',
          code: 'CREATE_STRATEGY_FAILED'
        }
      });
    }
  }

  // Update strategy
  static async updateStrategy(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const strategy = await TradingStrategy.findByPk(id);

      if (!strategy) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Strategy not found',
            code: 'STRATEGY_NOT_FOUND'
          }
        });
      }

      // Check ownership (only owner or admin can update)
      if (strategy.createdBy !== userId && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. You can only update your own strategies.',
            code: 'UPDATE_ACCESS_DENIED'
          }
        });
      }

      // Prepare update data
      const updateData = { ...req.body };

      // Ensure target assets are uppercase
      if (updateData.targetAssets) {
        updateData.targetAssets = updateData.targetAssets.map(asset => asset.toUpperCase());
      }

      // If strategy was approved and being modified, reset to draft
      if (strategy.status === 'approved' && userRole !== 'admin') {
        updateData.status = 'draft';
        updateData.approvedBy = null;
        updateData.approvedAt = null;
      }

      await strategy.update(updateData);

      // Invalidate cache
      if (process.env.ENABLE_REDIS_CACHING === 'true') {
        await redisClient.invalidateUserCache(userId);
        await redisClient.invalidatePublicStrategiesCache();
      }

      logger.info('Strategy updated successfully', {
        strategyId: id,
        userId: userId,
        updatedFields: Object.keys(updateData)
      });

      return res.status(200).json({
        success: true,
        message: 'Strategy updated successfully',
        data: {
          strategy
        }
      });

    } catch (error) {
      logger.error('Update strategy error:', error);

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

      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update strategy',
          code: 'UPDATE_STRATEGY_FAILED'
        }
      });
    }
  }

  // Delete strategy (soft delete)
  static async deleteStrategy(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const strategy = await TradingStrategy.findByPk(id);

      if (!strategy) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Strategy not found',
            code: 'STRATEGY_NOT_FOUND'
          }
        });
      }

      // Check ownership (only owner or admin can delete)
      if (strategy.createdBy !== userId && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. You can only delete your own strategies.',
            code: 'DELETE_ACCESS_DENIED'
          }
        });
      }

      await strategy.destroy(); // Soft delete due to paranoid: true

      // Invalidate cache
      if (process.env.ENABLE_REDIS_CACHING === 'true') {
        await redisClient.invalidateUserCache(userId);
        await redisClient.invalidatePublicStrategiesCache();
      }

      logger.info('Strategy deleted successfully', {
        strategyId: id,
        userId: userId,
        deletedBy: userRole
      });

      return res.status(200).json({
        success: true,
        message: 'Strategy deleted successfully'
      });

    } catch (error) {
      logger.error('Delete strategy error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete strategy',
          code: 'DELETE_STRATEGY_FAILED'
        }
      });
    }
  }

  // Get user's own strategies
  static async getUserStrategies(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const offset = (page - 1) * limit;
      const order = [[sortBy, sortOrder.toUpperCase()]];

      const whereClause = { createdBy: userId };
      if (status) {
        whereClause.status = status;
      }

      // Try cache first
      const cacheKey = `user:${userId}:strategies:${JSON.stringify(req.query)}`;
      let cachedData = null;
      
      if (process.env.ENABLE_REDIS_CACHING === 'true') {
        cachedData = await redisClient.get(cacheKey);
      }

      if (cachedData) {
        return res.json({
          success: true,
          data: cachedData,
          cached: true
        });
      }

      const { count, rows: strategies } = await TradingStrategy.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        paranoid: false // Include soft-deleted for owner
      });

      const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1
      };

      const responseData = {
        strategies,
        pagination
      };

      // Cache the result
      if (process.env.ENABLE_REDIS_CACHING === 'true') {
        await redisClient.set(cacheKey, responseData, 300);
      }

      return res.status(200).json({
        success: true,
        data: responseData
      });

    } catch (error) {
      logger.error('Get user strategies error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve user strategies',
          code: 'GET_USER_STRATEGIES_FAILED'
        }
      });
    }
  }

  // Submit strategy for approval
  static async submitForApproval(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const strategy = await TradingStrategy.findByPk(id);

      if (!strategy) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Strategy not found',
            code: 'STRATEGY_NOT_FOUND'
          }
        });
      }

      if (strategy.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. You can only submit your own strategies.',
            code: 'SUBMIT_ACCESS_DENIED'
          }
        });
      }

      if (strategy.status !== 'draft') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Only draft strategies can be submitted for approval',
            code: 'INVALID_STATUS_TRANSITION'
          }
        });
      }

      await strategy.update({
        status: 'pending',
        rejectionReason: null
      });

      logger.info('Strategy submitted for approval', {
        strategyId: id,
        userId: userId
      });

      return res.status(200).json({
        success: true,
        message: 'Strategy submitted for approval successfully',
        data: {
          strategy
        }
      });

    } catch (error) {
      logger.error('Submit for approval error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to submit strategy for approval',
          code: 'SUBMIT_APPROVAL_FAILED'
        }
      });
    }
  }

  // Update strategy status (admin only)
  static async updateStrategyStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const adminId = req.user.id;

      const strategy = await TradingStrategy.findByPk(id);

      if (!strategy) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Strategy not found',
            code: 'STRATEGY_NOT_FOUND'
          }
        });
      }

      const updateData = { status };

      if (status === 'approved') {
        updateData.approvedBy = adminId;
        updateData.approvedAt = new Date();
        updateData.rejectionReason = null;
      } else if (status === 'rejected') {
        updateData.rejectionReason = rejectionReason;
        updateData.approvedBy = null;
        updateData.approvedAt = null;
      }

      await strategy.update(updateData);

      // Invalidate cache
      if (process.env.ENABLE_REDIS_CACHING === 'true') {
        await redisClient.invalidateUserCache(strategy.createdBy);
        await redisClient.invalidatePublicStrategiesCache();
      }

      // Log audit event
      const { logAuditEvent } = require('../config/logger');
      logAuditEvent('STRATEGY_STATUS_UPDATE', adminId, {
        strategyId: id,
        newStatus: status,
        rejectionReason,
        strategyOwnerId: strategy.createdBy
      });

      logger.info('Strategy status updated by admin', {
        strategyId: id,
        adminId: adminId,
        newStatus: status,
        rejectionReason
      });

      return res.status(200).json({
        success: true,
        message: `Strategy ${status} successfully`,
        data: {
          strategy
        }
      });

    } catch (error) {
      logger.error('Update strategy status error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update strategy status',
          code: 'UPDATE_STATUS_FAILED'
        }
      });
    }
  }

  // Get strategies pending approval (admin only)
  static async getPendingStrategies(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const offset = (page - 1) * limit;
      const order = [[sortBy, sortOrder.toUpperCase()]];

      const { count, rows: strategies } = await TradingStrategy.findAndCountAll({
        where: { status: 'pending' },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1
      };

      return res.status(200).json({
        success: true,
        data: {
          strategies,
          pagination
        }
      });

    } catch (error) {
      logger.error('Get pending strategies error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve pending strategies',
          code: 'GET_PENDING_STRATEGIES_FAILED'
        }
      });
    }
  }

  // Get top performing strategies
  static async getTopStrategies(req, res) {
    try {
      const { limit = 10 } = req.query;

      // Try cache first
      const cacheKey = `strategies:top:${limit}`;
      let cachedData = null;
      
      if (process.env.ENABLE_REDIS_CACHING === 'true') {
        cachedData = await redisClient.get(cacheKey);
      }

      if (cachedData) {
        return res.json({
          success: true,
          data: { strategies: cachedData },
          cached: true
        });
      }

      const strategies = await TradingStrategy.getTopPerforming(parseInt(limit));

      // Cache for 10 minutes
      if (process.env.ENABLE_REDIS_CACHING === 'true') {
        await redisClient.set(cacheKey, strategies, 600);
      }

      return res.status(200).json({
        success: true,
        data: {
          strategies
        }
      });

    } catch (error) {
      logger.error('Get top strategies error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve top strategies',
          code: 'GET_TOP_STRATEGIES_FAILED'
        }
      });
    }
  }
}

module.exports = StrategyController;