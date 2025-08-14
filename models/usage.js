module.exports = (sequelize, DataTypes) => {
  const Usage = sequelize.define('Usage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('video_generation', 'script_generation', 'storage', 'api_call'),
      allowNull: false
    },
    amount: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    period: {
      type: DataTypes.STRING, // Format: YYYY-MM
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'usage',
    timestamps: false,
    indexes: [
      {
        fields: ['userId', 'period']
      },
      {
        fields: ['type']
      },
      {
        fields: ['period']
      }
    ],
    hooks: {
      beforeCreate: (usage) => {
        if (!usage.period) {
          const now = new Date();
          usage.period = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        }
      }
    }
  });

  // Class methods
  Usage.recordUsage = async function(userId, type, amount = 1, metadata = {}) {
    const now = new Date();
    const period = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    // Check if usage record already exists for this period
    const existingUsage = await this.findOne({
      where: { userId, type, period }
    });

    if (existingUsage) {
      existingUsage.amount += amount;
      existingUsage.metadata = { ...existingUsage.metadata, ...metadata };
      await existingUsage.save();
      return existingUsage;
    } else {
      return await this.create({
        userId,
        type,
        amount,
        period,
        metadata
      });
    }
  };

  Usage.getMonthlyUsage = async function(userId, year = null, month = null) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || (now.getMonth() + 1);
    const period = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;

    return await this.findAll({
      where: { userId, period },
      order: [['type', 'ASC']]
    });
  };

  Usage.getUserStats = async function(userId, months = 6) {
    const now = new Date();
    const periods = [];
    
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    }

    const usage = await this.findAll({
      where: {
        userId,
        period: { [sequelize.Op.in]: periods }
      },
      attributes: [
        'period',
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['period', 'type'],
      order: [['period', 'DESC']]
    });

    return usage;
  };

  Usage.checkLimit = async function(userId, type, limit) {
    const now = new Date();
    const period = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const usage = await this.findOne({
      where: { userId, type, period }
    });

    const currentUsage = usage ? usage.amount : 0;
    return {
      current: currentUsage,
      limit: limit,
      remaining: Math.max(0, limit - currentUsage),
      canUse: limit === -1 || currentUsage < limit
    };
  };

  Usage.getTotalUsage = async function(type = null, startDate = null, endDate = null) {
    const whereClause = {};
    
    if (type) {
      whereClause.type = type;
    }
    
    if (startDate && endDate) {
      const startPeriod = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const endPeriod = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}`;
      whereClause.period = {
        [sequelize.Op.between]: [startPeriod, endPeriod]
      };
    }

    return await this.findAll({
      where: whereClause,
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'uniqueUsers']
      ],
      group: ['type']
    });
  };

  Usage.getTopUsers = async function(type = null, period = null, limit = 10) {
    const whereClause = {};
    
    if (type) {
      whereClause.type = type;
    }
    
    if (period) {
      whereClause.period = period;
    } else {
      const now = new Date();
      whereClause.period = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    return await this.findAll({
      where: whereClause,
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['userId'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      limit,
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email', 'plan']
      }]
    });
  };

  return Usage;
};
