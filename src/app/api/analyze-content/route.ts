import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Rally-style AI content analysis
async function analyzeWithLLM(
  content: string, 
  campaignContext?: string,
  engagement?: {
    likes: number;
    replies: number;
    retweets: number;
    impressions: number;
    followersOfRepliers: number;
  }
) {
  const zai = await ZAI.create();

  const systemPrompt = `You are Rally.fun's AI content scoring system. Analyze social media content EXACTLY like Rally's multi-LLM validator.

## RALLY SCORING SYSTEM

### GATE SCORES (0-2 each) - Must pass ALL to qualify

**1. Content Alignment (0-2)**
- 0: OFF-TOPIC - Content has nothing to do with campaign/project
- 1: PARTIALLY ALIGNED - Mentions project but main focus elsewhere  
- 2: PERFECTLY ALIGNED - Directly addresses campaign mission and guidelines

Check: Does content match campaign mission? Use campaign terminology? Address value proposition?

**2. Information Accuracy (0-2)**
- 0: FALSE - Contains verifiable false claims or misinformation
- 1: MIXED - Mostly accurate but contains unverified/exaggerated claims
- 2: ACCURATE - All information correct, well-sourced, properly contextualized

Check: Technical accuracy, documentation alignment, data verification, claims verification

**3. Campaign Compliance (0-2)**
- 0: NON-COMPLIANT - Missing required elements, violates rules
- 1: PARTIAL - Has most requirements but missing minor elements
- 2: FULLY COMPLIANT - All required elements present, proper format

Check: Required hashtags, mentions, disclosures, format compliance, style guidelines

**4. Originality (0-2)**
- 0: PLAGIARIZED/SPAM - Copy-paste, bot behavior, pure spam
- 1: DERIVATIVE - Some original thought but largely based on existing content
- 2: ORIGINAL - Unique perspective, personal insight, novel angle

Check: Authentic voice vs templated AI patterns, unique perspective, personal experience

### QUALITY SCORES (0-5 each)

**5. Engagement Potential (0-5)**
Evaluate 5 sub-factors, average them:
a) Hook Effectiveness (1-5): Strong opening? Grabs attention?
b) Call-to-Action Quality (1-5): Clear CTA?
c) Content Structure (1-5): Well-organized, easy to scan?
d) Conversation Potential (1-5): Sparks discussion?
e) Value Delivery (1-5): Bookmark-worthy insight?

**6. Technical Quality (0-5)**
Evaluate:
a) Language Mechanics (1-5): Grammar, spelling, punctuation
b) Structure & Formatting (1-5): Paragraph breaks, readability
c) Platform Optimization (1-5): Character limits, thread structure
d) Thread Composition (1-5): Logical flow between tweets

**7. Reply Quality (0-5)**
Predict quality of replies content will attract:
- Rally values QUALITY over QUANTITY of replies
- NEGATIVE correlation with reply count (-0.49) - spam replies hurt score
- 5: Attracts meaningful, high-quality discussion
- 3: Average reply quality expected
- 1: Likely to attract spam/bot replies

## RALLY AI ANALYSIS STYLE

Write professional, technical reasons. Reference campaign guidelines explicitly. Cite specific examples from content. Note both strengths and limitations.

## CRITICAL SCORING RULES

1. Be STRICT - do not inflate scores
2. Gate score of 0 anywhere = 0.5x penalty
3. Check for forbidden AI patterns: em dashes in titles, "In the world of", "Picture this", "In today's"
4. Reply Quality has NEGATIVE correlation with reply count - more replies ≠ higher score

Return ONLY valid JSON:
{
  "gates": {
    "contentAlignment": { "score": <0-2>, "reason": "<detailed explanation>" },
    "informationAccuracy": { "score": <0-2>, "reason": "<detailed explanation>" },
    "campaignCompliance": { "score": <0-2>, "reason": "<detailed explanation>" },
    "originality": { "score": <0-2>, "reason": "<detailed explanation>" }
  },
  "quality": {
    "engagementPotential": { "score": <0-5>, "reason": "<analysis of hook, CTA, structure, conversation, value>" },
    "technicalQuality": { "score": <0-5>, "reason": "<analysis of mechanics, formatting, optimization>" },
    "replyQuality": { "score": <0-5>, "reason": "<prediction of reply quality based on content type>" }
  }
}`;

  const userPrompt = `Analyze this content for Rally.fun scoring:

## CAMPAIGN CONTEXT:
${campaignContext || 'No specific campaign context - evaluate as general social media content'}

## CONTENT TO ANALYZE:
"""
${content}
"""

${engagement ? `## CURRENT ENGAGEMENT METRICS:
- Likes: ${engagement.likes}
- Replies: ${engagement.replies}
- Retweets: ${engagement.retweets}
- Impressions: ${engagement.impressions}
- Followers of Repliers: ${engagement.followersOfRepliers}

NOTE: Reply Quality should be based on CONTENT ANALYSIS, NOT reply count. Rally penalizes spam/bot replies.` : ''}

Provide your analysis as JSON only:`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      thinking: { type: 'disabled' }
    });

    const response = completion.choices[0]?.message?.content || '';
    
    // Parse JSON response
    let jsonStr = response;
    if (response.includes('```json')) {
      jsonStr = response.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || response;
    } else if (response.includes('```')) {
      jsonStr = response.match(/```\s*([\s\S]*?)\s*```/)?.[1] || response;
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    
    // Validate and clamp scores
    const clamp = (val: number, min: number, max: number) => 
      Math.max(min, Math.min(max, Number(val) || 0));
    
    return {
      success: true,
      analysis: {
        gates: {
          contentAlignment: {
            score: clamp(parsed.gates?.contentAlignment?.score ?? 1, 0, 2),
            reason: parsed.gates?.contentAlignment?.reason || 'Content alignment assessed.'
          },
          informationAccuracy: {
            score: clamp(parsed.gates?.informationAccuracy?.score ?? 1, 0, 2),
            reason: parsed.gates?.informationAccuracy?.reason || 'Information accuracy assessed.'
          },
          campaignCompliance: {
            score: clamp(parsed.gates?.campaignCompliance?.score ?? 1, 0, 2),
            reason: parsed.gates?.campaignCompliance?.reason || 'Campaign compliance assessed.'
          },
          originality: {
            score: clamp(parsed.gates?.originality?.score ?? 1, 0, 2),
            reason: parsed.gates?.originality?.reason || 'Originality assessed.'
          }
        },
        quality: {
          engagementPotential: {
            score: clamp(parsed.quality?.engagementPotential?.score ?? 3, 0, 5),
            reason: parsed.quality?.engagementPotential?.reason || 'Engagement potential assessed.'
          },
          technicalQuality: {
            score: clamp(parsed.quality?.technicalQuality?.score ?? 3, 0, 5),
            reason: parsed.quality?.technicalQuality?.reason || 'Technical quality assessed.'
          },
          replyQuality: {
            score: clamp(parsed.quality?.replyQuality?.score ?? 3, 0, 5),
            reason: parsed.quality?.replyQuality?.reason || 'Reply quality assessed.'
          }
        }
      },
      metadata: {
        analysisMethod: 'rally-llm',
        model: 'z-ai-enhanced'
      }
    };
  } catch (error) {
    console.error('LLM analysis error:', error);
    return { success: false, error: String(error) };
  }
}

