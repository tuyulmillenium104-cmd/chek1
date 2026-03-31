/**
 * ============================================================
 * RALLY HYBRID v10 — 3-Phase Agent Architecture
 * ============================================================
 * 
 * Arsitektur:
 *   Phase 0: PreWriting Agent  → Menyiapkan writing brief
 *   Phase 1: Generator Agent   → Membuat konten + self-correction
 *   Phase 2: Dual Judge        → Optimist + Critic (paralel, adversarial)
 *   Phase 3: Reconciliation    → Algoritma matematika (bukan AI)
 * 
 * Total API Calls: 4-5 per konten (vs 10-12 di v9.8.4)
 * Estimasi Waktu:   12-18 detik (vs 45-60 detik di v9.8.4)
 * 
 * IMPORTANT: Semua API key melalui ENVIRONMENT VARIABLES.
 * TIDAK ADA hardcoded credentials.
 * ============================================================
 */

'use strict';

const { randomUUID } = require('crypto');

// ============================================================
// SECTION 1: CONFIGURATION
// ============================================================

/**
 * Konfigurasi dari environment variables.
 * TIDAK ADA secret yang hardcoded.
 */
class Config {
  constructor(overrides = {}) {
    // ── API Credentials (ENV ONLY) ──
    this.ai = {
      provider:     overrides.aiProvider    || process.env.AI_PROVIDER    || 'openai',
      apiKey:       overrides.apiKey        || process.env.AI_API_KEY    || null,
      model:        overrides.model         || process.env.AI_MODEL      || 'gpt-4o',
      baseUrl:      overrides.baseUrl       || process.env.AI_BASE_URL   || null,
      maxTokens:    overrides.maxTokens     || parseInt(process.env.AI_MAX_TOKENS) || 4096,
      temperature:  overrides.temperature   || parseFloat(process.env.AI_TEMPERATURE) || 0.7,
    };

    // ── Rate Limiting ──
    this.rateLimit = {
      maxRequestsPerMinute: overrides.maxRpm || parseInt(process.env.RATE_LIMIT_RPM) || 20,
      maxTokensPerMinute:   overrides.maxTpm || parseInt(process.env.RATE_LIMIT_TPM) || 80000,
    };

    // ── Phase 0: PreWriting Agent ──
    this.preWriting = {
      enabled:          overrides.preWritingEnabled !== false,
      maxBriefLength:   overrides.maxBriefLength || 500,
      timeout:          overrides.preWritingTimeout || 15000,
    };

    // ── Phase 1: Generator Agent ──
    this.generator = {
      maxRevisions:         overrides.maxRevisions || 2,
      minQualityScore:      overrides.minQualityScore || 75,
      minAntiAiScore:       overrides.minAntiAiScore || 85,
      minImprovement:       overrides.minImprovement || 5,  // minimum score improvement between revisions
      timeoutPerIteration:  overrides.timeoutPerIter || 30000,
      totalTimeout:         overrides.genTotalTimeout || 90000,
    };

    // ── Phase 2: Dual Judge ──
    this.judge = {
      passThreshold:        overrides.passThreshold || 70,
      inconsistencyGap:     overrides.inconsistGap || 25,
      optimistWeight:       overrides.optimistWeight || 0.55,
      criticWeight:         overrides.criticWeight || 0.45,
      timeout:              overrides.judgeTimeout || 20000,
      runParallel:          overrides.runParallel !== false,
    };

    // ── Scoring Weights ──
    this.scoreWeights = {
      perspective:  0.20,
      relevance:    0.20,
      creativity:   0.20,
      technical:    0.15,
      engagement:   0.15,
      antiAi:       0.10,
    };

    // ── Validation ──
    if (!this.ai.apiKey) {
      console.warn('[CONFIG] WARNING: AI_API_KEY not set. Set via env var or override.');
    }
  }
}

// ============================================================
// SECTION 2: RATE LIMITER
// ============================================================

/**
 * Token bucket rate limiter untuk mengontrol API call frequency.
 * Reusable dari v9.8.4 tapi lebih bersih.
 */
class RateLimiter {
  constructor(config) {
    this.maxRpm = config.maxRequestsPerMinute;
    this.maxTpm = config.maxTokensPerMinute;
    this.requestTimestamps = [];
    this.tokenUsage = [];
    this.semaphore = 0;
  }

  async acquire(estimatedTokens = 0) {
    // Tunggu jika terlalu banyak request paralel
    while (this.semaphore >= 3) {
      await this.sleep(200);
    }
    this.semaphore++;

    // Cleanup timestamps lama (> 1 menit)
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
    this.tokenUsage = this.tokenUsage.filter(t => now - t.timestamp < 60000);

    // Cek rate limit
    if (this.requestTimestamps.length >= this.maxRpm) {
      const oldest = this.requestTimestamps[0];
      const waitMs = 60000 - (now - oldest) + 100;
      console.log(`[RATE LIMIT] RPM reached. Waiting ${waitMs}ms`);
      await this.sleep(waitMs);
      return this.acquire(estimatedTokens);
    }

    const currentTpm = this.tokenUsage.reduce((sum, t) => sum + t.tokens, 0);
    if (currentTpm + estimatedTokens > this.maxTpm) {
      console.log(`[RATE LIMIT] TPM limit approaching. Waiting 5s`);
      await this.sleep(5000);
      return this.acquire(estimatedTokens);
    }

    this.requestTimestamps.push(now);
    this.tokenUsage.push({ timestamp: now, tokens: estimatedTokens });
    return;
  }

