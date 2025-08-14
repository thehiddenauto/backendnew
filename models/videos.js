module.exports = (sequelize, DataTypes) => {
  const Video = sequelize.define('Video', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER, // Duration in seconds
      allowNull: true
    },
    resolution: {
      type: DataTypes.STRING,
      defaultValue: '1920x1080'
    },
    fps: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    processingProgress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    style: {
      type: DataTypes.STRING,
      allowNull: true // e.g., 'cinematic', 'cartoon', 'realistic'
    },
    mood: {
      type: DataTypes.STRING,
      allowNull: true // e.g., 'energetic', 'calm', 'dramatic'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true // e.g., 'marketing', 'educational', 'entertainment'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
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
    scriptId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'scripts',
        key: 'id'
      },
      onDelete: 'SET NULL'
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
    tableName: 'videos',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['category']
      },
      {
        fields: ['isPublic']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // Instance methods
  Video.prototype.updateProgress = async function(progress) {
    this.processingProgress = Math.min(100, Math.max(0, progress));
    await this.save();
  };

  Video.prototype.markAsCompleted = async function(videoUrl, thumbnailUrl = null) {
    this.status = 'completed';
    this.processingProgress = 100;
    this.videoUrl = videoUrl;
    if (thumbnailUrl) {
      this.thumbnailUrl = thumbnailUrl;
    }
    await this.save();
  };

  Video.prototype.markAsFailed = async function(error = null) {
    this.status = 'failed';
    if (error) {
      this.metadata = { ...this.metadata, error: error.message || error };
    }
    await this.save();
  };

  Video.prototype.incrementView = async function() {
    this.views += 1;
    await this.save();
  };

  Video.prototype.toggleLike = async function() {
    this.likes += 1;
    await this.save();
  };

  Video.prototype.getDurationFormatted = function() {
    if (!this.duration) return '0:00';
    
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Class methods
  Video.findByUser = function(userId, options = {}) {
    return this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      ...options
    });
  };

  Video.findPublicVideos = function(limit = 20) {
    return this.findAll({
      where: { 
        isPublic: true,
        status: 'completed'
      },
      order: [['views', 'DESC'], ['createdAt', 'DESC']],
      limit,
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'avatar']
      }]
    });
  };

  Video.findByStatus = function(status) {
    return this.findAll({
      where: { status },
      order: [['createdAt', 'ASC']]
    });
  };

  Video.getStatsByUser = async function(userId) {
    const videos = await this.findAll({
      where: { userId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalVideos'],
        [sequelize.fn('SUM', sequelize.col('views')), 'totalViews'],
        [sequelize.fn('SUM', sequelize.col('likes')), 'totalLikes'],
        [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']
      ]
    });
    
    return videos[0]?.dataValues || {
      totalVideos: 0,
      totalViews: 0,
      totalLikes: 0,
      avgDuration: 0
    };
  };

  return Video;
};
