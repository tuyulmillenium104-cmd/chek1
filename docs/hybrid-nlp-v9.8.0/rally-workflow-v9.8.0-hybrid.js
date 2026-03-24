/**
 * RALLY WORKFLOW V9.8.0 - HYBRID JavaScript + Python NLP System
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🐍 HYBRID ARCHITECTURE - Python NLP + JavaScript AI/SDK
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This version combines:
 * - JavaScript (Node.js): AI calls, SDK, workflow orchestration
 * - Python (FastAPI): Advanced NLP, semantic analysis, ML processing
 * 
 * ENHANCED FEATURES (Python-powered):
 * ✅ VADER + TextBlob Sentiment Analysis
 * ✅ Semantic Similarity with Sentence Transformers
 * ✅ Multi-metric Readability Scoring (textstat)
 * ✅ Named Entity Recognition (spaCy)
 * ✅ Advanced Emotion Detection
 * ✅ Content Depth Analysis
 * ✅ Anti-Template Detection (Semantic level)
 * 
 * BASED ON: v9.7.0 Maximum Uniqueness System
 * 
 * Usage:
 *   1. Start Python NLP Service:
 *      cd scripts/hybrid-nlp && python nlp_service.py
 *   
 *   2. Run this workflow:
 *      node scripts/hybrid-nlp/rally-workflow-v9.8.0-hybrid.js [campaign]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Import Python NLP Client
const PythonNLPClient = require('../python_nlp_client.js');

// Dynamic import for ESM module
let ZAI = null;
async function initZAI() {
  if (!ZAI) {
    const module = await import('z-ai-web-dev-sdk');
    ZAI = module.default;
  }
  return ZAI;
}

// ============================================================================
// HYBRID CONFIGURATION
// ============================================================================

const CONFIG = {
  // Python NLP Service
  pythonNLP: {
    baseUrl: 'http://localhost:5000',
    enabled: true,
    timeout: 30000,
    fallbackToBasic: true // Use basic JS analysis if Python service unavailable
  },
  
  rallyApiBase: 'https://app.rally.fun/api',
  outputDir: '/home/z/my-project/download',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  
  // Multi-Token Configuration
  useAutoConfig: true,
  baseUrl: 'http://172.25.136.210:8080/v1',
  apiKey: 'Z.ai',
  
  tokens: [
    null, // Auto from .z-ai-config
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtNTQ5ZmI5MTEtZWM0NS00NGJiLTg5YjEtMWY2MTljNTEzN2QzIn0.M6IQTOXasSbEw98a4R6p3LEPwJPCWyRZiJSUo8lr2PM',
      chatId: 'chat-549fb911-ec45-44bb-89b1-1f619c5137d3',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #1'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtMTAyYTlkMGUtYTVkNy00MmY2LTk3ZjctNDk5NzFiNzcwNjVhIn0.6cDfQbTc2HHdtKXBfaUvpBsNLPbbjYkpJp6br0rYteA',
      chatId: 'chat-102a9d0e-a5d7-42f6-97f7-49971b77065a',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      label: 'Akun B #1'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtMDAyOWJjNDYtZGI3Ny00ZmZkLWI4ZDItM2RlYzFlNWVkNDU3In0.CMthZytUFBpnqW3K52Q1AAgB9uvhyXf3AG-FQvaDoYI',
      chatId: 'chat-0029bc46-db77-4ffd-b8d2-3dec1e5ed457',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #2'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtOTZlZTk1NmItMGYxMi00MGUxLWE0MzYtYTk4YmQwZjk0YzJhIn0.PgpMEiUr8a6Cu2vl9zFMggRsxQrx3JwkUCOjZCUIJnw',
      chatId: 'chat-96ee956b-0f12-40e1-a436-a98bd0f94c2a',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      label: 'Akun B #2'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtOWJiMzAzOTMtYWE3Mi00Y2QzLWJkNzktYzJkZmI0ODVmNzgyIn0.jb35oqGKPB2FLC-X_mozORmvbBilwRc_pSZEkbyaRfw',
      chatId: 'chat-9bb30393-aa72-4cd3-bd79-c2dfb485f782',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #3'
    }
  ],
  
  currentTokenIndex: 0,
  
  providers: {
    sdk: {
      enabled: true,
      priority: 1,
      name: 'z-ai-web-dev-sdk',
      type: 'sdk',
      models: { chat: 'default', fast: 'default' }
    }
  },
  
  // Enhanced thresholds for Hybrid
  thresholds: {
    gateUtama: { pass: 16, max: 20 },
    gateTambahan: { pass: 14, max: 16 },
    penilaianInternal: { pass: 54, max: 60 },
    compliance: { pass: 10, max: 10, allMustPass: true },
    factCheck: { pass: 4, max: 5 },
    uniqueness: { pass: 20, max: 25 },
    // Hybrid-specific thresholds
    readability: { min: 60, optimal: 70 }, // Flesch Reading Ease
    sentiment: { minConfidence: 0.3 },
    similarity: { maxThreshold: 0.7 },
    depth: { minScore: 40 },
    tieThreshold: 3
  },
  
  revision: { maxAttempts: 3, delayMs: 8000 },
  retry: { maxAttempts: 3, delayMs: 8000 },
  
  delays: {
    betweenJudges: 3000,
    betweenPasses: 5000,
    beforeRevision: 3000,
    beforeTieBreaker: 5000,
    afterWebSearch: 2000,
    afterPythonNLP: 500
  },
  
  enableThinking: true,
  tweetOptions: [1, 3, 5, 7],
  
  // Enhancement options (from v9.7.0)
  personas: [
    { id: 'skeptic', name: 'The Skeptic', trait: 'Doubt → Discovery → Conversion' },
    { id: 'victim_to_hero', name: 'Victim → Hero', trait: 'Pain → Solution → Redemption' },
    { id: 'insider', name: 'The Insider', trait: 'Behind the scenes revelation' },
    { id: 'newbie', name: 'The Newbie', trait: 'Fresh perspective, relatable confusion' },
    { id: 'contrarian', name: 'The Contrarian', trait: 'Bold statement, challenge status quo' },
    { id: 'researcher', name: 'The Researcher', trait: 'Data-driven discovery' },
    { id: 'storyteller', name: 'The Storyteller', trait: 'Narrative-driven, human interest' }
  ],
  
  narrativeStructures: [
    { id: 'hero_journey', name: "Hero's Journey", flow: 'Challenge → Struggle → Discovery → Victory' },
    { id: 'pas', name: 'Problem-Agitation-Solution', flow: 'Problem → Make it worse → Solution → Proof' },
    { id: 'bab', name: 'Before-After-Bridge', flow: 'Before state → After state → How to bridge' },
    { id: 'contrast', name: 'Contrast Frame', flow: 'What most think → What actually is → Proof' },
    { id: 'mystery', name: 'Mystery Reveal', flow: 'Curiosity building → Cliffhanger → Reveal' },
    { id: 'case_study', name: 'Case Study', flow: 'Subject → Problem → Solution → Result' },
    { id: 'qa', name: 'Question-Answer', flow: 'Provocative question → Explore → Answer' }
  ],
  
  audienceSegments: {
    'internet_court': [
      { id: 'scammed_crypto', name: 'Crypto Users Who Got Scammed', pain: 'Lost money, no recourse' },
      { id: 'freelancers', name: 'Freelancers with Unpaid Clients', pain: 'Client ghosted, no contract' },
      { id: 'dao_participants', name: 'DAO/Governance Participants', pain: 'Disputes in voting, unclear resolution' },
      { id: 'ecommerce', name: 'E-commerce Dispute Victims', pain: 'Buyer/seller disputes, biased platforms' },
      { id: 'smart_contract_users', name: 'Smart Contract Users', pain: 'Bugs, hacks, unclear liability' }
    ]
  },
  
  emotionCombos: {
    rare: [
      { emotions: ['surprise', 'anger'], hook: 'Shocking injustice revealed' },
      { emotions: ['relief', 'curiosity'], hook: 'Finally, a solution you did not know' },
      { emotions: ['fear', 'empowerment'], hook: 'The threat is real, but so is hope' },
      { emotions: ['frustration', 'vindication'], hook: 'You were right to be mad' },
      { emotions: ['confusion', 'clarity'], hook: 'The mystery solved' }
    ],
    common: [
      { emotions: ['curiosity', 'hope'], hook: 'Standard curiosity driver' },
      { emotions: ['fear', 'urgency'], hook: 'Fear-based urgency' },
      { emotions: ['pain', 'hope'], hook: 'Pain to hope journey' }
    ]
  },
  
  hardRequirements: {
    bannedWords: [
      'guaranteed', 'guarantee', '100%', 'risk-free', 'sure thing',
      'financial advice', 'investment advice', 'buy now', 'sell now',
      'get rich', 'quick money', 'easy money', 'passive income',
      'follow me', 'subscribe to my', 'check my profile',
      'click here', 'limited time offer', 'act now',
      'legally binding', 'court order', 'official ruling'
    ],
    rallyBannedPhrases: [
      'vibe coding', 'skin in the game', 'intelligent contracts',
      'trust layer', 'agent era', 'agentic era', 'structural shift',
      'capital efficiency', 'how did I miss this', 'losing my mind',
      'how are we all sleeping on this', "don't miss out",
      'designed for creators that desire', 'transforming ideas into something sustainable',
      'entire week', 'frictionless', 'acceptable originality',
      'similar_tweets', 'bank stack', 'version control for disagreements'
    ],
    templatePhrases: [
      'unpopular opinion:', 'hot take:', 'thread alert:', 'breaking:',
      'this is your sign', 'psa:', 'reminder that', 'quick thread:',
      'important thread:', 'drop everything', 'stop scrolling',
      'hear me out', 'let me explain', 'nobody is talking about',
      'story time:', 'in this thread i will', 'key takeaways:',
      "here's the thing", "imagine a world where", "picture this:",
      "let's dive in", "at the end of the day", "it goes without saying"
    ],
    aiPatterns: {
      words: ['delve', 'leverage', 'realm', 'tapestry', 'paradigm', 'landscape', 'nuance', 'underscores', 'pivotal', 'crucial', 'embark', 'journey', 'explore', 'unlock', 'harness'],
      phrases: ['picture this', 'lets dive in', 'in this thread', 'key takeaways', 'heres the thing', 'imagine a world', 'it goes without saying', 'at the end of the day', 'on the other hand', 'in conclusion']
    },
    weakOpenings: ['the ', 'a ', 'an ', 'this is', 'there are', 'there is', 'i think', 'in the', 'today ', 'so ', 'well ', 'basically', 'honestly ', 'actually ', 'first ', 'let me', 'here is', 'here are']
  },
  
  wajibElements: {
    hook: { required: true, description: 'Natural, organic hook (not formulaic)' },
    emotions: { required: true, minCount: 3, description: 'Minimal 3 emotion types' },
    bodyFeeling: { required: true, description: 'Physical/body sensation' },
    cta: { required: true, description: 'Question atau reply bait' },
    url: { required: true, description: 'Required URL dari campaign' },
    facts: { required: true, description: 'Data/fakta pendukung (multi-layer)' },
    originality: {
      mustHave: [
        'Personal story atau experience (genuine)',
        'Unique angle/perspective',
        'Specific details (not generic)',
        'Conversational tone (natural, bukan AI-sounding)',
        'Differentiation from competitors'
      ],
      mustAvoid: [
        'Similar to competitor content',
        'Template-like structure',
        'Generic statements',
        'Overused phrases',
        'Derivative angles',
        'Formulaic hook patterns'
      ]
    }
  },
  
  calibration: {
    rallyMaxScore: 23,
    v9_8_0MaxScore: 100, // Enhanced scoring with Python NLP
    thresholds: {
      excellent: { rally: 21, v9_8_0: 90 },
      pass: { rally: 18, v9_8_0: 75 },
      borderline: { rally: 15, v9_8_0: 62 }
    }
  },
  
  emotionTriggers: {
    fear: ['risk', 'danger', 'threat', 'warning', 'scary', 'terrifying', 'afraid', 'worried', 'nightmare'],
    curiosity: ['wonder', 'curious', 'secret', 'hidden', 'mystery', 'discover', 'surprising', 'unexpected'],
    surprise: ['unexpected', 'shocking', 'surprised', 'blew my mind', 'plot twist', 'wait what', 'finally', 'breakthrough'],
    hope: ['finally', 'breakthrough', 'opportunity', 'potential', 'future', 'imagine', 'possible'],
    pain: ['lost', 'failed', 'broke', 'destroyed', 'killed', 'wasted', 'missed', 'regret', 'hurt', 'pain'],
    urgency: ['now', 'today', 'immediately', 'urgent', 'quickly', 'fast', 'running out'],
    anger: ['unfair', 'wrong', 'scam', 'cheated', 'robbed', 'injustice', 'ridiculous'],
    relief: ['finally', 'solution', 'answer', 'solved', 'resolved', 'fixed']
  },
  
  bodyFeelings: [
    'cold sweat', 'panic', 'anxiety', 'heart racing', 'stomach dropped', 
    'heart sank', 'chest tightened', 'jaw dropped', "couldn't believe",
    'blood boiled', 'hands shaking', 'breath caught'
  ]
};

// ============================================================================
// PYTHON NLP INTEGRATION LAYER
// ============================================================================

class HybridNLPAnalyzer {
  constructor(config) {
    this.config = config;
    this.pythonClient = new PythonNLPClient(config.pythonNLP.baseUrl);
    this.serviceAvailable = null;
  }
  
  /**
   * Check if Python NLP service is available
   */
  async checkService() {
    if (this.serviceAvailable !== null) {
      return this.serviceAvailable;
    }
    
    try {
      const health = await this.pythonClient.healthCheck();
      this.serviceAvailable = health.healthy;
      
      if (health.healthy) {
        console.log('\n   ╔════════════════════════════════════════════════════════════╗');
        console.log('   ║           🐍 PYTHON NLP SERVICE CONNECTED                 ║');
        console.log('   ╠════════════════════════════════════════════════════════════╣');
        console.log('   ║  VADER Sentiment:      ' + (health.services?.sentiment_vader ? '✓' : '✗').padEnd(33) + '║');
        console.log('   ║  TextBlob:             ' + (health.services?.sentiment_textblob ? '✓' : '✗').padEnd(33) + '║');
        console.log('   ║  textstat:             ' + (health.services?.readability_textstat ? '✓' : '✗').padEnd(33) + '║');
        console.log('   ║  spaCy NER:            ' + (health.services?.ner_spacy ? '✓' : '✗').padEnd(33) + '║');
        console.log('   ║  Semantic Similarity:  ' + (health.services?.semantic_similarity ? '✓' : '✗').padEnd(33) + '║');
        console.log('   ╚════════════════════════════════════════════════════════════╝');
      } else {
        console.log('   ⚠️ Python NLP Service not available - using fallback analysis');
      }
      
      return this.serviceAvailable;
    } catch (error) {
      console.log('   ⚠️ Python NLP Service unavailable:', error.message);
      this.serviceAvailable = false;
      return false;
    }
  }
  
  /**
   * Comprehensive content analysis using Python NLP
   */
  async analyzeContent(content, campaignContext = null, competitorContents = []) {
    const serviceOk = await this.checkService();
    
    if (serviceOk) {
      console.log('   🐍 Using Python NLP for content analysis...');
      const result = await this.pythonClient.analyzeContent(
        content, 
        campaignContext, 
        competitorContents
      );
      
      // Add hybrid-specific metrics
      result.hybridMetrics = this._calculateHybridMetrics(result);
      return result;
    }
    
    // Fallback to basic JS analysis
    return this._fallbackContentAnalysis(content, competitorContents);
  }
  
  /**
   * Check semantic similarity with competitors
   */
  async checkSimilarity(newContent, competitorContents, threshold = 0.7) {
    const serviceOk = await this.checkService();
    
    if (serviceOk) {
      console.log('   🐍 Using Python NLP for similarity check...');
      return await this.pythonClient.checkSimilarity(newContent, competitorContents, threshold);
    }
    
    return this._fallbackSimilarity(newContent, competitorContents);
  }
  
  /**
   * Detect emotions with rare combo detection
   */
  async detectEmotions(content, detailed = false) {
    const serviceOk = await this.checkService();
    
    if (serviceOk) {
      console.log('   🐍 Using Python NLP for emotion detection...');
      return await this.pythonClient.detectEmotions(content, detailed);
    }
    
    return this._fallbackEmotions(content);
  }
  
  /**
   * Combined uniqueness analysis
   */
  async analyzeUniqueness(content, competitorContents) {
    const serviceOk = await this.checkService();
    
    if (serviceOk) {
      console.log('   🐍 Using Python NLP for uniqueness analysis...');
      return await this.pythonClient.analyzeUniqueness(content, competitorContents);
    }
    
    return this._fallbackUniqueness(content, competitorContents);
  }
  
  /**
   * Calculate hybrid-specific metrics
   */
  _calculateHybridMetrics(analysis) {
    const metrics = {
      overallQuality: 0,
      qualityGrade: 'C',
      recommendations: []
    };
    
    // Calculate overall quality (0-100)
    let score = 50; // Base score
    
    // Readability contribution (max +15)
    if (analysis.readability?.primary?.flesch_reading_ease) {
      const flesch = analysis.readability.primary.flesch_reading_ease;
      if (flesch >= 60 && flesch <= 80) {
        score += 15;
      } else if (flesch >= 50) {
        score += 10;
      } else {
        metrics.recommendations.push('Improve readability - content may be too complex');
      }
    }
    
    // Sentiment contribution (max +10)
    if (analysis.sentiment?.consensus_score !== undefined) {
      const sentiment = Math.abs(analysis.sentiment.consensus_score);
      if (sentiment > 0.3) {
        score += 10; // Strong sentiment is good for engagement
      } else {
        metrics.recommendations.push('Add more emotional depth');
      }
    }
    
    // Emotion variety contribution (max +15)
    if (analysis.emotions?.emotion_variety) {
      score += Math.min(analysis.emotions.emotion_variety * 5, 15);
      
      if (analysis.emotions.rare_combo_detected) {
        score += 5; // Bonus for rare emotion combo
      }
    }
    
    // Depth contribution (max +15)
    if (analysis.depth_analysis?.overall_depth_score) {
      score += Math.min(analysis.depth_analysis.overall_depth_score * 0.15, 15);
    }
    
    // Similarity penalty
    if (analysis.similarity?.primary?.max_similarity) {
      score -= analysis.similarity.primary.max_similarity * 20;
      
      if (analysis.similarity.primary.max_similarity > 0.7) {
        metrics.recommendations.push('Content too similar to competitors - increase differentiation');
      }
    }
    
    metrics.overallQuality = Math.max(0, Math.min(100, Math.round(score)));
    
    // Assign grade
    if (score >= 90) metrics.qualityGrade = 'A+';
    else if (score >= 85) metrics.qualityGrade = 'A';
    else if (score >= 80) metrics.qualityGrade = 'A-';
    else if (score >= 75) metrics.qualityGrade = 'B+';
    else if (score >= 70) metrics.qualityGrade = 'B';
    else if (score >= 65) metrics.qualityGrade = 'B-';
    else if (score >= 60) metrics.qualityGrade = 'C+';
    else if (score >= 55) metrics.qualityGrade = 'C';
    else if (score >= 50) metrics.qualityGrade = 'C-';
    else metrics.qualityGrade = 'D';
    
    return metrics;
  }
  
  // Fallback methods (basic JS implementation)
  
  _fallbackContentAnalysis(content, competitorContents) {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      success: true,
      source: 'fallback',
      readability: {
        primary: {
          available: true,
          flesch_reading_ease: this._calculateFleschEase(content),
          word_count: words.length,
          sentence_count: sentences.length
        }
      },
      sentiment: this._fallbackSentiment(content),
      emotions: this._fallbackEmotions(content),
      depth_analysis: { overall_depth_score: 30 },
      content_length: content.length,
      word_count: words.length,
      hybridMetrics: {
        overallQuality: 50,
        qualityGrade: 'C',
        recommendations: ['Python NLP service unavailable - install for better analysis']
      }
    };
  }
  
  _fallbackSimilarity(newContent, competitorContents) {
    if (!competitorContents || competitorContents.length === 0) {
      return { success: true, source: 'fallback', max_similarity: 0, is_unique: true };
    }
    
    const newWords = new Set(newContent.toLowerCase().split(/\s+/));
    let maxSim = 0;
    
    for (const comp of competitorContents) {
      const compWords = new Set(comp.toLowerCase().split(/\s+/));
      const intersection = new Set([...newWords].filter(x => compWords.has(x)));
      const union = new Set([...newWords, ...compWords]);
      const sim = intersection.size / union.size;
      maxSim = Math.max(maxSim, sim);
    }
    
    return {
      success: true,
      source: 'fallback',
      max_similarity: maxSim,
      is_unique: maxSim < 0.3
    };
  }
  
  _fallbackEmotions(content) {
    const emotionKeywords = {
      fear: ['afraid', 'scary', 'terrifying', 'nightmare', 'panic'],
      anger: ['angry', 'furious', 'frustrated', 'unfair', 'injustice'],
      joy: ['happy', 'excited', 'amazing', 'wonderful', 'love'],
      surprise: ['shocked', 'unexpected', 'unbelievable', 'incredible'],
      curiosity: ['curious', 'interesting', 'fascinating', 'mystery', 'secret']
    };
    
    const contentLower = content.toLowerCase();
    const emotions = {};
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const count = keywords.filter(kw => contentLower.includes(kw)).length;
      if (count > 0) emotions[emotion] = count;
    }
    
    return {
      success: true,
      source: 'fallback',
      emotions,
      primary_emotion: Object.keys(emotions)[0] || 'neutral',
      emotion_variety: Object.keys(emotions).length,
      rare_combo_detected: false
    };
  }
  
  _fallbackSentiment(content) {
    const positive = ['good', 'great', 'amazing', 'excellent', 'wonderful', 'love'];
    const negative = ['bad', 'terrible', 'awful', 'horrible', 'hate'];
    
    const contentLower = content.toLowerCase();
    let score = 0;
    
    positive.forEach(w => { if (contentLower.includes(w)) score += 0.1; });
    negative.forEach(w => { if (contentLower.includes(w)) score -= 0.1; });
    
    return {
      consensus_score: score,
      consensus_label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral'
    };
  }
  
  _fallbackUniqueness(content, competitorContents) {
    const similarity = this._fallbackSimilarity(content, competitorContents);
    const emotions = this._fallbackEmotions(content);
    
    let score = 100;
    score -= similarity.max_similarity * 40;
    score += emotions.emotion_variety * 5;
    
    return {
      success: true,
      source: 'fallback',
      uniqueness: {
        score: Math.max(0, Math.min(100, score)),
        is_unique: similarity.is_unique
      }
    };
  }
  
  _calculateFleschEase(content) {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (words.length === 0 || sentences.length === 0) return 0;
    
    const avgSentenceLength = words.length / sentences.length;
    const syllables = words.reduce((sum, word) => sum + this._countSyllables(word), 0);
    const avgSyllablesPerWord = syllables / words.length;
    
    const flesch = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(flesch)));
  }
  
  _countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
}

