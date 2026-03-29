# Rally Workflow v9.8.3 - Complete Edition

> **v9.8.2 ALL Features + NEW 3 AI Judges Architecture with Fail Fast Mechanism**

## 🎯 What's New in v9.8.3

### Architecture Changes

| Feature | v9.8.2 (Old) | v9.8.3 (New) |
|---------|--------------|--------------|
| Judges | 6 Judges | **3 AI Judges** |
| Selection | First Passing | **Highest Score** |
| Fail Fast | ❌ None | **✅ Yes** |
| Source Tags | ❌ None | **✅ [SRC: url]** |
| Stage-by-Stage | ❌ None | **✅ Yes** |
| Max Regenerate | Unlimited | **5 cycles** |
| Quality Threshold | Not specific | **70/80 (87.5%)** |

---

## ✅ ALL Features from v9.8.2 (PRESERVED)

### G4 Originality Detection
- Casual Hook Opening Detection
- Parenthetical Aside Detection
- Contractions Count (need 3+)
- Personal Angle Detection
- Conversational Ending Detection

### Forbidden Punctuation Check
- Em Dash Detection (—)
- Smart Quote Detection (""")
- Automatic Sanitization

### X-Factor Differentiators
- Specific Numbers Detection
- Time Specificity Detection
- Embarrassing Honesty Detection
- Unexpected Angle Detection

### Mindset Framework
- Target: Beat Top 10
- Effort: Maximize what you control
- Accept: Whatever result comes
- Learn: From every outcome

### Control Matrix
- What you CAN control (G1-G4, EP, TQ)
- What you CANNOT control (Retweets, Likes, etc.)

### Gate Multiplier Formula
```
M_gate = 1 + 0.5 × (g_star - 1)
```

### Other v9.8.2 Features
- Pre-Submission Validation Checklist
- Claim Verification Template
- Python NLP Integration (VADER, TextBlob, spaCy)
- Multi-Content Generator (5 contents)
- Campaign Search by Name
- Multi-Token Rate Limit Handler (11 tokens)
- GLM-5 with Think + WebSearch

---

## 🆕 NEW IN v9.8.3

```
┌─────────────────────────────────────────────┐
│  GATE 1 (JUDGE 1): Campaign Requirements    │
│  ───────────────────────────────────────────│
│  Programmatic (Binary):                     │
│    • URL Present: 2 pts                     │
│    • Banned Words: 2 pts                    │
│                                             │
│  AI-Based (Contextual):                     │
│    • Description: 4 pts                     │
│    • Rules: 4 pts                           │
│    • Style: 3 pts                           │
│    • Knowledge Base: 3 pts                  │
│    • Additional Info: 2 pts                 │
│                                             │
│  Threshold: 14/20 (70%)                     │
└─────────────────────────────────────────────┘
                    │
                    ▼ FAIL FAST ❌
┌─────────────────────────────────────────────┐
│  JUDGE 2: Fact-Check with [SRC: url]       │
│  ───────────────────────────────────────────│
│  • Every claim needs [SRC: url] tag        │
│  • AI verifies each claim                   │
│  • Max 5 claims per content                 │
│                                             │
│  Threshold: 4/5 verified (80%)              │
└─────────────────────────────────────────────┘
                    │
                    ▼ FAIL FAST ❌
┌─────────────────────────────────────────────┐
│  JUDGE 3: Quality Assessment (80 pts)       │
│  ───────────────────────────────────────────│
│  • Originality: 20 pts                      │
│  • Engagement: 20 pts                       │
│  • Clarity: 15 pts                          │
│  • Emotional: 10 pts                        │
│  • X-Factor: 15 pts                         │
│                                             │
│  Threshold: 70/80 (87.5%)                   │
└─────────────────────────────────────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  HIGHEST SCORE      │
         │  SELECTION          │
         └─────────────────────┘
```

---

## 📊 Scoring System

| Stage | Points | Threshold | Pass Rate |
|-------|--------|-----------|-----------|
| Gate 1 | 20 | 14 | 70% |
| Judge 2 | 5 | 4 | 80% |
| Judge 3 | 80 | 70 | 87.5% |
| **TOTAL** | **105** | **88** | **83.8%** |

---

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install z-ai-web-dev-sdk

# Or using bun
bun add z-ai-web-dev-sdk
```

### Usage

```bash
# By campaign name (partial match supported)
node src/rally-workflow-v9.8.3.js "Internet Court"
node src/rally-workflow-v9.8.3.js "Code Runs, Disputes Don't"

# By campaign address
node src/rally-workflow-v9.8.3.js 0xAF5a5B459F4371c1781E3B8456214CDD063EeBA7

# List all campaigns
node src/rally-workflow-v9.8.3.js list
```

---

## ✨ Key Features

### 1. Fail Fast Mechanism
Content evaluation stops immediately when failing any stage:
- Failed Gate 1 → Stop, no Judge 2/3 evaluation
- Failed Judge 2 → Stop, no Judge 3 evaluation
- Failed Judge 3 → Try next content

### 2. Highest Score Selection
Unlike v9.8.2 which accepts first passing content, v9.8.3:
- Evaluates all 5 contents per cycle
- Ranks by total score
- Selects HIGHEST score, not first passing

### 3. Source Tagging [SRC: url]
Fact-check claims with source verification:
```
"Internet Court resolves disputes in 48 hours [SRC: https://example.com/article]"
```
Tags are cleaned before final output.

### 4. Stage-by-Stage Evaluation
Efficient evaluation process:
1. Evaluate ALL contents for Gate 1
2. Only passed contents go to Judge 2
3. Only passed contents go to Judge 3

### 5. Multi-Token Rate Limit Handler
11 tokens for rate limit fallback:
- 1 auto-config token
- 10 manual tokens (5 accounts × 2 slots each)

---

## 📁 Project Structure

```
chek1/
├── src/
│   └── rally-workflow-v9.8.3.js    # Main workflow file
├── config/
│   └── tokens.js                    # Token configuration
├── docs/
│   └── ARCHITECTURE.md              # Architecture documentation
├── README.md                        # This file
└── package.json                     # Dependencies
```

---

## ⚙️ Configuration

### Thresholds

```javascript
thresholds: {
  gate1: { max: 20, pass: 14 },      // 70%
  judge2: { max: 5, pass: 4 },       // 80%
  judge3: { max: 80, pass: 70 },     // 87.5%
  total: { max: 105, pass: 88 }      // 83.8%
}
```

### Workflow Settings

```javascript
maxRegenerateCycles: 5     // Max generation cycles
contentsPerCycle: 5        // Contents per cycle
```

### Delays

```javascript
delays: {
  betweenJudges: 2000,      // 2s between judge calls
  betweenContents: 1000,    // 1s between content evaluations
  beforeRegenerate: 3000,   // 3s before regenerating
  rateLimitWait: 10000      // 10s wait on rate limit
}
```

---

## 🔧 Banned Words List

The following words are checked and will reduce score:

```
amazing, incredible, revolutionary, game-changing, groundbreaking,
life-changing, world-class, best-in-class, cutting-edge, state-of-the-art,
unleash, unlock, empower, seamlessly, effortlessly, hassle-free,
one-stop, all-in-one, end-to-end, holistic, comprehensive solution,
paradigm shift, disrupt, leverage, synergy, robust, scalable
```

---

## 📈 Output Example

```json
{
  "success": true,
  "campaign": "Code Runs, Disputes Don't. Enter Internet Court",
  "bestContent": "Smart contracts execute flawlessly...",
  "bestEvaluation": {
    "totalScore": 92,
    "cycle": 2,
    "gate1Score": 17,
    "judge2Score": 5,
    "judge3Score": 70
  },
  "metadata": {
    "version": "9.8.3-optimized",
    "architecture": "3 AI Judges with Fail Fast",
    "duration": "180s"
  }
}
```

---

## 🆚 Comparison: v9.8.2 vs v9.8.3

### Problem with v9.8.2

1. **6 Judges** - Too many evaluation stages
2. **First Passing Selection** - May not be the best content
3. **No Fail Fast** - Wastes time evaluating failed content
4. **No Source Verification** - Claims not verified
5. **Programmatic Issues** - Quick Judge too strict/loose

### Solution in v9.8.3

1. **3 AI Judges** - Streamlined evaluation
2. **Highest Score** - Best content selected
3. **Fail Fast** - Stop on failure, save time
4. **[SRC: url] Tags** - Every claim verified
5. **Hybrid Approach** - Programmatic for binary, AI for contextual

---

## 📝 Changelog

### v9.8.3 (Current)
- ✅ 3 AI Judges Architecture
- ✅ Fail Fast Mechanism
- ✅ [SRC: url] Source Tagging
- ✅ Highest Score Selection
- ✅ Stage-by-Stage Evaluation
- ✅ Quality Threshold 70/80
- ✅ Max 5 Regenerate Cycles
- ✅ 11 Token Pool

### v9.8.2 (Previous)
- 6 Judges System
- Multi-Content Generator
- Quick Judge + Full Judge
- First Passing Selection
- No Fail Fast

---

## 📄 License

MIT License - Feel free to use and modify

---

## 🤝 Contributing

1. Fork this repository
2. Create feature branch
3. Make your changes
4. Submit pull request

---

## 📞 Support

If you encounter issues:
1. Check token configuration
2. Verify network connectivity
3. Check API rate limits
4. Review error logs

---

**Made with ❤️ for Rally.fun content creators**
