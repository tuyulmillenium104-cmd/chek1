/**
 * Rally Brain v7.0 — Feature Extraction & Linear Regression Predictor
 *
 * Predicts Rally's content quality score (0-21) for generated content
 * BEFORE submission, using only text features.
 *
 * Two main components:
 * 1. Feature Extraction: Extracts 29 numeric features from content text
 * 2. Linear Regression: Trains a prediction model from scratch (no deps)
 *    - Uses z-score normalization for feature scaling
 *    - Normal equation for coefficient computation: β = (X^T X)^{-1} X^T y
 *    - Works well for small datasets (<500 samples)
 *
 * The predictor gracefully handles missing content text — submissions
 * without text are skipped during training.
 */

import {
  type ContentFeatures,
  type PredictionModel,
  FEATURE_NAMES,
  BANNED_WORD_SET,
  AI_WORD_SET,
  TEMPLATE_PHRASE_SET,
} from './types';

// ─── Feature Extraction ───────────────────────────────────────────

/**
 * Extract 29 numeric features from content text.
 * These features capture structural, linguistic, content, and readability
 * characteristics that correlate with Rally's scoring.
 */
export function extractFeatures(content: string): ContentFeatures {
  const text = content || '';

  // ── Basic structure ──
  const charCount = text.length;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = Math.max(sentences.length, wordCount > 0 ? 1 : 0);

  const avgSentenceLength =
    sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 100) / 100 : 0;

  const paragraphs = text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const paragraphCount = paragraphs.length;

  // ── Punctuation ──
  const questionCount = (text.match(/\?/g) || []).length;
  const exclamationCount = (text.match(/!/g) || []).length;

  // ── Content markers ──
  const hasAtRally = /@rally/i.test(text);
  const hasLink = /https?:\/\/\S+/.test(text);
  const hasHashtag = /#\w+/.test(text);
  const hashtagCount = (text.match(/#\w+/g) || []).length;

  // ── Emoji detection (Unicode ranges + common emoji) ──
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (text.match(emojiRegex) || []).length;

  // ── Mentions ──
  const mentionCount = (text.match(/@\w+/g) || []).length;

  // ── Linguistic features ──
  const contractionCount = countContractions(text);
  const personalPronounCount = countPersonalPronouns(text);

  // ── Anti-AI detection ──
  const bannedWordCount = countMatches(text, BANNED_WORD_SET);
  const aiWordCount = countMatches(text, AI_WORD_SET);
  const templatePhraseCount = countPhraseMatches(text, TEMPLATE_PHRASE_SET);

  // ── Readability metrics ──
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const uniqueWordRatio =
    wordCount > 0 ? Math.round((uniqueWords.size / wordCount) * 1000) / 1000 : 0;

  const totalWordLength = words.reduce((sum, w) => sum + w.length, 0);
  const avgWordLength =
    wordCount > 0 ? Math.round((totalWordLength / wordCount) * 100) / 100 : 0;

  const capitalLetters = (text.match(/[A-Z]/g) || []).length;
  const capitalRatio =
    charCount > 0 ? Math.round((capitalLetters / charCount) * 1000) / 1000 : 0;

  // ── Sentence boundaries ──
  const startsWithLowercase = /^[a-z]/.test(text);
  const endsWithQuestion = /\?\s*$/.test(text);
  const endsWithExclamation = /!\s*$/.test(text);

  // ── Numbers ──
  const hasNumber = /\d/.test(text);
  const numberCount = (text.match(/\d+/g) || []).length;

  // ── Formatting ──
  const dashCount = (text.match(/[—–-]/g) || []).length;
  const quoteCount = (text.match(/["""'']/g) || []).length;

  // ── Simplified Flesch-Kincaid readability ──
  const readabilityScore = computeReadability(wordCount, sentenceCount, totalSyllables(words));

  return {
    charCount,
    wordCount,
    sentenceCount,
    avgSentenceLength,
    paragraphCount,
    questionCount,
    exclamationCount,
    hasAtRally,
    hasLink,
    hasHashtag,
    hashtagCount,
    emojiCount,
    mentionCount,
    contractionCount,
    personalPronounCount,
    bannedWordCount,
    aiWordCount,
    templatePhraseCount,
    uniqueWordRatio,
    avgWordLength,
    capitalRatio,
    startsWithLowercase,
    endsWithQuestion,
    endsWithExclamation,
    hasNumber,
    numberCount,
    dashCount,
    quoteCount,
    readabilityScore,
  };
}

// ─── Linear Regression (from scratch) ─────────────────────────────

/**
 * Train a linear regression model from feature-label pairs.
 *
 * Uses z-score normalization + normal equation:
 *   β = (X^T X)^{-1} X^T y
 *
 * For small datasets (<500), this is more stable than gradient descent
 * and gives exact solutions.
 *
 * @param data - Array of {content, score} pairs. Submissions without content are skipped.
 * @returns Trained prediction model, or null if not enough data (<10 samples)
 */
export function trainModel(
  data: Array<{ content: string; score: number }>
): PredictionModel | null {
  const MIN_SAMPLES = 10;

  // Filter out entries without content text
  const valid = data.filter((d) => d.content && d.content.trim().length > 5);

  if (valid.length < MIN_SAMPLES) {
    console.log(
      `[v7] Predictor: not enough training data (${valid.length}/${data.length} have content, need ${MIN_SAMPLES})`
    );
    return null;
  }

  console.log(`[v7] Predictor: training model with ${valid.length} samples...`);

  // 1. Extract features and labels
  const features = valid.map((d) => {
    const feats = extractFeatures(d.content);
    return featureValuesToArray(feats);
  });
  const labels = valid.map((d) => d.score);

  // 2. Compute z-score normalization stats
  const { means, stds } = computeNormalizationStats(features);

  // 3. Normalize features
  const normalized = features.map((f) =>
    f.map((v, i) => (stds[i] > 1e-10 ? (v - means[i]) / stds[i] : 0))
  );

  // 4. Add bias column (column of 1s for intercept)
  const X = normalized.map((row) => [1, ...row]);

  // 5. Solve normal equation: β = (X^T X)^{-1} X^T y
  const coefficients = solveNormalEquation(X, labels);

  if (!coefficients) {
    console.warn('[v7] Predictor: normal equation failed (singular matrix)');
    return null;
  }

  // First coefficient is the intercept
  const intercept = coefficients[0];
  const featureCoefficients = coefficients.slice(1);

  // 6. Compute metrics on training data
  const predictions = normalized.map((f) =>
    featureCoefficients.reduce((sum, c, i) => sum + c * f[i], intercept)
  );
  const { mae, r2 } = computeMetrics(labels, predictions);

  // 7. Clamp R² to [-1, 1] range (numerical stability)
  const clampedR2 = Math.max(-1, Math.min(1, r2));

  const model: PredictionModel = {
    coefficients: featureCoefficients,
    intercept,
    featureNames: FEATURE_NAMES as unknown as string[],
    mae: Math.round(mae * 100) / 100,
    r2: Math.round(clampedR2 * 1000) / 1000,
    lastTrainedAt: new Date().toISOString(),
    sampleCount: valid.length,
    featureStats: { means, stds },
  };

  console.log(
    `[v7] Predictor: model trained. MAE=${model.mae.toFixed(2)}, R²=${model.r2.toFixed(3)}, ` +
    `samples=${model.sampleCount}`
  );

  return model;
}

/**
 * Predict the content quality score (0-21) for a piece of content.
 *
 * @param model - Trained prediction model
 * @param content - Content text to predict score for
 * @returns Predicted score, clamped to [0, 21]
 */
export function predictScore(model: PredictionModel, content: string): number {
  const features = extractFeatures(content);
  const featureArray = featureValuesToArray(features);

  // Normalize using stored stats
  const normalized = featureArray.map((v, i) => {
    const std = model.featureStats.stds[i] ?? 1;
    const mean = model.featureStats.means[i] ?? 0;
    return std > 1e-10 ? (v - mean) / std : 0;
  });

  // Apply linear regression
  let score = model.intercept;
  for (let i = 0; i < model.coefficients.length && i < normalized.length; i++) {
    score += model.coefficients[i] * normalized[i];
  }

  // Clamp to valid range
  return Math.max(0, Math.min(21, Math.round(score * 100) / 100));
}

/**
 * Get summary metrics for a trained model.
 */
export function getModelMetrics(model: PredictionModel): {
  mae: number;
  r2: number;
  sampleCount: number;
} {
  return {
    mae: model.mae,
    r2: model.r2,
    sampleCount: model.sampleCount,
  };
}

// ─── Normalization ────────────────────────────────────────────────

/**
 * Compute z-score normalization statistics (mean and std) for each feature column.
 */
function computeNormalizationStats(features: number[][]): {
  means: number[];
  stds: number[];
} {
  const numFeatures = features[0]?.length ?? 0;
  const means: number[] = new Array(numFeatures).fill(0);
  const stds: number[] = new Array(numFeatures).fill(1);

  if (features.length === 0) return { means, stds };

  // Compute means
  for (const row of features) {
    for (let i = 0; i < numFeatures; i++) {
      means[i] += row[i];
    }
  }
  for (let i = 0; i < numFeatures; i++) {
    means[i] /= features.length;
  }

  // Compute standard deviations
  for (const row of features) {
    for (let i = 0; i < numFeatures; i++) {
      const diff = row[i] - means[i];
      stds[i] += diff * diff;
    }
  }
  for (let i = 0; i < numFeatures; i++) {
    stds[i] = Math.sqrt(stds[i] / features.length);
    // Avoid division by zero — use a small epsilon
    stds[i] = Math.max(stds[i], 1e-10);
  }

  return { means, stds };
}

// ─── Normal Equation Solver ───────────────────────────────────────

/**
 * Solve the normal equation: β = (X^T X)^{-1} X^T y
 *
 * Uses Gaussian elimination with partial pivoting for numerical stability.
 * Returns null if the matrix is singular (or nearly singular).
 */
function solveNormalEquation(
  X: number[][],
  y: number[]
): number[] | null {
  const n = X[0].length; // number of features + 1 (bias)

  // Compute X^T X
  const XtX = multiplyTranspose(X, n);
  // Compute X^T y
  const Xty = multiplyTransposeY(X, y, n);

  // Solve (X^T X) β = X^T y using Gaussian elimination
  return gaussianElimination(XtX, Xty, n);
}

/**
 * Compute X^T X (n x n matrix).
 */
function multiplyTranspose(X: number[][], n: number): number[][] {
  const result: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (const row of X) {
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        result[i][j] += row[i] * row[j];
        if (i !== j) result[j][i] = result[i][j]; // Symmetric
      }
    }
  }

  return result;
}

/**
 * Compute X^T y (n x 1 vector).
 */
function multiplyTransposeY(
  X: number[][],
  y: number[],
  n: number
): number[] {
  const result = new Array(n).fill(0);

  for (let k = 0; k < X.length; k++) {
    for (let i = 0; i < n; i++) {
      result[i] += X[k][i] * y[k];
    }
  }

  return result;
}

/**
 * Gaussian elimination with partial pivoting.
 * Solves Ax = b for x.
 */
function gaussianElimination(
  A: number[][],
  b: number[],
  n: number
): number[] | null {
  // Create augmented matrix [A | b]
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting: find the row with the largest absolute value in this column
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    // Swap rows
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Check for near-singularity
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-10) {
      return null; // Matrix is singular
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / pivot;
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = aug[row][n];
    for (let j = row + 1; j < n; j++) {
      sum -= aug[row][j] * x[j];
    }
    x[row] = sum / aug[row][row];
  }

  return x;
}

// ─── Metrics ──────────────────────────────────────────────────────

/**
 * Compute Mean Absolute Error (MAE) and R-squared (R²) between
 * actual and predicted values.
 */
function computeMetrics(actual: number[], predicted: number[]): {
  mae: number;
  r2: number;
} {
  const n = actual.length;
  if (n === 0) return { mae: Infinity, r2: 0 };

  // MAE
  let absErrorSum = 0;
  for (let i = 0; i < n; i++) {
    absErrorSum += Math.abs(actual[i] - predicted[i]);
  }
  const mae = absErrorSum / n;

  // R² (coefficient of determination)
  const meanActual = actual.reduce((a, b) => a + b, 0) / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const residual = actual[i] - predicted[i];
    const deviation = actual[i] - meanActual;
    ssRes += residual * residual;
    ssTot += deviation * deviation;
  }

  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { mae, r2 };
}

// ─── Helper Functions ─────────────────────────────────────────────

/**
 * Convert ContentFeatures object to a flat number array in the
 * same order as FEATURE_NAMES.
 */
function featureValuesToArray(features: ContentFeatures): number[] {
  return FEATURE_NAMES.map((key) => {
    const val = features[key];
    return typeof val === 'boolean' ? (val ? 1 : 0) : Number(val) || 0;
  });
}

/**
 * Count how many words from a set appear in the text (case-insensitive).
 */
function countMatches(text: string, wordSet: Set<string>): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const word of wordSet) {
    // Use word boundary matching for safety
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    if (regex.test(lower)) count++;
  }
  return count;
}

/**
 * Count how many phrases from a set appear in the text (case-insensitive).
 * Phrases can be multi-word, so we do simple includes matching.
 */
function countPhraseMatches(text: string, phraseSet: Set<string>): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of phraseSet) {
    if (lower.includes(phrase)) count++;
  }
  return count;
}

/**
 * Count English contractions in text.
 * Matches common contractions: don't, can't, won't, it's, I'm, etc.
 */
function countContractions(text: string): number {
  const contractionPattern =
    /\b\w+'(?:t|s|d|m|ll|ve|re)\b/gi;
  return (text.match(contractionPattern) || []).length;
}

/**
 * Count personal pronouns in text.
 * Matches: I, me, my, mine, myself, we, us, our, ours, ourselves
 */
function countPersonalPronouns(text: string): number {
  const pronounPattern =
    /\b(i|me|my|mine|myself|we|us|our|ours|ourselves)\b/gi;
  return (text.match(pronounPattern) || []).length;
}

/**
 * Estimate total syllable count for an array of words.
 * Simplified algorithm: count vowel groups per word.
 */
function totalSyllables(words: string[]): number {
  let total = 0;
  for (const word of words) {
    const lower = word.toLowerCase();
    // Count groups of consecutive vowels
    const vowelGroups = lower.match(/[aeiouy]+/g);
    let syllables = vowelGroups ? vowelGroups.length : 1;

    // Adjust for silent 'e'
    if (lower.endsWith('e') && syllables > 1) {
      syllables--;
    }

    // Minimum 1 syllable per word
    total += Math.max(1, syllables);
  }
  return total;
}

/**
 * Compute a simplified Flesch reading ease score.
 * Higher score = easier to read.
 * Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
 */
function computeReadability(
  wordCount: number,
  sentenceCount: number,
  totalSyllCount: number
): number {
  if (wordCount === 0 || sentenceCount === 0) return 0;

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = totalSyllCount / wordCount;

  const score =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  // Clamp to reasonable range
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
