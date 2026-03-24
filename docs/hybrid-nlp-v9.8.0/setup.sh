#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# Rally.fun Hybrid System Setup Script
# Version 9.8.0 - JavaScript + Python NLP
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "       RALLY.FUN HYBRID SYSTEM - SETUP SCRIPT"
echo "       Version 9.8.0 - JavaScript + Python NLP"
echo "═══════════════════════════════════════════════════════════════════════════"

# Check Python
echo ""
echo "🐍 Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "   ✅ Found: $PYTHON_VERSION"
else
    echo "   ❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Check Node.js
echo ""
echo "📦 Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Found: $NODE_VERSION"
else
    echo "   ❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Create virtual environment
echo ""
echo "🔧 Setting up Python virtual environment..."
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "   ✅ Virtual environment created"
else
    echo "   ℹ️  Virtual environment already exists"
fi

# Activate virtual environment
echo ""
echo "🔄 Activating virtual environment..."
source venv/bin/activate
echo "   ✅ Virtual environment activated"

# Install Python dependencies
echo ""
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "   ✅ Python dependencies installed"
else
    echo "   ❌ Failed to install Python dependencies"
    exit 1
fi

# Download spaCy model
echo ""
echo "📥 Downloading spaCy English model..."
python -m spacy download en_core_web_sm

if [ $? -eq 0 ]; then
    echo "   ✅ spaCy model downloaded"
else
    echo "   ⚠️  spaCy model download failed - NER will be disabled"
fi

# Download NLTK data
echo ""
echo "📥 Downloading NLTK data..."
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"
echo "   ✅ NLTK data downloaded"

# Check Node.js dependencies
echo ""
echo "📦 Checking Node.js dependencies..."
cd ..
if [ -f "../../node_modules/z-ai-web-dev-sdk" ]; then
    echo "   ✅ z-ai-web-dev-sdk found"
else
    echo "   ℹ️  Installing z-ai-web-dev-sdk..."
    npm install z-ai-web-dev-sdk
fi

# Test Python NLP Service
echo ""
echo "🧪 Testing Python NLP Service..."
python -c "
from nlp_service import app
print('   ✅ Python NLP Service imports OK')
"

if [ $? -eq 0 ]; then
    echo "   ✅ Python NLP Service ready"
else
    echo "   ❌ Python NLP Service has issues"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "                    ✅ SETUP COMPLETE!"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "   1. Start Python NLP Service:"
echo "      cd scripts/hybrid-nlp"
echo "      source venv/bin/activate"
echo "      python nlp_service.py"
echo ""
echo "   2. In another terminal, run the workflow:"
echo "      node scripts/hybrid-nlp/rally-workflow-v9.8.0-hybrid.js [campaign]"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
