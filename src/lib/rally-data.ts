import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'download', 'rally_system');

function readJson<T>(filename: string): T | null {
  try {
    const fp = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fp)) return null;
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch {
    return null;
  }
}

function readText(filename: string): string | null {
  try {
    const fp = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fp)) return null;
    return fs.readFileSync(fp, 'utf-8');
  } catch {
    return null;
  }
}

function readLines(filename: string, maxLines = 50): string[] {
  try {
    const fp = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fp)) return [];
    const content = fs.readFileSync(fp, 'utf-8');
    return content.split('\n').filter(l => l.trim()).slice(-maxLines);
  } catch {
    return [];
  }
}

// Master data
export function getMaster() {
  return readJson<any>('rally_master.json');
}

// Knowledge vault
export function getKnowledgeVault() {
  return readJson<any>('rally_knowledge_vault.json');
}

// Pattern cache
export function getPatternCache() {
  return readJson<any>('rally_pattern_cache.json');
}

// Best content
export function getBestContent(): string | null {
  return readText('rally_best_content.txt');
}

// Current variations (latest cycle)
export function getCurrentVariations(): Record<string, string> | null {
  return readJson<Record<string, string>>('current_variations.json');
}

// Cycle 3 consensus scores
export function getCycleConsensus(): any {
  return readJson<any>('cycle3_consensus.json');
}

// Cycle 3 final
export function getCycleFinal(): any {
  return readJson<any>('cycle3_final.json');
}

// Q&A
export function getQnA(): any {
  return readJson<any>('rally_qna.json');
}

// Intel cache
export function getIntelCache(): any {
  return readJson<any>('rally_intel_cache.json');
}

// Task queue
export function getTaskQueue(): any {
  return readJson<any>('rally_task_queue.json');
}

// All variations (old campaign)
export function getAllVariations(): any {
  return readJson<any>('rally_all_variations.json');
}

// All variations new (current campaign)
export function getAllVariationsNew(): any {
  return readJson<any>('rally_all_variations_new.json');
}

// Worklog
export function getWorklog(): string | null {
  return readText('rally_worklog.md');
}

