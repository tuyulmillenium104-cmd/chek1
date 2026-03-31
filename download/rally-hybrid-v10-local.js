/**
 * ============================================================
 * RALLY HYBRID v10 — LOCAL RUNNABLE VERSION
 * Menggunakan z-ai-web-dev-sdk (yang tersedia di environment ini)
 * ============================================================
 */

'use strict';
const { randomUUID } = require('crypto');

// ============================================================
// Z-AI SDK WRAPPER (menggantikan OpenAI SDK)
// ============================================================
class ZAIWrapper {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  async init() {
    try {
      const mod = require('z-ai-web-dev-sdk'); const ZAI = mod.default || mod.ZAI || mod;
      this.client = new ZAI({baseUrl:"http://172.25.136.193:8080/v1", apiKey:"Z.ai"});
      this.initialized = true;
      console.log('[ZAI] SDK initialized successfully');
    } catch (e) {
      console.error('[ZAI] Failed to initialize:', e.message);
      throw e;
    }
  }

  async chat(systemPrompt, userMessage, options = {}) {
    if (!this.initialized) await this.init();

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ];

      const params = {
        messages: messages,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature || 0.7,
      };

      const completion = await this.client.chat.completions.create(params);
      const content = completion.choices[0]?.message?.content || '';

      const usage = completion.usage || {};
      return {
        content,
        tokens: {
          input: usage.prompt_tokens || 0,
          output: usage.completion_tokens || 0,
        },
        raw: completion,
      };
    } catch (error) {
      console.error(`[ZAI] Error: ${error.message}`);
      throw error;
    }
  }
}

// ============================================================
// ANTI-AI RULES
// ============================================================
const ANTI_AI_RULES = {
  bannedPhrases: [
    'era digital','di era ini','tidak dapat dipungkiri','pada dasarnya',
    'perlu dicatat bahwa','penting untuk diingat','sebagai langkah',
    'dengan demikian','tidak lepas dari','menjadi tantangan tersendiri',
    'memainkan peran penting','di tengah perkembangan','tak dapat dipungkiri',
  ],
  styleRules: [
    'Variasi panjang kalimat: 8-22 kata.',
    'Gunakan idiom, analogi, atau metafora.',
    'Mulai paragraf dengan kalimat pendek dan punchy.',
    'Gunakan kata sambung Indonesia: "Jujur", "Nah", "Tapi".',
    'Sisipkan opini personal.',
    'Hindari kata formal: "implementasi", "paradigma".',
    'Tulis seperti orang ngobrol serius.',
  ],
  getPromptGuidelines() {
    let r = '\n\n=== ANTI-AI WRITING RULES (WAJIB) ===\n';
    r += 'HINDARI: ' + this.bannedPhrases.slice(0, 8).join(', ') + '\n';
    r += 'GAYA:\n';
    this.styleRules.forEach((rule, i) => { r += `${i+1}. ${rule}\n`; });
    return r;
  },
  quickScan(text) {
    const issues = [];
    let score = 100;
    for (const phrase of this.bannedPhrases) {
      const regex = new RegExp(phrase, 'gi');
      const matches = text.match(regex);
      if (matches) { issues.push(`AI phrase "${phrase}" (${matches.length}x)`); score -= matches.length * 5; }
    }
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      const lengths = sentences.map(s => s.trim().split(/\s+/).length);
      const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
      if (Math.sqrt(variance) < 3) { issues.push('Sentence length too uniform'); score -= 15; }
    }
    return { score: Math.max(0, Math.min(100, score)), issues, passed: score >= 80 };
  }
};

// ============================================================
// PHASE 0: PRE-WRITING AGENT
// ============================================================
class PreWritingAgent {
  constructor(ai) { this.ai = ai; }

  async generateBrief(prompt, rallyContext = '') {
    console.log('\n[P0:PRE-WRITING] Generating writing brief...');
    const start = Date.now();

    const response = await this.ai.chat(
      `Kamu Creative Director. Analisis prompt dan hasilkan WRITING BRIEF JSON.
Output WAJIB JSON: {"perspective":"...","persona":"...","tone":"...","structure":["..."],"keyInsights":["..."],"forbiddenPatterns":["..."],"uniqueAngle":"..."}
PENTING: perspective HARUS unik, persona HARUS spesifik, tone HARUS punya kontras.`,
      `${rallyContext ? `[KONTEKS]: ${rallyContext}\n\n` : ''}[PROMPT]: ${prompt}`,
      { temperature: 0.9, maxTokens: 800 }
    );

    console.log(`[P0:PRE-WRITING] Done in ${Date.now()-start}ms`);
    try {
      return JSON.parse(response.content);
    } catch (e) {
      return {
        perspective: 'Sudut pandang unik tentang topik',
        persona: 'Profesional muda berusia 28-35 tahun',
        tone: 'Konversasional tapi knowledgeable',
        structure: ['Hook personal', 'Argumen dengan data', 'Refleksi penutup'],
        keyInsights: ['Connection kehidupan sehari-hari', 'Contrarian take'],
        uniqueAngle: 'Perspektif yang belum pernah dipikirkan',
        _fallback: true
      };
    }
  }
}

