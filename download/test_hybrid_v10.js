/**
 * Rally Hybrid v10 — LIVE RUN (Direct HTTP)
 * Menggunakan baseUrl + apiKey dari .z-ai-config
 */

'use strict';

const BASE_URL = 'http://172.25.136.193:8080/v1';
const API_KEY = 'Z.ai';

async function aiChat(systemPrompt, userMessage, options = {}) {
  const url = `${BASE_URL}/chat/completions`;
  const body = {
    model: options.model || 'glm-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: options.temp || 0.7,
    max_tokens: options.maxTokens || 1000,
    thinking: { type: 'disabled' },
  };
  if (options.json) {
    body.messages[0].content += '\n\nIMPORTANT: Output WAJIB valid JSON saja. Tanpa markdown code block.';
  }

  const start = Date.now();
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-Z-AI-From': 'Z',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  console.log(`  [AI] ${(Date.now() - start)}ms | ${content.length} chars`);
  return { content, timeMs: Date.now() - start };
}

// ============================================================
// ANTI-AI RULES
// ============================================================
const ANTI_AI = {
  banned: ['era digital','di era ini','tidak dapat dipungkiri','pada dasarnya','perlu dicatat bahwa',
    'penting untuk diingat','sebagai langkah','dengan demikian','tidak lepas dari',
    'menjadi tantangan tersendiri','memainkan peran penting','di tengah perkembangan'],
  scan(text) {
    let score = 100; const issues = [];
    for (const p of this.banned) {
      const m = text.match(new RegExp(p, 'gi'));
      if (m?.length) { issues.push(`"${p}" (${m.length}x)`); score -= m.length * 5; }
    }
    const sents = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sents.length > 3) {
      const lens = sents.map(s => s.trim().split(/\s+/).length);
      const avg = lens.reduce((a,b) => a+b, 0) / lens.length;
      const std = Math.sqrt(lens.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lens.length);
      if (std < 3) { issues.push('Kalimat terlalu seragam'); score -= 15; }
    }
    return { score: Math.max(0, Math.min(100, score)), issues, passed: score >= 80 };
  }
};

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('='.repeat(60));
  console.log('  RALLY HYBRID v10 — LIVE RUN');
  console.log('  Endpoint: ' + BASE_URL);
  console.log('='.repeat(60));

  const prompt = 'Tulis opini tentang dampak media sosial terhadap produktivitas generasi milenial di Indonesia. Maks 300 kata.';
  const totalStart = Date.now();
  let apiCalls = 0;

  try {
    // ═══════════════════════════════════
    // PHASE 0: PreWriting Agent
    // ═══════════════════════════════════
    console.log('\n[PHASE 0] PreWriting Agent...');
    const p0 = await aiChat(
      `Kamu Creative Director untuk kompetisi menulis. Analisis prompt dan hasilkan WRITING BRIEF yang membuat konten UNIK dan BERANI.

OUTPUT WAJIB JSON:
{"perspective":"sudut pandang unik 2-3 kalimat","persona":"deskripsi persona (profesi,usia)","tone":"tone + nuansa","keyInsights":["insight 1","insight 2"],"uniqueAngle":"angle unik"}

ATURAN: perspective HARUS unik, persona HARUS spesifik, tone HARUS punya kontras.`,
      `[PROMPT]: ${prompt}`,
      { json: true, temp: 0.9, maxTokens: 500 }
    );
    apiCalls++;
    let brief;
    try {
      brief = JSON.parse(p0.content);
    } catch(e) {
      // Try to extract JSON from markdown code block
      const match = p0.content.match(/\{[\s\S]*\}/);
      brief = match ? JSON.parse(match[0]) : { perspective: 'default', persona: 'writer', tone: 'casual', keyInsights: [], uniqueAngle: 'default' };
    }
    console.log(`  Perspective: ${(brief.perspective||'').slice(0, 55)}...`);
    console.log(`  Persona:    ${(brief.persona||'').slice(0, 55)}...`);
    console.log(`  Tone:       ${brief.tone || 'N/A'}`);

    // ═══════════════════════════════════
    // PHASE 1: Generator Agent
    // ═══════════════════════════════════
    console.log('\n[PHASE 1] Generator Agent...');
    const enriched = `PROMPT: ${prompt}\n\nWRITING BRIEF:\n- Perspective: ${brief.perspective}\n- Persona: ${brief.persona}\n- Tone: ${brief.tone}\n- Insights: ${(brief.keyInsights||[]).join('; ')}\n- Angle: ${brief.uniqueAngle||'default'}`;

    console.log('  [1/3] Generating draft...');
    const g1 = await aiChat(
      `Kamu penulis profesional. Persona: ${brief.persona}.
Tugasmu: Menulis konten BERKUALITAS TINGGI berdasarkan brief yang diberikan.

ANTI-AI RULES (WAJIB):
- Hindari: era digital, pada dasarnya, tidak dapat dipungkiri, dengan demikian
- Variasi panjang kalimat: pendek dan panjang berselingan
- Gunakan bahasa sehari-hari: "Jujur", "Nah", "Tapi", "Sekarang"
- Tulis seperti orang sedang ngobrol serius
- Sisipkan opini personal
- Gunakan kalimat tanya retoris sesekali
- JANGAN tulis generic. BERANI.

Output: Langsung konten saja tanpa judul.`,
      enriched,
      { temp: 0.85, maxTokens: 1200 }
    );
    apiCalls++;
    let content = g1.content;
    let revisions = 0;

    console.log('  [2/3] Self-checking...');
    const localScan = ANTI_AI.scan(content);
    const sc = await aiChat(
      `Kamu Quality Editor KETAT. Evaluasi konten (0-100):

OUTPUT JSON:
{"relevance":0,"depth":0,"naturalness":0,"engagement":0,"overallScore":0,"passed":false,"issues":[],"feedback":"feedback if failed"}`,
      `[PROMPT]: ${prompt}\n[KONTEN]:\n${content}\n\n[Anti-AI Scan: ${localScan.score}/100 ${localScan.issues.length ? '- ' + localScan.issues.join(', ') : '- OK'}]`,
      { json: true, temp: 0.3, maxTokens: 400 }
    );
    apiCalls++;
    let check;
    try {
      check = JSON.parse(sc.content);
    } catch(e) {
      const m = sc.content.match(/\{[\s\S]*\}/);
      check = m ? JSON.parse(m[0]) : { overallScore: 70, passed: false, issues: [], feedback: 'Perbaiki kualitas' };
    }
    check.naturalness = Math.round((check.naturalness||70) * 0.4 + localScan.score * 0.6);
    check.overallScore = Math.round((check.relevance||70)*0.25 + (check.depth||70)*0.25 + check.naturalness*0.25 + (check.engagement||70)*0.15 + 70*0.10);
    check.passed = check.overallScore >= 75;
    console.log(`    Score: ${check.overallScore} | Naturalness: ${check.naturalness} | Passed: ${check.passed}`);

    if (!check.passed) {
      console.log('  [3/3] Revising...');
      const rev = await aiChat(
        `Kamu penulis yang MEREVISI karya. Perbaiki bagian bermasalah, pertahankan yang bagus.
ANTI-AI RULES: variasi kalimat, hindari frase klise, tulis natural.
Output: Konten direvisi saja.`,
        `[KONTEN]: ${content}\n[FEEDBACK]: ${check.feedback}\n[ISSUES]: ${(check.issues||[]).join(', ')}`,
        { temp: 0.75, maxTokens: 1200 }
      );
      apiCalls++;
      content = rev.content;
      revisions = 1;
    } else {
      console.log('  [3/3] No revision needed (PASSED)');
    }

    console.log(`  Content: ${content.length} chars | Revisions: ${revisions}`);

    // ═══════════════════════════════════
    // PHASE 2: Dual Judge (PARALEL)
    // ═══════════════════════════════════
    console.log('\n[PHASE 2] Dual Judge (PARALEL)...');
    const [optResp, crtResp] = await Promise.all([
      aiChat(
        `Juri kompetisi yang MELIHAT POTENSI. "Setiap konten punya kekuatan."

OUTPUT JSON:
{"perspective_depth":0,"creativity_originality":0,"engagement_impact":0,"strengths":[],"verdict":"APPROVE/REVISE/REJECT","reasoning":"..."}`,
        `[PROMPT]: ${prompt}\n[BRIEF]: ${brief.perspective}\n[KONTEN]: ${content}\n\nFokus KEKUATAN.`,
        { json: true, temp: 0.4, maxTokens: 500 }
      ),
      aiChat(
        `Juri kompetisi KETAT. "Standar tinggi melahirkan konten berkualitas."

OUTPUT JSON:
{"relevance_alignment":0,"technical_quality":0,"anti_ai_compliance":0,"weaknesses":[],"redFlags":[],"verdict":"APPROVE/REVISE/REJECT","reasoning":"..."}`,
        `[PROMPT]: ${prompt}\n[BRIEF]: ${brief.perspective}\n[KONTEN]: ${content}\n\nCari KELEMAHAN.`,
        { json: true, temp: 0.3, maxTokens: 500 }
      ),
    ]);
    apiCalls += 2;

    let opt, crt;
    try { opt = JSON.parse(optResp.content); } catch(e) { const m = optResp.content.match(/\{[\s\S]*\}/); opt = m ? JSON.parse(m[0]) : {}; }
    try { crt = JSON.parse(crtResp.content); } catch(e) { const m = crtResp.content.match(/\{[\s\S]*\}/); crt = m ? JSON.parse(m[0]) : {}; }

    opt.weightedScore = Math.round((opt.perspective_depth||70)*0.35 + (opt.creativity_originality||70)*0.40 + (opt.engagement_impact||70)*0.25);
    crt.weightedScore = Math.round((crt.relevance_alignment||70)*0.35 + (crt.technical_quality||70)*0.35 + (crt.anti_ai_compliance||70)*0.30);

    console.log(`  Optimist: ${opt.weightedScore} (${opt.verdict})`);
    console.log(`  Critic:   ${crt.weightedScore} (${crt.verdict})`);

    // ═══════════════════════════════════
    // PHASE 3: Reconciliation (MATH)
    // ═══════════════════════════════════
    console.log('\n[PHASE 3] Reconciliation...');
    const gap = Math.abs(opt.weightedScore - crt.weightedScore);
    const severity = gap > 40 ? 'CRITICAL' : gap > 25 ? 'WARNING' : gap > 15 ? 'MODERATE' : 'ACCEPTABLE';
    const needsReview = gap > 25;

    const dims = {
      perspective: opt.perspective_depth || 70,
      creativity:  opt.creativity_originality || 70,
      engagement:  opt.engagement_impact || 70,
      relevance:   crt.relevance_alignment || 70,
      technical:   crt.technical_quality || 70,
      antiAi:      crt.anti_ai_compliance || 70,
    };
    if (gap > 40) Object.keys(dims).forEach(k => dims[k] -= 5);
    else if (gap > 25) Object.keys(dims).forEach(k => dims[k] -= 3);

    const finalScore = Math.round(
      dims.perspective*0.20 + dims.relevance*0.20 + dims.creativity*0.20 +
      dims.technical*0.15 + dims.engagement*0.15 + dims.antiAi*0.10
    );

    let verdict = finalScore >= 85 ? 'APPROVE' : finalScore >= 70 ? 'APPROVE' : finalScore >= 60 ? 'REVISE' : 'REJECT';
    if (needsReview) verdict += '_REVIEW';

    console.log(`  Gap: ${gap} (${severity})`);
    console.log(`  Final: ${finalScore} | Verdict: ${verdict}`);

    // ═══════════════════════════════════
    // RESULTS
    // ═══════════════════════════════════
    const totalTime = Date.now() - totalStart;

    console.log('\n' + '='.repeat(60));
    console.log('  FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`  Total Time:      ${(totalTime/1000).toFixed(1)}s`);
    console.log(`  Total API Calls:  ${apiCalls}`);
    console.log(`  Revisions:       ${revisions}`);
    console.log(`  Optimist:        ${opt.weightedScore} (${opt.verdict})`);
    console.log(`  Critic:          ${crt.weightedScore} (${crt.verdict})`);
    console.log(`  Gap:             ${gap} (${severity})`);
    console.log(`  Final Score:     ${finalScore}/100`);
    console.log(`  Verdict:         ${verdict}`);
    console.log('');
    console.log('  DIMENSIONS:');
    console.log(`    Perspective:    ${dims.perspective}`);
    console.log(`    Creativity:     ${dims.creativity}`);
    console.log(`    Engagement:     ${dims.engagement}`);
    console.log(`    Relevance:      ${dims.relevance}`);
    console.log(`    Technical:      ${dims.technical}`);
    console.log(`    Anti-AI:        ${dims.antiAi}`);
    console.log('');
    if (opt.strengths?.length) console.log('  Strengths:  ' + opt.strengths.join('; '));
    if (crt.weaknesses?.length) console.log('  Weaknesses: ' + crt.weaknesses.join('; '));
    if (crt.redFlags?.length)  console.log('  Red Flags:   ' + crt.redFlags.join('; '));
    if (needsReview) console.log('\n  [!] FLAGGED: Human review recommended');
    console.log('');
    console.log('  === GENERATED CONTENT ===');
    console.log('-'.repeat(40));
    console.log(content);
    console.log('-'.repeat(40));
    console.log('\n' + '='.repeat(60));
    console.log('  DONE');
    console.log('='.repeat(60));

  } catch(err) {
    console.error('\nFATAL ERROR:', err.message);
    console.log('\nTotal time before error:', ((Date.now() - totalStart)/1000).toFixed(1) + 's');
    console.log('API calls before error:', apiCalls);
  }
}

main();