// Learning log
export function getLearningLog(maxLines = 50): any[] {
  const lines = readLines('rally_learning_log.jsonl', maxLines);
  return lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

// README
export function getReadme(): string | null {
  return readText('RALLY_README.txt');
}

// Extract content sections from best content
export function parseBestContent(raw: string | null) {
  if (!raw) return null;
  const lines = raw.split('\n');
  let inContent = false;
  const contentLines: string[] = [];
  const meta: Record<string, string> = {};
  const judgeSection: string[] = [];
  let inJudge = false;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  let inStrengths = false;
  let inWeaknesses = false;

  for (const line of lines) {
    if (line.includes('CONTENT READY FOR COPY-PASTE')) { inContent = true; continue; }
    if (line.includes('JUDGE PANEL VERIFICATION')) { inContent = false; inJudge = true; continue; }
    if (line.includes('KEY STRENGTHS:')) { inJudge = false; inStrengths = true; continue; }
    if (line.includes('KNOWN WEAKNESSES:')) { inStrengths = false; inWeaknesses = true; continue; }

    if (inContent && line.trim()) contentLines.push(line);
    if (inJudge && line.trim() && !line.startsWith('=')) judgeSection.push(line);
    if (inStrengths && line.startsWith('- ')) strengths.push(line.slice(2));
    if (inWeaknesses && line.startsWith('- ')) weaknesses.push(line.slice(2));

    if (line.startsWith('Score:')) meta.score = line.split('Score:')[1]?.trim();
    if (line.startsWith('Variation:')) meta.variation = line.split('Variation:')[1]?.trim();
    if (line.startsWith('Campaign:')) meta.campaign = line.split('Campaign:')[1]?.trim();
    if (line.startsWith('Mission:')) meta.mission = line.split('Mission:')[1]?.trim();
    if (line.startsWith('Feedback Loops:')) meta.feedbackLoops = line.split('Feedback Loops:')[1]?.trim();
  }

  return {
    meta,
    content: contentLines.join('\n'),
    judgeSection: judgeSection.join('\n'),
    strengths,
    weaknesses,
  };
}

// Analyze a piece of content for metrics
export function analyzeContent(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const questions = (text.match(/\?/g) || []).length;
  const contractions = (text.match(/(?:don't|can't|won't|isn't|aren't|wasn't|I'm|you're|they're|we're|it's|that's|couldn't|wouldn't|shouldn't|didn't|doesn't|haven't|hasn't)/gi) || []).length;

  // AI banned words
  const aiWords = ['delve', 'leverage', 'paradigm', 'tapestry', 'landscape', 'nuance', 'crucial', 'pivotal', 'embark', 'harness', 'foster', 'utilize', 'elevate', 'streamline', 'empower', 'comprehensive', 'realm', 'flywheel', 'ecosystem', 'unpack', 'navigate', 'pioneering'];
  const foundAiWords = aiWords.filter(w => text.toLowerCase().includes(w));

  // Template phrases
  const templatePhrases = ['key takeaways', "let's dive in", 'nobody is talking about', "here's the thing", 'picture this', 'at the end of the day', 'hot take', 'unpopular opinion', 'thread alert'];
  const foundTemplates = templatePhrases.filter(p => text.toLowerCase().includes(p));

  // Em-dash check
  const hasEmDash = /—|–|--/.test(text);
  const hasHashtag = /#/.test(text);
  const startsWithMention = text.trim().startsWith('@');

  // Paragraph CV
  const pWordCounts = paragraphs.map(p => p.split(/\s+/).length);
  const mean = pWordCounts.length > 0 ? pWordCounts.reduce((a, b) => a + b, 0) / pWordCounts.length : 0;
  const variance = pWordCounts.length > 0 ? pWordCounts.reduce((a, b) => a + (b - mean) ** 2, 0) / pWordCounts.length : 0;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  // Compliance checks
  const hasRallyMention = text.includes('@RallyOnChain');

  return {
    wordCount: words.length,
    charCount: text.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    questionCount: questions,
    contractionCount: contractions,
    paragraphCV: Math.round(cv * 100) / 100,
    paragraphLengths: pWordCounts,
    hasEmDash,
    hasHashtag,
    startsWithMention,
    hasRallyMention,
    foundAiWords,
    foundTemplates,
    complianceIssues: [
      ...(hasEmDash ? ['Em-dash detected'] : []),
      ...(hasHashtag ? ['Hashtag detected'] : []),
      ...(startsWithMention ? ['Starts with @mention'] : []),
      ...(!hasRallyMention ? ['Missing @RallyOnChain mention'] : []),
      ...foundAiWords.map(w => `AI word: "${w}"`),
      ...foundTemplates.map(p => `Template phrase: "${p}"`),
    ],
    passed: !hasEmDash && !hasHashtag && !startsWithMention && hasRallyMention && foundAiWords.length === 0 && foundTemplates.length === 0,
  };
}

// Compute score stats from pattern cache
export function computeScoreStats(patternCache: any) {
  if (!patternCache?.score_distribution) return null;
  const sd = patternCache.score_distribution;
  return {
    total: sd.count || 0,
    min: sd.min,
    max: sd.max,
    avg: sd.avg,
    perfect18: sd.score_18 || 0,
    nearPerfect17: sd.score_17 || 0,
    above16: sd.score_16_plus || 0,
    below16: sd.score_below_16 || 0,
    categories: sd.category_averages || {},
    topPerformers: sd.top_performers_18 || [],
    nearPerfectAnalysis: sd.near_perfect_17_analysis || {},
    keyFindings: sd.key_findings || {},
    crossCampaign: sd.cross_campaign_comparison || {},
  };
}

// Build activity timeline from learning log + worklog
export function buildTimeline(learningLog: any[], master: any) {
  const events: any[] = [];

  for (const entry of learningLog) {
    events.push({
      timestamp: entry.timestamp,
      type: entry.type,
      campaign: entry.campaign,
      score: entry.score,
      details: entry.details,
      status: entry.status,
    });
  }

  if (master?.pipeline_state) {
    events.push({
      timestamp: master.pipeline_state.last_build_at,
      type: 'pipeline',
      status: master.pipeline_state.status,
      builds: master.pipeline_state.total_builds,
      improvements: master.pipeline_state.total_improvements,
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Get competitive intel summary
export function getCompetitorSummary(vault: any) {
  if (!vault?.competitive_intelligence) return null;
  const ci = vault.competitive_intelligence;
  return {
    topContent: ci.top_competitor_content || [],
    scoreInsights: ci.score_insights || {},
    patternsExtracted: ci.patterns_extracted || {},
    learningHistory: ci.learning_history || [],
    trueScoreDefinition: ci.true_score_definition || {},
  };
}
