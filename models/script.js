module.exports = (sequelize, DataTypes) => {
  const Script = sequelize.define('Script', {
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tone: {
      type: DataTypes.STRING,
      allowNull: true // e.g., 'professional', 'casual', 'humorous', 'dramatic'
    },
    targetAudience: {
      type: DataTypes.STRING,
      allowNull: true // e.g., 'teenagers', 'professionals', 'parents'
    },
    duration: {
      type: DataTypes.INTEGER, // Estimated duration in seconds
      allowNull: true
    },
    wordCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    language: {
      type: DataTypes.STRING,
      defaultValue: 'en'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true // e.g., 'marketing', 'educational', 'entertainment'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    isTemplate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    structure: {
      type: DataTypes.JSON,
      defaultValue: {} // For storing script structure: intro, body, conclusion, etc.
    },
    usage: {
      type: DataTypes.INTEGER,
      defaultValue: 0 // How many times this script has been used
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 5
      }
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
    tableName: 'scripts',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['category']
      },
      {
        fields: ['isTemplate']
      },
      {
        fields: ['isPublic']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeSave: (script) => {
        // Calculate word count
        if (script.content) {
          script.wordCount = script.content.trim().split(/\s+/).length;
        }
        
        // Estimate duration (average reading speed: 150-200 words per minute)
        if (script.wordCount) {
          script.duration = Math.ceil((script.wordCount / 175) * 60); // seconds
        }
      }
    }
  });

  // Instance methods
  Script.prototype.incrementUsage = async function() {
    this.usage += 1;
    await this.save();
  };

  Script.prototype.updateRating = async function(newRating, totalRatings) {
    // Simple average rating calculation
    if (this.rating === null) {
      this.rating = newRating;
    } else {
      this.rating = ((this.rating * (totalRatings - 1)) + newRating) / totalRatings;
    }
    await this.save();
  };

  Script.prototype.getDurationFormatted = function() {
    if (!this.duration) return '0:00';
    
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  Script.prototype.getWordCountFormatted = function() {
    return `${this.wordCount} words`;
  };

  Script.prototype.getPreview = function(length = 100) {
    if (!this.content) return '';
    return this.content.length > length 
      ? this.content.substring(0, length) + '...'
      : this.content;
  };

  // Class methods
  Script.findByUser = function(userId, options = {}) {
    return this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      ...options
    });
  };

  Script.findTemplates = function(limit = 20) {
    return this.findAll({
      where: { 
        isTemplate: true,
        isPublic: true
      },
      order: [['usage', 'DESC'], ['rating', 'DESC']],
      limit,
      include
