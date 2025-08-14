const OpenAI = require('openai');
const { models } = require('../config/database');
const logger = require('../utils/logger');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class ScriptGenerationService {
  constructor() {
    this.templates = {
      marketing: {
        structure: ['hook', 'problem', 'solution', 'benefits', 'cta'],
        maxWords: 150
      },
      educational: {
        structure: ['introduction', 'explanation', 'examples', 'summary'],
        maxWords: 300
      },
      entertainment: {
        structure: ['opening', 'buildup', 'climax', 'resolution'],
        maxWords: 200
      },
      product: {
        structure: ['introduction', 'features', 'benefits', 'social_proof', 'cta'],
        maxWords: 180
      }
    };
  }

  async generateScript(prompt, options = {}) {
    try {
      const {
        tone = 'professional',
        targetAudience = 'general',
        category = 'marketing',
        maxWords = 200,
        language = 'en'
      } = options;

      logger.info(`Generating script for prompt: ${prompt.substring(0, 50)}...`);

      const template = this.templates[category] || this.templates.marketing;
      const systemPrompt = this.buildSystemPrompt(tone, targetAudience, template, maxWords, language);

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: Math.min(maxWords * 2, 1000),
        temperature: 0.7
      });

      const content = response.choices[0].message.content.trim();
      
      // Parse the response to extract structure
      const script = this.parseScriptResponse(content, template);
      
      return {
        title: this.generateTitle(prompt),
        content: script.content,
        structure: script.structure,
        wordCount: this.countWords(script.content),
        estimatedDuration: this.estimateDuration(script.content),
        tone,
        targetAudience,
        category,
        metadata: {
          prompt,
          generatedAt: new Date().toISOString(),
          model: 'gpt-4'
        }
      };

    } catch (error) {
      logger.error('Script generation failed:', error);
      throw new Error('Failed to generate script');
    }
  }

  buildSystemPrompt(tone, targetAudience, template, maxWords, language) {
    return `You are an expert scriptwriter creating engaging video scripts. 

Generate a ${tone} script for ${targetAudience} audience with exactly ${maxWords} words or fewer.

Structure the script with these sections: ${template.structure.join(', ')}.

Guidelines:
- Write in ${language}
- Use ${tone} tone throughout
- Make it engaging and concise
- Include natural pauses and emphasis
- Optimize for ${targetAudience} audience
- Each section should flow naturally

Format your response as a cohesive script without section headers. Write it as spoken content that will be converted to video.`;
  }

  parseScriptResponse(content, template) {
    // Simple parsing - in a real implementation, you might use more sophisticated NLP
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sectionsCount = template.structure.length;
    const sentencesPerSection = Math.ceil(sentences.length / sectionsCount);
    
    const structure = {};
    template.structure.forEach((section, index) => {
      const start = index * sentencesPerSection;
      const end = Math.min((index + 1) * sentencesPerSection, sentences.length);
      structure[section] = sentences.slice(start, end).join('. ').trim() + '.';
    });

    return {
      content,
      structure
    };
  }

  generateTitle(prompt) {
    // Extract key words and create a title
    const words = prompt.split(' ').filter(word => word.length > 3);
    const keyWords = words.slice(0, 3);
    return keyWords.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ') + ' Script';
  }

  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  estimateDuration(text) {
    // Average speaking rate is 150-180 words per minute
    const words = this.countWords(text);
    const wordsPerMinute = 160;
    return Math.ceil((words / wordsPerMinute) * 60); // Return seconds
  }

  async generateDemoScript(prompt, options = {}) {
    try {
      const demoOptions = {
        ...options,
        maxWords: 100, // Limit for demo
        category: 'marketing'
      };

      const script = await this.generateScript(prompt, demoOptions);
      
      return {
        ...script,
        isDemo: true,
        limitations: [
          'Limited to 100 words',
          'Basic structure only',
          'Standard templates'
        ]
      };

    } catch (error) {
      logger.warn('Demo script generation failed, using fallback:', error);
      
      // Fallback demo script
      return {
        title: 'Demo Script',
        content: `Welcome to our amazing ${prompt}! This is a demo script that showcases how our AI can create engaging content for your videos. With our advanced technology, you can generate professional scripts in seconds. Whether you're creating marketing content, educational videos, or entertainment, our AI adapts to your needs. Sign up today to unlock the full potential of AI-powered script generation!`,
        wordCount: 65,
        estimatedDuration: 25,
        tone: options.tone || 'professional',
        targetAudience: options.targetAudience || 'general',
        category: 'demo',
        isDemo: true,
        structure: {
          hook: 'Welcome to our amazing ' + prompt + '!',
          problem: 'This is a demo script that showcases how our AI can create engaging content.',
          solution: 'With our advanced technology, you can generate professional scripts in seconds.',
          benefits: 'Whether you\'re creating marketing content, educational videos, or entertainment, our AI adapts to your needs.',
          cta: 'Sign up today to unlock the full potential of AI-powered script generation!'
        }
      };
    }
  }

  async enhanceScript(scriptId, enhancements) {
    try {
      const script = await models.Script.findByPk(scriptId);
      if (!script) {
        throw new Error('Script not found');
      }

      const enhancementPrompt = `Enhance this video script based on the following requirements:
${Object.entries(enhancements).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Original script:
${script.content}

Provide an enhanced version that maintains the original meaning while incorporating the requested improvements.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert script editor. Enhance the given script while maintaining its core message and flow.' },
          { role: 'user', content: enhancementPrompt }
        ],
        max_tokens: 800,
        temperature: 0.6
      });

      const enhancedContent = response.choices[0].message.content.trim();
      
      // Update script
      await script.update({
        content: enhancedContent,
        wordCount: this.countWords(enhancedContent),
        duration: this.estimateDuration(enhancedContent),
        metadata: {
          ...script.metadata,
          enhanced: true,
          enhancements,
          enhancedAt: new Date().toISOString()
        }
      });

      return script;

    } catch (error) {
      logger.error('Script enhancement failed:', error);
      throw new Error('Failed to enhance script');
    }
  }

  async getScriptSuggestions(category, tone, targetAudience) {
    const suggestions = {
      marketing: {
        professional: {
          general: [
            'Introduce our revolutionary new product that solves everyday problems',
            'Showcase customer testimonials and success stories',
            'Highlight key features and competitive advantages'
          ],
          business: [
            'Present quarterly results and growth metrics',
            'Explain our B2B solution and ROI benefits',
            'Address common enterprise challenges'
          ]
        },
        casual: {
          general: [
            'Share behind-the-scenes moments of our team',
            'Create a fun product unboxing experience',
            'Tell the story of how our company started'
          ]
        }
      },
      educational: {
        professional: {
          general: [
            'Explain complex concepts in simple terms',
            'Create a step-by-step tutorial guide',
            'Compare different approaches to solving problems'
          ]
        }
      },
      entertainment: {
        humorous: {
          general: [
            'Create a funny take on everyday situations',
            'Parody popular trends or memes',
            'Tell amusing stories with unexpected twists'
          ]
        }
      }
    };

    return suggestions[category]?.[tone]?.[targetAudience] || 
           suggestions[category]?.[tone]?.general || 
           suggestions.marketing.professional.general;
  }
}

// Create singleton instance
const scriptService = new ScriptGenerationService();

// Export functions
const generateScript = async (prompt, options) => {
  return await scriptService.generateScript(prompt, options);
};

const generateDemoScript = async (prompt, options) => {
  return await scriptService.generateDemoScript(prompt, options);
};

const enhanceScript = async (scriptId, enhancements) => {
  return await scriptService.enhanceScript(scriptId, enhancements);
};

const getScriptSuggestions = async (category, tone, targetAudience) => {
  return await scriptService.getScriptSuggestions(category, tone, targetAudience);
};

module.exports = {
  generateScript,
  generateDemoScript,
  enhanceScript,
  getScriptSuggestions,
  ScriptGenerationService
};
