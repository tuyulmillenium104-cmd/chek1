#!/usr/bin/env python3
"""
Rally.fun NLP Service - Python Layer for Hybrid System
Version: 9.8.0 ENHANCED (with all v9.8.1 + AI Grammar features)

This service provides advanced NLP capabilities for the Rally.fun content workflow:
- Sentiment Analysis (VADER + TextBlob)
- Semantic Similarity (Sentence Transformers)
- Readability Scoring (textstat)
- Named Entity Recognition (spaCy)
- Grammar Checking (HappyTransformer T5 AI + LanguageTool)
- AI Detection Indicators
- Emotion Detection with Rare Combos
- Content Depth Analysis
- Anti-Template Detection
- Perplexity & Burstiness Analysis
- Coherence Analysis
- Engagement Prediction
- Persuasion Analysis
- Topic Relevance
- Tone Consistency
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import logging
import re
import math
import os
from datetime import datetime
from collections import Counter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Rally.fun NLP Service",
    description="Advanced NLP processing for content quality analysis - Full AI-Powered",
    version="9.8.0-enhanced"
)

# ============================================
# OPTIONAL: Import NLP libraries with fallbacks
# ============================================

# Try to import advanced libraries
try:
    from textblob import TextBlob
    HAS_TEXTBLOB = True
    logger.info("✅ TextBlob loaded")
except ImportError:
    HAS_TEXTBLOB = False
    logger.warning("⚠️ TextBlob not available")

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    HAS_VADER = True
    vader_analyzer = SentimentIntensityAnalyzer()
    logger.info("✅ VADER loaded")
except ImportError:
    HAS_VADER = False
    logger.warning("⚠️ VADER not available")

try:
    import textstat
    HAS_TEXTSTAT = True
    logger.info("✅ textstat loaded")
except ImportError:
    HAS_TEXTSTAT = False
    logger.warning("⚠️ textstat not available")

# spaCy for NER
try:
    import spacy
    try:
        nlp_spacy = spacy.load("en_core_web_sm")
        HAS_SPACY = True
        logger.info("✅ spaCy loaded")
    except OSError:
        HAS_SPACY = False
        logger.warning("⚠️ spaCy model not found")
except ImportError:
    HAS_SPACY = False
    logger.warning("⚠️ spaCy not available")

# Sentence Transformers for semantic similarity
try:
    from sentence_transformers import SentenceTransformer
    import torch
    HAS_SENTENCE_TRANSFORMERS = True
    semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("✅ sentence-transformers loaded")
except Exception as e:
    HAS_SENTENCE_TRANSFORMERS = False
    semantic_model = None
    logger.warning(f"⚠️ sentence-transformers not available: {e}")

# HappyTransformer for AI Grammar Correction (T5-based)
HAS_HAPPY_TRANSFORMER = False
happy_grammar_model = None

def init_happy_transformer():
    """Initialize HappyTransformer for AI grammar correction"""
    global HAS_HAPPY_TRANSFORMER, happy_grammar_model
    if happy_grammar_model is not None:
        return HAS_HAPPY_TRANSFORMER
    
    try:
        from happytransformer import HappyTextToText, TTSettings
        logger.info("🔄 Loading HappyTransformer T5 grammar model...")
        happy_grammar_model = HappyTextToText("T5", "vennify/t5-base-grammar-correction")
        HAS_HAPPY_TRANSFORMER = True
        logger.info("✅ HappyTransformer T5 AI Grammar loaded")
        return True
    except Exception as e:
        HAS_HAPPY_TRANSFORMER = False
        happy_grammar_model = None
        logger.warning(f"⚠️ HappyTransformer not available: {e}")
        return False

# LanguageTool for detailed grammar checking
HAS_GRAMMAR_TOOL = False
grammar_tool = None

def init_grammar_tool():
    """Initialize LanguageTool for detailed grammar checking"""
    global HAS_GRAMMAR_TOOL, grammar_tool
    if grammar_tool is not None:
        return HAS_GRAMMAR_TOOL
    
    try:
        import language_tool_python
        logger.info("🔄 Loading LanguageTool...")
        grammar_tool = language_tool_python.LanguageTool('en-US')
        HAS_GRAMMAR_TOOL = True
        logger.info("✅ LanguageTool loaded")
        return True
    except Exception as e:
        HAS_GRAMMAR_TOOL = False
        grammar_tool = None
        logger.warning(f"⚠️ LanguageTool not available: {e}")
        return False

# Initialize grammar tools
SKIP_GRAMMAR = os.environ.get('SKIP_GRAMMAR_TOOL', '0') == '1'
if not SKIP_GRAMMAR:
    init_happy_transformer()
    # LanguageTool loads lazily
    logger.info("⏳ LanguageTool will load on first use if needed")
else:
    logger.info("⚠️ Grammar tool initialization skipped")

# Transformers for AI detection
try:
    from transformers import pipeline
    HAS_TRANSFORMERS = True
    logger.info("✅ transformers loaded")
except Exception as e:
    HAS_TRANSFORMERS = False
    logger.warning(f"⚠️ transformers not available: {e}")

# Scikit-learn for ML features
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    HAS_SKLEARN = True
    logger.info("✅ scikit-learn loaded")
except ImportError:
    HAS_SKLEARN = False
    logger.warning("⚠️ scikit-learn not available")


# ============================================
# Request/Response Models
# ============================================

class ContentAnalyzeRequest(BaseModel):
    content: str
    campaign_context: Optional[Dict[str, Any]] = None
    competitor_contents: Optional[List[str]] = []
    topic: Optional[str] = None

class SimilarityCheckRequest(BaseModel):
    new_content: str
    competitor_contents: List[str]
    threshold: float = 0.7

class EmotionDetectRequest(BaseModel):
    content: str
    detailed: bool = False

class UniquenessAnalyzeRequest(BaseModel):
    content: str
    competitor_contents: List[str]
    campaign_context: Optional[Dict[str, Any]] = None

class DepthAnalyzeRequest(BaseModel):
    content: str
    required_elements: Optional[List[str]] = None

class AntiTemplateCheckRequest(BaseModel):
    content: str
    template_patterns: Optional[List[str]] = None
    threshold: float = 0.85

class CompareTextsRequest(BaseModel):
    text1: str
    text2: str

class GrammarCheckRequest(BaseModel):
    content: str


# ============================================
# Core Analysis Classes
# ============================================

class SentimentAnalyzer:
    """Multi-method sentiment analysis"""
    
    @staticmethod
    def analyze_vader(text: str) -> Dict[str, Any]:
        """VADER sentiment - optimized for social media"""
        if not HAS_VADER:
            return {"available": False}
        
        scores = vader_analyzer.polarity_scores(text)
        return {
            "available": True,
            "method": "vader",
            "negative": scores['neg'],
            "neutral": scores['neu'],
            "positive": scores['pos'],
            "compound": scores['compound'],
            "label": "positive" if scores['compound'] > 0.05 else 
                     "negative" if scores['compound'] < -0.05 else "neutral",
            "confidence": abs(scores['compound'])
        }
    
    @staticmethod
    def analyze_textblob(text: str) -> Dict[str, Any]:
        """TextBlob sentiment with subjectivity"""
        if not HAS_TEXTBLOB:
            return {"available": False}
        
        blob = TextBlob(text)
        return {
            "available": True,
            "method": "textblob",
            "polarity": blob.sentiment.polarity,
            "subjectivity": blob.sentiment.subjectivity,
            "label": "positive" if blob.sentiment.polarity > 0.1 else
                     "negative" if blob.sentiment.polarity < -0.1 else "neutral",
            "is_subjective": blob.sentiment.subjectivity > 0.5
        }
    
    @staticmethod
    def combined_analysis(text: str) -> Dict[str, Any]:
        """Combine multiple sentiment methods"""
        results = {
            "vader": SentimentAnalyzer.analyze_vader(text),
            "textblob": SentimentAnalyzer.analyze_textblob(text)
        }
        
        # Calculate consensus
        scores = []
        if results["vader"]["available"]:
            scores.append(results["vader"]["compound"])
        if results["textblob"]["available"]:
            scores.append(results["textblob"]["polarity"])
        
        consensus = sum(scores) / len(scores) if scores else 0
        
        return {
            "methods": results,
            "consensus_score": consensus,
            "consensus_label": "positive" if consensus > 0.1 else 
                              "negative" if consensus < -0.1 else "neutral",
            "confidence": len(scores) / 2
        }


class ReadabilityAnalyzer:
    """Multiple readability metrics"""
    
    @staticmethod
    def analyze_textstat(text: str) -> Dict[str, Any]:
        """Full textstat analysis"""
        if not HAS_TEXTSTAT:
            return {"available": False}
        
        try:
            return {
                "available": True,
                "flesch_reading_ease": textstat.flesch_reading_ease(text),
                "flesch_kincaid_grade": textstat.flesch_kincaid_grade(text),
                "gunning_fog": textstat.gunning_fog(text),
                "smog_index": textstat.smog_index(text),
                "ari": textstat.automated_readability_index(text),
                "coleman_liau_index": textstat.coleman_liau_index(text),
                "linsear_write_formula": textstat.linsear_write_formula(text),
                "dale_chall_readability_score": textstat.dale_chall_readability_score(text),
                "text_standard": textstat.text_standard(text),
                "reading_time_minutes": textstat.reading_time(text),
                "syllable_count": textstat.syllable_count(text),
                "lexicon_count": textstat.lexicon_count(text),
                "sentence_count": textstat.sentence_count(text),
                "difficult_words": textstat.difficult_words(text)
            }
        except Exception as e:
            return {"available": False, "error": str(e)}
    
    @staticmethod
    def combined_analysis(text: str) -> Dict[str, Any]:
        """Combine readability methods"""
        textstat_result = ReadabilityAnalyzer.analyze_textstat(text)
        
        primary = textstat_result if textstat_result.get("available") else {"available": False}
        
        return {
            "primary": primary,
            "is_readable": primary.get("flesch_reading_ease", 60) >= 60 if primary.get("available") else True
        }


class SemanticSimilarity:
    """Semantic similarity using embeddings"""
    
    @staticmethod
    def cosine_similarity(vec1, vec2) -> float:
        """Calculate cosine similarity between two vectors"""
        if not HAS_SENTENCE_TRANSFORMERS:
            return 0.0
        
        similarity = torch.nn.functional.cosine_similarity(
            torch.tensor(vec1).unsqueeze(0),
            torch.tensor(vec2).unsqueeze(0)
        )
        return similarity.item()
    
    @staticmethod
    def analyze_with_embeddings(new_content: str, competitor_contents: List[str]) -> Dict[str, Any]:
        """Semantic similarity using sentence transformers"""
        if not HAS_SENTENCE_TRANSFORMERS or not competitor_contents:
            return {"available": False}
        
        try:
            all_texts = [new_content] + competitor_contents
            embeddings = semantic_model.encode(all_texts)
            
            new_embedding = embeddings[0]
            competitor_embeddings = embeddings[1:]
            
            similarities = []
            for i, comp_emb in enumerate(competitor_embeddings):
                sim = SemanticSimilarity.cosine_similarity(new_embedding, comp_emb)
                similarities.append({
                    "index": i,
                    "similarity": round(sim, 4),
                    "competitor_preview": competitor_contents[i][:100] + "..." if len(competitor_contents[i]) > 100 else competitor_contents[i]
                })
            
            max_sim = max(s["similarity"] for s in similarities) if similarities else 0
            avg_sim = sum(s["similarity"] for s in similarities) / len(similarities) if similarities else 0
            
            return {
                "available": True,
                "method": "sentence_transformers",
                "model": "all-MiniLM-L6-v2",
                "max_similarity": round(max_sim, 4),
                "avg_similarity": round(avg_sim, 4),
                "similarities": sorted(similarities, key=lambda x: x["similarity"], reverse=True),
                "is_unique": max_sim < 0.7
            }
        except Exception as e:
            return {"available": False, "error": str(e)}
    
    @staticmethod
    def compare_texts(text1: str, text2: str) -> Dict[str, Any]:
        """Compare two texts for semantic similarity"""
        if HAS_SENTENCE_TRANSFORMERS and semantic_model:
            try:
                embeddings = semantic_model.encode([text1, text2])
                similarity = float(torch.nn.functional.cosine_similarity(
                    embeddings[0].unsqueeze(0),
                    embeddings[1].unsqueeze(0)
                )[0])
                
                return {
                    "similarity_score": round(similarity * 100, 2),
                    "similarity_level": "high" if similarity > 0.8 
                                       else "moderate" if similarity > 0.5 
                                       else "low",
                    "method": "sentence-transformers"
                }
            except Exception as e:
                logger.warning(f"Semantic similarity error: {e}")
        
        # Fallback: Jaccard similarity
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        intersection = words1 & words2
        union = words1 | words2
        jaccard = len(intersection) / len(union) if union else 0
        
        return {
            "similarity_score": round(jaccard * 100, 2),
            "similarity_level": "high" if jaccard > 0.5 
                               else "moderate" if jaccard > 0.2 
                               else "low",
            "common_words": list(intersection)[:10],
            "method": "jaccard"
        }
    
    @staticmethod
    def combined_analysis(new_content: str, competitor_contents: List[str], threshold: float = 0.7) -> Dict[str, Any]:
        """Combine similarity methods"""
        embedding_result = SemanticSimilarity.analyze_with_embeddings(new_content, competitor_contents)
        
        primary = embedding_result if embedding_result.get("available") else {"available": False, "is_unique": True}
        
        return {
            "primary": primary,
            "is_unique": primary.get("is_unique", True),
            "threshold_used": threshold
        }


class EmotionDetector:
    """Multi-level emotion detection with rare combos"""
    
    EMOTION_KEYWORDS = {
        "fear": ["afraid", "scary", "terrifying", "nightmare", "panic", "horror", 
                 "dread", "anxiety", "worried", "threat", "danger", "risk"],
        "anger": ["angry", "furious", "frustrated", "unfair", "injustice", "rage",
                  "annoyed", "irritated", "outrage", "hostile", "bitter"],
        "joy": ["happy", "excited", "amazing", "wonderful", "love", "delight",
                "pleased", "thrilled", "ecstatic", "cheerful", "bliss"],
        "sadness": ["sad", "depressed", "disappointed", "grief", "sorrow",
                    "heartbroken", "melancholy", "miserable", "unhappy"],
        "surprise": ["shocked", "unexpected", "unbelievable", "incredible", 
                     "astonished", "stunned", "amazed", "startling"],
        "disgust": ["disgusting", "gross", "repulsive", "revolting", "nasty",
                    "offensive", "vile", "appalling"],
        "anticipation": ["excited", "waiting", "hope", "expect", "looking forward",
                         "anticipate", "eager", "upcoming", "soon"],
        "trust": ["trust", "believe", "confident", "reliable", "honest",
                  "authentic", "genuine", "credible", "proven"]
    }
    
    RARE_COMBOS = [
        {"emotions": ["fear", "joy"], "name": "Bittersweet Excitement", "score_boost": 25},
        {"emotions": ["anger", "trust"], "name": "Righteous Indignation", "score_boost": 20},
        {"emotions": ["sadness", "anticipation"], "name": "Hopeful Melancholy", "score_boost": 22},
        {"emotions": ["fear", "trust"], "name": "Vulnerable Courage", "score_boost": 23},
        {"emotions": ["surprise", "sadness"], "name": "Shocking Disappointment", "score_boost": 18},
        {"emotions": ["disgust", "joy"], "name": "Guilty Pleasure", "score_boost": 15},
        {"emotions": ["anger", "anticipation"], "name": "Fierce Determination", "score_boost": 20},
        {"emotions": ["fear", "anticipation"], "name": "Nervous Excitement", "score_boost": 17}
    ]
    
    @staticmethod
    def detect(text: str, detailed: bool = False) -> Dict[str, Any]:
        """Detect emotions in text"""
        text_lower = text.lower()
        
        emotion_scores = {}
        for emotion, keywords in EmotionDetector.EMOTION_KEYWORDS.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            if count > 0:
                emotion_scores[emotion] = count
        
        sorted_emotions = sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)
        primary = sorted_emotions[0][0] if sorted_emotions else "neutral"
        
        # Check for rare combinations
        detected_emotions = set(emotion_scores.keys())
        rare_combo = None
        for combo in EmotionDetector.RARE_COMBOS:
            if all(e in detected_emotions for e in combo["emotions"]):
                rare_combo = combo
                break
        
        result = {
            "emotions": dict(sorted_emotions),
            "primary_emotion": primary,
            "emotion_variety": len(emotion_scores),
            "total_emotion_words": sum(emotion_scores.values()),
            "rare_combo_detected": rare_combo is not None,
            "rare_combo": rare_combo
        }
        
        if detailed:
            result["intensity"] = sum(emotion_scores.values()) / max(len(text.split()), 1)
        
        return result


class NERExtractor:
    """Named Entity Recognition"""
    
    @staticmethod
    def extract(text: str) -> Dict[str, Any]:
        """Extract named entities using spaCy"""
        if not HAS_SPACY:
            return {"available": False, "entities": [], "entity_types": {}}
        
        try:
            doc = nlp_spacy(text)
            
            entities = []
            entity_types = Counter()
            
            for ent in doc.ents:
                entities.append({
                    "text": ent.text,
                    "label": ent.label_,
                    "description": spacy.explain(ent.label_),
                    "start": ent.start_char,
                    "end": ent.end_char
                })
                entity_types[ent.label_] += 1
            
            return {
                "available": True,
                "method": "spacy",
                "entities": entities,
                "entity_types": dict(entity_types),
                "entity_count": len(entities),
                "has_brands": "ORG" in entity_types or "PRODUCT" in entity_types,
                "has_locations": "GPE" in entity_types or "LOC" in entity_types,
                "has_people": "PERSON" in entity_types
            }
        except Exception as e:
            return {"available": False, "error": str(e), "entities": []}


class ContentDepthAnalyzer:
    """Analyze content depth for Rally.fun quality checks"""
    
    EVIDENCE_PATTERNS = [
        r'\d+%', r'\$[\d,]+', r'\d+\s*(?:million|billion|thousand)',
        r'according to', r'study shows', r'research found',
        r'expert[s]?\s+says?', r'report[s]?\s+from',
        r'data\s+(?:shows?|indicates?|reveals?)', r'survey', r'statistics'
    ]
    
    REASONING_INDICATORS = [
        'because', 'since', 'therefore', 'as a result', 'consequently',
        'this means', 'which leads to', 'the reason', 'why this matters',
        'this explains', 'hence', 'thus', 'due to', 'caused by'
    ]
    
    CONTRAST_INDICATORS = [
        'however', 'but', 'although', 'on the other hand', 'conversely',
        'despite', 'unlike', 'while', 'whereas', 'yet', 'nevertheless'
    ]
    
    @staticmethod
    def analyze(text: str, required_elements: List[str] = None) -> Dict[str, Any]:
        """Analyze content depth"""
        text_lower = text.lower()
        
        evidence_found = []
        for pattern in ContentDepthAnalyzer.EVIDENCE_PATTERNS:
            matches = re.findall(pattern, text_lower)
            if matches:
                evidence_found.extend(matches[:3])
        
        reasoning_found = [r for r in ContentDepthAnalyzer.REASONING_INDICATORS if r in text_lower]
        contrast_found = [c for c in ContentDepthAnalyzer.CONTRAST_INDICATORS if c in text_lower]
        
        evidence_score = min(len(evidence_found) * 10, 40)
        reasoning_score = min(len(reasoning_found) * 8, 30)
        contrast_score = min(len(contrast_found) * 7, 20)
        length_score = min(len(text.split()) / 10, 10)
        
        total_score = evidence_score + reasoning_score + contrast_score + length_score
        
        depth_level = "deep" if total_score >= 70 else "moderate" if total_score >= 40 else "shallow"
        
        missing_elements = []
        if required_elements:
            for elem in required_elements:
                if elem.lower() not in text_lower:
                    missing_elements.append(elem)
        
        return {
            "overall_depth_score": round(total_score, 2),
            "depth_level": depth_level,
            "evidence_count": len(evidence_found),
            "evidence_found": evidence_found[:10],
            "reasoning_count": len(reasoning_found),
            "reasoning_indicators": reasoning_found,
            "contrast_count": len(contrast_found),
            "contrast_indicators": contrast_found,
            "word_count": len(text.split()),
            "required_elements_missing": missing_elements,
            "has_sufficient_depth": total_score >= 40
        }


class AntiTemplateDetector:
    """Detect template-like content"""
    
    TEMPLATE_PHRASES = [
        "in conclusion", "to sum up", "in summary", "as we can see",
        "it is important to note", "it's worth mentioning", "needless to say",
        "at the end of the day", "when all is said and done", "in today's world",
        "in this day and age", "believe it or not", "long story short",
        "without further ado", "let's dive in", "here's the thing"
    ]
    
    GENERIC_OPENINGS = [
        "are you looking for", "do you want to", "have you ever wondered",
        "if you're looking for", "here's how to", "this is why",
        "the truth about", "everything you need to know", "secrets of"
    ]
    
    @staticmethod
    def analyze(text: str, template_patterns: List[str] = None, threshold: float = 0.85) -> Dict[str, Any]:
        """Check if content is too template-like"""
        text_lower = text.lower()
        
        template_phrases_found = [p for p in AntiTemplateDetector.TEMPLATE_PHRASES if p in text_lower]
        generic_openings_found = [p for p in AntiTemplateDetector.GENERIC_OPENINGS if p in text_lower]
        
        custom_patterns_found = []
        if template_patterns:
            custom_patterns_found = [p for p in template_patterns if p.lower() in text_lower]
        
        phrase_score = len(template_phrases_found) * 10
        opening_score = len(generic_openings_found) * 15
        custom_score = len(custom_patterns_found) * 12
        
        total_template_score = phrase_score + opening_score + custom_score
        normalized_score = min(total_template_score / 50, 1.0)
        
        is_template_like = normalized_score >= (1 - threshold)
        
        return {
            "template_score": round(normalized_score, 3),
            "is_template_like": is_template_like,
            "threshold": threshold,
            "template_phrases_found": template_phrases_found,
            "generic_openings_found": generic_openings_found,
            "custom_patterns_found": custom_patterns_found
        }


# ============================================
# NEW FEATURES (v9.8.1 additions)
# ============================================

class GrammarChecker:
    """AI-powered grammar checking"""
    
    @staticmethod
    def check(text: str) -> Dict[str, Any]:
        """Check grammar using AI-powered tools"""
        result = {
            "issue_count": 0,
            "issues": [],
            "grammar_score": 100,
            "corrected_text": text,
            "ai_correction": None,
            "method": None
        }
        
        # Method 1: HappyTransformer T5 AI Grammar Correction
        if HAS_HAPPY_TRANSFORMER and happy_grammar_model:
            try:
                from happytransformer import TTSettings
                args = TTSettings(num_beams=5, min_length=1)
                
                ai_corrected = happy_grammar_model.generate_text(f"grammar: {text}", args=args)
                ai_corrected_text = ai_corrected.text if hasattr(ai_corrected, 'text') else str(ai_corrected)
                
                result["ai_correction"] = ai_corrected_text
                result["method"] = "HappyTransformer T5 AI"
                
                original_words = text.split()
                corrected_words = ai_corrected_text.split()
                
                changes = []
                for i, (orig, corr) in enumerate(zip(original_words, corrected_words)):
                    if orig != corr:
                        changes.append({
                            "position": i,
                            "original": orig,
                            "correction": corr,
                            "type": "ai_correction"
                        })
                
                result["issues"] = changes
                result["issue_count"] = len(changes)
                result["corrected_text"] = ai_corrected_text
                
                if len(original_words) > 0:
                    error_ratio = len(changes) / len(original_words)
                    result["grammar_score"] = max(0, int(100 * (1 - error_ratio * 2)))
                
                logger.info(f"✅ T5 AI Grammar: {len(changes)} changes")
                
            except Exception as e:
                logger.warning(f"HappyTransformer error: {e}")
        
        # Method 2: LanguageTool (supplement)
        if HAS_GRAMMAR_TOOL and grammar_tool:
            try:
                matches = grammar_tool.check(text)
                lt_issues = []
                
                for match in matches:
                    lt_issues.append({
                        "message": match.message,
                        "rule_id": match.ruleId,
                        "suggestions": match.replacements[:5] if match.replacements else [],
                        "severity": "major" if "SPELL" in match.ruleId else "minor",
                        "type": "languagetool"
                    })
                
                result["issues"].extend(lt_issues)
                result["issue_count"] = len(result["issues"])
                result["method"] = "T5 AI + LanguageTool"
                result["grammar_score"] = max(0, result["grammar_score"] - len(lt_issues) * 3)
                
            except Exception as e:
                logger.warning(f"LanguageTool error: {e}")
        
        if not HAS_HAPPY_TRANSFORMER and not HAS_GRAMMAR_TOOL:
            return {
                "issue_count": 0,
                "issues": [],
                "grammar_score": None,
                "corrected_text": text,
                "error": "No AI grammar tools available",
                "method": "none"
            }
        
        return result


class PerplexityBurstinessAnalyzer:
    """Analyze perplexity and burstiness for AI detection"""
    
    @staticmethod
    def analyze(text: str) -> Dict[str, Any]:
        """Analyze perplexity and burstiness"""
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(words) < 10:
            return {"perplexity": 0, "burstiness": 0, "ai_likelihood": "unknown"}
        
        # Calculate perplexity
        word_freq = Counter(words)
        total_words = len(words)
        
        perplexity = 0
        for word, count in word_freq.items():
            prob = count / total_words
            if prob > 0:
                perplexity -= prob * math.log2(prob)
        perplexity = 2 ** perplexity
        normalized_perplexity = min(100, (perplexity / 50) * 100)
        
        # Calculate burstiness
        sentence_lengths = [len(s.split()) for s in sentences]
        if len(sentence_lengths) > 1:
            mean_length = sum(sentence_lengths) / len(sentence_lengths)
            variance = sum((l - mean_length) ** 2 for l in sentence_lengths) / len(sentence_lengths)
            std_dev = math.sqrt(variance)
            burstiness = (std_dev / mean_length) * 100 if mean_length > 0 else 0
        else:
            burstiness = 0
        
        # AI likelihood
        ai_score = 0
        if normalized_perplexity < 30:
            ai_score += 30
        elif normalized_perplexity < 50:
            ai_score += 15
        elif normalized_perplexity > 70:
            ai_score -= 15
        
        if burstiness < 30:
            ai_score += 30
        elif burstiness < 50:
            ai_score += 15
        elif burstiness > 70:
            ai_score -= 15
        
        ai_score = max(0, min(100, ai_score + 30))
        
        return {
            "perplexity": round(normalized_perplexity, 2),
            "burstiness": round(burstiness, 2),
            "ai_likelihood": "high" if ai_score > 70 else "medium" if ai_score > 40 else "low",
            "ai_score": round(ai_score, 2),
            "unique_word_ratio": round(len(word_freq) / total_words, 3),
            "avg_sentence_length": round(sum(sentence_lengths) / len(sentence_lengths), 2) if sentence_lengths else 0
        }


class CoherenceAnalyzer:
    """Analyze text coherence"""
    
    TRANSITION_WORDS = {
        'addition': ['additionally', 'also', 'furthermore', 'moreover', 'besides'],
        'contrast': ['however', 'but', 'nevertheless', 'conversely', 'yet'],
        'cause_effect': ['therefore', 'thus', 'consequently', 'hence', 'so'],
        'example': ['for example', 'for instance', 'specifically'],
        'sequence': ['first', 'second', 'next', 'then', 'finally'],
        'conclusion': ['in conclusion', 'to summarize', 'overall', 'ultimately']
    }
    
    @staticmethod
    def analyze(text: str) -> Dict[str, Any]:
        """Analyze text coherence"""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) < 2:
            return {"coherence_score": 100, "transition_score": 100}
        
        text_lower = text.lower()
        transition_count = 0
        transition_categories = []
        
        for category, words in CoherenceAnalyzer.TRANSITION_WORDS.items():
            for word in words:
                if word in text_lower:
                    transition_count += text_lower.count(word)
                    transition_categories.append(category)
        
        expected_transitions = len(sentences) - 1
        transition_score = min(100, (transition_count / max(expected_transitions, 1)) * 100)
        
        pronouns = ['it', 'this', 'that', 'these', 'those', 'he', 'she', 'they']
        pronoun_count = sum(text_lower.count(p) for p in pronouns)
        
        coherence_score = transition_score * 0.3 + min(100, pronoun_count * 20) * 0.2 + 50 * 0.5
        
        return {
            "coherence_score": round(coherence_score, 2),
            "transition_score": round(transition_score, 2),
            "transition_count": transition_count,
            "transition_categories": list(set(transition_categories)),
            "pronoun_cohesion_count": pronoun_count,
            "sentence_count": len(sentences)
        }


class EngagementPredictor:
    """Predict engagement potential"""
    
    POWER_WORDS = ['free', 'new', 'proven', 'guaranteed', 'amazing', 'secret', 'discover',
                   'exclusive', 'limited', 'breakthrough', 'revolutionary', 'instant', 'you']
    EMOTIONAL_WORDS = ['love', 'hate', 'fear', 'hope', 'dream', 'passion', 'exciting']
    
    @staticmethod
    def predict(text: str) -> Dict[str, Any]:
        """Predict engagement potential"""
        text_lower = text.lower()
        words = text.split()
        
        hooks = {
            'questions': text.count('?'),
            'exclamations': text.count('!'),
            'numbers': len(re.findall(r'\b\d+\b', text)),
            'quotes': len(re.findall(r'"[^"]+"|\'[^\']+\'', text)),
            'power_words': sum(text_lower.count(w) for w in EngagementPredictor.POWER_WORDS),
            'emotional_words': sum(text_lower.count(w) for w in EngagementPredictor.EMOTIONAL_WORDS)
        }
        
        total_hooks = sum(hooks.values())
        hook_density = total_hooks / max(len(words), 1) * 100
        
        engagement_score = min(100, hook_density * 5) * 0.3 + min(100, hooks['questions'] * 25) * 0.2 + \
                          min(100, hooks['power_words'] * 10) * 0.2 + min(100, hooks['emotional_words'] * 15) * 0.2 + 50 * 0.1
        
        return {
            "engagement_score": round(engagement_score, 2),
            "engagement_level": "high" if engagement_score > 75 else "medium" if engagement_score > 50 else "low",
            "hooks": hooks,
            "hook_density": round(hook_density, 3),
            "optimal_length": 300 <= len(words) <= 1500
        }


class PersuasionAnalyzer:
    """Analyze persuasion techniques"""
    
    TECHNIQUES = {
        "social_proof": ['everyone', 'thousands', 'millions', 'popular', 'trending', 'most'],
        "urgency": ['now', 'today', 'limited', 'deadline', 'hurry', 'last chance'],
        "authority": ['expert', 'study', 'research', 'doctor', 'scientist', 'proven'],
        "scarcity": ['only', 'limited', 'rare', 'exclusive', 'few', 'last'],
        "reciprocity": ['free', 'gift', 'bonus', 'complimentary', 'value'],
        "commitment": ['join', 'subscribe', 'sign up', 'get started', 'become']
    }
    
    @staticmethod
    def analyze(text: str) -> Dict[str, Any]:
        """Analyze persuasion techniques"""
        text_lower = text.lower()
        
        technique_counts = {}
        for technique, keywords in PersuasionAnalyzer.TECHNIQUES.items():
            count = sum(text_lower.count(kw) for kw in keywords)
            if count > 0:
                technique_counts[technique] = count
        
        total_techniques = len(technique_counts)
        total_keywords = sum(technique_counts.values())
        
        persuasion_score = (total_techniques / 6) * 60 + min(40, total_keywords * 4)
        
        return {
            "persuasion_score": round(persuasion_score, 2),
            "techniques_used": total_techniques,
            "total_persuasion_elements": total_keywords,
            "technique_details": technique_counts,
            "persuasion_level": "high" if persuasion_score > 60 else "medium" if persuasion_score > 30 else "low"
        }


class TopicRelevanceAnalyzer:
    """Analyze topic relevance"""
    
    @staticmethod
    def analyze(text: str, topic: str) -> Dict[str, Any]:
        """Analyze how relevant text is to topic"""
        if not topic:
            return {"error": "No topic provided"}
        
        text_lower = text.lower()
        topic_lower = topic.lower()
        topic_words = set(topic_lower.split())
        
        direct_mentions = text_lower.count(topic_lower)
        
        keyword_matches = {}
        for word in topic_words:
            if len(word) > 2:
                keyword_matches[word] = text_lower.count(word)
        
        # Semantic similarity
        semantic_score = 0
        if HAS_SENTENCE_TRANSFORMERS and semantic_model:
            try:
                embeddings = semantic_model.encode([text, topic])
                semantic_score = float(torch.nn.functional.cosine_similarity(
                    embeddings[0].unsqueeze(0),
                    embeddings[1].unsqueeze(0)
                )[0]) * 100
            except:
                pass
        
        relevance_score = min(50, direct_mentions * 10) + min(30, sum(keyword_matches.values()) * 5) + semantic_score * 0.4
        relevance_score = min(100, relevance_score)
        
        return {
            "relevance_score": round(relevance_score, 2),
            "relevance_level": "high" if relevance_score > 70 else "moderate" if relevance_score > 40 else "low",
            "direct_topic_mentions": direct_mentions,
            "keyword_matches": keyword_matches,
            "semantic_similarity": round(semantic_score, 2) if semantic_score > 0 else None,
            "topic": topic
        }


class ToneConsistencyAnalyzer:
    """Analyze tone consistency"""
    
    FORMAL_INDICATORS = ['therefore', 'consequently', 'furthermore', 'moreover', 'thus', 'hereby']
    INFORMAL_INDICATORS = ['gonna', 'wanna', 'kinda', 'yeah', 'nah', 'cool', 'awesome']
    EMOTIONAL_INDICATORS = ['!', 'amazing', 'terrible', 'love', 'hate', 'shocking']
    
    @staticmethod
    def analyze(text: str) -> Dict[str, Any]:
        """Analyze tone consistency"""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) < 3:
            return {"consistency_score": 100, "dominant_tone": "neutral"}
        
        sentence_tones = []
        for sentence in sentences:
            sent_lower = sentence.lower()
            
            formal_count = sum(1 for w in ToneConsistencyAnalyzer.FORMAL_INDICATORS if w in sent_lower)
            informal_count = sum(1 for w in ToneConsistencyAnalyzer.INFORMAL_INDICATORS if w in sent_lower)
            emotional_count = sum(1 for w in ToneConsistencyAnalyzer.EMOTIONAL_INDICATORS if w in sent_lower)
            
            if formal_count > informal_count and formal_count > emotional_count:
                tone = "formal"
            elif informal_count > formal_count and informal_count > emotional_count:
                tone = "informal"
            elif emotional_count > formal_count and emotional_count > informal_count:
                tone = "emotional"
            else:
                tone = "neutral"
            
            sentence_tones.append(tone)
        
        tone_counts = Counter(sentence_tones)
        dominant_tone = tone_counts.most_common(1)[0][0]
        dominant_count = tone_counts.most_common(1)[0][1]
        
        consistency_score = (dominant_count / len(sentences)) * 100
        
        return {
            "consistency_score": round(consistency_score, 2),
            "dominant_tone": dominant_tone,
            "tone_distribution": dict(tone_counts),
            "sentences_analyzed": len(sentences)
        }


# ============================================
# API Endpoints
# ============================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Rally.fun NLP Service",
        "version": "9.8.0-enhanced",
        "mode": "ALL AI-POWERED",
        "features": {
            "sentiment": True,
            "readability": HAS_TEXTSTAT,
            "ner": HAS_SPACY,
            "semantic_similarity": HAS_SENTENCE_TRANSFORMERS,
            "grammar_ai": HAS_HAPPY_TRANSFORMER,
            "grammar_languagetool": HAS_GRAMMAR_TOOL,
            "ai_detection": HAS_TRANSFORMERS
        },
        "endpoints": ["/health", "/api/content/analyze", "/api/similarity/check", 
                     "/api/grammar/check", "/api/uniqueness/analyze"]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "9.8.0-enhanced",
        "mode": "ALL AI-POWERED",
        "libraries": {
            "textblob": HAS_TEXTBLOB,
            "vader": HAS_VADER,
            "textstat": HAS_TEXTSTAT,
            "spacy": HAS_SPACY,
            "sentence_transformers": HAS_SENTENCE_TRANSFORMERS,
            "happy_transformer_ai_grammar": HAS_HAPPY_TRANSFORMER,
            "grammar_tool": HAS_GRAMMAR_TOOL,
            "transformers": HAS_TRANSFORMERS
        }
    }


@app.post("/api/content/analyze")
async def analyze_content(request: ContentAnalyzeRequest):
    """Comprehensive content analysis with all features"""
    try:
        # Core analyses
        sentiment = SentimentAnalyzer.combined_analysis(request.content)
        readability = ReadabilityAnalyzer.combined_analysis(request.content)
        emotions = EmotionDetector.detect(request.content, detailed=True)
        ner = NERExtractor.extract(request.content)
        depth = ContentDepthAnalyzer.analyze(request.content)
        
        # NEW: v9.8.1 features
        grammar = GrammarChecker.check(request.content)
        perplexity = PerplexityBurstinessAnalyzer.analyze(request.content)
        coherence = CoherenceAnalyzer.analyze(request.content)
        engagement = EngagementPredictor.predict(request.content)
        persuasion = PersuasionAnalyzer.analyze(request.content)
        tone = ToneConsistencyAnalyzer.analyze(request.content)
        
        # Topic relevance if provided
        topic_relevance = None
        if request.topic:
            topic_relevance = TopicRelevanceAnalyzer.analyze(request.content, request.topic)
        
        # Similarity check if competitors provided
        similarity = None
        if request.competitor_contents:
            similarity = SemanticSimilarity.combined_analysis(
                request.content, 
                request.competitor_contents
            )
        
        # Calculate overall quality
        quality_score = (
            sentiment.get("consensus_score", 0) * 20 +
            grammar.get("grammar_score", 70) * 0.15 +
            coherence.get("coherence_score", 50) * 0.15 +
            engagement.get("engagement_score", 50) * 0.15 +
            persuasion.get("persuasion_score", 50) * 0.1 +
            depth.get("overall_depth_score", 50) * 0.15 +
            50  # base
        )
        quality_score = min(100, max(0, quality_score))
        
        return {
            "success": True,
            "sentiment": sentiment,
            "readability": readability,
            "emotions": emotions,
            "ner": ner,
            "depth_analysis": depth,
            "similarity": similarity,
            "grammar": grammar,
            "perplexity_burstiness": perplexity,
            "coherence": coherence,
            "engagement": engagement,
            "persuasion": persuasion,
            "tone_consistency": tone,
            "topic_relevance": topic_relevance,
            "overall_quality": {
                "score": round(quality_score, 2),
                "level": "excellent" if quality_score >= 80 else "good" if quality_score >= 65 else "average" if quality_score >= 50 else "below average"
            },
            "content_length": len(request.content),
            "word_count": len(request.content.split())
        }
    except Exception as e:
        logger.error(f"Content analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/similarity/check")
async def check_similarity(request: SimilarityCheckRequest):
    """Check semantic similarity"""
    result = SemanticSimilarity.combined_analysis(
        request.new_content,
        request.competitor_contents,
        request.threshold
    )
    return result


@app.post("/api/compare")
async def compare_texts(request: CompareTextsRequest):
    """Compare two texts"""
    return SemanticSimilarity.compare_texts(request.text1, request.text2)


@app.post("/api/grammar/check")
async def check_grammar(request: GrammarCheckRequest):
    """AI-powered grammar check"""
    return GrammarChecker.check(request.content)


@app.post("/api/emotion/detect")
async def detect_emotions(request: EmotionDetectRequest):
    """Detect emotions"""
    return EmotionDetector.detect(request.content, request.detailed)


@app.post("/api/uniqueness/analyze")
async def analyze_uniqueness(request: UniquenessAnalyzeRequest):
    """Combined uniqueness analysis"""
    similarity = SemanticSimilarity.combined_analysis(
        request.content,
        request.competitor_contents
    )
    emotions = EmotionDetector.detect(request.content, detailed=True)
    depth = ContentDepthAnalyzer.analyze(request.content)
    anti_template = AntiTemplateDetector.analyze(request.content)
    
    # Calculate uniqueness score
    base_score = 100
    if similarity["primary"].get("max_similarity"):
        base_score -= similarity["primary"]["max_similarity"] * 40
    base_score += min(emotions["emotion_variety"] * 5, 20)
    if emotions["rare_combo_detected"]:
        base_score += emotions["rare_combo"]["score_boost"]
    if anti_template["is_template_like"]:
        base_score -= 15
    base_score += min(depth["overall_depth_score"] * 0.2, 20)
    
    final_score = max(0, min(100, round(base_score)))
    
    return {
        "success": True,
        "uniqueness_score": final_score,
        "is_unique": final_score >= 60,
        "similarity": similarity,
        "emotions": emotions,
        "depth": depth,
        "anti_template": anti_template,
        "grade": "A" if final_score >= 80 else "B" if final_score >= 60 else "C" if final_score >= 40 else "D"
    }


@app.post("/api/depth/analyze")
async def analyze_depth(request: DepthAnalyzeRequest):
    """Analyze content depth"""
    return ContentDepthAnalyzer.analyze(request.content, request.required_elements)


@app.post("/api/antitemplate/check")
async def check_antitemplate(request: AntiTemplateCheckRequest):
    """Check template-like content"""
    return AntiTemplateDetector.analyze(
        request.content,
        request.template_patterns,
        request.threshold
    )


@app.post("/api/ner/extract")
async def extract_entities(content: str):
    """Extract named entities"""
    return NERExtractor.extract(content)


@app.post("/api/sentiment/analyze")
async def analyze_sentiment(content: str):
    """Analyze sentiment"""
    return SentimentAnalyzer.combined_analysis(content)


@app.post("/api/readability/analyze")
async def analyze_readability(content: str):
    """Analyze readability"""
    return ReadabilityAnalyzer.combined_analysis(content)


# ============================================
# Main Entry
# ============================================

if __name__ == "__main__":
    print("=" * 60)
    print("Rally.fun NLP Service v9.8.0-ENHANCED")
    print("=" * 60)
    print(f"TextBlob: {'✓' if HAS_TEXTBLOB else '✗'}")
    print(f"VADER: {'✓' if HAS_VADER else '✗'}")
    print(f"textstat: {'✓' if HAS_TEXTSTAT else '✗'}")
    print(f"spaCy: {'✓' if HAS_SPACY else '✗'}")
    print(f"SentenceTransformers: {'✓' if HAS_SENTENCE_TRANSFORMERS else '✗'}")
    print(f"HappyTransformer AI Grammar: {'✓' if HAS_HAPPY_TRANSFORMER else '✗'}")
    print(f"LanguageTool: {'✓' if HAS_GRAMMAR_TOOL else '✗'}")
    print(f"Transformers: {'✓' if HAS_TRANSFORMERS else '✗'}")
    print("=" * 60)
    print("Starting server on http://localhost:5000")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=5000)
