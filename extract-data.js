#!/usr/bin/env node
/**
 * extract-data.js — Data extraction untuk Grvt Mission 2
 * 
 * Menjalankan pipeline data-gathering workflow TANPA generasi konten/judge.
 * Menggunakan approach: load workflow, inject extraction, jalankan via require.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'download', 'grvt-m2-all-data.json');

// Read workflow, patch main() → extractAllData()
let code = fs.readFileSync(path.join(__dirname, 'rally-workflow-v9.8.3-final.js'), 'utf8');

const extractionFn = `
async function extractAllData() {
  try {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║  📦 DATA EXTRACTION - Grvt Mission 2              ║');
    console.log('╚═══════════════════════════════════════════════════╝');

    await preflightCheck();

    console.log('\\n📥 STEP 1: Load Campaign...');
    const campaignData = loadCampaignFromFile('campaigns/grvt-m2.json');
    if (!campaignData) { console.error('❌ Failed'); process.exit(1); }
    console.log('   ✅ ' + campaignData.title);

    console.log('\\n📋 STEP 2: Requirements...');
    const campaignRequirements = displayCampaignRequirements(campaignData);
    console.log('   ✅ Parsed');

    console.log('\\n📊 STEP 3: Leaderboard...');
    const submissions = await fetchLeaderboard(campaignData.intelligentContractAddress);
    console.log('   ✅ ' + (submissions?.length || 0) + ' submissions');

    console.log('\\n🔍 STEP 4: Competitor Analysis...');
    const llm = new MultiProviderLLM(CONFIG);
    let competitorAnalysis = { competitorContent: [], analysis: 'No submissions' };
    if (submissions && submissions.length > 0) {
      competitorAnalysis = await deepCompetitorContentAnalysis(llm, submissions, campaignData.title, campaignData);
    }
    console.log('   ✅ Done');

    console.log('\\n🔎 STEP 5: Deep Research...');
    const researchData = await multiQueryDeepResearch(llm, campaignData.title, campaignData);
    console.log('   ✅ Done');

    console.log('\\n🧠 STEP 6: Deep Intent...');
    const campaignIntent = await deepCampaignIntentAnalyzer(llm, campaignData, campaignRequirements);
    _cachedCampaignIntent = campaignIntent;
    console.log('   ✅ Done');

    console.log('\\n📖 STEP 7: Comprehension...');
    const comprehensionPlan = await campaignComprehensionCheck(llm, campaignData, competitorAnalysis, researchData, campaignRequirements);
    comprehensionPlan._deepIntent = campaignIntent;
    comprehensionPlan._wrongMetrics = campaignIntent.metricClassification?.wrongMetricsToAvoid || [];
    comprehensionPlan._correctMetrics = campaignIntent.metricClassification?.correctMetricsToUse || [];
    comprehensionPlan._metricType = campaignIntent.metricClassification?.campaignMetricType;
    comprehensionPlan._contentType = campaignIntent.contentType?.primary;
    comprehensionPlan._contentToAvoid = campaignIntent.contentToAvoid;
    comprehensionPlan._contentToUse = campaignIntent.contentToUse;
    comprehensionPlan._trueIntent = campaignIntent.trueIntent;
    comprehensionPlan._criticalWarnings = campaignIntent.criticalWarnings || [];
    console.log('   ✅ Done');

    const allData = {
      _meta: { time: new Date().toISOString(), campaign: campaignData.title, mission: campaignData.missionTitle },
      step1_campaignData: campaignData,
      step2_requirements: campaignRequirements,
      step3_submissions: submissions,
      step4_competitorAnalysis: competitorAnalysis,
      step5_researchData: researchData,
      step6_deepIntent: campaignIntent,
      step7_comprehensionPlan: comprehensionPlan
    };

    const _outFile = '/home/z/my-project/download/grvt-m2-all-data.json';
    fs.writeFileSync(_outFile, JSON.stringify(allData, null, 2));
    console.log('\\n✅ SAVED: download/grvt-m2-all-data.json (' + (fs.statSync(_outFile).size / 1024).toFixed(1) + ' KB)');
    console.log('\\n🎉 ALL 7 STEPS COMPLETE!');
  } catch (err) {
    console.error('\\n❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}
extractAllData();
`;

// Replace ONLY the last line "main();" with extraction
code = code.replace(/\nmain\(\);\s*$/, '\n' + extractionFn);

const tmpFile = path.join(__dirname, '.extract-tmp.js');
fs.writeFileSync(tmpFile, code);
console.log('Running extraction...');
// Now execute it
const { execSync } = require('child_process');
try {
  execSync('node --max-old-space-size=512 "' + tmpFile + '"', {
    cwd: __dirname,
    stdio: 'inherit',
    timeout: 600000
  });
} finally {
  try { fs.unlinkSync(tmpFile); } catch(e) {}
}
