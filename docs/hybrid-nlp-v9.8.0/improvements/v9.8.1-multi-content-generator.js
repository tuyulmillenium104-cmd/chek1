/**
 * MULTI-CONTENT GENERATOR v9.8.1
 * Enhancement for Hybrid NLP System
 * 
 * Fitur Baru:
 * - Generate 5 konten sekaligus
 * - Batch judging dengan ranking
 * - Pilih konten terbaik
 * - Model GLM-4-Plus dengan Think + WebSearch
 */

// ============================================================================
// KONFIGURASI MULTI-CONTENT
// ============================================================================

const MULTI_CONTENT_CONFIG = {
  // Jumlah konten yang di-generate per batch
  contentCount: 5,
  
  // Model settings (optimized)
  model: {
    name: 'glm-4-plus',  // Model terbaik GLM
    temperature: {
      generation: 0.8,    // Kreatif untuk generation
      judging: 0.2        // Konsisten untuk judging
    },
    maxTokens: 4000,
    enableThinking: true,  // Mode think aktif
    enableSearch: true     // Web search aktif
  },
  
  // Ranking settings
  ranking: {
    method: 'weighted',   // weighted, average, best-of
    weights: {
      gateUtama: 0.15,
      gateTambahan: 0.12,
      penilaianInternal: 0.35,
      compliance: 0.10,
      factCheck: 0.08,
      uniqueness: 0.20
    },
    minPassScore: 118,
    selectTopN: 1         // Pilih N konten terbaik
  },
  
  // Batch processing
  batch: {
    parallelGeneration: false,  // Generate sequential untuk stabilitas
    parallelJudging: false,     // Judge sequential untuk konsistensi
    maxRetries: 3,
    retryDelayMs: 3000
  }
};

// ============================================================================
// MULTI-CONTENT GENERATOR CLASS
// ============================================================================

class MultiContentGenerator {
  constructor(llm, config = MULTI_CONTENT_CONFIG) {
    this.llm = llm;
    this.config = config;
    this.generatedContents = [];
    this.judgingResults = [];
    this.rankings = [];
  }
  
  /**
   * GENERATE 5 KONTEN SEKALIGUS
   */
  async generateMultipleContents(campaignData, competitorAnalysis, researchData) {
    console.log('\n' + '═'.repeat(60));
    console.log(`🚀 GENERATING ${this.config.contentCount} CONTENTS`);
    console.log('═'.repeat(60));
    
    this.generatedContents = [];
    
    for (let i = 0; i < this.config.contentCount; i++) {
      console.log(`\n📝 Generating Content ${i + 1}/${this.config.contentCount}...`);
      
      // Set variation seed untuk keberagaman
      const variationSeed = {
        index: i,
        angleVariation: this._getAngleVariation(i, competitorAnalysis),
        emotionVariation: this._getEmotionVariation(i),
        structureVariation: this._getStructureVariation(i)
      };
      
      try {
        const content = await this._generateSingleContent(
          campaignData,
          competitorAnalysis,
          researchData,
          variationSeed
        );
        
        if (content) {
          this.generatedContents.push({
            index: i + 1,
            content: content,
            variation: variationSeed,
            timestamp: new Date().toISOString()
          });
          console.log(`   ✅ Content ${i + 1} generated successfully`);
        }
      } catch (error) {
        console.log(`   ❌ Content ${i + 1} failed: ${error.message}`);
      }
      
      // Delay antar generation
      if (i < this.config.contentCount - 1) {
        await this._delay(2000);
      }
    }
    
    console.log(`\n📊 Generated ${this.generatedContents.length}/${this.config.contentCount} contents`);
    return this.generatedContents;
  }
  
  /**
   * JUDGE SEMUA KONTEN DENGAN RANKING
   */
  async judgeAllContents(campaignData, competitorContents) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚖️  BATCH JUDGING ALL CONTENTS');
    console.log('═'.repeat(60));
    
    this.judgingResults = [];
    
    for (let i = 0; i < this.generatedContents.length; i++) {
      const contentItem = this.generatedContents[i];
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`📋 JUDGING CONTENT ${contentItem.index}`);
      console.log(`${'─'.repeat(50)}`);
      
