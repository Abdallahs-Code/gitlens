import {
  extractTechnologies,
  extractArchitectures,
  extractDatabases,
  extractCiCdTools,
  extractTestingTools,
  extractSeniority,
  extractRoles,
  extractLanguages
} from '@/lib/extractors';
import { NextRequest, NextResponse } from 'next/server';

const SENIORITY_PRIORITY = [
  'Principal',
  'Staff',
  'Lead',
  'Senior',
  'Mid',
  'Junior',
] as const;

function sortMap(map: Map<string, number>) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export function analyzeJobDescription(text: string) {
  const languages = new Map<string, number>();
  const tech = new Map<string, number>();
  const architecture = new Map<string, number>();
  const databases = new Map<string, number>();
  const ci_cd = new Map<string, number>();
  const testing = new Map<string, number>();

  for (const t of extractTechnologies(text)) tech.set(t, (tech.get(t) || 0) + 1);
  for (const a of extractArchitectures(text)) architecture.set(a, (architecture.get(a) || 0) + 1);
  for (const db of extractDatabases(text)) databases.set(db, (databases.get(db) || 0) + 1);
  for (const ci of extractCiCdTools(text)) ci_cd.set(ci, (ci_cd.get(ci) || 0) + 1);
  for (const t of extractTestingTools(text)) testing.set(t, (testing.get(t) || 0) + 1);
  for (const lang of extractLanguages(text)) languages.set(lang, (languages.get(lang) || 0) + 1);

  const detectedSeniority = extractSeniority(text);
  let finalSeniority = 'Unknown';
  for (const level of SENIORITY_PRIORITY) {
    if (detectedSeniority.includes(level)) {
      finalSeniority = level;
      break;
    }
  }

  const roles = extractRoles(text);

  return {
    seniority: finalSeniority,
    roles,
    languages: sortMap(languages),
    tech: sortMap(tech),
    architecture: sortMap(architecture),
    databases: sortMap(databases),
    ci_cd: sortMap(ci_cd),
    testing: sortMap(testing),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "text" in request body' }, { status: 400 });
    }

    const result = analyzeJobDescription(body.text);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    console.error('Error analyzing job description:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}