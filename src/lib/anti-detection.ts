const BANNED_WORDS = [
  'revolutionary', 'cutting-edge', 'groundbreaking', 'innovative', 'game-changing',
  'transformative', 'unparalleled', 'exceptional', 'remarkable', 'extraordinary',
  'state-of-the-art', 'next-generation', 'industry-leading', 'comprehensive',
  'leverage', 'utilize', 'optimize', 'streamline', 'empower', 'enhance',
  'facilitate', 'seamless', 'robust', 'dynamic', 'strategic', 'impactful',
  'holistic', 'synergistic', 'paradigm-shift', 'all-in-one'
];

const BANNED_PHRASES = [
  "In today's fast-paced world", "Look no further", "The future of X is here",
  'Unlock your potential', "Don't miss out", 'Join the revolution',
  'Ready to transform', 'Discover the power of', 'Your journey starts here',
  'Stay ahead of the curve', 'Elevate your experience', "Redefine what's possible",
  'Built for the modern era', 'Where innovation meets', 'The ultimate solution for',
  'Transform the way you', 'Experience the difference', 'Designed with you in mind',
  'One platform to rule them all', 'Empowering creators everywhere', 'The next evolution in'
];

const AUTO_REPLACEMENTS: Record<string, string> = {
  'leverage': 'use', 'utilize': 'use', 'innovative': 'fresh', 'streamline': 'simplify',
  'optimize': 'improve', 'empower': 'help', 'enhance': 'boost', 'facilitate': 'enable',
  'seamless': 'smooth', 'robust': 'solid', 'dynamic': 'active', 'strategic': 'smart',
  'impactful': 'effective', 'holistic': 'complete', 'synergistic': 'combined',
  'comprehensive': 'full', 'unparalleled': 'unique', 'exceptional': 'great',
  'remarkable': 'impressive', 'extraordinary': 'special', 'transformative': 'powerful',
  'cutting-edge': 'latest', 'groundbreaking': 'new', 'game-changing': 'big',
  'revolutionary': 'brand new', 'state-of-the-art': 'modern', 'next-generation': 'next',
  'industry-leading': 'top', 'paradigm-shift': 'change', 'all-in-one': 'complete',
  'delve': 'explore', 'furthermore': 'also', 'moreover': 'plus', 'henceforth': 'so',
  'whilst': 'while', 'amongst': 'among', 'whom': 'who', 'thereby': 'by doing this',
  'in order to': 'to', 'prior to': 'before', 'subsequent to': 'after',
  'in the event that': 'if', 'it is important to note': '', 'it goes without saying': ''
};

export interface AntiDetectionResult {
  clean: string;
  warnings: string[];
  replacements: number;
}

export function checkContent(text: string): { warnings: string[] } {
  const warnings: string[] = [];
  const lower = text.toLowerCase();

  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      warnings.push(`Banned word found: "${word}"`);
    }
  }
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      warnings.push(`Banned phrase found: "${phrase}"`);
    }
  }
  return { warnings };
}

export function cleanContent(text: string): AntiDetectionResult {
  let cleaned = text;
  let replacements = 0;
  const warnings: string[] = [];
  const lower = cleaned.toLowerCase();

  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      warnings.push(`Banned word: "${word}"`);
    }
  }

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      warnings.push(`Banned phrase: "${phrase}"`);
    }
  }

  for (const [from, to] of Object.entries(AUTO_REPLACEMENTS)) {
    const regex = new RegExp(from, 'gi');
    const matches = cleaned.match(regex);
    if (matches && matches.length > 0) {
      cleaned = cleaned.replace(regex, to);
      replacements += matches.length;
    }
  }

  return { clean: cleaned, warnings, replacements };
}
