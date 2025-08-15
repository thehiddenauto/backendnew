const logger = require('../utils/logger');
const { models } = require('../config/database');

// Mock video generation service for demo purposes
class VideoGenerationService {
  constructor() {
    this.processingQueue = new Map();
  }

  async generateVideo(videoId) {
    try {
      logger.info(`Starting video generation for ${videoId}`);
      
      // Get video from database
      const video = await models.Video.findByPk(videoId);
      if (!video) {
        throw new Error(`Video ${videoId} not found`);
      }

      // Update status to processing
      await video.update({ 
        status: 'processing',
        processingProgress: 10
      });

      // Emit progress update
      this.emitProgress(video.userId, videoId, 10, 'Processing started');

      // Simulate AI processing steps
      const steps = [
        { progress: 25, message: 'Analyzing prompt' },
        { progress: 50, message: 'Generating scenes' },
        { progress: 75, message: 'Rendering video' },
        { progress: 90, message: 'Adding effects' },
        { progress: 100, message: 'Finalizing' }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        await video.update({ processingProgress: step.progress });
        this.emitProgress(video.userId, videoId, step.progress, step.message);
      }

      // Generate mock video URL
      const videoUrl = this.generateMockVideoUrl(videoId);
      const thumbnailUrl = this.generateMockThumbnailUrl(videoId);

      // Mark as completed
      await video.markAsCompleted(videoUrl, thumbnailUrl);

      // Emit completion
      this.emitProgress(video.userId, videoId, 100, 'Video completed successfully');

      logger.info(`Video generation completed for ${videoId}`);
      
      return {
        id: videoId,
        status: 'completed',
        videoUrl,
        thumbnailUrl
      };

    } catch (error) {
      logger.error(`Video generation failed for ${videoId}:`, error);
      
      // Mark as failed
      try {
        const video = await models.Video.findByPk(videoId);
        if (video) {
          await video.markAsFailed(error);
          this.emitProgress(video.userId, videoId, 0, 'Video generation failed');
        }
      } catch (updateError) {
        logger.error('Failed to update video status:', updateError);
      }
      
      throw error;
    }
  }

  async generateDemoVideo(prompt, options = {}) {
    const demoVideos = [
      {
        title: 'AI Product Launch',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnail: 'https://via.placeholder.com/1280x720/4F46E5/FFFFFF?text=AI+Product+Launch',
        description: 'Professional product launch video generated with AI'
      },
      {
        title: 'Marketing Campaign',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        thumbnail: 'https://via.placeholder.com/1280x720/7C3AED/FFFFFF?text=Marketing+Campaign',
        description: 'Engaging marketing content created using AI technology'
      },
      {
        title: 'Educational Content',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1920x1080_1mb.mp4',
        thumbnail: 'https://via.placeholder.com/1920x1080/059669/FFFFFF?text=Educational+Content',
        description: 'Educational video content powered by artificial intelligence'
      },
      {
        title: 'Social Media Story',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
        thumbnail: 'https://via.placeholder.com/1280x720/DC2626/FFFFFF?text=Social+Media',
        description: 'Engaging social media content for viral reach'
      }
    ];

    // Return a random demo video
    const randomVideo = demoVideos[Math.floor(Math.random() * demoVideos.length)];
    
    return {
      ...randomVideo,
      prompt,
      status: 'completed',
      processingTime: Math.floor(Math.random() * 30) + 10,
      isDemo: true,
      watermark: true,
      ...options
    };
  }

  generateMockVideoUrl(videoId) {
    const baseUrls = [
      'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
      'https://sample-videos.com/zip/10/mp4/SampleVideo_1920x1080_1mb.mp4',
      'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4'
    ];
    
    const index = videoId.charCodeAt(0) % baseUrls.length;
    return baseUrls[index];
  }

  generateMockThumbnailUrl(videoId) {
    const colors = ['4F46E5', '7C3AED', '059669', 'DC2626', 'F59E0B'];
    const index = videoId.charCodeAt(0) % colors.length;
    const color = colors[index];
    
    return `https://via.placeholder.com/1280x720/${color}/FFFFFF?text=AI+Generated+Video`;
  }

  emitProgress(userId, videoId, progress, message) {
    try {
      // Get Socket.io instance from global app if available
      const io = global.io || require('../server').io;
      if (io) {
        io.to(`user-${userId}`).emit('video_progress', {
          videoId,
          progress,
          message,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.warn('Failed to emit progress update:', error.message);
    }
  }

  // Queue management
  addToQueue(videoId) {
    this.processingQueue.set(videoId, {
      status: 'queued',
      startTime: Date.now()
    });
  }

  removeFromQueue(videoId) {
    this.processingQueue.delete(videoId);
  }

  getQueueStatus() {
    return Array.from(this.processingQueue.entries()).map(([id, data]) => ({
      videoId: id,
      ...data
    }));
  }
}

// Create singleton instance
const videoService = new VideoGenerationService();

// Export functions
const generateVideo = async (videoId) => {
  return await videoService.generateVideo(videoId);
};

const generateDemoVideo = async (prompt, options) => {
  return await videoService.generateDemoVideo(prompt, options);
};

const getQueueStatus = () => {
  return videoService.getQueueStatus();
};

module.exports = {
  generateVideo,
  generateDemoVideo,
  getQueueStatus,
  VideoGenerationService
};
