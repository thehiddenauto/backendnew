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

    console.log(`Generating script for prompt: ${prompt.substring(0, 50)}...`);

    // Fallback script generation when OpenAI is not available
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
  }

  generateFallbackScript(prompt, tone, audience, maxWords) {
    const scripts = {
      professional: `Welcome to our innovative solution for ${prompt}. In today's competitive market, businesses need reliable tools that deliver results. Our platform addresses these challenges with cutting-edge technology and user-friendly design. Join thousands of satisfied customers who have transformed their operations. Experience the difference today and unlock your potential for success.`,
      casual: `Hey there! Looking for something amazing related to ${prompt}? You've come to the right place! We've built something really cool that's going to blow your mind. It's super easy to use and gets results fast. Don't just take our word for it - try it yourself and see the magic happen!`,
      humorous: `So, you want to know about ${prompt}? Well, buckle up buttercup, because we're about to take you on a wild ride! Imagine if efficiency and fun had a baby - that's our solution! It's so good, even your coffee will taste better after using it. Ready to join the party?`
    };

    let script = scripts[tone] || scripts.professional;
    
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
      'Create engaging content that converts viewers to customers'
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
