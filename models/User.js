const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100]
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    plan: {
      type: DataTypes.ENUM('free', 'starter', 'pro', 'enterprise'),
      defaultValue: 'free'
    },
    videosGenerated: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    videosLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 3 // Free plan limit
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    }
  });

  // Instance methods
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  User.prototype.canGenerateVideo = function() {
    return this.videosGenerated < this.videosLimit;
  };

  User.prototype.incrementVideoCount = async function() {
    this.videosGenerated += 1;
    await this.save();
  };

  User.prototype.updatePlanLimits = function(plan) {
    const limits = {
      free: 3,
      starter: 25,
      pro: 100,
      enterprise: -1 // Unlimited
    };
    
    this.plan = plan;
    this.videosLimit = limits[plan];
  };

  User.prototype.toJSON = function() {
    const user = { ...this.get() };
    delete user.password;
    return user;
  };

  // Class methods
  User.findByEmail = function(email) {
    return this.findOne({ where: { email: email.toLowerCase() } });
  };

  User.findActiveUsers = function() {
    return this.findAll({ where: { isActive: true } });
  };

  return User;
};
