---
name: rally-content-creator
description: >
  Rally.fun AI Content Creator - Generate high-scoring campaign content for Rally.fun (AI-powered onchain marketing protocol on X/Twitter).
  Use this skill whenever the user mentions "/rally", "rally content", "rally campaign", "rally.fun", "rallyonchain",
  creating tweets for rally, rally post generation, or wants to create social media content for Rally.fun campaigns.
  Also trigger when user asks to generate X/Twitter posts for Web3 marketing campaigns, onchain marketing content,
  or AI-scored social content. This skill handles the full pipeline: fetch active campaigns, generate content variations,
  AI judge panel scoring, feedback loops, and self-healing to produce optimal content.
---

# Rally.fun AI Content Creator

## Overview

This skill replicates the AI content pipeline from the Rally Command Center. It generates high-quality, AI-scored content for Rally.fun campaigns — the first AI-powered, onchain marketing protocol built on GenLayer + LayerZero + Base + ZKsync where creators post on X/Twitter and AI scores content for reward distribution.

**Platform**: https://www.rally.fun | https://app.rally.fun | X: @RallyOnChain

## Workflow

### Step 1: Fetch Active Campaigns

When the user triggers this skill (e.g., `/rally`), use the **web-search** skill to find currently active Rally.fun campaigns:

```
Search queries to use (run 2-3 in parallel):
- "site:app.rally.fun active campaigns 2025 2026"
- "rally.fun campaign list active ongoing"
- "@RallyOnChain new campaign tweet"
```

Additionally, try to fetch from the Rally.fun API directly using web-reader:
- `https://app.rally.fun/api/campaigns` or similar endpoints
- `https://app.rally.fun` (parse the page for campaign data)

If the API is region-blocked or unavailable, use web search results and publicly available information to compile a list of active campaigns.

**Present campaigns to user in this format:**

```
## Active Rally.fun Campaigns

| # | Campaign Name | Protocol/Project | Reward Type | Deadline |
|---|--------------|-----------------|-------------|----------|
| 1 | [name]       | [project]       | [type]      | [date]   |
| 2 | [name]       | [project]       | [type]      | [date]   |
| ... | ... | ... | ... | ... |

Balas dengan nomor campaign yang ingin kamu buatkan kontennya.
```

### Step 2: Gather Campaign Intelligence

Once the user selects a campaign, gather detailed information:

1. **Web search** for the specific campaign details:
   - Campaign mission/brief
   - Required hashtags, mentions, keywords
   - Scoring criteria (what the AI judge evaluates)
   - Example top-scoring content from previous campaigns

2. **Web search** for the protocol/project being promoted:
   - What the project does
   - Key value propositions
   - Recent news/announcements
   - Community sentiment

3. **Read reference file** `references/content-quality.md` for the full quality scoring framework.

### Step 3: Content Generation Pipeline

This is the core AI pipeline. Execute these phases sequentially:

#### Phase A: Generate 5 Content Variations

Use the LLM (z-ai-web-dev-sdk in backend, or direct AI capabilities) to generate 5 different content angles. Each variation should target a different approach:

**Variation Angles:**
1. **Educational/Informative** - Explain the project's value proposition clearly
2. **Personal Experience/Story** - First-person perspective on why the project matters
3. **Question/Engagement** - Provocative question that drives discussion
4. **News/Announcement Style** - Breaking news format about the campaign
5. **Contrarian/Hot Take** - Bold opinion that stands out from generic content

**Each variation MUST:**
- Be 50-280 characters (X/Tweet length)
- Include `@RallyOnChain` mention naturally
- Be in English (Rally.fun's AI judge scores English content)
- Sound human, not AI-generated
- Have a clear angle/point of view

#### Phase B: AI Judge Panel Scoring

Score each variation across 6 dimensions (1-3 points each, max 18):

| Dimension | What It Measures | Max Score |
|-----------|-----------------|-----------|
| **Authenticity** | Does it sound like a real person wrote it? No AI patterns. | 3 |
| **Relevance** | Does it accurately represent the campaign/protocol? | 3 |
| **Engagement** | Would it get likes, retweets, replies? | 3 |
| **Originality** | Is it unique or just another generic crypto tweet? | 3 |
| **Clarity** | Is the message clear and easy to understand? | 3 |
| **Compliance** | No banned words, no hashtags, no em-dashes, proper mentions? | 3 |

**Scoring Rules:**
- Read `references/content-quality.md` for the banned words list and compliance checks
- Any AI banned word found = -1 from Compliance
- Any template phrase found = -1 from Originality
- Hashtag detected = 0 for Compliance
- Em-dash detected = 0 for Compliance
- Starts with @mention = 0 for Compliance
- Missing @RallyOnChain = 0 for Compliance

#### Phase C: Feedback Loop (if best score < 15)

If no variation scores 15+, run a feedback loop:

1. Analyze the top 2 scoring variations — identify what works and what doesn't
2. Identify the specific weaknesses from each scoring dimension
3. Generate 3 NEW variations that specifically address those weaknesses
4. Score the new variations using the same judge panel
5. If still no 15+, run one more feedback loop (max 2 loops total)

#### Phase D: Self-Healing Check

For the highest-scoring variation, perform a final self-healing check:

1. **AI Banned Words Scan** — Replace any detected AI words with human alternatives
2. **Template Phrase Scan** — Rewrite any template phrases to be more original
3. **Character Count Check** — Ensure it fits within 280 characters
4. **Readability Check** — Read it aloud mentally; if it sounds robotic, rewrite
5. **Contractions Check** — Ensure natural use of contractions (don't, can't, etc.)

### Step 4: Present Results

Present the final output to the user in this format:

```
## Rally Content Report

### Selected Campaign
- **Campaign**: [name]
- **Protocol**: [project]
- **Best Angle**: [which angle won]

### Winning Content (Score: X/18)

[the tweet content here]

### Score Breakdown
| Dimension | Score | Notes |
|-----------|-------|-------|
| Authenticity | X/3 | [why] |
| Relevance | X/3 | [why] |
| Engagement | X/3 | [why] |
| Originality | X/3 | [why] |
| Clarity | X/3 | [why] |
| Compliance | X/3 | [why] |

### Pipeline Stats
- Variations generated: X
- Feedback loops: X
- Pipeline verdict: [PASS/NEEDS WORK]

### Compliance Report
- AI banned words found: [list or "None"]
- Template phrases found: [list or "None"]
- Hashtags: [Yes/No]
- Em-dashes: [Yes/No]
- @RallyOnChain mention: [Yes/No]

### Quick Copy
[one-liner version of the tweet for easy copying]
```

## Important Notes

- **Always use web-search** to get the latest campaign data — campaigns rotate frequently
- **Quality over speed** — the feedback loop exists to ensure high scores, don't skip it
- **Human-sounding content is king** — Rally.fun's AI specifically penalizes AI-sounding content
- **No hashtags** — Rally.fun compliance requires no hashtags in the tweet body
- **No em-dashes** — use regular punctuation only
- **Always include @RallyOnChain** — this is mandatory for scoring
- Content should be in **English** as that's what Rally.fun's AI judge evaluates
- If the user provides additional context about the campaign or their preferred style, incorporate it

## User Language Handling

While the generated content should be in English (for Rally.fun scoring), communicate with the user in their preferred language. Explain scores, reports, and instructions in the user's language, but the actual tweet content must be in English.

## Quick Mode

If the user specifies a campaign directly (e.g., "/rally [campaign name]"), skip Step 1 and go straight to Step 2 with the specified campaign. This saves time when the user already knows which campaign they want.
