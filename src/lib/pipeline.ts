import { learn } from './learner';
import { generate } from './generator';
import { judge } from './judge';
import type { PipelineResult } from './types';

const MAX_RETRIES = 3;

export async function runPipeline(
  campaignAddress: string,
  missionId?: string,
  customBrief?: string
): Promise<PipelineResult> {
  // Step 1: Learn (always fetch latest data)
  await learn(campaignAddress);

  // Step 2: Generate
  const genResult = await generate({ campaignAddress, missionId, customBrief });

  // Step 3: Judge (with retry)
  let retries = 0;
  let content = genResult.cleaned;
  let lastFeedback = '';

  while (retries <= MAX_RETRIES) {
    const judgeResult = await judge({ content, campaignAddress });

    if (judgeResult.accepted) {
      return {
        content,
        judgeResult,
        retries,
      };
    }

    lastFeedback = judgeResult.feedback;
    retries++;

    if (retries > MAX_RETRIES) {
      return {
        content,
        judgeResult,
        retries,
      };
    }

    // Regenerate with feedback
    const newGenResult = await generate({
      campaignAddress,
      missionId,
      customBrief: `${customBrief || ''}\n\nIMPORTANT FEEDBACK FROM REVIEWER (fix these issues):\n${lastFeedback}`.trim(),
    });
    content = newGenResult.cleaned;
  }

  const finalJudge = await judge({ content, campaignAddress });
  return { content, judgeResult: finalJudge, retries };
}
