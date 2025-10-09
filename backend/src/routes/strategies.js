const express = require('express');
const StrategyController = require('../controllers/strategyController');
const { 
  authenticate, 
  requireAdmin, 
  requireUser,
  auditAdminActions
} = require('../middleware/auth');
const {
  validateTradingStrategy,
  validateTradingStrategyUpdate,
  validateUUID,
  validatePagination,
  validateStrategySearch,
  validateStrategyStatusUpdate
} = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TradingStrategy:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - riskLevel
 *         - category
 *         - targetAssets
 *         - timeframe
 *         - profitTarget
 *         - stopLoss
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Strategy unique identifier
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 200
 *           description: Strategy name
 *         description:
 *           type: string
 *           minLength: 10
 *           maxLength: 5000
 *           description: Detailed strategy description
 *         riskLevel:
 *           type: string
 *           enum: [low, medium, high]
 *           description: Risk level assessment
 *         category:
 *           type: string
 *           enum: [scalping, day_trading, swing_trading, position_trading, arbitrage, market_making, mean_reversion, momentum, breakout, grid_trading]
 *           description: Trading strategy category
 *         targetAssets:
 *           type: array
 *           items:
 *             type: string
 *           description: Target cryptocurrency assets
 *         timeframe:
 *           type: string
 *           enum: [1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w]
 *           description: Trading timeframe
 *         profitTarget:
 *           type: number
 *           minimum: 0.01
 *           maximum: 1000
 *           description: Profit target percentage
 *         stopLoss:
 *           type: number
 *           minimum: 0.01
 *           maximum: 100
 *           description: Stop loss percentage
 *         performanceMetrics:
 *           type: object
 *           properties:
 *             winRate:
 *               type: number
 *               description: Win rate percentage
 *             profitLoss:
 *               type: number
 *               description: Total profit/loss percentage
 *             sharpeRatio:
 *               type: number
 *               description: Risk-adjusted return metric
 *             maxDrawdown:
 *               type: number
 *               description: Maximum drawdown percentage
 *             totalTrades:
 *               type: integer
 *               description: Total number of trades
 *             avgTradeDuration:
 *               type: number
 *               description: Average trade duration in hours
 *         performanceScore:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Calculated performance score
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Strategy tags
 *         isPublic:
 *           type: boolean
 *           description: Whether strategy is publicly visible
 *         status:
 *           type: string
 *           enum: [draft, pending, approved, rejected]
 *           description: Strategy approval status
 *         rejectionReason:
 *           type: string
 *           description: Reason for rejection (if applicable)
 *         viewCount:
 *           type: integer
 *           description: Number of views
 *         likeCount:
 *           type: integer
 *           description: Number of likes
 *         createdBy:
 *           type: string
 *           format: uuid
 *           description: Creator user ID
 *         creator:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/strategies:
 *   get:
 *     summary: Get all public approved strategies
 *     tags: [Trading Strategies]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, performanceScore, riskLevel]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: riskLevel
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by risk level
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [scalping, day_trading, swing_trading, position_trading, arbitrage, market_making, mean_reversion, momentum, breakout, grid_trading]
 *         description: Filter by category
 *       - in: query
 *         name: minPerformanceScore
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           default: 0
 *         description: Minimum performance score
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Search query
 *     responses:
 *       200:
 *         description: Strategies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     strategies:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TradingStrategy'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         itemsPerPage:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       500:
 *         description: Server error
 */
router.get('/', validateStrategySearch, StrategyController.getAllStrategies);

/**
 * @swagger
 * /api/v1/strategies/top:
 *   get:
 *     summary: Get top performing strategies
 *     tags: [Trading Strategies]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of strategies to return
 *     responses:
 *       200:
 *         description: Top strategies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     strategies:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TradingStrategy'
 *       500:
 *         description: Server error
 */
router.get('/top', StrategyController.getTopStrategies);

/**
 * @swagger
 * /api/v1/strategies/my:
 *   get:
 *     summary: Get current user's strategies
 *     tags: [Trading Strategies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, rejected]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: User strategies retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/my', authenticate, requireUser, validatePagination, StrategyController.getUserStrategies);

/**
 * @swagger
 * /api/v1/strategies/pending:
 *   get:
 *     summary: Get strategies pending approval (Admin only)
 *     tags: [Trading Strategies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Pending strategies retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/pending', authenticate, requireAdmin, validatePagination, StrategyController.getPendingStrategies);

/**
 * @swagger
 * /api/v1/strategies:
 *   post:
 *     summary: Create a new strategy
 *     tags: [Trading Strategies]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - riskLevel
 *               - category
 *               - targetAssets
 *               - timeframe
 *               - profitTarget
 *               - stopLoss
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *               riskLevel:
 *                 type: string
 *                 enum: [low, medium, high]
 *               category:
 *                 type: string
 *                 enum: [scalping, day_trading, swing_trading, position_trading, arbitrage, market_making, mean_reversion, momentum, breakout, grid_trading]
 *               targetAssets:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *               timeframe:
 *                 type: string
 *                 enum: [1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w]
 *               profitTarget:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 1000
 *               stopLoss:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 100
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Strategy created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Strategy created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     strategy:
 *                       $ref: '#/components/schemas/TradingStrategy'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireUser, validateTradingStrategy, StrategyController.createStrategy);

/**
 * @swagger
 * /api/v1/strategies/{id}:
 *   get:
 *     summary: Get strategy by ID
 *     tags: [Trading Strategies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Strategy ID
 *     responses:
 *       200:
 *         description: Strategy retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     strategy:
 *                       $ref: '#/components/schemas/TradingStrategy'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Server error
 */
router.get('/:id', validateUUID, StrategyController.getStrategyById);

/**
 * @swagger
 * /api/v1/strategies/{id}:
 *   put:
 *     summary: Update strategy
 *     tags: [Trading Strategies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Strategy ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *               riskLevel:
 *                 type: string
 *                 enum: [low, medium, high]
 *               category:
 *                 type: string
 *                 enum: [scalping, day_trading, swing_trading, position_trading, arbitrage, market_making, mean_reversion, momentum, breakout, grid_trading]
 *               targetAssets:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *               profitTarget:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 1000
 *               stopLoss:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 100
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Strategy updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireUser, validateUUID, validateTradingStrategyUpdate, StrategyController.updateStrategy);

/**
 * @swagger
 * /api/v1/strategies/{id}:
 *   delete:
 *     summary: Delete strategy
 *     tags: [Trading Strategies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Strategy ID
 *     responses:
 *       200:
 *         description: Strategy deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireUser, validateUUID, StrategyController.deleteStrategy);

/**
 * @swagger
 * /api/v1/strategies/{id}/submit:
 *   post:
 *     summary: Submit strategy for approval
 *     tags: [Trading Strategies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Strategy ID
 *     responses:
 *       200:
 *         description: Strategy submitted for approval successfully
 *       400:
 *         description: Invalid status transition
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Server error
 */
router.post('/:id/submit', authenticate, requireUser, validateUUID, StrategyController.submitForApproval);

/**
 * @swagger
 * /api/v1/strategies/{id}/status:
 *   put:
 *     summary: Update strategy status (Admin only)
 *     tags: [Trading Strategies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Strategy ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               rejectionReason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Required when status is rejected
 *     responses:
 *       200:
 *         description: Strategy status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', 
  authenticate, 
  requireAdmin, 
  validateUUID, 
  validateStrategyStatusUpdate, 
  auditAdminActions('STRATEGY_STATUS_UPDATE'),
  StrategyController.updateStrategyStatus
);

module.exports = router;