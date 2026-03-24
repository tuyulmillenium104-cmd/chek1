# Rally.fun Hybrid NLP Service v9.8.0-ENHANCED

**Full AI-Powered NLP Service for Content Quality Analysis**

## Features

### Core Features (v9.8.0)
| # | Feature | Library | Type |
|---|---------|---------|------|
| 1 | Sentiment Analysis | VADER + TextBlob | AI |
| 2 | Readability Metrics | textstat | Algorithm |
| 3 | Named Entity Recognition | spaCy | AI (Deep Learning) |
| 4 | Semantic Similarity | sentence-transformers | AI (BERT) |
| 5 | Emotion Detection | Custom + Rare Combos | AI |
| 6 | Content Depth Analysis | Custom | Algorithm |
| 7 | Anti-Template Detection | Custom | Algorithm |

### Enhanced Features (v9.8.1+)
| # | Feature | Library | Type |
|---|---------|---------|------|
| 8 | Grammar Checking | **HappyTransformer T5** | **AI (Neural)** |
| 9 | Perplexity & Burstiness | Custom | Algorithm |
| 10 | Coherence Analysis | Custom | Algorithm |
| 11 | Engagement Prediction | Custom | Algorithm |
| 12 | Persuasion Analysis | Custom | Algorithm |
| 13 | Topic Relevance | sentence-transformers | AI (BERT) |
| 14 | Tone Consistency | Custom | Algorithm |
| 15 | Overall Quality Score | Combined | All above |

## Installation

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

## Usage

```bash
# Start the service
python nlp_service.py

# Or with environment variable to skip LanguageTool
SKIP_GRAMMAR_TOOL=1 python nlp_service.py
```

## API Endpoints

### GET /health
Health check with library status

### POST /api/content/analyze
Full content analysis with all 15 features

```json
{
  "content": "Your text here",
  "competitor_contents": ["competitor 1", "competitor 2"],
  "topic": "optional topic for relevance"
}
```

### POST /api/grammar/check
AI-powered grammar check with T5

```json
{
  "content": "Your text here"
}
```

### POST /api/compare
Compare two texts for similarity

```json
{
  "text1": "First text",
  "text2": "Second text"
}
```

### POST /api/uniqueness/analyze
Combined uniqueness analysis

## AI Grammar Correction

Uses **HappyTransformer T5** model (`vennify/t5-base-grammar-correction`) for:
- Full sentence correction
- Word choice improvements
- Punctuation fixes
- Grammar corrections

Example:
```json
Input:  "Code Runs, Disputes Dont. Enter Internet Court."
Output: "Code runs, Disputes don't. Enter Internet Court."
```

## Version History

| Version | Changes |
|---------|---------|
| 9.8.0 | Initial hybrid JS+Python release |
| 9.8.0-enhanced | Added HappyTransformer T5 AI Grammar + 8 new features |

## Requirements

- Python 3.9+
- 4GB RAM minimum (8GB recommended for T5 model)
- Internet connection (first run downloads models)
