import {
  TECH_KEYWORDS,
  ARCH_KEYWORDS,
  DB_KEYWORDS,
  CI_CD_KEYWORDS,
  TESTING_KEYWORDS,
  SENIORITY_KEYWORDS,
  ROLE_KEYWORDS,
  LANGUAGE_KEYWORDS
} from '@/lib/analyze/keywords';

function extractKeywordsFromCategory(text: string, categoryKeywords: Record<string, string>): string[] {
  if (!text) return [];

  const normalizedText = text.toLowerCase();
  const results = new Set<string>();

  for (const rawKey of Object.keys(categoryKeywords)) {
    const pattern = String(rawKey);
    const patternName = categoryKeywords[rawKey];

    const escaped = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');

    if (regex.test(normalizedText)) {
      results.add(patternName);
    }
  }

  return Array.from(results);
}

function extractSeniority(text: string): string[] {
  return extractKeywordsFromCategory(text, SENIORITY_KEYWORDS);
}

function extractRoles(text: string): string[] {
  return extractKeywordsFromCategory(text, ROLE_KEYWORDS);
}

function extractLanguages(text: string): string[] {
  return extractKeywordsFromCategory(text, LANGUAGE_KEYWORDS);
}

function extractTechnologies(text: string): string[] {
  const results = new Set<string>();

  for (const categoryKey of Object.keys(TECH_KEYWORDS) as Array<keyof typeof TECH_KEYWORDS>) {
    const keywords = TECH_KEYWORDS[categoryKey];
    for (const tech of extractKeywordsFromCategory(text, keywords)) {
      results.add(tech);
    }
  }

  return Array.from(results);
}

function extractArchitectures(text: string): string[] {
  return extractKeywordsFromCategory(text, ARCH_KEYWORDS);
}

function extractDatabases(text: string): string[] {
  return extractKeywordsFromCategory(text, DB_KEYWORDS);
}

function extractCiCdTools(text: string): string[] {
  return extractKeywordsFromCategory(text, CI_CD_KEYWORDS);
}

function extractTestingTools(text: string): string[] {
  return extractKeywordsFromCategory(text, TESTING_KEYWORDS);
}

export {
  extractKeywordsFromCategory,
  extractSeniority,
  extractRoles,
  extractLanguages,
  extractTechnologies,
  extractArchitectures,
  extractDatabases,
  extractCiCdTools,
  extractTestingTools
};