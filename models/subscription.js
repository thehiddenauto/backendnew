module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stripeSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    stripePriceId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    plan: {
      type: DataTypes.ENUM('free', 'starter', 'pro', 'enterprise'),
      allowNull: false,
      defaultValue: 'free'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'canceled', 'past_due', 'unpaid'),
      defaultValue: 'active'
    },
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: true
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelAtPeriodEnd: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    trialStart: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trialEnd: {
      type: DataTypes.DATE,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'usd'
    },
    interval: {
      type: DataTypes.ENUM('month', 'year'),
      allowNull: true
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
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'subscriptions',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['stripeSubscriptionId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['plan']
      }
    ]
  });

  // Instance methods
  Subscription.prototype.isActive = function() {
    return this.status === 'active' && 
           (!this.currentPeriodEnd || new Date() < this.currentPeriodEnd);
  };

  Subscription.prototype.isInTrial = function() {
    const now = new Date();
    return this.trialStart && this.trialEnd && 
           now >= this.trialStart && now <= this.trialEnd;
  };

  Subscription.prototype.daysUntilExpiry = function() {
    if (!this.currentPeriodEnd) return null;
    
    const now = new Date();
    const diffTime = this.currentPeriodEnd - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  Subscription.prototype.getFeatures = function() {
    const features = {
      free: {
        videosPerMonth: 3,
        maxDuration: 30, // seconds
        aiScripts: false,
        customBranding: false,
        analytics: false,
        priority: false,
        storage: '100MB'
      },
      starter: {
        videosPerMonth: 25,
        maxDuration: 180, // 3 minutes
        aiScripts: true,
        customBranding: false,
        analytics: true,
        priority: false,
        storage: '1GB'
      },
      pro: {
        videosPerMonth: 100,
        maxDuration: 600, // 10 minutes
        aiScripts: true,
        customBranding: true,
        analytics: true,
        priority: true,
        storage: '10GB'
      },
      enterprise: {
        videosPerMonth: -1, // unlimited
        maxDuration: -1, // unlimited
        aiScripts: true,
        customBranding: true,
        analytics: true,
        priority: true,
        storage: 'unlimited'
      }
    };

    return features[this.plan] || features.free;
  };

  Subscription.prototype.canUpgrade = function() {
    const upgradeMap = {
      free: ['starter', 'pro', 'enterprise'],
      starter: ['pro', 'enterprise'],
      pro: ['enterprise'],
      enterprise: []
    };

    return upgradeMap[this.plan] || [];
  };

  Subscription.prototype.updateFromStripe = async function(stripeSubscription) {
    this.stripeSubscriptionId = stripeSubscription.id;
    this.status = stripeSubscription.status;
    this.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    this.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    this.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    
    if (stripeSubscription.trial_start) {
      this.trialStart = new Date(stripeSubscription.trial_start * 1000);
    }
    if (stripeSubscription.trial_end) {
      this.trialEnd = new Date(stripeSubscription.trial_end * 1000);
    }

    // Update plan based on price ID
    const planMap = {
      [process.env.STRIPE_STARTER_PRICE_ID]: 'starter',
      [process.env.STRIPE_PRO_PRICE_ID]: 'pro',
      [process.env.STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise'
    };

    if (stripeSubscription.items?.data?.[0]?.price?.id) {
      const priceId = stripeSubscription.items.data[0].price.id;
      this.plan = planMap[priceId] || this.plan;
      this.stripePriceId = priceId;
      this.amount = stripeSubscription.items.data[0].price.unit_amount / 100;
      this.interval = stripeSubscription.items.data[0].price.recurring.interval;
    }

    await this.save();
  };

  // Class methods
  Subscription.findByStripeId = function(stripeSubscriptionId) {
    return this.findOne({ 
      where: { stripeSubscriptionId },
      include: [{
        model: sequelize.models.User,
        as: 'user'
      }]
    });
  };

  Subscription.findActiveSubscriptions = function() {
    return this.findAll({
      where: { 
        status: 'active'
      },
      include: [{
        model: sequelize.models.User,
        as: 'user'
      }]
    });
  };

  Subscription.findExpiringSubscriptions = function(days = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return this.findAll({
      where: {
        status: 'active',
        currentPeriodEnd: {
          [sequelize.Op.lte]: expiryDate
        },
        cancelAtPeriodEnd: true
      },
      include: [{
        model: sequelize.models.User,
        as: 'user'
      }]
    });
  };

  return Subscription;
};
