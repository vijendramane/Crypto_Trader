const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class TradingStrategy extends Model {
  // Instance method to calculate performance score
  calculatePerformanceScore() {
    const { winRate, profitLoss, sharpeRatio, maxDrawdown } = this.performanceMetrics;
    
    if (!winRate || !profitLoss || !sharpeRatio || !maxDrawdown) {
      return 0;
    }

    // Weighted performance score calculation
    const score = (
      (winRate * 0.3) + 
      (Math.min(profitLoss, 100) * 0.3) + 
      (Math.min(sharpeRatio, 5) * 20 * 0.2) + 
      (Math.max(0, 100 - Math.abs(maxDrawdown)) * 0.2)
    );

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  // Instance method to check if strategy is profitable
  isProfitable() {
    return this.performanceMetrics?.profitLoss > 0;
  }

  // Instance method to format for public display
  toPublicJSON() {
    const values = this.toJSON();
    
    // Remove sensitive information for public view
    if (!this.isPublic) {
      delete values.description;
      delete values.performanceMetrics.detailedStats;
    }
    
    return values;
  }

  // Static method to get strategies by risk level
  static async getByRiskLevel(riskLevel, limit = 10) {
    return await this.findAll({
      where: {
        riskLevel,
        isPublic: true,
        status: 'approved'
      },
      limit,
      order: [['performanceScore', 'DESC'], ['createdAt', 'DESC']]
    });
  }

  // Static method to get top performing strategies
  static async getTopPerforming(limit = 10) {
    return await this.findAll({
      where: {
        isPublic: true,
        status: 'approved',
        performanceScore: { [sequelize.Sequelize.Op.gte]: 70 }
      },
      limit,
      order: [['performanceScore', 'DESC'], ['createdAt', 'DESC']],
      include: [{
        model: require('./User'),
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName']
      }]
    });
  }

  // Static method to search strategies
  static async search(query, options = {}) {
    const {
      limit = 20,
      offset = 0,
      riskLevel = null,
      category = null,
      minPerformanceScore = 0
    } = options;

    const whereClause = {
      isPublic: true,
      status: 'approved',
      performanceScore: { [sequelize.Sequelize.Op.gte]: minPerformanceScore }
    };

    if (riskLevel) {
      whereClause.riskLevel = riskLevel;
    }

    if (category) {
      whereClause.category = category;
    }

    if (query) {
      whereClause[sequelize.Sequelize.Op.or] = [
        { name: { [sequelize.Sequelize.Op.iLike]: `%${query}%` } },
        { description: { [sequelize.Sequelize.Op.iLike]: `%${query}%` } },
        { tags: { [sequelize.Sequelize.Op.contains]: [query] } }
      ];
    }

    return await this.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['performanceScore', 'DESC'], ['createdAt', 'DESC']],
      include: [{
        model: require('./User'),
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName']
      }]
    });
  }
}

TradingStrategy.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Strategy name is required'
      },
      len: {
        args: [3, 200],
        msg: 'Strategy name must be between 3 and 200 characters'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Strategy description is required'
      },
      len: {
        args: [10, 5000],
        msg: 'Description must be between 10 and 5000 characters'
      }
    }
  },
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['low', 'medium', 'high']],
        msg: 'Risk level must be low, medium, or high'
      }
    }
  },
  category: {
    type: DataTypes.ENUM(
      'scalping',
      'day_trading',
      'swing_trading',
      'position_trading',
      'arbitrage',
      'market_making',
      'mean_reversion',
      'momentum',
      'breakout',
      'grid_trading'
    ),
    allowNull: false,
    validate: {
      isIn: {
        args: [[
          'scalping',
          'day_trading',
          'swing_trading',
          'position_trading',
          'arbitrage',
          'market_making',
          'mean_reversion',
          'momentum',
          'breakout',
          'grid_trading'
        ]],
        msg: 'Invalid trading strategy category'
      }
    }
  },
  targetAssets: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    validate: {
      notEmpty: {
        msg: 'At least one target asset is required'
      },
      isValidAssets(value) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('Target assets must be a non-empty array');
        }
        
        const validAssets = [
          'BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'UNI', 'AAVE', 'SOL', 
          'MATIC', 'AVAX', 'ATOM', 'LTC', 'BCH', 'XRP', 'BNB', 'USDT', 'USDC'
        ];
        
        for (const asset of value) {
          if (!validAssets.includes(asset.toUpperCase())) {
            throw new Error(`Invalid asset: ${asset}. Must be one of: ${validAssets.join(', ')}`);
          }
        }
      }
    }
  },
  timeframe: {
    type: DataTypes.ENUM('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']],
        msg: 'Invalid timeframe'
      }
    }
  },
  profitTarget: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: {
        args: [0.01],
        msg: 'Profit target must be at least 0.01%'
      },
      max: {
        args: [1000],
        msg: 'Profit target cannot exceed 1000%'
      }
    }
  },
  stopLoss: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: {
        args: [0.01],
        msg: 'Stop loss must be at least 0.01%'
      },
      max: {
        args: [100],
        msg: 'Stop loss cannot exceed 100%'
      }
    }
  },
  performanceMetrics: {
    type: DataTypes.JSONB,
    defaultValue: {
      winRate: 0,
      profitLoss: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      totalTrades: 0,
      avgTradeDuration: 0,
      lastUpdated: null
    },
    validate: {
      isValidMetrics(value) {
        if (typeof value !== 'object' || value === null) {
          throw new Error('Performance metrics must be an object');
        }
        
        const requiredFields = ['winRate', 'profitLoss', 'sharpeRatio', 'maxDrawdown'];
        for (const field of requiredFields) {
          if (!(field in value)) {
            throw new Error(`Performance metrics must include ${field}`);
          }
        }
      }
    }
  },
  performanceScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
    defaultValue: 'draft',
    validate: {
      isIn: {
        args: [['draft', 'pending', 'approved', 'rejected']],
        msg: 'Status must be draft, pending, approved, or rejected'
      }
    }
  },
  rejectionReason: {
    type: DataTypes.TEXT
  },
  approvedBy: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  backtestData: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  configuration: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  sequelize,
  modelName: 'TradingStrategy',
  tableName: 'trading_strategies',
  paranoid: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['riskLevel']
    },
    {
      fields: ['category']
    },
    {
      fields: ['status']
    },
    {
      fields: ['isPublic']
    },
    {
      fields: ['createdBy']
    },
    {
      fields: ['performanceScore']
    },
    {
      fields: ['targetAssets'],
      using: 'gin'
    },
    {
      fields: ['tags'],
      using: 'gin'
    }
  ],
  hooks: {
    beforeSave: (strategy) => {
      // Calculate performance score before saving
      strategy.performanceScore = strategy.calculatePerformanceScore();
    },
    beforeUpdate: (strategy) => {
      // Recalculate performance score on update
      strategy.performanceScore = strategy.calculatePerformanceScore();
    }
  }
});

module.exports = TradingStrategy;