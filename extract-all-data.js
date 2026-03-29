#!/usr/bin/env node
/**
 * extract-all-data.js
 * 
 * Menjalankan pipeline data gathering saja (tanpa generate & judge)
 * lalu menyimpan SEMUA hasil ke JSON.
 * 
 * Usage: node extract-all-data.js
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW = path.join(__dirname, 'rally-workflow-v9.8.3-final.js');
const OUTPUT = path.join(__dirname, 'download', 'grvt-m2-all-data.json');

// Read workflow source
let code = fs.readFileSync(WORKFLOW, 'utf8');

// Replace "main();" at the very end with our extraction function
const extractionCode = `
// ═══════════════════════════════════════════════════════════
// DATA EXTRACTION - No generation, no judge
// ═══════════════════════════════════════════════════════════

process.on('unhandledRejection', (err) => {
  console.error('\\n❌ UNHANDLED REJECTION:', err?.message || err);
  fs.writeFileSync('${OUTPUT}', JSON.stringify({ error: 'unhandledRejection: ' + (err?.message || err) }, null, 2));
  process.exit(1);
});

async function extractAllData() {
  try {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📦 DATA EXTRACTION - Grvt Mission 2                     ║');
    console.log('║  Pipeline: Campaign → Requirements → Leaderboard →       ║');
    console.log('║  Competitor → Research → Deep Intent → Comprehension      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    // ── STEP 0: Pre-flight ──
    console.log('\\n🔌 STEP 0: Pre-flight Check...');
    await preflightCheck();

    // ── STEP 1: Load Campaign Data ──
    console.log('\\n📥 STEP 1: Loading Campaign Data (from JSON)...');
    const campaignData = loadCampaignFromFile('campaigns/grvt-m2.json');
    if (!campaignData) {
      console.error('❌ Failed to load campaign');
      process.exit(1);
    }
    console.log('   ✅ Campaign loaded:', campaignData.title);

    // ── STEP 2: Parse Requirements ──
    console.log('\\n📋 STEP 2: Parsing Campaign Requirements...');
    const campaignRequirements = displayCampaignRequirements(campaignData);
    console.log('   ✅ Requirements parsed');

    // ── STEP 3: Fetch Leaderboard ──
    console.log('\\n📊 STEP 3: Fetching Leaderboard...');
    let submissions = [];
    if (campaignData.intelligentContractAddress) {
      try {
        submissions = await fetchLeaderboard(campaignData.intelligentContractAddress);
        console.log('   ✅ Found', submissions?.length || 0, 'submissions');
      } catch (e) {
        console.log('   ⚠️ Leaderboard error:', e.message);
      }
    } else {
      console.log('   ⚠️ No address - skipping');
    }

    // ── STEP 4: Deep Competitor Analysis ──
    console.log('\\n🔍 STEP 4: Deep Competitor Analysis...');
    const llm = new MultiProviderLLM(CONFIG);
    let competitorAnalysis = { competitorContent: [], analysis: 'No submissions' };
    let competitorContents = [];
    if (submissions && submissions.length > 0) {
      competitorAnalysis = await deepCompetitorContentAnalysis(llm, submissions, campaignData.title, campaignData);
      competitorContents = (competitorAnalysis?.competitorContent || []).map(c => typeof c === 'string' ? c : c.content || '');
      console.log('   ✅ Analyzed', competitorContents.length, 'competitor contents');
    } else {
      console.log('   ℹ️ No submissions to analyze - skipping');
    }

    // ── STEP 5: Deep Research ──
    console.log('\\n🔎 STEP 5: Multi-Query Deep Research...');
    const researchData = await multiQueryDeepResearch(llm, campaignData.title, campaignData);
    console.log('   ✅ Research complete');

    // ── STEP 6: Deep Campaign Intent ──
    console.log('\\n🧠 STEP 6: Deep Campaign Intent Analysis...');
    const campaignIntent = await deepCampaignIntentAnalyzer(llm, campaignData, campaignRequirements);
    _cachedCampaignIntent = campaignIntent;
    console.log('   ✅ Intent analyzed');

    // ── STEP 7: Campaign Comprehension ──
    console.log('\\n📖 STEP 7: Campaign Comprehension Check...');
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
    console.log('   ✅ Comprehension done');

    // ── SAVE ALL DATA ──
    const allData = {
      _meta: {
        extractionTime: new Date().toISOString(),
        workflow: 'rally-workflow-v9.8.3-final.js',
        campaign: campaignData.title,
        mission: campaignData.missionTitle
      },
      step1_campaignData: campaignData,
      step2_campaignRequirements: campaignRequirements,
      step3_competitorSubmissions: submissions,
      step4_competitorAnalysis: competitorAnalysis,
      step5_researchData: researchData,
      step6_deepIntent: campaignIntent,
      step7_comprehensionPlan: comprehensionPlan
    };

    fs.writeFileSync(OUTPUT, JSON.stringify(allData, null, 2));
    const sizeKB = (fs.statSync(OUTPUT).size / 1024).toFixed(1);
    console.log('\\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ EXTRACTION COMPLETE                                    ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  📁 File: download/grvt-m2-all-data.json                  ║');
    console.log('║  📦 Size: ' + sizeKB.padEnd(44) + '║');
    console.log('║  📊 Steps: 7/7 completed                                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

  } catch (err) {
    console.error('\\n❌ EXTRACTION ERROR:', err.message);
    console.error(err.stack);
    fs.writeFileSync(OUTPUT, JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
    process.exit(1);
  }
}

extractAllData();
`;

code = code.replace(/^main\(\);$/m, extractionCode);

// Write temp file
const tempFile = path.join(__dirname, '.extract-run.js');
fs.writeFileSync(tempFile, code);
console.log('Extraction script created. Running...');
