const logger = require('../utils/logger');

// Mock video generation service for demo purposes
class VideoGenerationService {
  constructor() {
    this.processingQueue = new Map();
  }

  async generateVideo(videoId) {
    try {
      console.log(`Starting video generation for ${videoId}`);
      
      // Simulate video processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Return mock success
      return {
        id: videoId,
        status: 'completed',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnailUrl: 'https://via.placeholder.com/1280x720/4F46E5/FFFFFF?text=AI+Generated+Video'
      };
    } catch (error) {
      console.error(`Video generation failed for ${videoId}:`, error);
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
      }
    ];

    // Return a random demo video
    const randomVideo = demoVideos[Math.floor(Math.random() * demoVideos.length)];
    
    return {
      ...randomVideo,
      prompt,
      status: 'completed',
      processingTime: Math.floor(Math.random() * 30) + 10,
      ...options
    };
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

module.exports = {
  generateVideo,
  generateDemoVideo,
  VideoGenerationService
};
