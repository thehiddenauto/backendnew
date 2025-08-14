const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Database configuration
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

// Import models
const User = require('../models/User');
const Video = require('../models/Video');
const Script = require('../models/Script');
const Subscription = require('../models/Subscription');
const Usage = require('../models/Usage');

// Initialize models
const models = {
  User: User(sequelize, Sequelize.DataTypes),
  Video: Video(sequelize, Sequelize.DataTypes),
  Script: Script(sequelize, Sequelize.DataTypes),
  Subscription: Subscription(sequelize, Sequelize.DataTypes),
  Usage: Usage(sequelize, Sequelize.DataTypes)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Set up associations
models.User.hasMany(models.Video, { foreignKey: 'userId', as: 'videos' });
models.Video.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

models.User.hasMany(models.Script, { foreignKey: 'userId', as: 'scripts' });
models.Script.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

models.Video.belongsTo(models.Script, { foreignKey: 'scriptId', as: 'script' });
models.Script.hasMany(models.Video, { foreignKey: 'scriptId', as: 'videos' });

models.User.hasOne(models.Subscription, { foreignKey: 'userId', as: 'subscription' });
models.Subscription.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

models.User.hasMany(models.Usage, { foreignKey: 'userId', as: 'usage' });
models.Usage.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

// Database connection and synchronization
async function initDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized');
    }
    
    return sequelize;
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
}

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  models,
  initDatabase,
  testConnection
};
