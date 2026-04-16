import { fetchSubmissions } from './rally-api';
import { appendSubmission, readSeenHashes, addSeenHashes, readMetadata, writeMetadata, extractPatterns, writePatterns, initCampaign, readSubmissions } from './knowledge-db';
import type { LearnResult, KnowledgeSubmission } from './types';

function calculateGrade(totalScore: number): string {
  if (totalScore >= 16) return 'S';
  if (totalScore >= 13) return 'A';
  if (totalScore >= 9) return 'B';
  return 'C';
}

export async function learn(campaignAddress: string): Promise<LearnResult> {
  const rallySubmissions = await fetchSubmissions(campaignAddress);

  const slug = campaignAddress.toLowerCase().substring(0, 10);
  initCampaign(slug, campaignAddress, `Campaign ${slug}`);

  const seen = new Set(readSeenHashes(slug));

  let newCount = 0;
  for (const sub of rallySubmissions) {
    if (seen.has(sub.id)) continue;

    const gateCategories = ['Content Alignment', 'Information Accuracy', 'Campaign Compliance', 'Originality and Authenticity'];
    const qualityCategories = ['Engagement Potential', 'Technical Quality', 'Reply Quality'];
    const scoredCategories = [...gateCategories, ...qualityCategories];

    const scores: { category: string; score: number; maxScore: number; analysis: string }[] = [];
    let totalScore = 0;

    for (const item of sub.analysis) {
      const score = parseInt(item.atto_score) / 1e18;
      const mScore = parseInt(item.atto_max_score) / 1e18;

      if (mScore > 0 || scoredCategories.includes(item.category)) {
        scores.push({
          category: item.category,
          score,
          maxScore: Math.max(mScore, 5),
          analysis: item.analysis,
        });
        totalScore += score;
      }
    }

    const grade = calculateGrade(totalScore);

    const knowledgeSub: KnowledgeSubmission = {
      id: sub.id,
      campaignAddress: sub.campaignAddress,
      xUsername: sub.xUsername,
      tweetId: sub.tweetId,
      totalScore,
      grade,
      scores,
      timestamp: sub.timestamp,
      learnedAt: new Date().toISOString(),
    };

    appendSubmission(slug, knowledgeSub);
    seen.add(sub.id);
    newCount++;
  }

  addSeenHashes(slug, Array.from(seen));

  const patterns = extractPatterns(slug);
  writePatterns(slug, patterns);

  const metadata = readMetadata(slug)!;
  const total = readSubmissions(slug);

  const gradeDist = { S: 0, A: 0, B: 0, C: 0 };
  for (const s of total) {
    gradeDist[s.grade as keyof typeof gradeDist]++;
  }

  metadata.totalSubmissions = total.length;
  metadata.lastLearnAt = new Date().toISOString();
  metadata.gradeDistribution = gradeDist;
  writeMetadata(slug, metadata);

  return {
    newSubmissions: newCount,
    totalSubmissions: total.length,
    patternsExtracted: true,
  };
}