// ============================================================
// PHASE 1: GENERATOR AGENT
// ============================================================
class GeneratorAgent {
  constructor(ai, config = {}) {
    this.ai = ai;
    this.maxRevisions = config.maxRevisions || 2;
    this.minScore = config.minQualityScore || 75;
  }

  async execute(prompt, brief) {
    console.log('\n[P1:GENERATOR] Starting content generation...');
    const totalStart = Date.now();
    const enriched = `=== PROMPT ===\n${prompt}\n\n=== BRIEF ===\nPerspective: ${brief.perspective}\nPersona: ${brief.persona}\nTone: ${brief.tone}\nInsights: ${brief.keyInsights?.join('; ')}\nAngle: ${brief.uniqueAngle}`;

    let draft = null;
    let iterations = 0;

    while (iterations <= this.maxRevisions) {
      console.log(`[P1:GENERATOR] Iteration ${iterations}/${this.maxRevisions}`);

      if (iterations === 0) {
        draft = await this.ai.chat(
          `Kamu penulis profesional. Persona: ${brief.persona}.
Tulis konten BERKUALITAS TINGGI berdasarkan brief.
${ANTI_AI_RULES.getPromptGuidelines()}
Output: Langsung konten saja, tanpa judul.`,
          enriched,
          { temperature: 0.85, maxTokens: 1500 }
        ).then(r => r.content.trim());
      } else {
        // Self-check
        const check = await this.selfCheck(draft, prompt, brief);
        if (check.passed) {
          console.log(`[P1:GENERATOR] Self-check PASSED (score=${check.overallScore})`);
          break;
        }
        console.log(`[P1:GENERATOR] Self-check FAILED (score=${check.overallScore}). Revising...`);
        draft = await this.ai.chat(
          `Kamu penulis yang MEREVISI karya. Perbaiki berdasarkan feedback.
${ANTI_AI_RULES.getPromptGuidelines()}
Output: Langsung konten yang sudah direvisi.`,
          `[KONTEN]: ${draft}\n\n[FEEDBACK]: ${check.feedback}\n\n[REFERENSI]: ${enriched.slice(0,400)}`,
          { temperature: 0.75, maxTokens: 1500 }
        ).then(r => r.content.trim());
      }
      iterations++;
      if (Date.now() - totalStart > 90000) break;
    }

    const finalCheck = this.ai.chat ? await this.selfCheck(draft, prompt, brief) : null;
    const antiAi = ANTI_AI_RULES.quickScan(draft);
    console.log(`[P1:GENERATOR] Done in ${Date.now()-totalStart}ms | ${iterations} revisions | Anti-AI: ${antiAi.score}`);

    return { content: draft, selfCheck: finalCheck, antiAiQuick: antiAi, iterations };
  }

  async selfCheck(draft, prompt, brief) {
    const localScan = ANTI_AI_RULES.quickScan(draft);
    const response = await this.ai.chat(
      `Kamu Quality Editor yang KETAT dan JUJUR. Evaluasi konten KRITIS.
Output JSON: {"relevance":0-100,"depth":0-100,"naturalness":0-100,"engagement":0-100,"briefCompliance":0-100,"overallScore":rata-rata,"passed":bool,"issues":[],"feedback":"..."}
JADILAH KETAT. Skor 75+ = benar-benar bagus.`,
      `[PROMPT]: ${prompt}\n[BRIEF]: perspective=${brief.perspective}\n[KONTEN]: ${draft}\n[Anti-AI Scan: ${localScan.score}/100]`,
      { temperature: 0.3, maxTokens: 600 }
    );
    try {
      const r = JSON.parse(response.content);
      r.naturalness = Math.round(r.naturalness * 0.4 + localScan.score * 0.6);
      r.overallScore = Math.round(r.relevance*0.25 + r.depth*0.25 + r.naturalness*0.25 + r.engagement*0.15 + r.briefCompliance*0.10);
      r.passed = r.overallScore >= this.minScore;
      return r;
    } catch (e) {
      return { overallScore: 70, passed: false, feedback: 'Parse error - revise', issues: [] };
    }
  }
}