// Rule-based fallback
function ruleBasedAnalysis(content: string, campaignContext?: string) {
  const text = content.toLowerCase();
  const words = text.split(/\s+/).length;
  const hasHashtags = /#\w+/.test(content);
  const hasQuestions = /\?/.test(content);
  const hasCTA = /check out|read more|learn more|don't miss|join|subscribe|follow|like|retweet|share|comment|what do you think|thoughts\?/i.test(content);
  const hasPersonalTouch = /i think|i believe|in my opinion|i've|i am|i'm|my|we're|we have|our|personally|experience/i.test(content);
  const hasSpecificDetails = /\d+%|\d+\s*(percent|million|billion|thousand)|specific|exactly|precisely/i.test(content);
  const hasAIPatterns = /—|"In the world of|"Picture this|"In today's/i.test(content);

  return {
    gates: {
      contentAlignment: {
        score: campaignContext ? (text.length > 50 ? 1 : 0) : 2,
        reason: campaignContext ? 'Content evaluated against campaign context' : 'No campaign context provided'
      },
      informationAccuracy: {
        score: hasSpecificDetails ? 2 : (words > 10 ? 1 : 0),
        reason: hasSpecificDetails ? 'Contains specific verifiable details' : 'General information'
      },
      campaignCompliance: {
        score: hasHashtags ? 2 : 1,
        reason: hasHashtags ? 'Contains hashtags' : 'No hashtags found'
      },
      originality: {
        score: hasAIPatterns ? 0 : (hasPersonalTouch && hasSpecificDetails ? 2 : 1),
        reason: hasAIPatterns ? 'Contains AI-generated patterns' : (hasPersonalTouch ? 'Contains personal touch' : 'Standard content')
      }
    },
    quality: {
      engagementPotential: {
        score: hasCTA && hasQuestions ? 4 : (hasCTA || hasQuestions ? 3 : 2),
        reason: hasCTA ? 'Has call-to-action' : 'Limited engagement hooks'
      },
      technicalQuality: {
        score: words >= 20 ? 4 : (words >= 10 ? 3 : 2),
        reason: `${words} words, ${words >= 20 ? 'good length' : 'adequate length'}`
      },
      replyQuality: {
        score: hasQuestions ? 4 : 3,
        reason: hasQuestions ? 'Asks questions, invites discussion' : 'Standard reply quality expected'
      }
    },
    metadata: {
      analysisMethod: 'rule-based-fallback'
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, campaignContext, engagement } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Try LLM analysis first
    const llmResult = await analyzeWithLLM(content, campaignContext, engagement);
    
    if (llmResult.success && llmResult.analysis) {
      return NextResponse.json({
        success: true,
        analysis: llmResult.analysis,
        metadata: llmResult.metadata
      });
    }

    // Fallback to rule-based
    console.log('LLM analysis failed, using rule-based fallback');
    const analysis = ruleBasedAnalysis(content, campaignContext);
    
    return NextResponse.json({
      success: true,
      analysis: analysis,
      metadata: analysis.metadata
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}