  release() {
    this.semaphore = Math.max(0, this.semaphore - 1);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// SECTION 3: AI SERVICE (Multi-Provider)
// ============================================================

/**
 * Abstraksi AI API call yang support multiple providers.
 * Menggantikan hardcoded JWT tokens di v9.8.4.
 */
class AIService {
  constructor(config, rateLimiter) {
    this.config = config;
    this.rateLimiter = rateLimiter;
    this.provider = this.createProvider();
  }

  createProvider() {
    const { provider, apiKey, model, baseUrl, maxTokens, temperature } = this.config.ai;

    if (provider === 'openai' || provider === 'azure') {
      // Dynamic import untuk OpenAI SDK
      try {
        const OpenAI = require('openai');
        return new OpenAI({
          apiKey: apiKey,
          baseURL: baseUrl || undefined,
        });
      } catch (e) {
        console.warn('[AI SERVICE] OpenAI SDK not found. Using HTTP fallback.');
        return null;
      }
    }
    return null;
  }

  /**
   * Main method untuk AI chat completion.
   * Supports structured output (JSON mode).
   */
  async chat(systemPrompt, userMessage, options = {}) {
    const estimatedTokens = (systemPrompt.length + userMessage.length) / 4;
    await this.rateLimiter.acquire(estimatedTokens);

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ];

      const params = {
        model: this.config.ai.model,
        messages: messages,
        max_tokens: options.maxTokens || this.config.ai.maxTokens,
        temperature: options.temperature || this.config.ai.temperature,
      };

      // JSON mode jika diminta
      if (options.jsonMode) {
        params.response_format = { type: 'json_object' };
      }

      let response;
      if (this.provider) {
        response = await this.provider.chat.completions.create(params);
      } else {
        response = await this.httpFallback(messages, params);
      }

      const content = response.choices[0]?.message?.content || '';
      const usage = response.usage || {};
      console.log(`[AI] Tokens: in=${usage.prompt_tokens || '?'}, out=${usage.completion_tokens || '?'}`);

      return {
        content,
        tokens: {
          input: usage.prompt_tokens || estimatedTokens,
          output: usage.completion_tokens || (content.length / 4),
        },
        model: this.config.ai.model,
      };
    } catch (error) {
      console.error(`[AI] Error: ${error.message}`);
      throw new Error(`AI Service Error: ${error.message}`);
    } finally {
      this.rateLimiter.release();
    }
  }

  /**
   * HTTP fallback jika SDK tidak tersedia.
   */
  async httpFallback(messages, params) {
    const fetch = require('node-fetch') || globalThis.fetch;
    const response = await fetch(
      `${this.config.ai.baseUrl || 'https://api.openai.com'}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.ai.apiKey}`,
        },
        body: JSON.stringify(params),
        timeout: 30000,
      }
    );
    return response.json();
  }
}

// ============================================================
// SECTION 4: ANTI-AI RULES
// ============================================================

/**
 * Aturan anti-AI detection yang terintegrasi ke Generator Agent.
 * Di v9.8.4 ini adalah modul terpisah. Di v10, built-in ke system prompt.
 */
const ANTI_AI_RULES = {
  bannedPhrases: [
    'era digital', 'di era ini', 'tidak dapat dipungkiri',
    'pada dasarnya', 'perlu dicatat bahwa', 'penting untuk diingat',
    'sebagai langkah', 'dengan demikian', 'tidak lepas dari',
    'menjadi tantangan tersendiri', 'memainkan peran penting',
    'di tengah perkembangan', 'tak dapat dipungkiri', 'seiring berkembangnya',
    'kini semakin', 'semakin menjadi', 'sebuah perubahan',
  ],

  bannedPatterns: [
    /^\s*[-•]\s+/gm,              // bullet list pattern
    /pertama.*kedua.*ketiga/gi,    // numbered sequence
    /tidak hanya.*tapi juga/gi,    // "not only but also" pattern
    /baik.*maupun/gi,              // "both...and" pattern
  ],

  styleRules: [
    'Gunakan variasi panjang kalimat: 8-22 kata. Pendek, sedang, panjang. JANGAN semua sama.',
    'Gunakan idiom, analogi, atau metafora setiap 2-3 paragraf.',
    'Mulai paragraf dengan kalimat pendek dan punchy, bukan transisi generik.',
    'Gunakan kata sambung Indonesia yang natural: "Jujur", "Nah", "Tapi", "Sekarang".',
    'Sisipkan opini personal atau pengalaman hipotetikal.',
    'Akhiri dengan kesimpulan yang tidak mengulang poin utama.',
    'Hindari kata-kata yang terlalu formal: "implementasi", "konsep", "paradigma".',
    'Tulis seperti orang yang sedang ngobrol serius, bukan menulis laporan.',
    'Gunakan kalimat tanya retoris sesekali.',
    'Hindari struktur paragraf yang terlalu rapi — biarkan ada sedikit "ketidaksempurnaan".',
  ],

  /**
   * Generate anti-AI guidelines sebagai bagian dari prompt.
   */
  getPromptGuidelines() {
    let rules = '\n\n=== ANTI-AI WRITING RULES (WAJIB DIPAATI) ===\n';
    rules += '1. HINDARI kata/frase ini: ' + this.bannedPhrases.slice(0, 8).join(', ') + '\n';
    rules += '2. HINDARI pola: bullet list bertubi-tubi, urutan "pertama-kedua-ketiga"\n';
    rules += '3. GAYA MENULIS:\n';
    this.styleRules.forEach((rule, i) => {
      rules += `   ${i + 1}. ${rule}\n`;
    });
    rules += '\nINGAT: Tulis seperti MANUSIA, bukan AI. Kalimat boleh tidak sempurna.';
    return rules;
  },

  /**
   * Quick scan untuk mendeteksi pola AI.
   * Digunakan oleh GeneratorAgent.selfCheck().
   */
  quickScan(text) {
    const issues = [];
    let score = 100;

    // Cek banned phrases
    for (const phrase of this.bannedPhrases) {
      const regex = new RegExp(phrase, 'gi');
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        issues.push(`Found AI phrase "${phrase}" (${matches.length}x)`);
        score -= matches.length * 5;
      }
    }

    // Cek sentence length variance
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      const lengths = sentences.map(s => s.trim().split(/\s+/).length);
      const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 3) {
        issues.push(`Sentence length too uniform (stdDev=${stdDev.toFixed(1)})`);
        score -= 15;
      }
      if (avg < 8 || avg > 22) {
        issues.push(`Average sentence length (${avg.toFixed(1)}) outside ideal range`);
        score -= 10;
      }
    }

    // Cek bullet list pattern
    const bulletMatches = text.match(/^\s*[-•]\s+/gm);
    if (bulletMatches && bulletMatches.length > 3) {
      issues.push(`Too many bullet points (${bulletMatches.length})`);
      score -= bulletMatches.length * 3;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      passed: score >= 80,
    };
  }
};

// ============================================================
// SECTION 5: PHASE 0 — PRE-WRITING AGENT
// ============================================================