// ============================================================
// PHASE 2a: JUDGE OPTIMIST
// ============================================================
class JudgeOptimist {
  constructor(ai) { this.ai = ai; this.label = 'OPTIMIST'; }
  async evaluate(content, prompt, brief) {
    console.log(`\n[P2:${this.label}] Evaluating...`);
    const response = await this.ai.chat(
      `Kamu juri yang MELIHAT POTENSI. Philosophy: "Setiap konten punya kekuatan."
Nilai 3 perspective: perspective_depth(35%), creativity_originality(40%), engagement_impact(25%)
Scoring: 90-100=Exceptional, 80-89=Excellent, 70-79=Good, <70=Below standard
Output JSON: {"perspective_depth":0-100,"creativity_originality":0-100,"engagement_impact":0-100,"weightedScore":avg,"strengths":[],"verdict":"APPROVE/REVISE/REJECT","reasoning":"..."}`,
      `[PROMPT]: ${prompt}\n[BRIEF]: ${brief.perspective}\n[KONTEN]: ${content}\nFokus pada KEKUATAN.`,
      { temperature: 0.4, maxTokens: 600 }
    );
    try {
      const r = JSON.parse(response.content);
      r.weightedScore = Math.round(r.perspective_depth*0.35 + r.creativity_originality*0.40 + r.engagement_impact*0.25);
      r._judge = this.label;
      return r;
    } catch (e) { return { perspective_depth:72, creativity_originality:70, engagement_impact:68, weightedScore:70, verdict:'REVISE', _judge:this.label, strengths:[] }; }
  }
}

// ============================================================
// PHASE 2b: JUDGE CRITIC
// ============================================================
class JudgeCritic {
  constructor(ai) { this.ai = ai; this.label = 'CRITIC'; }
  async evaluate(content, prompt, brief) {
    console.log(`[P2:${this.label}] Evaluating...`);
    const response = await this.ai.chat(
      `Kamu juri yang KETAT. Philosophy: "Standar tinggi melahirkan konten berkualitas."
Nilai 3 perspective: relevance_alignment(35%), technical_quality(35%), anti_ai_compliance(30%)
Scoring: 90-100=Flawless, 80-89=Minor issues, 70-79=Room for improvement, <70=Weaknesses
Output JSON: {"relevance_alignment":0-100,"technical_quality":0-100,"anti_ai_compliance":0-100,"weightedScore":avg,"weaknesses":[],"redFlags":[],"verdict":"APPROVE/REVISE/REJECT","reasoning":"..."}`,
      `[PROMPT]: ${prompt}\n[BRIEF]: ${brief.perspective}\n[KONTEN]: ${content}\nCari KELEMAHAN. JADI KETAT.`,
      { temperature: 0.3, maxTokens: 600 }
    );
    try {
      const r = JSON.parse(response.content);
      r.weightedScore = Math.round(r.relevance_alignment*0.35 + r.technical_quality*0.35 + r.anti_ai_compliance*0.30);
      r._judge = this.label;
      return r;
    } catch (e) { return { relevance_alignment:68, technical_quality:70, anti_ai_compliance:65, weightedScore:68, verdict:'REVISE', _judge:this.label, weaknesses:[] }; }
  }
}

// ============================================================
// PHASE 3: RECONCILIATION (MATEMATIS)
// ============================================================
class ReconciliationLayer {
  reconcile(optimist, critic) {
    console.log('\n[P3:RECONCILIATION] Processing...');
    const gap = Math.abs(optimist.weightedScore - critic.weightedScore);
    const severity = gap > 40 ? 'critical' : gap > 25 ? 'warning' : gap > 15 ? 'moderate' : 'acceptable';
    const needsReview = gap > 25;
    const penalty = severity === 'critical' ? 5 : severity === 'warning' ? 3 : 0;

    const dims = {
      perspective: optimist.perspective_depth || 70,
      creativity:  optimist.creativity_originality || 70,
      engagement:  optimist.engagement_impact || 70,
      relevance:   critic.relevance_alignment || 70,
      technical:   critic.technical_quality || 70,
      antiAi:      critic.anti_ai_compliance || 70,
    };

    Object.keys(dims).forEach(k => { dims[k] = Math.max(0, dims[k] - penalty); });

    const finalScore = Math.round(
      dims.perspective*0.20 + dims.relevance*0.20 + dims.creativity*0.20 +
      dims.technical*0.15 + dims.engagement*0.15 + dims.antiAi*0.10
    ) / 1;

    const pass = finalScore >= 70;
    const verdict = finalScore >= 85 ? 'APPROVE' : finalScore >= 70 ? (needsReview ? 'APPROVE_REVIEW' : 'APPROVE') : finalScore >= 60 ? 'REVISE' : 'REJECT';

    return {
      finalScore: Math.round(finalScore * 10) / 10,
      dimensions: dims,
      verdict,
      pass,
      gap: { value: gap, severity, needsHumanReview: needsReview },
      feedback: {
        strengths: optimist.strengths || [],
        weaknesses: critic.weaknesses || [],
        redFlags: critic.redFlags || [],
      },
    };
  }
}

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================
class RallyHybridOrchestrator {
  constructor() { this.ai = new ZAIWrapper(); }

