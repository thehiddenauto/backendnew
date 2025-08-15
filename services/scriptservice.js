const logger = require('../utils/logger');

// Script generation service with fallback for when OpenAI is not configured
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
      social: {
        structure: ['hook', 'content', 'engagement'],
        maxWords: 100
      },
      general: {
        structure: ['introduction', 'body', 'conclusion'],
        maxWords: 200
      }
    };
  }

  async generateScript(prompt, options = {}) {
    const {
      tone = 'professional',
      targetAudience = 'general',
      category = 'marketing',
      maxWords = 200
    } = options;

    logger.info(`Generating script for prompt: ${prompt.substring(0, 50)}...`);

    try {
      // Try OpenAI first if available
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key') {
        try {
          const aiScript = await this.generateWithOpenAI(prompt, options);
          if (aiScript) return aiScript;
        } catch (aiError) {
          logger.warn('OpenAI generation failed, using fallback:', aiError.message);
        }
      }

      // Fallback to template-based generation
      const script = this.generateFallbackScript(prompt, tone, targetAudience, maxWords);
      
      return {
        title: this.generateTitle(prompt),
        content: script,
        structure: this.parseScriptStructure(script),
        wordCount: this.countWords(script),
        estimatedDuration: this.estimateDuration(script),
        tone,
        targetAudience,
        category,
        metadata: {
          prompt,
          generatedAt: new Date().toISOString(),
          model: 'fallback'
        }
      };
    } catch (error) {
      logger.error('Script generation error:', error);
      throw new Error('Failed to generate script');
    }
  }

  async generateWithOpenAI(prompt, options) {
    // Placeholder for OpenAI integration
    // This would use the OpenAI API if properly configured
    return null;
  }

  generateFallbackScript(prompt, tone, audience, maxWords) {
    const scripts = {
      professional: {
        marketing: `Introducing our innovative solution for ${prompt}. In today's competitive market, businesses need reliable tools that deliver measurable results. Our platform addresses these challenges with cutting-edge technology and user-friendly design. Join thousands of satisfied customers who have transformed their operations. Experience the difference today and unlock your potential for success.`,
        educational: `Let's explore the fascinating world of ${prompt}. Understanding this concept is crucial for anyone looking to expand their knowledge. We'll break down complex ideas into simple, digestible parts. Through practical examples and clear explanations, you'll gain valuable insights. By the end, you'll have a solid foundation to build upon.`,
        social: `🔥 Ready to discover something amazing about ${prompt}? This is going to change everything you thought you knew! Swipe to see the incredible results. Tag someone who needs to see this! #Amazing #MustSee #Viral`,
        entertainment: `Welcome to an incredible journey into ${prompt}! Get ready for twists, turns, and surprises that will keep you on the edge of your seat. Our story unfolds with unexpected revelations that challenge everything you thought you knew. Prepare for an unforgettable experience!`
      },
      casual: {
        marketing: `Hey there! Looking for something amazing related to ${prompt}? You've come to the right place! We've built something really cool that's going to blow your mind. It's super easy to use and gets results fast. Don't just take our word for it - try it yourself and see the magic happen!`,
        educational: `Hey everyone! Today we're diving into ${prompt} and trust me, it's going to be awesome! I'll show you everything you need to know in a fun and easy way. No boring stuff here - just practical tips you can use right away. Let's get started!`,
        social: `OMG you guys!! 😍 Just discovered this amazing thing about ${prompt} and I'm literally obsessed! You HAVE to try this!! Comment below if you want the details! #Amazing #Love #Share`,
        entertainment: `Buckle up friends, because we're about to go on a wild ride exploring ${prompt}! Things are about to get crazy and I can't wait to share this adventure with you. Let's see where this takes us!`
      },
      humorous: {
        marketing: `So, you want to know about ${prompt}? Well, buckle up buttercup, because we're about to take you on a wild ride! Imagine if efficiency and fun had a baby - that's our solution! It's so good, even your coffee will taste better after using it. Ready to join the party?`,
        educational: `Alright class, today we're learning about ${prompt} - and no, you can't sleep through this one! Don't worry, I promise to make it more fun than watching paint dry. By the end of this, you'll be the smartest person at parties (well, at least on this topic)!`,
        social: `Plot twist: ${prompt} is actually the secret to happiness! 😂 Who knew?! Your mind = BLOWN 🤯 Share if you're as confused as I am! #PlotTwist #Confused #Help`,
        entertainment: `Ladies and gentlemen, boys and girls, welcome to the absolutely ridiculous world of ${prompt}! Warning: side effects may include uncontrollable laughter and the sudden urge to tell everyone about this. You've been warned!`
      }
    };

    const categoryScripts = scripts[tone] || scripts.professional;
    let script = categoryScripts[options.category] || categoryScripts.marketing || scripts.professional.marketing;
    
    // Trim to max words if needed
    const words = script.split(' ');
    if (words.length > maxWords) {
      script = words.slice(0, maxWords).join(' ') + '...';
    }
    
    return script;
  }

  async generateDemoScript(prompt, options = {}) {
    const script = await this.generateScript(prompt, { ...options, maxWords: 100 });
    
    return {
      ...script,
      isDemo: true,
      limitations: [
        'Limited to 100 words',
        'Basic structure only',
        'Standard templates'
      ]
    };
  }

  generateTitle(prompt) {
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
    const words = this.countWords(text);
    const wordsPerMinute = 160;
    return Math.ceil((words / wordsPerMinute) * 60);
  }

  parseScriptStructure(content) {
    // Simple structure parsing
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return {
      introduction: sentences[0] || '',
      body: sentences.slice(1, -1).join('. ') || '',
      conclusion: sentences[sentences.length - 1] || ''
    };
  }

  async getScriptSuggestions(category, tone, targetAudience) {
    const suggestions = [
      'Introduce our revolutionary new product that solves everyday problems',
      'Showcase customer testimonials and success stories',
      'Highlight key features and competitive advantages',
      'Explain how our solution saves time and money',
      'Create engaging content that converts viewers to customers',
      'Tell a compelling brand story that resonates with your audience',
      'Demonstrate the before and after transformation',
      'Address common objections and provide clear solutions'
    ];

    return suggestions;
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

const getScriptSuggestions = async (category, tone, targetAudience) => {
  return await scriptService.getScriptSuggestions(category, tone, targetAudience);
};

module.exports = {
  generateScript,
  generateDemoScript,
  getScriptSuggestions,
  ScriptGenerationService
};