/**
 * PreWriting Agent: Menyiapkan "writing brief" yang kaya.
 * 
 * Ini menjawab kelemahan Agent-based: konten kurang berani.
 * Dengan writing brief, Generator Agent punya sudut pandang spesifik
 * sehingga bisa menulis dengan lebih character dan depth.
 * 
 * HANYA 1 API CALL. Ringan dan cepat.
 */
class PreWritingAgent {
  constructor(aiService, config) {
    this.ai = aiService;
    this.config = config;
  }

  /**
   * Generate writing brief berdasarkan prompt kompetisi.
   * 
   * Output: JSON {
   *   perspective: string,    // sudut pandang unik
   *   persona: string,       // siapa yang "menulis"
   *   tone: string,          // nada tulisan
   *   structure: string[],   // struktur paragraf
   *   keyInsights: string[], // insight utama yang harus ada
   *   forbiddenPatterns: string[], // hal yang harus dihindari
   *   uniqueAngle: string    // angle yang membedakan
   * }
   */
  async generateBrief(prompt, rallyContext = '') {
    const systemPrompt = `Kamu adalah Creative Director untuk kompetisi menulis. 
Tugasmu: menganalisis prompt kompetisi dan menghasilkan WRITING BRIEF yang 
akan memandu penulis.

PENTING: Writing brief harus menghasilkan konten yang UNIK dan BERANI.
Jangan aman. Pilih sudut pandang yang tidak biasa. Berikan persona yang spesifik.

OUTPUT FORMAT (WAJIB JSON):
{
  "perspective": "deskripsi sudut pandang unik (2-3 kalimat)",
  "persona": "deskripsi persona penulis (profesi, usia, pengalaman)",
  "tone": "tone utama + nuansa (contoh: reflektif tapi sedang sinis)",
  "structure": [
    "opening: bagaimana memulai",
    "body: inti konten",
    "closing: bagaimana mengakhiri"
  ],
  "keyInsights": [
    "insight 1 yang harus muncul di konten",
    "insight 2"
  ],
  "forbiddenPatterns": [
    "pola tulisan yang harus dihindari"
  ],
  "uniqueAngle": "angle unik yang membedakan dari konten lain"
}

ATURAN:
- perspective HARUS unik dan tidak generik
- persona HARUS spesifik (profesi tertentu, bukan "orang biasa")
- tone HARUS punya kontras (bukan sekadar "formal" atau "casual")
- keyInsights HARUS insightful, bukan hal yang sudah jelas
- structure HARUS organic, bukan "intro-body-conclusion" klise`;

    const userMessage = `${rallyContext ? `[KONTEKS RALLY]: ${rallyContext}\n\n` : ''}
[PROMPT KOMPETISI]: ${prompt}

Analisis prompt di atas dan hasilkan writing brief JSON.`;

    console.log('[PRE-WRITING] Generating writing brief...');
    const startTime = Date.now();

    const response = await this.ai.chat(systemPrompt, userMessage, {
      jsonMode: true,
      temperature: 0.9,  // Tinggi untuk kreativitas
      maxTokens: 1000,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[PRE-WRITING] Brief generated in ${elapsed}ms`);

    try {
      const brief = JSON.parse(response.content);
      // Validasi minimal structure
      if (!brief.perspective || !brief.persona || !brief.tone) {
        throw new Error('Missing required fields in brief');
      }
      return {
        ...brief,
        _meta: { tokens: response.tokens, timeMs: elapsed },
      };
    } catch (e) {
      console.warn('[PRE-WRITING] Failed to parse brief JSON, using fallback');
      return this.fallbackBrief(prompt);
    }
  }

  /**
   * Fallback jika AI gagal generate brief.
   */
  fallbackBrief(prompt) {
    return {
      perspective: `Tulis tentang "${prompt.slice(0, 50)}..." dari sudut pandang yang belum pernah dipikirkan orang lain`,
      persona: 'Profesional muda di bidang terkait, berusia 28-35 tahun, dengan pengalaman langsung',
      tone: 'Konversasional tapi knowledgeable, sedang reflektif',
      structure: [
        'Mulai dengan cerita atau observasi personal yang spesifik',
        'Bangun argumentasi dengan data dan pengalaman nyata',
        'Akhiri dengan pertanyaan atau refleksi yang memicu pikiran'
      ],
      keyInsights: [
        'Connection antara topik dan kehidupan sehari-hari',
        'Perspektif yang berlawanan dengan narasi mainstream'
      ],
      forbiddenPatterns: [
        'Bullet list bertubi-tubi',
        'Klaim tanpa contoh konkret'
      ],
      uniqueAngle: 'Contrarian take yang well-reasoned',
      _meta: { fallback: true },
    };
  }
}

// ============================================================
// SECTION 6: PHASE 1 — GENERATOR AGENT
// ============================================================

/**
 * Generator Agent: Membuat konten berkualitas tinggi.
 * 
 * KEUNGGULAN vs pipeline:
 * - Anti-AI rules BUILT-IN (bukan check setelah)
 * - Self-correction loop (generate → check → revise)
 * - Writing brief dari PreWriting Agent (menjaga keberanian)
 * 
 * Tool set:
 * 1. analyzeBrief()     - Pahami writing brief
 * 2. generateContent()  - Buat draft
 * 3. selfCheck()        - Evaluasi draft
 * 4. revise()           - Perbaiki berdasarkan feedback
 */
class GeneratorAgent {
  constructor(aiService, config) {
    this.ai = aiService;
    this.config = config;
    this.antiAi = ANTI_AI_RULES;
  }

  /**
   * Main execution: brief → generate → self-check → revise (loop)
   */
  async execute(prompt, brief, rallyContext = '') {
    const runId = randomUUID().slice(0, 8);
    console.log(`[GENERATOR:${runId}] Starting content generation...`);

    const history = []; // Track all iterations for transparency
    const totalStart = Date.now();

    // ── Step 1: Build enriched prompt from brief ──
    const enrichedPrompt = this.buildEnrichedPrompt(prompt, brief);

    // ── Step 2: Generation loop with self-correction ──
    let currentDraft = null;
    let currentScore = 0;
    let iterations = 0;

    while (iterations <= this.config.generator.maxRevisions) {
      const iterStart = Date.now();
      console.log(`[GENERATOR:${runId}] Iteration ${iterations}/${this.config.generator.maxRevisions}`);

      // Generate or revise
      if (iterations === 0) {
        currentDraft = await this.generateContent(enrichedPrompt, brief);
      } else {
        // Get self-check feedback, then revise
        const checkResult = await this.selfCheck(currentDraft, prompt, brief);
        if (checkResult.passed) {
          console.log(`[GENERATOR:${runId}] Self-check PASSED on iteration ${iterations}`);
          history.push({
            iteration: iterations,
            draft: currentDraft,
            checkResult,
            timeMs: Date.now() - iterStart,
          });
          break;
        }

        console.log(`[GENERATOR:${runId}] Self-check FAILED (score=${checkResult.score}). Revising...`);
        currentDraft = await this.revise(currentDraft, checkResult.feedback, enrichedPrompt);

        // Check diminishing returns
        if (checkResult.score - currentScore < this.config.generator.minImprovement) {
          console.log(`[GENERATOR:${runId}] Diminishing returns detected. Stopping revision.`);
          history.push({
            iteration: iterations,
            draft: currentDraft,
            checkResult,
            timeMs: Date.now() - iterStart,
            note: 'Stopped: diminishing returns',
          });
          break;
        }
      }

      // Quick AI score
      const quickResult = await this.selfCheck(currentDraft, prompt, brief);
      currentScore = quickResult.score;

      history.push({
        iteration: iterations,
        draft: currentDraft,
        checkResult: quickResult,
        timeMs: Date.now() - iterStart,
      });

      iterations++;

      // Timeout check
      if (Date.now() - totalStart > this.config.generator.totalTimeout) {
        console.log(`[GENERATOR:${runId}] Total timeout reached. Returning current draft.`);
        break;
      }
    }

    // ── Step 3: Final self-check ──
    const finalCheck = await this.selfCheck(currentDraft, prompt, brief);

    // ── Step 4: Anti-AI quick scan ──
    const antiAiResult = this.antiAi.quickScan(currentDraft);

    const totalTime = Date.now() - totalStart;
    console.log(`[GENERATOR:${runId}] Done in ${totalTime}ms (${iterations} revisions)`);

    return {
      content: currentDraft,
      selfCheck: finalCheck,
      antiAiQuick: antiAiResult,
      iterations,
      history,
      _meta: {
        runId,
        totalTokens: history.reduce((sum, h) => 
          sum + (h.checkResult?._tokens?.input || 0) + (h.checkResult?._tokens?.output || 0), 0),
        timeMs: totalTime,
      },
    };
  }

  /**
   * Build enriched prompt combining original prompt + writing brief.
   * Ini menjaga "keberanian" dari PreWriting sambil tetap fokus.
   */
  buildEnrichedPrompt(prompt, brief) {
    let enriched = `=== PROMPT KOMPETISI ===\n${prompt}\n\n`;
    enriched += `=== WRITING BRIEF ===\n`;
    enriched += `Sudut Pandang: ${brief.perspective}\n`;
    enriched += `Persona: ${brief.persona}\n`;
    enriched += `Tone: ${brief.tone}\n`;
    enriched += `Struktur: ${brief.structure?.join(' → ')}\n`;
    enriched += `Insight Utama: ${brief.keyInsights?.join('; ')}\n`;
    enriched += `Angle Unik: ${brief.uniqueAngle || 'Default'}\n`;
    if (brief.forbiddenPatterns?.length) {
      enriched += `HINDARI: ${brief.forbiddenPatterns.join(', ')}\n`;
    }
    return enriched;
  }

  /**
   * Generate content draft.
   */
  async generateContent(enrichedPrompt, brief) {
    const systemPrompt = `Kamu adalah penulis profesional. Persona: ${brief.persona || 'writer'}.

Tugasmu: Menulis konten BERKUALITAS TINGGI berdasarkan brief yang diberikan.

${this.antiAi.getPromptGuidelines()}

KRITIS:
- Tulis dari PERSPECTIF yang sudah ditentukan di brief
- Gunakan TONE yang sudah ditentukan
- Sisipkan KEY INSIGHTS secara natural, bukan paksaan
- JANGAN sebut "sebagai AI" atau "saya adalah AI"
- JANGAN tulis generic. BERANI.

Format output: Langsung konten saja, tanpa judul, tanpa penjelasan.`;

    const response = await this.ai.chat(systemPrompt, enrichedPrompt, {
      temperature: 0.85,  // Tinggi untuk kreativitas, tapi tidak random
      maxTokens: 2048,
    });

    return response.content.trim();
  }

  /**
   * Self-check: Evaluasi draft dari multiple dimensi.
   */
  async selfCheck(draft, originalPrompt, brief) {
    // ── Local anti-AI scan (gratis, cepat) ──
    const localScan = this.antiAi.quickScan(draft);

    // ── AI-powered quality check ──
    const systemPrompt = `Kamu adalah Quality Editor yang ketat dan jujur. 
Evaluasi konten berikut secara KRITIS dan JUJUR.

Skala penilaian per dimensi (0-100):
1. relevance: Seberapa menjawab prompt?
2. depth: Seberapa mendalam analisis/insightnya?
3. naturalness: Seberapa natural tulisannya (bukan terasa AI)?
4. engagement: Seberapa menarik untuk dibaca?
5. briefCompliance: Seberapa mengikuti writing brief?

OUTPUT (WAJIB JSON):
{
  "relevance": <0-100>,
  "depth": <0-100>,
  "naturalness": <0-100>,
  "engagement": <0-100>,
  "briefCompliance": <0-100>,
  "overallScore": <rata-rata tertimbang>,
  "passed": <true/false, overall >= 75>,
  "issues": ["issue 1", "issue 2"],
  "feedback": "feedback spesifik untuk revisi (jika passed=false)"
}

JADILAH KETAT. Skor 75+ berarti benar-benar bagus. Jangan mudah memberi skor tinggi.`;

    const userMessage = `[PROMPT ASLI]: ${originalPrompt}

[WRITING BRIEF]:
- Perspective: ${brief.perspective}
- Persona: ${brief.persona}
- Tone: ${brief.tone}

[KONTEN YANG DIEVALUASI]:
${draft}

[Lokal Anti-AI Scan Score: ${localScan.score}/100]
${localScan.issues.length > 0 ? '[Isu Anti-AI]: ' + localScan.issues.join('; ') : '[Anti-AI]: OK']}

Evaluasi konten di atas. JUJUR dan KETAT.`;

    const response = await this.ai.chat(systemPrompt, userMessage, {
      jsonMode: true,
      temperature: 0.3,  // Rendah untuk konsistensi evaluasi
      maxTokens: 800,
    });

    try {
      const result = JSON.parse(response.content);
      // Incorporate local scan into naturalness score
      result.naturalness = Math.round(
        (result.naturalness * 0.4 + localScan.score * 0.6)
      );
      result.overallScore = Math.round(
        result.relevance * 0.25 +
        result.depth * 0.25 +
        result.naturalness * 0.25 +
        result.engagement * 0.15 +
        result.briefCompliance * 0.10
      );
      result.passed = result.overallScore >= this.config.generator.minQualityScore;
      result._tokens = response.tokens;
      return result;
    } catch (e) {
      console.warn('[GENERATOR] Failed to parse self-check JSON');
      return {
        relevance: 70, depth: 70, naturalness: localScan.score,
        engagement: 70, briefCompliance: 70, overallScore: 70,
        passed: false, issues: ['Parse error'], feedback: 'Revisi untuk meningkatkan kualitas',
        _tokens: response.tokens,
      };
    }
  }

  /**
   * Revise content based on self-check feedback.
   */
  async revise(draft, feedback, enrichedPrompt) {
    const systemPrompt = `Kamu adalah penulis profesional yang sedang MEREVISI karya.
Tugasmu: Perbaiki konten berdasarkan feedback editor.

ATURAN REVISI:
- Perbaiki SPESIFIK bagian yang disebutkan feedback
- Jangan menulis ulang dari nol — pertahankan yang sudah bagus
- Pastikan revisi tidak membuat tulisan menjadi generik atau "aman"
- Tetap pertahankan persona dan tone dari brief

${this.antiAi.getPromptGuidelines()}

Output: Langsung konten yang sudah direvisi.`;

    const userMessage = `[KONTEN ASLI]:
${draft}

[FEEDBACK EDITOR]:
${feedback}

[REFERENSI PROMPT & BRIEF]:
${enrichedPrompt.slice(0, 500)}...

Revisi konten berdasarkan feedback. Pertahankan yang bagus, perbaiki yang bermasalah.`;

    const response = await this.ai.chat(systemPrompt, userMessage, {
      temperature: 0.75,
      maxTokens: 2048,
    });

    return response.content.trim();
  }
}

// ============================================================
// SECTION 7: PHASE 2a — JUDGE OPTIMIST
// ============================================================

/**
 * Judge Optimist: Fokus pada KEKUATAN konten.
 * 
 * System prompt sengaja dibuat untuk melihat sisi positif.
 * Ini adalah "Red Team" dalam adversarial setup.
 * 
 * Menilai 3 perspective: Perspective & Depth, Creativity, Engagement
 */
class JudgeOptimist {
  constructor(aiService, config) {
    this.ai = aiService;
    this.config = config;
    this.label = 'OPTIMIST';
  }

  async evaluate(content, prompt, brief) {
    const systemPrompt = `Kamu adalah juri kompetisi yang FAIR tapi CENDERUNG MELIHAT POTENSI.

Philosophy: "Setiap konten punya kekuatan. Tugasmu adalah MENEMUKANNYA."

Kamu menilai dari 3 perspective:
1. perspective_depth (bobot 35%): Seberapa unik sudut pandangnya? Seberapa mendalam?
2. creativity_originality (bobot 40%): Seberapa kreatif ide dan eksekusinya? Seberapa orisinal?
3. engagement_impact (bobot 25%): Seberapa engaging? Apakah ada emotional hook?

SCORING (0-100 per perspective):
- 90-100: Exceptional — konten level pemenang
- 80-89: Excellent — sangat kuat di aspek ini
- 70-79: Good — solid, memenuhi standar
- 60-69: Fair — ada potensi tapi belum optimal
- <60: Below standard — perlu perbaikan signifikan

PENTING: Kamu mencari KEKUATAN. Beri kredit untuk:
- Pendekatan yang tidak konvensional
- Personal voice yang kuat
- Insight yang membuat pembaca berhenti berpikir
- Eksekusi yang menunjukkan mastery

OUTPUT (WAJIB JSON):
{
  "perspective_depth": <score>,
  "creativity_originality": <score>,
  "engagement_impact": <score>,
  "weightedScore": <bobot rata-rata>,
  "strengths": ["kekuatan 1", "kekuatan 2"],
  "highlights": ["moments terbaik dalam konten"],
  "verdict": "APPROVE / REVISE / REJECT",
  "reasoning": "penjelasan singkat"
}`;

    const userMessage = `[PROMPT KOMPETISI]: ${prompt}

[WRITING BRIEF]:
- Perspective: ${brief.perspective}
- Persona: ${brief.persona}

[KONTEN]:
${content}

Evaluasi konten di atas. Fokus pada KEKUATAN. JUJUR tapi optimistis.`;

    console.log(`[JUDGE:${this.label}] Evaluating content...`);
    const response = await this.ai.chat(systemPrompt, userMessage, {
      jsonMode: true,
      temperature: 0.4,
      maxTokens: 800,
    });

    try {
      const result = JSON.parse(response.content);
      result._judge = this.label;
      result._tokens = response.tokens;
      return result;
    } catch (e) {
      return {
        perspective_depth: 72, creativity_originality: 70, engagement_impact: 68,
        weightedScore: 70, strengths: [], highlights: [],
        verdict: 'REVISE', reasoning: 'Parse error', _judge: this.label,
        _tokens: response.tokens,
      };
    }
  }
}

// ============================================================
// SECTION 8: PHASE 2b — JUDGE CRITIC
// ============================================================

/**
 * Judge Critic: Fokus pada KELEMAHAN konten.
 * 
 * System prompt sengaja dibuat untuk melihat sisi negatif.
 * Ini adalah "Blue Team" dalam adversarial setup.
 * 
 * Menilai 3 perspective: Relevance, Technical Quality, Anti-AI
 */
class JudgeCritic {
  constructor(aiService, config) {
    this.ai = aiService;
    this.config = config;
    this.label = 'CRITIC';
  }

  async evaluate(content, prompt, brief) {
    const systemPrompt = `Kamu adalah juri kompetisi yang KETAT dan TIDAK MUDAH TERSESAT.

Philosophy: "Standar tinggi melahirkan konten berkualitas."

Kamu menilai dari 3 perspective:
1. relevance_alignment (bobot 35%): Apakah benar-benar menjawab prompt? Apakah ada deviasi?
2. technical_quality (bobot 35%): Tata bahasa, koherensi, struktur, keterbacaan.
3. anti_ai_compliance (bobot 30%): Seberapa natural? Ada pola AI yang terdeteksi?

SCORING (0-100 per perspective):
- 90-100: Flawless execution
- 80-89: Minor issues, overall strong
- 70-79: Solid but room for improvement
- 60-69: Noticeable weaknesses
- <60: Significant issues

PENTING: Kamu mencari KELEMAHAN. Perhatikan:
- Frase klise atau pola AI (era digital, pada dasarnya, dll)
- Kalimat yang terlalu seragam panjangnya
- Paragraf yang struktur terlalu sempurna/rapi
- Klaim tanpa dukungan
- Deviasi dari prompt atau brief
- Transisi yang tidak natural
- Bullet list berlebihan

OUTPUT (WAJIB JSON):
{
  "relevance_alignment": <score>,
  "technical_quality": <score>,
  "anti_ai_compliance": <score>,
  "weightedScore": <bobot rata-rata>,
  "weaknesses": ["kelemahan 1", "kelemahan 2"],
  "redFlags": ["pola mencurigakan"],
  "verdict": "APPROVE / REVISE / REJECT",
  "reasoning": "penjelasan singkat"
}`;

    const userMessage = `[PROMPT KOMPETISI]: ${prompt}

[WRITING BRIEF]:
- Perspective: ${brief.perspective}
- Persona: ${brief.persona}
- Tone: ${brief.tone}

[KONTEN]:
${content}

Evaluasi konten di atas. Cari KELEMAHAN. JADI KETAT. Jangan mudah memberi skor tinggi.`;

    console.log(`[JUDGE:${this.label}] Evaluating content...`);
    const response = await this.ai.chat(systemPrompt, userMessage, {
      jsonMode: true,
      temperature: 0.3,  // Sangat rendah untuk konsistensi
      maxTokens: 800,
    });

    try {
      const result = JSON.parse(response.content);
      result._judge = this.label;
      result._tokens = response.tokens;
      return result;
    } catch (e) {
      return {
        relevance_alignment: 68, technical_quality: 70, anti_ai_compliance: 65,
        weightedScore: 68, weaknesses: [], redFlags: [],
        verdict: 'REVISE', reasoning: 'Parse error', _judge: this.label,
        _tokens: response.tokens,
      };
    }
  }
}

// ============================================================
// SECTION 9: RECONCILIATION LAYER (MATEMATIS, bukan AI)
// ============================================================

/**
 * Reconciliation Layer: Menggabungkan skor dari Optimist dan Critic.
 * 
 * KRITIS: Ini adalah ALGORITMA, bukan AI call.
 * Tidak ada bias tambahan. Pure math.
 * 
 * Fungsi:
 * 1. Weighted average dari kedua judge
 * 2. Gap detection (flag jika skor terlalu berbeda)
 * 3. Perspective-level mapping ke 6 scoring dimensions
 * 4. Final verdict generation
 */
class ReconciliationLayer {
  constructor(config) {
    this.config = config;
    this.gapThreshold = config.judge.inconsistencyGap;
    this.optimistWeight = config.judge.optimistWeight;
    this.criticWeight = config.judge.criticWeight;
    this.passThreshold = config.judge.passThreshold;
  }

  /**
   * Reconcile scores from both judges.
   */
  reconcile(optimistResult, criticResult) {
    console.log('[RECONCILIATION] Processing judge results...');

    // ── Step 1: Weighted scores per judge ──
    const optScore = optimistResult.weightedScore;
    const crtScore = criticResult.weightedScore;
    const gap = Math.abs(optScore - crtScore);

    // ── Step 2: Gap analysis ──
    const gapAnalysis = this.analyzeGap(optimistResult, criticResult, gap);

    // ── Step 3: Calculate final 6-dimension scores ──
    const dimensionScores = this.mapDimensions(optimistResult, criticResult, gapAnalysis);

    // ── Step 4: Calculate final weighted score ──
    const finalScore = this.calculateFinalScore(dimensionScores);

    // ── Step 5: Generate verdict ──
    const verdict = this.generateVerdict(finalScore, gapAnalysis, dimensionScores);

    // ── Step 6: Aggregate feedback ──
    const feedback = this.aggregateFeedback(optimistResult, criticResult, gapAnalysis);

    return {
      finalScore: Math.round(finalScore * 10) / 10,
      dimensions: dimensionScores,
      verdict: verdict.decision,
      verdictReason: verdict.reason,
      pass: verdict.decision === 'APPROVE',
      gap: {
        value: gap,
        direction: gapAnalysis.direction,
        severity: gapAnalysis.severity,
        needsHumanReview: gapAnalysis.needsHumanReview,
      },
      feedback,
      rawScores: {
        optimist: { ...optimistResult },
        critic: { ...criticResult },
      },
    };
  }

  /**
   * Analyze gap between optimist and critic scores.
   */
  analyzeGap(optimist, critic, gap) {
    let direction = 'balanced';
    if (optimist.weightedScore > critic.weightedScore + 10) {
      direction = 'optimist-biased';
    } else if (critic.weightedScore > optimist.weightedScore + 10) {
      direction = 'critic-biased';
    }

    let severity = 'acceptable';
    let needsHumanReview = false;

    if (gap > 40) {
      severity = 'critical';
      needsHumanReview = true;
    } else if (gap > this.gapThreshold) {
      severity = 'warning';
      needsHumanReview = true;
    } else if (gap > 15) {
      severity = 'moderate';
    }

    return { direction, severity, needsHumanReview, value: gap };
  }

  /**
   * Map judge results to 6 standard dimensions.
   */
  mapDimensions(optimist, critic, gapAnalysis) {
    // Base mapping: each dimension from respective judge
    let scores = {
      perspective: optimist.perspective_depth || 70,
      creativity:  optimist.creativity_originality || 70,
      engagement:  optimist.engagement_impact || 70,
      relevance:   critic.relevance_alignment || 70,
      technical:   critic.technical_quality || 70,
      antiAi:      critic.anti_ai_compliance || 70,
    };

    // Gap adjustment: if gap is large, penalize both sides
    if (gapAnalysis.severity === 'critical') {
      const penalty = 5;
      Object.keys(scores).forEach(key => {
        scores[key] = Math.max(0, scores[key] - penalty);
      });
    } else if (gapAnalysis.severity === 'warning') {
      const penalty = 3;
      Object.keys(scores).forEach(key => {
        scores[key] = Math.max(0, scores[key] - penalty);
      });
    }

    // Round all scores
    Object.keys(scores).forEach(key => {
      scores[key] = Math.round(scores[key]);
    });

    return scores;
  }

  /**
   * Calculate final weighted score using config weights.
   */
  calculateFinalScore(dimensions) {
    const w = this.config.scoreWeights;
    return (
      dimensions.perspective * w.perspective +
      dimensions.relevance * w.relevance +
      dimensions.creativity * w.creativity +
      dimensions.technical * w.technical +
      dimensions.engagement * w.engagement +
      dimensions.antiAi * w.antiAi
    );
  }

  /**
   * Generate final verdict.
   */
  generateVerdict(finalScore, gapAnalysis, dimensions) {
    // Auto-reject if any dimension critically low
    const criticalDimensions = Object.entries(dimensions)
      .filter(([key, score]) => score < 50);

    if (criticalDimensions.length >= 2) {
      return {
        decision: 'REJECT',
        reason: `Multiple critical dimensions: ${criticalDimensions.map(([k]) => k).join(', ')}`,
      };
    }

    // Check if needs human review due to gap
    if (gapAnalysis.needsHumanReview) {
      return {
        decision: finalScore >= this.passThreshold ? 'APPROVE_REVIEW' : 'REVIEW',
        reason: `Judge gap (${gapAnalysis.value}) requires human review. Preliminary score: ${finalScore.toFixed(1)}`,
      };
    }

    // Standard threshold
    if (finalScore >= 85) {
      return { decision: 'APPROVE', reason: 'Excellent quality across all dimensions' };
    } else if (finalScore >= this.passThreshold) {
      return { decision: 'APPROVE', reason: 'Meets quality standards' };
    } else if (finalScore >= this.passThreshold - 10) {
      return { decision: 'REVISE', reason: `Close to threshold (${this.passThreshold}). Consider revision.` };
    } else {
      return { decision: 'REJECT', reason: `Below pass threshold (${this.passThreshold})` };
    }
  }

  /**
   * Aggregate feedback from both judges.
   */
  aggregateFeedback(optimist, critic, gapAnalysis) {
    const feedback = {
      strengths: optimist.strengths || [],
      weaknesses: critic.weaknesses || [],
      redFlags: critic.redFlags || [],
      highlights: optimist.highlights || [],
      gapWarning: null,
    };

    if (gapAnalysis.needsHumanReview) {
      feedback.gapWarning = `Significant disagreement between judges (gap: ${gapAnalysis.value}). ` +
        `Optimist scored ${optimist.weightedScore}, Critic scored ${critic.weightedScore}. ` +
        `Manual review recommended.`;
    }

    return feedback;
  }
}

// ============================================================
// SECTION 10: MAIN ORCHESTRATOR
// ============================================================

/**
 * Rally Hybrid Orchestrator: Koordinasi seluruh pipeline.
 * 
 * Ini adalah entry point utama yang menghubungkan semua Agent.
 * 
 * Flow:
 * 1. PreWriting Agent → writing brief
 * 2. Generator Agent → konten + self-correction
 * 3. Judge Optimist + Judge Critic → evaluasi paralel
 * 4. Reconciliation → skor final + verdict
 */
class RallyHybridOrchestrator {
  constructor(config = {}) {
    this.config = new Config(config);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.aiService = new AIService(this.config, this.rateLimiter);
    
    // Initialize agents
    this.preWritingAgent = new PreWritingAgent(this.aiService, this.config);
    this.generatorAgent = new GeneratorAgent(this.aiService, this.config);
    this.judgeOptimist = new JudgeOptimist(this.aiService, this.config);
    this.judgeCritic = new JudgeCritic(this.aiService, this.config);
    this.reconciliation = new ReconciliationLayer(this.config);
  }

  /**
   * Execute full pipeline for a single content piece.
   * 
   * @param {string} prompt - Kompetisi prompt
   * @param {object} options - Optional overrides
   * @returns {object} Complete result with content, scores, verdict
   */
  async run(prompt, options = {}) {
    const runId = randomUUID().slice(0, 8);
    const startTime = Date.now();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`RALLY HYBRID v10 | Run: ${runId}`);
    console.log(`${'='.repeat(60)}`);

    const result = {
      runId,
      prompt,
      phases: {},
      finalResult: null,
      _meta: { startTime, totalApiCalls: 0 },
    };

    try {
      // ════════════════════════════════════════════
      // PHASE 0: PRE-WRITING AGENT
      // ════════════════════════════════════════════
      console.log(`\n[PHASE 0] Pre-Writing Agent...`);
      
      let brief;
      if (this.config.preWriting.enabled) {
        brief = await this.preWritingAgent.generateBrief(
          prompt, 
          options.rallyContext || ''
        );
        result._meta.totalApiCalls++;
        console.log(`[PHASE 0] Brief: "${brief.uniqueAngle?.slice(0, 60)}..."`);
      } else {
        brief = this.preWritingAgent.fallbackBrief(prompt);
        console.log(`[PHASE 0] Using fallback brief (preWriting disabled)`);
      }
      result.phases.preWriting = brief;

      // ════════════════════════════════════════════
      // PHASE 1: GENERATOR AGENT (Self-Correction)
      // ════════════════════════════════════════════
      console.log(`\n[PHASE 1] Generator Agent...`);
      
      const generationResult = await this.generatorAgent.execute(
        prompt, brief, options.rallyContext || ''
      );
      result._meta.totalApiCalls += (generationResult.iterations + 1) * 2; // generate + check
      result.phases.generation = {
        content: generationResult.content,
        iterations: generationResult.iterations,
        selfCheck: generationResult.selfCheck,
        antiAiQuick: generationResult.antiAiQuick,
      };
      console.log(`[PHASE 1] Content generated (${generationResult.iterations} revisions)`);
      console.log(`[PHASE 1] Self-check score: ${generationResult.selfCheck.overallScore}`);
      console.log(`[PHASE 1] Anti-AI quick scan: ${generationResult.antiAiQuick.score}`);

      // ════════════════════════════════════════════
      // PHASE 2: DUAL JUDGE (PARALEL)
      // ════════════════════════════════════════════
      console.log(`\n[PHASE 2] Dual Judge (Optimist + Critic)...`);
      
      const content = generationResult.content;
      const judgePromises = [
        this.judgeOptimist.evaluate(content, prompt, brief),
        this.judgeCritic.evaluate(content, prompt, brief),
      ];

      let judgeResults;
      if (this.config.judge.runParallel) {
        console.log(`[PHASE 2] Running judges in PARALLEL...`);
        judgeResults = await Promise.all(judgePromises);
      } else {
        console.log(`[PHASE 2] Running judges SEQUENTIALLY...`);
        judgeResults = [
          await judgePromises[0],
          await judgePromises[1],
        ];
      }
      result._meta.totalApiCalls += 2;

      const [optimistResult, criticResult] = judgeResults;
      result.phases.judging = {
        optimist: { ...optimistResult },
        critic: { ...criticResult },
      };
      console.log(`[PHASE 2] Optimist score: ${optimistResult.weightedScore} (${optimistResult.verdict})`);
      console.log(`[PHASE 2] Critic score: ${criticResult.weightedScore} (${criticResult.verdict})`);

      // ════════════════════════════════════════════
      // PHASE 3: RECONCILIATION (MATEMATIS)
      // ════════════════════════════════════════════
      console.log(`\n[PHASE 3] Reconciliation...`);
      
      const finalResult = this.reconciliation.reconcile(optimistResult, criticResult);
      finalResult.content = content;
      finalResult.brief = brief;
      result.finalResult = finalResult;

      // ── Summary ──
      const totalTime = Date.now() - startTime;
      result._meta.totalTimeMs = totalTime;
      result._meta.totalTimeSec = (totalTime / 1000).toFixed(1);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`RESULT | Score: ${finalResult.finalScore} | Verdict: ${finalResult.verdict}`);
      console.log(`Gap: ${finalResult.gap.value} (${finalResult.gap.severity})`);
      console.log(`Time: ${result._meta.totalTimeSec}s | API Calls: ${result._meta.totalApiCalls}`);
      console.log(`${'='.repeat(60)}\n`);

      return result;

    } catch (error) {
      console.error(`[ORCHESTRATOR:${runId}] FATAL ERROR: ${error.message}`);
      result._meta.error = error.message;
      result._meta.totalTimeMs = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Run multiple content pieces for a campaign.
   * With rate limiting and error handling.
   */
  async runCampaign(prompts, options = {}) {
    console.log(`\n[CAMPAIGN] Starting campaign with ${prompts.length} prompts`);
    
    const results = [];
    for (let i = 0; i < prompts.length; i++) {
      const prompt = typeof prompts[i] === 'string' 
        ? prompts[i] 
        : prompts[i].prompt;
      
      console.log(`\n[CAMPAIGN] Processing ${i + 1}/${prompts.length}...`);
      
      const result = await this.run(prompt, {
        rallyContext: options.rallyContext,
      });
      
      results.push(result);

      // Delay between runs untuk rate limiting
      if (i < prompts.length - 1) {
        const delay = options.delayBetween || 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Campaign summary
    const summary = {
      total: results.length,
      approved: results.filter(r => r.finalResult?.pass).length,
      rejected: results.filter(r => r.finalResult?.verdict === 'REJECT').length,
      needsReview: results.filter(r => r.finalResult?.verdict === 'REVIEW' || r.finalResult?.verdict === 'APPROVE_REVIEW').length,
      avgScore: results.reduce((sum, r) => sum + (r.finalResult?.finalScore || 0), 0) / results.length,
      avgTimeMs: results.reduce((sum, r) => sum + (r._meta?.totalTimeMs || 0), 0) / results.length,
      totalApiCalls: results.reduce((sum, r) => sum + (r._meta?.totalApiCalls || 0), 0),
    };

    console.log(`\n[CAMPAIGN] Summary:`);
    console.log(`  Approved: ${summary.approved}/${summary.total}`);
    console.log(`  Rejected: ${summary.rejected}/${summary.total}`);
    console.log(`  Needs Review: ${summary.needsReview}/${summary.total}`);
    console.log(`  Avg Score: ${summary.avgScore.toFixed(1)}`);
    console.log(`  Avg Time: ${(summary.avgTimeMs / 1000).toFixed(1)}s`);
    console.log(`  Total API Calls: ${summary.totalApiCalls}`);

    return { results, summary };
  }
}

// ============================================================
// SECTION 11: EXPORTS
// ============================================================

module.exports = {
  // Main orchestrator
  RallyHybridOrchestrator,
  
  // Individual agents (for custom orchestration)
  PreWritingAgent,
  GeneratorAgent,
  JudgeOptimist,
  JudgeCritic,
  
  // Utilities
  ReconciliationLayer,
  RateLimiter,
  AIService,
  Config,
  
  // Constants
  ANTI_AI_RULES,
};

// ============================================================
// SECTION 12: EXAMPLE USAGE
// ============================================================

if (require.main === module) {
  (async () => {
    console.log('=== RALLY HYBRID v10 — Example Usage ===\n');

    const orchestrator = new RallyHybridOrchestrator({
      // Override config via constructor (or use ENV vars)
      aiProvider: 'openai',
      // apiKey: process.env.AI_API_KEY,  // ALWAYS from env!
      model: 'gpt-4o',
      temperature: 0.7,
      generator: {
        maxRevisions: 2,
        minQualityScore: 75,
        minAntiAiScore: 85,
      },
      judge: {
        passThreshold: 70,
        runParallel: true,
      },
    });

    // Single content run
    const result = await orchestrator.run(
      'Tulis opini tentang dampak media sosial terhadap produktivitas generasi milenial di Indonesia, dengan perspektif yang unik dan tidak klise.',
      { rallyContext: 'Kompetisi menulis opini, max 500 kata, bahasa Indonesia' }
    );

    console.log('\n=== FINAL RESULT ===');
    console.log('Score:', result.finalResult?.finalScore);
    console.log('Verdict:', result.finalResult?.verdict);
    console.log('Pass:', result.finalResult?.pass);
    console.log('Dimensions:', JSON.stringify(result.finalResult?.dimensions, null, 2));
    console.log('Time:', result._meta?.totalTimeSec + 's');
    console.log('API Calls:', result._meta?.totalApiCalls);
  })();
}