  async run(prompt, rallyContext = '') {
    const start = Date.now();
    console.log('\n' + '='.repeat(55));
    console.log('  RALLY HYBRID v10 — LIVE RUN');
    console.log('='.repeat(55));
    console.log(`Prompt: "${prompt.slice(0, 80)}..."`);

    await this.ai.init();

    // PHASE 0
    const preWriting = new PreWritingAgent(this.ai);
    const brief = await preWriting.generateBrief(prompt, rallyContext);
    console.log(`[BRIEF] Angle: "${brief.uniqueAngle?.slice(0, 60)}..."`);
    console.log(`[BRIEF] Persona: "${brief.persona?.slice(0, 60)}..."`);

    // PHASE 1
    const generator = new GeneratorAgent(this.ai, { maxRevisions: 2 });
    const genResult = await generator.execute(prompt, brief);
    console.log(`\n[CONTENT PREVIEW]: "${genResult.content?.slice(0, 150)}..."`);

    // PHASE 2 (PARALEL)
    const optJudge = new JudgeOptimist(this.ai);
    const crtJudge = new JudgeCritic(this.ai);
    console.log('\n[P2:DUAL JUDGE] Running Optimist + Critic in PARALLEL...');
    const [optResult, crtResult] = await Promise.all([
      optJudge.evaluate(genResult.content, prompt, brief),
      crtJudge.evaluate(genResult.content, prompt, brief),
    ]);
    console.log(`[OPTIMIST] Score: ${optResult.weightedScore} | Verdict: ${optResult.verdict}`);
    console.log(`[CRITIC]   Score: ${crtResult.weightedScore} | Verdict: ${crtResult.verdict}`);

    // PHASE 3
    const recon = new ReconciliationLayer();
    const final = recon.reconcile(optResult, crtResult);
    final.content = genResult.content;
    final.brief = brief;

    // SUMMARY
    const totalTime = Date.now() - start;
    console.log('\n' + '='.repeat(55));
    console.log('  FINAL RESULT');
    console.log('='.repeat(55));
    console.log(`  Score:     ${final.finalScore}/100`);
    console.log(`  Verdict:   ${final.verdict}`);
    console.log(`  Pass:      ${final.pass ? 'YES ✓' : 'NO ✗'}`);
    console.log(`  Gap:       ${final.gap.value} (${final.gap.severity})`);
    console.log(`  Dimensions:`);
    console.log(`    Perspective: ${final.dimensions.perspective}`);
    console.log(`    Creativity:  ${final.dimensions.creativity}`);
    console.log(`    Engagement:  ${final.dimensions.engagement}`);
    console.log(`    Relevance:   ${final.dimensions.relevance}`);
    console.log(`    Technical:   ${final.dimensions.technical}`);
    console.log(`    Anti-AI:     ${final.dimensions.antiAi}`);
    console.log(`  Time:      ${(totalTime/1000).toFixed(1)}s`);
    console.log(`  Revisions: ${genResult.iterations}`);
    console.log('='.repeat(55));

    return final;
  }
}

// ============================================================
// RUN IT!
// ============================================================
(async () => {
  try {
    const orch = new RallyHybridOrchestrator();
    const result = await orch.run(
      'Tulis opini tentang dampak media sosial terhadap produktivitas generasi milenial di Indonesia. Gunakan perspektif yang unik dan tidak klise.',
      'Kompetisi menulis opini, max 500 kata, bahasa Indonesia informal'
    );
    console.log('\n=== FULL GENERATED CONTENT ===');
    console.log(result.content);
  } catch (e) {
    console.error('\nFATAL:', e.message);
    console.error(e.stack);
  }
})();
