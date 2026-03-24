/**
 * Python NLP Service Client
 * Version: 9.8.0
 * 
 * Client for communicating with the Python FastAPI NLP service
 * Used by rally-workflow-v9.8.0-hybrid.js
 */

const http = require('http');

class PythonNLPClient {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.timeout = 30000;
  }

  /**
   * Make HTTP request to Python service
   */
  async request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 5000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(body));
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${body}`));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(this.timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  /**
   * Health check - returns service status
   */
  async healthCheck() {
    try {
      const result = await this.request('GET', '/health');
      return {
        healthy: result.status === 'healthy',
        version: result.version,
        services: {
          sentiment_vader: result.services?.sentiment?.vader || false,
          sentiment_textblob: result.services?.sentiment?.textblob || false,
          readability_textstat: result.services?.readability?.textstat || false,
          ner_spacy: result.services?.ner?.spacy || false,
          semantic_similarity: result.services?.semantic_similarity || false,
          grammar: result.services?.grammar || false
        }
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Full content analysis
   */
  async analyzeContent(content, campaignContext = null, competitorContents = []) {
    return await this.request('POST', '/api/content/analyze', {
      content: content,
      campaign_context: campaignContext,
      competitor_contents: competitorContents || []
    });
  }

  /**
   * Check semantic similarity
   */
  async checkSimilarity(newContent, competitorContents, threshold = 0.7) {
    return await this.request('POST', '/api/similarity/check', {
      new_content: newContent,
      competitor_contents: competitorContents,
      threshold: threshold
    });
  }

  /**
   * Detect emotions
   */
  async detectEmotions(content, detailed = false) {
    return await this.request('POST', '/api/emotions/detect', {
      content: content,
      detailed: detailed
    });
  }

  /**
   * Analyze uniqueness
   */
  async analyzeUniqueness(content, competitorContents, campaignContext = null) {
    return await this.request('POST', '/api/uniqueness/analyze', {
      content: content,
      competitor_contents: competitorContents,
      campaign_context: campaignContext
    });
  }

  /**
   * Check grammar
   */
  async checkGrammar(content) {
    return await this.request('POST', '/api/grammar/check', {
      content: content
    });
  }

  /**
   * Compare two texts
   */
  async compareTexts(text1, text2) {
    return await this.request('POST', '/api/compare', {
      text1: text1,
      text2: text2
    });
  }

  /**
   * Analyze content depth
   */
  async analyzeDepth(content, requiredElements = null) {
    return await this.request('POST', '/api/depth/analyze', {
      content: content,
      required_elements: requiredElements
    });
  }

  /**
   * Check anti-template
   */
  async checkAntiTemplate(content, templatePatterns = null, threshold = 0.85) {
    return await this.request('POST', '/api/antitemplate/check', {
      content: content,
      template_patterns: templatePatterns,
      threshold: threshold
    });
  }
}

module.exports = PythonNLPClient;
