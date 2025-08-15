const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
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

// Initialize models
let models = null;

function initModels() {
  if (models) return models;

  try {
    const User = require('../models/User')(sequelize, Sequelize.DataTypes);
    const Video = require('../models/videos')(sequelize, Sequelize.DataTypes);
    const Script = require('../models/script')(sequelize, Sequelize.DataTypes);
    const Subscription = require('../models/subscription')(sequelize, Sequelize.DataTypes);
    const Usage = require('../models/usage')(sequelize, Sequelize.DataTypes);

    // Set up associations
    User.hasMany(Video, { foreignKey: 'userId', as: 'videos' });
    Video.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    User.hasMany(Script, { foreignKey: 'userId', as: 'scripts' });
    Script.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    Video.belongsTo(Script, { foreignKey: 'scriptId', as: 'script' });
    Script.hasMany(Video, { foreignKey: 'scriptId', as: 'videos' });

    User.hasOne(Subscription, { foreignKey: 'userId', as: 'subscription' });
    Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    User.hasMany(Usage, { foreignKey: 'userId', as: 'usage' });
    Usage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    models = { User, Video, Script, Subscription, Usage };
    return models;
  } catch (error) {
    console.error('Model initialization error:', error);
    throw error;
  }
}

// Database connection and synchronization
async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Initialize models
    initModels();
    
    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized');
    }
    
    return sequelize;
  } catch (error) {
    console.error('Unable to connect to database:', error);
    throw error;
  }
}

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  get models() { 
    return initModels();
  },
  initDatabase,
  testConnection
};