      try {
        const result = await this._runFullJudging(
          contentItem.content,
          campaignData,
          competitorContents
        );
        
        this.judgingResults.push({
          index: contentItem.index,
          content: contentItem.content,
          result: result,
          passed: result.passed,
          totalScore: result.totalScore
        });
        
        this._displayJudgingResult(contentItem.index, result);
        
      } catch (error) {
        console.log(`   ❌ Judging failed: ${error.message}`);
        this.judgingResults.push({
          index: contentItem.index,
          content: contentItem.content,
          result: null,
          passed: false,
          totalScore: 0,
          error: error.message
        });
      }
      
      if (i < this.generatedContents.length - 1) {
        await this._delay(3000);
      }
    }
    
    this._calculateRankings();
    return this.judgingResults;
  }
  
  /**
   * CALCULATE RANKINGS
   */
  _calculateRankings() {
    console.log('\n' + '═'.repeat(60));
    console.log('🏆 CALCULATING RANKINGS');
    console.log('═'.repeat(60));
    
    this.rankings = [...this.judgingResults]
      .filter(r => r.result !== null)
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((r, rank) => ({
        rank: rank + 1,
        index: r.index,
        totalScore: r.totalScore,
        passed: r.passed,
        grade: this._calculateGrade(r.totalScore)
      }));
    
    console.log('\n┌────────────────────────────────────────────────────────────┐');
    console.log('│                    📊 RANKING RESULTS                      │');
    console.log('├────────────────────────────────────────────────────────────┤');
    
    this.rankings.forEach(r => {
      const passIcon = r.passed ? '✅' : '❌';
      console.log(`│  #${r.rank}  Content ${r.index}  │  Score: ${r.totalScore.toString().padStart(3)}  │  ${r.grade.padEnd(3)}  │  ${passIcon}     │`);
    });
    
    console.log('└────────────────────────────────────────────────────────────┘');
    
    const best = this.rankings[0];
    if (best) {
      console.log(`\n🥇 BEST CONTENT: Content ${best.index} (Score: ${best.totalScore}, Grade: ${best.grade})`);
    }
  }
  
  /**
   * GET BEST CONTENT
   */
  getBestContent() {
    if (this.rankings.length === 0) return null;
    
    const bestRanking = this.rankings[0];
    const bestResult = this.judgingResults.find(r => r.index === bestRanking.index);
    
    return {
      content: bestResult.content,
      score: bestRanking.totalScore,
      grade: bestRanking.grade,
      passed: bestRanking.passed,
      rank: 1,
      index: bestRanking.index
    };
  }
  
  /**
   * GET ALL PASSING CONTENTS
   */
  getAllPassingContents() {
    return this.judgingResults
      .filter(r => r.passed)
      .map(r => ({
        content: r.content,
        score: r.totalScore,
        index: r.index
      }))
      .sort((a, b) => b.score - a.score);
  }
  
  // =========================================================================
  // INTERNAL METHODS
  // =========================================================================
  
  _getAngleVariation(index) {
    const angles = ['personal_story', 'data_driven', 'contrarian', 'insider_perspective', 'case_study'];
    return angles[index % angles.length];
  }
  
  _getEmotionVariation(index) {
    const emotions = [
      ['curiosity', 'surprise'],
      ['fear', 'hope'],
      ['anger', 'trust'],
      ['sadness', 'anticipation'],
      ['surprise', 'joy']
    ];
    return emotions[index % emotions.length];
  }
  
  _getStructureVariation(index) {
    const structures = ['hero_journey', 'problem_solution', 'before_after', 'mystery_reveal', 'case_study'];
    return structures[index % structures.length];
  }
  
  _calculateGrade(score) {
    if (score >= 130) return 'A+';
    if (score >= 125) return 'A';
    if (score >= 120) return 'A-';
    if (score >= 115) return 'B+';
    if (score >= 110) return 'B';
    if (score >= 105) return 'B-';
    if (score >= 100) return 'C+';
    if (score >= 95) return 'C';
    return 'D';
  }
  
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  _displayJudgingResult(index, result) {
    console.log(`\n   📊 Content ${index} Result:`);
    console.log(`      TOTAL: ${result.totalScore}/136`);
    console.log(`      Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
  }
}

module.exports = { MultiContentGenerator, MULTI_CONTENT_CONFIG };
