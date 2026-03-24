# Architecture Documentation - v9.8.3

## Overview

Rally Workflow v9.8.3 uses a **3 AI Judges Architecture** with **Fail Fast Mechanism** for efficient and accurate content evaluation.

---

## Core Components

### 1. Multi-Provider LLM

Handles AI calls with multi-token fallback for rate limits:

```javascript
class MultiProviderLLM {
  - chat(messages, options)     // AI chat completion
  - webSearch(query)             // Web search for facts
  - switchToken()                // Rate limit fallback
}
```

### 2. Token Manager

Manages 11 tokens for rate limit handling:

```javascript
class TokenManager {
  - getCurrentToken()     // Get active token
  - switchToken()         // Switch on rate limit
  - resetExhausted()      // Reset after all exhausted
}
```

### 3. Three AI Judges

#### Gate 1 (Judge 1): Campaign Requirements

**Programmatic Checks (Binary):**
- URL Present: 2 pts (0 or 2)
- Banned Words: 2 pts (0 or 2)

**AI-Based Checks (Contextual):**
- Description Alignment: 4 pts
- Rules Compliance: 4 pts
- Style Match: 3 pts
- Knowledge Base Accuracy: 3 pts
- Additional Info Integration: 2 pts

**Threshold:** 14/20 (70%)

#### Judge 2: Fact-Check

- Extract claims from content
- Search for verification
- AI verifies each claim
- Score = verified claims count

**Threshold:** 4/5 claims verified (80%)

#### Judge 3: Quality Assessment

- Originality: 20 pts
- Engagement Potential: 20 pts
- Clarity & Flow: 15 pts
- Emotional Impact: 10 pts
- X-Factor Differentiators: 15 pts

**Threshold:** 70/80 (87.5%)

---

## Workflow Flow

```
START
  │
  ▼
┌──────────────────────┐
│ Fetch Campaign Data  │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Fetch Competitors    │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Research Data        │◄── Web Search
└──────────────────────┘
  │
  ▼
┌──────────────────────────────────────────┐
│ GENERATION CYCLE (Max 5)                 │
│  │                                       │
│  ▼                                       │
│ ┌─────────────────────────────────────┐  │
│ │ Generate 5 Contents                 │  │
│ └─────────────────────────────────────┘  │
│  │                                       │
│  ▼                                       │
│ ┌─────────────────────────────────────┐  │
│ │ STAGE 1: GATE 1 (All Contents)      │  │
│ │   - Programmatic: URL, Banned Words │  │
│ │   - AI: Desc, Rules, Style, KB, AI  │  │
│ │   - Threshold: 14/20                │  │
│ └─────────────────────────────────────┘  │
│  │                                       │
│  │ FAILED? → Skip content               │
│  │                                       │
│  ▼                                       │
│ ┌─────────────────────────────────────┐  │
│ │ STAGE 2: JUDGE 2 (Passed Gate 1)    │  │
│ │   - Extract claims                   │  │
│ │   - Verify with sources              │  │
│ │   - Threshold: 4/5 verified          │  │
│ └─────────────────────────────────────┘  │
│  │                                       │
│  │ FAILED? → Skip content               │
│  │                                       │
│  ▼                                       │
│ ┌─────────────────────────────────────┐  │
│ │ STAGE 3: JUDGE 3 (Passed Judge 2)   │  │
│ │   - Originality, Engagement, etc.    │  │
│ │   - Threshold: 70/80                 │  │
│ └─────────────────────────────────────┘  │
│  │                                       │
│  │ FAILED? → Skip content               │
│  │                                       │
│  ▼                                       │
│ ┌─────────────────────────────────────┐  │
│ │ HIGHEST SCORE SELECTION             │  │
│ │   - Rank all passed contents         │  │
│ │   - Select highest score             │  │
│ └─────────────────────────────────────┘  │
│  │                                       │
│  │ FOUND? → END                         │
│  │                                       │
│  ▼                                       │
│ NEXT CYCLE                               │
└──────────────────────────────────────────┘
  │
  ▼
END (with best content or failure)
```

---

## Fail Fast Mechanism

Content evaluation stops immediately on failure:

```javascript
// Gate 1 Failed
if (!gate1.passed) {
  failFastStage = 'GATE_1';
  return evaluation; // Stop here, no Judge 2/3
}

// Judge 2 Failed  
if (!judge2.passed) {
  failFastStage = 'JUDGE_2';
  return evaluation; // Stop here, no Judge 3
}

// Judge 3 Failed
if (!judge3.passed) {
  failFastStage = 'JUDGE_3';
  return evaluation; // Stop here
}
```

---

## Highest Score Selection

Unlike first-passing selection, we evaluate ALL candidates:

```javascript
function selectHighestScore(stageResults) {
  // Sort by total score descending
  const sorted = [...stageResults.passed].sort(
    (a, b) => b.totalScore - a.totalScore
  );
  
  // Return highest, not first
  return sorted[0];
}
```

---

## Stage-by-Stage Evaluation

Efficient batch evaluation:

```javascript
// Stage 1: Gate 1 for ALL contents
for (content of contents) {
  gate1Result = await gate1Judge(content);
  // Track passed/failed
}

// Stage 2: Judge 2 for PASSED only
for (content of passedGate1) {
  judge2Result = await judge2FactCheck(content);
  // Track passed/failed
}

// Stage 3: Judge 3 for PASSED only
for (content of passedJudge2) {
  judge3Result = await judge3Quality(content);
  // Track passed/failed
}
```

---

## Source Tagging

Claims are tagged with sources for verification:

```
Input:  "Internet Court resolves disputes in 48 hours."
Output: "Internet Court resolves disputes in 48 hours [SRC: https://example.com]"
```

Tags are cleaned before final output:

```javascript
function cleanSourceTags(content) {
  return content.replace(/\[SRC:\s*[^\]]+\]/g, '').trim();
}
```

---

## Rate Limit Handling

Multi-token fallback system:

```javascript
try {
  result = await api.call(token);
} catch (RateLimitError) {
  tokenManager.switchToken();  // Switch to next token
  await delay(10000);          // Wait 10s
  result = await api.call(newToken);  // Retry
}
```

---

## Configuration Reference

```javascript
CONFIG = {
  version: '9.8.3-optimized',
  
  thresholds: {
    gate1: { max: 20, pass: 14 },
    judge2: { max: 5, pass: 4 },
    judge3: { max: 80, pass: 70 },
    total: { max: 105, pass: 88 }
  },
  
  maxRegenerateCycles: 5,
  contentsPerCycle: 5,
  
  delays: {
    betweenJudges: 2000,
    betweenContents: 1000,
    beforeRegenerate: 3000,
    rateLimitWait: 10000
  }
}
```
