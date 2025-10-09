const { sequelize } = require('../config/database');
const User = require('./User');
const TradingStrategy = require('./TradingStrategy');

// Define associations
const defineAssociations = () => {
  // User has many TradingStrategies
  User.hasMany(TradingStrategy, {
    foreignKey: 'createdBy',
    as: 'strategies',
    onDelete: 'CASCADE'
  });

  // TradingStrategy belongs to User (creator)
  TradingStrategy.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });

  // TradingStrategy belongs to User (approver) - for admin approval
  TradingStrategy.belongsTo(User, {
    foreignKey: 'approvedBy',
    as: 'approver'
  });

  // User can approve many strategies
  User.hasMany(TradingStrategy, {
    foreignKey: 'approvedBy',
    as: 'approvedStrategies'
  });
};

// Initialize associations
defineAssociations();

// Sync database (for development only)
const syncDatabase = async (options = {}) => {
  try {
    const { force = false, alter = false } = options;
    
    await sequelize.sync({ force, alter });
    
    if (force) {
      console.log('⚠️ Database tables dropped and recreated');
    } else if (alter) {
      console.log('📝 Database tables altered to match models');
    } else {
      console.log('✅ Database synchronized successfully');
    }
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

// Get all models
const models = {
  User,
  TradingStrategy,
  sequelize
};

module.exports = {
  ...models,
  syncDatabase,
  defineAssociations
};