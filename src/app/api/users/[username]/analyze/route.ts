import { TECH_KEYWORDS, ARCH_KEYWORDS, DB_KEYWORDS, CI_CD_KEYWORDS, TESTING_KEYWORDS } from '@/lib/keywords';
import { githubFetch } from '@/lib/api';

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

function isRelevantFile(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.endsWith('package.json') ||
    lower.endsWith('requirements.txt') ||
    lower.endsWith('pyproject.toml') ||
    lower.endsWith('pipfile') ||
    lower.endsWith('pom.xml') ||
    lower.endsWith('build.gradle') ||
    lower.endsWith('cargo.toml') ||
    lower.endsWith('composer.json') ||
    lower.endsWith('go.mod') ||
    lower.includes('readme')
  );
}

async function analyzeRepo(repoFullName: string) {
  const [owner, repo] = repoFullName.split('/');

  const repoResponse = await githubFetch(`https://api.github.com/repos/${owner}/${repo}`);
  const repoJson = await repoResponse.json();
  const defaultBranch = repoJson.default_branch;
  const description = repoJson.description || '';

  const treeResponse = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
  );
  const treeJson = await treeResponse.json();
  const files = treeJson.tree as { path: string; type: string }[];

  const repoLanguages = new Map<string, number>();
  const repoTech = new Set<string>();
  const repoArch = new Set<string>();
  const repoDb = new Set<string>();
  const repoCiCd = new Set<string>();
  const repoTesting = new Set<string>();

  const languagesResponse = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/languages`
  );
  const languagesJson = await languagesResponse.json();

  for (const [lang, bytes] of Object.entries(languagesJson)) {
    repoLanguages.set(lang, bytes as number);
  }

  if (description) {
    for (const tech of extractTechnologies(description)) repoTech.add(tech);
    for (const arch of extractArchitectures(description)) repoArch.add(arch);
    for (const db of extractDatabases(description)) repoDb.add(db);
    for (const ci of extractCiCdTools(description)) repoCiCd.add(ci);
    for (const test of extractTestingTools(description)) repoTesting.add(test);
  }

  for (const file of files) {
    if (file.type !== 'blob') continue;
    if (!isRelevantFile(file.path)) continue;

    const contentResponse = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${defaultBranch}`
    );
    const contentJson = await contentResponse.json();

    let fileContent = '';
    if (contentJson.encoding === 'base64' && contentJson.content) {
      fileContent = Buffer.from(contentJson.content, 'base64').toString('utf-8');
    }

    for (const tech of extractTechnologies(fileContent)) repoTech.add(tech);
    for (const arch of extractArchitectures(fileContent)) repoArch.add(arch);
    for (const db of extractDatabases(fileContent)) repoDb.add(db);
    for (const ci of extractCiCdTools(fileContent)) repoCiCd.add(ci);
    for (const test of extractTestingTools(fileContent)) repoTesting.add(test);
  }

  return {
    languages: repoLanguages,
    techs: Array.from(repoTech),
    architectures: Array.from(repoArch),
    databases: Array.from(repoDb),
    ci_cd: Array.from(repoCiCd),
    testing: Array.from(repoTesting),
  };
}

export async function analyzeProfile(username: string) {
  const reposResponse = await githubFetch(
    `https://api.github.com/users/${username}/repos`
  );
  const repos = (await reposResponse.json()) as { full_name: string }[];

  const profileLanguages = new Map<string, number>();
  const profileTech = new Map<string, number>();
  const profileArch = new Map<string, number>();
  const profileDb = new Map<string, number>();
  const profileCiCd = new Map<string, number>();
  const profileTesting = new Map<string, number>();

  for (const repo of repos) {
    const { techs, architectures, databases, ci_cd, testing, languages } = await analyzeRepo(
      repo.full_name
    );
    
    for (const [lang, bytes] of languages) {
      profileLanguages.set(lang, (profileLanguages.get(lang) || 0) + bytes);
    }

    for (const tech of techs) {
      profileTech.set(tech, (profileTech.get(tech) || 0) + 1);
    }

    for (const arch of architectures) {
      profileArch.set(arch, (profileArch.get(arch) || 0) + 1);
    }

    for (const db of databases) {
      profileDb.set(db, (profileDb.get(db) || 0) + 1);
    }

    for (const ci of ci_cd) {
      profileCiCd.set(ci, (profileCiCd.get(ci) || 0) + 1);
    }

    for (const test of testing) {
      profileTesting.set(test, (profileTesting.get(test) || 0) + 1);
    }
  }

  const sortMap = (map: Map<string, number>) =>
    Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  return {
    profile: username,
    languages: sortMap(profileLanguages),
    tech: sortMap(profileTech),
    architecture: sortMap(profileArch),
    databases: sortMap(profileDb),
    ci_cd: sortMap(profileCiCd),
    testing: sortMap(profileTesting),
  };
}