// ============================================================================
// MULTI-PROVIDER LLM CLIENT (Extended for Hybrid)
// ============================================================================

class MultiProviderLLM {
  constructor(config) {
    this.config = config;
    this.providers = this.getEnabledProviders();
    this.currentProviderIndex = 0;
    this.currentTokenIndex = config.currentTokenIndex || 0;
    this.tokens = config.tokens || [null];
    this.nlpAnalyzer = new HybridNLPAnalyzer(config);
  }
  
  async loadAutoToken() {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const homeDir = os.homedir();
      const configPaths = [
        path.join(process.cwd(), '.z-ai-config'),
        path.join(homeDir, '.z-ai-config'),
        '/etc/.z-ai-config'
      ];
      
      for (const filePath of configPaths) {
        try {
          const configStr = fs.readFileSync(filePath, 'utf-8');
          const autoConfig = JSON.parse(configStr);
          if (autoConfig.token) {
            this.tokens[0] = {
              token: autoConfig.token,
              chatId: autoConfig.chatId,
              userId: autoConfig.userId,
              baseUrl: autoConfig.baseUrl || this.config.baseUrl,
              apiKey: autoConfig.apiKey || this.config.apiKey,
              label: 'AUTO (Chat Ini)'
            };
            console.log(`   ✅ Auto-token loaded from ${filePath}`);
            return;
          }
        } catch (e) {}
      }
      console.log('   ⚠️ No auto-token found, using fallback tokens');
    } catch (e) {
      console.log('   ⚠️ Could not load auto-token:', e.message);
    }
  }
  
  displayTokenPoolStatus() {
    console.log('\n   ╔════════════════════════════════════════════════════════════╗');
    console.log('   ║           🎫 MULTI-TOKEN FALLBACK SYSTEM                  ║');
    console.log('   ╠════════════════════════════════════════════════════════════╣');
    
    this.tokens.forEach((token, index) => {
      const isActive = index === this.currentTokenIndex;
      const marker = isActive ? '►' : ' ';
      const label = token?.label || `Token #${index}`;
      
      if (token) {
        console.log(`   ║ ${marker} #${index}: ${label.padEnd(20)}                         ║`);
      } else if (index === 0) {
        console.log(`   ║ ${marker} #${index}: Waiting for auto-load...                  ║`);
      }
    });
    
    console.log('   ╚════════════════════════════════════════════════════════════╝');
  }
  
  getCurrentToken() {
    return this.tokens[this.currentTokenIndex] || null;
  }
  
  switchToNextToken() {
    const nextIndex = this.currentTokenIndex + 1;
    if (nextIndex < this.tokens.length) {
      this.currentTokenIndex = nextIndex;
      const newToken = this.getCurrentToken();
      console.log(`   🔄 SWITCHING TO ${newToken?.label || `Token #${nextIndex}`}`);
      return true;
    }
    console.log('   ❌ No more fallback tokens available!');
    return false;
  }
  
  resetTokenIndex() {
    this.currentTokenIndex = 0;
  }
  
  getEnabledProviders() {
    return Object.entries(this.config.providers)
      .filter(([key, provider]) => provider.enabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([key, provider]) => ({ key, ...provider }));
  }
  
  isRateLimitError(error) {
    return error.message && (
      error.message.includes('429') ||
      error.message.includes('rate limit') ||
      error.message.includes('速率限制') ||
      error.message.includes('1302')
    );
  }

  async chat(messages, options = {}) {
    const ZAIClass = await initZAI();
    const zai = await ZAIClass.create();

    const requestOptions = {
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4000
    };

    const completion = await zai.chat.completions.create(requestOptions);
    console.log(`   ✅ Response received`);

    return {
      content: completion.choices[0]?.message?.content || '',
      thinking: completion.choices[0]?.message?.thinking || null,
      provider: 'sdk',
      model: 'default',
      usage: completion.usage
    };
  }
  
  async blindJudge(systemPrompt, userPrompt, judgeId, options = {}) {
    console.log(`\n   🔒 TRUE BLIND JUDGE ${judgeId} - Fresh Context`);

    const ZAIClass = await initZAI();
    const zai = await ZAIClass.create();

    const requestOptions = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    };

    const response = await zai.chat.completions.create(requestOptions);
    console.log(`   ✅ Judge ${judgeId} success!`);

    return {
      content: response.choices[0]?.message?.content || '',
      thinking: response.choices[0]?.message?.thinking || null,
      provider: 'sdk-blind',
      model: 'default'
    };
  }
  
  async contextAwareJudge(systemPrompt, userPrompt, judgeId) {
    console.log(`\n   📋 CONTEXT-AWARE JUDGE ${judgeId} - With Campaign Info`);

    const ZAIClass = await initZAI();
    const zai = await ZAIClass.create();

    const requestOptions = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    };

    const response = await zai.chat.completions.create(requestOptions);
    console.log(`   ✅ Context-Aware Judge ${judgeId} success!`);

    return {
      content: response.choices[0]?.message?.content || '',
      thinking: response.choices[0]?.message?.thinking || null,
      provider: 'sdk-context',
      model: 'default'
    };
  }
  
  async factCheckJudge(systemPrompt, userPrompt, judgeId, customSearchQuery = null) {
    console.log(`\n   🔍 FACT-CHECK JUDGE ${judgeId} - With Web Search`);

    const ZAIClass = await initZAI();
    const zai = await ZAIClass.create();

    const currentYear = new Date().getFullYear();
    const searchQuery = customSearchQuery || `verify facts ${currentYear} latest`;
    let webSearchResults = [];

    console.log(`   🔎 Searching for data from ${currentYear} and earlier...`);

    try {
      webSearchResults = await zai.functions.invoke("web_search", {
        query: searchQuery,
        num: 5
      });
      console.log(`   ✅ Web search found ${webSearchResults?.length || 0} results`);
    } catch (error) {
      console.log(`   ⚠️ Web search failed: ${error.message}`);
    }

    const enhancedPrompt = userPrompt + `\n\n═══════════════════════════════════════════════════════════════\n🔍 WEB SEARCH RESULTS FOR FACT VERIFICATION:\n═══════════════════════════════════════════════════════════════\n${webSearchResults && webSearchResults.length > 0
      ? webSearchResults.slice(0, 3).map((r, i) => `${i+1}. ${r.name || 'Source'}: ${r.snippet || ''}\n   URL: ${r.url || 'N/A'}`).join('\n\n')
      : 'No web search results available. Use your knowledge to verify claims.'}`;

    const requestOptions = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: enhancedPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    };

    const response = await zai.chat.completions.create(requestOptions);
    console.log(`   ✅ Fact-Check Judge ${judgeId} success!`);

    return {
      content: response.choices[0]?.message?.content || '',
      thinking: response.choices[0]?.message?.thinking || null,
      webSearchUsed: webSearchResults && webSearchResults.length > 0,
      provider: 'sdk-factcheck',
      model: 'default'
    };
  }
  
  /**
   * HYBRID JUDGE - Uses Python NLP for enhanced analysis
   */
  async hybridJudge(systemPrompt, userPrompt, judgeId, content, competitorContents = []) {
    console.log(`\n   🐍 HYBRID JUDGE ${judgeId} - Python NLP Enhanced`);

    // First, get Python NLP analysis
    const nlpAnalysis = await this.nlpAnalyzer.analyzeContent(content, null, competitorContents);
    
    // Get AI judge response
    const ZAIClass = await initZAI();
    const zai = await ZAIClass.create();
    
    // Enhance prompt with NLP data
    const enhancedPrompt = userPrompt + `\n\n═══════════════════════════════════════════════════════════════
🐍 PYTHON NLP ANALYSIS (Use this for scoring):
═══════════════════════════════════════════════════════════════
- Readability Score: ${nlpAnalysis.readability?.primary?.flesch_reading_ease || 'N/A'}
- Sentiment: ${nlpAnalysis.sentiment?.consensus_label || 'N/A'} (${nlpAnalysis.sentiment?.consensus_score?.toFixed(2) || 0})
- Emotion Variety: ${nlpAnalysis.emotions?.emotion_variety || 0} emotions detected
- Rare Emotion Combo: ${nlpAnalysis.emotions?.rare_combo_detected ? '✓ Yes' : '✗ No'}
- Content Depth: ${nlpAnalysis.depth_analysis?.depth_level || 'N/A'} (${nlpAnalysis.depth_analysis?.overall_depth_score || 0})
- Similarity to Competitors: ${((nlpAnalysis.similarity?.primary?.max_similarity || 0) * 100).toFixed(1)}%
- Overall Quality Grade: ${nlpAnalysis.hybridMetrics?.qualityGrade || 'N/A'} (${nlpAnalysis.hybridMetrics?.overallQuality || 0}/100)
`;

    const requestOptions = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: enhancedPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    };

    const response = await zai.chat.completions.create(requestOptions);
    console.log(`   ✅ Hybrid Judge ${judgeId} success!`);

    return {
      content: response.choices[0]?.message?.content || '',
      thinking: response.choices[0]?.message?.thinking || null,
      nlpAnalysis: nlpAnalysis,
      provider: 'hybrid',
      model: 'default'
    };
  }
  
  async webSearch(query) {
    const currentYear = new Date().getFullYear();
    console.log(`   🔍 Web search: "${query}"`);
    
    try {
      const ZAIClass = await initZAI();
      const zai = await ZAIClass.create();
      
      const enhancedQuery = `${query} ${currentYear} latest`;
      
      const result = await zai.functions.invoke("web_search", {
        query: enhancedQuery,
        num: 5
      });
      
      console.log(`   ✅ Found ${result?.length || 0} results`);
      return result || [];
      
    } catch (error) {
      console.log(`   ⚠️ Web search failed: ${error.message}`);
      return [];
    }
  }
  
  // Get NLP analyzer for external use
  getNLPAnalyzer() {
    return this.nlpAnalyzer;
  }
  
  httpRequest(url, options) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };
      
      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      
      req.on('error', reject);
      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.body) req.write(options.body);
      req.end();
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeJsonParse(str) {
  try {
    // Try to extract JSON from the string
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function displayThinking(phase, thinking) {
  console.log('\n   ' + '┌' + '─'.repeat(54) + '┐');
  console.log(`   │ 🧠 ${phase.toUpperCase()} THINKING${' '.repeat(54 - phase.length - 14)}│`);
  console.log('   ' + '├' + '─'.repeat(54) + '┤');
  
  const lines = thinking.split('\n').slice(0, 15);
  lines.forEach(line => {
    const trimmed = line.substring(0, 52);
    console.log(`   │ ${trimmed}${' '.repeat(53 - trimmed.length)}│`);
  });
  
  console.log('   ' + '└' + '─'.repeat(54) + '┘');
}

function displayJudgeThinking(judgeNum, thinking) {
  console.log('\n   ' + '┌' + '─'.repeat(54) + '┐');
  console.log(`   │ ⚖️  JUDGE ${judgeNum} THINKING${' '.repeat(30)}│`);
  console.log('   ' + '├' + '─'.repeat(54) + '┤');
  
  const lines = thinking.split('\n').slice(0, 15);
  lines.forEach(line => {
    const trimmed = line.substring(0, 52);
    console.log(`   │ ${trimmed}${' '.repeat(53 - trimmed.length)}│`);
  });
  
  console.log('   ' + '└' + '─'.repeat(54) + '┘');
}

// ============================================================================
// SELECTION FUNCTIONS (From v9.7.0)
// ============================================================================

function selectUnusedPersona(competitorAnalysis) {
  const usedPersonas = competitorAnalysis?.personasUsed || [];
  const availablePersonas = CONFIG.personas.filter(p => 
    !usedPersonas.some(used => 
      used.toLowerCase().includes(p.id.toLowerCase()) ||
      used.toLowerCase().includes(p.name.toLowerCase())
    )
  );
  
  if (availablePersonas.length === 0) {
    return CONFIG.personas[Math.floor(Math.random() * CONFIG.personas.length)];
  }
  
  const preferredOrder = ['contrarian', 'skeptic', 'insider', 'researcher', 'storyteller', 'victim_to_hero', 'newbie'];
  for (const pref of preferredOrder) {
    const found = availablePersonas.find(p => p.id === pref);
    if (found) return found;
  }
  
  return availablePersonas[0];
}

function selectUnusedNarrativeStructure(competitorAnalysis) {
  const usedStructures = competitorAnalysis?.structuresUsed || [];
  const availableStructures = CONFIG.narrativeStructures.filter(s => 
    !usedStructures.some(used => 
      used.toLowerCase().includes(s.id.toLowerCase()) ||
      used.toLowerCase().includes(s.name.toLowerCase())
    )
  );
  
  if (availableStructures.length === 0) {
    return CONFIG.narrativeStructures[Math.floor(Math.random() * CONFIG.narrativeStructures.length)];
  }
  
  const preferredOrder = ['mystery', 'contrast', 'case_study', 'qa', 'hero_journey', 'pas', 'bab'];
  for (const pref of preferredOrder) {
    const found = availableStructures.find(s => s.id === pref);
    if (found) return found;
  }
  
  return availableStructures[0];
}

function selectUnaddressedAudience(competitorAnalysis, campaignTopic) {
  const topicLower = (campaignTopic || '').toLowerCase();
  let category = 'internet_court';
  
  const addressedAudiences = competitorAnalysis?.audienceAddressed || [];
  const segments = CONFIG.audienceSegments[category] || [];
  const availableSegments = segments.filter(s => 
    !addressedAudiences.some(addr => 
      addr.toLowerCase().includes(s.id.toLowerCase()) ||
      addr.toLowerCase().includes(s.name.toLowerCase())
    )
  );
  
  if (availableSegments.length === 0) {
    return segments[0] || { id: 'general', name: 'General Audience', pain: 'General interest' };
  }
  
  return availableSegments[0];
}

function selectRareEmotionCombo(competitorAnalysis) {
  const usedEmotions = (competitorAnalysis?.emotionsUsed || []).map(e => 
    typeof e === 'object' ? e.emotion?.toLowerCase() : e.toLowerCase()
  );
  
  const rareCombos = CONFIG.emotionCombos.rare;
  const commonCombos = CONFIG.emotionCombos.common;
  
  const availableRare = rareCombos.filter(combo => 
    !combo.emotions.some(em => usedEmotions.includes(em.toLowerCase()))
  );
  
  if (availableRare.length > 0) {
    return { ...availableRare[0], rarityLevel: 'very rare' };
  }
  
  const availableCommon = commonCombos.filter(combo =>
    !combo.emotions.every(em => usedEmotions.includes(em.toLowerCase()))
  );
  
  if (availableCommon.length > 0) {
    return { ...availableCommon[0], rarityLevel: 'common' };
  }
  
  return {
    emotions: ['curiosity', 'surprise', 'hope'],
    hook: 'Discovery-driven engagement',
    rarityLevel: 'common'
  };
}

function extractKeywords(title) {
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once'];
  
  return (title || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 5);
}

// ============================================================================
// COMPETITOR ANALYSIS (Enhanced with Python NLP)
// ============================================================================

async function deepCompetitorContentAnalysis(llm, submissions, campaignTitle, campaignData) {
  console.log('\n' + '─'.repeat(60));
  console.log('🔍 DEEP COMPETITOR CONTENT ANALYSIS (Hybrid Mode)');
  console.log('─'.repeat(60));
  
  if (!submissions || submissions.length === 0) {
    console.log('   ℹ️ No submissions to analyze');
    return { 
      anglesUsed: [], 
      storiesTold: [],
      personasUsed: [],
      structuresUsed: [],
      emotionsUsed: [],
      analogiesUsed: [],
      audienceAddressed: [],
      saturatedElements: [],
      untappedOpportunities: [],
      competitorContent: [],
      strategy: 'No competitor data - create unique content freely'
    };
  }
  
  const competitorContent = submissions.slice(0, 10).map(s => ({
    content: s.content || s.text || s.analysis?.[0]?.analysis || '',
    score: s.score || 0,
    username: s.xUsername || 'Anonymous'
  })).filter(s => s.content && s.content.length > 50);
  
  console.log(`   📄 Analyzing ${competitorContent.length} full competitor contents...`);
  
  // Use Python NLP for each competitor content
  const nlpAnalyzer = llm.getNLPAnalyzer();
  const nlpResults = [];
  
  for (let i = 0; i < Math.min(competitorContent.length, 5); i++) {
    console.log(`   🐍 Python NLP analysis for competitor ${i + 1}...`);
    const nlpResult = await nlpAnalyzer.analyzeContent(competitorContent[i].content);
    nlpResults.push({
      index: i,
      score: competitorContent[i].score,
      nlp: nlpResult
    });
    await delay(200);
  }
  
  // AI analysis for patterns
  const analysisPrompt = `Analyze these COMPETITOR CONTENTS for "${campaignTitle}":

${competitorContent.map((c, i) => `
--- COMPETITOR ${i + 1} (Score: ${c.score}) ---
${c.content.substring(0, 800)}
`).join('\n')}

NLP ANALYSIS DATA:
${nlpResults.map(r => `
Competitor ${r.index + 1}: Grade ${r.nlp.hybridMetrics?.qualityGrade || 'N/A'}, 
Emotions: ${r.nlp.emotions?.emotion_variety || 0}, 
Depth: ${r.nlp.depth_analysis?.depth_level || 'N/A'},
Sentiment: ${r.nlp.sentiment?.consensus_label || 'N/A'}
`).join('\n')}

Extract and categorize in JSON format:
{
  "anglesUsed": ["<angle1>", "<angle2>", ...],
  "storiesTold": ["<story type1>", "<story type2>", ...],
  "personasUsed": ["<persona type1>", "<persona type2>", ...],
  "structuresUsed": ["<structure type1>", "<structure type2>", ...],
  "emotionsUsed": [{"emotion": "curiosity", "count": 5}, ...],
  "analogiesUsed": ["<analogy1>", "<analogy2>", ...],
  "audienceAddressed": ["<segment1>", "<segment2>", ...],
  "saturatedElements": ["<overused element1>", "<overused element2>", ...],
  "untappedOpportunities": ["<opportunity1>", "<opportunity2>", ...],
  "uniqueAnglesNotUsed": ["<angle1>", "<angle2>", ...],
  "rareEmotionCombos": [{"emotions": ["surprise", "anger"], "potential": "high"}],
  "depthAnalysis": {
    "averageDepth": "<shallow/medium/deep>",
    "commonEvidenceTypes": ["<type1>", "<type2>"],
    "missingEvidenceTypes": ["<type1>", "<type2>"]
  },
  "recommendations": {
    "winningAngle": "<suggested unique angle>",
    "untappedAudience": "<audience segment>",
    "rareEmotionCombo": ["emotion1", "emotion2"],
    "uniquePerspective": "<perspective not yet used>"
  }
}`;

  try {
    const response = await llm.chat([
      { role: 'system', content: 'You are a competitive content analyst specializing in content differentiation. Return JSON only.' },
      { role: 'user', content: analysisPrompt }
    ], { temperature: 0.5, maxTokens: 4000 });
    
    const analysis = safeJsonParse(response.content);
    
    if (analysis) {
      const thinkingText = `Analyzing ${competitorContent.length} competitor contents...
      
Angles Already Used: ${(analysis.anglesUsed || []).slice(0, 5).join(', ')}
Saturated (AVOID): ${(analysis.saturatedElements || []).slice(0, 3).join(', ')}
Untapped (USE): ${(analysis.untappedOpportunities || []).slice(0, 3).join(', ')}

Recommended Winning Angle: ${analysis.recommendations?.winningAngle || 'Be unique'}`;

      displayThinking('COMPETITOR', thinkingText);
      
      return {
        ...analysis,
        competitorContent: competitorContent.map(c => c.content.substring(0, 300)),
        nlpAnalysis: nlpResults
      };
    }
  } catch (error) {
    console.log(`   ⚠️ Analysis failed: ${error.message}`);
  }
  
  return { 
    anglesUsed: [], 
    storiesTold: [],
    personasUsed: [],
    structuresUsed: [],
    emotionsUsed: [],
    analogiesUsed: [],
    audienceAddressed: [],
    saturatedElements: [],
    untappedOpportunities: [],
    competitorContent: competitorContent.map(c => c.content.substring(0, 300)),
    strategy: 'Be unique and avoid common patterns'
  };
}

// ============================================================================
// MULTI-QUERY DEEP RESEARCH
// ============================================================================

async function multiQueryDeepResearch(llm, campaignTitle, campaignData) {
  console.log('\n' + '─'.repeat(60));
  console.log('🔎 MULTI-QUERY DEEP RESEARCH');
  console.log('─'.repeat(60));
  
  const currentYear = new Date().getFullYear();
  const topicKeywords = extractKeywords(campaignTitle);
  
  const searchQueries = [
    `${campaignTitle} what is how it works ${currentYear}`,
    `${topicKeywords.join(' ')} real cases examples success stories ${currentYear}`,
    `${topicKeywords.join(' ')} controversy debate problems issues`,
    `${topicKeywords.join(' ')} statistics data market size growth ${currentYear}`,
    `${topicKeywords.join(' ')} expert opinion quote analysis insight`,
    `${topicKeywords.join(' ')} untold story hidden problem nobody talks about`
  ];
  
  const allResults = [];
  
  for (let i = 0; i < searchQueries.length; i++) {
    console.log(`   🔍 Query ${i + 1}/${searchQueries.length}: "${searchQueries[i].substring(0, 50)}..."`);
    
    const results = await llm.webSearch(searchQueries[i]);
    
    if (results && results.length > 0) {
      allResults.push({
        query: searchQueries[i],
        queryType: ['basics', 'cases', 'controversies', 'statistics', 'expert', 'untold'][i],
        results: results.slice(0, 3)
      });
    }
    
    await delay(1000);
  }
  
  const synthesisPrompt = `Synthesize these research findings for creating unique content about "${campaignTitle}":

${allResults.map(r => `
--- ${r.queryType.toUpperCase()} ---
${r.results.map(res => `- ${res.name}: ${res.snippet?.substring(0, 150)}`).join('\n')}
`).join('\n')}

Extract in JSON format:
{
  "keyFacts": ["<fact1>", "<fact2>", ...],
  "realCases": ["<case1>", "<case2>", ...],
  "controversies": ["<controversy1>", "<controversy2>", ...],
  "statistics": ["<stat1>", "<stat2>", ...],
  "expertQuotes": ["<quote1>", "<quote2>", ...],
  "untoldStories": ["<story1>", "<story2>", ...],
  "uniqueAngles": [{"angle": "<angle>", "evidence": "<supporting evidence>", "uniqueness": "<why unique>"}],
  "evidenceLayers": {
    "macroData": "<large scale data>",
    "caseStudy": "<specific example>",
    "personalTouch": "<relatable element>",
    "expertValidation": "<expert source>"
  }
}`;

  try {
    const response = await llm.chat([
      { role: 'system', content: 'You are a research synthesizer. Extract unique angles and evidence for content creation. Return JSON only.' },
      { role: 'user', content: synthesisPrompt }
    ], { temperature: 0.5, maxTokens: 3000 });
    
    const synthesis = safeJsonParse(response.content);
    
    if (synthesis) {
      displayThinking('RESEARCH', `Found ${synthesis.keyFacts?.length || 0} facts, ${synthesis.uniqueAngles?.length || 0} unique angles`);
      return { rawResults: allResults, synthesis };
    }
  } catch (error) {
    console.log(`   ⚠️ Synthesis failed: ${error.message}`);
  }
  
  return { rawResults: allResults, synthesis: {} };
}

// ============================================================================
// CONTENT GENERATION (Hybrid Enhanced)
// ============================================================================

async function generateUniqueContent(llm, campaignData, competitorAnalysis, researchData, tweetCount = 1) {
  console.log('\n' + '─'.repeat(60));
  console.log('✨ GENERATING UNIQUE CONTENT (Hybrid Enhanced)');
  console.log('─'.repeat(60));
  
  // Select unique elements
  const persona = selectUnusedPersona(competitorAnalysis);
  const narrativeStructure = selectUnusedNarrativeStructure(competitorAnalysis);
  const audience = selectUnaddressedAudience(competitorAnalysis, campaignData.title);
  const emotionCombo = selectRareEmotionCombo(competitorAnalysis);
  
  console.log(`   🎭 Selected Persona: ${persona.name}`);
  console.log(`   📖 Narrative Structure: ${narrativeStructure.name}`);
  console.log(`   👥 Target Audience: ${audience.name}`);
  console.log(`   💫 Emotion Combo: ${emotionCombo.emotions.join(' + ')} (${emotionCombo.rarityLevel})`);
  
  // Build the generation prompt
  const systemPrompt = `You are an expert content creator for Rally.fun. Create UNIQUE, engaging content.

CRITICAL RULES:
1. NO TEMPLATES - Content must flow naturally
2. NO AI-SOUNDING language (avoid: delve, leverage, realm, tapestry, paradigm, landscape, nuance)
3. Use PERSONAL, CONVERSATIONAL tone
4. Include EVIDENCE LAYERS (data, case, personal touch, expert)
5. Create EMOTIONAL journey (${emotionCombo.emotions.join(' → ')})
6. Target AUDIENCE: ${audience.name} (Pain: ${audience.pain})
7. Use ${persona.name} persona (${persona.trait})
8. Follow ${narrativeStructure.name} flow: ${narrativeStructure.flow}

AVOID THESE OVERUSED ELEMENTS:
${(competitorAnalysis?.saturatedElements || []).slice(0, 5).join(', ') || 'None specific'}
${CONFIG.hardRequirements.templatePhrases.slice(0, 10).join(', ')}

CONTENT REQUIREMENTS:
- Hook: Natural, organic (NOT formulaic)
- Emotions: At least 3 different emotions
- Body Feeling: Physical sensation the reader feels
- CTA: Question or reply bait
- URL: MUST include ${campaignData.campaignUrl || campaignData.url || 'the campaign URL'}
- Facts: Multi-layer evidence

Return JSON:
{
  "tweets": [
    {
      "content": "<full tweet text>",
      "hook": "<the hook>",
      "emotions": ["emotion1", "emotion2", ...],
      "bodyFeeling": "<physical sensation>",
      "cta": "<call to action>",
      "evidenceUsed": ["<evidence1>", "<evidence2>"]
    }
  ],
  "strategyUsed": {
    "angle": "<unique angle>",
    "differentiationPoint": "<how this differs from competitors>",
    "emotionJourney": "<emotional arc>"
  }
}`;

  const userPrompt = `Create ${tweetCount} UNIQUE tweet(s) for:

CAMPAIGN: ${campaignData.title || 'Unknown'}
GOAL: ${campaignData.goal || campaignData.description || 'Not provided'}
KNOWLEDGE BASE: ${campaignData.knowledgeBase || 'Not provided'}
URL: ${campaignData.campaignUrl || campaignData.url || 'Include campaign URL'}

RESEARCH DATA:
${researchData?.synthesis?.keyFacts?.slice(0, 5).join('\n') || 'No research data'}

COMPETITOR ANGLES TO AVOID:
${(competitorAnalysis?.anglesUsed || []).slice(0, 5).join(', ') || 'None'}

Create content that stands out!`;

  try {
    const response = await llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { temperature: 0.8, maxTokens: 4000 });
    
    const result = safeJsonParse(response.content);
    
    if (result && result.tweets) {
      console.log(`   ✅ Generated ${result.tweets.length} tweets`);
      
      if (response.thinking) {
        displayThinking('GENERATION', response.thinking);
      }
      
      return {
        tweets: result.tweets,
        strategyUsed: result.strategyUsed || {},
        selectedElements: { persona, narrativeStructure, audience, emotionCombo },
        raw: response.content
      };
    }
  } catch (error) {
    console.log(`   ⚠️ Generation failed: ${error.message}`);
  }
  
  return null;
}

// ============================================================================
// JUDGING SYSTEM (Enhanced with Python NLP)
// ============================================================================

async function runHybridJudging(llm, content, campaignData, competitorContents, attempt = 1) {
  console.log('\n' + '═'.repeat(60));
  console.log(`⚖️  HYBRID JUDGING SYSTEM - Attempt ${attempt}`);
  console.log('═'.repeat(60));
  
  const results = {
    attempt,
    judges: {},
    scores: {},
    feedback: {},
    nlpAnalysis: null,
    passed: false,
    totalScore: 0
  };
  
  // Get Python NLP Analysis first
  const nlpAnalyzer = llm.getNLPAnalyzer();
  results.nlpAnalysis = await nlpAnalyzer.analyzeContent(content, campaignData, competitorContents);
  
  console.log(`\n   🐍 Python NLP Quality: ${results.nlpAnalysis.hybridMetrics?.qualityGrade} (${results.nlpAnalysis.hybridMetrics?.overallQuality}/100)`);
  
  // Judge 1: Gate Utama
  console.log('\n   ─── JUDGE 1: GATE UTAMA ───');
  const judge1Result = await llm.blindJudge(
    getJudge1SystemPrompt(),
    getJudge1UserPrompt(content, campaignData),
    1
  );
  results.judges.judge1 = parseJudgeResult(judge1Result.content);
  results.scores.gateUtama = calculateJudge1Score(results.judges.judge1);
  
  if (judge1Result.thinking) displayJudgeThinking(1, judge1Result.thinking);
  
  await delay(CONFIG.delays.betweenJudges);
  
  // Judge 2: Gate Tambahan
  console.log('\n   ─── JUDGE 2: GATE TAMBAHAN ───');
  const judge2Result = await llm.blindJudge(
    getJudge2SystemPrompt(),
    getJudge2UserPrompt(content, campaignData),
    2
  );
  results.judges.judge2 = parseJudgeResult(judge2Result.content);
  results.scores.gateTambahan = calculateJudge2Score(results.judges.judge2);
  
  if (judge2Result.thinking) displayJudgeThinking(2, judge2Result.thinking);
  
  await delay(CONFIG.delays.betweenJudges);
  
  // Judge 3: Penilaian Internal
  console.log('\n   ─── JUDGE 3: PENILAIAN INTERNAL ───');
  const judge3Result = await llm.blindJudge(
    getJudge3SystemPrompt(),
    getJudge3UserPrompt(content, campaignData),
    3
  );
  results.judges.judge3 = parseJudgeResult(judge3Result.content);
  results.scores.penilaianInternal = calculateJudge3Score(results.judges.judge3);
  
  if (judge3Result.thinking) displayJudgeThinking(3, judge3Result.thinking);
  
  await delay(CONFIG.delays.betweenJudges);
  
  // Judge 4: Compliance (Enhanced - 10 checks)
  console.log('\n   ─── JUDGE 4: COMPREHENSIVE COMPLIANCE ───');
  const judge4Result = await llm.contextAwareJudge(
    getJudge4SystemPrompt(),
    getJudge4UserPrompt(content, campaignData),
    4
  );
  results.judges.judge4 = parseJudge4Result(judge4Result.content);
  results.scores.compliance = calculateJudge4Score(results.judges.judge4);
  
  if (judge4Result.thinking) displayJudgeThinking(4, judge4Result.thinking);
  
  await delay(CONFIG.delays.betweenJudges);
  
  // Judge 5: Fact-Check (with Web Search)
  console.log('\n   ─── JUDGE 5: FACT-CHECK ───');
  const judge5Result = await llm.factCheckJudge(
    getJudge5SystemPrompt(),
    getJudge5UserPrompt(content, campaignData),
    5
  );
  results.judges.judge5 = parseJudgeResult(judge5Result.content);
  results.scores.factCheck = calculateJudge5Score(results.judges.judge5);
  
  if (judge5Result.thinking) displayJudgeThinking(5, judge5Result.thinking);
  
  await delay(CONFIG.delays.betweenJudges);
  
  // Judge 6: Uniqueness (Python NLP Enhanced)
  console.log('\n   ─── JUDGE 6: UNIQUENESS VERIFIER (Hybrid) ───');
  const judge6Result = await llm.hybridJudge(
    getJudge6SystemPrompt(),
    getJudge6UserPrompt(content, campaignData, competitorContents),
    6,
    content,
    competitorContents
  );
  results.judges.judge6 = parseJudge6Result(judge6Result.content, results.nlpAnalysis);
  results.scores.uniqueness = calculateJudge6Score(results.judges.judge6);
  
  if (judge6Result.thinking) displayJudgeThinking(6, judge6Result.thinking);
  
  // Compile feedback
  results.feedback = compileJudgeFeedback(results);
  
  // Calculate final score
  results.totalScore = 
    results.scores.gateUtama +
    results.scores.gateTambahan +
    results.scores.penilaianInternal +
    results.scores.compliance +
    results.scores.factCheck +
    results.scores.uniqueness;
  
  // Determine if passed
  results.passed = determinePassStatus(results);
  
  // Display summary
  displayJudgingSummary(results);
  
  return results;
}

// ============================================================================
// JUDGE PROMPTS
// ============================================================================

function getJudge1SystemPrompt() {
  return `You are Judge 1: Gate Utama for Rally.fun content evaluation.

Score each criterion 1-4:
- Hook Quality (1-4): Is the opening compelling and natural?
- Emotional Impact (1-4): Does it evoke real emotions?
- Body Feeling (1-4): Can the reader FEEL something physical?
- CTA Quality (1-4): Is the call-to-action engaging?
- URL Presence (1-4): Is the campaign URL included?

Return JSON:
{
  "hookQuality": {"score": N, "reason": "..."},
  "emotionalImpact": {"score": N, "reason": "..."},
  "bodyFeeling": {"score": N, "reason": "..."},
  "ctaQuality": {"score": N, "reason": "..."},
  "urlPresence": {"score": N, "reason": "..."},
  "totalScore": N,
  "feedback": "..."
}`;
}

function getJudge1UserPrompt(content, campaignData) {
  return `Evaluate this content for Gate Utama:

CONTENT:
${content}

CAMPAIGN URL: ${campaignData.campaignUrl || campaignData.url || 'Check for URL'}

Evaluate and return JSON scores.`;
}

function getJudge2SystemPrompt() {
  return `You are Judge 2: Gate Tambahan for Rally.fun content evaluation.

Score each criterion 1-4:
- Fact Quality (1-4): Are facts/data compelling?
- Engagement Hook (1-4): Does it hook for replies?
- Readability (1-4): Is it easy to read?
- Originality (1-4): Is it unique, not template-like?

Return JSON:
{
  "factQuality": {"score": N, "reason": "..."},
  "engagementHook": {"score": N, "reason": "..."},
  "readability": {"score": N, "reason": "..."},
  "originality": {"score": N, "reason": "..."},
  "totalScore": N,
  "feedback": "..."
}`;
}

function getJudge2UserPrompt(content, campaignData) {
  return `Evaluate this content for Gate Tambahan:

CONTENT:
${content}

Evaluate and return JSON scores.`;
}

function getJudge3SystemPrompt() {
  return `You are Judge 3: Penilaian Internal for Rally.fun content evaluation.

Score each criterion 1-10:
- Content Depth (1-10): Multi-layer evidence?
- Story Quality (1-10): Compelling narrative?
- Audience Fit (1-10): Matches target audience?
- Emotion Variety (1-10): Multiple emotions?
- Evidence Layering (1-10): Data + Case + Personal + Expert?
- Anti-Template Score (1-10): NOT formulaic?

Return JSON:
{
  "contentDepth": {"score": N, "reason": "..."},
  "storyQuality": {"score": N, "reason": "..."},
  "audienceFit": {"score": N, "reason": "..."},
  "emotionVariety": {"score": N, "reason": "..."},
  "evidenceLayering": {"score": N, "reason": "..."},
  "antiTemplate": {"score": N, "reason": "..."},
  "totalScore": N,
  "feedback": "..."
}`;
}

function getJudge3UserPrompt(content, campaignData) {
  return `Evaluate this content for Penilaian Internal:

CONTENT:
${content}

CAMPAIGN CONTEXT:
Title: ${campaignData.title || 'Unknown'}
Goal: ${campaignData.goal || 'Unknown'}
Target Audience: ${campaignData.targetAudience || 'General'}

Evaluate and return JSON scores.`;
}

function getJudge4SystemPrompt() {
  return `You are Judge 4: Comprehensive Compliance for Rally.fun.

Check ALL 10 requirements (pass/fail):

1. Description Alignment: Does content match campaign description?
2. Style Compliance: Matches campaign style requirements?
3. Knowledge Base: Uses provided knowledge correctly?
4. Campaign Rules: Follows all campaign rules?
5. URL Required: Includes required URL?
6. No Banned Words: No banned phrases used?
7. No AI Patterns: Doesn't sound AI-generated?
8. Evidence Depth: Has sufficient evidence layers?
9. Anti-Template: Not using formulaic structures?
10. Quality Threshold: Meets minimum quality?

Return JSON:
{
  "checks": {
    "descriptionAlignment": {"pass": true/false, "reason": "..."},
    "styleCompliance": {"pass": true/false, "reason": "..."},
    "knowledgeBase": {"pass": true/false, "reason": "..."},
    "campaignRules": {"pass": true/false, "reason": "..."},
    "requiredUrl": {"pass": true/false, "reason": "..."},
    "noBannedWords": {"pass": true/false, "reason": "..."},
    "noAIPatterns": {"pass": true/false, "reason": "..."},
    "evidenceDepth": {"pass": true/false, "reason": "..."},
    "antiTemplate": {"pass": true/false, "reason": "..."},
    "qualityThreshold": {"pass": true/false, "reason": "..."}
  },
  "allPass": true/false,
  "failedChecks": ["list of failed check names"],
  "feedback": "..."
}`;
}

function getJudge4UserPrompt(content, campaignData) {
  return `Check compliance for:

CONTENT:
${content}

CAMPAIGN DATA:
Title: ${campaignData.title || 'Unknown'}
Description: ${campaignData.description || 'Unknown'}
Knowledge Base: ${campaignData.knowledgeBase || 'Unknown'}
Campaign Rules: ${campaignData.rules || 'Standard rules'}
Required URL: ${campaignData.campaignUrl || campaignData.url || 'Required'}

BANNED WORDS: ${CONFIG.hardRequirements.bannedWords.concat(CONFIG.hardRequirements.rallyBannedPhrases).join(', ')}

AI PATTERNS TO DETECT: ${CONFIG.hardRequirements.aiPatterns.words.concat(CONFIG.hardRequirements.aiPatterns.phrases).join(', ')}

Check all 10 requirements and return JSON.`;
}

function getJudge5SystemPrompt() {
  return `You are Judge 5: Fact-Check Judge for Rally.fun.

Verify claims in content using web search results.

Score each criterion 1-5:
- Claim Accuracy (1-5): Are claims verifiable?
- Source Quality (1-5): Are sources reliable?
- Data Freshness (1-5): Is data current?

Return JSON:
{
  "claimAccuracy": {"score": N, "reason": "...", "verified": true/false},
  "sourceQuality": {"score": N, "reason": "..."},
  "dataFreshness": {"score": N, "reason": "..."},
  "totalScore": N,
  "factCheckResults": ["result1", "result2"],
  "feedback": "..."
}`;
}

function getJudge5UserPrompt(content, campaignData) {
  return `Fact-check this content:

CONTENT:
${content}

Use web search results to verify claims.
Return JSON with scores and verification results.`;
}

function getJudge6SystemPrompt() {
  return `You are Judge 6: Uniqueness Verifier for Rally.fun.

Compare content against ALL competitor contents.
Use Python NLP analysis for semantic similarity.

Score each criterion:
- Differentiation (1-10): How different from competitors?
- Unique Angle (1-5): Is the angle unique?
- Emotion Uniqueness (1-5): Rare emotion combo?
- Template Avoidance (1-5): Not formulaic?

Return JSON:
{
  "differentiation": {"score": N, "reason": "..."},
  "uniqueAngle": {"score": N, "reason": "..."},
  "emotionUniqueness": {"score": N, "reason": "..."},
  "templateAvoidance": {"score": N, "reason": "..."},
  "similarityScore": N,
  "isUnique": true/false,
  "totalScore": N,
  "feedback": "..."
}`;
}

function getJudge6UserPrompt(content, campaignData, competitorContents) {
  return `Verify uniqueness:

CONTENT TO CHECK:
${content}

COMPETITOR CONTENTS:
${(competitorContents || []).slice(0, 5).map((c, i) => `
--- Competitor ${i + 1} ---
${c.substring ? c.substring(0, 300) : c}
`).join('\n')}

Compare and score uniqueness. Use NLP similarity data.`;
}

// ============================================================================
// SCORE CALCULATORS
// ============================================================================

function parseJudgeResult(content) {
  return safeJsonParse(content) || { totalScore: 0, feedback: 'Failed to parse' };
}

function parseJudge4Result(content) {
  const result = safeJsonParse(content);
  if (!result) {
    return {
      checks: {},
      allPass: false,
      failedChecks: ['parse_failed'],
      feedback: 'Failed to parse'
    };
  }
  
  // Ensure all 10 checks exist
  const defaultChecks = {
    descriptionAlignment: { pass: false, reason: 'Not checked' },
    styleCompliance: { pass: false, reason: 'Not checked' },
    knowledgeBase: { pass: false, reason: 'Not checked' },
    campaignRules: { pass: false, reason: 'Not checked' },
    requiredUrl: { pass: false, reason: 'Not checked' },
    noBannedWords: { pass: false, reason: 'Not checked' },
    noAIPatterns: { pass: false, reason: 'Not checked' },
    evidenceDepth: { pass: false, reason: 'Not checked' },
    antiTemplate: { pass: false, reason: 'Not checked' },
    qualityThreshold: { pass: false, reason: 'Not checked' }
  };
  
  result.checks = { ...defaultChecks, ...(result.checks || {}) };
  
  // Recalculate allPass
  const failedChecks = Object.entries(result.checks)
    .filter(([key, check]) => check.pass !== true)
    .map(([key]) => key);
  
  result.allPass = failedChecks.length === 0;
  result.failedChecks = failedChecks;
  
  return result;
}

function parseJudge6Result(content, nlpAnalysis) {
  const result = safeJsonParse(content) || {};
  
  // Enhance with NLP data
  if (nlpAnalysis) {
    result.nlpEnhanced = {
      similarity: nlpAnalysis.similarity?.primary?.max_similarity || 0,
      emotionVariety: nlpAnalysis.emotions?.emotion_variety || 0,
      rareCombo: nlpAnalysis.emotions?.rare_combo_detected || false,
      depthLevel: nlpAnalysis.depth_analysis?.depth_level || 'unknown',
      qualityGrade: nlpAnalysis.hybridMetrics?.qualityGrade || 'N/A'
    };
  }
  
  return result;
}

function calculateJudge1Score(result) {
  if (!result) return 0;
  const scores = [
    result.hookQuality?.score || 0,
    result.emotionalImpact?.score || 0,
    result.bodyFeeling?.score || 0,
    result.ctaQuality?.score || 0,
    result.urlPresence?.score || 0
  ];
  return scores.reduce((a, b) => a + b, 0);
}

function calculateJudge2Score(result) {
  if (!result) return 0;
  const scores = [
    result.factQuality?.score || 0,
    result.engagementHook?.score || 0,
    result.readability?.score || 0,
    result.originality?.score || 0
  ];
  return scores.reduce((a, b) => a + b, 0);
}

function calculateJudge3Score(result) {
  if (!result) return 0;
  const scores = [
    result.contentDepth?.score || 0,
    result.storyQuality?.score || 0,
    result.audienceFit?.score || 0,
    result.emotionVariety?.score || 0,
    result.evidenceLayering?.score || 0,
    result.antiTemplate?.score || 0
  ];
  return scores.reduce((a, b) => a + b, 0);
}

function calculateJudge4Score(result) {
  if (!result || !result.checks) return 0;
  
  // Each check is worth 1 point
  const passedCount = Object.values(result.checks)
    .filter(check => check.pass === true)
    .length;
  
  return passedCount;
}

function calculateJudge5Score(result) {
  if (!result) return 0;
  const scores = [
    result.claimAccuracy?.score || 0,
    result.sourceQuality?.score || 0,
    result.dataFreshness?.score || 0
  ];
  return Math.min(scores.reduce((a, b) => a + b, 0), 5);
}

function calculateJudge6Score(result) {
  if (!result) return 0;
  
  let score = 0;
  score += (result.differentiation?.score || 0) * 1.5; // Max 15
  score += (result.uniqueAngle?.score || 0); // Max 5
  score += (result.emotionUniqueness?.score || 0); // Max 5
  
  // Bonus for rare emotion combo
  if (result.nlpEnhanced?.rareCombo) {
    score += 2;
  }
  
  // Penalty for high similarity
  if (result.nlpEnhanced?.similarity > 0.7) {
    score -= 5;
  }
  
  return Math.max(0, Math.min(25, score));
}

function compileJudgeFeedback(results) {
  const feedback = {
    allPass: true,
    issues: [],
    suggestions: [],
    judgeFeedbacks: {}
  };
  
  // Judge 1 feedback
  if (results.judges.judge1) {
    feedback.judgeFeedbacks.judge1 = results.judges.judge1.feedback || '';
    if (results.scores.gateUtama < CONFIG.thresholds.gateUtama.pass) {
      feedback.allPass = false;
      feedback.issues.push(`Gate Utama: ${results.scores.gateUtama}/${CONFIG.thresholds.gateUtama.max} (need ${CONFIG.thresholds.gateUtama.pass})`);
    }
  }
  
  // Judge 2 feedback
  if (results.judges.judge2) {
    feedback.judgeFeedbacks.judge2 = results.judges.judge2.feedback || '';
    if (results.scores.gateTambahan < CONFIG.thresholds.gateTambahan.pass) {
      feedback.allPass = false;
      feedback.issues.push(`Gate Tambahan: ${results.scores.gateTambahan}/${CONFIG.thresholds.gateTambahan.max} (need ${CONFIG.thresholds.gateTambahan.pass})`);
    }
  }
  
  // Judge 3 feedback
  if (results.judges.judge3) {
    feedback.judgeFeedbacks.judge3 = results.judges.judge3.feedback || '';
    if (results.scores.penilaianInternal < CONFIG.thresholds.penilaianInternal.pass) {
      feedback.allPass = false;
      feedback.issues.push(`Penilaian Internal: ${results.scores.penilaianInternal}/${CONFIG.thresholds.penilaianInternal.max} (need ${CONFIG.thresholds.penilaianInternal.pass})`);
    }
  }
  
  // Judge 4 feedback (Critical - all must pass)
  if (results.judges.judge4) {
    feedback.judgeFeedbacks.judge4 = results.judges.judge4.feedback || '';
    if (!results.judges.judge4.allPass) {
      feedback.allPass = false;
      feedback.issues.push(`Compliance FAILED: ${results.judges.judge4.failedChecks?.join(', ')}`);
      
      // Add specific feedback for each failed check
      for (const [checkName, checkResult] of Object.entries(results.judges.judge4.checks || {})) {
        if (checkResult.pass !== true) {
          feedback.suggestions.push(`${checkName}: ${checkResult.reason || 'Failed'}`);
        }
      }
    }
  }
  
  // Judge 5 feedback
  if (results.judges.judge5) {
    feedback.judgeFeedbacks.judge5 = results.judges.judge5.feedback || '';
    if (results.scores.factCheck < CONFIG.thresholds.factCheck.pass) {
      feedback.issues.push(`Fact-Check: ${results.scores.factCheck}/${CONFIG.thresholds.factCheck.max} (need ${CONFIG.thresholds.factCheck.pass})`);
    }
  }
  
  // Judge 6 feedback
  if (results.judges.judge6) {
    feedback.judgeFeedbacks.judge6 = results.judges.judge6.feedback || '';
    if (results.scores.uniqueness < CONFIG.thresholds.uniqueness.pass) {
      feedback.allPass = false;
      feedback.issues.push(`Uniqueness: ${results.scores.uniqueness}/${CONFIG.thresholds.uniqueness.max} (need ${CONFIG.thresholds.uniqueness.pass})`);
      
      if (results.judges.judge6.nlpEnhanced?.similarity > 0.7) {
        feedback.suggestions.push('Content too similar to competitors - increase differentiation');
      }
    }
  }
  
  // Add NLP suggestions
  if (results.nlpAnalysis?.hybridMetrics?.recommendations) {
    feedback.suggestions.push(...results.nlpAnalysis.hybridMetrics.recommendations);
  }
  
  return feedback;
}

function determinePassStatus(results) {
  // All thresholds must pass
  const gateUtamaPass = results.scores.gateUtama >= CONFIG.thresholds.gateUtama.pass;
  const gateTambahanPass = results.scores.gateTambahan >= CONFIG.thresholds.gateTambahan.pass;
  const penilaianInternalPass = results.scores.penilaianInternal >= CONFIG.thresholds.penilaianInternal.pass;
  const compliancePass = results.judges.judge4?.allPass === true;
  const factCheckPass = results.scores.factCheck >= CONFIG.thresholds.factCheck.pass;
  const uniquenessPass = results.scores.uniqueness >= CONFIG.thresholds.uniqueness.pass;
  
  return gateUtamaPass && gateTambahanPass && penilaianInternalPass && 
         compliancePass && factCheckPass && uniquenessPass;
}

function displayJudgingSummary(results) {
  console.log('\n   ' + '═'.repeat(56));
  console.log('   ║              ⚖️  JUDGING SUMMARY                        ║');
  console.log('   ╠' + '═'.repeat(56) + '╣');
  
  const thresholds = CONFIG.thresholds;
  
  // Gate Utama
  const g1Status = results.scores.gateUtama >= thresholds.gateUtama.pass ? '✅' : '❌';
  console.log(`   ║ ${g1Status} Gate Utama:        ${results.scores.gateUtama.toString().padStart(2)}/${thresholds.gateUtama.max}  (need ${thresholds.gateUtama.pass})                    ║`);
  
  // Gate Tambahan
  const g2Status = results.scores.gateTambahan >= thresholds.gateTambahan.pass ? '✅' : '❌';
  console.log(`   ║ ${g2Status} Gate Tambahan:     ${results.scores.gateTambahan.toString().padStart(2)}/${thresholds.gateTambahan.max}  (need ${thresholds.gateTambahan.pass})                    ║`);
  
  // Penilaian Internal
  const g3Status = results.scores.penilaianInternal >= thresholds.penilaianInternal.pass ? '✅' : '❌';
  console.log(`   ║ ${g3Status} Penilaian Internal: ${results.scores.penilaianInternal.toString().padStart(2)}/${thresholds.penilaianInternal.max}  (need ${thresholds.penilaianInternal.pass})                   ║`);
  
  // Compliance
  const g4Status = results.judges.judge4?.allPass ? '✅' : '❌';
  console.log(`   ║ ${g4Status} Compliance:        ${results.scores.compliance.toString().padStart(2)}/${thresholds.compliance.max}  (all must pass)                  ║`);
  
  // Fact-Check
  const g5Status = results.scores.factCheck >= thresholds.factCheck.pass ? '✅' : '❌';
  console.log(`   ║ ${g5Status} Fact-Check:         ${results.scores.factCheck.toString().padStart(2)}/${thresholds.factCheck.max}  (need ${thresholds.factCheck.pass})                     ║`);
  
  // Uniqueness
  const g6Status = results.scores.uniqueness >= thresholds.uniqueness.pass ? '✅' : '❌';
  console.log(`   ║ ${g6Status} Uniqueness:        ${results.scores.uniqueness.toString().padStart(2)}/${thresholds.uniqueness.max}  (need ${thresholds.uniqueness.pass})                    ║`);
  
  console.log('   ╠' + '─'.repeat(56) + '╣');
  
  // Total
  const totalStatus = results.passed ? '✅ PASSED' : '❌ FAILED';
  console.log(`   ║              TOTAL: ${results.totalScore.toString().padStart(3)}/100  ${totalStatus.padEnd(14)}║`);
  
  // NLP Quality
  if (results.nlpAnalysis?.hybridMetrics) {
    const grade = results.nlpAnalysis.hybridMetrics.qualityGrade;
    const quality = results.nlpAnalysis.hybridMetrics.overallQuality;
    console.log(`   ║         NLP Quality: ${grade} (${quality}/100)                        ║`);
  }
  
  console.log('   ╚' + '═'.repeat(56) + '╝');
  
  // Show issues if failed
  if (!results.passed && results.feedback?.issues?.length > 0) {
    console.log('\n   ⚠️  ISSUES:');
    results.feedback.issues.forEach(issue => {
      console.log(`      • ${issue}`);
    });
    
    if (results.feedback.suggestions?.length > 0) {
      console.log('\n   💡 SUGGESTIONS:');
      results.feedback.suggestions.slice(0, 5).forEach(suggestion => {
        console.log(`      • ${suggestion}`);
      });
    }
  }
}

// ============================================================================
// RALLY API FUNCTIONS
// ============================================================================

async function fetchCampaignData(campaignAddress) {
  console.log(`\n📥 Fetching campaign data: ${campaignAddress}`);
  
  try {
    const response = await new Promise((resolve, reject) => {
      const url = `${CONFIG.rallyApiBase}/campaigns/${campaignAddress}`;
      
      https.get(url, { headers: { 'User-Agent': CONFIG.userAgent } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Failed to parse campaign data'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
    
    console.log('   ✅ Campaign data fetched');
    return response;
  } catch (error) {
    console.log(`   ⚠️ Failed to fetch campaign: ${error.message}`);
    return null;
  }
}

async function fetchLeaderboard(campaignAddress) {
  console.log(`\n📥 Fetching leaderboard...`);
  
  try {
    const response = await new Promise((resolve, reject) => {
      const url = `${CONFIG.rallyApiBase}/campaigns/${campaignAddress}/leaderboard`;
      
      https.get(url, { headers: { 'User-Agent': CONFIG.userAgent } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve([]);
            }
          } else {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
    
    console.log(`   ✅ Leaderboard fetched: ${response?.length || 0} submissions`);
    return response || [];
  } catch (error) {
    console.log(`   ⚠️ Failed to fetch leaderboard: ${error.message}`);
    return [];
  }
}

// ============================================================================
// REVISION LOOP
// ============================================================================

async function revisionLoop(llm, content, campaignData, competitorContents, attempt, feedback) {
  console.log('\n' + '─'.repeat(60));
  console.log(`🔄 REVISION LOOP - Attempt ${attempt + 1}`);
  console.log('─'.repeat(60));
  
  if (attempt >= CONFIG.revision.maxAttempts) {
    console.log('   ❌ Max revision attempts reached');
    return null;
  }
  
  await delay(CONFIG.delays.beforeRevision);
  
  // Generate revision with feedback
  const revisionPrompt = `REVISE this content based on judge feedback.

ORIGINAL CONTENT:
${content}

JUDGE FEEDBACK:
${JSON.stringify(feedback, null, 2)}

ISSUES TO FIX:
${feedback?.issues?.join('\n') || 'None specific'}

SUGGESTIONS:
${feedback?.suggestions?.join('\n') || 'None specific'}

Create REVISED content that:
1. Addresses ALL failed checks
2. Maintains the unique angle
3. Improves weak areas
4. Keeps the URL included

Return JSON:
{
  "revisedContent": "<full revised tweet>",
  "changes": ["change1", "change2", ...]
}`;

  try {
    const response = await llm.chat([
      { role: 'system', content: 'You are a content revision specialist. Fix issues while maintaining uniqueness.' },
      { role: 'user', content: revisionPrompt }
    ], { temperature: 0.6, maxTokens: 2000 });
    
    const result = safeJsonParse(response.content);
    
    if (result && result.revisedContent) {
      console.log(`   ✅ Revision generated`);
      console.log(`   📝 Changes: ${(result.changes || []).join(', ')}`);
      return result.revisedContent;
    }
  } catch (error) {
    console.log(`   ⚠️ Revision failed: ${error.message}`);
  }
  
  return null;
}

// ============================================================================
// MAIN WORKFLOW
// ============================================================================

async function main(campaignAddress) {
  console.log('\n' + '═'.repeat(70));
  console.log('║          RALLY WORKFLOW V9.8.0 - HYBRID SYSTEM                 ║');
  console.log('║      JavaScript AI/SDK + Python NLP (Semantic Analysis)         ║');
  console.log('═'.repeat(70));
  
  const startTime = Date.now();
  
  // Initialize LLM
  const llm = new MultiProviderLLM(CONFIG);
  await llm.loadAutoToken();
  llm.displayTokenPoolStatus();
  
  // Check Python NLP Service
  const nlpAnalyzer = llm.getNLPAnalyzer();
  await nlpAnalyzer.checkService();
  
  // Fetch campaign data
  const campaignData = await fetchCampaignData(campaignAddress);
  if (!campaignData) {
    console.log('❌ Failed to fetch campaign data');
    process.exit(1);
  }
  
  // Fetch leaderboard for competitor analysis
  const leaderboard = await fetchLeaderboard(campaignAddress);
  
  // Deep competitor analysis (Python NLP enhanced)
  const competitorAnalysis = await deepCompetitorContentAnalysis(
    llm, 
    leaderboard, 
    campaignData.title, 
    campaignData
  );
  
  // Multi-query research
  const researchData = await multiQueryDeepResearch(llm, campaignData.title, campaignData);
  
  // Generate unique content
  const generatedContent = await generateUniqueContent(
    llm, 
    campaignData, 
    competitorAnalysis, 
    researchData,
    1 // tweet count
  );
  
  if (!generatedContent || !generatedContent.tweets || generatedContent.tweets.length === 0) {
    console.log('❌ Failed to generate content');
    process.exit(1);
  }
  
  // Get the first tweet
  let currentContent = generatedContent.tweets[0].content;
  const competitorContents = competitorAnalysis.competitorContent || [];
  
  // Run judging with revision loop
  let attempt = 1;
  let judgingResults = await runHybridJudging(
    llm, 
    currentContent, 
    campaignData, 
    competitorContents,
    attempt
  );
  
  // Revision loop if failed
  while (!judgingResults.passed && attempt < CONFIG.revision.maxAttempts) {
    const revisedContent = await revisionLoop(
      llm, 
      currentContent, 
      campaignData, 
      competitorContents,
      attempt,
      judgingResults.feedback
    );
    
    if (!revisedContent) break;
    
    currentContent = revisedContent;
    attempt++;
    
    judgingResults = await runHybridJudging(
      llm, 
      currentContent, 
      campaignData, 
      competitorContents,
      attempt
    );
  }
  
  // Save results
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  const finalResults = {
    campaign: campaignData.title,
    content: currentContent,
    judging: judgingResults,
    generatedContent,
    competitorAnalysis,
    researchData: {
      keyFacts: researchData?.synthesis?.keyFacts?.slice(0, 5),
      uniqueAngles: researchData?.synthesis?.uniqueAngles?.slice(0, 3)
    },
    metadata: {
      version: '9.8.0-hybrid',
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      attempts: attempt,
      pythonNLPUsed: judgingResults.nlpAnalysis?.source === 'python_nlp'
    }
  };
  
  // Save to file
  const outputPath = `${CONFIG.outputDir}/rally-hybrid-${Date.now()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));
  console.log(`\n💾 Results saved to: ${outputPath}`);
  
  // Final summary
  console.log('\n' + '═'.repeat(70));
  console.log('║                    FINAL SUMMARY                                ║');
  console.log('═'.repeat(70));
  console.log(`\n   📊 Total Score: ${judgingResults.totalScore}/100`);
  console.log(`   🏆 Status: ${judgingResults.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   ⏱️  Duration: ${duration}s`);
  console.log(`   🔄 Attempts: ${attempt}`);
  console.log(`   🐍 Python NLP: ${judgingResults.nlpAnalysis?.source === 'python_nlp' ? '✅ Used' : '⚠️ Fallback'}`);
  
  if (judgingResults.nlpAnalysis?.hybridMetrics) {
    console.log(`   📈 NLP Quality: ${judgingResults.nlpAnalysis.hybridMetrics.qualityGrade} (${judgingResults.nlpAnalysis.hybridMetrics.overallQuality}/100)`);
  }
  
  console.log('\n   📝 CONTENT:');
  console.log('   ' + '─'.repeat(60));
  console.log('   ' + currentContent.split('\n').join('\n   '));
  console.log('   ' + '─'.repeat(60));
  
  return finalResults;
}

// ============================================================================
// ENTRY POINT
// ============================================================================

const campaignArg = process.argv[2] || 'internet-court-v0';

main(campaignArg)
  .then(results => {
    console.log('\n✅ Workflow completed successfully!');
    process.exit(results.judging.passed ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Workflow failed:', error);
    process.exit(1);
  });
